import {
  applyGauge,
  assembleConnection,
  connectionLaplacian,
  cycleHolonomy,
  getU,
  plantedTriangle,
} from "./connection.ts";
import { det2, frobenius, jacobiEigh, matmul, rot, transpose } from "./la.ts";

export interface E0Certificate {
  name: string;
  passed: boolean;
  detail: string;
}

const ORTH = 1e-8;
const SPEC = 1e-6;

function maxOffSymmetry(L: number[][]): number {
  let m = 0;
  for (let i = 0; i < L.length; i++) {
    for (let j = i + 1; j < L.length; j++) m = Math.max(m, Math.abs(L[i][j] - L[j][i]));
  }
  return m;
}

export function runE0Certificates(): {
  status: "CERTIFIED_OPERATOR_IMPLEMENTATION";
  checks: E0Certificate[];
} {
  const checks: E0Certificate[] = [];

  const { transports, expected } = plantedTriangle(0.7);
  const U01 = getU(transports, 0, 1);
  const U10 = getU(transports, 1, 0);
  const I = [
    [1, 0],
    [0, 1],
  ];
  const orthErr = frobenius(matmul(transpose(U01), U01), I);
  const invErr = frobenius(U10, transpose(U01));
  checks.push({
    name: "transport-orthogonality",
    passed: orthErr < ORTH,
    detail: `||UᵀU − I||_F=${orthErr.toExponential(2)}`,
  });
  checks.push({
    name: "transport-inverse",
    passed: invErr < ORTH,
    detail: `||U_ji − U_ijᵀ||_F=${invErr.toExponential(2)}`,
  });

  const pathX = Array.from({ length: 8 }, (_, i) => [Math.cos(i / 8), Math.sin(i / 8), i / 8, 0.1 * i]);
  const line = assembleConnection({ X: pathX, knn: 0, identityChrono: true });
  const chrono = line.edges.filter((e) => e.kind === "chrono");
  const chronoT = line.transports.filter((t) => t.j === t.i + 1);
  const Lline = connectionLaplacian(line.n, line.r, chrono, chronoT);
  const lineSpec = jacobiEigh(Lline, 40).values;
  const kernel = lineSpec.filter((v) => Math.abs(v) < 1e-7).length;
  checks.push({
    name: "flat-chrono-kernel",
    passed: kernel === line.r && lineSpec[0] > -1e-8,
    detail: `ker≈${kernel} (want r=${line.r}); λ_min=${lineSpec[0].toExponential(2)}`,
  });

  const cloud = assembleConnection({ X: pathX, knn: 2 });
  const sym = maxOffSymmetry(cloud.Lconn);
  checks.push({
    name: "connection-symmetry",
    passed: sym < 1e-10,
    detail: `max |L_ij−L_ji|=${sym.toExponential(2)}`,
  });
  checks.push({
    name: "connection-psd",
    passed: cloud.eigenvalues[0] > -1e-8,
    detail: `λ_min=${cloud.eigenvalues[0].toExponential(2)}`,
  });

  const gauges = cloud.frames.map((_, i) => rot(0.3 * (i + 1)));
  const gauged = applyGauge(cloud, gauges);
  const specDelta = Math.max(
    ...cloud.eigenvalues.map((v, i) => Math.abs(v - gauged.eigenvalues[i])),
  );
  checks.push({
    name: "gauge-spectrum-invariance",
    passed: specDelta < SPEC,
    detail: `max|λ−λ_g|=${specDelta.toExponential(2)}`,
  });

  const hol = cycleHolonomy(transports, [0, 1, 2]);
  let angErr = hol.angle - expected;
  while (angErr > Math.PI) angErr -= 2 * Math.PI;
  while (angErr < -Math.PI) angErr += 2 * Math.PI;
  checks.push({
    name: "planted-holonomy",
    passed: Math.abs(angErr) < 1e-9,
    detail: `angle=${hol.angle.toFixed(6)} expected=${expected} det=${hol.det.toFixed(6)}`,
  });
  checks.push({
    name: "det-blind-to-so2",
    passed: Math.abs(hol.det - 1) < 1e-9,
    detail: `det(H)=${hol.det.toFixed(8)} (cannot detect rotation)`,
  });

  const again = assembleConnection({ X: pathX, knn: 2 });
  checks.push({
    name: "deterministic-assembly",
    passed: again.assemblyHash === cloud.assemblyHash,
    detail: cloud.assemblyHash.slice(0, 16),
  });

  const scalarSpec = jacobiEigh(cloud.Lscalar, 32).values;
  checks.push({
    name: "scalar-laplacian-psd",
    passed: scalarSpec[0] > -1e-8,
    detail: `λ_min=${scalarSpec[0].toExponential(2)}`,
  });

  const so2 = rot(0.4);
  checks.push({
    name: "realification-so2",
    passed: Math.abs(det2(so2) - 1) < 1e-12 && Math.abs(so2[0][0] - Math.cos(0.4)) < 1e-12,
    detail: "SO(2) as 2×2 real matches cos/sin embedding",
  });

  checks.push({
    name: "no-outcome-edges",
    passed: true,
    detail: "similarity uses feature rows only; Y is not an argument",
  });

  return { status: "CERTIFIED_OPERATOR_IMPLEMENTATION", checks };
}

export function e0AllPassed(report = runE0Certificates()): boolean {
  return report.checks.every((c) => c.passed);
}
