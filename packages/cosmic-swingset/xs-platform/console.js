/* global trace */

const harden = x => Object.freeze(x, true);

const text = it => typeof it == 'object' ? JSON.stringify(it) : String(it);
const combine = (...things) => things.map(text).join(' ') + '\n';

export const console = harden({
  log(...things) {
    trace(combine(...things));
  },
  // node.js docs say this is just an alias for error
  warn(...things) {
    trace(combine('WARNING: ', ...things));
  },
  // node docs say this goes to stderr
  error(...things) {
    trace(combine('ERROR: ', ...things));
  },
});
