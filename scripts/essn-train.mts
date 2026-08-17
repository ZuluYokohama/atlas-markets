#!/usr/bin/env node
/**
 * Local ESSN weight training. Confirmation stays closed.
 *   node --experimental-strip-types scripts/essn-train.mts
 *   node --experimental-strip-types scripts/essn-train.mts --dataset development_f0 --epochs 20
 */
import { parseArgs } from "node:util";
import { seedGenome } from "../src/lib/atlas/essn/genome.ts";
import { trainLocal } from "../src/lib/atlas/essn/train.ts";
import { parseTrainPath } from "../src/lib/atlas/essn/trainPath.ts";

const { values } = parseArgs({
  options: {
    dataset: { type: "string", default: "synthetic_planted" },
    epochs: { type: "string", default: "40" },
    lr: { type: "string", default: "0.02" },
    batch: { type: "string", default: "16" },
    seed: { type: "string", default: "1414672201" },
  },
});

const path = parseTrainPath({
  dataset: values.dataset as "synthetic_planted" | "development_f0",
  epochs: Number(values.epochs),
  lr: Number(values.lr),
  batchSize: Number(values.batch),
  seed: Number(values.seed),
});

const report = trainLocal(path, seedGenome());
console.log(JSON.stringify(report, null, 2));
