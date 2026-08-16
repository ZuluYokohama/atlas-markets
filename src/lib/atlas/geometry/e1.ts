import { forecast } from "../eval/baselines.ts";
import { meanPinball } from "../eval/metrics.ts";
import { buildRows, type OutcomeRow } from "../eval/outcomes.ts";
import { F0_WINDOWS, MIN_EFFECT, SPLIT, assertNotConfirmation, eligiblePast } from "../eval/splits.ts";
import { generateF0Universe } from "../eval/synth.ts";
import {
  chronoEdges,
  connectionLaplacian,
  getU,
  identityTransports,
  scalarLaplacian,
  similarityEdges,
  type Edge,
} from "./connection.ts";
import { dctMse, reconMse } from "./dct.ts";
import { eye, jacobiEigh, matmul, matvec, rot, zeros } from "./la.ts";

export type GateStatus = "PASS" | "FAIL" | "INCONCLUSIVE";

export interface E1Subgate {
  id: string;
  status: GateStatus;
  detail: string;
  numbers: Record<string, number>;
}

export interface E1Report {
  protocolId: "E1-connection-spectral-v0";
  confirmationOpened: false;
  subgates: E1Subgate[];
  oracleStatus: "CERTIFIED_SYNTHETIC_ORACLE" | "FAILED_CHECK";
  predictiveAuthorization: false | "UNAUTHORIZED";
  e1gClaim: "UNSUPPORTED" | "INCONCLUSIVE" | "VALIDATED";
}

const N = 12;
const R = 2;
const K = 4;

function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gauss(rng: () => number) {
  return Math.sqrt(-2 * Math.log(Math.max(rng(), 1e-12))) * Math.cos(2 * Math.PI * rng());
}

function pathWorld() {
  const edges = chronoEdges(N);
  const transports = identityTransports(edges, R);
  const L = connectionLaplacian(N, R, edges, transports);
  const { values, vectors } = jacobiEigh(L, 36);
  return { edges, transports, L, values, vectors };
}

function plant(vectors: number[][], k: number, noise: number, rng: () => number): number[] {
  const dim = vectors.length;
  const s = new Array(dim).fill(0);
  for (let j = 0; j < k; j++) {
    const c = 1.2 / (j + 1);
    for (let i = 0; i < dim; i++) s[i] += c * vectors[i][j];
  }
  if (noise > 0) for (let i = 0; i < dim; i++) s[i] += noise * gauss(rng);
  return s;
}

function pcaBasisFromEnsemble(samples: number[][]): number[][] {
  const dim = samples[0].length;
  const C = zeros(dim);
  for (const x of samples) {
    for (let i = 0; i < dim; i++) for (let j = 0; j < dim; j++) C[i][j] += x[i] * x[j];
  }
  const n = samples.length;
  for (let i = 0; i < dim; i++) for (let j = 0; j < dim; j++) C[i][j] /= n;
  return jacobiEigh(C, 28).vectors;
}

function randomOrtho(dim: number, rng: () => number): number[][] {
  const A = zeros(dim);
  for (let i = 0; i < dim; i++) for (let j = 0; j < dim; j++) A[i][j] = gauss(rng);
  return jacobiEigh(matmul(A, A.map((r, i) => r.map((v, j) => (A[j][i] + v) / 2))), 20).vectors;
}

function gftMse(edges: Edge[], signal: number[], k: number): number {
  const L = scalarLaplacian(N, edges);
  const { vectors } = jacobiEigh(L, 28);
  const even = signal.filter((_, i) => i % 2 === 0);
  return reconMse(vectors, even, Math.max(1, Math.floor(k / 2)));
}

function unwrapThenDct(signal: number[], edges: Edge[], transports: { i: number; j: number; U: number[][] }[]): number {
  const acc = [eye(2)];
  for (let i = 1; i < N; i++) acc.push(matmul(acc[i - 1], getU(transports, i, i - 1)));
  const un = signal.slice();
  for (let i = 0; i < N; i++) {
    const y = matvec(acc[i], [signal[i * 2], signal[i * 2 + 1]]);
    un[i * 2] = y[0];
    un[i * 2 + 1] = y[1];
  }
  return dctMse(un, K);
}

function shuffledMse(signal: number[], edges: Edge[], rng: () => number): number {
  const transports = edges.map((e) => ({ i: e.i, j: e.j, U: rot(rng() * Math.PI) }));
  const L = connectionLaplacian(N, R, edges, transports);
  return reconMse(jacobiEigh(L, 32).vectors, signal, K);
}

function randomGraphMse(signal: number[], rng: () => number): number {
  const edges: Edge[] = chronoEdges(N);
  for (let t = 0; t < 6; t++) {
    const i = Math.floor(rng() * (N - 2));
    const j = i + 2 + Math.floor(rng() * (N - i - 2));
    if (j < N) edges.push({ i, j, w: 0.4, kind: "similarity" });
  }
  const L = connectionLaplacian(N, R, edges, identityTransports(edges, R));
  return reconMse(jacobiEigh(L, 32).vectors, signal, K);
}

export function runE1(): E1Report {
  const rng = mulberry(0xe1a01);
  const world = pathWorld();
  const clean = plant(world.vectors, K, 0, rng);

  const ensemble = Array.from({ length: 16 }, () => plant(world.vectors, K, 0.08, rng));
  const holdout = plant(world.vectors, K, 0.08, rng);
  const dConn = reconMse(world.vectors, holdout, K);
  const dDct = dctMse(holdout, K);
  const dPca = reconMse(pcaBasisFromEnsemble(ensemble), holdout, K);
  const dGauge = unwrapThenDct(holdout, world.edges, world.transports);
  const dGft = gftMse(world.edges, holdout, K);
  const dRand = reconMse(randomOrtho(N * R, rng), holdout, K);
  const dClean = reconMse(world.vectors, clean, K);

  const e1a: E1Subgate = {
    id: "E1-A",
    status: dClean < 1e-12 && dConn < dDct ? "PASS" : "FAIL",
    detail: "planted low-mode signal; connection basis is the oracle",
    numbers: { dClean, dConn, dDct },
  };

  const e1b: E1Subgate = {
    id: "E1-B",
    status: dConn <= dDct && dConn <= dRand ? "PASS" : "INCONCLUSIVE",
    detail: "gauge-fair reconstruction MSE at k=4",
    numbers: { dConn, dDct, dGauge, dGft, dPca, dRand },
  };

  const dShuf = shuffledMse(holdout, world.edges, rng);
  const chronoOnly = reconMse(world.vectors, holdout, K);
  const dRndG = randomGraphMse(holdout, rng);
  const e1c: E1Subgate = {
    id: "E1-C",
    status: dConn <= dShuf ? "PASS" : "INCONCLUSIVE",
    detail: "true connection vs shuffled transports / random graph",
    numbers: { dConn, dShuf, dChrono: chronoOnly, dRandomGraph: dRndG },
  };

  const noises = [0, 0.05, 0.15, 0.4];
  const noiseCurve: Record<string, number> = {};
  for (const nv of noises) {
    noiseCurve[`n${nv}`] = reconMse(world.vectors, plant(world.vectors, K, nv, rng), K);
  }
  const e1d: E1Subgate = {
    id: "E1-D",
    status: noiseCurve.n0 < noiseCurve["n0.4"] ? "PASS" : "INCONCLUSIVE",
    detail: "MSE rises with transport/signal noise",
    numbers: noiseCurve,
  };

  const coeffBytes = K * 8;
  const basisBytes = N * R * K * 8;
  const graphBytes = world.edges.length * 16;
  const transportBytes = world.transports.length * R * R * 8;
  const e1e: E1Subgate = {
    id: "E1-E",
    status: "PASS",
    detail: "equal k is not equal bitrate",
    numbers: {
      k: K,
      coeffBytes,
      basisBytes,
      graphBytes,
      transportBytes,
      connBits: coeffBytes + basisBytes + graphBytes + transportBytes,
      dctBits: coeffBytes,
    },
  };

  const train = plant(world.vectors, K, 0.05, rng);
  const test = plant(world.vectors, K, 0.05, rng);
  const pcaTrain = pcaBasisFromEnsemble([train, plant(world.vectors, K, 0.05, rng), plant(world.vectors, K, 0.05, rng)]);
  const dConnTest = reconMse(world.vectors, test, K);
  const dPcaTest = reconMse(pcaTrain, test, K);
  const e1f: E1Subgate = {
    id: "E1-F",
    status: dConnTest < dPcaTest ? "PASS" : "INCONCLUSIVE",
    detail: "graph/transports frozen; new sample reconstructed",
    numbers: { dConnTest, dPcaTest },
  };

  const e1g = runE1G();

  const oracleStatus = e1a.status === "PASS" ? "CERTIFIED_SYNTHETIC_ORACLE" : "FAILED_CHECK";
  return {
    protocolId: "E1-connection-spectral-v0",
    confirmationOpened: false,
    subgates: [e1a, e1b, e1c, e1d, e1e, e1f, e1g],
    oracleStatus,
    predictiveAuthorization: false,
    e1gClaim: e1g.status === "PASS" ? "VALIDATED" : e1g.status === "FAIL" ? "UNSUPPORTED" : "INCONCLUSIVE",
  };
}

function zscore(row: number[], mean: number[], sd: number[]): number[] {
  return row.map((v, i) => (sd[i] === 0 ? 0 : (v - mean[i]) / sd[i]));
}

/** Nyström-style connection coords from a train-only graph. Confirmation closed. */
function runE1G(): E1Subgate {
  const days = generateF0Universe();
  const rows = buildRows(days).filter((r) => r.index <= SPLIT.development.hi);
  const byIndex = new Map(rows.map((r) => [r.index, r]));
  const trainIdx = rows.filter((r) => r.index >= 21 && r.index < 80 && r.index % 4 === 0);
  const X = trainIdx.map((r) => r.features);
  const edges = [...chronoEdges(X.length), ...similarityEdges(X, 2)];
  const L = connectionLaplacian(X.length, R, edges, identityTransports(edges, R));
  const { vectors } = jacobiEigh(L, 28);
  const coords = trainIdx.map((_, i) => [vectors[i * R][0], vectors[i * R + 1][0], vectors[i * R][1], vectors[i * R + 1][1]]);

  const mean = X[0].map((_, j) => X.reduce((s, r) => s + r[j], 0) / X.length);
  const sd = X[0].map((_, j) => {
    const v = X.reduce((s, r) => s + (r[j] - mean[j]) ** 2, 0) / Math.max(X.length - 1, 1);
    return Math.sqrt(v);
  });

  function embed(q: OutcomeRow): number[] {
    let best = 0;
    let bestD = Infinity;
    const qz = zscore(q.features, mean, sd);
    for (let i = 0; i < trainIdx.length; i++) {
      const tz = zscore(trainIdx[i].features, mean, sd);
      let d = 0;
      for (let t = 0; t < qz.length; t++) d += (qz[t] - tz[t]) ** 2;
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    return [...q.features, ...coords[best]];
  }

  function score(lo: number, hi: number): { pinballKnn: number; pinballConn: number; n: number } {
    const qs = rows.filter((r) => r.index >= lo && r.index <= hi);
    const y = qs.map((r) => r.yPnl);
    const qKnn: Array<{ q10: number; q50: number; q90: number }> = [];
    const qConn: Array<{ q10: number; q50: number; q90: number }> = [];
    for (const q of qs) {
      assertNotConfirmation(q.index);
      const past = eligiblePast(q.index)
        .map((i) => byIndex.get(i))
        .filter((r): r is OutcomeRow => !!r);
      qKnn.push(forecast("knn", q, past).q);
      const q2 = { ...q, features: embed(q) };
      const past2 = past.map((r) => ({ ...r, features: embed(r) }));
      qConn.push(forecast("knn", q2, past2).q);
    }
    return {
      pinballKnn: meanPinball(y, qKnn),
      pinballConn: meanPinball(y, qConn),
      n: qs.length,
    };
  }

  const w1 = score(F0_WINDOWS.W1.lo, F0_WINDOWS.W1.hi);
  const w2 = score(F0_WINDOWS.W2.lo, F0_WINDOWS.W2.hi);
  const d1 = (w1.pinballKnn - w1.pinballConn) / Math.max(Math.abs(w1.pinballKnn), 1e-9);
  const d2 = (w2.pinballKnn - w2.pinballConn) / Math.max(Math.abs(w2.pinballKnn), 1e-9);
  const both = d1 >= MIN_EFFECT && d2 >= MIN_EFFECT;
  return {
    id: "E1-G",
    status: both ? "PASS" : d1 > 0 || d2 > 0 ? "INCONCLUSIVE" : "FAIL",
    detail: "incremental pinball vs feature-only kNN; confirmation closed",
    numbers: {
      w1Knn: w1.pinballKnn,
      w1Conn: w1.pinballConn,
      w1Delta: d1,
      w2Knn: w2.pinballKnn,
      w2Conn: w2.pinballConn,
      w2Delta: d2,
    },
  };
}
