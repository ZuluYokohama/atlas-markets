import { fromSample, type QuantileForecast } from "./metrics.ts";
import { MIN_NEFF } from "./splits.ts";
import type { OutcomeRow } from "./outcomes.ts";

export type BaselineName = "unconditional" | "regime" | "knn" | "kernel" | "ridge" | "tree";

function zscore(row: number[], mean: number[], sd: number[]): number[] {
  return row.map((v, i) => (sd[i] === 0 ? 0 : (v - mean[i]) / sd[i]));
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

function dist2(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    s += d * d;
  }
  return s;
}

export function forecast(
  name: BaselineName,
  query: OutcomeRow,
  train: OutcomeRow[],
): { q: QuantileForecast; nEff: number } {
  if (train.length === 0) return { q: { q10: 0, q50: 0, q90: 0 }, nEff: 0 };

  if (name === "unconditional") {
    return { q: fromSample(train.map((r) => r.yPnl)), nEff: train.length };
  }
  if (name === "regime") {
    const same = train.filter((r) => r.regime === query.regime);
    const pool = same.length >= MIN_NEFF ? same : train;
    return { q: fromSample(pool.map((r) => r.yPnl)), nEff: pool.length };
  }

  const { mean, sd } = stats(train);
  const qz = zscore(query.features, mean, sd);
  const scored = train.map((r) => ({ r, d: Math.sqrt(dist2(qz, zscore(r.features, mean, sd))) }));
  scored.sort((a, b) => a.d - b.d);

  if (name === "knn") {
    const k = Math.min(12, scored.length);
    const nb = scored.slice(0, k).map((s) => s.r.yPnl);
    return { q: fromSample(nb), nEff: k };
  }
  if (name === "kernel") {
    const bw = 1.2;
    const weights = scored.map((s) => Math.exp(-0.5 * (s.d / bw) ** 2));
    const pairs = scored.map((s, i) => ({ y: s.r.yPnl, w: weights[i] })).filter((p) => p.w > 1e-8);
    pairs.sort((a, b) => a.y - b.y);
    const tot = pairs.reduce((s, p) => s + p.w, 0);
    const at = (tau: number) => {
      let acc = 0;
      for (const p of pairs) {
        acc += p.w;
        if (acc / tot >= tau) return p.y;
      }
      return pairs.at(-1)!.y;
    };
    return { q: { q10: at(0.1), q50: at(0.5), q90: at(0.9) }, nEff: pairs.length };
  }
  if (name === "ridge") {
    const p = query.features.length;
    const xtx: number[][] = Array.from({ length: p + 1 }, () => new Array(p + 1).fill(0));
    const xty = new Array(p + 1).fill(0);
    for (const r of train) {
      const x = [1, ...zscore(r.features, mean, sd)];
      for (let i = 0; i < x.length; i++) {
        xty[i] += x[i] * r.yPnl;
        for (let j = 0; j < x.length; j++) xtx[i][j] += x[i] * x[j];
      }
    }
    for (let i = 1; i < p + 1; i++) xtx[i][i] += 1;
    const beta = solve(xtx, xty);
    const pred = (r: OutcomeRow) => {
      const x = [1, ...zscore(r.features, mean, sd)];
      return x.reduce((s, v, i) => s + v * beta[i], 0);
    };
    const resid = train.map((r) => r.yPnl - pred(r));
    const cone = fromSample(resid);
    const mu = pred(query);
    return { q: { q10: mu + cone.q10, q50: mu + cone.q50, q90: mu + cone.q90 }, nEff: train.length };
  }
  // tree: one split on rv20 (feature[1]) at train median
  const feat = 1;
  const cut = fromSample(train.map((r) => r.features[feat])).q50;
  const leaf = train.filter((r) =>
    query.features[feat] <= cut ? r.features[feat] <= cut : r.features[feat] > cut,
  );
  const pool = leaf.length >= MIN_NEFF ? leaf : train;
  return { q: fromSample(pool.map((r) => r.yPnl)), nEff: pool.length };
}

function solve(A: number[][], b: number[]): number[] {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let i = 0; i < n; i++) {
    let piv = i;
    for (let r = i + 1; r < n; r++) if (Math.abs(M[r][i]) > Math.abs(M[piv][i])) piv = r;
    [M[i], M[piv]] = [M[piv], M[i]];
    const d = M[i][i] || 1e-12;
    for (let c = i; c <= n; c++) M[i][c] /= d;
    for (let r = 0; r < n; r++) {
      if (r === i) continue;
      const f = M[r][i];
      for (let c = i; c <= n; c++) M[r][c] -= f * M[i][c];
    }
  }
  return M.map((row) => row[n]);
}
