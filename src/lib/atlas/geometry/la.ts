export function zeros(n: number, m = n): number[][] {
  return Array.from({ length: n }, () => new Array(m).fill(0));
}

export function eye(n: number): number[][] {
  const A = zeros(n);
  for (let i = 0; i < n; i++) A[i][i] = 1;
  return A;
}

export function transpose(A: number[][]): number[][] {
  const n = A.length;
  const m = A[0]?.length ?? 0;
  const T = zeros(m, n);
  for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) T[j][i] = A[i][j];
  return T;
}

export function matmul(A: number[][], B: number[][]): number[][] {
  const n = A.length;
  const p = B[0].length;
  const m = B.length;
  const C = zeros(n, p);
  for (let i = 0; i < n; i++) {
    for (let k = 0; k < m; k++) {
      const aik = A[i][k];
      for (let j = 0; j < p; j++) C[i][j] += aik * B[k][j];
    }
  }
  return C;
}

export function matvec(A: number[][], x: number[]): number[] {
  return A.map((row) => row.reduce((s, a, j) => s + a * x[j], 0));
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

export function frobenius(A: number[][], B?: number[][]): number {
  let s = 0;
  for (let i = 0; i < A.length; i++) {
    for (let j = 0; j < A[i].length; j++) {
      const v = A[i][j] - (B ? B[i][j] : 0);
      s += v * v;
    }
  }
  return Math.sqrt(s);
}

export function holonomyAngle(H: number[][]): number {
  return Math.atan2(H[1][0], H[0][0]);
}

/** Jacobi eigen-decomposition of a symmetric matrix. Values ascending. */
export function jacobiEigh(input: number[][], sweeps = 32): { values: number[]; vectors: number[][] } {
  const n = input.length;
  const A = input.map((row) => row.slice());
  const V = eye(n);
  for (let sweep = 0; sweep < sweeps; sweep++) {
    let max = 0;
    for (let p = 0; p < n; p++) {
      for (let q = p + 1; q < n; q++) {
        const apq = A[p][q];
        if (Math.abs(apq) > max) max = Math.abs(apq);
        if (Math.abs(apq) < 1e-14) continue;
        const app = A[p][p];
        const aqq = A[q][q];
        const tau = (aqq - app) / (2 * apq);
        const t = Math.sign(tau || 1) / (Math.abs(tau) + Math.sqrt(1 + tau * tau));
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
    if (max < 1e-14) break;
  }
  const idx = Array.from({ length: n }, (_, i) => i).sort((i, j) => A[i][i] - A[j][j]);
  const values = idx.map((i) => A[i][i]);
  const vectors = zeros(n);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) vectors[i][j] = V[i][idx[j]];
  return { values, vectors };
}

function thinSvd(M: number[][]): { U: number[][]; S: number[]; Vt: number[][] } {
  const n = M.length;
  const m = M[0].length;
  const G = matmul(transpose(M), M);
  const { values, vectors } = jacobiEigh(G, 28);
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

/** Nearest matrix in O(r) to M. Optional SO(r) by flipping a column if det < 0. */
export function procrustes(M: number[][], special = true): number[][] {
  const { U, Vt } = thinSvd(M);
  let R = matmul(U, Vt);
  if (special && R.length === 2 && det2(R) < 0) {
    R = [
      [R[0][0], -R[0][1]],
      [R[1][0], -R[1][1]],
    ];
  }
  return R;
}

export function pcaTop(X: number[][], r: number): number[][] {
  const n = X.length;
  const p = X[0].length;
  const mean = new Array(p).fill(0);
  for (const row of X) for (let j = 0; j < p; j++) mean[j] += row[j];
  for (let j = 0; j < p; j++) mean[j] /= Math.max(n, 1);
  const C = zeros(p);
  for (const row of X) {
    for (let a = 0; a < p; a++) {
      const da = row[a] - mean[a];
      for (let b = 0; b < p; b++) C[a][b] += da * (row[b] - mean[b]);
    }
  }
  for (let a = 0; a < p; a++) for (let b = 0; b < p; b++) C[a][b] /= Math.max(n - 1, 1);
  const { vectors } = jacobiEigh(C, 28);
  const Q = zeros(p, r);
  for (let k = 0; k < r; k++) {
    const col = p - 1 - k;
    for (let i = 0; i < p; i++) Q[i][k] = vectors[i][col] ?? 0;
  }
  if (r === 2 && det2([
    [Q[0][0], Q[0][1]],
    [Q[1]?.[0] ?? 0, Q[1]?.[1] ?? 1],
  ]) < 0) {
    for (let i = 0; i < p; i++) Q[i][1] *= -1;
  }
  return Q;
}
