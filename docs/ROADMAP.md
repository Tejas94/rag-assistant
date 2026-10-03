# Roadmap: from learning project to production

The project grows in three stages. Stage 1 is the weeks 4-6 build. Stage 2 is week 10 of
the plan. Stage 3 is for after week 12, when you want it to be a product rather than a
portfolio piece. Pick from stage 3; you do not need all of it.

## Stage 1: measurable RAG over real docs (weeks 4-6)

- [ ] Week 4: chunking, vector search and metrics done; fake and Voyage baselines logged
- [ ] Week 5: keyword search, fusion, reranking and cited answers; every mode in the eval
- [ ] Week 6: 50 golden questions, a judge that agrees with 18 of your 20 labels
- [ ] All ten TODOs done (`npm run progress` shows 10 of 10)
- [ ] README results table with at least three setups and the judge agreement rate
- [ ] Deployed with managed Postgres and pgvector

## Stage 2: production-ready (week 10)

| Item | Why it matters |
| --- | --- |
| Incremental ingestion: re-embed only pages whose content hash changed, delete removed ones | A full re-embed costs money and time on every docs release |
| Version-aware docs: ingest several Next.js versions with a version column and filter | "How do I do X in Next.js 14?" is a real question, and old answers are the usual failure |
| Prompt caching on the system prompt and the sources | Cuts input cost; measure it with `usage.cache_read_input_tokens` |
| Stream answers to the page | Time to first token is what users feel |
| Rate limit `/ask` per IP and cap the daily spend | A public demo with your API key is an open wallet |
| Questions and docs are untrusted input: injection tests through the question and through a planted chunk | Retrieved text and user text must never override the prompt |
| Retrieval eval in CI against a `pgvector/pgvector` service container | A chunking change that drops recall fails the PR |
| Cost per answer logged and shown, per model | Turns "it's cheap" into a number you can quote |
| Freshness: a scheduled job that bumps the pinned ref, re-ingests and re-runs the eval | Docs change; a stale index gives confident wrong answers |

## Stage 3: scale (after week 12)

| Item | What you learn |
| --- | --- |
| Several doc sets (Next.js, React, React Native) with metadata filters | Routing a question to the right corpus, and precision without more embeddings |
| An MCP server exposing `search_docs`, so Claude Code can search the docs (links to Project 3) | Turning a retrieval system into a tool an agent uses |
| Contextual retrieval: a short generated context line per chunk at ingestion | A known technique for recall, measured on your own eval |
| A feedback loop: thumbs up or down on answers turns into new golden questions | Evals that grow from real traffic |
| Long-context comparison: a whole docs section in the prompt with caching vs. RAG | When to skip RAG entirely |
| Tracing with Langfuse or OpenTelemetry; dashboards for recall, cost and p95 latency | Observability for LLM systems |
| A Slack bot or an IDE extension on top of `POST /ask` | Meeting developers where they already ask questions |

## Before you share the repo

- [ ] Live demo link, demo GIF, architecture diagram and a filled-in "Evals and results" table
- [ ] `evals/report.md` and `evals/calibration.md` committed from the final run
- [ ] No secrets in the history (`git log -p | grep -i "sk-ant\|pa-"` returns nothing)
- [ ] No fetched docs in the repo (`git ls-files corpus` lists only `corpus/README.md`)
- [ ] `npm run progress` shows every TODO done; `tests/specs` is empty
- [ ] Decide whether `docs/LEARNING_PATH.md` and the tutor-mode `CLAUDE.md` stay public
- [ ] Pin the repo on your GitHub profile
