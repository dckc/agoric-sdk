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
