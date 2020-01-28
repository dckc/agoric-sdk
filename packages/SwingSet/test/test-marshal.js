/* globals BigInt */

import { test } from 'tape-promise/tape';
import harden from '@agoric/harden';
import { makeMarshal, mustPassByPresence } from '@agoric/marshal';

import { makeMarshaller } from '../src/kernel/liveSlots';
import makePromise from '../src/makePromise';

import { buildVatController } from '../src/index';

async function prep() {
  const config = {
    vats: new Map(),
    bootstrapIndexJS: undefined,
  };
  const controller = await buildVatController(config, false);
  await controller.run();
}

test('serialize static data', t => {
  const m = makeMarshal();
  const ser = val => m.serialize(val);
  t.throws(() => ser([1, 2]), /cannot pass non-frozen objects like .*/);
  t.deepEqual(ser(harden([1, 2])), { body: '[1,2]', slots: [] });
  t.deepEqual(ser(harden({ foo: 1 })), {
    body: '{"foo":1}',
    slots: [],
  });
  t.deepEqual(ser(true), { body: 'true', slots: [] });
  t.deepEqual(ser(1), { body: '1', slots: [] });
  t.deepEqual(ser('abc'), { body: '"abc"', slots: [] });
  t.deepEqual(ser(undefined), {
    body: '{"@qclass":"undefined"}',
    slots: [],
  });
  t.deepEqual(ser(-0), { body: '{"@qclass":"-0"}', slots: [] });
  t.deepEqual(ser(NaN), { body: '{"@qclass":"NaN"}', slots: [] });
  t.deepEqual(ser(Infinity), {
    body: '{"@qclass":"Infinity"}',
    slots: [],
  });
  t.deepEqual(ser(-Infinity), {
    body: '{"@qclass":"-Infinity"}',
    slots: [],
  });
  t.deepEqual(ser(Symbol.for('sym1')), {
    body: '{"@qclass":"symbol","key":"sym1"}',
    slots: [],
  });
  let bn;
  try {
    bn = BigInt(4);
  } catch (e) {
    if (!(e instanceof ReferenceError)) {
      throw e;
    }
  }
  if (bn) {
    t.deepEqual(ser(bn), {
      body: '{"@qclass":"bigint","digits":"4"}',
      slots: [],
    });
  }

  let em;
  try {
    throw new ReferenceError('msg');
  } catch (e) {
    em = harden(e);
  }
  t.deepEqual(ser(em), {
    body: '{"@qclass":"error","name":"ReferenceError","message":"msg"}',
    slots: [],
  });

  t.end();
});

test('unserialize static data', t => {
  const m = makeMarshal();
  const uns = body => m.unserialize({ body, slots: [] });
  t.equal(uns('1'), 1);
  t.equal(uns('"abc"'), 'abc');
  t.equal(uns('false'), false);

  // JS primitives that aren't natively representable by JSON
  t.deepEqual(uns('{"@qclass":"undefined"}'), undefined);
  t.ok(Object.is(uns('{"@qclass":"-0"}'), -0));
  t.notOk(Object.is(uns('{"@qclass":"-0"}'), 0));
  t.ok(Object.is(uns('{"@qclass":"NaN"}'), NaN));
  t.deepEqual(uns('{"@qclass":"Infinity"}'), Infinity);
  t.deepEqual(uns('{"@qclass":"-Infinity"}'), -Infinity);
  t.deepEqual(uns('{"@qclass":"symbol", "key":"sym1"}'), Symbol.for('sym1'));

  // Normal json reviver cannot make properties with undefined values
  t.deepEqual(uns('[{"@qclass":"undefined"}]'), [undefined]);
  t.deepEqual(uns('{"foo": {"@qclass":"undefined"}}'), { foo: undefined });
  let bn;
  try {
    bn = BigInt(4);
  } catch (e) {
    if (!(e instanceof ReferenceError)) {
      throw e;
    }
  }
  if (bn) {
    t.deepEqual(uns('{"@qclass":"bigint","digits":"1234"}'), BigInt(1234));
  }

  const em1 = uns(
    '{"@qclass":"error","name":"ReferenceError","message":"msg"}',
  );
  t.ok(em1 instanceof ReferenceError);
  t.equal(em1.message, 'msg');
  t.ok(Object.isFrozen(em1));

  const em2 = uns('{"@qclass":"error","name":"TypeError","message":"msg2"}');
  t.ok(em2 instanceof TypeError);
  t.equal(em2.message, 'msg2');

  const em3 = uns('{"@qclass":"error","name":"Unknown","message":"msg3"}');
  t.ok(em3 instanceof Error);
  t.equal(em3.message, 'msg3');

  t.deepEqual(uns('[1,2]'), [1, 2]);
  t.deepEqual(uns('{"a":1,"b":2}'), { a: 1, b: 2 });
  t.deepEqual(uns('{"a":1,"b":{"c": 3}}'), { a: 1, b: { c: 3 } });

  // should be frozen
  const arr = uns('[1,2]');
  t.ok(Object.isFrozen(arr));
  const a = uns('{"b":{"c":{"d": []}}}');
  t.ok(Object.isFrozen(a));
  t.ok(Object.isFrozen(a.b));
  t.ok(Object.isFrozen(a.b.c));
  t.ok(Object.isFrozen(a.b.c.d));

  t.end();
});

test('serialize ibid cycle', t => {
  const m = makeMarshal();
  const ser = val => m.serialize(val);
  const cycle = ['a', 'x', 'c'];
  cycle[1] = cycle;
  harden(cycle);

  t.deepEqual(ser(cycle), {
    body: '["a",{"@qclass":"ibid","index":0},"c"]',
    slots: [],
  });
  t.end();
});

test('forbid ibid cycle', t => {
  const m = makeMarshal();
  const uns = body => m.unserialize({ body, slots: [] });
  t.throws(
    () => uns('["a",{"@qclass":"ibid","index":0},"c"]'),
    /Ibid cycle at 0/,
  );
  t.end();
});

test('unserialize ibid cycle', t => {
  const m = makeMarshal();
  const uns = body => m.unserialize({ body, slots: [] }, 'warnOfCycles');
  const cycle = uns('["a",{"@qclass":"ibid","index":0},"c"]');
  t.ok(Object.is(cycle[1], cycle));
  t.end();
});

test('serialize exports', t => {
  const { m } = makeMarshaller();
  const ser = val => m.serialize(val);
  const o1 = harden({});
  const o2 = harden({
    meth1() {
      return 4;
    },
  });
  t.deepEqual(ser(o1), {
    body: '{"@qclass":"slot","index":0}',
    slots: ['o+1'],
  });
  // m now remembers that o1 is exported as 1
  t.deepEqual(ser(harden([o1, o1])), {
    body: '[{"@qclass":"slot","index":0},{"@qclass":"ibid","index":1}]',
    slots: ['o+1'],
  });
  t.deepEqual(ser(harden([o2, o1])), {
    body: '[{"@qclass":"slot","index":0},{"@qclass":"slot","index":1}]',
    slots: ['o+2', 'o+1'],
  });

  t.end();
});

test('deserialize imports', async t => {
  await prep();
  const { m } = makeMarshaller();
  const a = m.unserialize({
    body: '{"@qclass":"slot","index":0}',
    slots: ['o-1'],
  });
  // a should be a proxy/presence. For now these are obvious.
  t.equal(a.toString(), '[Presence o-1]');
  t.ok(Object.isFrozen(a));

  // m now remembers the proxy
  const b = m.unserialize({
    body: '{"@qclass":"slot","index":0}',
    slots: ['o-1'],
  });
  t.is(a, b);

  // the slotid is what matters, not the index
  const c = m.unserialize({
    body: '{"@qclass":"slot","index":2}',
    slots: ['x', 'x', 'o-1'],
  });
  t.is(a, c);

  t.end();
});

test('deserialize exports', t => {
  const { m } = makeMarshaller();
  const o1 = harden({});
  m.serialize(o1); // allocates slot=1
  const a = m.unserialize({
    body: '{"@qclass":"slot","index":0}',
    slots: ['o+1'],
  });
  t.is(a, o1);

  t.end();
});

test('serialize imports', async t => {
  await prep();
  const { m } = makeMarshaller();
  const a = m.unserialize({
    body: '{"@qclass":"slot","index":0}',
    slots: ['o-1'],
  });
  t.deepEqual(m.serialize(a), {
    body: '{"@qclass":"slot","index":0}',
    slots: ['o-1'],
  });

  t.end();
});

test('serialize promise', async t => {
  const log = [];
  const syscall = {
    fulfillToData(result, data) {
      log.push({ result, data });
    },
  };

  const { m } = makeMarshaller(syscall);
  const { p, res } = makePromise();
  t.deepEqual(m.serialize(p), {
    body: '{"@qclass":"slot","index":0}',
    slots: ['p+5'],
  });
  // serializer should remember the promise
  t.deepEqual(m.serialize(harden(['other stuff', p])), {
    body: '["other stuff",{"@qclass":"slot","index":0}]',
    slots: ['p+5'],
  });

  // inbound should recognize it and return the promise
  t.deepEqual(
    m.unserialize({ body: '{"@qclass":"slot","index":0}', slots: ['p+5'] }),
    p,
  );

  res(5);
  t.deepEqual(log, []);

  const { p: pauseP, res: pauseRes } = makePromise();
  setImmediate(() => pauseRes());
  await pauseP;
  t.deepEqual(log, [{ result: 'p+5', data: { body: '5', slots: [] } }]);

  t.end();
});

test('unserialize promise', async t => {
  await prep();
  const log = [];
  const syscall = {
    subscribe(promiseID) {
      log.push(`subscribe-${promiseID}`);
    },
  };

  const { m } = makeMarshaller(syscall);
  const p = m.unserialize({
    body: '{"@qclass":"slot","index":0}',
    slots: ['p-1'],
  });
  t.deepEqual(log, ['subscribe-p-1']);
  t.ok(p instanceof Promise);

  t.end();
});

test('null cannot be pass-by-presence', t => {
  t.throws(() => mustPassByPresence(null), /null cannot be pass-by-presence/);
  t.end();
});

test('mal-formed @qclass', t => {
  const m = makeMarshal();
  const uns = body => m.unserialize({ body, slots: [] });
  t.throws(() => uns('{"@qclass": 0}'), /invalid qclass/);
  t.end();
});
