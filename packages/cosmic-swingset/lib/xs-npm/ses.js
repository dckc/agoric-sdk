/* global Compartment */

import harden from '@agoric/harden';
import Nat from '@agoric/nat';

const DEBUG_FLAG = false;
const DEBUG = (...args) => { if (DEBUG_FLAG) { console.log('===ses:', args); } };


export function evaluateExpr(expr, endowments) {
  DEBUG('evaluateExpr endowments:',
	JSON.stringify(Object.entries(endowments)
		       .map(([k, v]) => [k, typeof v])));
  // ISSUE: check that params are valid identifiers
  const params = Object.keys(endowments || {}).join(', ');
  const wrap = `(function ({${params}}) { return ${expr}; })`;
  let f;
  try {
    f = (1, eval)(wrap);
  } catch (oops) {
    DEBUG('eval wrap failed:', oops.message, wrap);
    throw oops;
  }
  const out = f(endowments);
  DEBUG('evaluateExpr =>', typeof out);
  return out;
}

function evaluateProgram(src, endowments) {
  return evaluateExpr(`(() => { ${src} })()`, endowments);
}

function evaluateModule(src, endowments) {
  throw '@@TODO!';
}

function makeEvaluators(options) {
  if(Object.keys(options).length > 0) {
    console.log('WARNING: not implemented:', Object.keys(options));
  }

  return harden({
    evaluateExpr,
    evaluateProgram,
    evaluateModule,
  });
}

function agRequire(modSpec) {
  DEBUG(`agRequire(${modSpec})\n`);
  switch(modSpec) {
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
    throw('bad module or something?');
  }
}


const SES = { makeSESRootRealm, confine, confineExpr };

function confine() {
  throw('TODO!@@');
}

function confineExpr() {
  throw('TODO!@@');
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
  const { ses, '@agoric/harden': agHarden, '@agoric/nat': agNat } = Compartment.map;
  const map = { ses, '@agoric/harden': agHarden, '@agoric/nat': agNat };
  const optEndowments = options.consoleMode == 'allow' ? { console } : {};
  const makeCompartment = (...args) => new Compartment('ses', { ...optEndowments, SES }, map);

  const c = makeCompartment();
  const makeRealm = c.export.evaluateExpr(makeRealmSrc, { makeCompartment, evaluateExpr, DEBUG, agRequire, harden });
  const realm = makeRealm();
  DEBUG('new realm:', typeof realm.makeRequire({}));
  return realm;
}

export default SES;
