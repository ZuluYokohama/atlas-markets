import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { COMPLETION, GATES, PRODUCT_CLAIM, WHAT_ENTERED } from "../../src/lib/atlas/ledger/product.ts";

describe("Stage 13 evidence product", () => {
  it("answers all eight completion questions", () => {
    assert.equal(COMPLETION.length, 8);
    assert.match(COMPLETION[0].q, /entered/i);
    assert.match(COMPLETION[7].q, /justified/i);
    assert.match(PRODUCT_CLAIM, /UNSUPPORTED/);
    assert.match(PRODUCT_CLAIM, /not justified in claiming alpha/i);
  });

  it("does not validate a predictive gate and keeps confirmation closed", () => {
    const e4 = GATES.find((g) => g.id === "E4")!;
    const f0 = GATES.find((g) => g.id === "F0")!;
    assert.equal(e4.status, "FAIL");
    assert.match(e4.evidence, /UNSUPPORTED/);
    assert.equal(f0.status, "FAIL");
    assert.equal(WHAT_ENTERED.orderAuthority, false);
    assert.match(WHAT_ENTERED.confirmation, /closed/i);
    assert.ok(GATES.every((g) => !/VALIDATED/.test(g.evidence) || g.id === "never"));
  });
});
