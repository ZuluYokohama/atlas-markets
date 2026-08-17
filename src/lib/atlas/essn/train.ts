import { mkdirSync, writeFileSync } from "node:fs";
import { pinball } from "../eval/metrics.ts";
import { buildRows } from "../eval/outcomes.ts";
import { SPLIT } from "../eval/splits.ts";
import { generateF0Universe } from "../eval/synth.ts";
import { contentHash } from "../hash.ts";
import { seedGenome, type EssnGenome } from "./genome.ts";
import type { FamilyVec } from "./model.ts";
import { EssnNet } from "./net.ts";
import { DEFAULT_TRAIN_PATH, type TrainPath } from "./trainPath.ts";

export interface Sample {
  fam: FamilyVec;
  y: number;
}

export interface TrainReport {
  protocol: TrainPath["protocol"];
  dataset: TrainPath["dataset"];
  confirmationOpened: false;
  device: "cpu";
  epochsRan: number;
  trainPinball: number;
  valPinball: number;
  bestVal: number;
  params: number;
  weightHash: string;
  path: TrainPath;
  genome: EssnGenome;
  artifact: string;
  claim: "TRAINED_LOCAL_WEIGHTS";
}

function plantedSamples(n: number, seed: number): Sample[] {
  let a = seed >>> 0;
  const rng = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const out: Sample[] = [];
  for (let i = 0; i < n; i++) {
    const vol0 = rng() * 2 - 0.2;
    out.push({
      y: 1.8 * vol0 + 0.15 * (rng() - 0.5),
      fam: {
        price: [rng() - 0.5, rng(), 0, 0],
        momentum: [rng() - 0.5, 0, 0, 0],
        volatility: [vol0, Math.abs(vol0), 0, 0],
        activity: [rng(), 0, 0, 0],
        surface: [rng() * 0.2, 0, 0, 0],
        context: [0, 0, 0, 0],
        geometry: [0, 0, 0, 0],
      },
    });
  }
  return out;
}

function developmentSamples(): Sample[] {
  const rows = buildRows(generateF0Universe()).filter((r) => r.index <= SPLIT.development.hi);
  return rows.map((r) => ({
    y: r.yFwd,
    fam: {
      price: [r.features[0] ?? 0, 0, 0, 0],
      momentum: [r.features[0] ?? 0, 0, 0, 0],
      volatility: [r.features[1] ?? 0, 0, 0, 0],
      activity: [0, 0, 0, 0],
      surface: [r.features[2] ?? 0, r.features[3] ?? 0, r.features[4] ?? 0, 0],
      context: [0, 0, 0, 0],
      geometry: [0, 0, 0, 0],
    },
  }));
}

function split(rows: Sample[], frac: number, seed: number): { train: Sample[]; val: Sample[] } {
  const idx = rows.map((_, i) => i);
  let a = seed >>> 0;
  for (let i = idx.length - 1; i > 0; i--) {
    a = (a + 0x6d2b79f5) | 0;
    const j = ((a >>> 0) % (i + 1)) >>> 0;
    [idx[i], idx[j]] = [idx[j]!, idx[i]!];
  }
  const nVal = Math.max(8, Math.floor(rows.length * frac));
  return {
    val: idx.slice(0, nVal).map((i) => rows[i]!),
    train: idx.slice(nVal).map((i) => rows[i]!),
  };
}

function meanPb(net: EssnNet, rows: Sample[], taus: readonly number[]): number {
  if (!rows.length) return Number.NaN;
  let s = 0;
  for (const r of rows) s += net.pinballLoss(net.forward(r.fam), r.y, taus);
  return s / rows.length;
}

export function loadSamples(dataset: TrainPath["dataset"]): Sample[] {
  return dataset === "development_f0" ? developmentSamples() : plantedSamples(160, 0x504c4e54);
}

export function trainLocal(
  path: TrainPath = DEFAULT_TRAIN_PATH,
  genome: EssnGenome = seedGenome(),
): TrainReport {
  if (path.confirmationOpened) throw new Error("CONFIRMATION_CLOSED");
  const all = loadSamples(path.dataset);
  const { train, val } = split(all, path.valFraction, path.seed);
  const net = new EssnNet(genome, path.seed);
  let best = Infinity;
  let bestSnapshot: { hash: string; params: number } | null = null;
  let bad = 0;
  let ran = 0;
  for (let e = 0; e < path.epochs; e++) {
    ran = e + 1;
    for (let i = 0; i < train.length; i += path.batchSize) {
      const batch = train.slice(i, i + path.batchSize);
      net.zeroGrad();
      for (const row of batch) {
        const q = net.forward(row.fam);
        net.backwardFromPinball(q, row.y, path.taus);
      }
      const inv = 1 / Math.max(batch.length, 1);
      const layers = [...net.towers.map((t) => t.layer), net.fusion, net.head];
      for (const L of layers) {
        for (let k = 0; k < L.gW.length; k++) L.gW[k] *= inv;
        for (let k = 0; k < L.gb.length; k++) L.gb[k] *= inv;
      }
      net.adamw(path);
    }
    const vp = meanPb(net, val, path.taus);
    if (vp + 1e-6 < best) {
      best = vp;
      bestSnapshot = net.snapshot();
      bad = 0;
    } else if (++bad >= path.earlyStopPatience) break;
  }
  const snap = bestSnapshot ?? net.snapshot();
  const artifact = {
    ...snap,
    path,
    genome,
    valPinball: best,
    dataset: path.dataset,
    confirmationOpened: false as const,
  };
  const name = `essn-${path.dataset}-${snap.hash.slice(0, 12)}.json`;
  const dir = "/workspace/experiments/artifacts";
  mkdirSync(dir, { recursive: true });
  const file = `${dir}/${name}`;
  writeFileSync(file, JSON.stringify(artifact, null, 2));
  return {
    protocol: path.protocol,
    dataset: path.dataset,
    confirmationOpened: false,
    device: "cpu",
    epochsRan: ran,
    trainPinball: meanPb(net, train, path.taus),
    valPinball: best,
    bestVal: best,
    params: snap.params,
    weightHash: snap.hash,
    path,
    genome,
    artifact: file,
    claim: "TRAINED_LOCAL_WEIGHTS",
  };
}

export function trainJobId(path: TrainPath): string {
  return `job_${contentHash(path).slice(0, 12)}`;
}
