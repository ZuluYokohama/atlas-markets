import { contentHash } from "../hash.ts";
import { SPLIT, assertNotConfirmation } from "../eval/splits.ts";
import { generateF0Universe } from "../eval/synth.ts";
import { VirtualClock } from "../events/clock.ts";
import { ImmutableEventLog } from "../events/log.ts";
import type { EventDraft } from "../events/types.ts";
import { IndependentAuditor, coverage90, meanPinballScores } from "./auditor.ts";
import { RingBuffer, stepVar, type IncrementalState } from "./buffers.ts";
import {
  CommitmentLedger,
  RT_HORIZON,
  RT_PROTOCOL,
  makeCommitment,
  type Commitment,
  type ScoreRecord,
} from "./commit.ts";
import { LaneScheduler, detectDevice } from "./device.ts";
import { StubRecurrentPredictor } from "./predictor.ts";

export interface Tick {
  index: number;
  date: string;
  spot: number;
}

export interface LoopReport {
  protocol: typeof RT_PROTOCOL;
  device: ReturnType<typeof detectDevice>;
  confirmationOpened: false;
  orderAuthority: false;
  champion: string;
  auditor: string;
  commits: number;
  scored: number;
  meanPinball: number;
  coverage90: number;
  ledgerHash: string;
  claim: "CERTIFIED_SEALED_LOOP";
}

function draftFrom(tick: Tick, prev: number | null): EventDraft {
  const t = `${tick.date}T20:00:00.000Z`;
  return {
    logicalId: `bar-${tick.index}`,
    event_time: t,
    availability_time: t,
    ingest_time: t,
    revision_time: t,
    source: "synthetic",
    instrument_id: "inst_spy",
    contract_id: null,
    event_type: "bar.close",
    payload: { close: tick.spot, session: tick.index, prev },
    quality_flags: ["synthetic"],
  };
}

export function developmentTicks(): Tick[] {
  return generateF0Universe()
    .filter((d) => d.index <= SPLIT.development.hi)
    .map((d) => ({ index: d.index, date: d.date, spot: d.spot }));
}

export class SealedLoop {
  readonly log = new ImmutableEventLog();
  readonly clock = new VirtualClock("replay", "1970-01-01T00:00:00.000Z");
  readonly commits = new CommitmentLedger();
  readonly scores: ScoreRecord[] = [];
  readonly predictor = new StubRecurrentPredictor();
  readonly auditor = new IndependentAuditor();
  readonly scheduler = new LaneScheduler();
  readonly ring = new RingBuffer(64, 4);
  private incr: IncrementalState = { ema: 0, mu: 0, v: 0, initialized: false };
  private prevSpot: number | null = null;
  private spots = new Map<number, number>();

  observe(tick: Tick): void {
    assertNotConfirmation(tick.index);
    if (!this.scheduler.begin("copy")) return;
    const ev = this.log.append(draftFrom(tick, this.prevSpot));
    this.clock.advanceTo(ev.availability_time);
    this.spots.set(tick.index, tick.spot);
    this.scheduler.end("copy");

    this.scheduler.begin("feature");
    const ret = this.prevSpot == null ? 0 : Math.log(tick.spot / this.prevSpot);
    this.incr = stepVar(this.incr, ret, 0.1);
    const feats = [ret, this.incr.ema, Math.sqrt(Math.max(this.incr.v, 0)), tick.spot / 100];
    this.ring.push(feats);
    this.prevSpot = tick.spot;
    this.scheduler.end("feature");
  }

  predictAndCommit(tick: Tick): Commitment {
    if (!this.scheduler.begin("rt_inference")) throw new Error("RT_BLOCKED");
    const feats = this.ring.last();
    const out = this.predictor.predict(feats);
    const c = makeCommitment({
      t: tick.index,
      event_sequence: this.log.length - 1,
      state_hash: contentHash(Array.from(feats)),
      feature_hash: contentHash({ ema: this.incr.ema, v: this.incr.v }),
      model_hash: this.predictor.modelHash,
      quantiles: out.quantiles,
      ood: out.ood,
      abstain: out.ood > 8,
      committed_at: this.clock.now(),
    });
    this.commits.append(c);
    this.scheduler.end("rt_inference");
    return c;
  }

  revealAndScore(now: number): ScoreRecord[] {
    if (this.scheduler.begin("background") === false) return [];
    const fresh: ScoreRecord[] = [];
    for (const c of this.commits.mature(now)) {
      if (this.scores.some((s) => s.prediction_id === c.prediction_id)) continue;
      const s0 = this.spots.get(c.t);
      const s1 = this.spots.get(c.t + c.horizon);
      if (s0 == null || s1 == null) continue;
      const y = Math.log(s1 / s0);
      fresh.push(this.auditor.score(c, y, now));
    }
    this.scores.push(...fresh);
    this.scheduler.end("background");
    return fresh;
  }

  step(tick: Tick): { commit: Commitment; revealed: ScoreRecord[] } {
    this.observe(tick);
    const commit = this.predictAndCommit(tick);
    const revealed = this.revealAndScore(tick.index);
    return { commit, revealed };
  }
}

export function runSealedReplay(ticks?: Tick[]): LoopReport {
  const series = ticks ?? developmentTicks();
  const loop = new SealedLoop();
  for (const tick of series) {
    if (tick.index + RT_HORIZON > SPLIT.development.hi) break;
    loop.step(tick);
  }
  const scored = loop.scores;
  return {
    protocol: RT_PROTOCOL,
    device: detectDevice(),
    confirmationOpened: false,
    orderAuthority: false,
    champion: loop.predictor.id,
    auditor: loop.auditor.id,
    commits: loop.commits.all().length,
    scored: scored.length,
    meanPinball: meanPinballScores(scored),
    coverage90: coverage90(scored),
    ledgerHash: contentHash(loop.commits.all().map((c) => c.content_hash)),
    claim: "CERTIFIED_SEALED_LOOP",
  };
}
