/* eslint-disable no-await-in-loop */
// @ts-check

/** global print */

const { freeze, keys } = Object;

/**
 * deep equal value comparison
 *
 * originally based on code from Paul Roub Aug 2014
 * https://stackoverflow.com/a/25456134/7963
 *
 * @type {(x: unknown, y: unknown) => boolean }
 * @throws { Error } with some details the difference;
 *         for example, what property is missing.
 */
function deepEqual(x, y) {
  if (Object.is(x, y)) {
    return true;
  }
  if (
    typeof x === 'object' &&
    x != null &&
    typeof y === 'object' &&
    y != null
  ) {
    if (keys(x).length !== keys(y).length) {
      const detail = JSON.stringify({
        actual: {
          length: keys(x).length,
          keys: keys(x),
        },
        expected: {
          length: keys(y).length,
          keys: keys(y),
        },
      });
      throw new Error(`Object keys length: ${detail}`);
    }

    const { hasOwnProperty } = Object.prototype;
    /** @type {(obj: Object, prop: string | symbol | number) => boolean} */
    const hasOwnPropertyOf = (obj, prop) =>
      Reflect.apply(hasOwnProperty, obj, [prop]);
    for (const prop of Reflect.ownKeys(x)) {
      if (hasOwnPropertyOf(y, prop)) {
        if (!deepEqual(x[prop], y[prop])) {
          return false;
        }
      } else {
        throw new Error(`missing property ${String(prop)}`);
      }
    }

    return true;
  }
  const detail = JSON.stringify({
    actual: { type: typeof x, value: x },
    expected: { type: typeof y, value: y },
  });
  throw new Error(detail);
}

/**
 * Test status reporting inspired by Test Anything Protocol (TAP)
 *
 * ref https://testanything.org/tap-specification.html
 *
 * @param {(msg: TapMessage) => void} send
 *
 * @typedef { ReturnType<typeof tapFormat> } TapFormat
 * @typedef {import('./avaXS').TapMessage} TapMessage
 */
function tapFormat(send) {
  return freeze({
    /** @type {(qty: number) => void} */
    plan(qty) {
      send({ plan: qty });
    },
    /** @type {(testNum: number, txt?: string) => void} */
    ok(testNum, txt) {
      send({ status: 'ok', id: testNum, message: txt });
    },
    /** @type {(testNum: number, txt: string) => void} */
    skip(testNum, txt) {
      send({ status: 'SKIP', id: testNum, message: txt });
    },
    /** @type {(testNum: number, txt?: string) => void} */
    notOk(testNum, txt) {
      send({ status: 'not ok', id: testNum, message: txt });
    },
    /** @type {(txt: string, label?: string) => void} */
    diagnostic(txt, label) {
      send({ note: txt, label });
    },
  });
}

/** @type { Harness | null } */
let theHarness = null; // ISSUE: ambient

/**
 * @param {(msg: TapMessage) => void} send
 *
 * @typedef { ReturnType<typeof createHarness>} Harness
 */
function createHarness(send) {
  let testNum = 0;
  let passCount = 0;
  /** @type {((ot: { context: Object }) => Promise<void>)[]} */
  let beforeHooks = [];
  /** @type {(() => Promise<void>)[]} */
  let suitesToRun = [];
  const context = {};

  /**
   * @returns { Summary }
   * @typedef {import('./avaXS').Summary} Summary
   */
  function summary() {
    return {
      pass: passCount,
      fail: testNum - passCount,
      total: testNum,
    };
  }

  const it = freeze({
    send,
    get context() {
      return context;
    },
    /** @type {(label: string, hook: () => Promise<void>) => void } */
    before(_label, hook) {
      beforeHooks.push(hook);
    },
    /** @type { (ok: boolean) => number } */
    finish(ok) {
      testNum += 1;
      if (ok) {
        passCount += 1;
      }
      return testNum;
    },
    /** @type { (thunk: () => Promise<void>) => Promise<void> } */
    async defer(thunk) {
      suitesToRun.push(thunk);
    },
    summary,
    async result() {
      for await (const hook of beforeHooks) {
        await hook({ context });
      }
      beforeHooks = [];
      for await (const suite of suitesToRun) {
        await suite();
      }
      suitesToRun = [];

      return summary();
    },
  });

  if (!theHarness) {
    theHarness = it;
  }
  return it;
}

/**
 * @param {*} exc
 * @param {Expectation} expectation
 * @returns {boolean}
 * @typedef {{ instanceOf: Function } | { message: string | RegExp }=} Expectation
 */
function checkExpectation(exc, expectation) {
  if (!expectation) return true;
  if ('instanceOf' in expectation) return exc instanceof expectation.instanceOf;
  if ('message' in expectation) {
    const { message } = expectation;
    return typeof message === 'string'
      ? message === exc.message
      : message.test(exc.message);
  }
  throw Error(`not implemented: ${JSON.stringify(expectation)}`);
}

/**
 * Emulate ava assertion API
 *
 * ref https://github.com/avajs/ava/blob/main/docs/03-assertions.md
 *
 * @param {Harness} htest
 * @param {TapFormat} out
 *
 * @typedef {ReturnType<typeof makeTester>} Tester
 */
function makeTester(htest, out) {
  /** @type {number?} */
  let pending;

  /** @type {(result: boolean, info?: string) => void} */
  function assert(result, info) {
    if (typeof pending === 'number') {
      pending -= 1;
    }
    const testNum = htest.finish(result);
    if (result) {
      out.ok(testNum, info);
    } else {
      out.notOk(testNum, info);
    }
  }

  function truthy(/** @type {unknown} */ value, msg = 'should be truthy') {
    assert(!!value, msg);
  }

  /** @type {(actual: unknown, expected: unknown) => void } */
  function deepEqTest(actual, expected) {
    try {
      assert(deepEqual(actual, expected), 'should be deep equal');
    } catch (reason) {
      const summary = JSON.stringify({ actual, expected });
      assert(false, `should be deep equal: ${summary} : ${reason.message}`);
    }
  }

  const t = freeze({
    plan(/** @type {number} */ count) {
      pending = count;
    },
    get pending() {
      return pending;
    },
    get context() {
      return htest.context;
    },
    pass(/** @type {string} */ message) {
      assert(true, message);
    },
    fail(/** @type {string} */ message) {
      assert(false, message);
    },
    assert,
    truthy,
    falsy(/** @type {unknown} */ value, message = 'should be falsy') {
      assert(!value, message);
    },
    true(/** @type {unknown} */ value, message = 'should be true') {
      assert(value === true, message);
    },
    false(/** @type {unknown} */ value, message = 'should be false') {
      assert(value === false, message);
    },
    /** @type {(a: unknown, b: unknown, message?: string) => void} */
    is(a, b, message = 'should be identical') {
      assert(Object.is(a, b), message);
    },
    /** @type {(a: unknown, b: unknown, message?: string) => void} */
    not(a, b, message = 'should not be identical') {
      assert(!Object.is(a, b), message);
    },
    deepEqual: deepEqTest,
    /** @type {(a: unknown, b: unknown, message?: string) => void} */
    notDeepEqual(a, b, message = 'should not be deep equal') {
      assert(!deepEqual(a, b), message);
    },
    /** @type {(a: unknown, b: unknown, message?: string) => void} */
    like(_a, _b, _message = 'should be like') {
      throw Error('not implemented');
    },
    /** @type {(fn: () => unknown, e?: Expectation, message?: string) => void } */
    throws(fn, expectation, message = `should throw like ${expectation}`) {
      try {
        fn();
        assert(false, message);
      } catch (ex) {
        assert(checkExpectation(ex, expectation), message);
      }
    },
    /** @type {(fn: () => unknown, message?: string) => void } */
    notThrows(fn, message) {
      try {
        fn();
      } catch (ex) {
        assert(false, message);
      }
    },
    /** @type {(thrower: () => Promise<unknown>, expectation?: Expectation, message?: string) => Promise<void> } */
    async throwsAsync(
      thrower,
      expectation,
      message = `should reject like ${expectation}`,
    ) {
      try {
        await (typeof thrower === 'function' ? thrower() : thrower);
        assert(false, message);
      } catch (ex) {
        assert(checkExpectation(ex, expectation), message);
      }
    },
    /** @type {(thrower: () => Promise<unknown>, message?: string) => Promise<void> } */
    async notThrowsAsync(nonThrower, message) {
      try {
        await (typeof nonThrower === 'function' ? nonThrower() : nonThrower);
      } catch (ex) {
        assert(false, message);
      }
    },
  });

  return t;
}

/** @type {(label: string, run: (t: Tester) => Promise<void>, htestOpt: Harness?) => void } */
function test(label, run, htestOpt) {
  const htest = htestOpt || theHarness;
  if (!htest) throw Error('no harness');

  htest.defer(async () => {
    const out = tapFormat(htest.send);
    const t = makeTester(htest, out);
    try {
      out.diagnostic('start', label);
      await run(t);
      out.diagnostic('end', label);
    } catch (ex) {
      t.fail(`${label} threw: ${ex.message}`);
    }
    const pending = t.pending;
    if (typeof pending === 'number' && pending !== 0) {
      t.fail(`bad plan: ${t.pending} still to go`);
    }
  });
}

// TODO: test.skip, test.failing

test.createHarness = createHarness;

/** @type {(label: string, fn: () => Promise<void>) => void } */
test.before = (label, fn) => {
  if (typeof label === 'function') {
    fn = label;
    label = '';
  }
  if (!theHarness) throw Error('no harness');
  theHarness.before(label, fn);
};

freeze(test);

// export default test;
// export { test };
globalThis.test = test;
