import harden from '@agoric/harden';

import { File, Iterator } from 'moddable-sdk/files/file/file'; // beware: powerful!
import { makePath, resolve } from './pathlib';
import process from './process';

export function makePathAccess(path) {
  // ISSUE: beyond node fs API
  return makePath(path, { File, Iterator });
}

function readFileSync(path) {
  const p = makePath(path, { File, Iterator });
  return p.readFileSync();
}

function readdirSync(path) {
  const p = makePath(path, { File, Iterator });
  return p.readdirSync();
}

function statSync(path) {
  const p = makePath(path, { File, Iterator });
  return p.statSync();
}

export function realpathSync(path) {
  console.warn('XS: realpathSync() is a stub (TODO)');
  return resolve(`${process.cwd()}/`, path);
}

// BLECH global mutable state
const openFiles = (() => {
  const files = [];

  function lookup(fd) {
    const fp = files[fd];
    if (!fp) {
      throw new Error(`bad file descriptor: ${fd}`);
    }
    return fp;
  }

  return harden({
    lookup,
    add(path, write) {
      const fd = files.length;
      const fp = new File(path, write);
      files.push(fp);
      // console.log(`new fd: ${fd} -> ${path}`);
      return fd;
    },
    close(fd) {
      const fp = lookup(fd);
      // console.log(`closing fd: ${fd}`);
      fp.close();
    },
  });
})();

function later(thunk) {
  Promise.resolve(null).then(thunk);
}

const promises = harden({
  write(fd, text) {
    later(() => {
      openFiles.lookup(fd).write(text);
    });
  },
  close(fd) {
    later(() => openFiles.close(fd));
  },
  readdir(path) {
    return makePath(path, { File, Iterator }).readdir();
  },
  rename(from, to) {
    later(() => File.rename(from, to));
  },
  unlink(path) {
    later(() => File.delete(path));
  },
});

export function openSync(path, mode = 'r') {
  let fp;
  if (mode === 'r') {
    return openFiles.add(path);
  }
  if (mode === 'w') {
    return openFiles.add(path, true);
  }
  if (mode === 'wx') {
    try {
      const probe = new File(path);
      probe.close();
      throw new Error('already exists');
    } catch (_doesNotExist) {
      // ok
    }
    return openFiles.add(path, true);
  }
  throw new Error(`open mode invalid or not implemented: ${mode}`);
}

export function writeSync(fd, text) {
  openFiles.lookup(fd).write(text);
}

export function write(fd, text, callback) {
  later(() => {
    try {
      openFiles.lookup(fd).write(text);
      callback(null, text.length, text);
    } catch (err) {
      callback(err);
    }
  });
}

export function close(fd, callback) {
  later(() => {
    openFiles.close(fd);
    callback(null);
  });
}

export function closeSync(fd) {
  openFiles.close(fd);
}

export function renameSync(from, to) {
  File.rename(from, to);
}

export default {
  close,
  closeSync,
  openSync,
  promises,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  statSync,
  write,
  writeSync,
};
