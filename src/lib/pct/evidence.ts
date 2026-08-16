import type { E1Result } from "./types";
import type { EvidenceClaim, EvidenceStatus, GateRecord } from "./types";

export const STATUS_COPY: Record<EvidenceStatus, string> = {
  EXACT: "Mathematical consequence of declared definitions",
  CERTIFIED: "Numerical invariant or implementation identity passed",
  DESCRIPTIVE: "Observed in current data — not a frozen claim",
  VALIDATED: "Survived frozen holdout / null design",
  UNSUPPORTED: "Declared positive claim failed its test",
  INCONCLUSIVE: "Insufficient discrimination or power",
  FAILED_CHECK: "Numerical or software integrity gate failed",
  SPECULATIVE: "Interpretation not yet tested",
  PENDING: "Registered, not yet executed",
  NOT_TESTED: "Outside the current experiment scope",
};

const BASE_GATES: GateRecord[] = [
  {
    id: "E0",
    question: "Is the numerical operator correct?",
    status: "CERTIFIED",
    summary:
      "Hermitian connection Laplacian, U_ji = U_ijᵀ, random-gauge spectral invariance, and BS put-call identities hold in the demo kernel.",
    metrics: [
      { label: "Laplacian PSD (tol)", value: "pass" },
      { label: "Gauge invariance", value: "pass" },
      { label: "Transport inverse", value: "pass" },
    ],
  },
  {
    id: "E1",
    question: "Does the basis earn compression complexity?",
    status: "CERTIFIED",
    summary:
      "E1-A oracle calibration: clean sections live in the same low eigenspace used to reconstruct. Compare also to gauge-DCT.",
    metrics: [
      { label: "Role", value: "oracle + gauge-fair" },
      { label: "Primary unit", value: "world, not bar" },
    ],
  },
  {
    id: "E2",
    question: "Is holonomy detectable above transport noise?",
    status: "DESCRIPTIVE",
    summary:
      "Planted SO(2) holonomy is recovered on the synthetic cycle. This is discrete connection holonomy, not market curvature.",
    metrics: [
      { label: "Null model", value: "noisy integrable connection" },
      { label: "Statistic", value: "φ, 2−tr H, ‖I−H‖_F" },
    ],
  },
  {
    id: "E3",
    question: "Is the representation noncircular and causal?",
    status: "PENDING",
    summary:
      "Causal software certificate is implemented (availability time). Cross-family holdout is registered, not yet frozen.",
    metrics: [
      { label: "Future-poison hash", value: "wired" },
      { label: "Cross-family", value: "not run" },
    ],
  },
  {
    id: "E4",
    question: "Does it improve frozen position outcomes?",
    status: "NOT_TESTED",
    summary:
      "Only E4 can support a narrowly defined claim of predictive utility. Analog terrain is the frozen baseline; SFT/TDA are candidate families.",
    metrics: [
      { label: "Split", value: "dev / quarantine / confirm" },
      { label: "Primary loss", value: "pinball + CRPS" },
    ],
  },
  {
    id: "E5",
    question: "Does it survive live shadow conditions?",
    status: "NOT_TESTED",
    summary:
      "Shadow mode requires a frozen offline pipeline and has no order authority.",
    metrics: [{ label: "Order authority", value: "none" }],
  },
];

export function defaultGates(): GateRecord[] {
  return BASE_GATES;
}

export function gatesFromE1(e1: E1Result): GateRecord[] {
  const e1Pass = e1.dConn < e1.dDct && e1.dConn < e1.dShuffled;
  return BASE_GATES.map((g) => {
    if (g.id !== "E1") return g;
    return {
      ...g,
      status: e1Pass ? "CERTIFIED" : "INCONCLUSIVE",
      summary: e1.note,
      metrics: [
        { label: "D_conn", value: e1.dConn.toFixed(4) },
        { label: "D_DCT", value: e1.dDct.toFixed(4) },
        { label: "vs DCT", value: `${(e1.reductionVsDct * 100).toFixed(1)}%` },
        { label: "D_gauge-DCT", value: e1.dGaugeDct.toFixed(4) },
      ],
    };
  });
}

export const CLAIMS: EvidenceClaim[] = [
  {
    id: "c-transport-sep",
    claim: "Position transport, connection transport, and strategy evolution are distinct maps.",
    status: "EXACT",
    gate: "E0",
    limitations: "Definitional. Does not imply any of the three is useful.",
  },
  {
    id: "c-gauge",
    claim: "Connection Laplacian eigenvalues are invariant under vertex-wise O(r) gauges.",
    status: "CERTIFIED",
    gate: "E0",
    limitations: "Holds for the implemented block Laplacian; check solver tolerance.",
  },
  {
    id: "c-e1a",
    claim: "Connection SFT compresses oracle sections better than raw DCT at matched rank.",
    status: "CERTIFIED",
    gate: "E1",
    limitations:
      "E1-A oracle. Clean signals were generated in the same eigenspace. Not market validation.",
  },
  {
    id: "c-holonomy",
    claim: "Cycle holonomy is the gauge-invariant obstruction to global alignment.",
    status: "EXACT",
    gate: "E2",
    limitations: "Synchronization geometry. Not a trading signal.",
  },
  {
    id: "c-terrain",
    claim: "Position-conditioned analogs describe historical outcomes for this exposure.",
    status: "DESCRIPTIVE",
    gate: "none",
    limitations: "Causal, purged, but not a frozen E4 confirmation.",
  },
  {
    id: "c-alpha",
    claim: "The workstation finds tradable alpha.",
    status: "NOT_TESTED",
    gate: "E4",
    limitations: "Explicitly not claimed. Requires incremental frozen loss + costs + DSR/PBO.",
  },
];

export const TRIALS = [
  { id: "t01", model: "Unconditional", input: "Position + horizon", pinball: 1.0, crps: 1.0, split: "dev", selected: false },
  { id: "t02", model: "Raw analog", input: "Canonical state", pinball: 0.81, crps: 0.84, split: "dev", selected: true },
  { id: "t03", model: "Linear / ridge", input: "Raw + position", pinball: 0.86, crps: 0.88, split: "dev", selected: false },
  { id: "t04", model: "Gauge-DCT analog", input: "Unwrapped spectrum", pinball: 0.83, crps: 0.85, split: "dev", selected: false },
  { id: "t05", model: "Connection SFT", input: "SFT coords", pinball: 0.8, crps: 0.82, split: "dev", selected: false },
  { id: "t06", model: "Raw + TDA", input: "Persistence stats", pinball: 0.82, crps: 0.84, split: "dev", selected: false },
];
