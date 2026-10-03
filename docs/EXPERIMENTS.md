# Experiment log

One row per change you measure. Change one thing at a time, run `npm run eval` before and
after, commit the report with the change, and write down what happened, including the
experiments that made things worse. This log is where your README results and your
interview stories come from.

| Date | Change | Mode | Recall@5 before → after | MRR before → after | Correct / faithful | Cost per answer | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| | Baseline: fake embedder, 2000-char chunks, 200 overlap | vector | – → | – → | | | |

## Experiments worth running

- [ ] Fake vs. Voyage embeddings (`voyage-3.5`)
- [ ] `voyage-3.5` vs. `voyage-code-3` on these code-heavy docs
- [ ] Chunk size 800 vs. 2000 vs. 4000 characters, and overlap 0 vs. 200
- [ ] With and without the title and heading path in the embedded text (`embeddingText()`)
- [ ] Keyword search: every word must match vs. any word
- [ ] Vector vs. keyword vs. hybrid vs. hybrid + rerank, by question type
- [ ] RRF k = 1 vs. 60 vs. 600
- [ ] Rerank 10 vs. 30 vs. 50 candidates: recall against latency
- [ ] Unwrap vs. drop `<PagesOnly>` text on App Router pages (`src/clean.ts`)
- [ ] Answer model: Opus vs. Sonnet vs. Haiku on correct and faithful rates, with cost
- [ ] Answer effort `low` vs. the default, with cost
- [ ] Judge model: does a cheaper judge still agree with your 20 labels?
- [ ] Query rewriting on and off for the follow_up questions (stretch)
- [ ] A similarity threshold for abstaining: how many unanswerable questions does it catch, and how many good answers does it block? (stretch)

## Judge calibration

| Date | Judge model | Prompt change | Agreement (all fields) | correct | faithful | abstained |
| --- | --- | --- | --- | --- | --- | --- |
| | | First version | /20 | /20 | /20 | /20 |

## Failures worth a story

Two or three answers that were wrong, why (retrieval or generation), and what fixed them.
They go in the README and make good interview answers.

| Question | What went wrong | Retrieval or answer? | Fix | Before → after |
| --- | --- | --- | --- | --- |
| | | | | |
