import harden from '@agoric/harden';

const DEBUG_FLAG = false;
const DEBUG = (...args) => {
  if (DEBUG_FLAG) {
    console.log('===ses:', args);
  }
};

export function evaluateExpr(expr, endowments = {}) {
  DEBUG(
    'evaluateExpr endowments:',
    JSON.stringify(Object.entries(endowments).map(([k, v]) => [k, typeof v])),
  );
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

export function evaluateProgram(src, endowments = {}) {
  console.warn('TODO: how to get the result of a program?');
  return evaluateExpr(src, endowments);
}

export function evaluateModule(src, endowments = {}) {
  throw '@@TODO!';
}

export function makeEvaluators(options = {}) {
  if (Object.keys(options).length > 0) {
    console.log('WARNING: not implemented:', Object.keys(options));
  }

  return harden({
    evaluateExpr,
    evaluateProgram,
    evaluateModule,
  });
}

// support both evaluate = require('@agoric/evaluate')
// and const { makeEvaluators } = require('@agoric/evaluate');
evaluateExpr.evaluateExpr = evaluateExpr;
evaluateExpr.evaluateProgram = evaluateProgram;
evaluateExpr.evaluateModule = evaluateModule;
evaluateExpr.makeEvaluators = makeEvaluators;
harden(evaluateExpr);

export default evaluateExpr;
