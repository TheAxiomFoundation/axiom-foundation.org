# Progress

## State

The strict reader and reusable status states are now wired into the Library's
encoding index and per-rule rail. Work is moving to the Plane's graph-node
inspector and the local mirror API.

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
- Typed RuleSpec `module.deferred_outputs` declarations, including their output,
  reason, source values, and raw evidence.
- Preserved deferred-output declarations when section rendering merges several
  source modules, instead of silently dropping the incompleteness record.
- Passed the RuleSpec parser and section-encoding suites: 2 files, 39 tests.
- Added the deliberate certification ledger state to the encoded-rules index.
- Threaded the server-read snapshot into section pages and exact RuleSpec legal
  IDs into every encoding card; only an exact entry can render the mark.
- Added a module-level declared-incomplete notice with every published deferred
  output reason, and a single operational warning per rail on reader failure.
- Added Library integration coverage for the valid empty state and an exact
  certified node.
- Passed the focused Library integration suite: 6 files, 62 tests.

## Next

- Replace the hosted certification passthrough with the local mirror and use it
  in graph-node views without trusting runtime certification fields.
- Run the production build and final focused test pass.
