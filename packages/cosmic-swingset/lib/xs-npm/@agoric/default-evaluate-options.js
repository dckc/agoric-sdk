import harden from '@agoric/harden';

export default function makeDefaultEvaluateOptions() {
  return harden({
    transforms: [],
  });
}
