import { contentHash } from "../hash.ts";
import type { ClockMode, PitSnapshot, StoredEvent, Watermark } from "./types.ts";

export function compareAdmissionOrder(a: StoredEvent, b: StoredEvent): number {
  if (a.availability_time < b.availability_time) return -1;
  if (a.availability_time > b.availability_time) return 1;
  return a.sequence_number - b.sequence_number;
}

export function isVisibleAt(event: StoredEvent, cutoff: Watermark): boolean {
  if (event.sequence_number > cutoff.sequence) return false;
  if (event.availability_time > cutoff.time) return false;
  if (event.ingest_time > cutoff.time) return false;
  return true;
}

export function visibleEvents(log: readonly StoredEvent[], cutoff: Watermark): StoredEvent[] {
  const latest = new Map<string, StoredEvent>();
  for (const event of log) {
    if (!isVisibleAt(event, cutoff)) continue;
    const prev = latest.get(event.logicalId);
    if (!prev || event.sequence_number > prev.sequence_number) {
      latest.set(event.logicalId, event);
    }
  }
  return [...latest.values()].sort(compareAdmissionOrder);
}

export function buildSnapshot(
  log: readonly StoredEvent[],
  cutoff: Watermark,
  mode: ClockMode,
): PitSnapshot {
  const events = visibleEvents(log, cutoff);
  return {
    cutoff,
    mode,
    events,
    contentHash: contentHash({
      time: cutoff.time,
      sequence: cutoff.sequence,
      ids: events.map((e) => e.content_hash),
      logical: events.map((e) => e.logicalId),
    }),
  };
}

export function assertSnapshotsEqual(a: PitSnapshot, b: PitSnapshot): void {
  if (a.contentHash !== b.contentHash) {
    throw new Error(
      `LIVE_REPLAY_DIVERGENCE: ${a.cutoff.time}#${a.cutoff.sequence} live=${a.contentHash} replay=${b.contentHash}`,
    );
  }
}
