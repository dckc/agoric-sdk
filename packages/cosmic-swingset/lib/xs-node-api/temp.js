import fs from 'fs';
import { join } from './pathlib';

export function open({ dir, prefix }, cb) {
  // Always defer callbacks to a future turn.
  Promise.resolve(null).then(() => {
    let fd = null;
    let path;
    try {
      while (fd === null) {
        const suffix = Math.random();
        path = join(dir, `${prefix}${suffix}`);
        try {
          fd = fs.openSync(path, 'wx');
        } catch (_alreadyExists) {
          // ISSUE: how to distinguish already exists from disk full etc.?
        }
      }
      cb(null, { fd, path });
    } catch (err) {
      cb(err);
    }
  });
}

export default { open };
