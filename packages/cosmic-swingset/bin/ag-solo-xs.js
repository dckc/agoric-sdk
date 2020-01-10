/* global Compartment, trace */

import Resource from 'Resource';
const compartmentsROM = new Resource('xs-compartments.json');
const compartments = JSON.parse(String.fromArrayBuffer(compartmentsROM.slice(0)));

const native = {
  // references from agoric code
  'moddable-sdk/crypt/digest/crypt': 'crypt',
  'moddable-sdk/data/base64/base64': 'base64',
  'moddable-sdk/files/resource/Resource': 'Resource',
  // bare specifiers in moddable-sdk files
  base64: 'base64',
  crypt: 'crypt',
  logical: 'logical',
  socket: 'socket',
};

const lib = 'workspace/packages/cosmic-swingset/lib';

export default async function main() {
  console.log(`in bin/ag-solo-xs...`);

  const info = compartments.compartments[0];
  const mapEntries = (obj, f) => Object.fromEntries(Object.entries(obj).map(f));
  const cmap = mapEntries(info.compartment, ([internal, external]) => [internal, Compartment.map[external]]);

  // modlinks isn't quite smart enough yet?
  for (const [internal, external] of Object.entries(native)) {
    cmap[internal] = Compartment.map[external];
  }

  const endowments = { console, require, setImmediate };
  const solo = new Compartment(info.root, endowments, cmap).export.default;

  try {
    await solo('ag-solo-xs', ['start']);
    // start should run forever
    await new Promise(() => null);
  } catch (oops) {
    console.error(oops);
    console.error(oops.message);
  }
}
