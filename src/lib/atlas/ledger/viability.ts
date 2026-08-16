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

export function formatSessionNote(
  frame: Pick<ReplayFrame, "date" | "index" | "ood" | "cone" | "positionDsl">,
): string {
  const v = viabilityReadout(frame);
  const width = v.width == null || Number.isNaN(v.width) ? "n/a" : v.width.toFixed(2);
  return [
    "Atlas session note (DESCRIPTIVE — not a forecast, not a ticket)",
    `date=${frame.date} t=${frame.index} stance=${v.stance} N=${v.n} analogWidth=${width}`,
    `position=${frame.positionDsl}`,
    `reasons=${v.reasons.join("; ")}`,
    "protocol=E4-v0 claim=UNSUPPORTED confirmation=closed orders=none",
  ].join("\n");
}
