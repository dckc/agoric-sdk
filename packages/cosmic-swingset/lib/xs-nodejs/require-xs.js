/* global globalThis, Compartment */
import harden from '@agoric/harden';

function ltrim(text, prefix) {
  if (text.startsWith(prefix)) {
    text = text.slice(prefix.length);
  }
  return text;
}

function rtrim(text, suffix) {
  if (text.endsWith(suffix)) {
    text = text.slice(0, -suffix.length);
  }
  return text;
}

/// require() for pre-compiled modules
export function require(specifier) {
  console.warn(`require(${specifier}): xs approach is limited to pre-compiled modules`);

  // Turn specifiers back into what xs manifest expects.
  const modName = rtrim(ltrim(specifier, './'), '.js');

  function pureModule(name) {
    return name === '@agoric/harden';
  }

  const c = new Compartment(
    modName,
    { console },
    Object.fromEntries(Object.entries(Compartment.map).filter(pureModule)),
  );
  return c.export;
}

function resolve(path) {
  console.log(`require.resolve(${path}): xs stub is a noop.`);
  return path;
}
require.resolve = resolve;

globalThis.require = harden(require);
