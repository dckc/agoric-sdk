// Copyright (C) 2019 Agoric, under Apache License 2.0

import { makeSharingService } from '../../../src/sharing';

export function buildRootObject(_vatPowers) {
  return harden({ makeSharingService });
}
