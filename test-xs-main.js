/** test driver for tape-style test scripts on xs

The modlinks tool in tape-xs does static analysis of test scripts to
(a) find all imported modules and (b) build a compartment map to deal
with aliases such as `packages/Swingset/src/index` and
`@agoric/swingset-vat`. It saves the result in xs-compartments.json.

The 'xs_npm/...' style specifier is also part of the modlinks design.

ISSUE: The 'Resource' specifier should be more like
       'moddable-sdk/files/Resource' but 'Resource' is the name given
       by the Moddable SDK manifest_base.json . We should create
       our own base manifest.

*/
/* global Compartment */

import harden from 'xs_npm/@agoric/harden'; // eslint-disable-line import/no-unresolved
// tape work-alike in ESM form
import tape from 'xs_npm/tape-promise/tape'; // eslint-disable-line import/no-unresolved
// moddable-sdk API to access compile-time data
import Resource from 'Resource'; // eslint-disable-line import/no-unresolved

// Test scripts expect various nodejs style globals. See xs-node-global/console.js etc.
const nodeGlobalStubs = { require, __dirname: './' };
const nodeGlobals = harden({ console, setImmediate, setTimeout, ...nodeGlobalStubs });

// modlinks produces a map from compartment-internal specifiers
// to "external" specifiers in the main compartment's map.
const lookup = ([internal, external]) => [internal, Compartment.map[external]];
const link = (info, endowments) =>
  new Compartment(
    info.root,
    endowments,
    Object.fromEntries(Object.entries(info.compartment).map(lookup)),
  );

async function runTestScripts(htest) {
  const compartmentsROM = new Resource('xs-compartments.json').slice(0);
  const compartments = JSON.parse(String.fromArrayBuffer(compartmentsROM));

  let summary;
  for (const info of compartments.compartments) {
    console.log('== test compartment =>', info.root);

    // Run the test script (info.root) in its own compartment.
    htest.reset();
    try {
      link(info, nodeGlobals);
    } catch (oops) {
      console.log(info.root, 'failed:', oops.message);
      throw oops;
    }

    summary = await htest.result();
    console.log('== results:', info.root, summary);
  }

  console.log('Final Result:', summary);
  if (summary.fail > 0) {
    throw new Error(`${summary.fail} test failures`);
  }
}

export default async function main() {
  console.log('\n====== agoric-sdk test main()');

  // We use preloading to share tape's main harness.
  // ISSUE: tape harness is global mutable state.
  const htest = tape.createHarness('SwingSet');

  try {
    await runTestScripts(htest);
  } catch (oops) {
    console.error(oops.message);
    throw(oops);
  }
}
