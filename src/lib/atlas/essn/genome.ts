export const FAMILIES = [
  "price",
  "momentum",
  "volatility",
  "activity",
  "surface",
  "context",
  "geometry",
] as const;

export type Family = (typeof FAMILIES)[number];

export interface TowerGene {
  enabled: boolean;
  width: number;
}

export interface EssnGenome {
  protocol: "ESSN-SEED-v0";
  towers: Record<Family, TowerGene>;
  temporal: { hidden: number; lookback: number };
  position: { enabled: boolean; width: number };
  geometry: { rank: number };
  fusion: { width: number; topK: number };
  experts: { count: number; hidden: number; topK: number };
  adapters: { rank: number };
}

export const WIDTH_STEP = 8;
export const WIDTH_MIN = 8;
export const WIDTH_MAX = 48;

export function seedGenome(): EssnGenome {
  const tower = (on: boolean, w = 8): TowerGene => ({ enabled: on, width: w });
  return {
    protocol: "ESSN-SEED-v0",
    towers: {
      price: tower(true),
      momentum: tower(true),
      volatility: tower(true),
      activity: tower(false),
      surface: tower(true),
      context: tower(false),
      geometry: tower(false),
    },
    temporal: { hidden: 8, lookback: 32 },
    position: { enabled: true, width: 8 },
    geometry: { rank: 0 },
    fusion: { width: 16, topK: 2 },
    experts: { count: 2, hidden: 8, topK: 2 },
    adapters: { rank: 0 },
  };
}

export function clampWidth(w: number): number {
  const stepped = Math.round(w / WIDTH_STEP) * WIDTH_STEP;
  return Math.min(WIDTH_MAX, Math.max(WIDTH_MIN, stepped));
}

export function mutateGenome(g: EssnGenome, rng: () => number): EssnGenome {
  const next: EssnGenome = structuredClone(g);
  const roll = rng();
  if (roll < 0.25) {
    const f = FAMILIES[Math.floor(rng() * FAMILIES.length)]!;
    next.towers[f].enabled = !next.towers[f].enabled;
  } else if (roll < 0.45) {
    const f = FAMILIES[Math.floor(rng() * FAMILIES.length)]!;
    next.towers[f].width = clampWidth(next.towers[f].width + (rng() < 0.5 ? -WIDTH_STEP : WIDTH_STEP));
  } else if (roll < 0.6) {
    next.geometry.rank = rng() < 0.5 ? 0 : 8;
    next.towers.geometry.enabled = next.geometry.rank > 0;
  } else if (roll < 0.75) {
    next.experts.count = next.experts.count === 2 ? 3 : 2;
  } else if (roll < 0.9) {
    next.fusion.topK = next.fusion.topK === 2 ? 3 : 2;
  } else {
    next.adapters.rank = next.adapters.rank === 0 ? 4 : 0;
  }
  return next;
}

export function crossover(a: EssnGenome, b: EssnGenome, rng: () => number): EssnGenome {
  const child = structuredClone(a);
  child.temporal = rng() < 0.5 ? structuredClone(a.temporal) : structuredClone(b.temporal);
  child.position = rng() < 0.5 ? structuredClone(a.position) : structuredClone(b.position);
  child.geometry = rng() < 0.5 ? structuredClone(a.geometry) : structuredClone(b.geometry);
  child.experts = rng() < 0.5 ? structuredClone(a.experts) : structuredClone(b.experts);
  child.fusion = rng() < 0.5 ? structuredClone(a.fusion) : structuredClone(b.fusion);
  return child;
}

export function enabledFamilies(g: EssnGenome): Family[] {
  return FAMILIES.filter((f) => g.towers[f].enabled);
}

export function paramCeiling(g: EssnGenome): number {
  let n = 0;
  for (const f of FAMILIES) {
    if (!g.towers[f].enabled) continue;
    n += 4 * g.towers[f].width + g.towers[f].width * g.temporal.hidden * 6;
  }
  n += g.fusion.width * g.experts.count * g.experts.hidden;
  n += g.experts.count * g.experts.hidden * 5;
  return n;
}
