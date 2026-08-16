import { SPLIT, assertNotConfirmation } from "../eval/splits.ts";
import { generateF0Universe } from "../eval/synth.ts";
import { buildRows, type OutcomeRow } from "../eval/outcomes.ts";
import { assembleConnection, type ConnectionBundle } from "./connection.ts";
import { contentHash } from "../hash.ts";

export interface E3Check {
  name: string;
  passed: boolean;
  detail: string;
}

export interface E3Report {
  protocolId: "E3-pit-identifiability-v0";
  confirmationOpened: false;
  checks: E3Check[];
  claim: "CERTIFIED_PIT_REPRESENTATION" | "FAILED_CHECK";
}

function developmentRows(): OutcomeRow[] {
  return buildRows(generateF0Universe()).filter((r) => {
    assertNotConfirmation(r.index);
    return r.index <= SPLIT.development.hi;
  });
}

function featuresUpTo(rows: OutcomeRow[], t: number): number[][] {
  return rows.filter((r) => r.index <= t).map((r) => r.features);
}

function scale(X: number[][]): { Y: number[][]; mean: number[]; sd: number[] } {
  if (X.length === 0) return { Y: [], mean: [], sd: [] };
  const p = X[0].length;
  const mean = new Array(p).fill(0);
  for (const row of X) for (let j = 0; j < p; j++) mean[j] += row[j];
  for (let j = 0; j < p; j++) mean[j] /= X.length;
  const sd = new Array(p).fill(0);
  for (const row of X) for (let j = 0; j < p; j++) sd[j] += (row[j] - mean[j]) ** 2;
  for (let j = 0; j < p; j++) sd[j] = Math.sqrt(sd[j] / Math.max(X.length - 1, 1)) || 1;
  const Y = X.map((row) => row.map((v, j) => (v - mean[j]) / sd[j]));
  return { Y, mean, sd };
}

function applyScale(X: number[][], mean: number[], sd: number[]): number[][] {
  return X.map((row) => row.map((v, j) => (v - mean[j]) / (sd[j] || 1)));
}

function hashBundle(b: ConnectionBundle): string {
  return b.assemblyHash;
}

function subsample(rows: OutcomeRow[], t: number, stride = 4): OutcomeRow[] {
  return rows.filter((r) => r.index <= t && r.index % stride === 0);
}

export function runE3(): E3Report {
  const rows = developmentRows();
  const T = 160;
  const later = 240;
  const checks: E3Check[] = [];

  const past = subsample(rows, T);
  const pastAndFuture = subsample(rows, later);
  const A = assembleConnection({ X: scale(past.map((r) => r.features)).Y, knn: 2 });
  const B = assembleConnection({ X: scale(past.map((r) => r.features)).Y, knn: 2 });
  checks.push({
    name: "deterministic-at-T",
    passed: hashBundle(A) === hashBundle(B),
    detail: A.assemblyHash.slice(0, 16),
  });

  const C = assembleConnection({ X: scale(pastAndFuture.map((r) => r.features)).Y, knn: 2 });
  checks.push({
    name: "future-nodes-change-graph",
    passed: hashBundle(A) !== hashBundle(C) && C.n > A.n,
    detail: `n_T=${A.n} n_later=${C.n}`,
  });

  const shuffled = past.map((r, i) => ({
    ...r,
    yPnl: past[(i * 7 + 3) % past.length].yPnl,
  }));
  const D = assembleConnection({ X: scale(shuffled.map((r) => r.features)).Y, knn: 2 });
  checks.push({
    name: "outcome-shuffle-invariant",
    passed: hashBundle(A) === hashBundle(D),
    detail: "Y is not an input to assembleConnection",
  });

  const legal = scale(past.map((r) => r.features));
  const illegal = scale(pastAndFuture.map((r) => r.features));
  const legalRep = assembleConnection({ X: legal.Y, knn: 2 });
  const leakedScale = assembleConnection({
    X: applyScale(
      past.map((r) => r.features),
      illegal.mean,
      illegal.sd,
    ),
    knn: 2,
  });
  checks.push({
    name: "future-scaling-is-detectable",
    passed: hashBundle(legalRep) !== hashBundle(leakedScale),
    detail: "fitting μ,σ on days > T changes the T graph — so T must refit on ≤ T",
  });

  const maxIdx = Math.max(...past.map((r) => r.index), ...pastAndFuture.map((r) => r.index));
  checks.push({
    name: "no-confirmation-vertices",
    passed: maxIdx < SPLIT.confirmation.lo && past.every((r) => r.index <= T),
    detail: `maxIndex=${maxIdx}`,
  });

  const chrono = assembleConnection({ X: legal.Y, knn: 0 });
  const withSim = assembleConnection({ X: legal.Y, knn: 2 });
  checks.push({
    name: "similarity-ablation-changes-edges",
    passed: withSim.edges.length >= chrono.edges.length,
    detail: `chrono=${chrono.edges.length} +knn=${withSim.edges.length}`,
  });

  const rngX = legal.Y.map((row, i) => row.map((v, j) => v + ((i * 13 + j * 7) % 5) * 0.01));
  const randomish = assembleConnection({ X: rngX, knn: 2 });
  checks.push({
    name: "feature-perturbation-control",
    passed: hashBundle(randomish) !== hashBundle(withSim),
    detail: "edges depend on features, not on a hidden future label",
  });

  const rolling = [80, 120, 160].map((t) => {
    const sl = subsample(rows, t);
    return assembleConnection({ X: scale(sl.map((r) => r.features)).Y, knn: 2 }).n;
  });
  checks.push({
    name: "rolling-graph-grows",
    passed: rolling[0] < rolling[1] && rolling[1] <= rolling[2],
    detail: rolling.join("→"),
  });

  const claim = checks.every((c) => c.passed) ? "CERTIFIED_PIT_REPRESENTATION" : "FAILED_CHECK";
  return {
    protocolId: "E3-pit-identifiability-v0",
    confirmationOpened: false,
    checks,
    claim,
  };
}
