import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { viabilityReadout } from "../../src/lib/atlas/ledger/viability.ts";

describe("analysis-lab viability readout", () => {
  it("abstains when OOD or sparse and never emits a trade word", () => {
    const ood = viabilityReadout({
      ood: true,
      cone: { q10: -10, q50: 0, q90: 10, n: 20, nEff: 20, status: "UNSUPPORTED" },
    });
    const sparse = viabilityReadout({
      ood: false,
      cone: { q10: -1, q50: 0, q90: 1, n: 3, nEff: 3, status: "UNSUPPORTED" },
    });
    const ok = viabilityReadout({
      ood: false,
      cone: { q10: -20, q50: 5, q90: 40, n: 12, nEff: 12, status: "UNSUPPORTED" },
    });
    assert.equal(ood.stance, "ABSTAIN");
    assert.equal(sparse.stance, "ABSTAIN");
    assert.equal(ok.stance, "INSPECT");
    assert.equal(ok.claim, "DESCRIPTIVE");
    assert.ok(!/enter|exit|buy|sell|trade/i.test(ok.reasons.join(" ")));
  });
});
