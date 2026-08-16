import { blackScholes, impliedFromDelta, shaLike } from "./core";
import { type Universe } from "./market";

import type {
  Contract,
  DayBar,
  HorizonId,
  Leg,
  OptionRight,
  PositionGreeks,
  PositionTemplate,
  QuotedLeg,
  Side,
  TransportMode,
} from "./types";

export const HORIZON_DAYS: Record<HorizonId, number> = {
  "1d": 1,
  "5d": 5,
  "21d": 21,
};

let seq = 1;
function lid() {
  return `L${seq++}`;
}

export const TEMPLATES: PositionTemplate[] = [
  {
    id: "long-call",
    name: "Long call",
    family: "directional",
    blurb: "ATM 21-DTE call. Pure upside, defined debit.",
    build: (spot, iv, day) => [
      {
        id: lid(),
        right: "call",
        side: "buy",
        qty: 1,
        strike: Math.round(spot),
        tenorDays: 21,
        expiryIndex: day + 21,
      },
    ],
  },
  {
    id: "long-put",
    name: "Long put",
    family: "directional",
    blurb: "ATM 21-DTE put. Crash convexity, defined debit.",
    build: (spot, iv, day) => [
      {
        id: lid(),
        right: "put",
        side: "buy",
        qty: 1,
        strike: Math.round(spot),
        tenorDays: 21,
        expiryIndex: day + 21,
      },
    ],
  },
  {
    id: "bull-call",
    name: "Bull call vertical",
    family: "vertical",
    blurb: "Debit call spread, 21 DTE, 25–40 delta.",
    build: (spot, iv, day) => {
      const t = 21 / 365;
      const k1 = Math.round(impliedFromDelta(spot, t, iv, 0.4, "call"));
      const k2 = Math.round(impliedFromDelta(spot, t, iv, 0.22, "call"));
      return [
        { id: lid(), right: "call", side: "buy", qty: 1, strike: k1, tenorDays: 21, expiryIndex: day + 21 },
        { id: lid(), right: "call", side: "sell", qty: 1, strike: Math.max(k1 + 1, k2), tenorDays: 21, expiryIndex: day + 21 },
      ];
    },
  },
  {
    id: "put-credit",
    name: "Bull put credit",
    family: "vertical",
    blurb: "Short put vertical around 20-delta. Credit, defined risk.",
    build: (spot, iv, day) => {
      const t = 21 / 365;
      const kShort = Math.round(impliedFromDelta(spot, t, iv, 0.2, "put"));
      const kLong = Math.round(kShort * 0.97);
      return [
        { id: lid(), right: "put", side: "sell", qty: 1, strike: kShort, tenorDays: 21, expiryIndex: day + 21 },
        { id: lid(), right: "put", side: "buy", qty: 1, strike: Math.min(kShort - 1, kLong), tenorDays: 21, expiryIndex: day + 21 },
      ];
    },
  },
  {
    id: "straddle",
    name: "Long straddle",
    family: "vol",
    blurb: "ATM call + put, 30 DTE. Long gamma / vega.",
    build: (spot, _iv, day) => {
      const k = Math.round(spot);
      return [
        { id: lid(), right: "call", side: "buy", qty: 1, strike: k, tenorDays: 30, expiryIndex: day + 30 },
        { id: lid(), right: "put", side: "buy", qty: 1, strike: k, tenorDays: 30, expiryIndex: day + 30 },
      ];
    },
  },
  {
    id: "iron-condor",
    name: "Iron condor",
    family: "income",
    blurb: "16-delta short wings, 21 DTE. Short vol, defined risk.",
    build: (spot, iv, day) => {
      const t = 21 / 365;
      const cs = Math.round(impliedFromDelta(spot, t, iv, 0.16, "call"));
      const ps = Math.round(impliedFromDelta(spot, t, iv, 0.16, "put"));
      const wing = Math.max(5, Math.round(spot * 0.02));
      return [
        { id: lid(), right: "put", side: "buy", qty: 1, strike: ps - wing, tenorDays: 21, expiryIndex: day + 21 },
        { id: lid(), right: "put", side: "sell", qty: 1, strike: ps, tenorDays: 21, expiryIndex: day + 21 },
        { id: lid(), right: "call", side: "sell", qty: 1, strike: cs, tenorDays: 21, expiryIndex: day + 21 },
        { id: lid(), right: "call", side: "buy", qty: 1, strike: cs + wing, tenorDays: 21, expiryIndex: day + 21 },
      ];
    },
  },
  {
    id: "risk-reversal",
    name: "Risk reversal",
    family: "skew",
    blurb: "Long 25d call, short 25d put. Skew / directional.",
    build: (spot, iv, day) => {
      const t = 21 / 365;
      const kc = Math.round(impliedFromDelta(spot, t, iv, 0.25, "call"));
      const kp = Math.round(impliedFromDelta(spot, t, iv, 0.25, "put"));
      return [
        { id: lid(), right: "call", side: "buy", qty: 1, strike: kc, tenorDays: 21, expiryIndex: day + 21 },
        { id: lid(), right: "put", side: "sell", qty: 1, strike: kp, tenorDays: 21, expiryIndex: day + 21 },
      ];
    },
  },
];

export function templateById(id: string): PositionTemplate {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[5];
}

export function signedQty(leg: { side: Side; qty: number }): number {
  return (leg.side === "buy" ? 1 : -1) * leg.qty;
}

function nearestContract(
  chain: Contract[],
  right: OptionRight,
  strike: number,
  tenor: number,
): Contract | null {
  let best: Contract | null = null;
  let bestD = Infinity;
  for (const c of chain) {
    if (c.right !== right) continue;
    const d =
      4 * ((c.tenorDays - tenor) / 30) ** 2 +
      ((c.strike - strike) / Math.max(strike, 1)) ** 2 * 80;
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return best;
}

export function quoteLegs(
  legs: Leg[],
  day: DayBar,
  chain: Contract[],
): QuotedLeg[] {
  return legs.map((leg) => {
    const c = nearestContract(chain, leg.right, leg.strike, leg.tenorDays);
    const tenor = Math.max(1, (leg.expiryIndex - day.index) || leg.tenorDays);
    const t = tenor / 365;
    const iv = c?.iv ?? day.ivAtm;
    const k = c?.strike ?? leg.strike;
    const g = blackScholes(day.spot, k, t, iv, 0.045, 0.012, leg.right);
    const half = c ? (c.ask - c.bid) / 2 : g.price * 0.01;
    const fwd = day.spot * Math.exp((0.045 - 0.012) * t);
    return {
      ...leg,
      strike: k,
      tenorDays: tenor,
      iv,
      mid: g.price,
      bid: Math.max(0.01, g.price - half),
      ask: g.price + half,
      delta: g.delta,
      gamma: g.gamma,
      vega: g.vega,
      theta: g.theta,
      spread: half * 2,
      logMoneyness: Math.log(k / fwd),
      contractDelta: g.delta,
    };
  });
}

export function summarize(legs: QuotedLeg[]): PositionGreeks {
  let delta = 0;
  let gamma = 0;
  let vega = 0;
  let theta = 0;
  let debit = 0;
  let credit = 0;
  let liq = 0;
  let minK = Infinity;
  let maxK = -Infinity;
  for (const l of legs) {
    const q = signedQty(l) * 100;
    delta += l.delta * q;
    gamma += l.gamma * q;
    vega += l.vega * q;
    theta += l.theta * q;
    const px = l.side === "buy" ? l.ask : l.bid;
    const cash = px * l.qty * 100;
    if (l.side === "buy") debit += cash;
    else credit += cash;
    liq += l.spread * l.qty * 100;
    minK = Math.min(minK, l.strike);
    maxK = Math.max(maxK, l.strike);
  }
  return {
    delta,
    gamma,
    vega,
    theta,
    debit,
    credit,
    width: Number.isFinite(minK) ? maxK - minK : 0,
    liquidityBurden: liq,
  };
}

export function markValue(legs: QuotedLeg[]): number {
  let v = 0;
  for (const l of legs) v += signedQty(l) * l.mid * 100;
  return v;
}

export function scenarioPayoff(
  legs: QuotedLeg[],
  spots: number[],
  ivMult = 1,
  day: DayBar,
): number[] {
  return spots.map((s) => {
    let pnl = 0;
    for (const l of legs) {
      const t = Math.max(l.tenorDays, 1) / 365;
      const g = blackScholes(s, l.strike, t, l.iv * ivMult, 0.045, 0.012, l.right);
      pnl += signedQty(l) * (g.price - l.mid) * 100;
    }
    return pnl;
  });
}

export function expirationPayoff(legs: QuotedLeg[], spots: number[]): number[] {
  return spots.map((s) => {
    let v = 0;
    for (const l of legs) {
      const intrinsic =
        l.right === "call" ? Math.max(0, s - l.strike) : Math.max(0, l.strike - s);
      v += signedQty(l) * (intrinsic - l.mid) * 100;
    }
    return v;
  });
}

export interface TransportResult {
  legs: QuotedLeg[];
  residual: number;
  mode: TransportMode;
  valid: boolean;
  note: string;
}

export function transportPosition(
  source: QuotedLeg[],
  targetDay: DayBar,
  targetChain: Contract[],
  mode: TransportMode,
  residualMax = 0.35,
): TransportResult {
  if (mode === "contract") {
    const quoted = quoteLegs(source, targetDay, targetChain);
    return {
      legs: quoted,
      residual: 0.05,
      mode,
      valid: true,
      note: "Same economic template, live chain marks.",
    };
  }

  if (mode === "template" || mode === "exposure") {
    const mapped: Leg[] = source.map((l) => {
      const desiredLm = l.logMoneyness;
      const desiredTau = l.tenorDays;
      let best: Contract | null = null;
      let bestD = Infinity;
      for (const c of targetChain) {
        if (c.right !== l.right) continue;
        const t = c.tenorDays / 365;
        const fwd = targetDay.spot * Math.exp((0.045 - 0.012) * t);
        const lm = Math.log(c.strike / fwd);
        const d =
          3.2 * (lm - desiredLm) ** 2 +
          0.8 * ((c.tenorDays - desiredTau) / 40) ** 2 +
          1.4 * (c.delta - l.delta) ** 2 +
          0.15 * ((c.ask - c.bid) / Math.max(c.mid, 0.05));
        if (d < bestD) {
          bestD = d;
          best = c;
        }
      }
      if (!best) return l;
      return {
        id: l.id + "@" + targetDay.index,
        right: l.right,
        side: l.side,
        qty: l.qty,
        strike: best.strike,
        tenorDays: best.tenorDays,
        expiryIndex: targetDay.index + best.tenorDays,
      };
    });
    const quoted = quoteLegs(mapped, targetDay, targetChain);
    const srcG = summarize(source);
    const dstG = summarize(quoted);
    const scale = Math.max(
      1,
      Math.abs(srcG.delta) + Math.abs(srcG.vega) * 4 + Math.abs(srcG.gamma) * 200,
    );
    const residual =
      (Math.abs(dstG.delta - srcG.delta) +
        Math.abs(dstG.vega - srcG.vega) * 4 +
        Math.abs(dstG.gamma - srcG.gamma) * 200) /
      scale;
    return {
      legs: quoted,
      residual,
      mode,
      valid: residual <= residualMax,
      note:
        residual <= residualMax
          ? "Exposure match within residual gate."
          : "INVALID_POSITION_TRANSPORT — residual exceeds frozen threshold.",
    };
  }

  return {
    legs: quoteLegs(source, targetDay, targetChain),
    residual: 1,
    mode,
    valid: false,
    note: "Unknown transport.",
  };
}

export function pathPnL(
  uni: Universe,
  legs0: QuotedLeg[],
  start: number,
  horizon: number,
  _mode: TransportMode,
): { pnl: number[]; mfe: number; mae: number; drawdown: number } {
  const pnl: number[] = [0];
  const entry = markValue(legs0);
  let peak = 0;
  let mfe = 0;
  let mae = 0;
  let maxDd = 0;
  for (let h = 1; h <= horizon; h++) {
    const i = start + h;
    if (i >= uni.days.length) break;
    const day = uni.days[i];
    const aged = legs0.map((l) => revalueLeg(l, day));
    const v = markValue(aged) - entry;
    pnl.push(v);
    if (v > mfe) mfe = v;
    if (v < mae) mae = v;
    if (v > peak) peak = v;
    maxDd = Math.min(maxDd, v - peak);
  }
  return { pnl, mfe, mae, drawdown: maxDd };
}

function revalueLeg(l: QuotedLeg, day: DayBar): QuotedLeg {
  const tenor = Math.max(1, (l.expiryIndex || day.index + l.tenorDays) - day.index);
  const t = tenor / 365;
  const fwd = day.spot * Math.exp((0.045 - 0.012) * t);
  const lm = Math.log(Math.max(l.strike, 1) / fwd);
  const iv = Math.max(0.06, day.ivAtm + day.skew * lm + 0.45 * lm * lm);
  const g = blackScholes(day.spot, l.strike, t, iv, 0.045, 0.012, l.right);
  const half = Math.max(0.02, g.price * 0.008);
  return {
    ...l,
    tenorDays: tenor,
    iv,
    mid: g.price,
    bid: Math.max(0.01, g.price - half),
    ask: g.price + half,
    delta: g.delta,
    gamma: g.gamma,
    vega: g.vega,
    theta: g.theta,
    spread: half * 2,
    logMoneyness: lm,
    contractDelta: g.delta,
  };
}


export function positionHash(legs: Leg[]): string {
  return shaLike(
    legs.map((l) => `${l.side}${l.qty}${l.right}${l.strike}${l.tenorDays}`),
  );
}

export function exposureWeights(g: PositionGreeks): {
  price: number;
  surface: number;
  micro: number;
  technical: number;
} {
  const ad = Math.abs(g.delta);
  const ag = Math.abs(g.gamma);
  const av = Math.abs(g.vega);
  const at = Math.abs(g.theta);
  const s = ad + ag * 80 + av * 3 + at * 2 + 1e-6;
  return {
    price: (ad + ag * 20) / s,
    surface: (av * 3 + at) / s,
    micro: (ag * 40 + at) / s,
    technical: 0.18,
  };
}
