import { contentHash } from "../hash.ts";

export type Right = "call" | "put";
export type Side = "buy" | "sell";

export function contractId(input: {
  underlying: string;
  expiration: string;
  right: Right;
  strike: number;
}): string {
  const ymd = input.expiration.replace(/-/g, "");
  const strike = Math.round(input.strike * 1000)
    .toString()
    .padStart(8, "0");
  const cp = input.right === "call" ? "C" : "P";
  return `OCC:${input.underlying.toUpperCase()}:${ymd}:${cp}:${strike}`;
}

export interface CompiledLeg {
  id: string;
  contractId: string;
  underlying: string;
  right: Right;
  side: Side;
  quantity: number;
  strike: number;
  expiration: string;
  multiplier: number;
}

export function signedQuantity(leg: CompiledLeg): number {
  return (leg.side === "buy" ? 1 : -1) * leg.quantity;
}

export function canonicalLegKey(leg: CompiledLeg): string {
  return [leg.contractId, leg.side, String(leg.quantity), String(leg.multiplier)].join("|");
}

/** Permutation-invariant position identity. */
export function positionHash(legs: CompiledLeg[]): string {
  const keys = legs.map(canonicalLegKey).sort();
  return contentHash({ keys });
}

export function assertSameContracts(a: CompiledLeg[], b: CompiledLeg[]): void {
  const A = a.map((l) => l.contractId).sort();
  const B = b.map((l) => l.contractId).sort();
  if (A.join() !== B.join()) throw new Error("CONTRACT_SET_MISMATCH");
}
