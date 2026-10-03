/** US dollars per million tokens. Check https://www.anthropic.com/pricing before you quote a number. */
export const PRICES_PER_MTOK: Record<string, { input: number; output: number; cacheReadFactor: number }> = {
  "claude-opus-5-5": { input: 4, output: 20, cacheReadFactor: 0.05 },
  "claude-sonnet-5-5": { input: 2, output: 10, cacheReadFactor: 0.1 },
  "claude-haiku-4-5": { input: 1, output: 5, cacheReadFactor: 0.1 },
};

/** The fields of the API's `usage` object that cost money. Thinking tokens are part of output_tokens. */
export interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
}

/**
 * Cost of one request in US dollars, or null for a model with no price above.
 * input_tokens excludes cached tokens: cache reads are billed at a fraction of the input
 * price, and cache writes (5-minute TTL) at 1.25x.
 */
export function costOf(model: string, usage: TokenUsage | null | undefined): number | null {
  const price = PRICES_PER_MTOK[model];
  if (!price || !usage) return null;
  const input =
    usage.input_tokens +
    (usage.cache_read_input_tokens ?? 0) * price.cacheReadFactor +
    (usage.cache_creation_input_tokens ?? 0) * 1.25;
  return (input * price.input + usage.output_tokens * price.output) / 1_000_000;
}

export function formatUsd(usd: number | null): string {
  if (usd == null) return "n/a";
  return usd < 0.01 ? `$${usd.toFixed(4)}` : `$${usd.toFixed(3)}`;
}
