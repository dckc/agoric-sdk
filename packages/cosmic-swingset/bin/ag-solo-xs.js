/* global Compartment, trace */
import { makeConsole } from 'xs-platform/console';

const harden = x => Object.freeze(x, true);

import solo from './lib/ag-solo/main';

export default async function main() {
  const console = makeConsole();
  console.log(`in bin/ag-solo-xs...`);

  try {
    await solo('ag-solo-xs', ['start']);
  } catch (oops) {
    console.error(oops);
    console.error(oops.message);
  }
}
