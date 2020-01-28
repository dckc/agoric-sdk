/* global globalThis, Compartment */
const harden = x => Object.freeze(x, true);

import Resource from 'Resource';

// ISSUE: duplicated from bundle-source.js
const genesisVats = harden({
  './mailbox-src': '@agoric.mailbox-src.js',
  './command-src': '@agoric.command-src.js',
  './timer-src': '@agoric.timer-src.js',
  '../src/devices/loopbox-src': '@agoric.loopbox-src.js',
  './vats/comms': '@agoric.comms.js',
  './vats/vat-timerWrapper': '@agoric.vat-timerWrapper.js',
  './vats/vat-tp': '@agoric.vattp.js',
});


// ISSUE: duplicated from bundle-source.js
function butLast(p) {
  const pos = p.lastIndexOf('/');
  return pos >= 0 ? p.slice(0, pos + 1) : p;
}

// ISSUE: duplicated from bundle-source.js
function mangleName(path) {
  let bundlePath;
  const parts = path.match(/\bvat(-)([^\.]+)(\.js)?$/);
  if (parts) {
    bundlePath = `${butLast(path)}vat_${parts[2]}-src.js`;
  } else if (path.match(/\/bootstrap.js$/)) {
    bundlePath = `${butLast(path)}bootstrap-src.js`;
  } else {
    throw new Error(`require expected vat-NAME.js; got: ${path}`);
  }
  console.log(`= xs: require ${path} -> ${bundlePath}`);
  return bundlePath;
}

function resolve(specifier) {
  console.warn('require.resolve on xs is a noop:', specifier);
  return specifier;
}


export function makeRequire(files, globals, modMap, root='ses') {
  function require(specifier) {
    switch (specifier) {
    case '@agoric/harden':
      // avoid: Compartment: shared module
      return harden;
    case '@agoric/nat':
    case '@agoric/evaluate':
      return new Compartment(specifier, {}, modMap).export.default;
    default:
      let modText;
      const resName = genesisVats[specifier];
      if (resName) {
	const modROM = new Resource(resName);
	modText = String.fromArrayBuffer(modROM.slice(0));
      } else {
	modText = files.resolve(mangleName(specifier)).readFileSync();
      }
      const modExpr = modText.slice('export default '.length);
      const c = new Compartment(root, { require, ...globals }, modMap);
      const getExport = c.export.evaluateExpr(modExpr, {});
      return getExport();
    }
  }
  require.resolve = resolve;
  return harden(require);
}
