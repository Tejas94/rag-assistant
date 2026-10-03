# Experiment log

One row per change you measure. Change one thing at a time, run `npm run eval` before and
after, commit the report with the change, and write down what happened, including the
experiments that made things worse. This log is where your README results and your
interview stories come from.

| Date | Change | Mode | Recall@5 before → after | MRR before → after | Notes |
| --- | --- | --- | --- | --- | --- |
| | Baseline: fake embedder, 1200-char chunks | vector | – → | – → | |

## Experiments worth running

- [ ] Fake vs. Voyage embeddings
- [ ] Chunk size 300 vs. 1200 vs. whole section
- [ ] With and without the heading path in the embedded text (`embeddingText()`)
- [ ] Keyword search: all words must match vs. any word, with stopwords removed
- [ ] Vector vs. keyword vs. hybrid on the full golden set
- [ ] Answer model: Opus vs. Sonnet vs. Haiku on correct and faithful rates, with cost
- [ ] Judge model: does a cheaper judge still agree with your 20 labels?
