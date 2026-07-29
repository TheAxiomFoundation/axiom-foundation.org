# Node certification status report

## Outcome

The certification status surface is complete and locally committed on
`app/node-certification-status`. The certification mark is now controlled only
by an exact node entry in the generated `axiom.certified_nodes.v1` mirror.
Runtime certificate labels, runtime status fields, certified counts, and
manually inferred queue counts cannot grant or imply the mark.

The committed mirror is byte-for-byte identical to the latest ops blob
available in this environment: ops commit
`187f8e72b0ada7ada8db7237181468543dead5f0`, file blob
`7db0b9e9b85382eae30cbb7c3bdc1128d312a29d`, with `nodes: []`. Local ops
`origin/main` is stale and does not contain the file, while both shell and
connector reads of a newer main were unavailable. This provenance limitation
is recorded rather than presenting the local copy as independently refreshed.

## What was built

- Added `src/data/certified-nodes.yaml` as the app-local ops mirror.
- Added a strict typed reader that accepts only the exact generated schema,
  requires every one of the five criteria to hold with evidence, rejects
  duplicate IDs and unexpected keys, and fails closed on missing, malformed, or
  unexpected input.
- Kept operational failure distinct from a valid empty ledger: failures render
  a visible alert and “Certification not confirmed”; they never masquerade as
  an intentional zero-node state or assert that a node is absent.
- Replaced `/api/axiom/certified`’s runtime passthrough with the local snapshot.
  A valid snapshot returns `200` with a short cache; an unavailable mirror
  returns `503` with `no-store`.
- Added a second strict validator in the graph client so transport, JSON, HTTP,
  and schema failures remain fail-closed in the browser.
- Added exact-ID certification status to Library rule cards and graph-node
  inspectors. A node absent from the file can never render the mark.
- Preserved and rendered RuleSpec `module.deferred_outputs`, including each
  declared output and published reason, as “Encoded, incomplete by
  declaration.”
- Added explicit status for cards that lack the exact RuleSpec legal ID needed
  for a lookup instead of silently omitting certification.
- Added a deliberate zero-certification state to the encoded index and empty
  program graph: “No encoding has met the bar yet,” the automatic-only rule,
  and the complete five-part bar.
- Removed runtime-derived certificate/status fields, certified counts, the
  invented “nodes await the certification sweep” count, and runtime-ledger
  provenance copy from the graph status surface.
- Did not modify `/verify`.

## Validation

- Final focused suite: **9 files, 76 tests passed**.
- Required cases pass: malformed YAML fails closed; a listed node renders the
  mark; an absent node never renders it; the deliberate empty-state copy
  renders.
- Production webpack build passed compilation, TypeScript, generation of all
  54 static pages, optimization, and trace collection.
- The `/api/axiom/certified` production function trace explicitly includes
  `src/data/certified-nodes.yaml`.
- Direct SSR/API smoke confirmed the intentional empty-state copy, five-part
  bar, zero marks, a ready `nodes: []` response, and correct absent-node status.
- `git diff --check` passed. No new hardcoded color was introduced.

The plain `bun run build` path was attempted. Its first run exposed the nested
worktree’s missing local dependency install; after an offline frozen install,
Turbopack stalled during compilation in this sandbox, including with external
Google-font requests replaced by a local fixture. The equivalent Next
production build completed successfully with `--webpack` and the same local
font fixture. Browser screenshot smoke was also host-blocked (`listen EPERM`
and Chrome exit 134), so the fallback used direct SSR, API, RSC, and trace
inspection.

## Schema feedback

The passing-only shape makes the mark pleasantly unambiguous, but makes the
non-certified UI necessarily coarse:

- There are no uncertified candidate rows, failed criteria, or structured
  “missing” reasons. For most nodes, the only file-derived statement is “not
  present in the generated ledger.”
- There is no published validation frontier, so the app cannot honestly show
  “Validated, not certified” for a current node even though the component
  supports that state when a frontier is supplied.
- There are no pending rows, so no current row can honestly be labeled pending.
- Completeness and fidelity are not structured as named rollups in the file;
  the schema exposes five atomic criteria only.
- Deferred-output reasons live in RuleSpec modules, not the certification file.
  The Library can show those source declarations, but a merged section has to
  aggregate them and cannot get per-module provenance from the ledger.

A candidate/status collection with an exact node ID, published frontier,
missing criteria, pending state, and source-module linkage would let the UI say
what each encoding is missing without inference. Until then, the implemented
copy explicitly explains the limitation rather than guessing.

## Publication handoff

Publication was attempted but unavailable:

- `git push -u origin app/node-certification-status` failed because the shell
  could not resolve `github.com`.
- The connected GitHub write was cancelled before creating a blob, branch, or
  PR. No remote branch or draft PR was created.
- The required `vercel ls 2>&1 | head -5` check could start the CLI but could
  not retrieve project/deployment status in the restricted network. No deploy
  was initiated.

From a network-enabled session:

1. Push `app/node-certification-status`.
2. Open a draft PR to `master`, suggested title:
   `Add generated node certification status`.
3. Run `vercel ls 2>&1 | head -5` and confirm the preview status succeeds.
