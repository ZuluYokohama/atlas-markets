import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { runE4 } from "../../src/lib/atlas/eval/e4.ts";
import { runF0 } from "../../src/lib/atlas/eval/f0.ts";

describe("Stage 11 E4 frozen predictive utility", () => {
  const f0 = runF0();
  const report = runE4(f0);

  it("keeps confirmation closed and does not start neuroevolution", () => {
    assert.equal(report.confirmationOpened, false);
    assert.equal(report.neuroevolutionStarted, false);
    assert.ok(report.trials.some((t) => t.id === "neuroevolution" && t.abandoned));
  });

  it("records every ladder rung including abandoned ones", () => {
    assert.ok(report.trials.length >= 10);
    assert.ok(report.trials.every((t) => t.note.length > 0));
    assert.ok(["UNSUPPORTED", "INCONCLUSIVE"].includes(report.claim));
  });

  it("does not validate any incremental rung on the frozen metric", () => {
    const incr = report.trials.filter((t) => t.rung >= 3 && !t.abandoned);
    assert.ok(incr.every((t) => t.claim !== "VALIDATED"));
    assert.notEqual(report.claim, "VALIDATED");
  });
});
