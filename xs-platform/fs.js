// ref https://github.com/Moddable-OpenSource/moddable/blob/public/examples/files/files/main.js

// eslint-disable-next-line import/no-unresolved
import { File, Iterator } from 'file';

export function readdirSync(path) {
  const out = [];
  const iterator = new Iterator(path);
  let item;
  // eslint-disable-next-line no-cond-assign
  while ((item = iterator.next())) {
    const isFile = typeof item.length !== 'undefined';
    const dirEnt = {
      name: item.name,
      isFile: () => isFile,
    };
    out.push(dirEnt);
  }
  return out;
}

export function statSync(path) {
  const access = new File(path, false);
  return { length: access.length };
}

export default { readdirSync, statSync };
