/* global E makePromise */
// Copyright (C) 2019 Agoric, under Apache License 2.0

import harden from '@agoric/harden';
import { mustBeSameStructure } from '../util/sameStructure';

// For clarity, the code below internally speaks of a scenario is which Alice is
// trading some of her money for some of Bob's stock. However, for generality,
// the API does not expose names like "alice", "bob", "money", or "stock".
// Rather, Alice and Bob are left and right respectively. Money represents the
// rights transferred from left to right, and Stock represents the rights
// transferred from right to left.
const escrowExchange = harden({
  start: (terms, inviteMaker) => {
    const { left: moneyNeeded, right: stockNeeded } = terms;

    function makeTransfer(units, srcPaymentP) {
      const { assay } = units.label;
      const escrowP = E(assay).claimExactly(units, srcPaymentP, 'escrow');
      const winnings = makePromise();
      const refund = makePromise();
      return harden({
        phase1() {
          return escrowP;
        },
        phase2() {
          winnings.res(escrowP);
          refund.res(null);
        },
        abort(reason) {
          winnings.reject(reason);
          refund.res(escrowP);
        },
        getWinnings() {
          return winnings.p;
        },
        getRefund() {
          return refund.p;
        },
      });
    }

    // Promise wiring

    const moneyPayment = makePromise();
    const moneyTransfer = makeTransfer(moneyNeeded, moneyPayment.p);

    const stockPayment = makePromise();
    const stockTransfer = makeTransfer(stockNeeded, stockPayment.p);

    // TODO Use cancellation tokens instead.
    const aliceCancel = makePromise();
    const bobCancel = makePromise();

    // Set it all in motion optimistically.

    const decisionP = Promise.race([
      Promise.all([moneyTransfer.phase1(), stockTransfer.phase1()]),
      aliceCancel.p,
      bobCancel.p,
    ]);
    decisionP.then(
      _ => {
        moneyTransfer.phase2();
        stockTransfer.phase2();
      },
      reason => {
        moneyTransfer.abort(reason);
        stockTransfer.abort(reason);
      },
    );

    // Seats

    const aliceSeat = harden({
      offer: moneyPayment.res,
      cancel: aliceCancel.reject,
      getWinnings: stockTransfer.getWinnings,
      getRefund: moneyTransfer.getRefund,
    });

    const bobSeat = harden({
      offer: stockPayment.res,
      cancel: bobCancel.reject,
      getWinnings: moneyTransfer.getWinnings,
      getRefund: stockTransfer.getRefund,
    });

    return harden({
      left: inviteMaker.make('left', aliceSeat),
      right: inviteMaker.make('right', bobSeat),
    });
  },

  checkUnits: (installation, allegedInviteUnits, expectedTerms, seat) => {
    mustBeSameStructure(allegedInviteUnits.extent.seatDesc, seat);
    const allegedTerms = allegedInviteUnits.extent.terms;
    mustBeSameStructure(allegedTerms, expectedTerms, 'Escrow checkUnits');
    mustBeSameStructure(
      allegedInviteUnits.extent.installation,
      installation,
      'escrow checkUnits installation',
    );
    return true;
  },

  // Check the left or right side, and return the other. Useful when this is a
  // trade of goods for an invite, for example.
  checkPartialUnits: (installation, allegedInvite, expectedTerms, seat) => {
    const allegedSeat = allegedInvite.extent.terms;
    mustBeSameStructure(
      allegedSeat[seat],
      expectedTerms,
      'Escrow checkPartialUnits seat',
    );

    mustBeSameStructure(
      allegedInvite.extent.installation,
      installation,
      'escrow checkPartialUnits installation',
    );

    return seat === 'left' ? allegedSeat.right : allegedSeat.left;
  },
});

// generated using func2lit.js
const escrowExchangeSrcs = harden({
  start:
    "(terms, inviteMaker) => {\n    const { left: moneyNeeded, right: stockNeeded } = terms;\n\n    function makeTransfer(units, srcPaymentP) {\n      const { assay } = units.label;\n      const escrowP = E(assay).claimExactly(units, srcPaymentP, 'escrow');\n      const winnings = makePromise();\n      const refund = makePromise();\n      return harden({\n        phase1() {\n          return escrowP;\n        },\n        phase2() {\n          winnings.res(escrowP);\n          refund.res(null);\n        },\n        abort(reason) {\n          winnings.reject(reason);\n          refund.res(escrowP);\n        },\n        getWinnings() {\n          return winnings.p;\n        },\n        getRefund() {\n          return refund.p;\n        },\n      });\n    }\n\n    // Promise wiring\n\n    const moneyPayment = makePromise();\n    const moneyTransfer = makeTransfer(moneyNeeded, moneyPayment.p);\n\n    const stockPayment = makePromise();\n    const stockTransfer = makeTransfer(stockNeeded, stockPayment.p);\n\n    // TODO Use cancellation tokens instead.\n    const aliceCancel = makePromise();\n    const bobCancel = makePromise();\n\n    // Set it all in motion optimistically.\n\n    const decisionP = Promise.race([\n      Promise.all([moneyTransfer.phase1(), stockTransfer.phase1()]),\n      aliceCancel.p,\n      bobCancel.p,\n    ]);\n    decisionP.then(\n      _ => {\n        moneyTransfer.phase2();\n        stockTransfer.phase2();\n      },\n      reason => {\n        moneyTransfer.abort(reason);\n        stockTransfer.abort(reason);\n      },\n    );\n\n    // Seats\n\n    const aliceSeat = harden({\n      offer: moneyPayment.res,\n      cancel: aliceCancel.reject,\n      getWinnings: stockTransfer.getWinnings,\n      getRefund: moneyTransfer.getRefund,\n    });\n\n    const bobSeat = harden({\n      offer: stockPayment.res,\n      cancel: bobCancel.reject,\n      getWinnings: moneyTransfer.getWinnings,\n      getRefund: stockTransfer.getRefund,\n    });\n\n    return harden({\n      left: inviteMaker.make('left', aliceSeat),\n      right: inviteMaker.make('right', bobSeat),\n    });\n  }",
  checkUnits:
    "(installation, allegedInviteUnits, expectedTerms, seat) => {\n    mustBeSameStructure(allegedInviteUnits.extent.seatDesc, seat);\n    const allegedTerms = allegedInviteUnits.extent.terms;\n    mustBeSameStructure(allegedTerms, expectedTerms, 'Escrow checkUnits');\n    mustBeSameStructure(\n      allegedInviteUnits.extent.installation,\n      installation,\n      'escrow checkUnits installation',\n    );\n    return true;\n  }",
  checkPartialUnits:
    "(installation, allegedInvite, expectedTerms, seat) => {\n    const allegedSeat = allegedInvite.extent.terms;\n    mustBeSameStructure(\n      allegedSeat[seat],\n      expectedTerms,\n      'Escrow checkPartialUnits seat',\n    );\n\n    mustBeSameStructure(\n      allegedInvite.extent.installation,\n      installation,\n      'escrow checkPartialUnits installation',\n    );\n\n    return seat === 'left' ? allegedSeat.right : allegedSeat.left;\n  }",
});

/* Check that the literal source is current */
for (const name of Object.keys(escrowExchange)) {
  if ((escrowExchangeSrcs[name] !== `${escrowExchange[name]}`, name)) {
    console.warn('escrowExchange source out of sync:', name);
  }
}

export { escrowExchangeSrcs };
