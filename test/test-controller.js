import harden from '@agoric/harden';
import { test } from 'tape-promise/tape';
import { buildVatControllerRd, loadBasedirRd } from '../src/index';
import bundleSource from '../src/build-source-bundle';
import { checkKT } from './util';

function capdata(body, slots = []) {
  return harden({ body, slots });
}

async function simpleCall(t, withSES, resolve) {
  const configRd = {
    vats: new Map([['vat1', { sourceRd: resolve('./vat-controller-1') }]]),
  };
  const controller = await buildVatControllerRd(configRd, withSES);
  const data = controller.dump();
  const vat1 = controller.vatNameToID('vat1');
  t.deepEqual(data.vatTables, [{ vatID: vat1, state: { transcript: [] } }]);
  t.deepEqual(data.kernelTable, []);

  controller.queueToVatExport('vat1', 'o+1', 'foo', capdata('args'));
  t.deepEqual(controller.dump().runQueue, [
    {
      msg: {
        method: 'foo',
        args: capdata('args'),
        result: null,
      },
      target: 'ko20',
      type: 'send',
    },
  ]);
  await controller.run();
  t.deepEqual(JSON.parse(controller.dump().log[0]), {
    facetID: 'o+1',
    method: 'foo',
    args: capdata('args'),
  });

  controller.log('2');
  t.equal(controller.dump().log[1], '2');

  t.end();
}

async function bootstrap(t, withSES, resolveTest) {
  const configRd = await loadBasedirRd(resolveTest('basedir-controller-2'));
  // the controller automatically runs the bootstrap function.
  // basedir-controller-2/bootstrap.js logs "bootstrap called" and queues a call to
  // left[0].bootstrap
  const c = await buildVatControllerRd(configRd, withSES);
  t.deepEqual(c.dump().log, ['bootstrap called']);
  t.end();
}

async function bootstrapExport(t, withSES, resolveTest) {
  const configRd = await loadBasedirRd(resolveTest('basedir-controller-3'));
  const c = await buildVatControllerRd(configRd, withSES);
  const bootstrapVatID = c.vatNameToID('_bootstrap');
  const leftVatID = c.vatNameToID('left');
  const rightVatID = c.vatNameToID('right');
  // console.log(c.dump());
  // console.log('SLOTS: ', c.dump().runQueue[0].slots);

  // the expected kernel object indices
  const boot0 = 'ko20';
  const left0 = 'ko21';
  const right0 = 'ko22';
  const kt = [
    [boot0, bootstrapVatID, 'o+0'],
    [left0, leftVatID, 'o+0'],
    [right0, rightVatID, 'o+0'],
  ];
  checkKT(t, c, kt);

  t.deepEqual(c.dump().runQueue, [
    {
      msg: {
        result: null,
        method: 'bootstrap',
        args: {
          body:
            '[[],{"_bootstrap":{"@qclass":"slot","index":0},"left":{"@qclass":"slot","index":1},"right":{"@qclass":"slot","index":2}},{"_dummy":"dummy"}]',
          slots: [boot0, left0, right0],
        },
      },
      target: boot0,
      type: 'send',
    },
  ]);

  t.deepEqual(c.dump().log, [
    'left.setup called',
    'right.setup called',
    'bootstrap called',
  ]);
  // console.log('--- c.step() running bootstrap.obj0.bootstrap');
  await c.step();
  // kernel promise for result of the foo() that bootstrap sends to vat-left
  const fooP = 'kp40';
  t.deepEqual(c.dump().log, [
    'left.setup called',
    'right.setup called',
    'bootstrap called',
    'bootstrap.obj0.bootstrap()',
  ]);
  kt.push([left0, bootstrapVatID, 'o-50']);
  kt.push([right0, bootstrapVatID, 'o-51']);
  kt.push([fooP, bootstrapVatID, 'p+5']);
  checkKT(t, c, kt);
  t.deepEqual(c.dump().runQueue, [
    {
      type: 'send',
      target: left0,
      msg: {
        method: 'foo',
        args: {
          body: '[1,{"@qclass":"slot","index":0}]',
          slots: [right0],
        },
        result: fooP,
      },
    },
  ]);

  await c.step();
  const barP = 'kp41';
  t.deepEqual(c.dump().log, [
    'left.setup called',
    'right.setup called',
    'bootstrap called',
    'bootstrap.obj0.bootstrap()',
    'left.foo 1',
  ]);
  kt.push([right0, leftVatID, 'o-50']);
  kt.push([fooP, leftVatID, 'p-60']);
  kt.push([barP, leftVatID, 'p+5']);
  checkKT(t, c, kt);

  t.deepEqual(c.dump().runQueue, [
    {
      type: 'send',
      target: right0,
      msg: {
        method: 'bar',
        args: {
          body: '[2,{"@qclass":"slot","index":0}]',
          slots: [right0],
        },
        result: barP,
      },
    },
    { type: 'notify', vatID: bootstrapVatID, kpid: fooP },
  ]);

  await c.step();

  t.deepEqual(c.dump().log, [
    'left.setup called',
    'right.setup called',
    'bootstrap called',
    'bootstrap.obj0.bootstrap()',
    'left.foo 1',
    'right.obj0.bar 2 true',
  ]);

  kt.push([barP, rightVatID, 'p-60']);
  checkKT(t, c, kt);

  t.deepEqual(c.dump().runQueue, [
    { type: 'notify', vatID: bootstrapVatID, kpid: fooP },
    { type: 'notify', vatID: leftVatID, kpid: barP },
  ]);

  await c.step();

  t.deepEqual(c.dump().log, [
    'left.setup called',
    'right.setup called',
    'bootstrap called',
    'bootstrap.obj0.bootstrap()',
    'left.foo 1',
    'right.obj0.bar 2 true',
  ]);
  checkKT(t, c, kt);

  t.deepEqual(c.dump().runQueue, [
    { type: 'notify', vatID: leftVatID, kpid: barP },
  ]);

  await c.step();

  t.deepEqual(c.dump().log, [
    'left.setup called',
    'right.setup called',
    'bootstrap called',
    'bootstrap.obj0.bootstrap()',
    'left.foo 1',
    'right.obj0.bar 2 true',
  ]);

  checkKT(t, c, kt);
  t.deepEqual(c.dump().runQueue, []);

  t.end();
}

export default function runTests({ resolve, resolveTest }) {
  test('load empty', async t => {
    const configRd = {
      vats: new Map(),
      bootstrapIndexJSRd: undefined,
    };
    const controller = await buildVatControllerRd(configRd, false);
    await controller.run();
    t.ok(true);
    t.end();
  });

  test('simple call with SES', async t => {
    await simpleCall(t, true, resolve);
  });

  test('simple call non-SES', async t => {
    await simpleCall(t, false, resolve);
  });

  test('reject module-like sourceIndex', async t => {
    const vats = new Map();
    // the keys of 'vats' have a 'sourcepath' property which are vat source
    // index strings: something that require() or rollup can use to
    // import/stringify the source graph that should be loaded into the vat. We
    // want this to be somewhere on local disk, so it should start with '/' or
    // '.'. If it doesn't, the name will be treated as something to load from
    // node_modules/ (i.e. something installed from npm), so we want to reject
    // that.
    vats.set('vat1', {
      sourceRd: harden({
        toString() {
          return 'vatsource';
        },
        isAbsolute() {
          return false;
        },
      }),
    });
    t.rejects(
      async () => buildVatControllerRd({ vats }, false),
      /sourceIndex must be relative/,
    );
    t.end();
  });

  test('bootstrap with SES', async t => {
    await bootstrap(t, true, resolveTest);
  });

  test('bootstrap without SES', async t => {
    await bootstrap(t, false, resolveTest);
  });

  test('bootstrap export with SES', async t => {
    await bootstrapExport(t, true, resolveTest);
  });

  test('bootstrap export without SES', async t => {
    await bootstrapExport(t, false, resolveTest);
  });
}

function nodeSourceAccess({
  fs,
  path,
  dirname,
  rollup,
  resolvePlugin,
  requireResolve,
}) {
  function makeRd(myPath) {
    const self = harden({
      toString() {
        return myPath;
      },
      isAbsolute() {
        return path.isAbsolute(myPath);
      },
      resolve(other) {
        return makeRd(path.resolve(myPath, other));
      },
      statSync() {
        return fs.statSync(myPath);
      },
      readdirSync(options) {
        return fs.readdirSync(myPath, options);
      },
      bundleSource() {
        return bundleSource(myPath, {
          resolve: resolvePlugin,
          rollup,
          requireResolve,
        });
      },
    });
    return self;
  }

  return harden({
    resolve(specifier) {
      return makeRd(requireResolve(specifier));
    },
    resolveTest(specifier) {
      return makeRd(path.resolve(dirname, specifier));
    },
  });
}

/** Access ambient authority only if invoked as script. */
if (typeof require !== 'undefined' && typeof module !== 'undefined') {
  /* eslint-disable global-require */
  runTests(
    nodeSourceAccess({
      requireResolve: require.resolve,
      fs: require('fs'),
      path: require('path'),
      dirname: __dirname,
      rollup: require('rollup').rollup,
      resolvePlugin: require('rollup-plugin-node-resolve'),
    }),
  );
}
