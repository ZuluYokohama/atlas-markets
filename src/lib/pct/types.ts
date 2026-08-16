export type EvidenceStatus =
  | "EXACT"
  | "CERTIFIED"
  | "DESCRIPTIVE"
  | "VALIDATED"
  | "UNSUPPORTED"
  | "INCONCLUSIVE"
  | "FAILED_CHECK"
  | "SPECULATIVE"
  | "PENDING"
  | "NOT_TESTED";

export type GateId = "E0" | "E1" | "E2" | "E3" | "E4" | "E5";

export type OptionRight = "call" | "put";
export type Side = "buy" | "sell";

export type HorizonId = "1d" | "5d" | "21d";

export type TransportMode = "contract" | "template" | "exposure";

export type StrategyState =
  | "UNSEEN"
  | "SCANNED"
  | "QUALIFIED"
  | "FORMING"
  | "ELIGIBLE"
  | "TRIGGERED"
  | "MANAGED"
  | "EXITED"
  | "INVALIDATED";

export type SplitBlock = "development" | "quarantine" | "confirmation";

export type RegimeId =
  | "grind"
  | "meltup"
  | "correction"
  | "crisis"
  | "range"
  | "recovery";

export interface Leg {
  id: string;
  right: OptionRight;
  side: Side;
  qty: number;
  strike: number;
  tenorDays: number;
  expiryIndex: number;
}

export interface PositionTemplate {
  id: string;
  name: string;
  blurb: string;
  family: string;
  build: (spot: number, ivAtm: number, dayIndex: number) => Leg[];
}

export interface QuotedLeg extends Leg {
  iv: number;
  mid: number;
  bid: number;
  ask: number;
  delta: number;
  gamma: number;
  vega: number;
  theta: number;
  spread: number;
  logMoneyness: number;
  contractDelta: number;
}

export interface PositionGreeks {
  delta: number;
  gamma: number;
  vega: number;
  theta: number;
  debit: number;
  credit: number;
  width: number;
  liquidityBurden: number;
}

export interface Contract {
  strike: number;
  tenorDays: number;
  right: OptionRight;
  iv: number;
  mid: number;
  bid: number;
  ask: number;
  delta: number;
  gamma: number;
  vega: number;
  theta: number;
}

export interface SemanticEvent {
  id: string;
  dayIndex: number;
  label: string;
  kind: "fomc" | "cpi" | "nfp" | "opex" | "shock";
  knownAheadDays: number;
}

export interface DayBar {
  index: number;
  date: string;
  weekday: number;
  split: SplitBlock;
  regime: RegimeId;
  spot: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  ret1: number;
  rv20: number;
  ivAtm: number;
  ivRank: number;
  skew: number;
  term: number;
  spreadBps: number;
  ofi: number;
  depth: number;
  rsi: number;
  macd: number;
  atr: number;
  sma20: number;
  sma50: number;
  vwapDev: number;
  relVol: number;
}

export interface MarketState {
  price: number[];
  technical: number[];
  micro: number[];
  surface: number[];
  calendar: number[];
  semantic: number[];
  labels: string[];
}

export interface AnalogRecord {
  dayIndex: number;
  date: string;
  regime: RegimeId;
  split: SplitBlock;
  distance: number;
  weight: number;
  transportResidual: number;
  transportMode: TransportMode;
  pnl: number;
  mfe: number;
  mae: number;
  drawdown: number;
  hitStop: boolean;
  hitTarget: boolean;
  path: number[];
  attribution: { name: string; share: number }[];
}

export interface TerrainResult {
  queryIndex: number;
  horizon: HorizonId;
  horizonDays: number;
  k: number;
  nEff: number;
  ood: number;
  regimeConcentration: number;
  calendarConcentration: number;
  meanTransportResidual: number;
  quantiles: { q05: number; q25: number; q50: number; q75: number; q95: number };
  prProfit: number;
  prStop: number;
  prTarget: number;
  meanMfe: number;
  meanMae: number;
  meanDrawdown: number;
  analogs: AnalogRecord[];
  abstain: boolean;
  abstainReason: string | null;
  evidence: EvidenceStatus;
  featureFamily: string;
}

export interface ViabilityReport {
  entryScore: number;
  exitScore: number;
  entryLabel: "enter" | "lean-enter" | "pass" | "abstain";
  exitLabel: "hold" | "trim" | "exit" | "abstain";
  reasons: string[];
  risks: string[];
  evidence: EvidenceStatus;
}

export interface GateRecord {
  id: GateId;
  question: string;
  status: EvidenceStatus;
  summary: string;
  metrics: { label: string; value: string }[];
}

export interface EvidenceClaim {
  id: string;
  claim: string;
  status: EvidenceStatus;
  gate: GateId | "none";
  limitations: string;
}

export interface ConnectionBundle {
  n: number;
  r: number;
  vertices: number[];
  edges: { i: number; j: number; w: number; kind: "chrono" | "knn"; holonomy?: number }[];
  frames: number[][][];
  transports: { i: number; j: number; U: number[][]; conf: number }[];
  eigenvalues: number[];
  energy: number;
  treeHolonomyMax: number;
  cycleHolonomy: { cycle: number[]; angle: number; frobenius: number }[];
}

export interface E1Result {
  k: number;
  dConn: number;
  dPca: number;
  dDct: number;
  dGaugeDct: number;
  dGft: number;
  dShuffled: number;
  reductionVsDct: number;
  note: string;
}

export interface CompiledIntent {
  raw: string;
  positionTemplate: string;
  tenorDays: number;
  horizon: HorizonId;
  condition: string;
  informationPolicy: string;
  json: Record<string, unknown>;
  warnings: string[];
}
