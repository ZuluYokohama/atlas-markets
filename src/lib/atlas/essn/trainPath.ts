export const TRAIN_PROTOCOL = "ESSN-TRAIN-v0";

export type TrainDataset = "synthetic_planted" | "development_f0";

export interface TrainPath {
  protocol: typeof TRAIN_PROTOCOL;
  dataset: TrainDataset;
  seed: number;
  epochs: number;
  batchSize: number;
  lr: number;
  weightDecay: number;
  gradClip: number;
  valFraction: number;
  earlyStopPatience: number;
  taus: readonly number[];
  confirmationOpened: false;
  device: "cpu";
}

export const DEFAULT_TRAIN_PATH: TrainPath = {
  protocol: TRAIN_PROTOCOL,
  dataset: "synthetic_planted",
  seed: 0x54524149,
  epochs: 40,
  batchSize: 16,
  lr: 0.02,
  weightDecay: 1e-4,
  gradClip: 1,
  valFraction: 0.25,
  earlyStopPatience: 8,
  taus: [0.05, 0.25, 0.5, 0.75, 0.95],
  confirmationOpened: false,
  device: "cpu",
};

export function parseTrainPath(raw: Partial<TrainPath> | null | undefined): TrainPath {
  const p = { ...DEFAULT_TRAIN_PATH, ...(raw ?? {}) };
  if (p.confirmationOpened) throw new Error("CONFIRMATION_CLOSED");
  if (!Number.isFinite(p.seed) || !Number.isInteger(p.seed)) throw new Error("SEED");
  if (!Number.isFinite(p.epochs) || !Number.isInteger(p.epochs)) throw new Error("EPOCHS");
  if (p.epochs < 1 || p.epochs > 200) throw new Error("EPOCHS");
  if (!Number.isFinite(p.batchSize) || !Number.isInteger(p.batchSize)) throw new Error("BATCH");
  if (p.batchSize < 1 || p.batchSize > 128) throw new Error("BATCH");
  if (!Number.isFinite(p.earlyStopPatience) || !Number.isInteger(p.earlyStopPatience)) {
    throw new Error("EARLY_STOP_PATIENCE");
  }
  if (!Number.isFinite(p.valFraction) || p.valFraction <= 0 || p.valFraction >= 1) {
    throw new Error("VAL_FRACTION");
  }
  if (!Number.isFinite(p.gradClip) || p.gradClip <= 0) throw new Error("GRAD_CLIP");
  if (!Number.isFinite(p.weightDecay) || p.weightDecay < 0) throw new Error("WEIGHT_DECAY");
  if (!(p.lr > 0) || p.lr > 1) throw new Error("LR");
  if (p.dataset !== "synthetic_planted" && p.dataset !== "development_f0") {
    throw new Error("DATASET");
  }
  return {
    ...p,
    protocol: TRAIN_PROTOCOL,
    confirmationOpened: false,
    device: "cpu",
    taus: [0.05, 0.25, 0.5, 0.75, 0.95],
  };
}
