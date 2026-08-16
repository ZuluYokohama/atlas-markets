import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  EventRuntime,
  FEATURE_CATALOG,
  auditRedundancy,
  catalogByName,
  computeFeatureFrame,
  enumerateSessionDays,
  frameHash,
  requiredFamilies,
  sessionCloseUtc,
  type EventDraft,
} from "../../src/lib/atlas/index.ts";

function barDraft(day: string, close: number, extra: Partial<EventDraft> = {}): EventDraft {
  const t = sessionCloseUtc(day);
  return {
    logicalId: `bar-${day}`,
    event_time: t,
    availability_time: extra.availability_time ?? t,
    ingest_time: extra.ingest_time ?? t,
    revision_time: extra.revision_time ?? t,
    source: "synthetic",
    instrument_id: "inst_spy",
    contract_id: null,
    event_type: "bar.close",
    payload: {
      open: close * 0.999,
      high: close * 1.004,
      low: close * 0.996,
      close,
      volume: 1e6 + close,
      listed: true,
    },
    quality_flags: extra.quality_flags ?? ["synthetic"],
  };
}

function valueOf(name: string, obs: ReturnType<typeof computeFeatureFrame>): number | null {
  const def = catalogByName(name);
  return obs.find((o) => o.featureDefinitionId === def.id)?.value ?? null;
}

describe("Stage 4 feature DAG and time semantics", () => {
  it("catalog covers every required family with complete metadata", () => {
    const families = new Set(FEATURE_CATALOG.map((f) => f.family));
    for (const fam of [
      "price",
      "trend",
      "momentum",
      "range_volatility",
      "volume",
      "microstructure",
      "volatility_surface",
      "options_exposure",
      "catalyst",
      "calendar",
      "strategy",
    ]) {
      assert.ok(families.has(fam as never), fam);
    }
    for (const f of FEATURE_CATALOG) {
      assert.ok(f.definition.length > 0);
      assert.ok(f.version);
      assert.ok(f.sourceDependencies.length >= 1);
      assert.ok(f.availabilityRule);
      assert.ok(f.units);
      assert.ok(Number.isInteger(f.lookback));
    }
    assert.ok(requiredFamilies().includes("price"));
  });

  it("does not look ahead: later bars leave earlier feature hashes unchanged", () => {
    const days = enumerateSessionDays("2024-06-03", 40);
    const earlyRt = new EventRuntime();
    days.slice(0, 25).forEach((d, i) => earlyRt.ingest(barDraft(d, 100 + i * 0.2)));
    const fullRt = new EventRuntime();
    days.forEach((d, i) => fullRt.ingest(barDraft(d, 100 + i * 0.2)));
    const early = earlyRt.replaySnapshot(sessionCloseUtc(days[24]), 24);
    const fromFull = fullRt.replaySnapshot(sessionCloseUtc(days[24]), 24);
    assert.equal(
      frameHash(computeFeatureFrame(early, { datasetVersionId: "dsv_1" })),
      frameHash(computeFeatureFrame(fromFull, { datasetVersionId: "dsv_1" })),
    );
  });

  it("weekly return is missing mid-week and present on Friday close", () => {
    const days = enumerateSessionDays("2024-06-03", 12);
    const rt = new EventRuntime();
    days.forEach((d, i) => rt.ingest(barDraft(d, 100 + i)));
    const wed = days.find((d) => new Date(d + "T00:00:00.000Z").getUTCDay() === 3)!;
    const fri = days.filter((d) => new Date(d + "T00:00:00.000Z").getUTCDay() === 5)[1];
    const iWed = days.indexOf(wed);
    const iFri = days.indexOf(fri);
    const mid = computeFeatureFrame(rt.replaySnapshot(sessionCloseUtc(wed), iWed), { datasetVersionId: "dsv_1" });
    const end = computeFeatureFrame(rt.replaySnapshot(sessionCloseUtc(fri), iFri), { datasetVersionId: "dsv_1" });
    assert.equal(valueOf("weekly_ret", mid), null);
    assert.ok(valueOf("weekly_ret", end) != null);
  });

  it("insufficient lookback and missing surface stay null", () => {
    const days = enumerateSessionDays("2024-06-03", 5);
    const rt = new EventRuntime();
    days.forEach((d, i) => rt.ingest(barDraft(d, 100 + i)));
    const obs = computeFeatureFrame(rt.replaySnapshot(sessionCloseUtc(days[4]), 4), { datasetVersionId: "dsv_1" });
    assert.equal(valueOf("sma_20", obs), null);
    assert.equal(valueOf("atm_iv", obs), null);
    assert.equal(valueOf("net_delta", obs), null);
    assert.ok(valueOf("ret_1d", obs) != null);
  });

  it("a revised bar changes the feature only after the revision watermark", () => {
    const days = enumerateSessionDays("2024-06-03", 25);
    const rt = new EventRuntime();
    days.forEach((d, i) => rt.ingest(barDraft(d, 100 + i * 0.1)));
    const target = days[24];
    const before = computeFeatureFrame(rt.replaySnapshot(sessionCloseUtc(target), 24), { datasetVersionId: "dsv_1" });
    const revIngest = sessionCloseUtc(target).replace("20:00:00.000Z", "21:00:00.000Z");
    rt.ingest({
      ...barDraft(target, 140),
      ingest_time: revIngest,
      revision_time: revIngest,
      quality_flags: ["synthetic", "revised"],
    });
    const stillOld = computeFeatureFrame(rt.replaySnapshot(sessionCloseUtc(target), 24), { datasetVersionId: "dsv_1" });
    const after = computeFeatureFrame(rt.replaySnapshot(revIngest, 25), { datasetVersionId: "dsv_1" });
    assert.equal(valueOf("log_close", before), valueOf("log_close", stillOld));
    assert.notEqual(valueOf("log_close", before), valueOf("log_close", after));
    assert.ok(Math.abs((valueOf("log_close", after) ?? 0) - Math.log(140)) < 1e-12);
  });

  it("flags duplicate formulas and emits a redundancy audit", () => {
    const dups = FEATURE_CATALOG.filter((f) => f.name === "sma_20" || f.name === "sma_20_alias");
    assert.equal(dups[0].formulaHash, dups[1].formulaHash);
    const days = enumerateSessionDays("2024-06-03", 40);
    const rt = new EventRuntime();
    days.forEach((d, i) => rt.ingest(barDraft(d, 100 + Math.sin(i / 3) * 2 + i * 0.05)));
    const series: Record<string, number[]> = { ret_1d: [], sma_20: [], rsi_14: [], hl_range: [], dow: [] };
    for (let i = 20; i < 40; i++) {
      const obs = computeFeatureFrame(rt.replaySnapshot(sessionCloseUtc(days[i]), i), { datasetVersionId: "dsv_1" });
      for (const name of Object.keys(series)) {
        const v = valueOf(name, obs);
        if (v == null) throw new Error(`missing ${name} at ${days[i]}`);
        series[name].push(v);
      }
    }
    const report = auditRedundancy(series);
    assert.ok(report.duplicateFormulas.some((d) => d.names.includes("sma_20") && d.names.includes("sma_20_alias")));
    assert.ok(report.conditionNumber == null || report.conditionNumber >= 1);
    assert.ok(report.pcaExplained.length >= 1);
    assert.equal(report.pairwise.length, report.names.length);
  });
});
