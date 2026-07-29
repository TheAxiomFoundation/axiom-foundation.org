# Progress

## State

The strict reader and reusable status states are wired into the Library and
Plane. The local mirror is now the only source that can render certification.
Work is moving to the production build and final verification.

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
- Distinguished an unavailable ledger from a confirmed ledger absence in node
  copy, and made missing RuleSpec identities visible instead of omitting status.
- Passed the focused status/rail regression suite: 3 files, 21 tests.
- Replaced the runtime `/certified` passthrough with the fail-closed local
  mirror snapshot, including 503/no-store behavior for operational failures.
- Added a strict browser-side snapshot validator so network, JSON, HTTP, or
  schema failures remain visibly fail-closed.
- Wired exact graph rule legal IDs into the shared certification status and
  removed runtime certificate/status fields, certified counts, the invented
  awaiting count, and runtime-ledger provenance copy.
- Reused the deliberate ledger empty state when a program graph is empty and
  the authoritative mirror confirms zero passing nodes.
- Passed the focused certification data-path and UI suite: 7 files, 37 tests.

## Next

- Run the production build and final focused test pass.
- Verify the mirrored YAML is included in the production function trace.
- Record final schema feedback, publication results, and handoff files.
