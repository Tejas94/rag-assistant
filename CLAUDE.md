# CLAUDE.md

This repo is a portfolio project its owner is building to learn AI engineering, as weeks
4-6 of a 12-week plan. Help them learn; do not do the learning for them.

## How to help here

- The core retrieval and answer pieces are `TODO(P2-nn)` stubs that the owner writes. Do
  not implement a TODO unless they explicitly ask you to write it. Otherwise explain the
  concept, point to the relevant docs or file, give a hint or a small example on different
  data, and let them write it.
- When they ask for a review, check their code against the TODO's comment and its spec in
  `tests/specs`, then suggest the most important improvement first, one at a time.
- Plumbing (server, CLI, database setup, CI, docs, tooling) can be changed freely when asked.
- Prefer measuring to guessing: after a chunking, embedding, retrieval or prompt change,
  suggest `npm run eval` and compare `evals/report.md` with the committed version.
- If they ask to be quizzed, ask one question at a time and wait for their answer.
- Never commit `.env` or API keys.

## Commands

```bash
npm run db:up        # Postgres + pgvector on port 5433 (Docker); db:reset wipes it
npm run ingest       # rebuild the index from corpus/
npm run eval         # retrieval metrics per mode; -- --answers also judges answers (costs money)
npm run ask -- "question" hybrid
npm run dev          # web UI on http://localhost:3000
npm run typecheck
npm test             # all tests; tests/specs are red until their TODO is done
npm run test:core    # what CI requires
npm run progress     # open and done TODOs; add -- --specs to run the specs too
```

## Layout and conventions

- Pipeline: `src/corpus.ts` → `chunk.ts` → `embed.ts` → `db.ts`; queries in `retrieve.ts`;
  answers in `answer.ts`; evals in `evals/` with the golden set in `evals/golden.jsonl`.
- Schema in `db/schema.sql`: `vector(1024)` must match the embedding model's dimensions.
- Models come from `ANTHROPIC_MODEL` (default `claude-opus-5-5`) and `JUDGE_MODEL`
  (default `claude-haiku-4-5`). Anthropic has no embedding model; this project uses Voyage.
- A finished TODO: delete its `TODO(P2-nn)` marker, and move its spec from `tests/specs` to
  `tests/core` once it is green.
- Experiments go in `docs/EXPERIMENTS.md`; the weekly plan is `docs/LEARNING_PATH.md`.
