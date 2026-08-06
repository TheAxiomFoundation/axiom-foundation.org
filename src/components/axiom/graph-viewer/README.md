# Graph viewer (scoped copy)

This directory started as a scoped copy of the standalone
[rulespec-graph-viewer](https://github.com/TheAxiomFoundation/rulespec-graph-viewer)
(see the header of `graph-styles.css`) and renders the same computation
graphs inside the site. There is no automated sync in either direction.

What that means in practice:

- **Shared modules** — `api.ts`, `citations.ts`, `formula.ts`, `types.ts`,
  `graph-styles.css`, `InteractiveRuleGraph.tsx` — exist in both repos, and
  the copies have already diverged (`InteractiveRuleGraph.tsx` differs;
  `formula.ts` is currently identical). A fix to shared behavior lands in
  **both** repos, as two PRs, or it quietly holds in only one.
- **Site-only modules** — `viewer-app.tsx`, `corpus-field` wiring,
  `inspector-mini-graph.tsx`, `compose-filter.ts`, `launcher-mode.ts`, the
  `subtree-*` components, and the test files — have no standalone
  counterpart; change them here only.
- The standalone repo deploys separately (manual deploy) and keeps its own
  app shell (`App.tsx`, `main.tsx`) that the site copy does not carry.

Cross-repo tracking:
[rulespec-graph-viewer#17](https://github.com/TheAxiomFoundation/rulespec-graph-viewer/issues/17).
The field vocabulary this viewer plugs into is documented in
[docs/corpus-field-concepts.md](../../../../docs/corpus-field-concepts.md).
