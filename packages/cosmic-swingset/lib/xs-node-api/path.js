// TODO
import harden from '@agoric/harden';

import { makePath, join, resolve } from './pathlib';

export { join };

export function isAbsolute(path) {
  return path.startsWith('/');
}

function butLast(p) {
  const pos = p.lastIndexOf('/');
  return pos >= 0 ? p.slice(0, pos + 1) : p;
}

export function dirname(p) {
  return butLast(p);
}

export function basename(p) {
  return p.slice(butLast(p).length);
}

export default harden({ join, resolve, isAbsolute, dirname, basename });
