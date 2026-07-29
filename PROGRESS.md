# Progress

## State

The strict reader, certification status component, operational alert, and
deliberate empty/filled ledger states are implemented. Work is now moving to
the actual encoding and graph-node integrations.

## Done

- Read the repository's `CLAUDE.md` before other repository inspection.
- Preserved unrelated untracked files in the original checkout by creating a
  dedicated worktree and branch.
- Attempted to refresh `origin/master`; recorded the sandbox DNS failure rather
  than claiming the local ref is current.
- Read the complete certification-file header available at ops
  `origin/launch/certified-nodes` commit `187f8e7`. Local ops `origin/main` is
  stale and lacks the file; both shell network and the GitHub connector were
  unable to retrieve a newer `main`.
- Mirrored the generated-only `axiom.certified_nodes.v1` file exactly, including
  its deliberate `nodes: []` state.
- Added a typed, strict reader that rejects malformed YAML, missing files,
  unexpected keys/shapes, duplicate node IDs, false criteria, and incomplete
  evidence. Every failure produces an operational warning and zero certified
  nodes.
- Added focused reader tests for malformed, missing, unexpected, certified,
  absent, and valid-empty cases.
- Passed the focused reader suite: 1 file, 5 tests.
- Confirmed the mirror is byte-for-byte identical to the latest locally
  available ops blob.
- Ran `tsc --noEmit`; it reported pre-existing test-fixture typing errors and a
  missing `@xyflow/react` installation, with no certification-reader errors.
- Confirmed a schema limitation: the structured file has no uncertified rows,
  frontier, deferred-output, pending, completeness, or fidelity fields.
- Added a reusable status component whose mark is controlled only by an exact
  generated-ledger entry.
- Added source-backed non-certified presentations for validated frontiers,
  declared deferred outputs, pending ledger rows, and the only file-derived
  fallback: absent/not certified.
- Added a visible operational alert that cannot be mistaken for a valid empty
  ledger.
- Designed the zero-node state as deliberate copy: the automatic rule, all five
  criteria, and an explicit statement that the schema does not publish
  per-node failed checks.
- Passed the reader and status-component suites together: 2 files, 10 tests.

## Next

- Show the badge/status on encoding and graph-node views, with supplemental
  reasons only where their source metadata is actually present.
- Run the focused component tests and commit each coherent UI integration.
