/** Seeded RNG, small dense linear algebra, and Black–Scholes primitives. */

export function clamp(x: number, a: number, b: number): number {
  return Math.min(b, Math.max(a, x));
}

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function gauss(rng: () => number) {
  const u = Math.max(1e-12, rng());
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function erf(x: number) {
  const s = Math.sign(x);
  const a = Math.abs(x);
  const p = 0.3275911;
  const t = 1 / (1 + p * a);
  const y =
    1 -
    (((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) *
      t +
      0.254829592) *
      t *
      Math.exp(-a * a));
  return s * y;
}

export function ncdf(x: number) {
  return 0.5 * (1 + erf(x / Math.SQRT2));
}

export function npdf(x: number) {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

export interface BsGreeks {
  price: number;
  delta: number;
  gamma: number;
  vega: number;
  theta: number;
}

export function blackScholes(
  spot: number,
  strike: number,
  tYears: number,
  iv: number,
  rate = 0.045,
  div = 0.012,
  right: "call" | "put" = "call",
): BsGreeks {
  const T = Math.max(tYears, 1 / 365);
  const s = Math.max(spot, 1e-8);
  const k = Math.max(strike, 1e-8);
  const v = Math.max(iv, 1e-4);
  const sqrtT = Math.sqrt(T);
  const d1 = (Math.log(s / k) + (rate - div + 0.5 * v * v) * T) / (v * sqrtT);
  const d2 = d1 - v * sqrtT;
  const df = Math.exp(-rate * T);
  const dq = Math.exp(-div * T);
  const call = s * dq * ncdf(d1) - k * df * ncdf(d2);
  const put = k * df * ncdf(-d2) - s * dq * ncdf(-d1);
  const price = right === "call" ? call : put;
  const delta = right === "call" ? dq * ncdf(d1) : dq * (ncdf(d1) - 1);
  const gamma = (dq * npdf(d1)) / (s * v * sqrtT);
  const vega = (s * dq * npdf(d1) * sqrtT) / 100;
  const thetaCall =
    (-(s * dq * npdf(d1) * v) / (2 * sqrtT) -
      rate * k * df * ncdf(d2) +
      div * s * dq * ncdf(d1)) /
    365;
  const thetaPut =
    (-(s * dq * npdf(d1) * v) / (2 * sqrtT) +
      rate * k * df * ncdf(-d2) -
      div * s * dq * ncdf(-d1)) /
    365;
  return {
    price,
    delta,
    gamma,
    vega,
    theta: right === "call" ? thetaCall : thetaPut,
  };
}

export function impliedFromDelta(
  spot: number,
  tYears: number,
  iv: number,
  targetAbsDelta: number,
  right: "call" | "put",
): number {
  let lo = spot * 0.4;
  let hi = spot * 1.8;
  for (let i = 0; i < 28; i++) {
    const mid = 0.5 * (lo + hi);
    const g = blackScholes(spot, mid, tYears, iv, 0.045, 0.012, right);
    const ad = Math.abs(g.delta);
    if (right === "call") {
      if (ad > targetAbsDelta) lo = mid;
      else hi = mid;
    } else if (ad > targetAbsDelta) hi = mid;
    else lo = mid;
  }
  return 0.5 * (lo + hi);
}

export function zeros(n: number, m = n): number[][] {
  return Array.from({ length: n }, () => Array<number>(m).fill(0));
}

export function eye(n: number): number[][] {
  const A = zeros(n);
  for (let i = 0; i < n; i++) A[i][i] = 1;
  return A;
}

export function cloneMat(A: number[][]): number[][] {
  return A.map((r) => r.slice());
}

export function transpose(A: number[][]): number[][] {
  const n = A.length;
  const m = A[0]?.length ?? 0;
  const B = zeros(m, n);
  for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) B[j][i] = A[i][j];
  return B;
}

export function matmul(A: number[][], B: number[][]): number[][] {
  const n = A.length;
  const p = B[0]?.length ?? 0;
  const k = B.length;
  const C = zeros(n, p);
  for (let i = 0; i < n; i++) {
    for (let t = 0; t < k; t++) {
      const a = A[i][t];
      if (a === 0) continue;
      const brow = B[t];
      const crow = C[i];
      for (let j = 0; j < p; j++) crow[j] += a * brow[j];
    }
  }
  return C;
}

export function matvec(A: number[][], x: number[]): number[] {
  const y = Array<number>(A.length).fill(0);
  for (let i = 0; i < A.length; i++) {
    let s = 0;
    const row = A[i];
    for (let j = 0; j < x.length; j++) s += row[j] * x[j];
    y[i] = s;
  }
  return y;
}

export function addMat(A: number[][], B: number[][], s = 1): number[][] {
  const C = cloneMat(A);
  for (let i = 0; i < A.length; i++)
    for (let j = 0; j < A[i].length; j++) C[i][j] += s * B[i][j];
  return C;
}

export function scaleMat(A: number[][], s: number): number[][] {
  return A.map((r) => r.map((v) => v * s));
}

export function dot(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

export function norm2(a: number[]): number {
  return Math.sqrt(dot(a, a));
}

export function mean(xs: number[]): number {
  if (!xs.length) return 0;
  return xs.reduce((s, v) => s + v, 0) / xs.length;
}

export function variance(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  let s = 0;
  for (const v of xs) s += (v - m) * (v - m);
  return s / xs.length;
}

export function quantile(xs: number[], q: number): number {
  if (!xs.length) return 0;
  const a = xs.slice().sort((x, y) => x - y);
  const pos = (a.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return a[lo];
  return a[lo] * (hi - pos) + a[hi] * (pos - lo);
}

export function weightedQuantile(
  values: number[],
  weights: number[],
  q: number,
): number {
  const pairs = values
    .map((v, i) => [v, weights[i]] as const)
    .sort((a, b) => a[0] - b[0]);
  const tot = pairs.reduce((s, p) => s + p[1], 0);
  if (tot <= 0) return quantile(values, q);
  let acc = 0;
  const target = q * tot;
  for (const [v, w] of pairs) {
    acc += w;
    if (acc >= target) return v;
  }
  return pairs[pairs.length - 1][0];
}

export function dctII(x: number[]): number[] {
  const n = x.length;
  const y = Array<number>(n).fill(0);
  const s = Math.sqrt(2 / n);
  for (let k = 0; k < n; k++) {
    let acc = 0;
    for (let i = 0; i < n; i++) {
      acc += x[i] * Math.cos((Math.PI / n) * (i + 0.5) * k);
    }
    y[k] = (k === 0 ? Math.sqrt(1 / n) : s) * acc * Math.sqrt(n) * (k === 0 ? 1 : 1);
    y[k] = acc * (k === 0 ? Math.sqrt(1 / n) : Math.sqrt(2 / n));
  }
  return y;
}

export function idctII(y: number[]): number[] {
  const n = y.length;
  const x = Array<number>(n).fill(0);
  for (let i = 0; i < n; i++) {
    let acc = y[0] * Math.sqrt(1 / n);
    for (let k = 1; k < n; k++) {
      acc += y[k] * Math.sqrt(2 / n) * Math.cos((Math.PI / n) * (i + 0.5) * k);
    }
    x[i] = acc;
  }
  return x;
}

/** Symmetric Jacobi eigensolver. Returns ascending eigenvalues. */
export function jacobiEigh(
  Ain: number[][],
  maxSweeps = 36,
): { values: number[]; vectors: number[][] } {
  const n = Ain.length;
  const A = cloneMat(Ain);
  const V = eye(n);
  for (let sweep = 0; sweep < maxSweeps; sweep++) {
    let off = 0;
    for (let p = 0; p < n; p++) {
      for (let q = p + 1; q < n; q++) off += A[p][q] * A[p][q];
    }
    if (Math.sqrt(2 * off) < 1e-11 * n) break;
    for (let p = 0; p < n; p++) {
      for (let q = p + 1; q < n; q++) {
        const apq = A[p][q];
        if (Math.abs(apq) < 1e-15) continue;
        const app = A[p][p];
        const aqq = A[q][q];
        const tau = (aqq - app) / (2 * apq);
        const t =
          Math.sign(tau || 1) / (Math.abs(tau) + Math.sqrt(1 + tau * tau));
        const c = 1 / Math.sqrt(1 + t * t);
        const s = t * c;
        for (let k = 0; k < n; k++) {
          const aik = A[p][k];
          const aqk = A[q][k];
          A[p][k] = c * aik - s * aqk;
          A[q][k] = s * aik + c * aqk;
        }
        for (let k = 0; k < n; k++) {
          const akp = A[k][p];
          const akq = A[k][q];
          A[k][p] = c * akp - s * akq;
          A[k][q] = s * akp + c * akq;
        }
        A[p][q] = 0;
        A[q][p] = 0;
        A[p][p] = c * c * app - 2 * s * c * apq + s * s * aqq;
        A[q][q] = s * s * app + 2 * s * c * apq + c * c * aqq;
        for (let k = 0; k < n; k++) {
          const vip = V[k][p];
          const viq = V[k][q];
          V[k][p] = c * vip - s * viq;
          V[k][q] = s * vip + c * viq;
        }
      }
    }
  }
  const idx = Array.from({ length: n }, (_, i) => i).sort(
    (i, j) => A[i][i] - A[j][j],
  );
  const values = idx.map((i) => A[i][i]);
  const vectors = zeros(n);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) vectors[i][j] = V[i][idx[j]];
  }
  return { values, vectors };
}

/** Compact SVD via Gram eigen for tall or square matrices, n,m ≤ 8. */
export function thinSvd(M: number[][]): {
  U: number[][];
  S: number[];
  Vt: number[][];
} {
  const n = M.length;
  const m = M[0].length;
  const G = matmul(transpose(M), M);
  const { values, vectors } = jacobiEigh(G, 24);
  const S = values.map((v) => Math.sqrt(Math.max(v, 0)));
  const Vt = transpose(vectors);
  const U = zeros(n, m);
  for (let k = 0; k < m; k++) {
    if (S[k] < 1e-12) continue;
    const col = matvec(M, vectors.map((row) => row[k]));
    for (let i = 0; i < n; i++) U[i][k] = col[i] / S[k];
  }
  return { U, S, Vt };
}

/** Orthogonal Procrustes: nearest U ∈ O(r) to M. */
export function procrustes(M: number[][]): { U: number[][]; conf: number } {
  const { U, S, Vt } = thinSvd(M);
  const R = matmul(U, Vt);
  const conf = mean(S.map((s) => s / Math.max(1e-9, S[S.length - 1] || 1)));
  return { U: R, conf: Math.min(1, mean(S) / Math.max(S.length, 1)) };
}

export function det2(U: number[][]): number {
  return U[0][0] * U[1][1] - U[0][1] * U[1][0];
}

export function rot(phi: number): number[][] {
  const c = Math.cos(phi);
  const s = Math.sin(phi);
  return [
    [c, -s],
    [s, c],
  ];
}

export function holonomyAngle(H: number[][]): number {
  return Math.atan2(H[1][0], H[0][0]);
}

export function frobeniusIminus(H: number[][]): number {
  let s = 0;
  for (let i = 0; i < H.length; i++) {
    for (let j = 0; j < H.length; j++) {
      const v = (i === j ? 1 : 0) - H[i][j];
      s += v * v;
    }
  }
  return Math.sqrt(s);
}

export function shaLike(parts: Array<string | number>): string {
  let h = 2166136261;
  const s = parts.join("|");
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

export function solveRidge(
  A: number[][],
  b: number[],
  lambda: number,
): number[] {
  const m = A[0]?.length ?? 0;
  const At = transpose(A);
  const G = matmul(At, A);
  for (let i = 0; i < m; i++) G[i][i] += lambda;
  const rhs = matvec(At, b);
  return solveSPD(G, rhs);
}

function solveSPD(G: number[][], b: number[]): number[] {
  const n = G.length;
  const L = zeros(n);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let s = G[i][j];
      for (let k = 0; k < j; k++) s -= L[i][k] * L[j][k];
      L[i][j] = i === j ? Math.sqrt(Math.max(s, 1e-12)) : s / L[j][j];
    }
  }
  const y = Array<number>(n).fill(0);
  for (let i = 0; i < n; i++) {
    let s = b[i];
    for (let k = 0; k < i; k++) s -= L[i][k] * y[k];
    y[i] = s / L[i][i];
  }
  const x = Array<number>(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let s = y[i];
    for (let k = i + 1; k < n; k++) s -= L[k][i] * x[k];
    x[i] = s / L[i][i];
  }
  return x;
}

export function pcaTop(
  X: number[][],
  r: number,
): { Q: number[][]; singular: number[] } {
  const n = X.length;
  if (!n) return { Q: eye(r), singular: Array(r).fill(0) };
  const d = X[0].length;
  const mu = Array<number>(d).fill(0);
  for (const row of X) for (let j = 0; j < d; j++) mu[j] += row[j];
  for (let j = 0; j < d; j++) mu[j] /= n;
  const C = zeros(d);
  for (const row of X) {
    for (let i = 0; i < d; i++) {
      const di = row[i] - mu[i];
      for (let j = 0; j < d; j++) C[i][j] += di * (row[j] - mu[j]);
    }
  }
  const scale = 1 / Math.max(1, n - 1);
  for (let i = 0; i < d; i++) for (let j = 0; j < d; j++) C[i][j] *= scale;
  const { values, vectors } = jacobiEigh(C, 28);
  const Q = zeros(d, r);
  const singular: number[] = [];
  for (let k = 0; k < r; k++) {
    const src = d - 1 - k;
    singular.push(Math.sqrt(Math.max(values[src] ?? 0, 0)));
    for (let i = 0; i < d; i++) Q[i][k] = vectors[i][src] ?? 0;
  }
  return { Q, singular };
}
