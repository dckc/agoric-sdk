/* global trace */

import { test } from 'tape-promise/tape';
import { setTimeout } from 'xs-platform/moddableTimer';

import testMarshal from './test/test-marshal';
import testKernel from './test/test-kernel';

export default function main() {
  trace('# hi from main\n');
  const htest = test.createHarness();

  testMarshal();  // ISSUE: htest is ambient
  testKernel();

  setTimeout(() => {
    report(htest.summary(), (txt) => { trace(txt + '\n'); });
  }, 500);
  trace('# bye from main\n');
}

// ISSUE: belongs in tape
function report({ total, pass, fail }, writeln) {
  writeln(`1..${total}`);
  writeln(`# tests ${total}`);
  writeln(`# pass  ${pass}`);
  writeln(`# fail  ${fail}`);
}
