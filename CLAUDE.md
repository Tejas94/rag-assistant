# CLAUDE.md

This repo is a portfolio project its owner is building to learn AI engineering, as weeks
4-6 of a 12-week plan. Help them learn; do not do the learning for them.

## How to help here

- The core retrieval, answer and eval pieces are `TODO(P2-nn)` stubs that the owner
  writes. Do not implement a TODO unless they explicitly ask you to write it. Otherwise
  explain the concept, point to the relevant docs or file, give a hint or a small example
  on different data, and let them write it.
- When they ask for a review, check their code against the TODO's comment and its spec in
  `tests/specs`, then suggest the most important improvement first, one at a time.
- Plumbing (loader, cleaner, server, UI, CLI, eval runner, database setup, CI, docs,
  tooling) can be changed freely when asked.
- Prefer measuring to guessing: after a chunking, embedding, retrieval or prompt change,
  suggest `npm run eval` and compare `evals/report.md` with the committed version.
- The golden set is theirs to write (P2-09). Do not add questions or relevant pages to
  `evals/golden.jsonl` unless they ask; review the ones they write against the docs in
  `corpus/`.
- If they ask to be quizzed, ask one question at a time and wait for their answer.
- Never commit `.env`, API keys or the fetched docs in `corpus/`.

## Commands

```bash
npm run db:up        # Postgres + pgvector on port 5433 (Docker); db:reset wipes it
npm run db:schema    # apply db/schema.sql to DATABASE_URL (no Docker)
npm run docs:fetch   # pinned docs for DOCS_SOURCE into corpus/<source>
npm run ingest       # rebuild the index from the fetched docs
npm run eval         # retrieval metrics per mode; -- --answers also judges answers (costs money)
npm run eval:calibrate  # judge vs. the labels in evals/labels.jsonl
npm run ask -- "question" hybrid
npm run dev          # web UI on http://localhost:3000
npm run typecheck
npm test             # all tests; tests/specs are red until their TODO is done
npm run test:core    # what CI requires
npm run progress     # open and done TODOs; add -- --specs to run the specs too
npm run todos        # where each open TODO marker is
```

## Layout and conventions

- Pipeline: `src/sources.ts` (presets) → `fetch-docs.ts` → `corpus.ts` and `clean.ts`
  (load and clean) → `chunk.ts` → `embed.ts` → `db.ts`; queries in `retrieve.ts` and
  `rerank.ts`; answers in `answer.ts`; routes in `app.ts`, the page in `ui.ts`.
- Evals in `evals/`: the golden set in `golden.jsonl`, the runner in `run.ts`, the report
  in `report.md` (committed), the judge in `judge.ts`, labels in `labels.jsonl`.
- Schema in `db/schema.sql`: `vector(1024)` must match the embedding model's dimensions.
  Every row records its `embed_model`; `ask` and the eval refuse an index built with a
  different embedder, and the server warns at startup.
- Models come from `ANTHROPIC_MODEL` (default `claude-opus-5-5`) and `JUDGE_MODEL`
  (default `claude-haiku-4-5`). Anthropic has no embedding model; this project uses Voyage
  (`EMBEDDER`, `RERANKER`). Prices are in `src/cost.ts`.
- Tests never touch the network, a database or an API. Loader tests use the small made-up
  pages in `tests/fixtures`; never copy the real docs into the repo.
- A finished TODO: delete its `TODO(P2-nn)` marker, and move its spec from `tests/specs` to
  `tests/core` once it is green.
- Experiments go in `docs/EXPERIMENTS.md`; the weekly plan is `docs/LEARNING_PATH.md`.
