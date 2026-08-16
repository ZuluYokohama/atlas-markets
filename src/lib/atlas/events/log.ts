import { contentHash, prefixedId } from "../hash.ts";
import { StoredEventSchema, type EventDraft, type StoredEvent } from "./types.ts";

export class ImmutableEventLog {
  private readonly rows: StoredEvent[] = [];

  get length(): number {
    return this.rows.length;
  }

  append(draft: EventDraft): StoredEvent {
    const sequence_number = this.rows.length;
    const body = {
      logicalId: draft.logicalId,
      event_time: draft.event_time,
      availability_time: draft.availability_time,
      ingest_time: draft.ingest_time,
      revision_time: draft.revision_time,
      source: draft.source,
      instrument_id: draft.instrument_id,
      contract_id: draft.contract_id,
      event_type: draft.event_type,
      payload: draft.payload,
      quality_flags: draft.quality_flags,
      sequence_number,
    };
    const event: StoredEvent = StoredEventSchema.parse({
      ...body,
      id: prefixedId("evt", body),
      content_hash: contentHash(body),
    });
    this.rows.push(event);
    return event;
  }

  getBySequence(seq: number): StoredEvent {
    const row = this.rows[seq];
    if (!row) throw new Error(`NO_SUCH_SEQUENCE: ${seq}`);
    return row;
  }

  all(): readonly StoredEvent[] {
    return this.rows;
  }

  /** Corrections are new appends. In-place rewrite is forbidden. */
  replace(_seq: number, _next: StoredEvent): never {
    throw new Error("EVENT_LOG_IMMUTABLE: corrections must be appended as new revisions");
  }

  delete(_seq: number): never {
    throw new Error("EVENT_LOG_IMMUTABLE: events cannot be deleted");
  }
}
