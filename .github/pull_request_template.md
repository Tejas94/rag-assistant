## What changed

## Why

## Evals

<!-- Delete this section if no chunking, embedding, retrieval, prompt or model setting changed. -->

| Metric | Before | After |
| --- | --- | --- |
| Recall@5 (hybrid) | | |
| MRR (hybrid) | | |
| Recall@5 / MRR (hybrid_rerank) | | |
| Correct / faithful answers | | |
| Abstained correctly | | |
| Cost per answer | | |

## Checklist

- [ ] `npm run typecheck` and `npm run test:core` pass
- [ ] `npm run eval` re-run if chunking, retrieval or prompts changed (report committed, logged in `docs/EXPERIMENTS.md`)
- [ ] The same embedder for the index and the queries (re-ingested after an embedding change)
- [ ] Finished TODO: marker deleted and its spec moved to `tests/core`
- [ ] No `.env`, API keys or fetched docs in the diff
