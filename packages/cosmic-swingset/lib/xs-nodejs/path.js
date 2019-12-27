// TODO
import harden from '@agoric/harden';

import { makePath } from './pathlib';

export function join(base, ...others) {
  const p = makePath(base, { File: {}, Iterator: {} });
  return `${p.join(...others)}`;
}

export function resolve(base, ...others) {
  const p = makePath(base, { File: {}, Iterator: {} });
  return `${p.resolve(...others)}`;
}

export default { join, resolve };
