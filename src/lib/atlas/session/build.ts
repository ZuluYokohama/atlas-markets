import { blackScholes } from "../position/bs.ts";
import { F0_SEED, HORIZON, LOOKBACK, PURGE, SPLIT, eligiblePast } from "../eval/splits.ts";
import { generateF0Universe } from "../eval/synth.ts";
import { buildRows, type OutcomeRow } from "../eval/outcomes.ts";
import type { ReplayFrame, SessionDay, WorkstationPayload } from "./types.ts";

const FEATURE_NAMES = ["ret1", "rv20", "ivAtm", "ivGap", "skew", "enc0", "enc1", "enc2", "enc3"];
const FEATURE_FAMILIES = [
  "price",
  "range_volatility",
  "volatility_surface",
  "volatility_surface",
  "volatility_surface",
  "options_exposure",
  "options_exposure",
  "options_exposure",
  "options_exposure",
];

function zscore(row: number[], mean: number[], sd: number[]): number[] {
  return row.map((v, i) => (sd[i] === 0 ? 0 : (v - mean[i]) / sd[i]));
}

function dist2(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    s += d * d;
  }
  return Math.sqrt(s);
}

function stats(rows: OutcomeRow[]) {
  const p = rows[0]?.features.length ?? 0;
  const mean = new Array(p).fill(0);
  for (const r of rows) for (let i = 0; i < p; i++) mean[i] += r.features[i];
  for (let i = 0; i < p; i++) mean[i] /= Math.max(rows.length, 1);
  const sd = new Array(p).fill(0);
  for (const r of rows) for (let i = 0; i < p; i++) sd[i] += (r.features[i] - mean[i]) ** 2;
  for (let i = 0; i < p; i++) sd[i] = Math.sqrt(sd[i] / Math.max(rows.length - 1, 1));
  return { mean, sd };
}

function quantile(xs: number[], tau: number): number {
  if (xs.length === 0) return Number.NaN;
  const s = [...xs].sort((a, b) => a - b);
  const idx = Math.min(s.length - 1, Math.max(0, Math.floor(tau * (s.length - 1))));
  return s[idx];
}

function strategyOf(row: OutcomeRow): string {
  if (row.features[1] > 0.25) return "SCANNED";
  if (row.features[3] > 0.02) return "QUALIFIED";
  return "UNSEEN";
}

export function buildWorkstationPayload(): WorkstationPayload {
  const uni = generateF0Universe();
  const days: SessionDay[] = uni
    .filter((d) => d.index < SPLIT.confirmation.lo)
    .map((d) => ({
      index: d.index,
      date: d.date,
      spot: d.spot,
      ivAtm: d.ivAtm,
      regime: d.regime,
    }));
  const rows = buildRows(uni).filter((r) => r.index <= SPLIT.development.hi);
  const byIndex = new Map(rows.map((r) => [r.index, r]));
  const minIndex = LOOKBACK + PURGE + HORIZON;
  const maxIndex = SPLIT.development.hi - HORIZON;
  const frames: ReplayFrame[] = [];

  for (let t = minIndex; t <= maxIndex; t++) {
    const day = uni[t];
    const row = byIndex.get(t);
    const pastIdx = eligiblePast(t);
    const train = pastIdx.map((i) => byIndex.get(i)).filter((r): r is OutcomeRow => !!r);
    const analogs: ReplayFrame["analogs"] = [];
    let cone: ReplayFrame["cone"] = {
      q10: Number.NaN,
      q50: Number.NaN,
      q90: Number.NaN,
      n: 0,
      nEff: 0,
      status: "UNSUPPORTED",
    };
    let ood = train.length < 8;
    if (row && train.length >= 8) {
      const { mean, sd } = stats(train);
      const qz = zscore(row.features, mean, sd);
      const scored = train
        .map((r) => ({ r, d: dist2(qz, zscore(r.features, mean, sd)) }))
        .sort((a, b) => a.d - b.d);
      const k = Math.min(12, scored.length);
      const nb = scored.slice(0, k);
      const ys = nb.map((s) => s.r.yPnl);
      const medDist = scored[Math.floor(scored.length / 2)]?.d ?? 0;
      ood = nb[0].d > Math.max(2.5, 2 * medDist);
      analogs.push(
        ...nb.map((s) => ({
          index: s.r.index,
          date: uni[s.r.index].date,
          distance: s.d,
          yPnl: s.r.yPnl,
          regime: s.r.regime,
        })),
      );
      cone = {
        q10: quantile(ys, 0.1),
        q50: quantile(ys, 0.5),
        q90: quantile(ys, 0.9),
        n: ys.length,
        nEff: k,
        status: "UNSUPPORTED",
      };
    }
    const strike = Math.round(day.spot);
    const dsl = `long 1 SPY ${strike} C ${day.date.slice(0, 4)}-12-31`;
    const modelDebit = blackScholes({
      spot: day.spot,
      strike,
      tau: 21 / 365,
      vol: day.ivAtm,
      rate: 0,
      div: 0,
      right: "call",
    }).price;
    frames.push({
      index: t,
      date: day.date,
      regime: day.regime,
      split: day.split === "confirmation" ? "development" : day.split,
      spot: day.spot,
      ivAtm: day.ivAtm,
      rv20: day.rv20,
      features: (row?.features ?? []).map((v, i) => ({
        name: FEATURE_NAMES[i] ?? `f${i}`,
        value: v,
        family: FEATURE_FAMILIES[i] ?? "price",
      })),
      analogs,
      cone,
      ood,
      strategy: row ? strategyOf(row) : "UNSEEN",
      positionDsl: dsl,
      modelDebit,
    });
  }

  return {
    dataset: {
      id: "synthetic.spy.f0.v0",
      name: "Synthetic SPY F0-v0",
      kind: "synthetic",
      seed: F0_SEED,
      instrument: "SPY",
      redistributionAllowed: true,
    },
    f0: {
      protocolId: "F0-position-state-vs-baselines-v0",
      claim: "UNSUPPORTED",
      confirmationOpened: false,
      w1Delta: -0.2276,
      w2Delta: -0.0523,
    },
    days,
    frames,
    minIndex,
    maxIndex,
  };
}
