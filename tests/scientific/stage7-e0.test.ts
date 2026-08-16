import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { e0AllPassed, runE0Certificates } from "../../src/lib/atlas/geometry/certificates.ts";
import { assembleConnection, cycleHolonomy, plantedTriangle } from "../../src/lib/atlas/geometry/connection.ts";
import { generateF0Universe } from "../../src/lib/atlas/eval/synth.ts";
import { buildRows } from "../../src/lib/atlas/eval/outcomes.ts";
import { SPLIT } from "../../src/lib/atlas/eval/splits.ts";

describe("Stage 7 E0 connection operators", () => {
  it("passes every operator certificate", () => {
    const report = runE0Certificates();
    const failed = report.checks.filter((c) => !c.passed);
    assert.equal(failed.length, 0, JSON.stringify(failed, null, 2));
    assert.equal(report.status, "CERTIFIED_OPERATOR_IMPLEMENTATION");
    assert.equal(e0AllPassed(report), true);
  });

  it("does not use outcomes when assembling a market-like cloud", () => {
    const days = generateF0Universe();
    const rows = buildRows(days).filter((r) => r.index <= SPLIT.development.hi && r.index % 8 === 0);
    const X = rows.map((r) => r.features);
    const bundle = assembleConnection({ X, knn: 2 });
    assert.ok(bundle.edges.every((e) => e.kind === "chrono" || e.kind === "similarity"));
    assert.ok(bundle.eigenvalues[0] > -1e-8);
    assert.equal(assembleConnection({ X, knn: 2 }).assemblyHash, bundle.assemblyHash);
    assert.ok(rows.every((r) => r.index < SPLIT.confirmation.lo));
  });

  it("records that det is blind to planted SO(2) holonomy", () => {
    const { transports } = plantedTriangle(0.55);
    const hol = cycleHolonomy(transports, [0, 1, 2]);
    assert.ok(Math.abs(hol.det - 1) < 1e-9);
    assert.ok(Math.abs(hol.angle - 0.55) < 1e-9);
  });
});
