export const F0_PROTOCOL_ID = "F0-position-state-vs-baselines-v0";
export const F0_SEED = 0x51f7a01d;
export const N_DAYS = 520;

export const SPLIT = {
  development: { lo: 0, hi: 251 },
  quarantine: { lo: 252, hi: 314 },
  confirmation: { lo: 315, hi: 519 },
} as const;

export const F0_WINDOWS = {
  W1: { lo: 80, hi: 160 },
  W2: { lo: 170, hi: 240 },
} as const;

export const PURGE = 6;
export const LOOKBACK = 21;
export const HORIZON = 5;
export const MIN_EFFECT = 0.03;
export const MIN_NEFF = 8;

export function assertNotConfirmation(index: number): void {
  if (index >= SPLIT.confirmation.lo) {
    throw new Error(`CONFIRMATION_QUARANTINE: index ${index} is closed for ${F0_PROTOCOL_ID}`);
  }
}

export function inRange(i: number, lo: number, hi: number): boolean {
  return i >= lo && i <= hi;
}

export function eligiblePast(query: number): number[] {
  assertNotConfirmation(query);
  const out: number[] = [];
  const last = query - PURGE - HORIZON;
  for (let i = LOOKBACK; i <= last; i++) {
    if (i > SPLIT.development.hi) break;
    assertNotConfirmation(i);
    out.push(i);
  }
  return out;
}
