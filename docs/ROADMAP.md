# Roadmap: from learning project to production

The project grows in three stages. Stage 1 is the weeks 4-6 build. Stage 2 is week 10 of
the plan. Stage 3 is for after week 12, when you want it to be a product rather than a
portfolio piece. Pick from stage 3; you do not need all of it.

## Stage 1: measurable RAG (weeks 4-6)

- [ ] All ten TODOs done (`npm run progress` shows 10 of 10)
- [ ] A real corpus and 50 golden questions written for it
- [ ] README results table with at least three setups and the judge agreement rate
- [ ] Deployed with managed Postgres + pgvector

## Stage 2: production-ready (week 10)

| Item | Why it matters |
| --- | --- |
| Validate `/ask` input with Zod; cap question length | Never trust the client |
| Rate limit `/ask` per IP | A public demo with your API key is an open wallet |
| Prompt caching on the system prompt | Cuts input cost; measure it with `usage.cache_read_input_tokens` |
| Log `usage` per question and show cost per answer | Turns "it's cheap" into a number you can quote |
| Stream answers to the UI | Time to first token is what users feel |
| Prompt-injection tests: a document that says "ignore your instructions" | Retrieved text is untrusted input; answers must not obey it |
| Retrieval eval in CI against a `pgvector/pgvector` service container | A chunking change that drops recall fails the PR |
| Incremental ingestion: re-embed only changed documents, delete removed ones | Stale chunks produce confident wrong answers |

## Stage 3: scale (after week 12)

| Item | What you learn |
| --- | --- |
| Per-user or per-team document permissions, filtered in SQL before ranking | Security in retrieval, the question every enterprise asks |
| Metadata filters (product, date, doc type) in the query | Precision without more embeddings |
| A reranker (Voyage or Cohere) and a measured latency budget | Quality vs. latency trade-offs |
| Contextual retrieval: a short generated context line per chunk at ingestion | A known technique for recall, measured on your own eval |
| Ingestion as a queue-backed worker (for example BullMQ) for thousands of documents | Background jobs, retries, idempotency |
| A Next.js UI with source cards and a debug view of each retrieval stage (reuse Project 1) | Explaining retrieval to users and to interviewers |
| Long-context comparison: the whole corpus in the prompt with caching vs. RAG | When to skip RAG entirely |
| Tracing with Langfuse or OpenTelemetry; dashboards for recall, cost and p95 latency | Observability for LLM systems |

## Before you share the repo

- [ ] Real corpus and golden set, no sample "Northwind Cloud" data
- [ ] Live demo link, architecture diagram and a filled-in "Evals and results" table
- [ ] No secrets in the history (`git log -p | grep -i "sk-ant\|pa-"` returns nothing)
- [ ] `npm run progress` shows every TODO done; `tests/specs` is empty
- [ ] Decide whether `docs/LEARNING_PATH.md` and the tutor-mode `CLAUDE.md` stay public
- [ ] Pin the repo on your GitHub profile
