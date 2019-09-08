/* global Compartment */

import Nat from '@agoric/nat';
// Add makeHandeled to Promise; needed in test-marshal
import maybeExtendPromise from '@agoric/eventual-send';
import { console } from 'xs-platform/console';
import { setImmediate } from 'xs-platform/moddableTimer';

global.console = console; // used in @agoric/marshal
global.setImmediate = setImmediate;
global.Promise = maybeExtendPromise(Promise);

Object.freeze(Promise);

export function usesNat() {
  Nat;
}

export function require(specifier) {
  // KLUDGE: Turn paths back into what xs manifest expects.
  if (specifier.startsWith('./')) {
    specifier = specifier.slice(2);
  }
  if (specifier.endsWith('.js')) {
    specifier = specifier.slice(0, -3);
  }
  const c = new Compartment(specifier, { console });
  return c.export;
}

function resolve(path) {
  return path;
}
require.resolve = resolve;

global.require = require;

// eslint-disable-next-line no-underscore-dangle
global.__dirname = './test/'; // KLUDGE
