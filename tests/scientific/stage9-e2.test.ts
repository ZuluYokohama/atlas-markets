import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { runE2, trialStats } from "../../src/lib/atlas/geometry/e2.ts";

function rng() {
  return 0.37;
}

describe("Stage 9 E2 holonomy null calibration", () => {
  const report = runE2();

  it("calibrates type I and has power against planted SO(2) holonomy", () => {
    assert.equal(report.confirmationOpened, false);
    assert.ok(report.typeI < 0.12, `typeI=${report.typeI}`);
    assert.ok(report.power > 0.5, `power=${report.power}`);
    assert.ok(report.detPower < 0.25, `detPower=${report.detPower}`);
    assert.ok(["CERTIFIED_DETECTABILITY", "INCONCLUSIVE"].includes(report.claim));
  });

  it("does not use det as a detector and is gauge-stable", () => {
    const t = trialStats(8, 0.7, 0, () => 0.5);
    assert.ok(Math.abs(t.det - 1) < 1e-9);
    assert.ok(report.gaugeDelta < 1e-8, `gaugeDelta=${report.gaugeDelta}`);
  });

  it("records power vs angle, noise, and length", () => {
    assert.ok(report.cells.length >= 3 * 3 * 4);
    const easy = report.cells.find((c) => c.theta === 1 && c.sigma === 0.02 && c.length === 4);
    const hard = report.cells.find((c) => c.theta === 0.2 && c.sigma === 0.2 && c.length === 16);
    assert.ok(easy && easy.power > 0.8);
    assert.ok(hard && hard.power < easy!.power);
  });
});
