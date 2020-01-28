import harden from '@agoric/harden';

import { File, Iterator } from 'moddable-sdk/files/file/file'; // beware: powerful!
import { makePath, resolve } from './pathlib';
import process from './process';

export function makePathAccess(path) {
  // ISSUE: beyond node fs API
  return makePath(path, { File, Iterator });
}

const mkp = makePathAccess;

function readFileSync(path) {
  return mkp(path).readFileSync();
}

function readdirSync(path, options) {
  return mkp(path).readdirSync(options);
}

function statSync(path) {
  return mkp(path).statSync();
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
  return new Promise((resolve, reject) => {
    try {
      resolve(thunk());
    } catch (err) {
      reject(err);
    }
  });
}

const promises = harden({
  readFile(path) {
    return mkp(path).readFile();
  },
  writeFile(file, data) {
    return mkp(file).writeFile(data);
  },
  write(fd, text) {
    return later(() => openFiles.lookup(fd).write(text));
  },
  close(fd) {
    return later(() => openFiles.close(fd));
  },
  readdir(path) {
    return mkp(path).readdir();
  },
  rename(from, to) {
    return later(() => File.rename(from, to));
  },
  unlink(path) {
    return later(() => File.delete(path));
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
      // ISSUE: need to distinguish doesNotExist from no permission etc.?
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
