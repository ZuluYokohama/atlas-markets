export type GateId = "E0" | "E1" | "E2" | "E3" | "E4" | "E5" | "F0";

export interface GateCard {
  id: GateId;
  question: string;
  status: string;
  evidence: string;
  summary: string;
}

export const PRODUCT_CLAIM =
  "On protocol E4-v0 / F0-v0, no incremental distributional edge was found. The user is justified in treating this as a research lab with certified operators, a certified PIT clock, a certified shadow fail-closed policy, and an UNSUPPORTED predictive claim. The user is not justified in claiming alpha, curvature of the market, or a right to trade.";

export const COMPLETION = [
  {
    q: "What information entered the system?",
    a: "A synthetic 520-session SPY-like path, planted regimes, declared Black–Scholes valuation, and a single long ATM 21-DTE call template. No licensed Cboe/LOBSTER tape. Confirmation block 315–519 never entered a model.",
  },
  {
    q: "What was mathematically forced?",
    a: "Permutation-invariant position identity, live/replay snapshot equality, SO(2) holonomy commuting on a cycle, connection-Laplacian symmetry given U_ji = U_ijᵀ, and gauge conjugacy of the spectrum.",
  },
  {
    q: "What was numerically certified?",
    a: "E0 operators (orthogonality, PSD, gauge spectrum). E1-A synthetic oracle reconstruction. E2 detectability at (L=8, σ=0.08, θ=0.7). E3 PIT assembly. E5 fail-closed shadow. Live/replay hashes.",
  },
  {
    q: "What was merely observed?",
    a: "Analog clouds, outcome cones, prototype geometry plots, strategy-automaton traces. Those are DESCRIPTIVE pictures on development indices.",
  },
  {
    q: "What survived matched controls and frozen out-of-sample testing?",
    a: "Nothing predictive. B1/B2 remain the best pinball. Connection coordinates and every incremental ladder rung failed the 3% kill line on W1 and W2.",
  },
  {
    q: "What failed?",
    a: "F0 (state vs baselines), E1-G (connection as model input), E4-v0 (entire incremental ladder). Small holonomy (θ=0.2) is invisible at the calibrated E2 threshold.",
  },
  {
    q: "When should the system abstain?",
    a: "OOD closes, clock skew, feed gap, schema drift, kill switch, sparse analog neighborhoods, any request to open confirmation, any request to place an order.",
  },
  {
    q: "What exactly is the user justified in claiming?",
    a: PRODUCT_CLAIM,
  },
] as const;

export const GATES: GateCard[] = [
  {
    id: "E0",
    question: "Are the operators implemented correctly?",
    status: "PASS",
    evidence: "CERTIFIED_OPERATOR_IMPLEMENTATION",
    summary: "Procrustes, connection Laplacian, gauge spectrum, planted holonomy.",
  },
  {
    id: "E1",
    question: "Does the basis earn its complexity?",
    status: "MIXED",
    evidence: "CERTIFIED_SYNTHETIC_ORACLE; E1-G UNSUPPORTED",
    summary: "Oracle reconstruction works. Connection coords are not model inputs.",
  },
  {
    id: "E2",
    question: "Is cycle inconsistency detectable under a flat+noise null?",
    status: "PASS",
    evidence: "CERTIFIED_DETECTABILITY",
    summary: "Type I 5%, power 0.88 at the design point. Not market curvature.",
  },
  {
    id: "E3",
    question: "Is the representation at T a function of data ≤ T?",
    status: "PASS",
    evidence: "CERTIFIED_PIT_REPRESENTATION",
    summary: "Outcome shuffle is a no-op. Future scaling is illegal and visible.",
  },
  {
    id: "F0",
    question: "Does position-state beat simple baselines on 5-day call PnL?",
    status: "FAIL",
    evidence: "UNSUPPORTED",
    summary: "kNN worse than unconditional / regime on both development windows.",
  },
  {
    id: "E4",
    question: "Does any frozen ladder rung add utility after costs?",
    status: "FAIL",
    evidence: "UNSUPPORTED",
    summary: "Rungs 3–7 all miss the 3% line. TCN/MoE/neuroevolution not started.",
  },
  {
    id: "E5",
    question: "Can the same engine run as fail-closed shadow with no orders?",
    status: "PASS",
    evidence: "CERTIFIED_SHADOW_FAIL_CLOSED",
    summary: "Live/replay identity. placeOrder throws. Skew/gap/schema/OOD abstain.",
  },
];

export const WHAT_ENTERED = {
  dataset: "synthetic_spy_520_v0",
  vendor: "internal_synthetic",
  license: "none — do not redistribute as market data",
  pitField: "availability_time",
  confirmation: "closed (315–519)",
  orderAuthority: false,
  protocol: "E4-frozen-utility-v0",
};

export const E4_TRIALS = [
  { rung: 1, name: "unconditional", w1: 202.8, w2: 175.9, claim: "reference" },
  { rung: 2, name: "regime-oracle", w1: 232.9, w2: 170.9, claim: "reference" },
  { rung: 3, name: "knn", w1: 248.9, w2: 179.8, claim: "UNSUPPORTED" },
  { rung: 4, name: "kernel", w1: 266.7, w2: 173.7, claim: "UNSUPPORTED" },
  { rung: 5, name: "ridge", w1: 308.1, w2: 174.9, claim: "UNSUPPORTED" },
  { rung: 6, name: "tree", w1: 225.3, w2: 178.0, claim: "UNSUPPORTED" },
  { rung: 7, name: "knn + connection", w1: 249.1, w2: 181.6, claim: "UNSUPPORTED" },
  { rung: 8, name: "tcn / ssm", w1: null, w2: null, claim: "OUT_OF_SCOPE" },
  { rung: 9, name: "regime moe", w1: null, w2: null, claim: "OUT_OF_SCOPE" },
  { rung: 10, name: "neuroevolution", w1: null, w2: null, claim: "OUT_OF_SCOPE" },
] as const;
