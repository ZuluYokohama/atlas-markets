import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { runE1 } from "../../src/lib/atlas/geometry/e1.ts";

describe("Stage 8 E1 connection-spectral matrix", () => {
  const report = runE1();

  it("certifies the synthetic oracle (E1-A)", () => {
    const a = report.subgates.find((s) => s.id === "E1-A")!;
    assert.equal(a.status, "PASS", JSON.stringify(a));
    assert.equal(report.oracleStatus, "CERTIFIED_SYNTHETIC_ORACLE");
    assert.ok(a.numbers.dClean < 1e-12);
    assert.ok(a.numbers.dConn < a.numbers.dDct);
  });

  it("records a gauge-fair table and rate-distortion counts", () => {
    const b = report.subgates.find((s) => s.id === "E1-B")!;
    const e = report.subgates.find((s) => s.id === "E1-E")!;
    assert.ok(b.numbers.dConn != null && b.numbers.dDct != null && b.numbers.dRand != null);
    assert.ok(e.numbers.connBits > e.numbers.dctBits);
    assert.equal(report.confirmationOpened, false);
  });

  it("does not authorize connection coordinates as predictive inputs unless E1-G passes both windows", () => {
    const g = report.subgates.find((s) => s.id === "E1-G")!;
    assert.equal(report.predictiveAuthorization, false);
    assert.ok(["UNSUPPORTED", "INCONCLUSIVE", "VALIDATED"].includes(report.e1gClaim));
    if (g.status !== "PASS") {
      assert.notEqual(report.e1gClaim, "VALIDATED");
    }
    assert.ok(Number.isFinite(g.numbers.w1Delta));
    assert.ok(Number.isFinite(g.numbers.w2Delta));
  });
});
