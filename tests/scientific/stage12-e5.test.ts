import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { EventDraft } from "../../src/lib/atlas/events/types.ts";
import { ShadowEngine, runE5 } from "../../src/lib/atlas/shadow/engine.ts";

function draft(partial: Partial<EventDraft> = {}): EventDraft {
  const t = partial.event_time ?? "2024-06-03T20:00:00.000Z";
  return {
    logicalId: partial.logicalId ?? "bar-1",
    event_time: t,
    availability_time: partial.availability_time ?? t,
    ingest_time: partial.ingest_time ?? t,
    revision_time: partial.revision_time ?? t,
    source: "synthetic",
    instrument_id: "inst_spy",
    contract_id: null,
    event_type: "bar.close",
    payload: partial.payload ?? { close: 100 },
    quality_flags: ["synthetic"],
  };
}

describe("Stage 12 E5 shadow-mode", () => {
  it("matches live and replay and never has order authority", () => {
    const drafts = [
      draft({ logicalId: "a", event_time: "2024-06-03T20:00:00.000Z", payload: { close: 100 } }),
      draft({ logicalId: "b", event_time: "2024-06-04T20:00:00.000Z", payload: { close: 101 } }),
    ];
    const report = runE5(drafts);
    assert.equal(report.liveReplayHashes.length, 2);
    assert.equal(report.orderAuthority, false);
    assert.equal(report.confirmationOpened, false);
    const sh = new ShadowEngine();
    assert.throws(() => sh.placeOrder(), /ORDER_AUTHORITY_DENIED/);
    assert.throws(() => sh.sendOrder(), /ORDER_AUTHORITY_DENIED/);
    assert.ok(sh.log.every((r) => !/order/i.test(JSON.stringify(r))));
  });

  it("fails closed on skew, gap, schema drift, and kill switch", () => {
    const sh = new ShadowEngine({ maxSkewMs: 1000, maxGapMs: 10_000 });
    assert.equal(
      sh.observe(
        draft({
          availability_time: "2024-06-03T20:00:00.000Z",
          ingest_time: "2024-06-03T20:00:05.000Z",
        }),
        "2024-06-03T20:00:05.000Z",
      ),
      "ABSTAIN",
    );
    assert.equal(sh.observe(draft({ payload: { px: 1 } })), "ABSTAIN");
    const ok = new ShadowEngine({ maxGapMs: 1000 });
    ok.observe(draft({ ingest_time: "2024-06-03T20:00:00.000Z" }), "2024-06-03T20:00:00.000Z");
    assert.equal(
      ok.observe(
        draft({
          logicalId: "later",
          event_time: "2024-06-05T20:00:00.000Z",
          availability_time: "2024-06-05T20:00:00.000Z",
          ingest_time: "2024-06-05T20:00:00.000Z",
        }),
        "2024-06-05T20:00:00.000Z",
      ),
      "ABSTAIN",
    );
    ok.kill("test");
    assert.equal(ok.observe(draft({ logicalId: "post" })), "HALT");
    assert.equal(ok.halted, true);
  });

  it("abstains on OOD closes after a train window", () => {
    const sh = new ShadowEngine({ oodZ: 3, maxGapMs: 1e15 });
    for (let i = 0; i < 10; i++) {
      const t = `2024-06-${String(3 + i).padStart(2, "0")}T20:00:00.000Z`;
      assert.equal(sh.observe(draft({ logicalId: `n${i}`, event_time: t, payload: { close: 100 + i * 0.1 } }), t), "OBSERVE");
    }
    const t = "2024-06-20T20:00:00.000Z";
    assert.equal(sh.observe(draft({ logicalId: "spike", event_time: t, payload: { close: 400 } }), t), "ABSTAIN");
    assert.ok(sh.log.some((r) => r.reason === "ood"));
  });
});
