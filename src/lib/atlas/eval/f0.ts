import { forecast, type BaselineName } from "./baselines.ts";
import { intervalCoverage, meanPinball } from "./metrics.ts";
import { buildRows, type OutcomeRow } from "./outcomes.ts";
import {
  F0_PROTOCOL_ID,
  F0_WINDOWS,
  MIN_EFFECT,
  MIN_NEFF,
  SPLIT,
  assertNotConfirmation,
  eligiblePast,
} from "./splits.ts";
import { generateF0Universe } from "./synth.ts";

export interface WindowScore {
  window: string;
  n: number;
  pinball: Record<BaselineName, number>;
  coverageKnn: number;
  lowNeffFrac: number;
  deltaVsBestSimple: number;
}

export interface F0Report {
  protocolId: string;
  seed: number;
  confirmationOpened: false;
  windows: WindowScore[];
  claim: "VALIDATED" | "INCONCLUSIVE" | "UNSUPPORTED";
  reason: string;
}

const SIMPLES: BaselineName[] = ["unconditional", "regime"];
const ALL: BaselineName[] = ["unconditional", "regime", "knn", "kernel", "ridge", "tree"];

function rowsInWindow(rows: OutcomeRow[], lo: number, hi: number): OutcomeRow[] {
  return rows.filter((r) => r.index >= lo && r.index <= hi);
}

function scoreWindow(label: string, rows: OutcomeRow[], universe: OutcomeRow[]): WindowScore {
  const byIndex = new Map(universe.map((r) => [r.index, r]));
  const ys = rows.map((r) => r.yPnl);
  const forecasts: Record<BaselineName, Array<{ q10: number; q50: number; q90: number }>> = {
    unconditional: [],
    regime: [],
    knn: [],
    kernel: [],
    ridge: [],
    tree: [],
  };
  let low = 0;
  for (const q of rows) {
    assertNotConfirmation(q.index);
    const train = eligiblePast(q.index)
      .map((i) => byIndex.get(i))
      .filter((r): r is OutcomeRow => !!r);
    for (const name of ALL) {
      const { q: fc, nEff } = forecast(name, q, train);
      forecasts[name].push(fc);
      if (name === "knn" && nEff < MIN_NEFF) low++;
    }
  }
  const pinball = {} as Record<BaselineName, number>;
  for (const name of ALL) pinball[name] = meanPinball(ys, forecasts[name]);
  const bestSimple = Math.min(pinball.unconditional, pinball.regime);
  const delta = (bestSimple - pinball.knn) / Math.max(Math.abs(bestSimple), 1e-9);
  return {
    window: label,
    n: rows.length,
    pinball,
    coverageKnn: intervalCoverage(ys, forecasts.knn),
    lowNeffFrac: rows.length ? low / rows.length : 1,
    deltaVsBestSimple: delta,
  };
}

export function runF0(): F0Report {
  const days = generateF0Universe();
  if (days.length !== 520) throw new Error("N_DAYS");
  const rows = buildRows(days).filter((r) => r.index <= SPLIT.development.hi);
  for (const r of rows) assertNotConfirmation(r.index);

  const w1 = scoreWindow("W1", rowsInWindow(rows, F0_WINDOWS.W1.lo, F0_WINDOWS.W1.hi), rows);
  const w2 = scoreWindow("W2", rowsInWindow(rows, F0_WINDOWS.W2.lo, F0_WINDOWS.W2.hi), rows);

  const bothBeat = w1.deltaVsBestSimple >= MIN_EFFECT && w2.deltaVsBestSimple >= MIN_EFFECT;
  const starved = w1.lowNeffFrac > 0.4 || w2.lowNeffFrac > 0.4;
  let claim: F0Report["claim"];
  let reason: string;
  if (starved) {
    claim = "INCONCLUSIVE";
    reason = "N_eff < 8 on more than 40% of queries";
  } else if (bothBeat) {
    claim = "VALIDATED";
    reason = `kNN relative pinball reduction W1=${w1.deltaVsBestSimple.toFixed(4)} W2=${w2.deltaVsBestSimple.toFixed(4)}`;
  } else if (w1.deltaVsBestSimple > 0 || w2.deltaVsBestSimple > 0) {
    claim = "INCONCLUSIVE";
    reason = `mixed deltas W1=${w1.deltaVsBestSimple.toFixed(4)} W2=${w2.deltaVsBestSimple.toFixed(4)}`;
  } else {
    claim = "UNSUPPORTED";
    reason = `no improvement vs B1/B2 W1=${w1.deltaVsBestSimple.toFixed(4)} W2=${w2.deltaVsBestSimple.toFixed(4)}`;
  }

  return {
    protocolId: F0_PROTOCOL_ID,
    seed: 0x51f7a01d,
    confirmationOpened: false,
    windows: [w1, w2],
    claim,
    reason,
  };
}
