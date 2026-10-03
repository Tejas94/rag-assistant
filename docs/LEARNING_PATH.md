# Learning path: weeks 4-6

This project is the build half of weeks 4-6 of the 12-week plan. Each week, read that week's
lesson in the study pack (in the `study-pack` folder of your Claude project), then come
here and build. The study pack's "RAG architecture and pipeline: a deep dive" is the
reference for all three weeks.

The study pack asks you to choose a document set you know. This one is the Next.js docs,
which you know from years of work: you can tell a good answer from a plausible one, and
so can any interviewer who tries the demo.

Every week ends the same way: run the checks and the eval, log the numbers in
[EXPERIMENTS.md](EXPERIMENTS.md), commit `evals/report.md` with the code that produced it,
and push.

```bash
npm run typecheck && npm test   # specs for open TODOs are expected to be red
npm run eval                    # retrieval numbers; needs the database, the docs and an index
npm run progress                # what is left
```

## Week 4: embeddings and vector search

**Read:** study pack, week 4 "Embeddings and vector search", and sections 1-3 of the deep dive.

**Build:** P2-01 (chunking), P2-02 (vector search), P2-03 (metrics), P2-04 (Voyage embeddings).

The study pack's milestone asks for an ingestion script, a search endpoint, an answer
endpoint and a debug view. They already exist here as plumbing; your TODOs are the parts
inside them that decide whether retrieval is any good.

1. Set up: `npm run db:up`, `npm run docs:fetch`, `npm run dev`. The page loads, and
   asking anything shows which TODO it is waiting for. Open three pages in
   `corpus/nextjs/docs` and look at the raw MDX: `<AppOnly>`, code blocks with filenames,
   "Good to know" notes. That is what the loader cleans and what you chunk.
2. P2-01: make `tests/specs/chunk.test.ts` green, then move it to `tests/core`. Run
   `npm run ingest` and read twenty random chunks with the query in the TODO comment. Does
   each one make sense on its own? Look hard at the ones next to code blocks.
3. P2-02: one SQL query with the `<=>` operator. Try it from the page with "Search only"
   in vector mode, or `curl "localhost:3000/search?q=revalidatePath&mode=vector"`.
4. P2-03: make `tests/specs/metrics.test.ts` green. Now `npm run eval` prints real numbers
   for the fake embedder. That is your baseline; write it down.
5. P2-04: Voyage embeddings with batching and retries. Set `EMBEDDER=voyage`, re-ingest,
   re-run the eval. The jump from the fake embedder is your first experiment row.

**Try on purpose:** ingest with `fake`, then run `npm run ask` with `EMBEDDER=voyage` and
read the error. The server only warns at startup: what would a search return without that
check? Ingest with `CHUNK_MAX_CHARS=800` and `4000` and compare the vector row. Ask for `generateStaticParams` and see whether the chunk with the
code example or the one with the explanation wins.

**Done when:** the eval shows vector-mode numbers for both embedders, and both rows are in
EXPERIMENTS.md.

**Interview angle:** "How would you chunk documentation that is half code, and how would
you know it worked?"

## Week 5: making RAG good

**Read:** study pack, week 5 "Making RAG good", and sections 4-5 of the deep dive.

**Build:** P2-05 (keyword search), P2-06 (fusion), P2-07 (reranking), P2-08 (answers with citations).

1. Before changing anything, read the 15 starter questions in `evals/golden.jsonl` and
   save the "Rank of the first relevant page" table from `evals/report.md`. That is the
   "current behaviour" the lesson asks you to note. The lesson suggests 5 unanswerable
   questions; the starter has 2, so add three now (they count toward P2-09).
2. P2-05: Postgres full-text search. The comment explains why "every word must match"
   hurts recall. Find one question where keywords beat vectors and one where they lose,
   and add both to the golden set.
3. P2-06: make `tests/specs/rrf.test.ts` green. Compare the vector, keyword and hybrid rows.
4. P2-07: make `tests/specs/rerank.test.ts` green with the fake reranker, then write the
   Voyage client and run the eval with `RERANKER=voyage`.
5. P2-08: the answer prompt with `[n]` citations and the exact abstain sentence. Try
   `npm run ask` on an unanswerable question from the golden set, then use the page: click a
   citation and check that it opens the right section on nextjs.org.

**Try on purpose:** set a wrong `VOYAGE_API_KEY` with `RERANKER=voyage` and ask from the
page. The answer should still arrive, with the fallback marked in the debug panel. Ask "How
do I run code before every request?": Next.js 16 renamed middleware to proxy, so an answer
from the model's memory instead of the sources shows up here.

**Stretch, from the study pack:**

- Query rewriting for follow-up questions in `src/rewrite.ts`. The golden set's follow_up
  question measures it, and the page already sends the conversation.
- A similarity threshold for "I don't know": when the best vector score is below a cutoff,
  skip the model call. Tune the cutoff on the unanswerable questions.
- A metadata filter: App Router pages only (`doc_path LIKE '01-app/%'`) unless the
  question mentions the Pages Router.

**Done when:** the eval shows all four modes, answers cite real sources, and the
unanswerable questions get the abstain sentence.

**Interview angle:** "Vector, keyword or hybrid search: when does each win, and what does
a reranker add?"

## Week 6: measure retrieval

**Read:** study pack, week 6 "Measure retrieval", and section 6 of the deep dive.

**Build:** P2-09 (50 golden questions), P2-10 (calibrated judge).

1. P2-09: grow the golden set to 50. Write each question the way a developer would ask it,
   before you open the page, then confirm the answer in the pinned docs. Mix the types as
   the comment in `evals/golden.ts` suggests, and keep 10 to 15 questions as a held-out
   set you only run at the end.
2. P2-10: run `npm run eval -- --answers`, label 20 answers yourself in
   `evals/labels.jsonl` before you write the judge, then build it and run
   `npm run eval:calibrate` until it agrees with you on at least 18 of 20. The agreement
   rate goes in the README.
3. Fill the experiment table for at least three configurations: fake vector, Voyage
   vector, Voyage hybrid and Voyage hybrid + rerank.
4. Deploy with managed Postgres and pgvector (Neon, Supabase or Railway).
5. Fill in "Evals and results" in the README: the table, two failures and how you fixed
   them, and the known limitations. Add a demo GIF and keep the diagram current.

**Done when:** `npm run progress` shows 10 of 10, and the README has a live link, the
results table and the judge agreement rate.

**Interview angle:** "How do you know your RAG system got better after a change?"

## Later weeks that come back here

- **Week 9 (evals as a discipline):** run the retrieval eval in CI against a
  `pgvector/pgvector` service container with the fake embedder, so a chunking change that
  drops recall fails the PR. Do the error analysis on `evals/answers-latest.jsonl`.
- **Week 10 (production concerns):** stage 2 of the [roadmap](ROADMAP.md) if you pick this
  project for the week: prompt caching, a cheaper model for easy questions, cost per
  answer, rate limits and injection tests (a question that tries to override the prompt,
  and a planted chunk that does the same).
- **Week 11 (fine-tuning and the wider field):** use this project for "RAG adds knowledge,
  fine-tuning changes behaviour". Why would fine-tuning on the Next.js docs be the wrong
  answer when version 17 ships?
- **Week 12 (interview-ready):** whiteboard this pipeline from memory (section 8 of the
  deep dive), and answer "Our RAG assistant gives wrong answers. How do you debug it?"
  with your own report as the example.
