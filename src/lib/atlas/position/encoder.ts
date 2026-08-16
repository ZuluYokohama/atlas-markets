import { signedQuantity, type CompiledLeg } from "./identity.ts";
import { blackScholes } from "./bs.ts";

const DIM = 8;

function phi(leg: CompiledLeg, spot: number, vol: number, asOf: string): number[] {
  const tau = Math.max(
    0,
    (Date.parse(leg.expiration + "T00:00:00.000Z") - Date.parse(asOf.slice(0, 10) + "T00:00:00.000Z")) /
      (365 * 24 * 3600 * 1000),
  );
  const bs =
    tau > 0
      ? blackScholes({
          spot,
          strike: leg.strike,
          tau,
          vol,
          rate: 0,
          div: 0,
          right: leg.right,
        })
      : { delta: 0, gamma: 0, vega: 0, theta: 0, price: 0 };
  const q = signedQuantity(leg);
  return [
    q,
    q * Math.log(leg.strike / spot),
    q * tau,
    q * (bs.delta || 0),
    q * (bs.gamma || 0),
    q * (bs.vega || 0),
    q * (leg.right === "call" ? 1 : -1),
    q * leg.multiplier,
  ];
}

function rho(sum: number[]): number[] {
  return sum.map((x) => Math.tanh(x));
}

/** Deep-sets encoder. Permutation invariant by construction. */
export function encodePosition(legs: CompiledLeg[], spot: number, vol: number, asOf: string): number[] {
  const acc = new Array<number>(DIM).fill(0);
  for (const leg of legs) {
    const v = phi(leg, spot, vol, asOf);
    for (let i = 0; i < DIM; i++) acc[i] += v[i];
  }
  return rho(acc);
}

export function vectorsClose(a: number[], b: number[], eps = 1e-12): boolean {
  if (a.length !== b.length) return false;
  return a.every((x, i) => Math.abs(x - b[i]) <= eps);
}
