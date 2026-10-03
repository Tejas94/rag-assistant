import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

/**
 * One shared client, created on first use so that importing this module (in tests,
 * or in the ingest CLI) never needs an API key. It reads ANTHROPIC_API_KEY.
 */
export function getAnthropic(): Anthropic {
  client ??= new Anthropic();
  return client;
}
