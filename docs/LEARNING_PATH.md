# Learning path: weeks 4-6

This project is the build half of weeks 4-6 of the 12-week plan. Each week, read that week's
lesson in the study pack (in the `study-pack` folder of your Claude project), then come
here and build. The study pack's "RAG architecture and pipeline deep dive" is the reference
for all three weeks.

Every week ends the same way: run the checks and the eval, log the numbers in
[EXPERIMENTS.md](EXPERIMENTS.md), commit `evals/report.md` with the code that produced it,
and push.

```bash
npm run typecheck && npm test   # specs for open TODOs are expected to be red
npm run eval                    # retrieval numbers; needs the database and P2-01, P2-03, P2-08
npm run progress                # what is left
```

## Week 4: embeddings and vector search

**Read:** study pack, week 4 "Embeddings and vector search".

**Build:** P2-01 (chunking), P2-03 (vector search), P2-08 (metrics), then P2-02 (real embeddings).

1. P2-01: make `tests/specs/chunk.test.ts` green, then move it to `tests/core`. Run
   `npm run ingest` and look at the chunks in the database (`psql`, or any SQL client on
   port 5433). Do they make sense on their own?
2. P2-03: one SQL query with the `<=>` operator. Answer the question in the comment: why
   order by distance and not by score?
3. P2-08: make `tests/specs/metrics.test.ts` green. The comment in `evals/metrics.ts` is
   enough to write both functions now; the week 6 lesson goes deeper. Now `npm run eval`
   prints real numbers for the fake embedder. That is your baseline; write it down.
4. P2-02: Voyage embeddings with batching and retries. Set `EMBEDDER=voyage`, re-ingest,
   re-run the eval. The jump from the fake embedder is your first experiment row.

**Done when:** the eval shows vector-mode numbers for both embedders, and both rows are in
EXPERIMENTS.md.

**Interview angle:** "How would you choose a chunk size, and how would you know it was right?"

## Week 5: making RAG good

**Read:** study pack, week 5 "Making RAG good".

**Build:** P2-04 (keyword search), P2-05 (fusion), P2-06 (answers with citations).

1. P2-04: Postgres full-text search. Expect poor recall at first (every word must match)
   and fix it, as the comment explains. Find one query where keywords beat vectors and one
   where they lose, and add both to the golden set.
2. P2-05: make `tests/specs/rrf.test.ts` green. Compare vector, keyword and hybrid rows.
3. P2-06: the answer prompt with `[n]` citations and the exact "I don't know based on the
   documents." sentence. Try `npm run ask` on the unanswerable question in the golden set.

**Stretch, from the study pack:** a reranker on the top 20-50 candidates, query rewriting
for follow-up questions, and a debug view in the UI that shows each stage (keyword hits,
vector hits, fused, final).

**Done when:** the eval shows all three modes, and answers cite real sources.

**Interview angle:** "Vector, keyword or hybrid search: when does each win?"

## Week 6: measure retrieval

**Read:** study pack, week 6 "Measure retrieval".

**Build:** P2-07 (50 golden questions), P2-09 (calibrated judge), P2-10 (real corpus).

1. P2-07: write questions the way a real user would, before reading the doc text. Mix
   lookups, paraphrases, multi-document questions, exact identifiers and about 10%
   unanswerable.
2. P2-09: label 20 answers yourself first, then build the judge and iterate until it agrees
   with you on at least 18 of 20. The agreement rate goes in the README.
3. P2-10: swap in a real document set you can talk about (50-500 documents) and rewrite the
   golden set for it. Re-run everything.
4. Deploy, then fill in "Evals and results" in the README.

**Done when:** `npm run progress` shows 10 of 10, and the README has a live link, the
results table and the judge agreement rate.

**Interview angle:** "How do you know your RAG system got better after a change?"

## Later weeks that come back here

- **Week 9 (evals as a discipline):** run the retrieval eval in CI against a pgvector
  service container, so a chunking change that drops recall fails the PR.
- **Week 10 (production concerns):** stage 2 of the [roadmap](ROADMAP.md): caching,
  permissions, injection tests and cost tracking.
- **Week 12 (interview-ready):** whiteboard this pipeline from memory and name three ways
  it fails in production.
