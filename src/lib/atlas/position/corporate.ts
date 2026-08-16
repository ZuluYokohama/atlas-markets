import type { CompiledLeg } from "./identity.ts";
import { contractId } from "./identity.ts";

/** Integer split. Strike / ratio, quantity * ratio. Contract id rebuilt. */
export function applySplit(legs: CompiledLeg[], ratio: number): CompiledLeg[] {
  if (ratio <= 0 || !Number.isFinite(ratio)) throw new Error("SPLIT_RATIO");
  return legs.map((leg) => {
    const strike = leg.strike / ratio;
    const quantity = leg.quantity * ratio;
    return {
      ...leg,
      strike,
      quantity,
      contractId: contractId({
        underlying: leg.underlying,
        expiration: leg.expiration,
        right: leg.right,
        strike,
      }),
    };
  });
}
