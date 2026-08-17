import { pinball } from "../eval/metrics.ts";
import { AUDITOR_ID, type Commitment, type ScoreRecord } from "./commit.ts";

/** Independent judge. No predictor weights. No predict() method. */
export class IndependentAuditor {
  readonly id = AUDITOR_ID;

  score(commit: Commitment, y: number, revealT: number): ScoreRecord {
    if (revealT < commit.t + commit.horizon) {
      throw new Error(`REVEAL_TOO_EARLY: t=${commit.t} h=${commit.horizon} now=${revealT}`);
    }
    const q = commit.quantiles;
    const pb =
      (pinball(y, q.q05, 0.05) +
        pinball(y, q.q25, 0.25) +
        pinball(y, q.q50, 0.5) +
        pinball(y, q.q75, 0.75) +
        pinball(y, q.q95, 0.95)) /
      5;
    return {
      prediction_id: commit.prediction_id,
      y,
      pinball: pb,
      covered90: y >= q.q05 && y <= q.q95,
      scored_by: AUDITOR_ID,
      reveal_t: revealT,
    };
  }
}

export function meanPinballScores(rows: ScoreRecord[]): number {
  if (rows.length === 0) return Number.NaN;
  return rows.reduce((s, r) => s + r.pinball, 0) / rows.length;
}

export function coverage90(rows: ScoreRecord[]): number {
  if (rows.length === 0) return Number.NaN;
  return rows.filter((r) => r.covered90).length / rows.length;
}
