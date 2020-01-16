/* global Compartment */

import harden from '@agoric/harden';
import Nat from '@agoric/nat';
import {
  evaluateExpr,
  evaluateModule,
  evaluateProgram,
  makeEvaluators,
} from '@agoric/evaluate';

const DEBUG_FLAG = false;
const DEBUG = (...args) => {
  if (DEBUG_FLAG) {
    console.log('===ses:', args);
  }
};


function agRequire(modSpec) {
  DEBUG(`agRequire(${modSpec})\n`);
  switch (modSpec) {
    case '@agoric/harden':
      return harden({ default: harden });
    case '@agoric/nat':
      return harden({ default: Nat });
    case '@agoric/evaluate':
      return harden({
        default: evaluateExpr,
        evaluateExpr,
        evaluateProgram,
        evaluateModule,
        makeEvaluators,
      });
    default:
      throw 'bad module or something?';
  }
}

const SES = { makeSESRootRealm, confine, confineExpr };

function confine() {
  throw 'TODO!@@';
}

function confineExpr() {
  throw 'TODO!@@';
}

const makeRealmSrc = `(
function makeRealm() {
  return harden({
    makeRequire(options) {
      DEBUG('makeRequire', {optionKeys: Object.keys(options)});
      return agRequire;
    },
    evaluate: evaluateExpr,
    global: {
      Realm: {
	makeCompartment,
      },
      SES,
    },
  });
}
)`;

export function makeSESRootRealm(options) {
  // console.log('makeSESRootRealm', { optionKeys: Object.keys(options) });
  const {
    ses,
    '@agoric/evaluate': agEval,
    '@agoric/harden': agHarden,
    '@agoric/nat': agNat,
  } = Compartment.map;
  const map = { ses, '@agoric/harden': agHarden, '@agoric/nat': agNat, '@agoric/evaluate': agEval };
  const optEndowments = options.consoleMode == 'allow' ? { console } : {};
  const makeCompartment = (...args) =>
    new Compartment('ses', { ...optEndowments, SES }, map);

  const c = makeCompartment();
  const makeRealm = c.export.evaluateExpr(makeRealmSrc, {
    makeCompartment,
    evaluateExpr,
    DEBUG,
    agRequire,
    harden,
  });
  const realm = makeRealm();
  DEBUG('new realm:', typeof realm.makeRequire({}));
  return realm;
}

export { evaluateExpr };
export default SES;
