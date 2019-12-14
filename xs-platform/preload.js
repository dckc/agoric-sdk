/* global Compartment */

import Nat from '@agoric/nat';
import harden from '@agoric/harden';
// Add makeHandeled to Promise; needed in test-marshal
import { maybeExtendPromise } from '@agoric/eventual-send';
import { console } from 'xs-platform/console';
import { setImmediate } from 'xs-platform/moddableTimer';

global.console = console; // used in @agoric/marshal
global.setImmediate = setImmediate;
global.Promise = maybeExtendPromise(Promise);

Object.freeze(Promise);

export function usesNat() {
  Nat;
}

function filterKeys(obj, isOk) {
  const props = Object.entries(obj).filter(([k, _v]) => isOk(k));
  // eslint-disable-next-line no-sequences
  return props.reduce((acc, [k, v]) => ((acc[k] = v), acc), {});
}

export function require(specifier) {
  // KLUDGE: Turn paths back into what xs manifest expects.
  if (specifier.startsWith('./')) {
    specifier = specifier.slice(2);
  }
  if (specifier.endsWith('.js')) {
    specifier = specifier.slice(0, -3);
  }

  function userModule(name) {
    return name === '@agoric/harden' || name.indexOf('controller') >= 0;
  }
  const c = new Compartment(
    specifier,
    { console },
    filterKeys(Compartment.map, userModule),
  );
  return c.export;
}

function resolve(path) {
  return path;
}
require.resolve = resolve;

global.require = require;
