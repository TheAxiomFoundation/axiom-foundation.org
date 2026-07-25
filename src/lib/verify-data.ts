/**
 * Data behind /verify.
 *
 * Every row here must be checkable by someone who does not work here. If a
 * claim has no `check`, it does not belong on this page — move it to /stack or
 * cut it. If a check is known to fail today, it goes in `openIssues` with the
 * error text, not into a softer adjective in the table above.
 *
 * Source of truth for the tier definitions: launch/Launch-Scope.md.
 */

export type Tier = "verified" | "preview" | "demo" | "blocked";

export const tierLabel: Record<Tier, string> = {
  verified: "Verified",
  preview: "Developer preview",
  demo: "Demo",
  blocked: "Not yet executable",
};

export const tierNote: Record<Tier, string> = {
  verified:
    "You can check it without us. Download, recompute the hash, verify the attestation, run it.",
  preview:
    "Live and usable today. Interfaces and limits may change; there is no service commitment yet.",
  demo: "Shows what the layer enables. Bounded, and the bounds are named.",
  blocked:
    "Written, published, and currently failing. The error and the fix are below.",
};

export interface Surface {
  id: string;
  name: string;
  tier: Tier;
  claim: string;
  check: string;
  expect: string;
  limit: string;
}

export const surfaces: Surface[] = [
  {
    id: "engine",
    name: "Rules engine v0.1.0",
    tier: "verified",
    claim:
      "The binary you download is the one our release workflow built, from the commit it says.",
    check:
      "gh attestation verify axiom-rules-engine-aarch64-apple-darwin.tar.xz \\\n  --repo TheAxiomFoundation/axiom-rules-engine",
    expect:
      "SLSA provenance resolving to release.yml@refs/tags/v0.1.0, build sha d59969b5. Four platform targets, each with a published sha256.",
    limit:
      "Version 0.1.0 predates the current artifact format — see open issues.",
  },
  {
    id: "artifacts",
    name: "Program artifacts",
    tier: "verified",
    claim:
      "Each published program is content-addressed, and the manifest declares the hash before you download it.",
    check:
      "shasum -a 256 us-co-snap.compiled.json\n# compare against manifest.json → programs[].artifact_sha256",
    // Program-artifacts releases roll several times a day, so this points at
    // the manifest rather than freezing a tag that goes stale by tomorrow.
    expect:
      "The two hashes match. Each program in the manifest carries its spec path, spec hash, artifact hash, and declared outputs — 33 programs in the 2026-07-25 release.",
    limit:
      "Hash and attestation prove origin, not correctness. Correctness is the oracle row.",
  },
  {
    id: "corpus",
    name: "Corpus and RuleSpec encodings",
    tier: "verified",
    claim:
      "Every encoded value cites the provision it came from, and releases are pinned and publicly mirrored.",
    check:
      "Fetch any release from the public mirror and recompute its canonical sha256.",
    expect: "Recomputed hash matches the published manifest.",
    limit:
      "Coverage is per-program and partial. The programs list is the coverage claim; there is no blanket one.",
  },
  {
    id: "oracles",
    name: "Validation against independent calculators",
    tier: "verified",
    claim:
      "Where a policy is covered, every disagreement with the reference calculator is accounted for — reconciled arithmetically, or traced to a bug in the other engine and filed there.",
    check:
      "git clone https://github.com/TheAxiomFoundation/axiom-oracles\ncat conformance/scoreboard.json\nuv run scripts/apply_dispositions.py --check",
    expect:
      "The scoreboard's own predicate: covered == in_scope, unexplained == 0, Axiom-attributed == 0. The dispositions check recomputes every classification's arithmetic from the committed evidence.",
    limit:
      "Coverage, not accuracy, is the live limit — 34 of 127 in-scope US policies have a comparison suite. And agreement only shows two implementations agree; where both misread a provision the same way, it shows nothing.",
  },
  {
    id: "api",
    name: "Hosted API",
    tier: "preview",
    claim:
      "Mint a trial key with no signup and run a determination in one request.",
    check:
      "curl -s -X POST https://api.axiom.org/v1/keys/trial \\\n  -H 'content-type: application/json' -d '{\"label\":\"first key\"}'",
    expect: "A key, an expiry, and a compute-unit quota. Only its hash is stored.",
    limit:
      "No service commitment. Rate and spend caps are enforced and will return 429 before they return a wrong answer.",
  },
  {
    id: "mcp",
    name: "MCP server",
    tier: "preview",
    claim: "Agent clients get search, read, and execute over the same rules.",
    check: "npx -y @axiom-foundation/mcp",
    expect: "Initializes over stdio and lists its tools.",
    limit: "Same preview terms as the API.",
  },
  {
    id: "playground",
    name: "Playground",
    tier: "demo",
    claim:
      "Compiler and evaluator run as WebAssembly in the page. Your inputs do not leave the tab.",
    check: "Open the network panel and run a determination.",
    expect: "No network requests after the engine loads.",
    limit:
      "Runs a small loaded program, not the full published artifact. What is loaded is named on the page.",
  },
];

/**
 * Conformance is a predicate, not a match rate:
 *
 *   conformant = covered == in_scope
 *             && unexplained_total == 0
 *             && axiom_attributed_open == 0
 *
 * Source: axiom-oracles `scripts/conformance_scoreboard.py`, values read from
 * the committed `conformance/scoreboard.json` on main (2026-07-25).
 *
 * A raw match rate is the wrong number to publish, because it counts a residual
 * we have chased to a documented bug in the other engine the same as one we
 * cannot account for. Every mismatch is classified, with evidence, into one of
 * five kinds — and `axiom_encoding_gap` and `unexplained` never count as
 * explained. So the number that matters is how many mismatches remain
 * unaccounted for, and it is zero.
 */
export interface ConformanceRow {
  jurisdiction: string;
  oracle: string;
  inScope: number;
  covered: number;
  unexplained: number;
  axiomOpen: number;
  conformant: boolean;
  note: string;
}

export const conformanceRows: ConformanceRow[] = [
  {
    jurisdiction: "Belgium",
    oracle: "EUROMOD J2.0 / BE_2025",
    inScope: 23,
    covered: 23,
    unexplained: 0,
    axiomOpen: 0,
    conformant: true,
    note: "28 residuals attributed to the oracle, each with evidence.",
  },
  {
    jurisdiction: "United Kingdom",
    oracle: "UKMOD_PUBLIC B2026.03 / UK_2026",
    inScope: 21,
    covered: 21,
    unexplained: 0,
    axiomOpen: 0,
    conformant: true,
    note: "16 residuals attributed to the oracle.",
  },
  {
    jurisdiction: "United Kingdom",
    oracle: "policyengine-uk 2.89.2",
    inScope: 23,
    covered: 23,
    unexplained: 0,
    axiomOpen: 0,
    conformant: true,
    note: "238 residuals attributed to the oracle.",
  },
  {
    jurisdiction: "United States",
    oracle: "policyengine-us 1.767.3",
    inScope: 127,
    covered: 34,
    unexplained: 0,
    axiomOpen: 0,
    conformant: false,
    note: "Not conformant, and the reason is coverage rather than disagreement: 93 in-scope policies have no live comparison suite yet. Across the 34 that do, 46.7M comparisons and nothing unexplained.",
  },
];

/**
 * One suite, fully decomposed. This is the page's load-bearing example: it is
 * the difference between "we agree 99.5% of the time" and "we can tell you what
 * every one of the 18,791 disagreements is."
 */
export const workedExample = {
  suite: "Federal income tax vs PolicyEngine",
  basis:
    "Every tax unit in the pinned Populace artifact populace-us-2024-f0af251. The oracle is pinned to policyengine-us 1.729.0 to match that build.",
  comparisons: "3,881,635",
  matches: "3,862,844",
  mismatches: "18,791",
  rawRate: "99.52%",
  rows: [
    {
      concept: "eitc",
      count: "16,660",
      kind: "Filed upstream",
      detail:
        "Earned-income input composition. PolicyEngine 1.729.0 predates PE-US #8614, which split partnership and S-corp income inputs. Axiom follows 26 USC 32(c)(2)(A) and 1402(a). Diverges in both directions — 10,008 rows Axiom-high, 6,652 Axiom-low, the two halves of that split.",
    },
    {
      concept: "tax_before_credits",
      count: "2,118",
      kind: "Reconciled",
      detail: "Bracket-boundary rounding. Every row within $5.83, on values up to $2.79M.",
    },
    {
      concept: "capital_gain",
      count: "8",
      kind: "Reconciled",
      detail: "Floating-point noise. Every row within $3.25.",
    },
    {
      concept: "ctc",
      count: "5",
      kind: "Reconciled",
      detail: "Excess-AGI phaseout rounding. Every row exactly $50.",
    },
  ],
  closes:
    "16,660 + 2,118 + 8 + 5 = 18,791 — every mismatch in the report, not a sample. Unexplained: 0.",
};

/** What stops a classification from being an excuse. */
export const enforcement = [
  "Evidence is mandatory. A disposition needs a stated mechanism plus arithmetic that reconciles or an upstream citation. Classifications must reconcile numerically, not assert.",
  "The arithmetic is checked. Expressions are evaluated in CI and must equal the claimed value within tolerance.",
  "Citations cannot dangle. Non-URL sources are repo paths and must exist.",
  "Dispositions expire with their sources. When a mismatch moves or disappears, its disposition stops applying rather than silently relabelling a new residual.",
  "The ratchet only turns one way. Covered may rise; unexplained and Axiom-attributed may only fall. CI refuses regressions.",
  "Coverage is gated separately: every executable output must be mapped to an oracle concept and covered by companion tests, or the build fails.",
];

export interface OpenIssue {
  id: string;
  title: string;
  status: string;
  detail: string;
  evidence?: string;
  fix: string;
}

/**
 * This section is the point of the page. A claim we cannot currently back is
 * more useful to a reader than one we can — it tells them what our labels are
 * worth. Entries leave only when the check passes, not when the copy improves.
 */
export const openIssues: OpenIssue[] = [
  {
    id: "rung3",
    title: "The released engine cannot execute the published artifacts",
    status: "Open — checked 2026-07-25",
    detail:
      "The engine moved to artifact format 2 after v0.1.0 was tagged, and no release has been cut since. Every current program-artifacts release is format 2; the only released binary requires format 1. So the local-execution path does not run for anyone today, including us.",
    evidence:
      "compiled artefact `us-co-snap.compiled.json` has artifact_format_version 2,\nbut this engine requires exact version 1; recompile the program with this engine",
    fix: "Cut an engine release from a format-2 commit. The release machinery itself is verified working — checksums, attestations, and provenance all check out on the current release.",
  },
  {
    id: "compat",
    title: "The compatibility contract reports a match that does not hold",
    status: "Open — checked 2026-07-25",
    detail:
      "Each program in the manifest declares requires_engine.min_version: \"0.1.0\". The released engine reports version 0.1.0. A reader comparing those two concludes the pair is compatible, and the engine then rejects the artifact on a format field the version floor does not express.",
    evidence:
      '"compat": {\n  "artifact_schema": 2,\n  "built_by_engine": {"version": "0.1.0", "git_sha": "ffd8213…"},\n  "requires_engine": {"min_version": "0.1.0", "capabilities": []}\n}',
    fix: "requires_engine must carry the artifact-schema floor, and the release gate must assert execution rather than agreement between stamps.",
  },
  {
    id: "fixture",
    title: "The published artifacts use different input names than our own test fixture",
    status: "Open — checked 2026-07-25",
    detail:
      "Our golden-household fixture addresses inputs in a composed-program namespace; the published per-program artifact exposes durable legal ids. None of the fixture's 353 input names resolve against the published artifact, and no composed artifact ships in the release.",
    fix: "Publish the composed artifact, or restate the documented request in legal-id form — then run it end to end and publish the result.",
  },
];

/** Depth ladder — stated so a reader can choose how far to go. */
export const ladder = [
  {
    depth: "Five minutes",
    what: "How the system is put together, layer by layer.",
    href: "/stack",
    label: "The stack",
  },
  {
    depth: "Thirty minutes and a terminal",
    what: "Run the checks on this page yourself.",
    href: "#check",
    label: "Check it yourself",
  },
  {
    depth: "Everything",
    what: "The code, the encodings, the release history, the open issues.",
    href: "https://github.com/TheAxiomFoundation",
    label: "GitHub",
  },
];
