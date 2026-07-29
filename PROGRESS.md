# Progress

## State

In progress on `app/node-certification-status`, isolated in a worktree created
from the locally available `origin/master` at `578c498`. The sandbox cannot
resolve `github.com`, so the remote ref could not be refreshed before starting.

## Done

- Read the repository's `CLAUDE.md` before other repository inspection.
- Preserved unrelated untracked files in the original checkout by creating a
  dedicated worktree and branch.
- Attempted to refresh `origin/master`; recorded the sandbox DNS failure rather
  than claiming the local ref is current.

## Next

- Read the header and schema of
  `ops/launch-readiness/certified-nodes.yaml` on ops `main`.
- Map the existing node data, node views, design system, and test conventions.
- Implement and test the fail-closed reader, honest status badge, operational
  warning, and zero-certified-nodes empty state without modifying `/verify`.
