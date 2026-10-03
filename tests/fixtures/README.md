# Test fixtures

Small, made-up pages in the shapes the real docs use. They are written for the tests,
not copied from Next.js or React Native, and they stay tiny on purpose.

- `nextjs/` mimics the Next.js docs: numeric folder prefixes, MDX imports and exports,
  `<AppOnly>` and `<PagesOnly>`, an `<Image>` with alt text, a generated Pages Router
  copy (`source:` in the frontmatter) and a page with nothing left after cleaning.
- `react-native/` mimics the Docusaurus docs: frontmatter ids, admonitions, tabs and a
  partial whose name starts with `_`.
