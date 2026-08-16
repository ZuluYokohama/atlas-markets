import {
  blackScholes,
  gauss,
  mean,
  mulberry32,
} from "./core";
import type {
  Contract,
  DayBar,
  MarketState,
  OptionRight,
  RegimeId,
  SemanticEvent,
  SplitBlock,
} from "./types";

export const UNDERLYING = "SPY";
export const N_DAYS = 520;
export const START = { y: 2024, m: 1, d: 2 };
export const SEED = 0x51f7a01d;

const REGIME_PLAN: Array<{ len: number; id: RegimeId; mu: number; vol: number }> =
  [
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

function addDays(y: number, m: number, d: number, n: number) {
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
}

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function isWeekend(y: number, m: number, d: number) {
  const dt = new Date(Date.UTC(y, m - 1, d));
  const w = dt.getUTCDay();
  return w === 0 || w === 6;
}

function iso(y: number, m: number, d: number) {
  return `${y}-${pad(m)}-${pad(d)}`;
}

export function tradingCalendar(n = N_DAYS): string[] {
  const out: string[] = [];
  let cur = { ...START };
  let guard = 0;
  while (out.length < n && guard < n * 4) {
    if (!isWeekend(cur.y, cur.m, cur.d)) out.push(iso(cur.y, cur.m, cur.d));
    cur = addDays(cur.y, cur.m, cur.d, 1);
    guard++;
  }
  return out;
}

function rsi(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50;
  let up = 0;
  let dn = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const ch = closes[i] - closes[i - 1];
    if (ch >= 0) up += ch;
    else dn -= ch;
  }
  if (dn === 0) return 100;
  const rs = up / dn;
  return 100 - 100 / (1 + rs);
}

function sma(xs: number[], p: number): number {
  if (xs.length < p) return xs[xs.length - 1] ?? 0;
  let s = 0;
  for (let i = xs.length - p; i < xs.length; i++) s += xs[i];
  return s / p;
}

function realizedVol(rets: number[], p = 20): number {
  const w = rets.slice(-p);
  if (w.length < 3) return 0.12;
  const m = mean(w);
  let s = 0;
  for (const r of w) s += (r - m) * (r - m);
  return Math.sqrt((s / w.length) * 252);
}

export interface Universe {
  days: DayBar[];
  events: SemanticEvent[];
  chains: Contract[][];
}

export function generateUniverse(seed = SEED): Universe {
  const rng = mulberry32(seed);
  const dates = tradingCalendar();
  const days: DayBar[] = [];
  const events: SemanticEvent[] = [];

  let spot = 478;
  let ivAtm = 0.145;
  let ofiMem = 0;
  const closes: number[] = [];
  const rets: number[] = [];
  const volumes: number[] = [];

  let cursor = 0;
  const regimeAt: RegimeId[] = [];
  for (const block of REGIME_PLAN) {
    for (let i = 0; i < block.len && cursor < dates.length; i++) {
      regimeAt[cursor] = block.id;
      cursor++;
    }
  }
  while (regimeAt.length < dates.length) regimeAt.push("range");

  const fomcIdx = [32, 74, 116, 158, 200, 242, 284, 326, 368, 410, 452, 494];
  const cpiIdx = [18, 40, 61, 82, 103, 124, 145, 166, 187, 208, 229, 250, 271, 292, 313, 334, 355, 376, 397, 418, 439, 460, 481, 502];
  const nfpIdx = [8, 30, 51, 72, 93, 114, 135, 156, 177, 198, 219, 240, 261, 282, 303, 324, 345, 366, 387, 408, 429, 450, 471, 492];
  for (const i of fomcIdx) {
    if (i < dates.length)
      events.push({
        id: `fomc-${i}`,
        dayIndex: i,
        label: "FOMC",
        kind: "fomc",
        knownAheadDays: 21,
      });
  }
  for (const i of cpiIdx) {
    if (i < dates.length)
      events.push({
        id: `cpi-${i}`,
        dayIndex: i,
        label: "CPI",
        kind: "cpi",
        knownAheadDays: 7,
      });
  }
  for (const i of nfpIdx) {
    if (i < dates.length)
      events.push({
        id: `nfp-${i}`,
        dayIndex: i,
        label: "NFP",
        kind: "nfp",
        knownAheadDays: 5,
      });
  }
  events.push({
    id: "shock-280",
    dayIndex: 280,
    label: "Vol shock",
    kind: "shock",
    knownAheadDays: 0,
  });

  for (let i = 0; i < dates.length; i++) {
    const plan =
      REGIME_PLAN.find((_, k) => {
        const start = REGIME_PLAN.slice(0, k).reduce((s, b) => s + b.len, 0);
        return i >= start && i < start + REGIME_PLAN[k].len;
      }) ?? REGIME_PLAN[REGIME_PLAN.length - 1];

    const evToday = events.filter((e) => e.dayIndex === i);
    const eventKick = evToday.some((e) => e.kind === "shock")
      ? 0.035
      : evToday.some((e) => e.kind === "fomc")
        ? 0.006
        : evToday.some((e) => e.kind === "cpi" || e.kind === "nfp")
          ? 0.003
          : 0;

    const z = gauss(rng);
    const jump = rng() < 0.018 ? gauss(rng) * 0.012 : 0;
    const ret = plan.mu + plan.vol * z + jump - eventKick * (rng() < 0.55 ? 1 : -0.4);
    const prev = spot;
    spot = Math.max(80, spot * (1 + ret));
    const high = Math.max(prev, spot) * (1 + Math.abs(gauss(rng)) * plan.vol * 0.45);
    const low = Math.min(prev, spot) * (1 - Math.abs(gauss(rng)) * plan.vol * 0.45);
    const open = prev * (1 + gauss(rng) * plan.vol * 0.25);
    const volBase = 82_000_000;
    const volume = Math.round(
      volBase *
        (0.7 + 0.9 * (plan.vol / 0.01) + Math.abs(ret) * 18 + rng() * 0.25),
    );

    closes.push(spot);
    rets.push(ret);
    volumes.push(volume);

    const rv20 = realizedVol(rets, 20);
    const targetIv = Math.min(0.62, Math.max(0.09, rv20 * 0.92 + plan.vol * 9.5 + eventKick * 4));
    ivAtm = ivAtm * 0.86 + targetIv * 0.14 + gauss(rng) * 0.004;
    ivAtm = Math.min(0.7, Math.max(0.085, ivAtm));

    const ivWindow = days.slice(-252).map((d) => d.ivAtm);
    ivWindow.push(ivAtm);
    const lo = Math.min(...ivWindow);
    const hi = Math.max(...ivWindow);
    const ivRank = hi > lo ? (ivAtm - lo) / (hi - lo) : 0.5;

    const skew = -0.07 - 0.18 * (ivAtm - 0.14) + gauss(rng) * 0.01;
    const term = 0.02 + 0.08 * Math.max(0, 0.18 - ivAtm) + gauss(rng) * 0.005;
    ofiMem = ofiMem * 0.6 + gauss(rng) * 0.35 + Math.sign(ret) * 0.15;
    const spreadBps = 1.1 + 18 * (ivAtm - 0.1) + (plan.id === "crisis" ? 6 : 0);
    const depth = 1.15 - 0.55 * (ivAtm - 0.1) + gauss(rng) * 0.05;
    const rsi14 = rsi(closes, 14);
    const s20 = sma(closes, 20);
    const s50 = sma(closes, 50);
    const ema12 = sma(closes, 12);
    const ema26 = sma(closes, 26);
    const macd = ema12 - ema26;
    const atr =
      days.length < 2
        ? spot * plan.vol
        : 0.7 * days[days.length - 1].atr +
          0.3 * Math.max(high - low, Math.abs(high - prev), Math.abs(low - prev));
    const vwap = 0.6 * s20 + 0.4 * ((open + high + low + spot) / 4);
    const vwapDev = (spot - vwap) / vwap;
    const relVol = volume / Math.max(1, sma(volumes, 20) || volume);

    let split: SplitBlock = "development";
    if (i >= 252 && i < 315) split = "quarantine";
    else if (i >= 315) split = "confirmation";

    const dt = new Date(dates[i] + "T00:00:00Z");
    days.push({
      index: i,
      date: dates[i],
      weekday: dt.getUTCDay(),
      split,
      regime: regimeAt[i],
      spot,
      open,
      high,
      low,
      close: spot,
      volume,
      ret1: ret,
      rv20,
      ivAtm,
      ivRank,
      skew,
      term,
      spreadBps,
      ofi: ofiMem,
      depth,
      rsi: rsi14,
      macd,
      atr,
      sma20: s20,
      sma50: s50,
      vwapDev,
      relVol,
    });
  }

  const chains = days.map((d) => buildChain(d));
  return { days, events, chains };
}

export const TENORS = [7, 21, 45, 90];
const SIGMA_GRID = [-2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2];

function surfaceIv(d: DayBar, logMny: number, tenorDays: number): number {
  const t = tenorDays / 365;
  const smile = 0.55 * logMny * logMny;
  return Math.max(
    0.06,
    d.ivAtm + d.skew * logMny + smile + d.term * (Math.sqrt(t) - Math.sqrt(21 / 365)),
  );
}

export function buildChain(d: DayBar): Contract[] {
  const out: Contract[] = [];
  for (const tenor of TENORS) {
    const t = tenor / 365;
    const fwd = d.spot * Math.exp((0.045 - 0.012) * t);
    for (const z of SIGMA_GRID) {
      const k = Math.round(fwd * Math.exp(z * d.ivAtm * Math.sqrt(t)));
      for (const right of ["call", "put"] as OptionRight[]) {
        const lm = Math.log(k / fwd);
        const iv = surfaceIv(d, lm, tenor);
        const g = blackScholes(d.spot, k, t, iv, 0.045, 0.012, right);
        const half = Math.max(0.02, g.price * (0.004 + d.spreadBps / 10_000));
        out.push({
          strike: k,
          tenorDays: tenor,
          right,
          iv,
          mid: g.price,
          bid: Math.max(0.01, g.price - half),
          ask: g.price + half,
          delta: g.delta,
          gamma: g.gamma,
          vega: g.vega,
          theta: g.theta,
        });
      }
    }
  }
  return out;
}

export function upcomingEvents(
  events: SemanticEvent[],
  dayIndex: number,
  look = 10,
): SemanticEvent[] {
  return events.filter(
    (e) =>
      e.dayIndex >= dayIndex &&
      e.dayIndex <= dayIndex + look &&
      e.dayIndex - dayIndex <= e.knownAheadDays,
  );
}

export function encodeState(
  days: DayBar[],
  events: SemanticEvent[],
  i: number,
): MarketState {
  const d = days[i];
  const known = upcomingEvents(events, i, 15);
  const price = [
    d.ret1,
    (d.spot - d.sma20) / Math.max(d.sma20, 1e-6),
    (d.sma20 - d.sma50) / Math.max(d.sma50, 1e-6),
    d.vwapDev,
  ];
  const technical = [
    (d.rsi - 50) / 50,
    d.macd / Math.max(d.spot * 0.01, 1e-6),
    d.atr / d.spot,
    d.relVol - 1,
  ];
  const micro = [d.ofi, d.spreadBps / 20, d.depth - 1, d.volume / 1e8 - 0.8];
  const surface = [d.ivAtm, d.ivRank * 2 - 1, d.skew, d.ivAtm - d.rv20, d.term];
  const calendar = [
    d.weekday / 4 - 0.75,
    i % 21 < 2 ? 1 : 0,
    known.some((e) => e.kind === "fomc") ? 1 : 0,
    known.some((e) => e.kind === "cpi" || e.kind === "nfp") ? 1 : 0,
  ];
  const semantic = [
    known.some((e) => e.kind === "fomc") ? 1 : 0,
    known.some((e) => e.kind === "cpi") ? 1 : 0,
    known.some((e) => e.kind === "nfp") ? 1 : 0,
    known.some((e) => e.kind === "shock") ? 1 : 0,
  ];
  return {
    price,
    technical,
    micro,
    surface,
    calendar,
    semantic,
    labels: [
      "ret1",
      "vsSMA20",
      "trend",
      "vwap",
      "rsi",
      "macd",
      "atr",
      "relVol",
      "ofi",
      "spread",
      "depth",
      "vol",
      "iv",
      "ivRank",
      "skew",
      "iv-rv",
      "term",
      "dow",
      "opex",
      "fomcSoon",
      "macroSoon",
      "fomc",
      "cpi",
      "nfp",
      "shock",
    ],
  };
}

export function flattenState(s: MarketState): number[] {
  return [
    ...s.price,
    ...s.technical,
    ...s.micro,
    ...s.surface,
    ...s.calendar,
    ...s.semantic,
  ];
}

export const FAMILY_SLICES = {
  price: [0, 4],
  technical: [4, 8],
  micro: [8, 12],
  surface: [12, 17],
  calendar: [17, 21],
  semantic: [21, 25],
} as const;

export function featureNames(): string[] {
  return [
    "return",
    "vs SMA20",
    "trend 20/50",
    "VWAP dev",
    "RSI",
    "MACD",
    "ATR",
    "rel volume",
    "OFI",
    "spread",
    "depth",
    "volume",
    "IV ATM",
    "IV rank",
    "skew",
    "IV − RV",
    "term",
    "weekday",
    "opex week",
    "FOMC soon",
    "macro soon",
    "FOMC flag",
    "CPI flag",
    "NFP flag",
    "shock flag",
  ];
}
