/** Marks a piece you are meant to write. Run `npm run todos` to list them in order. */
export function todo(id: string, hint: string): never {
  throw new Error(`Not implemented yet: ${id}. ${hint}`);
}

/** The TODO id ("P2-05") when `err` came from todo(), otherwise null. */
export function todoIdOf(err: unknown): string | null {
  const message = err instanceof Error ? err.message : String(err);
  return message.match(/Not implemented yet: (P\d+-\d+)/)?.[1] ?? null;
}

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
