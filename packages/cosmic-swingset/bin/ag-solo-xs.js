/* global Compartment, trace */
import solo from './lib/ag-solo/main';

export default async function main() {
  console.log(`in bin/ag-solo-xs...`);

  try {
    await solo('ag-solo-xs', ['start']);
  } catch (oops) {
    console.error(oops);
    console.error(oops.message);
  }
}
