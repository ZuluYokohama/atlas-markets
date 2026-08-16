import { z } from "zod";
import { contentHash } from "../hash.ts";
import { EventRuntime, certifyLiveReplayIdentity } from "../events/runtime.ts";
import { StoredEventSchema, type EventDraft } from "../events/types.ts";

export type ShadowDecision = "OBSERVE" | "ABSTAIN" | "HALT";

export interface ShadowRecord {
  t: string;
  decision: ShadowDecision;
  reason: string;
  evidence: "DESCRIPTIVE" | "UNSUPPORTED" | "OUT_OF_SCOPE";
  payloadHash: string;
}

export interface ShadowConfig {
  maxSkewMs: number;
  maxGapMs: number;
  oodZ: number;
}

const DEFAULT: ShadowConfig = { maxSkewMs: 2_000, maxGapMs: 86_400_000, oodZ: 4 };

const PayloadSchema = z.object({
  close: z.number().finite(),
  session: z.number().int().nonnegative().optional(),
});

export class ShadowEngine {
  readonly runtime = new EventRuntime();
  readonly log: ShadowRecord[] = [];
  private killed = false;
  private lastIngestMs: number | null = null;
  private readonly train: number[] = [];
  readonly config: ShadowConfig;

  constructor(config: Partial<ShadowConfig> = {}) {
    this.config = { ...DEFAULT, ...config };
  }

  kill(reason = "operator"): void {
    this.killed = true;
    this.record("HALT", `kill-switch:${reason}`, "OUT_OF_SCOPE", "{}");
  }

  get halted(): boolean {
    return this.killed;
  }

  /** There is no order path. Naming is the safety surface. */
  placeOrder(): never {
    throw new Error("ORDER_AUTHORITY_DENIED");
  }

  sendOrder(): never {
    throw new Error("ORDER_AUTHORITY_DENIED");
  }

  observe(draft: EventDraft, wallClockIso?: string): ShadowDecision {
    if (this.killed) {
      this.record("HALT", "killed", "OUT_OF_SCOPE", "{}");
      return "HALT";
    }

    const wall = Date.parse(wallClockIso ?? draft.ingest_time);
    const avail = Date.parse(draft.availability_time);
    if (!Number.isFinite(wall) || !Number.isFinite(avail)) {
      return this.fail("bad-timestamp");
    }
    if (Math.abs(wall - avail) > this.config.maxSkewMs) {
      return this.fail("clock-skew");
    }
    if (this.lastIngestMs != null && wall - this.lastIngestMs > this.config.maxGapMs) {
      return this.fail("feed-gap");
    }

    const parsed = PayloadSchema.safeParse(draft.payload);
    if (!parsed.success) {
      return this.fail("schema-drift");
    }
    if (draft.revision_time < draft.event_time) {
      return this.fail("late-revision-order");
    }

    const parsedEvent = StoredEventSchema.omit({
      id: true,
      sequence_number: true,
      content_hash: true,
    }).safeParse(draft);
    if (!parsedEvent.success) {
      return this.fail("event-schema");
    }

    this.runtime.ingest(draft);
    this.lastIngestMs = wall;

    const close = parsed.data.close;
    if (this.train.length >= 8) {
      const mu = this.train.reduce((s, v) => s + v, 0) / this.train.length;
      const sd =
        Math.sqrt(this.train.reduce((s, v) => s + (v - mu) ** 2, 0) / this.train.length) || 1;
      if (Math.abs(close - mu) / sd > this.config.oodZ) {
        this.record("ABSTAIN", "ood", "UNSUPPORTED", JSON.stringify({ close }));
        this.train.push(close);
        return "ABSTAIN";
      }
    }
    this.train.push(close);
    this.record("OBSERVE", "ok", "DESCRIPTIVE", JSON.stringify({ close }));
    return "OBSERVE";
  }

  private fail(reason: string): ShadowDecision {
    this.record("ABSTAIN", reason, "UNSUPPORTED", "{}");
    return "ABSTAIN";
  }

  private record(
    decision: ShadowDecision,
    reason: string,
    evidence: ShadowRecord["evidence"],
    payload: string,
  ): void {
    if (/"order"|placeOrder|broker/i.test(payload)) {
      throw new Error("SHADOW_LOG_FORBIDDEN_FIELD");
    }
    this.log.push({
      t: new Date().toISOString(),
      decision,
      reason,
      evidence,
      payloadHash: contentHash(payload),
    });
  }
}

export function runE5(drafts: EventDraft[]) {
  const liveReplay = certifyLiveReplayIdentity(drafts);
  const shadow = new ShadowEngine();
  for (const d of drafts) shadow.observe(d, d.ingest_time);
  return {
    protocolId: "E5-shadow-v0" as const,
    confirmationOpened: false as const,
    orderAuthority: false as const,
    liveReplayHashes: liveReplay.hashes,
    observed: shadow.log.filter((r) => r.decision === "OBSERVE").length,
    abstained: shadow.log.filter((r) => r.decision === "ABSTAIN").length,
    halted: shadow.halted,
    claim: "CERTIFIED_SHADOW_FAIL_CLOSED" as const,
  };
}
