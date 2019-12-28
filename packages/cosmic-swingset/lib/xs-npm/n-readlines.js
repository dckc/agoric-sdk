import harden from '@agoric/harden';
import { makePath } from './pathlib';
import { File, Iterator } from 'file';  // beware: powerful!

export default function readlines(path) {
  const p = makePath(path, { File, Iterator });
  const lines = p.readlinesSync(0);
  let ix = 0;
  return harden({
    next() {
      if (ix >= lines.length) {
	return false;
      }
      return lines[ix++];
    }
  });
}

