import { cycleHolonomy, type Edge } from "./connection.ts";
import { det2, frobenius, matmul, rot, transpose } from "./la.ts";

export interface E2Trial {
  angle: number;
  frobenius: number;
  traceResidual: number;
  det: number;
}

export interface E2SweepCell {
  theta: number;
  sigma: number;
  length: number;
  typeI: number;
  power: number;
  n: number;
}

export interface E2Report {
  protocolId: "E2-holonomy-null-v0";
  confirmationOpened: false;
  threshold: number;
  typeI: number;
  power: number;
  detPower: number;
  gaugeDelta: number;
  cells: E2SweepCell[];
  replicationsAgree: boolean;
  claim: "CERTIFIED_DETECTABILITY" | "INCONCLUSIVE" | "FAILED_CHECK";
}

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

function wrap(a: number): number {
  while (a > Math.PI) a -= 2 * Math.PI;
  while (a < -Math.PI) a += 2 * Math.PI;
  return a;
}

/** Cycle 0—1—…—L-1—0. Plant θ on the closing edge. Each edge gets N(0,σ²) noise. */
export function cycleWorld(length: number, theta: number, sigma: number, rng: () => number) {
  const edges: Edge[] = [];
  const transports: Array<{ i: number; j: number; U: number[][] }> = [];
  for (let i = 0; i < length - 1; i++) {
    edges.push({ i, j: i + 1, w: 1, kind: "chrono" });
    transports.push({ i, j: i + 1, U: rot(sigma * gauss(rng)) });
  }
  edges.push({ i: 0, j: length - 1, w: 1, kind: "similarity" });
  transports.push({ i: 0, j: length - 1, U: rot(theta + sigma * gauss(rng)) });
  const cyc = Array.from({ length }, (_, i) => i);
  return { edges, transports, cycle: cyc };
}

export function gaugeTransports(
  transports: Array<{ i: number; j: number; U: number[][] }>,
  gauges: number[][][],
) {
  return transports.map((t) => ({
    i: t.i,
    j: t.j,
    U: matmul(transpose(gauges[t.i]), matmul(t.U, gauges[t.j])),
  }));
}

export function trialStats(length: number, theta: number, sigma: number, rng: () => number): E2Trial {
  const { transports, cycle } = cycleWorld(length, theta, sigma, rng);
  const hol = cycleHolonomy(transports, cycle);
  return {
    angle: wrap(hol.angle),
    frobenius: frobenius(hol.H, [
      [1, 0],
      [0, 1],
    ]),
    traceResidual: 2 - (hol.H[0][0] + hol.H[1][1]),
    det: hol.det,
  };
}

function rate(xs: number[], pred: (v: number) => boolean): number {
  return xs.filter(pred).length / Math.max(xs.length, 1);
}

export function runE2(opts?: { nNull?: number; nAlt?: number }): E2Report {
  const nNull = opts?.nNull ?? 400;
  const nAlt = opts?.nAlt ?? 200;
  const L0 = 8;
  const SIG0 = 0.08;
  const THETA = 0.7;

  const rngNull = mulberry(0xe200);
  const calib: number[] = [];
  const hold: number[] = [];
  const nullDets: number[] = [];
  for (let i = 0; i < nNull; i++) {
    const t = trialStats(L0, 0, SIG0, rngNull);
    (i < nNull / 2 ? calib : hold).push(Math.abs(t.angle));
    if (i >= nNull / 2) nullDets.push(Math.abs(t.det - 1));
  }
  const sorted = [...calib].sort((a, b) => a - b);
  const threshold = sorted[Math.floor(0.95 * (sorted.length - 1))] ?? 0;
  const typeI = rate(hold, (a) => a > threshold);

  const rngAlt = mulberry(0xe201);
  const altAngles: number[] = [];
  const altDets: number[] = [];
  for (let i = 0; i < nAlt; i++) {
    const t = trialStats(L0, THETA, SIG0, rngAlt);
    altAngles.push(Math.abs(t.angle));
    altDets.push(Math.abs(t.det - 1));
  }
  const detThresh = [...nullDets].sort((a, b) => a - b)[Math.floor(0.95 * (nullDets.length - 1))] ?? 1;
  const power = rate(altAngles, (a) => a > threshold);
  const detPower = rate(altDets, (d) => d > detThresh);

  const rngG = mulberry(0xe202);
  let gaugeDelta = 0;
  for (let i = 0; i < 30; i++) {
    const { transports, cycle } = cycleWorld(L0, THETA, 0, rngG);
    const before = cycleHolonomy(transports, cycle).angle;
    const gauges = Array.from({ length: L0 }, () => rot((rngG() - 0.5) * Math.PI));
    const after = cycleHolonomy(gaugeTransports(transports, gauges), cycle).angle;
    gaugeDelta = Math.max(gaugeDelta, Math.abs(wrap(before - after)));
  }

  const cells: E2SweepCell[] = [];
  const rngS = mulberry(0xe203);
  for (const length of [4, 8, 16]) {
    for (const sigma of [0.02, 0.08, 0.2]) {
      for (const theta of [0, 0.2, 0.5, 1.0]) {
        const abs: number[] = [];
        const n = theta === 0 ? 120 : 80;
        for (let i = 0; i < n; i++) abs.push(Math.abs(trialStats(length, theta, sigma, rngS).angle));
        cells.push({
          theta,
          sigma,
          length,
          typeI: theta === 0 ? rate(abs, (a) => a > threshold) : Number.NaN,
          power: theta === 0 ? Number.NaN : rate(abs, (a) => a > threshold),
          n,
        });
      }
    }
  }

  const rngR1 = mulberry(0xe211);
  const rngR2 = mulberry(0xe212);
  const p1 = rate(
    Array.from({ length: 80 }, () => Math.abs(trialStats(L0, THETA, SIG0, rngR1).angle)),
    (a) => a > threshold,
  );
  const p2 = rate(
    Array.from({ length: 80 }, () => Math.abs(trialStats(L0, THETA, SIG0, rngR2).angle)),
    (a) => a > threshold,
  );
  const replicationsAgree = Math.abs(p1 - p2) < 0.2 && p1 > 0.5 && p2 > 0.5;

  let claim: E2Report["claim"];
  if (typeI > 0.12 || power < 0.5 || detPower > 0.2) claim = "FAILED_CHECK";
  else if (typeI > 0.08 || power < 0.8 || !replicationsAgree) claim = "INCONCLUSIVE";
  else claim = "CERTIFIED_DETECTABILITY";

  return {
    protocolId: "E2-holonomy-null-v0",
    confirmationOpened: false,
    threshold,
    typeI,
    power,
    detPower,
    gaugeDelta,
    cells,
    replicationsAgree,
    claim,
  };
}
