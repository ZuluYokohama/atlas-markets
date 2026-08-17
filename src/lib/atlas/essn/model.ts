import { contentHash } from "../hash.ts";
import { layerNorm, matvec, seedWeights, silu, topkSoftmax } from "./ops.ts";
import { FAMILIES, enabledFamilies, type EssnGenome, type Family } from "./genome.ts";

export type FamilyVec = Record<Family, number[]>;

export interface EssnForward {
  quantiles: { q05: number; q25: number; q50: number; q75: number; q95: number };
  alphas: Record<string, number>;
  expertMix: number[];
  abstain: boolean;
}

/** Seeded ESSN forward. Weights are module-local; evolution does not touch them. */
export class EssnSeed {
  readonly genome: EssnGenome;
  readonly weightHash: string;
  private readonly proj: Partial<Record<Family, number[]>> = {};

  constructor(genome: EssnGenome, seed = 0x4553534e) {
    this.genome = structuredClone(genome);
    let s = seed;
    for (const f of enabledFamilies(genome)) {
      const w = genome.towers[f].width;
      this.proj[f] = seedWeights(w * 4 + w, s++);
    }
    this.weightHash = contentHash({ genome: this.genome, seed });
  }

  forward(families: FamilyVec, position: number[]): EssnForward {
    const g = this.genome;
    const zs: number[][] = [];
    const names: string[] = [];
    for (const f of FAMILIES) {
      if (!g.towers[f].enabled) continue;
      if (f === "geometry" && g.geometry.rank === 0) continue;
      const x = families[f] ?? [0, 0, 0, 0];
      const W = this.proj[f] ?? [];
      const width = g.towers[f].width;
      const hidden = matvec(W, pad4(x), width, 4, W.slice(width * 4));
      zs.push(layerNorm(hidden.map(silu)));
      names.push(f);
    }
    if (g.position.enabled) {
      zs.push(layerNorm(padTo(position, g.position.width).map(silu)));
      names.push("position");
    }
    const logits = zs.map((z) => z.reduce((s, v) => s + v, 0) / Math.max(z.length, 1));
    const alpha = topkSoftmax(logits, g.fusion.topK);
    const fused = new Array(g.fusion.width).fill(0);
    zs.forEach((z, i) => {
      for (let j = 0; j < fused.length; j++) fused[j] += alpha[i]! * (z[j % z.length] ?? 0);
    });
    const mix = topkSoftmax(
      fused.slice(0, g.experts.count).map((v, i) => v + i * 0.01),
      g.experts.topK,
    );
    const head = fused.slice(0, 5);
    while (head.length < 5) head.push(0);
    const q = [...head].map((v, i) => v * 0.05 + (i - 2) * 0.01);
    q.sort((a, b) => a - b);
    const alphas: Record<string, number> = {};
    names.forEach((n, i) => {
      alphas[n] = alpha[i] ?? 0;
    });
    const energy = fused.reduce((s, v) => s + v * v, 0);
    return {
      quantiles: { q05: q[0]!, q25: q[1]!, q50: q[2]!, q75: q[3]!, q95: q[4]! },
      alphas,
      expertMix: mix,
      abstain: energy < 1e-8,
    };
  }
}

function pad4(x: number[]): number[] {
  const y = [0, 0, 0, 0];
  for (let i = 0; i < 4; i++) y[i] = x[i] ?? 0;
  return y;
}

function padTo(x: number[], n: number): number[] {
  const y = new Array(n).fill(0);
  for (let i = 0; i < n; i++) y[i] = x[i] ?? 0;
  return y;
}
