import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SPLIT } from "../../src/lib/atlas/eval/splits.ts";
import { buildWorkstationPayload } from "../../src/lib/atlas/session/build.ts";

describe("Stage 6 workstation payload", () => {
  const payload = buildWorkstationPayload();

  it("never ships confirmation indices", () => {
    assert.ok(payload.days.every((d) => d.index < SPLIT.confirmation.lo));
    assert.ok(payload.frames.every((f) => f.index < SPLIT.confirmation.lo));
    assert.ok(payload.maxIndex < SPLIT.confirmation.lo);
    assert.equal(payload.f0.confirmationOpened, false);
    assert.equal(payload.f0.claim, "UNSUPPORTED");
  });

  it("each frame only analogizes the past", () => {
    for (const frame of payload.frames) {
      assert.ok(frame.analogs.every((a) => a.index < frame.index));
    }
  });

  it("marks sparse cones unsupported rather than validated", () => {
    assert.ok(payload.frames.every((f) => f.cone.status !== "CERTIFIED"));
    assert.ok(payload.frames.some((f) => f.cone.n >= 8));
  });
});
