/**
 * Canonical evidence states (S6). PENDING / NOT_TESTED from the prototype
 * are not members of this set.
 *
 * Transition graph is ENGINEERING_INFERENCE: S5/S6 list states, not edges.
 * The graph is conservative: validation cannot be reached by skipping tests,
 * and a failed or unsupported claim cannot be silently upgraded.
 */

export const EVIDENCE_STATES = [
  "EXACT",
  "CERTIFIED",
  "DESCRIPTIVE",
  "VALIDATED",
  "UNSUPPORTED",
  "INCONCLUSIVE",
  "FAILED_CHECK",
  "SPECULATIVE",
  "OUT_OF_SCOPE",
] as const;

export type EvidenceState = (typeof EVIDENCE_STATES)[number];

export const ALLOWED_TRANSITIONS: Record<EvidenceState, readonly EvidenceState[]> = {
  SPECULATIVE: ["SPECULATIVE", "DESCRIPTIVE", "INCONCLUSIVE", "OUT_OF_SCOPE", "FAILED_CHECK", "EXACT"],
  EXACT: ["EXACT", "FAILED_CHECK"],
  CERTIFIED: ["CERTIFIED", "FAILED_CHECK", "DESCRIPTIVE"],
  DESCRIPTIVE: ["DESCRIPTIVE", "INCONCLUSIVE", "UNSUPPORTED", "VALIDATED", "FAILED_CHECK", "CERTIFIED"],
  INCONCLUSIVE: ["INCONCLUSIVE", "DESCRIPTIVE", "UNSUPPORTED", "OUT_OF_SCOPE", "FAILED_CHECK"],
  VALIDATED: ["VALIDATED", "FAILED_CHECK", "UNSUPPORTED"],
  UNSUPPORTED: ["UNSUPPORTED", "FAILED_CHECK"],
  FAILED_CHECK: ["FAILED_CHECK"],
  OUT_OF_SCOPE: ["OUT_OF_SCOPE", "SPECULATIVE", "DESCRIPTIVE"],
};

export function isEvidenceState(value: string): value is EvidenceState {
  return (EVIDENCE_STATES as readonly string[]).includes(value);
}

export function canTransition(from: EvidenceState, to: EvidenceState): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function assertTransition(from: EvidenceState, to: EvidenceState): void {
  if (!canTransition(from, to)) {
    throw new Error(`PROHIBITED_EVIDENCE_TRANSITION: ${from} → ${to}`);
  }
}
