# Progress

## State

In progress: auditing and restructuring `/verify` for the US-only launch on
2026-07-28.

Publishing is currently blocked because `gh auth status` reports an invalid
GitHub token for the active account. Local implementation and validation can
continue.

## Done

- Read `CLAUDE.md` and `AGENTS.md`.
- Confirmed the working tree started clean on `launch/verify-us-only`.
- Confirmed the target remote is
  `TheAxiomFoundation/axiom-foundation.org`.
- Confirmed the pull request must target `master`.

## Next

- Audit the existing verification data and page rendering.
- Remove non-US launch-surface rows and numbers.
- Update the committed US verification evidence.
- Add the closure section with explicit federal-count placeholders.
- Run `bun run build` and resolve all warnings or errors.
- Write the final report, push the branch, open the requested draft pull
  request, and check Vercel status without initiating a deployment.
