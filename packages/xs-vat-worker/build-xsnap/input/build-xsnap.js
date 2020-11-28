// this file is loaded at the start of a new subprocess

import { setBundle } from './bundle-functions.js';
import { vatSourceBundle } from './vatSourceBundle.js';

async function run() {
  await setBundle(vatSourceBundle, {
    name: 'alice',
    zcfBundleName: 'zcf',
  });
  console.log(`did setBundle`);
}

run();
