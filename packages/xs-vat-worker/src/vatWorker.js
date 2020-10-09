/* global HandledPromise */
// @ts-check
import { importBundle } from '@agoric/import-bundle';
import { asMessage } from '@agoric/swingset-vat';
import { Remotable, getInterfaceOf, makeMarshal } from '@agoric/marshal';
// TODO? import anylogger from 'anylogger';
import { makeLiveSlots } from '@agoric/swingset-vat/src/kernel/liveSlots';

/** @type { (first: string, ...args: unknown[]) => void } */
function workerLog(first, ...args) {
  console.log(`---worker: ${first}`, ...args);
}

/** @type { (ok: unknown, whynot: string) => void } */
function assert(ok, whynot) {
  if (!ok) {
    throw new Error(whynot);
  }
}

/**
 * @param { string } _tag
 * @returns { Logger }
 *
 * @typedef { (...things: unknown[]) => void } LoggF
 * @typedef {{ debug: LoggF, log: LoggF, info: LoggF, warn: LoggF, error: LoggF }} Logger
 */
function makeConsole(_tag) {
  const log = console; // TODO? anylogger(tag);
  const cons = {
    debug: log.debug,
    log: log.log,
    info: log.info,
    warn: log.warn,
    error: log.error,
  };
  return harden(cons);
}

// see also: detecting an empty vat promise queue (end of "crank")
// https://github.com/Agoric/agoric-sdk/issues/45
/**
 *
 * @param {typeof setImmediate} setImmediate
 * @returns { () => Promise<void> }
 */
function makeWait(setImmediate) {
  return function waitUntilQuiescent() {
    return new Promise((resolve, _reject) => {
      setImmediate(() => {
        // console.log('hello from setImmediate callback. The promise queue is presumably empty.');
        resolve();
      });
    });
  };
}

/**
 * @typedef {Readonly<['ok'] | ['error', string]>} WorkerResult
 */

/**
 *
 * @param {Record<string, unknown>} vatNS
 * @param {unknown} vatParameters
 * @param {{
 *   callParent: (request: unknown[]) => unknown,
 *   waitUntilQuiescent: () => Promise<void>
 * }} io
 */
function makeWorker(vatNS, vatParameters, { callParent, waitUntilQuiescent }) {
  /**
   * @param {(it: unknown) => Promise<any>} f
   * @param {string} errmsg
   */
  function runAndWait(f, errmsg) {
    Promise.resolve()
      .then(f)
      .then(undefined, err => workerLog(`doProcess: ${errmsg}:`, err));
    return waitUntilQuiescent();
  }

  /** @type {(d: [string, ...unknown[]], errmsg: string) => Promise<WorkerResult> } */
  async function doProcess(dispatchRecord, errmsg) {
    const [dispatchOp, ...dispatchArgs] = dispatchRecord;
    workerLog(`runAndWait`);
    await runAndWait(() => dispatch[dispatchOp](...dispatchArgs), errmsg);
    workerLog(`doProcess done`);
    const vatDeliveryResults = harden(['ok']);
    // @ts-ignore not sure why tsc doesn't grok here
    return vatDeliveryResults;
  }

  /**
   * @param {unknown} targetSlot
   * @param {Message} msg
   * @returns {Promise<WorkerResult>}
   */
  function doMessage(targetSlot, msg) {
    const errmsg = `vat[${targetSlot}].${msg.method} dispatch failed`;
    return doProcess(
      ['deliver', targetSlot, msg.method, msg.args, msg.result],
      errmsg,
    );
  }

  /**
   *
   * @param {PromiseReference} vpid
   * @param {Resolution} vp
   */
  function doNotify(vpid, vp) {
    const errmsg = `vat.promise[${vpid}] ${vp.state} failed`;
    switch (vp.state) {
      case 'fulfilledToPresence':
        return doProcess(['notifyFulfillToPresence', vpid, vp.slot], errmsg);
      // @ts-ignore
      case 'redirected':
        throw new Error('not implemented yet');
      case 'fulfilledToData':
        return doProcess(['notifyFulfillToData', vpid, vp.data], errmsg);
      case 'rejected':
        return doProcess(['notifyReject', vpid, vp.data], errmsg);
      default:
        // @ts-ignore
        throw Error(`unknown promise state '${vp.state}'`);
    }
  }

  /**
   * @param {VatWorkerReply} msg
   *
   * @typedef {
   *   ['dispatchReady'] | ['gotStart'] | ['gotBundle'] |
   *   ['syscall', ...VatSyscall] |
   *   ['testLog', ...unknown[]]
   * } VatWorkerReply
   *
   * TODO: move VatSyscall where other stuff from vat-worker.md are defined
   * @typedef {Readonly<
   *   ['send', Reference, Message] |
   *   ['callNow', Reference, string, CapData] |
   *   ['subscribe', PromiseReference] |
   *   ['fulfillToPresence', PromiseReference, Reference] |
   *   ['fulfillToData', PromiseReference, unknown] |
   *   ['reject', PromiseReference, unknown]
   * >} VatSyscall
   */
  function sendUplinkXXX(msg) {
    assert(msg instanceof Array, `msg must be an Array`);
    io.writeMessage(JSON.stringify(msg));
  }

  // fromParent.on('data', data => {
  //  workerLog('data from parent', data);
  //  toParent.write('child ack');
  // });

  /** @type { (vatSysCall: VatSyscall) => void } */
  function doSyscall(vatSyscallObject) {
    sendUplink(['syscall', ...vatSyscallObject]);
  }
  const syscall = harden({
    /** @type { (target: Reference, msg: Message) => void } */
    send: (target, smsg) => doSyscall(['send', target, smsg]),
    /** @type { (target: Reference, method: string, args: CapData) => void } */
    callNow: (_target, _method, _args) => {
      throw Error(`nodeWorker cannot syscall.callNow`);
    },
    /** @type { (vpd: PromiseReference) => void } */
    subscribe: vpid => doSyscall(['subscribe', vpid]),
    /** @type { (vpid: PromiseReference, data: unknown) => void } */
    fulfillToData: (vpid, data) => doSyscall(['fulfillToData', vpid, data]),
    /** @type { (vpid: PromiseReference, slot: Reference) => void } */
    fulfillToPresence: (vpid, slot) =>
      doSyscall(['fulfillToPresence', vpid, slot]),
    /** @type { (vpid: PromiseReference, data: unknown) => void } */
    reject: (vpid, data) => doSyscall(['reject', vpid, data]),
  });

  function testLog(/** @type {unknown[]} */ ...args) {
    sendUplink(['testLog', ...args]);
  }
  /** @type { unknown } */
  const state = null;
  const vatID = 'demo-vatID';
  // todo: maybe add transformTildot, makeGetMeter/transformMetering to
  // vatPowers, but only if options tell us they're wanted. Maybe
  // transformTildot should be async and outsourced to the kernel
  // process/thread.
  const vatPowers = {
    Remotable,
    getInterfaceOf,
    makeMarshal,
    testLog,
  };
  /** @type {{[method: string]: (...args: unknown[]) => Promise<unknown> }} */
  const dispatch = makeLiveSlots(
    syscall,
    state,
    vatNS.buildRootObject,
    vatID,
    vatPowers,
    vatParameters,
  );
  workerLog(`got dispatch:`, Object.keys(dispatch).join(','));

  /** @type { (dtype: string, ...dargs: unknown[]) => Promise<WorkerResult> } */
  function deliver(dtype, ...dargs) {
    switch (dtype) {
      case 'message': {
        const [target, args] = dargs;
        return doMessage(target, asMessage(args));
      }

      case 'notify': {
        /** @type { Resolution } */
        // @ts-ignore  WARNING: assuming type of input data
        const resolution = dargs[1];
        return doNotify(dargs[0], resolution);
      }

      default:
        throw Error(`bad delivery type ${dtype}`);
    }
  }

  return harden({ deliver });
}

/**
 *
 * @param {{
 *   readMessage: (eof: Error) => string,
 *   writeMessage: (msg: string) => void,
 *   setImmediate: typeof setImmediate,
 * }} io
 */
export async function main({ readMessage, writeMessage, setImmediate }) {
  workerLog(`supervisor started`);

  const waitUntilQuiescent = makeWait(setImmediate);
  const EOF = new Error('EOF');

  /** @type {Record<string, VatWorker>} */
  const workerByVatID = {};

  /** @type { (request: unknown) => unknown } */
  function callParent(request) {
    writeMessage(JSON.stringify(request));
    let txt;
    try {
      txt = readMessage(EOF);
    } catch (ex) {
      if (ex === EOF) {
        throw new Error(`unexpected EOF in reply to ${request}`);
      }
      throw ex;
    }
    let result;
    try {
      result = JSON.parse(txt);
    } catch (badJSON) {
      throw new Error(`bad JSON in reply to ${request}: ${badJSON.message}`);
    }
    return result;
  }

  /** @type {(msg: unknown) => Promise<null | 'STOP' | unknown[]>} */
  async function handle(msg) {
    const type = Array.isArray(msg) && msg.length >= 1 ? msg[0] : typeof msg;
    /** @type { unknown[] } */
    const margs = Array.isArray(msg) ? msg.slice(1) : [];

    const theWorker = vatID => {
      const worker = workerByVatID[vatID];
      if (!worker) throw new Error(`unknown vatID ${vatID}`);
      return worker;
    };

    workerLog(`received`, type);
    switch (type) {
      case 'start':
        // TODO: parent should send ['start', vatID]
        workerLog(`got start`);
        return ['gotStart'];
      case 'setBundle': {
        const [vatID, bundle, vatParameters] = margs;
        if (typeof vatID !== 'string') throw new Error(`bad vatID ${vatID}`);
        if (vatID in workerByVatID)
          throw new Error(`vat ${vatID} already has bundle.`);

        const endowments = {
          console: makeConsole(`SwingSet:vatWorker`),
          // @ts-ignore  TODO: how to get type of HandledPromise?
          HandledPromise,
        };
        const vatNS = await importBundle(bundle, { endowments });
        workerLog(`got vatNS:`, Object.keys(vatNS).join(','));

        const worker = makeWorker(vatNS, vatParameters, {
          waitUntilQuiescent,
          callParent,
        });
        workerByVatID[vatID] = worker;
        return ['dispatchReady'];
      }

      case 'deliver': {
        const [vatID, dtype, ...dargs] = margs;
        const worker = theWorker(vatID);
        const res = await worker.deliver(dtype, ...dargs);
        return ['deliverDone', ...res];
      }

      default:
        workerLog(`unrecognized downlink message ${type}`);
        return null;
    }
  }

  for (;;) {
    /** @type { unknown } */
    let message;
    try {
      message = JSON.parse(readMessage(EOF));
    } catch (noMessage) {
      if (noMessage === EOF) {
        return;
      }
      console.warn('problem getting message:', noMessage);
      // eslint-disable-next-line no-continue
      continue;
    }
    // eslint-disable-next-line no-await-in-loop
    const reply = await handle(message);
    if (reply === 'STOP') {
      break;
    }
    if (Array.isArray(reply)) {
      // odd protocol has 2 replies to setBundle
      if (reply[0] === 'dispatchReady') {
        writeMessage(JSON.stringify(['gotBundle']));
      }
      writeMessage(JSON.stringify(reply));
    }
  }
}
