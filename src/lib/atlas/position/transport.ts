import { listQuotes, type ListedQuote, type OptionChain } from "./chain.ts";
import { contractId, type CompiledLeg } from "./identity.ts";

export const TRANSPORTS = {
  contract_v1: {
    id: "contract_v1",
    mode: "contract" as const,
    coordinates: ["contract_identity"] as const,
    residualThreshold: 0,
    notes: "Exact contract id. Refuse if absent.",
  },
  template_v1: {
    id: "template_v1",
    mode: "template" as const,
    coordinates: ["log_moneyness", "option_tenor"] as const,
    residualThreshold: 0.35,
    notes: "Nearest listed (log-moneyness, year-tenor). Refuse above residual.",
  },
  exposure_v1: {
    id: "exposure_v1",
    mode: "exposure" as const,
    coordinates: ["delta"] as const,
    residualThreshold: 0.12,
    notes: "Nearest listed delta, same right. Refuse above residual.",
  },
} as const;

export type TransportId = keyof typeof TRANSPORTS;

export interface TransportResult {
  rule: (typeof TRANSPORTS)[TransportId];
  legs: CompiledLeg[];
  residuals: number[];
  refused: boolean;
  reason: string | null;
}

function yearFrac(asOf: string, expiration: string): number {
  const a = Date.parse(asOf.slice(0, 10) + "T00:00:00.000Z");
  const e = Date.parse(expiration + "T00:00:00.000Z");
  return Math.max(0, (e - a) / (365 * 24 * 3600 * 1000));
}

function residualTemplate(leg: CompiledLeg, q: ListedQuote, spot: number, asOf: string): number {
  const lmLeg = Math.log(leg.strike / spot);
  const lmQ = Math.log(q.strike / spot);
  const tLeg = yearFrac(asOf, leg.expiration);
  const tQ = yearFrac(asOf, q.expiration);
  const dLm = lmLeg - lmQ;
  const dT = tLeg - tQ;
  return Math.hypot(dLm, dT);
}

export function transportPosition(
  legs: CompiledLeg[],
  chain: OptionChain,
  ruleId: TransportId,
): TransportResult {
  const rule = TRANSPORTS[ruleId];
  const listed = listQuotes(chain);
  const out: CompiledLeg[] = [];
  const residuals: number[] = [];

  for (const leg of legs) {
    if (ruleId === "contract_v1") {
      const hit = listed.find((q) => q.contractId === leg.contractId);
      if (!hit) {
        return { rule, legs: [], residuals, refused: true, reason: `NO_CONTRACT: ${leg.contractId}` };
      }
      out.push({ ...leg });
      residuals.push(0);
      continue;
    }

    const sameRight = listed.filter((q) => q.right === leg.right && q.underlying === leg.underlying);
    if (sameRight.length === 0) {
      return { rule, legs: [], residuals, refused: true, reason: `NO_LISTED: ${leg.right}` };
    }

    let best = sameRight[0];
    let bestR = Infinity;
    for (const q of sameRight) {
      const r =
        ruleId === "template_v1"
          ? residualTemplate(leg, q, chain.spot, chain.asOf)
          : Math.abs(q.delta - (/* target */ estimateTargetDelta(leg, chain)));
      if (r < bestR) {
        bestR = r;
        best = q;
      }
    }
    if (bestR > rule.residualThreshold) {
      return { rule, legs: [], residuals, refused: true, reason: `RESIDUAL ${bestR} > ${rule.residualThreshold}` };
    }
    residuals.push(bestR);
    out.push({
      ...leg,
      contractId: best.contractId,
      strike: best.strike,
      expiration: best.expiration,
    });
  }
  return { rule, legs: out, residuals, refused: false, reason: null };
}

function estimateTargetDelta(leg: CompiledLeg, chain: OptionChain): number {
  const listed = listQuotes(chain).find((q) => q.contractId === contractId(leg));
  if (listed) return listed.delta;
  const tau = yearFrac(chain.asOf, leg.expiration);
  if (tau <= 0) return leg.right === "call" ? (chain.spot >= leg.strike ? 1 : 0) : chain.spot <= leg.strike ? -1 : 0;
  const lm = Math.log(leg.strike / chain.spot);
  return leg.right === "call" ? 0.5 - 2 * lm : -0.5 - 2 * lm;
}
