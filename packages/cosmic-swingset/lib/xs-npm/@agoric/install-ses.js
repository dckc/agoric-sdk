/* global globalThis */

function harden(x) {
  return Object.freeze(x, true);  // xs deepFreeze
}

globalThis.harden = harden(harden);
