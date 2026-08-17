import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { IndependentAuditor } from "../../src/lib/atlas/runtime/auditor.ts";
import { RingBuffer, stepVar, windowMean } from "../../src/lib/atlas/runtime/buffers.ts";
import { CommitmentLedger, makeCommitment } from "../../src/lib/atlas/runtime/commit.ts";
import { detectDevice } from "../../src/lib/atlas/runtime/device.ts";
import { SealedLoop, developmentTicks, runSealedReplay } from "../../src/lib/atlas/runtime/loop.ts";
import { StubRecurrentPredictor } from "../../src/lib/atlas/runtime/predictor.ts";

describe("RT-PREQ-v0 sealed runtime", () => {
  it("certifies a sealed loop on development only", () => {
    const a = runSealedReplay();
    const b = runSealedReplay();
    assert.equal(a.confirmationOpened, false);
    assert.equal(a.orderAuthority, false);
    assert.equal(a.device.cuda, false);
    assert.equal(a.claim, "CERTIFIED_SEALED_LOOP");
    assert.equal(a.ledgerHash, b.ledgerHash);
    assert.ok(a.commits > 50);
    assert.ok(a.scored > 40);
    assert.ok(Number.isFinite(a.meanPinball));
  });

  it("commits before reveal and refuses early scoring", () => {
    const ticks = developmentTicks().filter((t) => t.index >= 40 && t.index <= 60);
    const loop = new SealedLoop();
    loop.step(ticks[0]!);
    assert.equal(loop.commits.all().length, 1);
    assert.equal(loop.scores.length, 0);
    const c = loop.commits.all()[0]!;
    const aud = new IndependentAuditor();
    assert.throws(() => aud.score(c, 0, c.t), /REVEAL_TOO_EARLY/);
    for (const t of ticks.slice(1)) loop.step(t);
    assert.ok(loop.scores.length >= 1);
    assert.ok(loop.scores[0]!.reveal_t >= c.t + c.horizon);
  });

  it("is invariant to future tick mutation before the commit cutoff", () => {
    const ticks = developmentTicks().filter((t) => t.index <= 120);
    const early = ticks.filter((t) => t.index <= 80);
    const h1 = runSealedReplay(early).ledgerHash;
    const poisoned = ticks.map((t) => (t.index > 80 ? { ...t, spot: t.spot * 1.5 } : t));
    const h2 = runSealedReplay(poisoned.filter((t) => t.index <= 80)).ledgerHash;
    assert.equal(h1, h2);
  });

  it("keeps predictor and auditor separate", () => {
    const p = new StubRecurrentPredictor();
    assert.equal("score" in p, false);
    assert.equal("fit" in p, false);
    const led = new CommitmentLedger();
    const c = makeCommitment({
      t: 10,
      event_sequence: 0,
      state_hash: "a",
      feature_hash: "b",
      model_hash: p.modelHash,
      quantiles: { q05: -1, q25: -0.5, q50: 0, q75: 0.5, q95: 1 },
      ood: 0,
      abstain: false,
      committed_at: "2020-01-01T00:00:00.000Z",
    });
    led.append(c);
    assert.throws(() => led.replace(), /IMMUTABLE/);
    assert.equal(detectDevice().kind, "cpu");
  });

  it("matches incremental EMA to the recurrence, not a future window", () => {
    const xs = [1, 2, 3, 4, 5];
    let s = stepVar({ ema: 0, mu: 0, v: 0, initialized: false }, xs[0]!, 0.25);
    for (const x of xs.slice(1)) s = stepVar(s, x, 0.25);
    let ema = xs[0]!;
    for (const x of xs.slice(1)) ema = 0.25 * x + 0.75 * ema;
    assert.ok(Math.abs(s.ema - ema) < 1e-12);
    assert.ok(Math.abs(s.ema - windowMean(xs)) > 1e-6);
    const ring = new RingBuffer(3, 2);
    ring.push([1, 2]);
    ring.push([3, 4]);
    ring.push([5, 6]);
    ring.push([7, 8]);
    assert.deepEqual(Array.from(ring.last()), [7, 8]);
    assert.equal(ring.length, 3);
  });
});
