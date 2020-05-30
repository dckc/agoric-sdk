/* global trace, Compartment */
// moddable-sdk API to access compile-time data
import Resource from 'Resource';

trace('hello from xs-main module\n');

export default async function main() {
  trace('hello from xs-main main() function\n');

  try {
    const compartmentsROM = new Resource('xs-compartments.json').slice(0);
    trace('got compartmentsROM\n');
    const cs = String.fromArrayBuffer(compartmentsROM);
    trace(`got compartments JSON: ${cs.slice(0, 20)}...\n`);
    const compartments = JSON.parse(cs).compartments;
    trace(`parsed compartments: ${compartments.length}\n`);

    const spec1 = 'test-marshal';
    const loc1 = 'workspace/packages/SwingSet/test/test-marshal';
    const [info1] = compartments.filter(info => info.root === loc1);
    const cmap1 = info1.compartment;
    trace(`cmap1: ${JSON.stringify(cmap1)}\n`);
    trace(`compartment constructor: ${Compartment}\n`);
    const c1 = new Compartment({}, {"*": cmap1});
    trace(`compartment for test-marshall: ${c1}\n`);
    const ns1 = await c1.import(spec1);
    trace(`ns test-marshall compartment: ${ns1}\n`);
  } catch (err) {
    trace(`OOPS! ${err.message}\n`);
  }
}
