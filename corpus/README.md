# corpus/

`npm run docs:fetch` clones the docs for the current `DOCS_SOURCE` here, one folder per
source:

- `corpus/nextjs/`: the `docs/` folder of vercel/next.js at tag v16.3.8 (the default).
- `corpus/react-native/`: the released docs from facebook/react-native-website at a
  pinned commit.

The clones are gitignored. Never commit them: the docs belong to their authors, and
anyone can fetch the same pinned version with one command. Each clone has a
`.fetched.json` that records the ref, so `docs:fetch` only fetches again when the ref in
`src/sources.ts` changes (or with `-- --force`).

Set `CORPUS_DIR` to keep the clones somewhere else.
