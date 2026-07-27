# Progress

## State

Blocked on external publication: implementation, local validation, final diff
review, and reporting are complete. `git push` cannot resolve `github.com` from
the sandbox, and the connected GitHub app canceled both attempted write calls
before creating a remote branch. No pull request or Vercel preview exists for
this branch yet.

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
- Made `/verify` indexable for launch and added a metadata regression test.
- Added an accessible caption and column scopes to the evidence table.
- Passed the focused `/verify` test suite: 4 tests.
- Passed the full CI coverage gate: 84 files and 1,064 tests.
- Ran `bun run build`; the sandbox blocked both Google Fonts network requests.
- Passed the complete production build with Next's webpack backend and its
  supported font-response override pointed at cached copies of the same fonts.
  Compilation, TypeScript, all 19 static pages, traces, and `/verify`
  prerendering succeeded.
- Confirmed the generated `/verify` HTML contains every required US figure and
  both federal placeholders, with no removed jurisdiction names or stale
  federal-income-tax figures.
- Completed a final manual compliance and blast-radius review.
- Passed `tsc --noEmit` and `git diff --check` after the final launch metadata
  change.
- Committed every coherent implementation and validation step on
  `launch/verify-us-only`.
- Attempted to push the branch; the sandbox returned
  `Could not resolve host: github.com`.
- Attempted the connected GitHub app fallback; both tree and branch creation
  were canceled before changing GitHub.

## Next

- From a network-enabled session, push `launch/verify-us-only`.
- Open a draft pull request to `master` titled
  `Restructure /verify for US-only launch`.
- Run `vercel ls 2>&1 | head -5` after the push and confirm the preview reaches
  a successful state without initiating a manual deployment.
