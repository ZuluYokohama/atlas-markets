import { FEATURE_CATALOG } from "./catalog.ts";

export interface RedundancyReport {
  names: string[];
  pairwise: number[][];
  spearman: number[][];
  familyMeanAbsCorr: Record<string, number>;
  conditionNumber: number | null;
  pcaExplained: number[];
  duplicateFormulas: Array<{ expression: string; names: string[] }>;
  rank: number | null;
}

function pearson(a: number[], b: number[]): number {
  const n = a.length;
  const ma = a.reduce((s, x) => s + x, 0) / n;
  const mb = b.reduce((s, x) => s + x, 0) / n;
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < n; i++) {
    const xa = a[i] - ma;
    const xb = b[i] - mb;
    num += xa * xb;
    da += xa * xa;
    db += xb * xb;
  }
  const den = Math.sqrt(da * db);
  return den === 0 ? 0 : num / den;
}

function rankdata(xs: number[]): number[] {
  const idx = xs.map((v, i) => [v, i] as const).sort((p, q) => p[0] - q[0]);
  const ranks = new Array<number>(xs.length);
  for (let r = 0; r < idx.length; r++) ranks[idx[r][1]] = r;
  return ranks;
}

function transpose(m: number[][]): number[][] {
  return m[0].map((_, j) => m.map((row) => row[j]));
}

function matMul(a: number[][], b: number[][]): number[][] {
  const out = a.map((row) => b[0].map((_, j) => row.reduce((s, _, k) => s + row[k] * b[k][j], 0)));
  return out;
}

/** Power-iteration PCA on covariance; enough for a condition/spectrum audit. */
function pcaExplained(cols: number[][]): { ev: number[]; cond: number | null; rank: number } {
  const n = cols[0].length;
  const p = cols.length;
  const means = cols.map((c) => c.reduce((s, x) => s + x, 0) / n);
  const X = cols.map((c, j) => c.map((v) => v - means[j]));
  const cov: number[][] = [];
  for (let i = 0; i < p; i++) {
    cov[i] = [];
    for (let j = 0; j < p; j++) {
      let s = 0;
      for (let t = 0; t < n; t++) s += X[i][t] * X[j][t];
      cov[i][j] = s / Math.max(n - 1, 1);
    }
  }
  const ev: number[] = [];
  let work = cov.map((r) => r.slice());
  for (let k = 0; k < p; k++) {
    let v = work[0].map(() => 1 / Math.sqrt(p));
    for (let it = 0; it < 40; it++) {
      const w = work.map((row) => row.reduce((s, a, i) => s + a * v[i], 0));
      const nrm = Math.hypot(...w) || 1;
      v = w.map((x) => x / nrm);
    }
    const lam = v.reduce((s, vi, i) => s + vi * work[i].reduce((t, a, j) => t + a * v[j], 0), 0);
    ev.push(Math.max(lam, 0));
    work = work.map((row, i) => row.map((a, j) => a - lam * v[i] * v[j]));
  }
  const pos = ev.filter((x) => x > 1e-10);
  const cond = pos.length ? pos[0] / pos[pos.length - 1] : null;
  return { ev, cond, rank: pos.length };
}

export function auditRedundancy(series: Record<string, number[]>): RedundancyReport {
  const names = Object.keys(series).sort();
  const cols = names.map((n) => series[n]);
  const pairwise = names.map((_, i) => names.map((__, j) => pearson(cols[i], cols[j])));
  const spearman = names.map((_, i) => names.map((__, j) => pearson(rankdata(cols[i]), rankdata(cols[j]))));
  const familyMeanAbsCorr: Record<string, number> = {};
  for (const fam of new Set(FEATURE_CATALOG.map((f) => f.family))) {
    const idx = names
      .map((n, i) => [n, i] as const)
      .filter(([n]) => FEATURE_CATALOG.find((f) => f.name === n)?.family === fam)
      .map(([, i]) => i);
    let s = 0;
    let c = 0;
    for (const i of idx) {
      for (const j of idx) {
        if (i < j) {
          s += Math.abs(pairwise[i][j]);
          c++;
        }
      }
    }
    familyMeanAbsCorr[fam] = c ? s / c : 0;
  }
  const { ev, cond, rank } = cols[0] && cols[0].length > 2 ? pcaExplained(cols) : { ev: [], cond: null, rank: 0 };
  const byExpr = new Map<string, string[]>();
  for (const f of FEATURE_CATALOG) {
    const list = byExpr.get(f.formulaHash) ?? [];
    list.push(f.name);
    byExpr.set(f.formulaHash, list);
  }
  const duplicateFormulas = [...byExpr.values()]
    .filter((ns) => ns.length > 1)
    .map((ns) => ({
      expression: FEATURE_CATALOG.find((f) => f.name === ns[0])!.expression,
      names: ns,
    }));
  return {
    names,
    pairwise,
    spearman,
    familyMeanAbsCorr,
    conditionNumber: cond,
    pcaExplained: ev,
    duplicateFormulas,
    rank,
  };
}

export { matMul, transpose };
