// ref moddable/examples/base/timers/main.js

import Timer from 'timer'; // moddable timer

export function setImmediate(callback) {
  Timer.set(callback);
}

export function setTimeout(callback, delay) {
  Timer.set(callback, delay);
}
