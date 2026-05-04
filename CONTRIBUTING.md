# Contributing

Use short-lived branches off `master` and open a pull request back to `master`.
Keep PRs focused, describe the checks you ran, and wait for CI before merging.

## Pull request flow

1. Create a branch from an up-to-date `master`.
2. Make the smallest coherent change and include tests for behavior changes.
3. Open the PR to `master` and complete the PR template.
4. Wait for the CI build and tests to pass.
5. Merge after review approval and green CI.

## Local checks

CI installs with Bun, runs coverage, builds the UI package, and builds the Next
site. Run the relevant subset locally before opening the PR:

```bash
bun install
bun run test:coverage
bun run build
```

## Deploys

Pushes to `master` run the same checks and deploy to Vercel production after the
test job passes. Pull requests run CI/build only. Changes under `packages/ui/`
also trigger the UI package workflow; publishing the package still requires the
manual `workflow_dispatch` publish job.

## Repo notes

- The site is a Bun + Next app with a local `packages/ui` workspace.
- The production deploy needs the Vercel and Supabase environment variables
  configured in GitHub Actions.
- After pushing changes, verify Vercel status with `vercel ls 2>&1 | head -5`.
