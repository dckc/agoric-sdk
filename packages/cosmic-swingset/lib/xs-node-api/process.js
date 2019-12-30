// TODO
import harden from '@agoric/harden';

const theEnv = {}; // ISSUE: global mutable state

const process = harden({
  on(signal, handler) {
    console.warn('signal handling on xs is TODO');
  },
  get env() {
    console.warn('environment on xs is TODO');
    return theEnv;
  }
});

export default process;
