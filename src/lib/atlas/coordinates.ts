/**
 * Coordinate registry (S5 table). Roles exist so event time cannot be
 * silently treated as availability time, tenor as horizon, etc.
 */

export const COORDINATE_ROLES = [
  "event_time",
  "ingest_time",
  "availability_time",
  "revision_time",
  "replay_clock",
  "forecast_horizon",
  "option_tenor",
  "log_moneyness",
  "raw_strike",
  "delta",
  "contract_identity",
  "filtration_epsilon",
  "diffusion_scale",
  "strategy_age",
  "contract_age",
  "feature_value",
  "outcome",
] as const;

export type CoordinateRole = (typeof COORDINATE_ROLES)[number];

/** Documented must-not-confuse pairs from S5. */
export const FORBIDDEN_ROLE_FOR_NAME: Record<string, readonly CoordinateRole[]> = {
  event_time: ["ingest_time", "availability_time", "revision_time", "replay_clock"],
  ingest_time: ["event_time", "availability_time"],
  availability_time: ["event_time", "ingest_time", "revision_time"],
  revision_time: ["event_time", "availability_time"],
  replay_clock: ["event_time"],
  option_tenor: ["forecast_horizon"],
  forecast_horizon: ["option_tenor"],
  log_moneyness: ["raw_strike"],
  raw_strike: ["log_moneyness"],
  delta: ["contract_identity"],
  filtration_epsilon: ["event_time", "replay_clock"],
  diffusion_scale: ["event_time", "replay_clock"],
  strategy_age: ["contract_age"],
  contract_age: ["strategy_age"],
};

export function assertCoordinateRole(name: string, role: CoordinateRole): void {
  const forbidden = FORBIDDEN_ROLE_FOR_NAME[name];
  if (forbidden?.includes(role)) {
    throw new Error(`COORDINATE_ROLE_CONFUSION: axis "${name}" must not be role ${role}`);
  }
}
