import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ALLOWED_TRANSITIONS,
  AnalysisResultSchema,
  CoordinateAxisSchema,
  EVIDENCE_STATES,
  FeatureDefinitionSchema,
  MarketEventSchema,
  PositionSchema,
  ProvenanceManifestSchema,
  REQUIRED_TYPE_SCHEMAS,
  assertCoordinateRole,
  assertTransition,
  buildAnalysisResult,
  buildProvenance,
  canonicalize,
  canTransition,
  contentHash,
  recordEvidenceTransition,
  runId,
  type EvidenceState,
} from "../../src/lib/atlas/index.ts";

const T = "2024-06-03T14:30:00.000Z";
const HASH = contentHash({ fixture: 1 });

const times = {
  event_time: T,
  availability_time: "2024-06-03T14:30:01.000Z",
  ingest_time: "2024-06-03T14:31:00.000Z",
  revision_time: "2024-06-03T14:31:00.000Z",
};

const source = {
  source: "synthetic.spy.v0",
  sourceKind: "synthetic" as const,
  licenseRef: null,
  attribution: "generated SEED 0x51f7a01d",
};

const fixtures: Record<keyof typeof REQUIRED_TYPE_SCHEMAS, unknown> = {
  Project: {
    id: "proj_atlas",
    name: "Atlas Markets",
    mission: "evidence-gated position-conditioned state geometry",
    edition: "local-research",
    createdAt: T,
  },
  Workspace: { id: "ws_1", projectId: "proj_atlas", name: "local", createdAt: T },
  Dataset: {
    id: "ds_spy_syn",
    workspaceId: "ws_1",
    name: "synthetic SPY",
    kind: "synthetic",
    instrumentUniverse: ["SPY"],
    redistributionAllowed: true,
  },
  DatasetVersion: {
    id: "dsv_1",
    datasetId: "ds_spy_syn",
    version: "0.1.0",
    contentHash: HASH,
    seed: 0x51f7a01d,
    splitPolicy: {
      development: "0-251",
      quarantine: "252-314",
      confirmation: "315-519",
      confirmationOpened: false,
    },
    createdAt: T,
  },
  MarketEvent: {
    id: "ev_1",
    ...times,
    source: "synthetic",
    instrumentId: "inst_spy",
    contractId: null,
    eventType: "bar.close",
    payload: { close: 478.2 },
    qualityFlags: ["synthetic"],
    sequenceNumber: 0,
    contentHash: HASH,
  },
  Instrument: { id: "inst_spy", symbol: "SPY", assetClass: "etf", multiplier: 1 },
  OptionContract: {
    id: "occ_1",
    instrumentId: "inst_spy",
    underlyingSymbol: "SPY",
    right: "call",
    strike: 480,
    expiration: "2024-06-21",
    occId: null,
    multiplier: 100,
  },
  OptionLeg: {
    id: "leg_1",
    contractId: "occ_1",
    right: "call",
    side: "buy",
    quantity: 1,
    strike: 480,
    expiration: "2024-06-21",
    logMoneyness: 0,
    tenorYears: 21 / 365,
    iv: 0.16,
    delta: 0.51,
    gamma: 0.02,
    vega: 0.12,
    theta: -0.04,
    spread: 0.08,
    liquidity: 1,
  },
  Position: {
    id: "pos_1",
    legs: [
      {
        id: "leg_1",
        contractId: "occ_1",
        right: "call",
        side: "buy",
        quantity: 1,
        strike: 480,
        expiration: "2024-06-21",
        logMoneyness: 0,
        tenorYears: 21 / 365,
        iv: 0.16,
        delta: 0.51,
        gamma: 0.02,
        vega: 0.12,
        theta: -0.04,
        spread: 0.08,
        liquidity: 1,
      },
    ],
    templateId: "long-call",
    hash: HASH,
    asOf: times,
  },
  PositionTemplate: {
    id: "tpl_long_call",
    name: "Long call",
    family: "directional",
    version: "1",
    description: "ATM call",
  },
  PositionTransportRule: {
    id: "tr_template_v1",
    version: "1",
    mode: "template",
    coordinates: ["log_moneyness", "option_tenor", "delta"],
    residualThreshold: 0.38,
    notes: "nearest contract under declared cost",
  },
  CoordinateAxis: {
    id: "ax_avail",
    name: "availability_time",
    role: "availability_time",
    units: "UTC",
    description: "earliest legal decision time",
    mustNotConfuseWith: ["event_time", "ingest_time"],
  },
  FeatureDefinition: {
    id: "feat_ret1",
    name: "ret1",
    definition: "close-to-close simple return",
    parameters: { window: 1 },
    lookback: 1,
    timeframe: "1d",
    availabilityRule: "bar_close",
    units: "1",
    family: "price",
    version: "1",
    sourceDependencies: ["bar.close"],
    coordinateAxisId: "ax_ret",
  },
  FeatureObservation: {
    id: "fo_1",
    ...times,
    featureDefinitionId: "feat_ret1",
    datasetVersionId: "dsv_1",
    value: 0.0012,
    qualityFlags: ["synthetic"],
    contentHash: HASH,
  },
  StrategyDefinition: {
    id: "strat_1",
    name: "iv-rv pullback",
    version: "1",
    dslHash: HASH,
    predicates: [
      {
        id: "p1",
        from: "UNSEEN",
        to: "SCANNED",
        label: "universe",
        fields: ["symbol"],
      },
    ],
  },
  StrategyState: {
    id: "ss_1",
    ...times,
    strategyDefinitionId: "strat_1",
    state: "SCANNED",
    note: "in universe",
  },
  OutcomeDefinition: {
    id: "out_pnl_5d",
    name: "net pnl 5 sessions",
    family: "net_pnl",
    horizon: "5d",
    units: "USD",
    costModelId: "cost_half_spread",
  },
  ExperimentProtocol: {
    id: "F0-position-state-vs-baselines-v0",
    name: "F0",
    version: "0",
    datasetVersionId: "dsv_1",
    confirmationOpened: false,
    metrics: ["pinball"],
    killCriteria: ["touch confirmation"],
    contentHash: HASH,
  },
  Trial: {
    id: "trial_1",
    protocolId: "F0-position-state-vs-baselines-v0",
    model: "unconditional",
    configuration: { k: 0 },
    seed: 1,
    abandoned: false,
    split: "development",
    metrics: null,
  },
  ModelRun: {
    id: "mr_1",
    trialId: "trial_1",
    protocolId: "F0-position-state-vs-baselines-v0",
    datasetVersionId: "dsv_1",
    codeVersion: "git:c8b2722",
    seed: 1,
    startedAt: T,
  },
  GraphRun: {
    id: "gr_1",
    datasetVersionId: "dsv_1",
    constructionFeatureFamily: "price",
    vertexCount: 0,
    edgeCount: 0,
    contentHash: HASH,
  },
  ConnectionRun: {
    id: "cr_1",
    graphRunId: "gr_1",
    stalkRank: 2,
    group: "SO",
    contentHash: HASH,
  },
  TopologyRun: {
    id: "top_1",
    datasetVersionId: "dsv_1",
    window: 24,
    filtration: "vietoris-rips",
    backend: "none",
    contentHash: HASH,
  },
  NullExperiment: {
    id: "null_1",
    kind: "integrable_connection_noise",
    justification: "E2 primary null",
    seed: 3,
    protocolId: "E2-v0",
  },
  Certificate: {
    id: "cert_1",
    name: "schema-roundtrip",
    status: "CERTIFIED",
    details: "Stage 1 serialization",
    numeric: {},
  },
  Claim: {
    id: "claim_1",
    statement: "Three transports are distinct maps.",
    status: "EXACT",
    gate: "E0",
    limitations: "Definitional.",
    protocolId: null,
  },
  EvidenceEntry: {
    id: "ee_1",
    claimId: "claim_1",
    fromStatus: "SPECULATIVE",
    toStatus: "EXACT",
    reason: "definitional identity",
    artifactIds: [],
    recordedAt: T,
  },
  Artifact: {
    id: "art_1",
    kind: "schema",
    path: "src/lib/atlas/schemas.ts",
    contentHash: HASH,
    createdAt: T,
  },
  ProvenanceManifest: {
    id: "prov_1",
    datasetVersionId: "dsv_1",
    codeVersion: "git:c8b2722",
    configuration: { horizon: "5d" },
    configHash: HASH,
    seed: 0x51f7a01d,
    coordinateAxisIds: ["ax_avail"],
    source,
    protocolId: "F0-position-state-vs-baselines-v0",
    runId: HASH,
  },
};

describe("Stage 1 schemas", () => {
  it("serializes and round-trips every required type", () => {
    const names = Object.keys(REQUIRED_TYPE_SCHEMAS) as (keyof typeof REQUIRED_TYPE_SCHEMAS)[];
    assert.equal(names.length, 29);
    for (const name of names) {
      const schema = REQUIRED_TYPE_SCHEMAS[name];
      const parsed = schema.parse(fixtures[name]);
      const again = schema.parse(JSON.parse(JSON.stringify(parsed)));
      assert.deepEqual(again, parsed, name);
    }
  });

  it("run IDs are immutable content hashes of the scientific tuple", () => {
    const a = runId({
      dataVersionId: "dsv_1",
      codeVersion: "git:abc",
      config: { b: 2, a: 1 },
      seed: 7,
      protocolId: "F0-v0",
    });
    const b = runId({
      dataVersionId: "dsv_1",
      codeVersion: "git:abc",
      config: { a: 1, b: 2 },
      seed: 7,
      protocolId: "F0-v0",
    });
    const c = runId({
      dataVersionId: "dsv_1",
      codeVersion: "git:abc",
      config: { a: 1, b: 2 },
      seed: 8,
      protocolId: "F0-v0",
    });
    assert.match(a, /^[0-9a-f]{64}$/);
    assert.equal(a, b);
    assert.notEqual(a, c);
  });

  it("content hashing is key-order invariant", () => {
    assert.equal(canonicalize({ z: 1, a: { y: 2, x: 3 } }), canonicalize({ a: { x: 3, y: 2 }, z: 1 }));
    assert.equal(contentHash({ z: 1, a: 2 }), contentHash({ a: 2, z: 1 }));
  });

  it("allows declared evidence transitions and rejects prohibited ones", () => {
    assert.equal(canTransition("SPECULATIVE", "DESCRIPTIVE"), true);
    assert.equal(canTransition("DESCRIPTIVE", "VALIDATED"), true);
    assert.equal(canTransition("INCONCLUSIVE", "VALIDATED"), false);
    assert.equal(canTransition("SPECULATIVE", "VALIDATED"), false);
    assert.equal(canTransition("UNSUPPORTED", "VALIDATED"), false);
    assert.equal(canTransition("FAILED_CHECK", "CERTIFIED"), false);
    assert.equal(canTransition("DESCRIPTIVE", "EXACT"), false);
    assert.equal(canTransition("VALIDATED", "EXACT"), false);
    assert.doesNotThrow(() => assertTransition("SPECULATIVE", "EXACT"));
    assert.throws(() => assertTransition("UNSUPPORTED", "VALIDATED"), /PROHIBITED/);
    assert.throws(() => recordEvidenceTransition({
      claimId: "c",
      from: "FAILED_CHECK",
      to: "VALIDATED",
      reason: "no",
      artifactIds: [],
      recordedAt: T,
    }), /PROHIBITED/);
    for (const s of EVIDENCE_STATES) {
      assert.equal(ALLOWED_TRANSITIONS[s as EvidenceState].includes(s), true);
    }
  });

  it("refuses an analysis result without required provenance fields", () => {
    const prov = buildProvenance({
      datasetVersionId: "dsv_1",
      codeVersion: "git:c8b2722",
      configuration: { horizon: "5d" },
      seed: 1,
      coordinateAxisIds: ["ax_avail"],
      source,
      protocolId: "F0-v0",
    });
    const ok = buildAnalysisResult({
      provenance: prov,
      evidenceStatus: "DESCRIPTIVE",
      claimIds: ["c1"],
      summary: "round-trip",
    });
    assert.equal(ok.provenance.datasetVersionId, "dsv_1");
    assert.equal(ok.provenance.codeVersion, "git:c8b2722");
    assert.ok(ok.provenance.configuration);
    assert.equal(ok.provenance.seed, 1);
    assert.ok(ok.coordinateAxisIds.length >= 1);
    assert.equal(ok.evidenceStatus, "DESCRIPTIVE");
    assert.equal(ok.provenance.source.attribution.length > 0, true);

    assert.throws(() => ProvenanceManifestSchema.parse({ ...prov, datasetVersionId: "" }));
    assert.throws(() => ProvenanceManifestSchema.parse({ ...prov, codeVersion: "" }));
    assert.throws(() => ProvenanceManifestSchema.parse({ ...prov, seed: undefined }));
    assert.throws(() => ProvenanceManifestSchema.parse({ ...prov, coordinateAxisIds: [] }));
    assert.throws(() => AnalysisResultSchema.parse({ ...ok, evidenceStatus: "PENDING" }));
    assert.throws(() => AnalysisResultSchema.parse({ ...ok, provenance: { ...prov, source: { ...source, attribution: "" } } }));
  });

  it("rejects documented coordinate-role confusions", () => {
    assert.throws(() => assertCoordinateRole("event_time", "availability_time"), /COORDINATE_ROLE_CONFUSION/);
    assert.throws(() => assertCoordinateRole("option_tenor", "forecast_horizon"), /COORDINATE_ROLE_CONFUSION/);
    assert.throws(() => assertCoordinateRole("log_moneyness", "raw_strike"), /COORDINATE_ROLE_CONFUSION/);
    assert.throws(() => assertCoordinateRole("filtration_epsilon", "event_time"), /COORDINATE_ROLE_CONFUSION/);
    assert.doesNotThrow(() => assertCoordinateRole("event_time", "event_time"));
    assert.throws(() =>
      CoordinateAxisSchema.parse({
        id: "bad",
        name: "event_time",
        role: "ingest_time",
        units: "UTC",
        description: "wrong",
        mustNotConfuseWith: [],
      }),
    );
  });

  it("feature definitions require Stage-4 metadata fields up front", () => {
    const base = fixtures.FeatureDefinition as Record<string, unknown>;
    for (const key of [
      "definition",
      "parameters",
      "lookback",
      "timeframe",
      "availabilityRule",
      "units",
      "family",
      "version",
      "sourceDependencies",
    ]) {
      const copy = { ...base };
      delete copy[key];
      assert.throws(() => FeatureDefinitionSchema.parse(copy), new RegExp("."));
    }
  });

  it("market events require the four time fields plus source and quality", () => {
    const ev = fixtures.MarketEvent as Record<string, unknown>;
    assert.throws(() => MarketEventSchema.parse({ ...ev, availability_time: undefined }));
    assert.throws(() => MarketEventSchema.parse({ ...ev, qualityFlags: [] }));
    assert.doesNotThrow(() => MarketEventSchema.parse(ev));
  });

  it("position hash and legs are required; empty legs fail", () => {
    const p = fixtures.Position as Record<string, unknown>;
    assert.throws(() => PositionSchema.parse({ ...p, legs: [] }));
  });
});
