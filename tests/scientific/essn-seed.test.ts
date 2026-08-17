import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mutateGenome, seedGenome } from "../../src/lib/atlas/essn/genome.ts";
import { EssnSeed } from "../../src/lib/atlas/essn/model.ts";
import { runStageA } from "../../src/lib/atlas/essn/stageA.ts";

describe("ESSN-SEED-v0", () => {
  it("keeps confirmation closed and does not evolve the market path", () => {
    const r = runStageA();
    assert.equal(r.confirmationOpened, false);
    assert.equal(r.marketEvolution, false);
    assert.ok(r.trials.length >= 8);
    assert.ok(r.trials.every((t) => t.genome.protocol === "ESSN-SEED-v0"));
  });

  it("recovers a planted vol relationship when the vol tower is on", () => {
    const r = runStageA();
    assert.equal(r.volOnBeatsVolOff, true);
    assert.equal(r.claim, "CERTIFIED_SYNTHETIC_LEARNABILITY");
    assert.ok(r.best.volEnabled);
  });

  it("allows sheaf rank 0 and mutates only module genes", () => {
    const g = seedGenome();
    assert.equal(g.geometry.rank, 0);
    assert.equal(g.towers.geometry.enabled, false);
    let rng = 0.11;
    const m = mutateGenome(g, () => {
      rng += 0.17;
      return rng % 1;
    });
    assert.equal(m.protocol, "ESSN-SEED-v0");
    const z = {
      price: [0, 0, 0, 0],
      momentum: [0, 0, 0, 0],
      volatility: [0, 0, 0, 0],
      activity: [0, 0, 0, 0],
      surface: [0, 0, 0, 0],
      context: [0, 0, 0, 0],
      geometry: [1, 1, 1, 1],
    };
    const a = new EssnSeed({ ...g, geometry: { rank: 0 } }).forward(z, []);
    const b = new EssnSeed({
      ...g,
      geometry: { rank: 0 },
      towers: { ...g.towers, geometry: { enabled: true, width: 8 } },
    }).forward(z, []);
    assert.deepEqual(a.quantiles, b.quantiles);
  });
});
