/* global globalThis, Compartment */
const harden = x => Object.freeze(x, true);

// ISSUE: duplicated from bundle-source.js
function butLast(p) {
  const pos = p.lastIndexOf('/');
  return pos >= 0 ? p.slice(0, pos + 1) : p;
}

// ISSUE: duplicated from bundle-source.js
function mangleName(path) {
  let bundlePath;
  const parts = path.match(/\bvat(-)([^\.]+)(\.js)?$/);
  if (parts) {
    bundlePath = `${butLast(path)}vat_${parts[2]}-src.js`;
  } else if (path.match(/\/bootstrap.js$/)) {
    bundlePath = `${butLast(path)}bootstrap-src.js`;
  } else {
    throw new Error(`expected vat-NAME.js; got: ${path}`);
  }
  console.log(`==@@ require.resolve ${path} -> ${bundlePath}`);
  return bundlePath;
}

function resolve(specifier) {
  console.warn('require.resolve on xs is a noop:', specifier);
  return specifier;
}


export function makeRequire(files, globals, modMap, root='ses') {
  function require(specifier) {
    if (specifier === '@agoric/harden') {
      return { default: harden };
    }
    const modText = files.resolve(mangleName(specifier)).readFileSync();
    const modExpr = modText.slice('export default '.length);
    const c = new Compartment(root, { require, ...globals }, modMap);
    const getExport = c.export.evaluateExpr(modExpr, {});
    return getExport();
  }
  require.resolve = resolve;
  return harden(require);
}
