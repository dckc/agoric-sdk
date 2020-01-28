// TODO
import harden from '@agoric/harden';

const theEnv = {}; // ISSUE: global mutable state
let workDir = '.';

const process = harden({
  on(signal, handler) {
    console.warn('signal handling on xs is TODO');
  },
  get env() {
    console.warn('environment on xs is TODO');
    return theEnv;
  },
  chdir(path) {
    console.warn('XS: chdir is a stub');
    workDir = path;
  },
  cwd() {
    return workDir;
  },
});

export default process;
