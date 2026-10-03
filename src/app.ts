import type { Context } from "hono";
import { Hono } from "hono";
import { z } from "zod";
import { isAbstention, parseCitations, sourceUrl, type AnswerResult } from "./answer.js";
import { costOf } from "./cost.js";
import { friendlyDbError } from "./db.js";
import type { RetrievalResult, RetrieveOptions } from "./retrieve.js";
import { errorMessage, todoIdOf } from "./todo.js";
import { RETRIEVAL_MODES, type RetrievalMode, type RetrievedChunk, type Turn } from "./types.js";
import { renderPage } from "./ui.js";

/** Everything the routes need, injected so tests can swap in fakes. src/server.ts wires the real ones. */
export interface AppDeps {
  retrieve(query: string, mode: RetrievalMode, opts?: RetrieveOptions): Promise<RetrievalResult>;
  answer(question: string, chunks: RetrievedChunk[]): Promise<AnswerResult>;
  rewrite(question: string, history: Turn[]): Promise<string>;
  /** Shown in the page header, e.g. "Next.js docs (v16.3.8)". */
  sourceLabel: string;
  /** One-click example questions on the page. */
  examples?: string[];
}

export const AskBody = z.object({
  question: z.string().trim().min(1, "Ask a question.").max(2000, "Keep the question under 2,000 characters."),
  mode: z.enum(RETRIEVAL_MODES).default("hybrid"),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(8000) }))
    .max(20)
    .default([]),
});

/** A chunk as the API returns it: numbered, with a link to the exact section. */
function sourceView(chunk: RetrievedChunk, i: number) {
  return {
    n: i + 1,
    id: chunk.id,
    docTitle: chunk.docTitle,
    docPath: chunk.docPath,
    headings: chunk.headings,
    url: sourceUrl(chunk),
    score: chunk.score,
    content: chunk.content,
  };
}

/** 501 with the TODO id for "Not implemented yet", 500 with a readable message otherwise. */
function errorResponse(c: Context, err: unknown, extra: Record<string, unknown> = {}) {
  const todo = todoIdOf(err);
  if (todo) return c.json({ error: errorMessage(err), todo, ...extra }, 501);
  console.error(err);
  return c.json({ error: friendlyDbError(err), ...extra }, 500);
}

export function createApp(deps: AppDeps): Hono {
  const app = new Hono();

  app.get("/", (c) => c.html(renderPage(deps.sourceLabel, deps.examples)));

  /** GET /search?q=...&mode=hybrid&k=5: ranked chunks with scores and the debug stages. No LLM call. */
  app.get("/search", async (c) => {
    const q = c.req.query("q")?.trim();
    if (!q) return c.json({ error: "Add a query, for example /search?q=revalidatePath" }, 400);
    const mode = c.req.query("mode") ?? "hybrid";
    if (!(RETRIEVAL_MODES as readonly string[]).includes(mode)) {
      return c.json({ error: `mode must be one of ${RETRIEVAL_MODES.join(", ")}` }, 400);
    }
    const k = Math.min(Math.max(Number(c.req.query("k") ?? 5) || 5, 1), 50);
    try {
      const result = await deps.retrieve(q, mode as RetrievalMode, { k });
      return c.json({ query: q, mode, ms: result.ms, results: result.chunks.map(sourceView), stages: result.stages });
    } catch (err) {
      return errorResponse(c, err, { query: q, mode });
    }
  });

  /** POST /ask { question, mode?, history? }: retrieve, answer with citations, and report every stage. */
  app.post("/ask", async (c) => {
    const parsed = AskBody.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) {
      return c.json({ error: parsed.error.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`).join("; ") }, 400);
    }
    const { question, mode, history } = parsed.data;
    const started = performance.now();

    let rewritten: string;
    let retrieval: RetrievalResult;
    try {
      rewritten = await deps.rewrite(question, history);
      retrieval = await deps.retrieve(rewritten, mode);
    } catch (err) {
      return errorResponse(c, err, { question, mode });
    }

    const base = {
      question,
      rewrittenQuery: rewritten === question ? null : rewritten,
      mode,
      sources: retrieval.chunks.map(sourceView),
      stages: retrieval.stages,
    };
    const answerStarted = performance.now();
    try {
      const answer = await deps.answer(rewritten, retrieval.chunks);
      const { cited, invalid } = parseCitations(answer.text, retrieval.chunks.length);
      return c.json({
        ...base,
        answer: answer.text,
        abstained: isAbstention(answer.text),
        cited,
        invalidCitations: invalid,
        model: answer.model,
        usage: answer.usage,
        costUsd: costOf(answer.model, answer.usage),
        timings: {
          retrievalMs: retrieval.ms,
          answerMs: Math.round(performance.now() - answerStarted),
          totalMs: Math.round(performance.now() - started),
        },
      });
    } catch (err) {
      return errorResponse(c, err, { ...base, timings: { retrievalMs: retrieval.ms } });
    }
  });

  return app;
}
