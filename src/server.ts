import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { answerQuestion } from "./answer.js";
import { retrieve } from "./retrieve.js";
import type { RetrievalMode } from "./types.js";

const app = new Hono();

app.post("/ask", async (c) => {
  const { question, mode = "hybrid" } = await c.req.json<{ question: string; mode?: RetrievalMode }>();
  try {
    const chunks = await retrieve(question, mode, 5);
    const answer = await answerQuestion(question, chunks);
    return c.json({
      answer: answer.text,
      // `n` is the source number the answer cites as [n], so the UI labels match the text.
      citations: answer.citations.map((ch) => ({
        n: chunks.findIndex((x) => x.id === ch.id) + 1,
        doc: ch.docPath,
        section: ch.heading,
        text: ch.content,
      })),
      retrieved: chunks.map((ch) => ({ doc: ch.docPath, section: ch.heading, score: ch.score })),
    });
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});

// A deliberately tiny UI. Swap in Next.js (reuse Project 1) when you polish it in week 6.
app.get("/", (c) =>
  c.html(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Docs Assistant</title>
<style>body{font-family:system-ui;max-width:760px;margin:32px auto;padding:0 16px}input,select,button{font-size:1rem;padding:8px}
input{width:60%}pre{white-space:pre-wrap;background:#f5f5f4;padding:12px;border-radius:8px}.src{font-size:.85rem;color:#57534e}</style>
<h1>Docs Assistant</h1>
<form id="f"><input id="q" placeholder="How long are backups kept on the Team plan?">
<select id="m"><option>hybrid</option><option>vector</option><option>keyword</option></select> <button>Ask</button></form>
<pre id="out"></pre><div id="src" class="src"></div>
<script>
f.onsubmit = async (e) => {
  e.preventDefault(); out.textContent = "Thinking..."; src.innerHTML = "";
  const r = await fetch("/ask", {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({question: q.value, mode: m.value})});
  const j = await r.json();
  out.textContent = j.error ? "Error: " + j.error : j.answer;
  (j.citations || []).forEach((c) => { const d = document.createElement("p"); d.textContent = "[" + c.n + "] " + c.doc + " > " + c.section; src.append(d); });
};
</script>`),
);

const port = Number(process.env.PORT ?? 3000);
serve({ fetch: app.fetch, port });
console.log(`Docs Assistant on http://localhost:${port}`);
