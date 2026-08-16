import { contentHash, runId } from "./hash.ts";
import { assertTransition, type EvidenceState } from "./evidence.ts";
import {
  AnalysisResultSchema,
  EvidenceEntrySchema,
  ProvenanceManifestSchema,
  type AnalysisResult,
  type EvidenceEntry,
  type ProvenanceManifest,
  type SourceAttributionSchema,
} from "./schemas.ts";
import type { z } from "zod";

type SourceAttribution = z.infer<typeof SourceAttributionSchema>;

export function buildProvenance(input: {
  datasetVersionId: string;
  codeVersion: string;
  configuration: Record<string, unknown>;
  seed: number | string;
  coordinateAxisIds: string[];
  source: SourceAttribution;
  protocolId: string | null;
}): ProvenanceManifest {
  const configHash = contentHash(input.configuration);
  const idParts = {
    dataVersionId: input.datasetVersionId,
    codeVersion: input.codeVersion,
    config: input.configuration,
    seed: input.seed,
    protocolId: input.protocolId ?? "none",
  };
  const manifest: ProvenanceManifest = {
    id: `prov_${contentHash(idParts).slice(0, 24)}`,
    datasetVersionId: input.datasetVersionId,
    codeVersion: input.codeVersion,
    configuration: input.configuration,
    configHash,
    seed: input.seed,
    coordinateAxisIds: input.coordinateAxisIds,
    source: input.source,
    protocolId: input.protocolId,
    runId: runId(idParts),
  };
  return ProvenanceManifestSchema.parse(manifest);
}

export function buildAnalysisResult(input: {
  provenance: ProvenanceManifest;
  evidenceStatus: EvidenceState;
  claimIds: string[];
  summary: string;
}): AnalysisResult {
  return AnalysisResultSchema.parse({
    id: `ar_${input.provenance.runId.slice(0, 24)}`,
    provenance: input.provenance,
    evidenceStatus: input.evidenceStatus,
    claimIds: input.claimIds,
    coordinateAxisIds: input.provenance.coordinateAxisIds,
    summary: input.summary,
  });
}

export function recordEvidenceTransition(input: {
  claimId: string;
  from: EvidenceState | null;
  to: EvidenceState;
  reason: string;
  artifactIds: string[];
  recordedAt: string;
}): EvidenceEntry {
  if (input.from) assertTransition(input.from, input.to);
  return EvidenceEntrySchema.parse({
    id: `ev_${contentHash({ claimId: input.claimId, to: input.to, at: input.recordedAt }).slice(0, 24)}`,
    claimId: input.claimId,
    fromStatus: input.from,
    toStatus: input.to,
    reason: input.reason,
    artifactIds: input.artifactIds,
    recordedAt: input.recordedAt,
  });
}
