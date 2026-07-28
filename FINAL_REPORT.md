# US-only verify launch report

## Outcome

The `/verify` implementation is complete and committed on
`launch/verify-us-only`. It is US-only, uses the supplied exact figures and
released tuple, keeps the hosted API at Developer preview, exposes the `226.5`
API divergence, separates repository closure from acknowledged program
incompleteness, and renders `certified: unavailable` as plain text.

PR URL: unavailable. The sandbox could not resolve `github.com` for `git push`,
and the connected GitHub app canceled both attempted write calls before
creating a remote branch. Consequently there is no Vercel preview to inspect.

## Validation

- `bunx vitest run src/app/verify/verify.test.tsx`: passed, 4 tests.
- `bun run test:coverage`: passed, 84 files and 1,064 tests; configured coverage
  thresholds passed.
- `tsc --noEmit`: passed.
- `git diff --check`: passed.
- Plain `bun run build`: reached Next.js/Turbopack compilation, then failed
  because the sandbox blocked the Google Fonts requests for JetBrains Mono and
  Newsreader.
- The full production build passed with Next's webpack backend and its
  supported Google-font response override pointed at cached copies of those
  exact fonts. Compilation, TypeScript, all 19 static pages, traces, and
  `/verify` prerendering completed without warnings.

## Placeholders

- `7 CFR 273`: exact closure counts pending from
  `axiom-oracles closure/summary.json`.
- `7 USC ch. 51`: exact closure counts pending from
  `axiom-oracles closure/summary.json`.

No other launch figure was guessed, rounded, or extrapolated.

## Existing content that may now be stale

- The compatibility open item was last checked 2026-07-26 and still describes
  `artifact_format_version` floor emission as prototyped and unmerged.
- The engine surface says capability introspection is merged but not yet
  released; today's brief did not provide a replacement state.
- The `/stack` trust source says layers 01–03 still need public-reachability
  confirmation and dates layers 04–07 to 2026-07-25.
- Broader site launch controls remain in their prelaunch posture:
  `src/app/sitemap.ts` omits `/verify`, shared product links remain withheld,
  and root metadata still says “Launching publicly July 28, 2026.” Those were
  left outside this `/verify`-focused change.

## Required publication handoff

1. Push `launch/verify-us-only` from a network-enabled session.
2. Open a draft PR to `master` titled
   `Restructure /verify for US-only launch`.
3. Run `vercel ls 2>&1 | head -5` after the push and confirm the preview
   succeeds without initiating a manual deployment.
