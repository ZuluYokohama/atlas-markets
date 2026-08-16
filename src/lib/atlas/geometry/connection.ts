import { contentHash } from "../hash.ts";
import {
  det2,
  eye,
  holonomyAngle,
  jacobiEigh,
  matmul,
  pcaTop,
  procrustes,
  rot,
  transpose,
  zeros,
} from "./la.ts";

export type EdgeKind = "chrono" | "similarity";

export interface Edge {
  i: number;
  j: number;
  w: number;
  kind: EdgeKind;
}

export interface ConnectionBundle {
  n: number;
  r: number;
  edges: Edge[];
  /** U[i][j] maps j-frame coordinates into i-frame. Only i<j stored in list. */
  transports: Array<{ i: number; j: number; U: number[][] }>;
  frames: number[][][];
  Lconn: number[][];
  Lscalar: number[][];
  eigenvalues: number[];
  assemblyHash: string;
}

function key(i: number, j: number): string {
  return `${i},${j}`;
}

export function getU(
  transports: ConnectionBundle["transports"],
  i: number,
  j: number,
): number[][] {
  if (i === j) return eye(transports[0]?.U.length ?? 2);
  if (i < j) {
    const t = transports.find((x) => x.i === i && x.j === j);
    if (!t) throw new Error(`NO_TRANSPORT ${i} ${j}`);
    return t.U;
  }
  return transpose(getU(transports, j, i));
}

export function chronoEdges(n: number, w = 1): Edge[] {
  const edges: Edge[] = [];
  for (let i = 0; i < n - 1; i++) edges.push({ i, j: i + 1, w, kind: "chrono" });
  return edges;
}

/** Mutual kNN on feature rows. Never sees labels. */
export function similarityEdges(X: number[][], k = 3): Edge[] {
  const n = X.length;
  const nbr: number[][] = [];
  for (let i = 0; i < n; i++) {
    const ds: Array<{ j: number; d: number }> = [];
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      let s = 0;
      for (let t = 0; t < X[i].length; t++) {
        const d = X[i][t] - X[j][t];
        s += d * d;
      }
      ds.push({ j, d: Math.sqrt(s) });
    }
    ds.sort((a, b) => a.d - b.d);
    nbr[i] = ds.slice(0, k).map((x) => x.j);
  }
  const out: Edge[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < n; i++) {
    for (const j of nbr[i]) {
      if (!nbr[j].includes(i)) continue;
      const a = Math.min(i, j);
      const b = Math.max(i, j);
      const id = key(a, b);
      if (seen.has(id) || b === a + 1) continue;
      seen.add(id);
      let d = 0;
      for (let t = 0; t < X[i].length; t++) d += (X[i][t] - X[j][t]) ** 2;
      out.push({ i: a, j: b, w: Math.exp(-Math.sqrt(d)), kind: "similarity" });
    }
  }
  return out;
}

export function localFrames(X: number[][], r: number, radius = 3): number[][][] {
  const n = X.length;
  return X.map((_, i) => {
    const lo = Math.max(0, i - radius);
    const hi = Math.min(n, i + radius + 1);
    return pcaTop(X.slice(lo, hi), r);
  });
}

export function transportsFromFrames(
  edges: Edge[],
  frames: number[][][],
): ConnectionBundle["transports"] {
  return edges.map((e) => {
    const Qi = frames[e.i];
    const Qj = frames[e.j];
    const M = matmul(transpose(Qi), Qj);
    const U = procrustes(M, true);
    return { i: e.i, j: e.j, U };
  });
}

export function identityTransports(edges: Edge[], r: number): ConnectionBundle["transports"] {
  return edges.map((e) => ({ i: e.i, j: e.j, U: eye(r) }));
}

export function scalarLaplacian(n: number, edges: Edge[]): number[][] {
  const L = zeros(n);
  const deg = new Array(n).fill(0);
  for (const e of edges) {
    deg[e.i] += e.w;
    deg[e.j] += e.w;
  }
  for (let i = 0; i < n; i++) L[i][i] = deg[i];
  for (const e of edges) {
    L[e.i][e.j] -= e.w;
    L[e.j][e.i] -= e.w;
  }
  return L;
}

export function connectionLaplacian(
  n: number,
  r: number,
  edges: Edge[],
  transports: ConnectionBundle["transports"],
): number[][] {
  const dim = n * r;
  const L = zeros(dim);
  const deg = new Array(n).fill(0);
  for (const e of edges) {
    deg[e.i] += e.w;
    deg[e.j] += e.w;
  }
  for (let i = 0; i < n; i++) {
    for (let a = 0; a < r; a++) L[i * r + a][i * r + a] = deg[i];
  }
  for (const e of edges) {
    const Uij = getU(transports, e.i, e.j);
    for (let a = 0; a < r; a++) {
      for (let b = 0; b < r; b++) {
        L[e.i * r + a][e.j * r + b] -= e.w * Uij[a][b];
        L[e.j * r + b][e.i * r + a] -= e.w * Uij[a][b];
      }
    }
  }
  return L;
}

export function applyGauge(
  bundle: ConnectionBundle,
  gauges: number[][][],
): ConnectionBundle {
  const transports = bundle.transports.map((t) => {
    const gi = gauges[t.i];
    const gj = gauges[t.j];
    const U = matmul(transpose(gi), matmul(t.U, gj));
    return { i: t.i, j: t.j, U };
  });
  const Lconn = connectionLaplacian(bundle.n, bundle.r, bundle.edges, transports);
  const { values } = jacobiEigh(Lconn, 40);
  return {
    ...bundle,
    transports,
    Lconn,
    eigenvalues: values,
    assemblyHash: contentHash(Lconn.map((row) => row.map((x) => +x.toFixed(10)))),
  };
}

export function cycleHolonomy(
  transports: ConnectionBundle["transports"],
  cycle: number[],
): { H: number[][]; angle: number; det: number } {
  let H = eye(2);
  for (let t = 0; t < cycle.length; t++) {
    const a = cycle[t];
    const b = cycle[(t + 1) % cycle.length];
    H = matmul(getU(transports, b, a), H);
  }
  return { H, angle: holonomyAngle(H), det: det2(H) };
}

export function chronoChordCycles(n: number, edges: Edge[]): number[][] {
  const cycles: number[][] = [];
  for (const e of edges) {
    if (e.kind !== "similarity") continue;
    if (e.j - e.i < 2 || e.j - e.i > 8) continue;
    const cyc: number[] = [];
    for (let k = e.i; k <= e.j; k++) cyc.push(k);
    cycles.push(cyc);
  }
  return cycles;
}

export function assembleConnection(opts: {
  X: number[][];
  r?: number;
  knn?: number;
  identityChrono?: boolean;
}): ConnectionBundle {
  const r = opts.r ?? 2;
  const n = opts.X.length;
  const frames = localFrames(opts.X, r);
  const edges = [...chronoEdges(n), ...similarityEdges(opts.X, opts.knn ?? 3)];
  const transports = opts.identityChrono
    ? identityTransports(edges, r)
    : transportsFromFrames(edges, frames);
  const Lscalar = scalarLaplacian(n, edges);
  const Lconn = connectionLaplacian(n, r, edges, transports);
  const { values } = jacobiEigh(Lconn, 40);
  return {
    n,
    r,
    edges,
    transports,
    frames,
    Lconn,
    Lscalar,
    eigenvalues: values,
    assemblyHash: contentHash(Lconn.map((row) => row.map((x) => +x.toFixed(10)))),
  };
}

export function plantedTriangle(theta: number): {
  edges: Edge[];
  transports: ConnectionBundle["transports"];
  expected: number;
} {
  const edges: Edge[] = [
    { i: 0, j: 1, w: 1, kind: "chrono" },
    { i: 1, j: 2, w: 1, kind: "chrono" },
    { i: 0, j: 2, w: 1, kind: "similarity" },
  ];
  const I = eye(2);
  const R = rot(theta);
  const transports = [
    { i: 0, j: 1, U: I },
    { i: 1, j: 2, U: I },
    { i: 0, j: 2, U: R },
  ];
  return { edges, transports, expected: theta };
}
