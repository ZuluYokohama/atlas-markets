import { generateUniverse, type Universe } from "./market";
import { buildConnection, runE1 } from "./geometry";
import type { ConnectionBundle, E1Result } from "./types";


let uni: Universe | null = null;
let conn: ConnectionBundle | null = null;
let e1: E1Result | null = null;

export function getUniverse(): Universe {
  if (!uni) uni = generateUniverse();
  return uni;
}

export function getConnection(): ConnectionBundle {
  if (!conn) conn = buildConnection(getUniverse(), 14, 2);
  return conn;
}

export function getE1(): E1Result {
  if (!e1) e1 = runE1();
  return e1;
}

export const DEFAULT_QUERY = 402;
export const DEFAULT_TEMPLATE = "iron-condor";
export const DEFAULT_HORIZON = "5d" as const;
export const DEFAULT_TRANSPORT = "template" as const;
