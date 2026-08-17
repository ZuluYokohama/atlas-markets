import { pinball } from "../eval/metrics.ts";
import { contentHash } from "../hash.ts";
import { enabledFamilies, seedGenome, type EssnGenome, type Family } from "./genome.ts";
import { silu } from "./ops.ts";
import type { FamilyVec } from "./model.ts";
import type { TrainPath } from "./trainPath.ts";

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-Math.max(-40, Math.min(40, x))));
}

function siluPrime(x: number): number {
  const s = sigmoid(x);
  return s + x * s * (1 - s);
}

class Linear {
  rows: number;
  cols: number;
  W: number[];
  b: number[];
  gW: number[];
  gb: number[];
  mW: number[];
  vW: number[];
  mb: number[];
  vb: number[];
  private lastX: number[] = [];
  constructor(rows: number, cols: number, seed: number) {
    this.rows = rows;
    this.cols = cols;
    this.W = fan(rows * cols, seed, cols);
    this.b = new Array(rows).fill(0);
    this.gW = new Array(rows * cols).fill(0);
    this.gb = new Array(rows).fill(0);
    this.mW = new Array(rows * cols).fill(0);
    this.vW = new Array(rows * cols).fill(0);
    this.mb = new Array(rows).fill(0);
    this.vb = new Array(rows).fill(0);
  }
  zero(): void {
    this.gW.fill(0);
    this.gb.fill(0);
  }
  forward(x: number[]): number[] {
    this.lastX = x;
    const y = new Array(this.rows);
    for (let i = 0; i < this.rows; i++) {
      let s = this.b[i]!;
      for (let j = 0; j < this.cols; j++) s += this.W[i * this.cols + j]! * (x[j] ?? 0);
      y[i] = s;
    }
    return y;
  }
  backward(dy: number[]): number[] {
    const dx = new Array(this.cols).fill(0);
    for (let i = 0; i < this.rows; i++) {
      const g = dy[i] ?? 0;
      this.gb[i] += g;
      for (let j = 0; j < this.cols; j++) {
        this.gW[i * this.cols + j] += g * (this.lastX[j] ?? 0);
        dx[j] += g * this.W[i * this.cols + j]!;
      }
    }
    return dx;
  }
}

function fan(n: number, seed: number, fanIn: number): number[] {
  const out = new Array<number>(n);
  let a = seed >>> 0;
  const s = Math.sqrt(2 / Math.max(fanIn, 1));
  for (let i = 0; i < n; i++) {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    out[i] = ((((t ^ (t >>> 14)) >>> 0) / 4294967296) - 0.5) * 2 * s;
  }
  return out;
}

export class EssnNet {
  readonly genome: EssnGenome;
  readonly towers: Array<{ family: Family; layer: Linear }>;
  readonly fusion: Linear;
  readonly head: Linear;
  readonly inDim: number;
  stepCount = 0;

  constructor(genome: EssnGenome = seedGenome(), seed = 1) {
    this.genome = structuredClone(genome);
    const fams = enabledFamilies(this.genome).filter(
      (f) => !(f === "geometry" && this.genome.geometry.rank === 0),
    );
    this.towers = fams.map((f, i) => ({
      family: f,
      layer: new Linear(this.genome.towers[f].width, 4, seed + i + 1),
    }));
    this.inDim = this.towers.reduce((s, t) => s + t.layer.rows, 0);
    this.fusion = new Linear(this.genome.fusion.width, Math.max(this.inDim, 1), seed + 40);
    this.head = new Linear(5, this.genome.fusion.width, seed + 80);
  }

  private lastPre: number[] = [];
  private lastFusePre: number[] = [];
  private lastConcat: number[] = [];

  forward(fam: FamilyVec): number[] {
    const parts: number[] = [];
    this.lastPre = [];
    for (const t of this.towers) {
      const pre = t.layer.forward((fam[t.family] ?? [0, 0, 0, 0]).slice(0, 4));
      this.lastPre.push(...pre);
      parts.push(...pre.map(silu));
    }
    this.lastConcat = parts;
    const fusePre = this.fusion.forward(parts.length ? parts : [0]);
    this.lastFusePre = fusePre;
    const fused = fusePre.map(silu);
    return this.head.forward(fused);
  }

  pinballLoss(q: number[], y: number, taus: readonly number[]): number {
    return taus.reduce((s, tau, i) => s + pinball(y, q[i] ?? 0, tau), 0) / taus.length;
  }

  backwardFromPinball(q: number[], y: number, taus: readonly number[]): void {
    const dq = q.map((qi, i) => {
      const tau = taus[i] ?? 0.5;
      return qi >= y ? 1 - tau : -tau;
    });
    const scale = 1 / taus.length;
    const dfused = this.head.backward(dq.map((g) => g * scale));
    const dfusePre = dfused.map((g, i) => g * siluPrime(this.lastFusePre[i] ?? 0));
    const dcat = this.fusion.backward(dfusePre);
    let off = 0;
    for (const t of this.towers) {
      const w = t.layer.rows;
      const dhid = dcat.slice(off, off + w).map((g, i) => g * siluPrime(this.lastPre[off + i] ?? 0));
      t.layer.backward(dhid);
      off += w;
    }
  }

  zeroGrad(): void {
    for (const t of this.towers) t.layer.zero();
    this.fusion.zero();
    this.head.zero();
  }

  adamw(path: TrainPath): void {
    this.stepCount += 1;
    const t = this.stepCount;
    const layers = [...this.towers.map((x) => x.layer), this.fusion, this.head];
    for (const L of layers) {
      stepAdam(L.W, L.gW, L.mW, L.vW, path, t);
      stepAdam(L.b, L.gb, L.mb, L.vb, path, t);
    }
  }

  paramCount(): number {
    const layers = [...this.towers.map((x) => x.layer), this.fusion, this.head];
    return layers.reduce((s, L) => s + L.W.length + L.b.length, 0);
  }

  snapshot(): { hash: string; params: number } {
    const blob = {
      genome: this.genome,
      towers: this.towers.map((t) => ({ W: t.layer.W, b: t.layer.b })),
      fusion: { W: this.fusion.W, b: this.fusion.b },
      head: { W: this.head.W, b: this.head.b },
    };
    return { hash: contentHash(blob), params: this.paramCount() };
  }
}

function stepAdam(
  w: number[],
  g: number[],
  m: number[],
  v: number[],
  path: TrainPath,
  t: number,
): void {
  const b1 = 0.9;
  const b2 = 0.999;
  let n = 0;
  for (let i = 0; i < g.length; i++) n += g[i]! * g[i]!;
  const scale = Math.sqrt(n) > path.gradClip ? path.gradClip / Math.sqrt(n) : 1;
  for (let i = 0; i < w.length; i++) {
    const gi = g[i]! * scale;
    m[i] = b1 * m[i]! + (1 - b1) * gi;
    v[i] = b2 * v[i]! + (1 - b2) * gi * gi;
    const mh = m[i]! / (1 - b1 ** t);
    const vh = v[i]! / (1 - b2 ** t);
    w[i] = w[i]! - path.lr * (mh / (Math.sqrt(vh) + 1e-8) + path.weightDecay * w[i]!);
  }
}
