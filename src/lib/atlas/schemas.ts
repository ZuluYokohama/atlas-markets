import { z } from "zod";
import { COORDINATE_ROLES, assertCoordinateRole, type CoordinateRole } from "./coordinates.ts";
import { EVIDENCE_STATES } from "./evidence.ts";

const isoTime = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/, {
  message: "timestamp must be UTC ISO-8601",
});

const hex64 = z.string().regex(/^[0-9a-f]{64}$/);
const nonempty = z.string().min(1);

export const EvidenceStateSchema = z.enum(EVIDENCE_STATES);
export const CoordinateRoleSchema = z.enum(COORDINATE_ROLES);

export const QualityFlagSchema = z.enum([
  "ok",
  "stale",
  "revised",
  "missing",
  "synthetic",
  "estimated",
  "late",
  "suspect",
]);

export const TimeSemanticsSchema = z.object({
  event_time: isoTime,
  availability_time: isoTime,
  ingest_time: isoTime,
  revision_time: isoTime,
});

export const SourceAttributionSchema = z.object({
  source: nonempty,
  sourceKind: z.enum(["synthetic", "vendor", "user", "derived", "literature"]),
  licenseRef: z.string().nullable(),
  attribution: nonempty,
});

export const ProjectSchema = z.object({
  id: nonempty,
  name: nonempty,
  mission: nonempty,
  edition: z.literal("local-research"),
  createdAt: isoTime,
});

export const WorkspaceSchema = z.object({
  id: nonempty,
  projectId: nonempty,
  name: nonempty,
  createdAt: isoTime,
});

export const DatasetSchema = z.object({
  id: nonempty,
  workspaceId: nonempty,
  name: nonempty,
  kind: z.enum(["synthetic", "user_supplied", "vendor"]),
  instrumentUniverse: z.array(nonempty).min(1),
  redistributionAllowed: z.boolean(),
});

export const DatasetVersionSchema = z.object({
  id: nonempty,
  datasetId: nonempty,
  version: nonempty,
  contentHash: hex64,
  seed: z.union([z.number().int(), z.string()]).nullable(),
  splitPolicy: z.object({
    development: z.string(),
    quarantine: z.string(),
    confirmation: z.string(),
    confirmationOpened: z.boolean(),
  }),
  createdAt: isoTime,
});

export const InstrumentSchema = z.object({
  id: nonempty,
  symbol: nonempty,
  assetClass: z.enum(["equity", "etf", "index", "future", "fx"]),
  multiplier: z.number().positive(),
});

export const OptionContractSchema = z.object({
  id: nonempty,
  instrumentId: nonempty,
  underlyingSymbol: nonempty,
  right: z.enum(["call", "put"]),
  strike: z.number().positive(),
  expiration: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  occId: z.string().nullable(),
  multiplier: z.number().positive(),
});

export const MarketEventSchema = TimeSemanticsSchema.extend({
  id: nonempty,
  source: nonempty,
  instrumentId: nonempty.nullable(),
  contractId: nonempty.nullable(),
  eventType: nonempty,
  payload: z.record(z.string(), z.unknown()),
  qualityFlags: z.array(QualityFlagSchema).min(1),
  sequenceNumber: z.number().int().nonnegative(),
  contentHash: hex64,
});

export const OptionLegSchema = z.object({
  id: nonempty,
  contractId: nonempty.nullable(),
  right: z.enum(["call", "put"]),
  side: z.enum(["buy", "sell"]),
  quantity: z.number().refine((q) => q !== 0, "quantity must be nonzero"),
  strike: z.number().positive(),
  expiration: z.string(),
  logMoneyness: z.number(),
  tenorYears: z.number().nonnegative(),
  iv: z.number().nonnegative().nullable(),
  delta: z.number().nullable(),
  gamma: z.number().nullable(),
  vega: z.number().nullable(),
  theta: z.number().nullable(),
  spread: z.number().nonnegative().nullable(),
  liquidity: z.number().nullable(),
});

export const PositionSchema = z.object({
  id: nonempty,
  legs: z.array(OptionLegSchema).min(1),
  templateId: nonempty.nullable(),
  hash: hex64,
  asOf: TimeSemanticsSchema,
});

export const PositionTemplateSchema = z.object({
  id: nonempty,
  name: nonempty,
  family: nonempty,
  version: nonempty,
  description: nonempty,
});

export const PositionTransportRuleSchema = z.object({
  id: nonempty,
  version: nonempty,
  mode: z.enum(["contract", "template", "exposure"]),
  coordinates: z.array(CoordinateRoleSchema).min(1),
  residualThreshold: z.number().nonnegative(),
  notes: nonempty,
});

export const CoordinateAxisSchema = z
  .object({
    id: nonempty,
    name: nonempty,
    role: CoordinateRoleSchema,
    units: nonempty,
    description: nonempty,
    mustNotConfuseWith: z.array(CoordinateRoleSchema),
  })
  .superRefine((axis, ctx) => {
    try {
      assertCoordinateRole(axis.name, axis.role as CoordinateRole);
    } catch (err) {
      ctx.addIssue({
        code: "custom",
        message: err instanceof Error ? err.message : "coordinate role invalid",
      });
    }
  });

export const FeatureDefinitionSchema = z.object({
  id: nonempty,
  name: nonempty,
  definition: nonempty,
  parameters: z.record(z.string(), z.unknown()),
  lookback: z.number().int().nonnegative(),
  timeframe: nonempty,
  availabilityRule: nonempty,
  units: nonempty,
  family: z.enum([
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
  ]),
  version: nonempty,
  sourceDependencies: z.array(nonempty).min(1),
  coordinateAxisId: nonempty,
});

export const FeatureObservationSchema = TimeSemanticsSchema.extend({
  id: nonempty,
  featureDefinitionId: nonempty,
  datasetVersionId: nonempty,
  value: z.number().nullable(),
  qualityFlags: z.array(QualityFlagSchema).min(1),
  contentHash: hex64,
});

export const StrategyAutomatonStateSchema = z.enum([
  "UNSEEN",
  "SCANNED",
  "QUALIFIED",
  "FORMING",
  "ELIGIBLE",
  "TRIGGERED",
  "MANAGED",
  "EXITED",
  "INVALIDATED",
  "EXPIRED",
]);

export const StrategyDefinitionSchema = z.object({
  id: nonempty,
  name: nonempty,
  version: nonempty,
  dslHash: hex64,
  predicates: z.array(
    z.object({
      id: nonempty,
      from: StrategyAutomatonStateSchema,
      to: StrategyAutomatonStateSchema,
      label: nonempty,
      fields: z.array(nonempty),
    }),
  ),
});

export const StrategyStateSchema = TimeSemanticsSchema.extend({
  id: nonempty,
  strategyDefinitionId: nonempty,
  state: StrategyAutomatonStateSchema,
  note: z.string(),
});

export const OutcomeDefinitionSchema = z.object({
  id: nonempty,
  name: nonempty,
  family: z.enum([
    "net_pnl",
    "forward_return",
    "realized_variance",
    "mfe",
    "mae",
    "max_drawdown",
    "barrier_touch",
    "regime_transition",
    "surface_change",
    "option_pnl",
    "hedging_error",
    "liquidity_deterioration",
  ]),
  horizon: nonempty,
  units: nonempty,
  costModelId: nonempty.nullable(),
});

export const ExperimentProtocolSchema = z.object({
  id: nonempty,
  name: nonempty,
  version: nonempty,
  datasetVersionId: nonempty,
  confirmationOpened: z.boolean(),
  metrics: z.array(nonempty).min(1),
  killCriteria: z.array(nonempty).min(1),
  contentHash: hex64,
});

export const TrialSchema = z.object({
  id: nonempty,
  protocolId: nonempty,
  model: nonempty,
  configuration: z.record(z.string(), z.unknown()),
  seed: z.union([z.number(), z.string()]),
  abandoned: z.boolean(),
  split: z.enum(["development", "quarantine", "confirmation"]),
  metrics: z.record(z.string(), z.number()).nullable(),
});

export const ModelRunSchema = z.object({
  id: nonempty,
  trialId: nonempty,
  protocolId: nonempty,
  datasetVersionId: nonempty,
  codeVersion: nonempty,
  seed: z.union([z.number(), z.string()]),
  startedAt: isoTime,
});

export const GraphRunSchema = z.object({
  id: nonempty,
  datasetVersionId: nonempty,
  constructionFeatureFamily: nonempty,
  vertexCount: z.number().int().nonnegative(),
  edgeCount: z.number().int().nonnegative(),
  contentHash: hex64,
});

export const ConnectionRunSchema = z.object({
  id: nonempty,
  graphRunId: nonempty,
  stalkRank: z.number().int().positive(),
  group: z.enum(["SO", "O"]),
  contentHash: hex64,
});

export const TopologyRunSchema = z.object({
  id: nonempty,
  datasetVersionId: nonempty,
  window: z.number().int().positive(),
  filtration: nonempty,
  backend: nonempty,
  contentHash: hex64,
});

export const NullExperimentSchema = z.object({
  id: nonempty,
  kind: nonempty,
  justification: nonempty,
  seed: z.union([z.number(), z.string()]),
  protocolId: nonempty,
});

export const CertificateSchema = z.object({
  id: nonempty,
  name: nonempty,
  status: EvidenceStateSchema,
  details: nonempty,
  numeric: z.record(z.string(), z.number()),
});

export const ClaimSchema = z.object({
  id: nonempty,
  statement: nonempty,
  status: EvidenceStateSchema,
  gate: z.enum(["none", "E0", "E1", "E2", "E3", "E4", "E5"]),
  limitations: nonempty,
  protocolId: nonempty.nullable(),
});

export const ArtifactSchema = z.object({
  id: nonempty,
  kind: nonempty,
  path: nonempty,
  contentHash: hex64,
  createdAt: isoTime,
});

export const EvidenceEntrySchema = z.object({
  id: nonempty,
  claimId: nonempty,
  fromStatus: EvidenceStateSchema.nullable(),
  toStatus: EvidenceStateSchema,
  reason: nonempty,
  artifactIds: z.array(nonempty),
  recordedAt: isoTime,
});

export const ProvenanceManifestSchema = z.object({
  id: nonempty,
  datasetVersionId: nonempty,
  codeVersion: nonempty,
  configuration: z.record(z.string(), z.unknown()),
  configHash: hex64,
  seed: z.union([z.number(), z.string()]),
  coordinateAxisIds: z.array(nonempty).min(1),
  source: SourceAttributionSchema,
  protocolId: nonempty.nullable(),
  runId: hex64,
});

export const AnalysisResultSchema = z.object({
  id: nonempty,
  provenance: ProvenanceManifestSchema,
  evidenceStatus: EvidenceStateSchema,
  claimIds: z.array(nonempty),
  coordinateAxisIds: z.array(nonempty).min(1),
  summary: nonempty,
});

export const REQUIRED_TYPE_SCHEMAS = {
  Project: ProjectSchema,
  Workspace: WorkspaceSchema,
  Dataset: DatasetSchema,
  DatasetVersion: DatasetVersionSchema,
  MarketEvent: MarketEventSchema,
  Instrument: InstrumentSchema,
  OptionContract: OptionContractSchema,
  OptionLeg: OptionLegSchema,
  Position: PositionSchema,
  PositionTemplate: PositionTemplateSchema,
  PositionTransportRule: PositionTransportRuleSchema,
  CoordinateAxis: CoordinateAxisSchema,
  FeatureDefinition: FeatureDefinitionSchema,
  FeatureObservation: FeatureObservationSchema,
  StrategyDefinition: StrategyDefinitionSchema,
  StrategyState: StrategyStateSchema,
  OutcomeDefinition: OutcomeDefinitionSchema,
  ExperimentProtocol: ExperimentProtocolSchema,
  Trial: TrialSchema,
  ModelRun: ModelRunSchema,
  GraphRun: GraphRunSchema,
  ConnectionRun: ConnectionRunSchema,
  TopologyRun: TopologyRunSchema,
  NullExperiment: NullExperimentSchema,
  Certificate: CertificateSchema,
  Claim: ClaimSchema,
  EvidenceEntry: EvidenceEntrySchema,
  Artifact: ArtifactSchema,
  ProvenanceManifest: ProvenanceManifestSchema,
} as const;

export type Project = z.infer<typeof ProjectSchema>;
export type Workspace = z.infer<typeof WorkspaceSchema>;
export type Dataset = z.infer<typeof DatasetSchema>;
export type DatasetVersion = z.infer<typeof DatasetVersionSchema>;
export type MarketEvent = z.infer<typeof MarketEventSchema>;
export type Instrument = z.infer<typeof InstrumentSchema>;
export type OptionContract = z.infer<typeof OptionContractSchema>;
export type OptionLeg = z.infer<typeof OptionLegSchema>;
export type Position = z.infer<typeof PositionSchema>;
export type PositionTemplate = z.infer<typeof PositionTemplateSchema>;
export type PositionTransportRule = z.infer<typeof PositionTransportRuleSchema>;
export type CoordinateAxis = z.infer<typeof CoordinateAxisSchema>;
export type FeatureDefinition = z.infer<typeof FeatureDefinitionSchema>;
export type FeatureObservation = z.infer<typeof FeatureObservationSchema>;
export type StrategyDefinition = z.infer<typeof StrategyDefinitionSchema>;
export type StrategyState = z.infer<typeof StrategyStateSchema>;
export type OutcomeDefinition = z.infer<typeof OutcomeDefinitionSchema>;
export type ExperimentProtocol = z.infer<typeof ExperimentProtocolSchema>;
export type Trial = z.infer<typeof TrialSchema>;
export type ModelRun = z.infer<typeof ModelRunSchema>;
export type GraphRun = z.infer<typeof GraphRunSchema>;
export type ConnectionRun = z.infer<typeof ConnectionRunSchema>;
export type TopologyRun = z.infer<typeof TopologyRunSchema>;
export type NullExperiment = z.infer<typeof NullExperimentSchema>;
export type Certificate = z.infer<typeof CertificateSchema>;
export type Claim = z.infer<typeof ClaimSchema>;
export type EvidenceEntry = z.infer<typeof EvidenceEntrySchema>;
export type Artifact = z.infer<typeof ArtifactSchema>;
export type ProvenanceManifest = z.infer<typeof ProvenanceManifestSchema>;
export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;
