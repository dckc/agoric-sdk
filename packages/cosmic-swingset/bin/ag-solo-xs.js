/* global Compartment, trace */
import solo from './lib/ag-solo/main';

export default async function main() {
  console.log(`in bin/ag-solo-xs...`);

  try {
    await solo('ag-solo-xs', ['start']);
    // start should run forever
    await new Promise(() => null);
  } catch (oops) {
    console.error(oops);
    console.error(oops.message);
  }
}
