// ref moddable/examples/base/timers/main.js
/* global globalThis */

import Timer from 'timer'; // moddable timer

globalThis.setImmediate = function(callback) {
  Timer.set(callback);
};

globalThis.setTimeout = function(callback, delay) {
  Timer.set(callback, delay);
};

globalThis.setInterval = function(callback, delay) {
  Timer.repeat(callback, delay);
};
