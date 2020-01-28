import harden from '@agoric/harden';

import Resource from 'moddable-sdk/files/resource/Resource';

import fs from 'fs'; // beware: powerful!

const genesisVats = {
  './mailbox-src': '@agoric.mailbox-src.js',
  './command-src': '@agoric.command-src.js',
  './timer-src': '@agoric.timer-src.js',
  './loopbox-src': '@agoric.loopbox-src.js',
  './vats/comms': '@agoric.comms.js',
  './vats/vat-timerWrapper': '@agoric.vat-timerWrapper.js',
  './vats/vat-tp': '@agoric.vattp.js',
};

function butLast(p) {
  const pos = p.lastIndexOf('/');
  return pos >= 0 ? p.slice(0, pos + 1) : p;
}

function mangleName(path) {
  let bundlePath;
  const parts = path.match(/vat(-)([^\.]+)(\.js)?$/);
  if (parts) {
    bundlePath = `${butLast(path)}vat_${parts[2]}-src.js`;
  } else if (path.match(/\/bootstrap.js$/)) {
    bundlePath = `${butLast(path)}bootstrap-src.js`;
  } else {
    throw new Error(`bundle-source expected vat-NAME.js; got: ${path}`);
  }
  console.log(`= xs bundleSource ${path} -> ${bundlePath}`);
  return bundlePath;
}

export default function bundleSource(path) {
  // console.log('bundle-source:', path);
  let vatModText;
  const resName = genesisVats[path];
  if (resName) {
    const vatROM = new Resource(resName);
    vatModText = String.fromArrayBuffer(vatROM.slice(0));
  } else {
    vatModText = fs.readFileSync(mangleName(path));
  }

  const vatExpr = vatModText.slice('export default '.length);
  return harden({
    source: vatExpr,
    sourceMap: `//# sourceURL=${path}\n`,
  });
}
