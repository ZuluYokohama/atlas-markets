import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { runE3 } from "../../src/lib/atlas/geometry/e3.ts";

describe("Stage 10 E3 point-in-time identifiability", () => {
  const report = runE3();

  it("certifies a PIT representation and keeps confirmation closed", () => {
    const failed = report.checks.filter((c) => !c.passed);
    assert.equal(failed.length, 0, JSON.stringify(failed, null, 2));
    assert.equal(report.claim, "CERTIFIED_PIT_REPRESENTATION");
    assert.equal(report.confirmationOpened, false);
  });

  it("is invariant to outcome shuffle and sensitive to future scaling", () => {
    const shuf = report.checks.find((c) => c.name === "outcome-shuffle-invariant")!;
    const leak = report.checks.find((c) => c.name === "future-scaling-is-detectable")!;
    const conf = report.checks.find((c) => c.name === "no-confirmation-vertices")!;
    assert.equal(shuf.passed, true);
    assert.equal(leak.passed, true);
    assert.equal(conf.passed, true);
  });
});
