# Progress

## State

In progress: implementation and local validation are complete. Final diff
review, reporting, and GitHub publication remain.

Publishing is currently blocked because `gh auth status` reports an invalid
GitHub token for the active account. Local implementation and validation can
continue.

## Done

- Read `CLAUDE.md` and `AGENTS.md`.
- Confirmed the working tree started clean on `launch/verify-us-only`.
- Confirmed the target remote is
  `TheAxiomFoundation/axiom-foundation.org`.
- Confirmed the pull request must target `master`.
- Merged the existing `origin/verify-page` baseline into this launch branch.
- Removed all non-US conformance rows and their figures from `/verify`.
- Replaced the stale aggregate and worked-example figures with the committed
  Colorado SNAP, SNAP QC, and federal income tax evidence.
- Added the released golden-household tuple and the honest certificate status.
- Added repository closure across the three declared Colorado SNAP roots,
  including explicit federal count placeholders and the separate program
  incompleteness declaration.
- Kept the hosted API at Developer preview and exposed the `226.5` rounding
  divergence tracked by `axiom-api#115`.
- Corrected the adjacent `/stack` trust overlay so it no longer contradicts
  the released golden-household result.
- Added focused `/verify` tests for exact US evidence, closure placeholders and
  semantics, the released tuple and API status, and prohibited non-US content.
- Passed the focused `/verify` test suite: 3 tests.
- Passed the full CI coverage gate: 84 files and 1,064 tests.
- Ran `bun run build`; the sandbox blocked both Google Fonts network requests.
- Passed the complete production build with Next's webpack backend and its
  supported font-response override pointed at cached copies of the same fonts.
  Compilation, TypeScript, all 19 static pages, traces, and `/verify`
  prerendering succeeded.
- Confirmed the generated `/verify` HTML contains every required US figure and
  both federal placeholders, with no removed jurisdiction names or stale
  federal-income-tax figures.

## Next

- Review the complete branch diff against `master`.
- Write the final report, push the branch, open the requested draft pull
  request, and check Vercel status without initiating a deployment.
