// TODO
import harden from '@agoric/harden';

const process = harden({
  on(signal, handler) {
    console.warn('signal handling on xs is TODO');
  },
  get env() {
    console.warn('environment on xs is TODO');
    return {};
  }
});

export default process;
