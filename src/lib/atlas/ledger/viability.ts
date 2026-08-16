import type { ReplayFrame } from "../session/types.ts";

export type ViabilityStance = "ABSTAIN" | "INSPECT";

export interface ViabilityReadout {
  stance: ViabilityStance;
  reasons: string[];
  n: number;
  width: number | null;
  claim: "DESCRIPTIVE";
}

/** Descriptive analog support. Never a trade instruction. */
export function viabilityReadout(frame: Pick<ReplayFrame, "ood" | "cone">): ViabilityReadout {
  const n = frame.cone.n;
  const width =
    frame.cone.q90 != null && frame.cone.q10 != null ? frame.cone.q90 - frame.cone.q10 : null;
  const reasons: string[] = [];
  if (frame.ood) reasons.push("outside historical support");
  if (n < 8) reasons.push("sparse analog neighborhood");
  if (width != null && width > 80) reasons.push("wide analog spread");
  const stance: ViabilityStance = frame.ood || n < 8 ? "ABSTAIN" : "INSPECT";
  if (stance === "INSPECT") reasons.push("cone is an analog picture, not a forecast");
  return { stance, reasons, n, width, claim: "DESCRIPTIVE" };
}
