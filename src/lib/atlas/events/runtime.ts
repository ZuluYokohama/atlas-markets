import { VirtualClock } from "./clock.ts";
import { ImmutableEventLog } from "./log.ts";
import { assertSnapshotsEqual, buildSnapshot } from "./snapshot.ts";
import type { EventDraft, PitSnapshot, Watermark } from "./types.ts";

export class EventRuntime {
  readonly log = new ImmutableEventLog();

  ingest(draft: EventDraft): void {
    this.log.append(draft);
  }

  replaySnapshot(time: string, sequence?: number): PitSnapshot {
    const seq = sequence ?? this.log.length - 1;
    const cutoff: Watermark = { time, sequence: seq };
    return buildSnapshot(this.log.all(), cutoff, "replay");
  }

  ingestLive(draft: EventDraft): PitSnapshot {
    const event = this.log.append(draft);
    return buildSnapshot(
      this.log.all(),
      { time: event.ingest_time, sequence: event.sequence_number },
      "live",
    );
  }
}

export function replayCutoffs(drafts: EventDraft[]): PitSnapshot[] {
  const rt = new EventRuntime();
  for (const d of drafts) rt.ingest(d);
  return drafts.map((d, i) => rt.replaySnapshot(d.ingest_time, i));
}

export function liveCutoffs(drafts: EventDraft[]): PitSnapshot[] {
  const rt = new EventRuntime();
  return drafts.map((d) => rt.ingestLive(d));
}

export function certifyLiveReplayIdentity(drafts: EventDraft[]): {
  cutoffs: Watermark[];
  hashes: string[];
} {
  const live = liveCutoffs(drafts);
  const replay = replayCutoffs(drafts);
  if (live.length !== replay.length) {
    throw new Error(`LIVE_REPLAY_DIVERGENCE: length ${live.length} vs ${replay.length}`);
  }
  const hashes: string[] = [];
  const cutoffs: Watermark[] = [];
  for (let i = 0; i < live.length; i++) {
    assertSnapshotsEqual(live[i], replay[i]);
    cutoffs.push(live[i].cutoff);
    hashes.push(live[i].contentHash);
  }
  return { cutoffs, hashes };
}

export function createLiveClock(startIso: string): VirtualClock {
  return new VirtualClock("live", startIso);
}
