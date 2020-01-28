const harden = x => Object.freeze(x, true);

export function normalize(path) {
  // multiple //s -> /
  path = path.replace(/\/\/+/g, '/');
  // /./ -> /
  path = path.replace(/\/\.\//g, '/');
  // segment/.. -> X
  path = path.replace(/[^\/]+\/\.\.\b/g, '');
  return path;
}

export function resolve(...paths) {
  let path = null;
  // "The given sequence of paths is processed from right to left ..."
  for (const segment of [...paths].reverse()) {
    if (path === null) {
      path = segment;
    } else {
      path = `${segment}/${path}`;
    }
    if (path.startsWith('/')) {
      return normalize(path);
    }
  }
  // "If after processing all given path segments an absolute path
  // has not yet been generated, the current working directory is
  // used."
  return normalize(`./${path}`);
}

export function join(...paths) {
  return normalize(paths.join('/'));
}

function later(thunk) {
  return new Promise((resolve, reject) => {
    try {
      resolve(thunk());
    } catch (err) {
      reject(err);
    }
  });
}

export function makePath(filename, { File, Iterator }) {
  const mk = there => makePath(there, { File, Iterator });

  function readFileSync() {
    let file;
    let contents;
    try {
      file = new File(filename);
      if (file.length === 0) {
        // avoid: read past end of file
        contents = '';
      } else {
        contents = file.read(String);
      }
    } catch (oops) {
      // not sure why xs loses error messages, but without logging, we just get:
      // xs-platform/pathlib.js:21: exception: throw!
      console.log({ filename, message: oops.message });
      throw new Error(`${filename}: ${oops.message}`);
    }
    file.close();
    return contents;
  }

  function withWriting(suffix, thunk) {
    const tmpName = filename + suffix;
    const file = new File(tmpName, true);
    const fp = harden({
      writeSync(value) {
        file.write(value);
      },
    });
    try {
      thunk(fp);
    } finally {
      file.close();
    }
    File.rename(tmpName, filename);
  }

  function atomicReplace(contents) {
    return later(() => {
      const tmp = mk(`${filename}.tmp`);
      const tmpF = new File(tmp, true);
      tmpF.write(contents);
      tmpF.close();
      File.rename(tmp, filename);
    });
  }

  function readdirSync(options = {}) {
    const dirIter = new Iterator(filename);
    let item;
    const items = [];
    while ((item = dirIter.next())) {
      if (options.withFileTypes) {
        const f = typeof item.length === 'number';
        items.push(
          harden({
            name: item.name,
            isFile: () => f,
          }),
        );
      } else {
        items.push(item.name);
      }
    }
    return items;
  }

  function readdir(options) {
    return later(() => readdirSync(options));
  }

  function butLast(p) {
    const pos = p.lastIndexOf('/');
    return pos >= 0 ? p.slice(0, pos + 1) : p;
  }

  function statSync() {
    new File(filename);
    return harden({});
  }

  function exists() {
    try {
      statSync();
    } catch (_doesNotExist) {
      return false;
    }
    return true;
  }

  return harden({
    toString() {
      return filename;
    },
    resolve(...others) {
      return mk(resolve(filename, ...others));
    },
    join(...others) {
      return mk(join(filename, ...others));
    },
    exists,
    statSync,
    readFileSync,
    readFile() {
      return later(() => readFileSync());
    },
    readlinesSync() {
      const text = readFileSync();
      if (text === '') {
        return [];
      }
      return text.replace(/\n$/, '').split('\n');
    },
    readdirSync,
    readdir,
    atomicReplace,
    writeFile(data, options) {
      return later(() => {
        const f = new File(filename, true);
        f.write(data);
      });
    },
    withWriting,
  });
}
