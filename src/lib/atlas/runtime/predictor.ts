import { contentHash } from "../hash.ts";
import { CHAMPION_ID, type QuantileHead } from "./commit.ts";

const H = 8;
const F = 4;

/** Seeded tiny recurrent head. Not ESSN. Not trained. Not a judge. */
export class StubRecurrentPredictor {
  readonly id = CHAMPION_ID;
  readonly modelHash: string;
  private h = new Float64Array(H);
  private readonly W: Float64Array;
  private readonly U: Float64Array;
  private readonly b: Float64Array;
  private readonly Ho: Float64Array;

  constructor(seed = 0x52745542) {
    this.W = randn(F * H, seed);
    this.U = randn(H * H, seed + 1);
    this.b = randn(H, seed + 2);
    this.Ho = randn(H * 5, seed + 3);
    this.modelHash = contentHash({
      id: this.id,
      W: Array.from(this.W),
      U: Array.from(this.U),
      b: Array.from(this.b),
      Ho: Array.from(this.Ho),
    });
  }

  reset(): void {
    this.h.fill(0);
  }

  /** No score / fit / judge methods exist on this class. */
  predict(features: ArrayLike<number>): { quantiles: QuantileHead; ood: number; hidden: number[] } {
    if (features.length < F) throw new Error("FEAT_DIM");
    const nh = new Float64Array(H);
    for (let i = 0; i < H; i++) {
      let a = this.b[i]!;
      for (let j = 0; j < F; j++) a += this.W[i * F + j]! * features[j]!;
      for (let j = 0; j < H; j++) a += this.U[i * H + j]! * this.h[j]!;
      nh[i] = Math.tanh(a);
    }
    this.h.set(nh);
    const raw = [0, 0, 0, 0, 0];
    for (let k = 0; k < 5; k++) {
      let s = 0;
      for (let i = 0; i < H; i++) s += this.Ho[k * H + i]! * nh[i]!;
      raw[k] = s * 0.02;
    }
    raw.sort((a, b) => a - b);
    const ood = Math.hypot(features[0] ?? 0, features[2] ?? 0);
    return {
      quantiles: { q05: raw[0]!, q25: raw[1]!, q50: raw[2]!, q75: raw[3]!, q95: raw[4]! },
      ood,
      hidden: Array.from(nh),
    };
  }
}

function randn(n: number, seed: number): Float64Array {
  const out = new Float64Array(n);
  let a = seed >>> 0;
  for (let i = 0; i < n; i++) {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    const u = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    a = (a + 0x6d2b79f5) | 0;
    t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    const v = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    out[i] = Math.sqrt(-2 * Math.log(Math.max(u, 1e-12))) * Math.cos(2 * Math.PI * v) * 0.15;
  }
  return out;
}
