import { blackScholes, intrinsic } from "./bs.ts";
import type { OptionChain } from "./chain.ts";
import { getQuote } from "./chain.ts";
import { signedQuantity, type CompiledLeg } from "./identity.ts";

export type MarkKind = "market" | "model";

export interface LegMark {
  contractId: string;
  kind: MarkKind;
  price: number | null;
  delta: number | null;
  gamma: number | null;
  vega: number | null;
  theta: number | null;
  quality: "ok" | "stale" | "missing" | "expired";
  halfSpreadCost: number;
}

export interface PositionMark {
  kind: MarkKind;
  value: number | null;
  debitCredit: number | null;
  greeks: { delta: number; gamma: number; vega: number; theta: number } | null;
  legs: LegMark[];
  missingContracts: string[];
  staleContracts: string[];
}

function yearFraction(asOf: string, expiration: string): number {
  const a = Date.parse(asOf.slice(0, 10) + "T00:00:00.000Z");
  const e = Date.parse(expiration + "T00:00:00.000Z");
  return (e - a) / (365 * 24 * 3600 * 1000);
}

export function markLegMarket(leg: CompiledLeg, chain: OptionChain): LegMark {
  const q = getQuote(chain, leg.contractId);
  if (!q || q.quality === "missing") {
    return {
      contractId: leg.contractId,
      kind: "market",
      price: null,
      delta: null,
      gamma: null,
      vega: null,
      theta: null,
      quality: "missing",
      halfSpreadCost: 0,
    };
  }
  const half = 0.5 * Math.max(q.ask - q.bid, 0) * leg.multiplier * Math.abs(leg.quantity);
  return {
    contractId: leg.contractId,
    kind: "market",
    price: q.mid,
    delta: q.delta,
    gamma: null,
    vega: null,
    theta: null,
    quality: q.quality,
    halfSpreadCost: half,
  };
}

export function markLegModel(leg: CompiledLeg, chain: OptionChain, vol: number): LegMark {
  const tau = yearFraction(chain.asOf, leg.expiration);
  if (tau <= 0) {
    const px = intrinsic(leg.right, chain.spot, leg.strike);
    return {
      contractId: leg.contractId,
      kind: "model",
      price: px,
      delta: null,
      gamma: null,
      vega: null,
      theta: null,
      quality: "expired",
      halfSpreadCost: 0,
    };
  }
  const bs = blackScholes({
    spot: chain.spot,
    strike: leg.strike,
    tau,
    vol,
    rate: chain.rate,
    div: chain.div,
    right: leg.right,
  });
  return {
    contractId: leg.contractId,
    kind: "model",
    price: bs.price,
    delta: bs.delta,
    gamma: bs.gamma,
    vega: bs.vega,
    theta: bs.theta,
    quality: "ok",
    halfSpreadCost: 0,
  };
}

export function markPosition(
  legs: CompiledLeg[],
  chain: OptionChain,
  kind: MarkKind,
  modelVol = 0.2,
): PositionMark {
  const marked = legs.map((leg) => (kind === "market" ? markLegMarket(leg, chain) : markLegModel(leg, chain, modelVol)));
  const missing = marked.filter((m) => m.quality === "missing").map((m) => m.contractId);
  const stale = marked.filter((m) => m.quality === "stale").map((m) => m.contractId);
  if (kind === "market" && missing.length > 0) {
    return {
      kind,
      value: null,
      debitCredit: null,
      greeks: null,
      legs: marked,
      missingContracts: missing,
      staleContracts: stale,
    };
  }
  let value = 0;
  const greeks = { delta: 0, gamma: 0, vega: 0, theta: 0 };
  for (let i = 0; i < legs.length; i++) {
    const px = marked[i].price ?? 0;
    const q = signedQuantity(legs[i]) * legs[i].multiplier;
    value += q * px;
    const g = marked[i];
    if (g.delta != null) greeks.delta += q * g.delta;
    if (g.gamma != null) greeks.gamma += q * g.gamma;
    if (g.vega != null) greeks.vega += q * g.vega;
    if (g.theta != null) greeks.theta += q * g.theta;
  }
  return { kind, value, debitCredit: value, greeks, legs: marked, missingContracts: missing, staleContracts: stale };
}

export function payoffAtSpot(legs: CompiledLeg[], spot: number): number {
  let pnl = 0;
  for (const leg of legs) {
    pnl += signedQuantity(leg) * leg.multiplier * intrinsic(leg.right, spot, leg.strike);
  }
  return pnl;
}
