/* global trace */

import { test } from 'tape-promise/tape';

import testMarshal from './test/test-marshal';

export default function main() {
  trace('hi from main\n');

  test('hello world tape', t => {
    t.equal(1 + 1, 2);
    t.end();
  });

  testMarshal();

  trace('bye from main\n');
}
