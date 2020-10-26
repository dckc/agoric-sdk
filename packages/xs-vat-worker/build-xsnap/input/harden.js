import makeHardener from '@agoric/make-hardener';
// getGlobalIntrinsics
import { getAnonymousIntrinsics } from 'ses/src/get-anonymous-intrinsics.js';

const harden = makeHardener();
print('about to harden top stuf...');
harden([Object, Function, Array]);
print('...hardened top stuf.');

print('hardening anon intrinsics');
const ai = getAnonymousIntrinsics();
print(Object.keys(ai));
harden(ai);
print('anon done.');

/*
print('same?');
print(Object.is(Object.prototype, Object.getPrototypeOf({}))); // true

harden(Function.prototype);  // <- worth a try?

// Dr. Dr. it hurts when I do this.
// harden(Object.prototype);
print('...hardened 1a');

harden(Object.getPrototypeOf({}));
print('...hardened 1');

*/

globalThis.harden = harden;
