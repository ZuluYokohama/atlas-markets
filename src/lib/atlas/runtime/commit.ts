import { contentHash } from "../hash.ts";

export const RT_PROTOCOL = "RT-PREQ-v0";
export const RT_HORIZON = 5;
export const CHAMPION_ID = "stub-recurrent-v0";
export const AUDITOR_ID = "auditor-v0";

export interface QuantileHead {
  q05: number;
  q25: number;
  q50: number;
  q75: number;
  q95: number;
}

export interface Commitment {
  prediction_id: string;
  protocol: typeof RT_PROTOCOL;
  t: number;
  horizon: number;
  event_sequence: number;
  state_hash: string;
  feature_hash: string;
  model_hash: string;
  quantiles: QuantileHead;
  ood: number;
  abstain: boolean;
  committed_at: string;
  content_hash: string;
}

export interface ScoreRecord {
  prediction_id: string;
  y: number;
  pinball: number;
  covered90: boolean;
  scored_by: typeof AUDITOR_ID;
  reveal_t: number;
}

export function makeCommitment(
  partial: Omit<Commitment, "content_hash" | "protocol" | "horizon" | "prediction_id"> & {
    prediction_id?: string;
  },
): Commitment {
  const body = {
    protocol: RT_PROTOCOL as typeof RT_PROTOCOL,
    horizon: RT_HORIZON,
    t: partial.t,
    event_sequence: partial.event_sequence,
    state_hash: partial.state_hash,
    feature_hash: partial.feature_hash,
    model_hash: partial.model_hash,
    quantiles: partial.quantiles,
    ood: partial.ood,
    abstain: partial.abstain,
    committed_at: partial.committed_at,
  };
  const prediction_id = partial.prediction_id ?? `prd_${contentHash(body).slice(0, 16)}`;
  const full = { ...body, prediction_id };
  return { ...full, content_hash: contentHash(full) };
}

export class CommitmentLedger {
  private readonly rows = new Map<string, Commitment>();
  private readonly order: string[] = [];

  append(c: Commitment): void {
    if (this.rows.has(c.prediction_id)) throw new Error(`COMMIT_IMMUTABLE: ${c.prediction_id}`);
    this.rows.set(c.prediction_id, Object.freeze({ ...c, quantiles: { ...c.quantiles } }));
    this.order.push(c.prediction_id);
  }

  replace(): never {
    throw new Error("COMMIT_LEDGER_IMMUTABLE");
  }

  get(id: string): Commitment | undefined {
    return this.rows.get(id);
  }

  all(): Commitment[] {
    return this.order.map((id) => this.rows.get(id)!);
  }

  pending(now: number): Commitment[] {
    return this.all().filter((c) => c.t + c.horizon > now);
  }

  mature(now: number): Commitment[] {
    return this.all().filter((c) => c.t + c.horizon <= now);
  }
}
