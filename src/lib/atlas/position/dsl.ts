import { contentHash } from "../hash.ts";
import { contractId, positionHash, type CompiledLeg, type Right, type Side } from "./identity.ts";

const LINE =
  /^\s*(long|short|\+|-)(?:\s*)(\d+(?:\.\d+)?)\s+([A-Za-z.]+)\s+(\d+(?:\.\d+)?)\s*([CcPp])\s+(\d{4}-\d{2}-\d{2})\s*$/;

export function parsePositionDsl(text: string, multiplier = 100): CompiledLeg[] {
  const lines = text
    .split(/[\n/]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (lines.length === 0) throw new Error("DSL_EMPTY");
  const legs: CompiledLeg[] = [];
  for (const line of lines) {
    const m = line.match(LINE);
    if (!m) throw new Error(`DSL_PARSE: ${line}`);
    const side: Side = m[1] === "short" || m[1] === "-" ? "sell" : "buy";
    const quantity = Number(m[2]);
    const underlying = m[3].toUpperCase();
    const strike = Number(m[4]);
    const right: Right = m[5].toUpperCase() === "C" ? "call" : "put";
    const expiration = m[6];
    const cid = contractId({ underlying, expiration, right, strike });
    legs.push({
      id: `leg_${contentHash({ cid, side, quantity }).slice(0, 12)}`,
      contractId: cid,
      underlying,
      right,
      side,
      quantity,
      strike,
      expiration,
      multiplier,
    });
  }
  return legs;
}

export function compilePosition(text: string, multiplier = 100): {
  legs: CompiledLeg[];
  hash: string;
} {
  const legs = parsePositionDsl(text, multiplier);
  return { legs, hash: positionHash(legs) };
}
