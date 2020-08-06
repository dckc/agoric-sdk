/* global harden */

import { E } from '@agoric/eventual-send';

const log = console.log;

log(`=> loading bootstrap.js`);

export function buildRootObject(_vatPowers) {
  log(`=> setup called`);
  return harden({
    bootstrap(vats) {
      log('=> bootstrap() called');
      E(vats.alice)
        .sayHelloTo(vats.bob)
        .then(
          r => log(`=> alice.hello(bob) resolved to '${r}'`),
          e => log(`=> alice.hello(bob) rejected as '${e}'`),
        );
    },
  });
}
