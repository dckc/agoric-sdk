import harden from '@agoric/harden';

import { makePath } from './pathlib';

import { File, Iterator } from 'file';  // beware: powerful!

function readFileSync(path) {
  const p = makePath(path, { File, Iterator });
  return p.readFileSync();
}

function statSync(path) {
  const p = makePath(path, { File, Iterator });
  return p.statSync();
}

const promises = harden({
  write() { throw('todo'); },
  close() { throw('todo'); },
  rename() { throw('todo'); },
  unlink() { throw('todo'); },
});

export function realpathSync(path) {
  console.warn('realpathSync() is a noop on xs (TODO)');
  return path;
}

export default { realpathSync, promises, readFileSync, statSync };
