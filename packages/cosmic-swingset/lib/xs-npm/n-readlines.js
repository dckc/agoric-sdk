import harden from '@agoric/harden';
import fs from 'fs';

function readlinesSync(path) {
  const text = fs.readFileSync(path);
  if (text === '') {
    return [];
  }
  return text.replace(/\n$/, '').split('\n');
}

export default function readlines(path) {
  const lines = readlinesSync(path);
  let ix = 0;
  return harden({
    next() {
      if (ix >= lines.length) {
        return false;
      }
      return lines[ix++];
    },
  });
}
