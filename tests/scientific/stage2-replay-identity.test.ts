import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  EventRuntime,
  ImmutableEventLog,
  assertReadOnlyConnector,
  certifyLiveReplayIdentity,
  enumerateSessionDays,
  isWeekdayUtc,
  liveCutoffs,
  memoryConnector,
  replayCutoffs,
  sessionCloseUtc,
  type EventDraft,
} from "../../src/lib/atlas/index.ts";

function draft(partial: Partial<EventDraft> & Pick<EventDraft, "logicalId" | "event_type">): EventDraft {
  const t = partial.event_time ?? "2024-06-03T20:00:00.000Z";
  return {
    logicalId: partial.logicalId,
    event_time: t,
    availability_time: partial.availability_time ?? t,
    ingest_time: partial.ingest_time ?? t,
    revision_time: partial.revision_time ?? t,
    source: partial.source ?? "synthetic",
    instrument_id: partial.instrument_id ?? "inst_spy",
    contract_id: partial.contract_id ?? null,
    event_type: partial.event_type,
    payload: partial.payload ?? { px: 100 },
    quality_flags: partial.quality_flags ?? ["synthetic"],
  };
}

describe("Stage 2 event store and live/replay identity", () => {
  it("rejects in-place replace and delete", () => {
    const log = new ImmutableEventLog();
    const ev = log.append(draft({ logicalId: "bar-1", event_type: "bar.close" }));
    assert.throws(() => log.replace(0, ev), /IMMUTABLE/);
    assert.throws(() => log.delete(0), /IMMUTABLE/);
    assert.equal(log.length, 1);
    assert.equal(log.getBySequence(0).sequence_number, 0);
  });

  it("orders snapshots by availability_time then sequence", () => {
    const rt = new EventRuntime();
    rt.ingest(draft({
      logicalId: "b",
      event_type: "bar.close",
      availability_time: "2024-06-03T20:00:00.000Z",
      ingest_time: "2024-06-03T20:00:01.000Z",
      event_time: "2024-06-03T20:00:00.000Z",
    }));
    rt.ingest(draft({
      logicalId: "a",
      event_type: "bar.close",
      availability_time: "2024-06-03T19:00:00.000Z",
      ingest_time: "2024-06-03T20:00:02.000Z",
      event_time: "2024-06-03T19:00:00.000Z",
    }));
    const snap = rt.replaySnapshot("2024-06-03T21:00:00.000Z");
    assert.deepEqual(snap.events.map((e) => e.logicalId), ["a", "b"]);
  });

  it("excludes events that are not yet available or not yet ingested", () => {
    const rt = new EventRuntime();
    rt.ingest(draft({
      logicalId: "on-time",
      event_type: "bar.close",
      event_time: "2024-06-03T20:00:00.000Z",
      availability_time: "2024-06-03T20:00:00.000Z",
      ingest_time: "2024-06-03T20:00:00.000Z",
    }));
    rt.ingest(draft({
      logicalId: "future-available",
      event_type: "bar.close",
      event_time: "2024-06-04T20:00:00.000Z",
      availability_time: "2024-06-04T20:00:00.000Z",
      ingest_time: "2024-06-04T20:00:00.000Z",
    }));
    rt.ingest(draft({
      logicalId: "late",
      event_type: "quote.rev",
      event_time: "2024-06-03T19:00:00.000Z",
      availability_time: "2024-06-03T19:00:00.000Z",
      ingest_time: "2024-06-03T21:00:00.000Z",
      quality_flags: ["synthetic", "late"],
    }));
    const atClose = rt.replaySnapshot("2024-06-03T20:00:00.000Z");
    assert.deepEqual(atClose.events.map((e) => e.logicalId), ["on-time"]);
    const afterLate = rt.replaySnapshot("2024-06-03T21:00:00.000Z");
    assert.deepEqual(afterLate.events.map((e) => e.logicalId), ["late", "on-time"]);
  });

  it("keeps known-ahead catalysts whose event_time is still in the future", () => {
    const rt = new EventRuntime();
    rt.ingest(draft({
      logicalId: "fomc",
      event_type: "catalyst.scheduled",
      event_time: "2024-06-12T18:00:00.000Z",
      availability_time: "2024-06-01T00:00:00.000Z",
      ingest_time: "2024-06-01T00:00:00.000Z",
      payload: { kind: "fomc" },
    }));
    const snap = rt.replaySnapshot("2024-06-03T20:00:00.000Z");
    assert.equal(snap.events.length, 1);
    assert.equal(snap.events[0].logicalId, "fomc");
  });

  it("versions corrections instead of replacing history", () => {
    const rt = new EventRuntime();
    rt.ingest(draft({
      logicalId: "print-1",
      event_type: "bar.close",
      event_time: "2024-06-03T20:00:00.000Z",
      availability_time: "2024-06-03T20:00:00.000Z",
      ingest_time: "2024-06-03T20:00:00.000Z",
      payload: { close: 100 },
    }));
    rt.ingest(draft({
      logicalId: "print-1",
      event_type: "bar.close",
      event_time: "2024-06-03T20:00:00.000Z",
      availability_time: "2024-06-03T20:00:00.000Z",
      ingest_time: "2024-06-03T20:05:00.000Z",
      revision_time: "2024-06-03T20:05:00.000Z",
      payload: { close: 100.25 },
      quality_flags: ["synthetic", "revised"],
    }));
    assert.equal(rt.log.length, 2);
    assert.equal(rt.log.getBySequence(0).payload.close, 100);
    const before = rt.replaySnapshot("2024-06-03T20:00:00.000Z");
    assert.equal(before.events.length, 1);
    assert.equal(before.events[0].payload.close, 100);
    const after = rt.replaySnapshot("2024-06-03T20:05:00.000Z");
    assert.equal(after.events.length, 1);
    assert.equal(after.events[0].payload.close, 100.25);
    assert.notEqual(before.events[0].content_hash, after.events[0].content_hash);
  });

  it("incremental live and full-log replay match at every ingest cutoff", () => {
    const days = enumerateSessionDays("2024-06-03", 5);
    const drafts: EventDraft[] = days.map((day) => {
      const close = sessionCloseUtc(day);
      return draft({
        logicalId: `bar-${day}`,
        event_type: "bar.close",
        event_time: close,
        availability_time: close,
        ingest_time: close,
        payload: { close: 400 + day.length },
      });
    });
    drafts.push(draft({
      logicalId: "late-rev",
      event_type: "bar.close",
      event_time: sessionCloseUtc(days[1]),
      availability_time: sessionCloseUtc(days[1]),
      ingest_time: sessionCloseUtc(days[2]),
      revision_time: sessionCloseUtc(days[2]),
      payload: { close: 1 },
      quality_flags: ["synthetic", "late"],
    }));
    const cert = certifyLiveReplayIdentity(drafts);
    assert.equal(cert.hashes.length, drafts.length);
    const live = liveCutoffs(drafts);
    const replay = replayCutoffs(drafts);
    assert.equal(live.length, replay.length);
    for (let i = 0; i < live.length; i++) {
      assert.equal(live[i].contentHash, replay[i].contentHash);
    }
  });

  it("replaying the same stream twice is deterministic", () => {
    const drafts = [
      draft({ logicalId: "x", event_type: "bar.close", payload: { close: 10 } }),
      draft({
        logicalId: "x",
        event_type: "bar.close",
        ingest_time: "2024-06-03T20:01:00.000Z",
        revision_time: "2024-06-03T20:01:00.000Z",
        payload: { close: 11 },
        quality_flags: ["synthetic", "revised"],
      }),
    ];
    assert.equal(replayCutoffs(drafts)[1].contentHash, replayCutoffs(drafts)[1].contentHash);
  });

  it("read-only connector cannot declare order routing", () => {
    const conn = memoryConnector("synth", [
      draft({ logicalId: "z", event_type: "bar.close" }),
    ]);
    assertReadOnlyConnector(conn);
    assert.equal(conn.readOnly, true);
    assert.equal(conn.pull().length, 1);
    assert.throws(
      () => assertReadOnlyConnector({ name: "bad", placeOrder: () => undefined }),
      /NOT_READONLY/,
    );
    assert.ok(isWeekdayUtc("2024-06-03"));
    assert.equal(isWeekdayUtc("2024-06-08"), false);
  });
});
