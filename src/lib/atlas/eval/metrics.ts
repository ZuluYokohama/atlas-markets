export const TAUS = [0.1, 0.5, 0.9] as const;

export function quantile(xs: number[], tau: number): number {
  if (xs.length === 0) return Number.NaN;
  const s = [...xs].sort((a, b) => a - b);
  const idx = Math.min(s.length - 1, Math.max(0, Math.floor(tau * (s.length - 1))));
  return s[idx];
}

export function pinball(y: number, q: number, tau: number): number {
  const d = y - q;
  return d * (tau - (d < 0 ? 1 : 0));
}

export function meanPinball(ys: number[], qs: Array<{ q10: number; q50: number; q90: number }>): number {
  let s = 0;
  for (let i = 0; i < ys.length; i++) {
    s += pinball(ys[i], qs[i].q10, 0.1);
    s += pinball(ys[i], qs[i].q50, 0.5);
    s += pinball(ys[i], qs[i].q90, 0.9);
  }
  return s / (ys.length * 3);
}

export function intervalCoverage(ys: number[], qs: Array<{ q10: number; q90: number }>): number {
  let c = 0;
  for (let i = 0; i < ys.length; i++) if (ys[i] >= qs[i].q10 && ys[i] <= qs[i].q90) c++;
  return ys.length ? c / ys.length : 0;
}

export function brier(hits: number[], p: number[]): number {
  let s = 0;
  for (let i = 0; i < hits.length; i++) s += (p[i] - hits[i]) ** 2;
  return hits.length ? s / hits.length : 0;
}

export function crpsProxy(ys: number[], qs: Array<{ q10: number; q50: number; q90: number }>): number {
  return meanPinball(ys, qs);
}

export interface QuantileForecast {
  q10: number;
  q50: number;
  q90: number;
}

export function fromSample(ys: number[]): QuantileForecast {
  return { q10: quantile(ys, 0.1), q50: quantile(ys, 0.5), q90: quantile(ys, 0.9) };
}
