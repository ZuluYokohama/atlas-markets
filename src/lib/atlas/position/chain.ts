import type { Right } from "./identity.ts";

export type QuoteQuality = "ok" | "stale" | "missing";

export interface ListedQuote {
  contractId: string;
  underlying: string;
  right: Right;
  strike: number;
  expiration: string;
  bid: number;
  ask: number;
  mid: number;
  iv: number;
  delta: number;
  asOf: string;
  quality: QuoteQuality;
}

export interface OptionChain {
  asOf: string;
  spot: number;
  rate: number;
  div: number;
  quotes: Map<string, ListedQuote>;
}

export function emptyChain(asOf: string, spot: number, rate = 0, div = 0): OptionChain {
  return { asOf, spot, rate, div, quotes: new Map() };
}

export function putQuote(chain: OptionChain, quote: ListedQuote): void {
  chain.quotes.set(quote.contractId, quote);
}

export function getQuote(chain: OptionChain, contractId: string): ListedQuote | null {
  return chain.quotes.get(contractId) ?? null;
}

/** Never invents a quote. Missing stays missing. */
export function requireQuote(chain: OptionChain, contractId: string): ListedQuote {
  const q = getQuote(chain, contractId);
  if (!q || q.quality === "missing") {
    throw new Error(`NO_CONTRACT: ${contractId}`);
  }
  return q;
}

export function listQuotes(chain: OptionChain): ListedQuote[] {
  return [...chain.quotes.values()].filter((q) => q.quality !== "missing");
}
