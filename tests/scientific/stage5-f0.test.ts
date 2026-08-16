import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertNotConfirmation,
  buildRows,
  forecast,
  generateF0Universe,
  runF0,
  SPLIT,
  type BaselineName,
} from "../../src/lib/atlas/index.ts";

const ALL: BaselineName[] = ["unconditional", "regime", "knn", "kernel", "ridge", "tree"];

describe("Stage 5 F0 outcomes and falsification", () => {
  it("refuses confirmation-block access", () => {
    assert.throws(() => assertNotConfirmation(SPLIT.confirmation.lo), /CONFIRMATION_QUARANTINE/);
    assert.doesNotThrow(() => assertNotConfirmation(SPLIT.development.hi));
  });

  it("computes the declared outcome families on development only", () => {
    const days = generateF0Universe();
    assert.equal(days.length, 520);
    const rows = buildRows(days);
    assert.ok(rows.length > 50);
    assert.ok(rows.every((r) => r.index < SPLIT.confirmation.lo));
    const r = rows[30];
    assert.equal(typeof r.yPnl, "number");
    assert.equal(typeof r.yMae, "number");
    assert.equal(typeof r.yMfe, "number");
    assert.ok(r.yHit === 0 || r.yHit === 1);
    assert.equal(typeof r.yFwd, "number");
    assert.equal(typeof r.yRv, "number");
    assert.ok(r.yMfe >= r.yMae);
  });

  it("all six baselines return finite quantile forecasts", () => {
    const rows = buildRows(generateF0Universe()).filter((r) => r.index < 80);
    const q = rows[40];
    const train = rows.filter((r) => r.index < q.index - 11);
    for (const name of ALL) {
      const { q: fc, nEff } = forecast(name, q, train);
      assert.ok(Number.isFinite(fc.q10) && Number.isFinite(fc.q50) && Number.isFinite(fc.q90), name);
      assert.ok(fc.q10 <= fc.q90, name);
      assert.ok(nEff > 0, name);
    }
  });

  it("runs F0-v0 without opening confirmation and records a protocol status", () => {
    const report = runF0();
    assert.equal(report.protocolId, "F0-position-state-vs-baselines-v0");
    assert.equal(report.confirmationOpened, false);
    assert.equal(report.windows.length, 2);
    assert.ok(["VALIDATED", "INCONCLUSIVE", "UNSUPPORTED"].includes(report.claim));
    for (const w of report.windows) {
      assert.ok(w.n > 10);
      assert.ok(Number.isFinite(w.pinball.knn));
      assert.ok(Number.isFinite(w.pinball.unconditional));
      assert.ok(Number.isFinite(w.pinball.regime));
    }
  });
});
