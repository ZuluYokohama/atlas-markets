import { pinball } from "../eval/metrics.ts";
import { crossover, enabledFamilies, mutateGenome, paramCeiling, seedGenome, type EssnGenome } from "./genome.ts";
import { EssnSeed, type FamilyVec } from "./model.ts";

export interface Trial {
  id: string;
  genome: EssnGenome;
  pinball: number;
  params: number;
  volEnabled: boolean;
  generation: number;
}

export interface StageAReport {
  protocol: "ESSN-SEED-v0";
  stage: "A-synthetic";
  confirmationOpened: false;
  marketEvolution: false;
  trials: Trial[];
  best: Trial;
  volOnBeatsVolOff: boolean;
  claim: "CERTIFIED_SYNTHETIC_LEARNABILITY" | "UNSUPPORTED";
}

function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function planted(n: number, seed: number): Array<{ fam: FamilyVec; pos: number[]; y: number }> {
  const rng = mulberry(seed);
  const rows = [];
  for (let i = 0; i < n; i++) {
    const vol0 = rng() * 2 - 0.2;
    const fam: FamilyVec = {
      price: [rng() - 0.5, rng(), 0, 0],
      momentum: [rng() - 0.5, 0, 0, 0],
      volatility: [vol0, Math.abs(vol0), 0, 0],
      activity: [rng(), 0, 0, 0],
      surface: [rng() * 0.2, 0, 0, 0],
      context: [0, 0, 0, 0],
      geometry: [rng(), rng(), 0, 0],
    };
    const y = 1.8 * vol0 + 0.15 * (rng() - 0.5);
    rows.push({ fam, pos: [0.1, 0, 0, 0, 0, 0, 0, 0], y });
  }
  return rows;
}

/** Closed-form mean head on enabled raw features (module weights). */
function fitScore(
  g: EssnGenome,
  train: ReturnType<typeof planted>,
  test: ReturnType<typeof planted>,
): number {
  const design = (rows: ReturnType<typeof planted>) => {
    const cols: number[][] = [];
    const ys: number[] = [];
    for (const r of rows) {
      const v: number[] = [1];
      for (const f of enabledFamilies(g)) {
        if (f === "geometry" && g.geometry.rank === 0) continue;
        v.push(...(r.fam[f] ?? [0, 0, 0, 0]).slice(0, 4));
      }
      cols.push(v);
      ys.push(r.y);
    }
    return { cols, ys };
  };
  const tr = design(train);
  const p = tr.cols[0]?.length ?? 1;
  const xtx: number[][] = Array.from({ length: p }, () => new Array(p).fill(0));
  const xty = new Array(p).fill(0);
  for (let n = 0; n < tr.cols.length; n++) {
    const x = tr.cols[n]!;
    for (let i = 0; i < p; i++) {
      xty[i] += x[i]! * tr.ys[n]!;
      for (let j = 0; j < p; j++) xtx[i]![j] += x[i]! * x[j]!;
    }
  }
  for (let i = 0; i < p; i++) xtx[i]![i] += 1e-2;
  const beta = solve(xtx, xty);
  const te = design(test);
  let s = 0;
  for (let n = 0; n < te.cols.length; n++) {
    const yhat = te.cols[n]!.reduce((a, v, i) => a + v * (beta[i] ?? 0), 0);
    s += pinball(te.ys[n]!, yhat, 0.5);
  }
  return s / Math.max(te.ys.length, 1);
}

function solve(A: number[][], b: number[]): number[] {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]!]);
  for (let i = 0; i < n; i++) {
    let piv = i;
    for (let r = i + 1; r < n; r++) if (Math.abs(M[r]![i]!) > Math.abs(M[piv]![i]!)) piv = r;
    [M[i], M[piv]] = [M[piv]!, M[i]!];
    const d = M[i]![i] || 1e-12;
    for (let j = i; j <= n; j++) M[i]![j] /= d;
    for (let r = 0; r < n; r++) {
      if (r === i) continue;
      const f = M[r]![i]!;
      for (let j = i; j <= n; j++) M[r]![j] -= f * M[i]![j]!;
    }
  }
  return M.map((row) => row[n]!);
}

export function runStageA(seed = 0x41535441): StageAReport {
  const rng = mulberry(seed);
  const train = planted(96, seed + 1);
  const test = planted(48, seed + 2);
  const trials: Trial[] = [];
  let pop: EssnGenome[] = [seedGenome()];
  const off = seedGenome();
  off.towers.volatility.enabled = false;
  pop.push(off);
  while (pop.length < 6) pop.push(mutateGenome(seedGenome(), rng));

  for (let gen = 0; gen < 4; gen++) {
    const scored = pop.map((g, i) => {
      const t: Trial = {
        id: `A${gen}-${i}`,
        genome: g,
        pinball: fitScore(g, train, test),
        params: paramCeiling(g),
        volEnabled: g.towers.volatility.enabled,
        generation: gen,
      };
      return t;
    });
    trials.push(...scored);
    scored.sort((a, b) => a.pinball - b.pinball || a.params - b.params);
    const elites = scored.slice(0, 2).map((t) => t.genome);
    pop = [...elites];
    while (pop.length < 6) {
      const child =
        rng() < 0.3 ? crossover(elites[0]!, elites[1] ?? elites[0]!, rng) : mutateGenome(elites[0]!, rng);
      pop.push(child);
    }
  }

  const volOn = trials.filter((t) => t.volEnabled).sort((a, b) => a.pinball - b.pinball)[0];
  const volOff = trials.filter((t) => !t.volEnabled).sort((a, b) => a.pinball - b.pinball)[0];
  const best = [...trials].sort((a, b) => a.pinball - b.pinball)[0]!;
  const volOnBeatsVolOff = !!volOn && !!volOff && volOn.pinball < volOff.pinball * 0.85;

  return {
    protocol: "ESSN-SEED-v0",
    stage: "A-synthetic",
    confirmationOpened: false,
    marketEvolution: false,
    trials,
    best,
    volOnBeatsVolOff,
    claim: volOnBeatsVolOff ? "CERTIFIED_SYNTHETIC_LEARNABILITY" : "UNSUPPORTED",
  };
}

/** Forward exists so the sealed runtime can host an ESSN without self-scoring. */
export function essnPredict(g: EssnGenome, fam: FamilyVec, pos: number[]) {
  return new EssnSeed(g).forward(fam, pos);
}
