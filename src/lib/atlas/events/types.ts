import { z } from "zod";
import { QualityFlagSchema } from "../schemas.ts";

const isoTime = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/);

export const StoredEventSchema = z.object({
  id: z.string().min(1),
  logicalId: z.string().min(1),
  event_time: isoTime,
  availability_time: isoTime,
  ingest_time: isoTime,
  revision_time: isoTime,
  source: z.string().min(1),
  instrument_id: z.string().nullable(),
  contract_id: z.string().nullable(),
  event_type: z.string().min(1),
  payload: z.record(z.string(), z.unknown()),
  quality_flags: z.array(QualityFlagSchema).min(1),
  sequence_number: z.number().int().nonnegative(),
  content_hash: z.string().regex(/^[0-9a-f]{64}$/),
});

export type StoredEvent = z.infer<typeof StoredEventSchema>;

export type EventDraft = Omit<StoredEvent, "id" | "sequence_number" | "content_hash">;

export type ClockMode = "replay" | "live";

/** Cutoff is time plus sequence so equal ingest timestamps stay ordered. */
export interface Watermark {
  time: string;
  sequence: number;
}

export interface PitSnapshot {
  cutoff: Watermark;
  mode: ClockMode;
  events: StoredEvent[];
  contentHash: string;
}

export const SNAPSHOT_TOLERANCE = 0;
