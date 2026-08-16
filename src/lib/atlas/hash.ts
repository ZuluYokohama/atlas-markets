import { createHash } from "node:crypto";

/** Canonical JSON: sorted keys, no undefined, stable arrays. */
export function canonicalize(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (value === undefined) return null;
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(sortValue);
  const obj = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(obj).sort()) {
    if (obj[key] === undefined) continue;
    out[key] = sortValue(obj[key]);
  }
  return out;
}

export function contentHash(value: unknown): string {
  return createHash("sha256").update(canonicalize(value), "utf8").digest("hex");
}

export function runId(parts: {
  dataVersionId: string;
  codeVersion: string;
  config: unknown;
  seed: number | string;
  protocolId: string;
}): string {
  return contentHash({
    dataVersionId: parts.dataVersionId,
    codeVersion: parts.codeVersion,
    config: parts.config,
    seed: parts.seed,
    protocolId: parts.protocolId,
  });
}

export function prefixedId(prefix: string, value: unknown): string {
  return `${prefix}_${contentHash(value).slice(0, 24)}`;
}
