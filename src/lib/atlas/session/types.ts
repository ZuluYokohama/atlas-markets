export type EvidenceTone = "DESCRIPTIVE" | "UNSUPPORTED" | "CERTIFIED" | "OUT_OF_SCOPE" | "INCONCLUSIVE";

export interface AnalogHit {
  index: number;
  date: string;
  distance: number;
  yPnl: number;
  regime: string;
}

export interface Cone {
  q10: number;
  q50: number;
  q90: number;
  n: number;
  nEff: number;
  status: EvidenceTone;
}

export interface FeatureCell {
  name: string;
  value: number | null;
  family: string;
}

export interface ReplayFrame {
  index: number;
  date: string;
  regime: string;
  split: "development" | "quarantine" | "confirmation";
  spot: number;
  ivAtm: number;
  rv20: number;
  features: FeatureCell[];
  analogs: AnalogHit[];
  cone: Cone;
  ood: boolean;
  strategy: string;
  positionDsl: string;
  modelDebit: number | null;
}

export interface SessionDay {
  index: number;
  date: string;
  spot: number;
  ivAtm: number;
  regime: string;
}

export interface WorkstationPayload {
  dataset: {
    id: string;
    name: string;
    kind: "synthetic";
    seed: number;
    instrument: string;
    redistributionAllowed: true;
  };
  f0: {
    protocolId: string;
    claim: "UNSUPPORTED";
    confirmationOpened: false;
    w1Delta: number;
    w2Delta: number;
  };
  days: SessionDay[];
  frames: ReplayFrame[];
  minIndex: number;
  maxIndex: number;
}
