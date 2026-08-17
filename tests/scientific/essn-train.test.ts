import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { seedGenome } from "../../src/lib/atlas/essn/genome.ts";
import { trainLocal } from "../../src/lib/atlas/essn/train.ts";
import { DEFAULT_TRAIN_PATH, parseTrainPath } from "../../src/lib/atlas/essn/trainPath.ts";

describe("ESSN local training path", () => {
  it("trains CPU weights on planted data and refuses confirmation", () => {
    const path = parseTrainPath({ ...DEFAULT_TRAIN_PATH, epochs: 12, batchSize: 16 });
    const r = trainLocal(path, seedGenome());
    assert.equal(r.confirmationOpened, false);
    assert.equal(r.device, "cpu");
    assert.equal(r.claim, "TRAINED_LOCAL_WEIGHTS");
    assert.ok(r.params > 10);
    assert.ok(r.weightHash.length === 64);
    assert.ok(r.valPinball < 0.8);
    assert.throws(() => parseTrainPath({ confirmationOpened: true } as never), /CONFIRMATION/);
  });

  it("can train on development_f0 without opening confirmation", () => {
    const path = parseTrainPath({ dataset: "development_f0", epochs: 4, batchSize: 32, lr: 0.03 });
    const r = trainLocal(path, seedGenome());
    assert.equal(r.dataset, "development_f0");
    assert.equal(r.confirmationOpened, false);
    assert.ok(Number.isFinite(r.valPinball));
  });
});
