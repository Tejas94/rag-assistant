import { describe, expect, it, vi } from "vitest";
import type { AnswerResult } from "../../src/answer.js";
import { createApp, type AppDeps } from "../../src/app.js";
import type { RetrievalResult } from "../../src/retrieve.js";
import { todo } from "../../src/todo.js";
import type { RetrievalMode, RetrievedChunk } from "../../src/types.js";

const chunk = (id: number, anchor = "usage"): RetrievedChunk => ({
  id,
  score: 1 / (60 + id),
  docPath: `01-app/page-${id}.mdx`,
  docTitle: `Page ${id}`,
  url: `https://nextjs.org/docs/app/page-${id}`,
  headings: ["Usage"],
  anchor,
  index: 0,
  content: `Content ${id}.`,
});

const retrieval = (query: string, mode: RetrievalMode, chunks = [chunk(1), chunk(2, "")]): RetrievalResult => ({
  query,
  mode,
  chunks,
  stages: [{ name: "final", ms: 0, hits: chunks.map(({ content: _c, ...hit }) => hit), total: chunks.length }],
  ms: 7,
});

function makeDeps(over: Partial<AppDeps> = {}): AppDeps {
  return {
    retrieve: vi.fn(async (q: string, mode: RetrievalMode) => retrieval(q, mode)),
    answer: vi.fn(
      async (): Promise<AnswerResult> => ({
        text: "Call revalidatePath [1]. See also [4].",
        model: "claude-opus-5-5",
        usage: { input_tokens: 1000, output_tokens: 200 } as AnswerResult["usage"],
      }),
    ),
    rewrite: vi.fn(async (q: string) => q),
    sourceLabel: "Next.js docs (v16.3.8)",
    examples: ['What does "use cache" do?'],
    ...over,
  };
}

const post = (app: ReturnType<typeof createApp>, body: unknown) =>
  app.request("/ask", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

describe("GET /", () => {
  it("serves the page with the source label and escaped examples", async () => {
    const res = await createApp(makeDeps()).request("/");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("<title>Developer Docs Assistant</title>");
    expect(html).toContain("Next.js docs (v16.3.8)");
    expect(html).toContain("What does &quot;use cache&quot; do?");
  });
});

describe("GET /search", () => {
  it("returns ranked chunks with scores, links and stages", async () => {
    const deps = makeDeps();
    const res = await createApp(deps).request("/search?q=revalidatePath&mode=keyword&k=3");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(deps.retrieve).toHaveBeenCalledWith("revalidatePath", "keyword", { k: 3 });
    expect(body).toMatchObject({ query: "revalidatePath", mode: "keyword", ms: 7 });
    expect(body.results[0]).toMatchObject({ n: 1, id: 1, url: "https://nextjs.org/docs/app/page-1#usage", score: 1 / 61 });
    expect(body.results[1].url).toBe("https://nextjs.org/docs/app/page-2");
    expect(body.stages[0].name).toBe("final");
  });

  it("defaults to hybrid and clamps k", async () => {
    const deps = makeDeps();
    await createApp(deps).request("/search?q=x&k=500");
    expect(deps.retrieve).toHaveBeenCalledWith("x", "hybrid", { k: 50 });
  });

  it("rejects a missing query or an unknown mode", async () => {
    const app = createApp(makeDeps());
    expect((await app.request("/search")).status).toBe(400);
    expect((await app.request("/search?q=%20")).status).toBe(400);
    const res = await app.request("/search?q=x&mode=semantic");
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/vector, keyword, hybrid, hybrid_rerank/);
  });

  it("answers 501 with the TODO id when retrieval is not implemented yet", async () => {
    const app = createApp(makeDeps({ retrieve: async () => todo("P2-02", "Implement vectorSearch() in src/retrieve.ts") }));
    const res = await app.request("/search?q=x&mode=vector");
    expect(res.status).toBe(501);
    expect(await res.json()).toMatchObject({ todo: "P2-02", error: expect.stringMatching(/^Not implemented yet: P2-02/) });
  });
});

describe("POST /ask", () => {
  it("retrieves, answers and checks the citations", async () => {
    const deps = makeDeps();
    const res = await post(createApp(deps), { question: "How do I revalidate one page?", mode: "hybrid_rerank" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(deps.retrieve).toHaveBeenCalledWith("How do I revalidate one page?", "hybrid_rerank");
    expect(deps.answer).toHaveBeenCalledWith("How do I revalidate one page?", [chunk(1), chunk(2, "")]);
    expect(body).toMatchObject({
      question: "How do I revalidate one page?",
      rewrittenQuery: null,
      mode: "hybrid_rerank",
      answer: "Call revalidatePath [1]. See also [4].",
      abstained: false,
      cited: [1],
      invalidCitations: [4],
      model: "claude-opus-5-5",
    });
    expect(body.sources).toHaveLength(2);
    expect(body.costUsd).toBeCloseTo((1000 * 4 + 200 * 20) / 1_000_000);
    expect(body.timings.retrievalMs).toBe(7);
  });

  it("passes the history to the rewriter and retrieves with the rewritten query", async () => {
    const deps = makeDeps({ rewrite: vi.fn(async () => "dynamicParams for slugs not in generateStaticParams") });
    const history = [
      { role: "user", content: "How do I pre-render posts?" },
      { role: "assistant", content: "Use generateStaticParams [1]." },
    ];
    const body = await (await post(createApp(deps), { question: "And other slugs?", history })).json();
    expect(deps.rewrite).toHaveBeenCalledWith("And other slugs?", history);
    expect(deps.retrieve).toHaveBeenCalledWith("dynamicParams for slugs not in generateStaticParams", "hybrid");
    expect(body.rewrittenQuery).toBe("dynamicParams for slugs not in generateStaticParams");
  });

  it("flags an abstention", async () => {
    const answer = async (): Promise<AnswerResult> => ({ text: "I couldn't find that in the documentation.", model: "m", usage: null });
    const body = await (await post(createApp(makeDeps({ answer })), { question: "Python?" })).json();
    expect(body).toMatchObject({ abstained: true, cited: [], costUsd: null });
  });

  it("rejects a bad body with a readable message", async () => {
    const app = createApp(makeDeps());
    for (const body of [{}, { question: "  " }, { question: "x", mode: "fast" }, { question: "x".repeat(2001) }]) {
      const res = await post(app, body);
      expect(res.status, JSON.stringify(body).slice(0, 40)).toBe(400);
      expect((await res.json()).error).toBeTruthy();
    }
    const res = await app.request("/ask", { method: "POST", body: "not json" });
    expect(res.status).toBe(400);
  });

  it("answers 501 with the TODO id and still returns the sources when answering is not implemented", async () => {
    const answer = async () => todo("P2-08", "Implement answerQuestion() in src/answer.ts");
    const res = await post(createApp(makeDeps({ answer })), { question: "How do I revalidate?" });
    expect(res.status).toBe(501);
    const body = await res.json();
    expect(body.todo).toBe("P2-08");
    expect(body.error).toMatch(/^Not implemented yet: P2-08\. Implement answerQuestion\(\)/);
    expect(body.sources.map((s: { id: number }) => s.id)).toEqual([1, 2]);
  });

  it("answers 500 with the message for any other error", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const retrieve = async () => {
      throw new Error("connection reset");
    };
    const res = await post(createApp(makeDeps({ retrieve })), { question: "x" });
    expect(res.status).toBe(500);
    expect(await res.json()).toMatchObject({ error: "connection reset" });
    spy.mockRestore();
  });
});
