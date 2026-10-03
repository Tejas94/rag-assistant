const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch] ?? ch);

/**
 * The whole UI: one page, no build step. It calls POST /ask and GET /search and shows
 * the answer, clickable source cards, and a debug panel with every retrieval stage.
 * Every string from the server goes through esc() before it touches innerHTML.
 */
export function renderPage(sourceLabel: string, examples: string[] = []): string {
  const chips = examples
    .map((q) => `<button type="button" class="chip" data-q="${escapeHtml(q)}">${escapeHtml(q)}</button>`)
    .join("");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Developer Docs Assistant</title>
<style>
:root{--bg:#fafaf9;--panel:#ffffff;--text:#1c1917;--muted:#78716c;--line:#e7e5e4;--accent:#2563eb;--accent-soft:#dbeafe;--warn-bg:#fef3c7;--warn:#92400e;--err-bg:#fee2e2;--err:#991b1b;--code:#f5f5f4}
@media (prefers-color-scheme:dark){:root{--bg:#0c0a09;--panel:#1c1917;--text:#f5f5f4;--muted:#a8a29e;--line:#292524;--accent:#60a5fa;--accent-soft:#1e3a5f;--warn-bg:#422006;--warn:#fcd34d;--err-bg:#450a0a;--err:#fca5a5;--code:#292524}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--text);font:16px/1.55 system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:920px;margin:0 auto;padding:24px 16px 64px}
h1{font-size:1.5rem;margin:0}
.sub{color:var(--muted);margin:4px 0 20px}
form{display:flex;flex-wrap:wrap;gap:8px}
#q{flex:1 1 320px;min-width:0;padding:10px 12px;font:inherit;border:1px solid var(--line);border-radius:8px;background:var(--panel);color:var(--text)}
select,button{font:inherit;padding:10px 14px;border-radius:8px;border:1px solid var(--line);background:var(--panel);color:var(--text);cursor:pointer}
button.primary{background:var(--accent);border-color:var(--accent);color:#fff}
button:disabled{opacity:.6;cursor:wait}
.chips{display:flex;flex-wrap:wrap;gap:6px;margin:12px 0 4px}
.chip{font-size:.85rem;padding:4px 10px;border-radius:999px}
.turn{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:16px;margin-top:20px}
.question{font-weight:600}
.meta{color:var(--muted);font-size:.85rem}
.answer p{margin:.6em 0}
.answer pre,.snippet{background:var(--code);border-radius:8px;padding:10px 12px;overflow-x:auto;font-size:.85rem;white-space:pre-wrap}
code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.9em}
.cite{font-size:.8em;font-weight:600;text-decoration:none;color:var(--accent);margin:0 1px}
.cite.bad{color:var(--err)}
.callout{border-radius:8px;padding:10px 12px;margin:10px 0}
.callout.todo{background:var(--warn-bg);color:var(--warn)}
.callout.error{background:var(--err-bg);color:var(--err)}
h3{font-size:.95rem;margin:18px 0 8px}
.sources{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px}
.source{border:1px solid var(--line);border-radius:10px;padding:10px 12px;min-width:0}
.source.cited{border-color:var(--accent);box-shadow:0 0 0 1px var(--accent) inset}
.source a{color:var(--accent);font-weight:600;text-decoration:none;word-break:break-word}
.badge{display:inline-block;min-width:1.6em;text-align:center;border-radius:6px;background:var(--accent-soft);color:var(--accent);font-size:.8rem;font-weight:700;margin-right:4px}
.path{color:var(--muted);font-size:.85rem;word-break:break-word}
.snippet{margin:8px 0;max-height:9em;overflow:hidden;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
details{margin-top:14px}
summary{cursor:pointer;color:var(--muted);font-size:.9rem}
.stages{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px;margin-top:8px}
.stage{border:1px dashed var(--line);border-radius:10px;padding:8px 10px;font-size:.85rem;min-width:0}
.stage ol{margin:6px 0 0;padding-left:1.4em}
.stage li{margin:2px 0;word-break:break-word}
.stage a{color:var(--text)}
.score{font-family:ui-monospace,Menlo,monospace;color:var(--muted)}
.note{color:var(--warn);margin-top:4px}
</style>
</head>
<body>
<main>
<h1>Developer Docs Assistant</h1>
<p class="sub">Answers from ${escapeHtml(sourceLabel)}, with citations you can click through. The debug panel shows every retrieval stage.</p>
<form id="f">
  <input id="q" autocomplete="off" placeholder="Ask about the docs..." aria-label="Question">
  <select id="mode" aria-label="Retrieval mode">
    <option value="hybrid">hybrid</option>
    <option value="hybrid_rerank">hybrid + rerank</option>
    <option value="vector">vector</option>
    <option value="keyword">keyword</option>
  </select>
  <button class="primary" id="ask">Ask</button>
  <button type="button" id="search" title="Retrieve only, no answer model">Search only</button>
  <button type="button" id="reset" title="Forget earlier turns">New conversation</button>
</form>
<div class="chips">${chips}</div>
<div id="turns"></div>
</main>
<script>
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
const safeUrl = (u) => /^https?:\\/\\//.test(u) ? u : "#";
let history = [];
let turnCount = 0;

function renderAnswer(text, turn, count) {
  return text.split(/(\`\`\`[\\s\\S]*?\`\`\`)/g).map((part) => {
    if (part.startsWith("\`\`\`")) {
      return "<pre><code>" + esc(part.replace(/^\`\`\`[^\\n]*\\n?/, "").replace(/\`\`\`$/, "")) + "</code></pre>";
    }
    // Same rules as parseCitations(): no citations inside code or right after a name.
    let h = esc(part)
      .replace(/\`([^\`\\n]+)\`/g, "<code>$1</code>")
      .split(/(<code>[^]*?<\\/code>)/g)
      .map((seg) => seg.startsWith("<code>") ? seg : seg
        .replace(/\\*\\*([^*\\n]+)\\*\\*/g, "<strong>$1</strong>")
        .replace(/(?<![\\w)])\\[(\\d+(?:\\s*,\\s*\\d+)*)\\]/g, (m, nums) => nums.split(",").map((x) => {
          const n = Number(x.trim());
          return n >= 1 && n <= count
            ? '<a class="cite" href="#src-' + turn + '-' + n + '">[' + n + ']</a>'
            : '<span class="cite bad" title="There is no source with this number">[' + n + ']</span>';
        }).join("")))
      .join("");
    return h.split(/\\n{2,}/).filter((p) => p.trim()).map((p) => "<p>" + p.replace(/\\n/g, "<br>") + "</p>").join("");
  }).join("");
}

function renderSources(sources, cited, turn) {
  if (!sources || !sources.length) return "";
  return '<h3>Sources</h3><div class="sources">' + sources.map((s) =>
    '<article class="source' + (cited.includes(s.n) ? ' cited' : '') + '" id="src-' + turn + '-' + s.n + '">' +
    '<div><span class="badge">' + s.n + '</span><a href="' + esc(safeUrl(s.url)) + '" target="_blank" rel="noopener">' + esc(s.docTitle) + '</a></div>' +
    '<div class="path">' + esc(s.headings.join(" › ") || "Introduction") + '</div>' +
    '<div class="snippet">' + esc(s.content.slice(0, 320)) + (s.content.length > 320 ? "..." : "") + '</div>' +
    '<div class="meta">score ' + Number(s.score).toFixed(4) + ' · ' + esc(s.docPath) + '</div></article>').join("") + '</div>';
}

function renderStages(stages, extra) {
  if (!stages || !stages.length) return "";
  const cards = stages.map((s) =>
    '<div class="stage"><strong>' + esc(s.name) + '</strong> <span class="meta">' + s.total + ' hits · ' + s.ms + ' ms</span>' +
    (s.note ? '<div class="note">' + esc(s.note) + '</div>' : '') +
    '<ol>' + s.hits.map((h) => '<li><span class="score">' + Number(h.score).toFixed(4) + '</span> <a href="' +
      esc(safeUrl(h.url + (h.anchor ? "#" + h.anchor : ""))) + '" target="_blank" rel="noopener">' +
      esc([h.docTitle].concat(h.headings).join(" › ")) + '</a></li>').join("") + '</ol></div>').join("");
  return '<details open><summary>Debug: retrieval stages' + (extra ? ' · ' + esc(extra) : '') + '</summary><div class="stages">' + cards + '</div></details>';
}

function renderError(j, status) {
  if (j.todo) return '<div class="callout todo"><strong>' + esc(j.error) + '</strong><br>This is TODO ' + esc(j.todo) + '. Run <code>npm run todos</code> to find it.</div>';
  return '<div class="callout error">' + esc(j.error || ("Request failed with status " + status)) + '</div>';
}

async function run(kind) {
  const question = $("#q").value.trim();
  if (!question) return $("#q").focus();
  const mode = $("#mode").value;
  const turn = ++turnCount;
  const el = document.createElement("section");
  el.className = "turn";
  el.innerHTML = '<div class="question">' + esc(question) + '</div><div class="meta">' + esc(kind === "ask" ? "ask" : "search") + ' · ' + esc(mode) + '</div><p class="meta">Working...</p>';
  $("#turns").append(el);
  el.scrollIntoView({ behavior: "smooth", block: "start" });
  document.querySelectorAll("form button").forEach((b) => (b.disabled = true));
  try {
    const r = kind === "ask"
      ? await fetch("/ask", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question, mode, history }) })
      : await fetch("/search?" + new URLSearchParams({ q: question, mode }));
    const j = await r.json().catch(() => ({ error: "The server did not return JSON." }));
    let html = '<div class="question">' + esc(question) + '</div><div class="meta">' + esc(kind === "ask" ? "ask" : "search") + ' · ' + esc(mode) +
      (j.rewrittenQuery ? ' · searched as: ' + esc(j.rewrittenQuery) : '') + '</div>';
    if (!r.ok) html += renderError(j, r.status);
    if (r.ok && kind === "ask") {
      html += '<div class="answer">' + renderAnswer(j.answer, turn, j.sources.length) + '</div>';
      if (j.invalidCitations && j.invalidCitations.length) html += '<div class="callout error">The answer cites sources that do not exist: ' + j.invalidCitations.map((n) => "[" + n + "]").join(" ") + '</div>';
      history = history.concat([{ role: "user", content: question }, { role: "assistant", content: j.answer }]).slice(-10);
    }
    const sources = kind === "ask" ? j.sources : j.results;
    html += renderSources(sources, j.cited || [], turn);
    const extra = j.timings
      ? [j.timings.retrievalMs != null ? "retrieval " + j.timings.retrievalMs + " ms" : "", j.timings.answerMs != null ? "answer " + j.timings.answerMs + " ms" : "",
         j.costUsd != null ? "$" + j.costUsd.toFixed(4) : "", j.model || ""].filter(Boolean).join(" · ")
      : (j.ms != null ? j.ms + " ms" : "");
    html += renderStages(j.stages, extra);
    el.innerHTML = html;
  } catch (e) {
    el.innerHTML += '<div class="callout error">' + esc(e.message) + '</div>';
  } finally {
    document.querySelectorAll("form button").forEach((b) => (b.disabled = false));
  }
}

$("#f").addEventListener("submit", (e) => { e.preventDefault(); run("ask"); });
$("#search").addEventListener("click", () => run("search"));
$("#reset").addEventListener("click", () => { history = []; $("#turns").innerHTML = ""; $("#q").focus(); });
document.querySelectorAll(".chip").forEach((b) => b.addEventListener("click", () => { $("#q").value = b.dataset.q; run("ask"); }));
</script>
</body>
</html>`;
}
