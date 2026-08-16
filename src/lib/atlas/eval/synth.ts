import { F0_SEED, N_DAYS, SPLIT, assertNotConfirmation } from "./splits.ts";

export type RegimeId = "grind" | "meltup" | "correction" | "crisis" | "range" | "recovery";

export interface SynthDay {
  index: number;
  date: string;
  regime: RegimeId;
  split: "development" | "quarantine" | "confirmation";
  spot: number;
  ret1: number;
  rv20: number;
  ivAtm: number;
  skew: number;
}

const REGIME_PLAN: Array<{ len: number; id: RegimeId; mu: number; vol: number }> = [
  { len: 62, id: "grind", mu: 0.00035, vol: 0.0075 },
  { len: 38, id: "correction", mu: -0.0014, vol: 0.016 },
  { len: 54, id: "recovery", mu: 0.0007, vol: 0.0105 },
  { len: 48, id: "meltup", mu: 0.0011, vol: 0.008 },
  { len: 50, id: "range", mu: 0.00005, vol: 0.009 },
  { len: 42, id: "crisis", mu: -0.0021, vol: 0.022 },
  { len: 70, id: "recovery", mu: 0.00085, vol: 0.011 },
  { len: 56, id: "grind", mu: 0.0004, vol: 0.0078 },
  { len: 100, id: "range", mu: 0.00012, vol: 0.0094 },
];

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gauss(rng: () => number) {
  const u = Math.max(1e-12, rng());
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function splitOf(i: number): SynthDay["split"] {
  if (i <= SPLIT.development.hi) return "development";
  if (i <= SPLIT.quarantine.hi) return "quarantine";
  return "confirmation";
}

export function generateF0Universe(seed = F0_SEED): SynthDay[] {
  const rng = mulberry32(seed);
  const regimes: RegimeId[] = [];
  const params: Array<{ mu: number; vol: number }> = [];
  for (const b of REGIME_PLAN) {
    for (let k = 0; k < b.len && regimes.length < N_DAYS; k++) {
      regimes.push(b.id);
      params.push({ mu: b.mu, vol: b.vol });
    }
  }
  while (regimes.length < N_DAYS) {
    regimes.push("range");
    params.push({ mu: 0.00012, vol: 0.0094 });
  }

  const days: SynthDay[] = [];
  let spot = 478;
  let iv = 0.145;
  const rets: number[] = [];
  const start = Date.UTC(2024, 0, 2);
  let cursor = 0;
  while (days.length < N_DAYS) {
    const dt = new Date(start + cursor * 86400000);
    cursor++;
    const dow = dt.getUTCDay();
    if (dow === 0 || dow === 6) continue;
    const i = days.length;
    const { mu, vol } = params[i];
    const r = mu + vol * gauss(rng);
    spot = Math.max(50, spot * (1 + r));
    rets.push(r);
    iv = Math.min(0.8, Math.max(0.08, iv + 0.15 * (vol * Math.sqrt(252) - iv) + 0.01 * gauss(rng)));
    const w = rets.slice(-20);
    const m = w.reduce((s, x) => s + x, 0) / w.length;
    const rv =
      w.length < 5 ? iv : Math.sqrt((w.reduce((s, x) => s + (x - m) * (x - m), 0) / w.length) * 252);
    const iso = dt.toISOString().slice(0, 10);
    days.push({
      index: i,
      date: iso,
      regime: regimes[i],
      split: splitOf(i),
      spot,
      ret1: r,
      rv20: rv,
      ivAtm: iv,
      skew: 0.04 + 0.02 * gauss(rng),
    });
  }
  return days;
}

export function developmentDays(days: SynthDay[]): SynthDay[] {
  return days.filter((d) => {
    if (d.split === "confirmation") return false;
    assertNotConfirmation(d.index);
    return d.split === "development";
  });
}
