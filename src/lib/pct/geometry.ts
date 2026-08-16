import {
  dctII,
  det2,
  dot,
  eye,
  frobeniusIminus,
  gauss,
  holonomyAngle,
  idctII,
  jacobiEigh,
  matmul,
  matvec,
  mean,
  mulberry32,
  pcaTop,
  procrustes,
  rot,
  transpose,
  zeros,
} from "./core";
import { encodeState, flattenState, type Universe } from "./market";
import type { ConnectionBundle, E1Result } from "./types";

function knnEdges(X: number[][], k: number): { i: number; j: number; d: number }[] {
  const n = X.length;
  const all: { i: number; j: number; d: number }[] = [];
  for (let i = 0; i < n; i++) {
    const ds: { j: number; d: number }[] = [];
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      let s = 0;
      for (let t = 0; t < X[i].length; t++) {
        const v = X[i][t] - X[j][t];
        s += v * v;
      }
      ds.push({ j, d: Math.sqrt(s) });
    }
    ds.sort((a, b) => a.d - b.d);
    for (const nbor of ds.slice(0, k)) all.push({ i, j: nbor.j, d: nbor.d });
  }
  const mutual: { i: number; j: number; d: number }[] = [];
  const seen = new Set<string>();
  for (const e of all) {
    const a = Math.min(e.i, e.j);
    const b = Math.max(e.i, e.j);
    const key = `${a}-${b}`;
    if (seen.has(key)) continue;
    const back = all.some((x) => x.i === e.j && x.j === e.i);
    if (!back) continue;
    seen.add(key);
    mutual.push({ i: a, j: b, d: e.d });
  }
  return mutual;
}

export function buildConnection(uni: Universe, stride = 14, r = 2): ConnectionBundle {
  const vertices: number[] = [];
  for (let i = 20; i < uni.days.length - 5; i += stride) vertices.push(i);
  const n = vertices.length;
  const feats = vertices.map((vi) => flattenState(encodeState(uni.days, uni.events, vi)));
  const mu = feats[0].map((_, j) => mean(feats.map((f) => f[j])));
  const sd = feats[0].map((_, j) => {
    const v = mean(feats.map((f) => (f[j] - mu[j]) ** 2));
    return Math.sqrt(v) || 1;
  });
  const X = feats.map((f) => f.map((v, j) => (v - mu[j]) / sd[j]));

  const frames: number[][][] = [];
  for (let i = 0; i < n; i++) {
    const lo = Math.max(0, i - 4);
    const hi = Math.min(n, i + 5);
    const { Q } = pcaTop(X.slice(lo, hi), r);
    const q2 = [
      [Q[0]?.[0] ?? 1, Q[0]?.[1] ?? 0],
      [Q[1]?.[0] ?? 0, Q[1]?.[1] ?? 1],
    ];
    if (det2(q2) < 0) {
      q2[0][1] *= -1;
      q2[1][1] *= -1;
    }
    frames.push(q2);
  }

  const edges: ConnectionBundle["edges"] = [];
  for (let i = 0; i < n - 1; i++) {
    edges.push({ i, j: i + 1, w: 1.15, kind: "chrono" });
  }
  for (const e of knnEdges(X, 3)) {
    if (Math.abs(e.i - e.j) === 1) continue;
    const w = Math.exp(-e.d);
    edges.push({ i: e.i, j: e.j, w, kind: "knn" });
  }

  const transports: ConnectionBundle["transports"] = [];
  for (const e of edges) {
    const Qi = frames[e.i];
    const Qj = frames[e.j];
    const M = matmul(transpose(Qj), Qi);
    let { U } = procrustes(M);
    if (det2(U) < 0) {
      U = [
        [U[0][0], -U[0][1]],
        [U[1][0], -U[1][1]],
      ];
    }
    transports.push({ i: e.i, j: e.j, U, conf: 1 });
    e.holonomy = holonomyAngle(U);
  }

  const dim = n * r;
  const L = zeros(dim);
  const deg = Array<number>(n).fill(0);
  for (const e of edges) {
    deg[e.i] += e.w;
    deg[e.j] += e.w;
  }
  for (let i = 0; i < n; i++) {
    for (let a = 0; a < r; a++) L[i * r + a][i * r + a] = deg[i];
  }
  for (const e of edges) {
    const tr = transports.find((t) => t.i === e.i && t.j === e.j)!;
    const U = tr.U;
    for (let a = 0; a < r; a++) {
      for (let b = 0; b < r; b++) {
        L[e.i * r + a][e.j * r + b] -= e.w * U[b][a];
        L[e.j * r + b][e.i * r + a] -= e.w * U[b][a];
      }
    }
  }
  const { values } = jacobiEigh(L, 14);
  const energy = mean(
    edges.map((e) => {
      const U = transports.find((t) => t.i === e.i && t.j === e.j)!.U;
      return e.w * (2 - (U[0][0] + U[1][1]));
    }),
  );

  const cycles: ConnectionBundle["cycleHolonomy"] = [];
  for (const e of edges.filter((x) => x.kind === "knn")) {
    const path: number[] = [];
    let cur = e.i;
    const dir = Math.sign(e.j - e.i) || 1;
    while (cur !== e.j) {
      path.push(cur);
      cur += dir;
    }
    path.push(e.j);
    if (path.length < 3 || path.length > 8) continue;
    let H = eye(2);
    for (let t = 0; t < path.length - 1; t++) {
      const a = path[t];
      const b = path[t + 1];
      const lo = Math.min(a, b);
      const hi = Math.max(a, b);
      const tr = transports.find((x) => x.i === lo && x.j === hi);
      if (!tr) continue;
      const U = a < b ? tr.U : transpose(tr.U);
      H = matmul(U, H);
    }
    const close = transports.find(
      (x) => x.i === Math.min(e.i, e.j) && x.j === Math.max(e.i, e.j),
    );
    if (close) {
      const U = e.j > e.i ? transpose(close.U) : close.U;
      H = matmul(U, H);
    }
    cycles.push({
      cycle: path.concat(e.i),
      angle: holonomyAngle(H),
      frobenius: frobeniusIminus(H),
    });
  }
  cycles.sort((a, b) => Math.abs(b.angle) - Math.abs(a.angle));

  return {
    n,
    r,
    vertices,
    edges,
    frames,
    transports,
    eigenvalues: values.slice(0, 12),
    energy,
    treeHolonomyMax: 0,
    cycleHolonomy: cycles.slice(0, 8),
  };
}

export function randomGauge(bundle: ConnectionBundle, seed = 7): ConnectionBundle {
  const rng = mulberry32(seed);
  const G = bundle.vertices.map(() => rot(rng() * Math.PI * 2));
  const transports = bundle.transports.map((t) => {
    const U = matmul(G[t.j], matmul(t.U, transpose(G[t.i])));
    return { ...t, U };
  });
  return {
    ...bundle,
    transports,
    frames: bundle.frames.map((f, i) => matmul(f, transpose(G[i]))),
  };
}

export function runE1(seed = 11): E1Result {
  const rng = mulberry32(seed);
  const n = 28;
  const r = 2;
  const dim = n * r;
  const edges: { i: number; j: number; w: number; U: number[][] }[] = [];
  for (let i = 0; i < n - 1; i++) {
    edges.push({ i, j: i + 1, w: 1, U: rot(0.04 * Math.sin(i / 3)) });
  }
  edges.push({ i: 0, j: n - 1, w: 0.7, U: rot(0.55) });
  for (let k = 0; k < 6; k++) {
    const i = Math.floor(rng() * (n - 6));
    const j = i + 3 + Math.floor(rng() * 4);
    edges.push({ i, j, w: 0.45, U: rot(0.12 * gauss(rng)) });
  }

  const L = zeros(dim);
  const deg = Array<number>(n).fill(0);
  for (const e of edges) {
    deg[e.i] += e.w;
    deg[e.j] += e.w;
  }
  for (let i = 0; i < n; i++) for (let a = 0; a < r; a++) L[i * r + a][i * r + a] = deg[i];
  for (const e of edges) {
    for (let a = 0; a < r; a++) {
      for (let b = 0; b < r; b++) {
        L[e.i * r + a][e.j * r + b] -= e.w * e.U[b][a];
        L[e.j * r + b][e.i * r + a] -= e.w * e.U[b][a];
      }
    }
  }
  const { vectors } = jacobiEigh(L, 16);
  const kKeep = 6;
  const trueCoef = Array.from({ length: dim }, (_, i) =>
    i < kKeep ? gauss(rng) * (1.2 / (1 + i)) : 0,
  );
  const clean: number[] = matvec(vectors, trueCoef);
  const noisy = clean.map((v) => v + 0.18 * gauss(rng));

  const recon = (basis: number[][], x: number[], kk: number) => {
    const coef = Array<number>(kk).fill(0);
    for (let j = 0; j < kk; j++) {
      const col = basis.map((row) => row[j]);
      coef[j] = dot(col, x);
    }
    const y = Array<number>(x.length).fill(0);
    for (let j = 0; j < kk; j++) {
      for (let i = 0; i < x.length; i++) y[i] += basis[i][j] * coef[j];
    }
    return mean(x.map((v, i) => (v - y[i]) ** 2));
  };

  const dConn = recon(vectors, noisy, kKeep);

  const C = zeros(dim);
  for (let i = 0; i < dim; i++) for (let j = 0; j < dim; j++) C[i][j] = noisy[i] * noisy[j];
  const pcaB = jacobiEigh(C, 14);
  const dPca = recon(pcaB.vectors, noisy, kKeep);
  const dDct = dctMse(noisy, kKeep);

  let acc = eye(2);
  const G = [eye(2)];
  for (let i = 1; i < n; i++) {
    const e = edges.find((ed) => ed.i === i - 1 && ed.j === i);
    if (e) acc = matmul(acc, e.U);
    G.push(acc);
  }
  const unwrapped = noisy.slice();
  for (let i = 0; i < n; i++) {
    const s = [noisy[i * 2], noisy[i * 2 + 1]];
    const y = matvec(G[i], s);
    unwrapped[i * 2] = y[0];
    unwrapped[i * 2 + 1] = y[1];
  }
  const dGaugeDct = dctMse(unwrapped, kKeep);

  const Lw = zeros(n);
  for (const e of edges) {
    Lw[e.i][e.i] += e.w;
    Lw[e.j][e.j] += e.w;
    Lw[e.i][e.j] -= e.w;
    Lw[e.j][e.i] -= e.w;
  }
  const gft = jacobiEigh(Lw, 16);
  const scalar = unwrapped.filter((_, i) => i % 2 === 0);
  const dGft = recon(padBasis(gft.vectors, scalar.length, kKeep), scalar, kKeep);

  const shuffledU = edges.map((e) => ({ ...e, U: rot(rng() * Math.PI) }));
  const Ls = zeros(dim);
  const degs = Array<number>(n).fill(0);
  for (const e of shuffledU) {
    degs[e.i] += e.w;
    degs[e.j] += e.w;
  }
  for (let i = 0; i < n; i++) for (let a = 0; a < r; a++) Ls[i * r + a][i * r + a] = degs[i];
  for (const e of shuffledU) {
    for (let a = 0; a < r; a++) {
      for (let b = 0; b < r; b++) {
        Ls[e.i * r + a][e.j * r + b] -= e.w * e.U[b][a];
        Ls[e.j * r + b][e.i * r + a] -= e.w * e.U[b][a];
      }
    }
  }
  const sh = jacobiEigh(Ls, 14);
  const dShuffled = recon(sh.vectors, noisy, kKeep);

  return {
    k: kKeep,
    dConn,
    dPca,
    dDct,
    dGaugeDct,
    dGft,
    dShuffled,
    reductionVsDct: (dDct - dConn) / Math.max(dDct, 1e-9),
    note: "E1-A oracle calibration: clean section lives in the same low eigenspace used to reconstruct. Compare also to gauge-DCT.",
  };
}

function dctMse(x: number[], k: number): number {
  const y = dctII(x);
  const z = y.map((v, i) => (i < k ? v : 0));
  const rec = idctII(z);
  return mean(x.map((v, i) => (v - rec[i]) ** 2));
}

function padBasis(V: number[][], n: number, k: number): number[][] {
  const B = zeros(n, k);
  for (let j = 0; j < k; j++) for (let i = 0; i < n; i++) B[i][j] = V[i]?.[j] ?? 0;
  return B;
}

export function slidingPersistence(
  series: number[],
  window = 24,
): { births: number[]; deaths: number[]; betti0: number[]; betti1: number[] } {
  const cloud: number[][] = [];
  for (let i = window; i < series.length; i++) {
    cloud.push(series.slice(i - window, i));
  }
  if (cloud.length < 8) {
    return { births: [], deaths: [], betti0: [], betti1: [] };
  }
  const m = cloud.length;
  const D = zeros(m);
  for (let i = 0; i < m; i++) {
    for (let j = i + 1; j < m; j++) {
      let s = 0;
      for (let t = 0; t < window; t++) {
        const v = cloud[i][t] - cloud[j][t];
        s += v * v;
      }
      D[i][j] = D[j][i] = Math.sqrt(s);
    }
  }
  const edges: { i: number; j: number; d: number }[] = [];
  for (let i = 0; i < m; i++)
    for (let j = i + 1; j < m; j++) edges.push({ i, j, d: D[i][j] });
  edges.sort((a, b) => a.d - b.d);

  const parent = Array.from({ length: m }, (_, i) => i);
  const find = (x: number): number => {
    if (parent[x] !== x) parent[x] = find(parent[x]);
    return parent[x];
  };
  const births: number[] = [];
  const deaths: number[] = [];
  let comps = m;
  const betti0: number[] = [];
  const betti1: number[] = [];
  let loops = 0;
  const steps = Math.min(edges.length, 180);
  for (let s = 0; s < steps; s++) {
    const e = edges[s];
    const a = find(e.i);
    const b = find(e.j);
    if (a !== b) {
      parent[a] = b;
      comps--;
      births.push(0);
      deaths.push(e.d);
    } else {
      loops++;
    }
    if (s % 4 === 0) {
      betti0.push(comps);
      betti1.push(loops);
    }
  }
  return { births, deaths, betti0, betti1 };
}

export function e2HolonomyDemo(phi = 0.7, noise = 0.08, seed = 3) {
  const rng = mulberry32(seed);
  const n = 16;
  const Utrue: number[][][] = [];
  for (let i = 0; i < n; i++) {
    const base = i === n - 1 ? phi : 0.02 * Math.sin(i);
    Utrue.push(rot(base + noise * gauss(rng)));
  }
  let H = eye(2);
  for (const U of Utrue) H = matmul(U, H);
  return {
    planted: phi,
    recovered: holonomyAngle(H),
    frobenius: frobeniusIminus(H),
    traceStat: 2 - (H[0][0] + H[1][1]),
  };
}
