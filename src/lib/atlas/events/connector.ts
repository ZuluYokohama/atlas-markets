import type { EventDraft } from "./types.ts";

/**
 * Read-only ingest. No order routing, no brokerage auth, no send.
 * ENGINEERING_INFERENCE: method names are the safety surface.
 */
export interface ReadOnlyConnector {
  readonly name: string;
  readonly readOnly: true;
  pull(): EventDraft[];
}

export function assertReadOnlyConnector(connector: object): void {
  const forbidden = ["placeOrder", "sendOrder", "cancelOrder", "route", "broker"];
  for (const key of forbidden) {
    if (key in connector) {
      throw new Error(`CONNECTOR_NOT_READONLY: ${key}`);
    }
  }
}

export function memoryConnector(name: string, drafts: EventDraft[]): ReadOnlyConnector {
  return {
    name,
    readOnly: true,
    pull: () => drafts.slice(),
  };
}
