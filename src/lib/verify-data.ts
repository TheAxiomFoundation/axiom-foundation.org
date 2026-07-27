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
    name: "Rules engine v0.1.1",
    tier: "verified",
    claim:
      "The binary you download is the one our release workflow built, from the commit it says — and it executes the published program artifacts.",
    check:
      "gh attestation verify axiom-rules-engine-aarch64-apple-darwin.tar.xz \\\n  --repo TheAxiomFoundation/axiom-rules-engine\n./axiom-rules-engine run-compiled --artifact us-co-snap.compiled.json < request.json",
    expect:
      "Checksum and SLSA provenance verify on anonymous download; the engine loads the current artifact release and returns a determination with its citation trace.",
    limit:
      "v0.1.1 restores execution after v0.1.0 could not load any published artifact. Capability introspection (a capabilities subcommand and check-artifact) is merged but not yet in a release, so contract-vs-binary checks still need a run attempt.",
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
      "Where a policy is covered, every disagreement with the reference calculator is classified with evidence: reconciled arithmetically, traced to a bug in the other engine, or attributed to the comparison harness itself (bridge artifacts) — a bounded class we disclose rather than blend in.",
    check:
      "git clone https://github.com/TheAxiomFoundation/axiom-oracles\ncat conformance/scoreboard.json\nuv run scripts/apply_dispositions.py --check",
    expect:
      "The scoreboard's own predicate: covered == in_scope, unexplained == 0, Axiom-attributed == 0. The dispositions check recomputes every classification's arithmetic from the committed evidence.",
    limit:
      "Coverage is the live limit — 33 of 127 in-scope US policies have a comparison suite, and the covered set carries 441 unexplained residuals under active classification. Agreement only shows two implementations agree; where both misread a provision the same way, it shows nothing.",
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
 * the committed `conformance/scoreboard.json` at commit 27968c8 (2026-07-26).
 * The scoreboard regenerates with every report refresh — update the pin when
 * refreshing these rows; never let them float.
 *
 * A raw match rate is the wrong number to publish, because it counts a residual
 * we have chased to a documented bug in the other engine the same as one we
 * cannot account for. Every mismatch is classified, with evidence, into one of
 * five kinds — and `axiom_encoding_gap` and `unexplained` never count as
 * explained. So the number that matters is how many mismatches remain
 * unaccounted for — currently zero for Belgium and both UK oracles, and 441
 * (243 ours) for the US, carried openly below.
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
    // Each suite pins the PolicyEngine release its population was built
    // against, so the aggregate oracle is not one version; the universe is
    // enumerated at 1.767.3.
    oracle: "PolicyEngine-US (mixed suite-pinned versions)",
    inScope: 127,
    covered: 33,
    unexplained: 441,
    axiomOpen: 243,
    conformant: false,
    // Not the sum of per-policy comparison counts: federal policies scored
    // from the one fiit run would count that suite twelve times. This is the
    // distinct-suite total, recomputed from conformance/detail at the pinned
    // snapshot.
    note: "Not conformant twice over: 94 in-scope policies have no live suite, and the covered 33 (22 suites, 3,997,401 comparisons) carry 441 unexplained residuals under classification, 243 attributed to our own encoding and open. This row got worse the day before launch — an Alabama pilot suite was retired for promoting a narrow schedule comparison as final-liability coverage — and that is the predicate working, not failing.",
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
      detail: "Bracket-boundary rounding. Maximum difference $5.83, at a $2.79M value; mismatch-row values extend to $13.11M.",
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
    id: "api-rounding",
    title:
      "The hosted API returns un-rounded net income; the published artifact applies the statutory whole-dollar election",
    status: "Open — found 2026-07-27",
    detail:
      "The local-execution story is now fully green: the certified household reproduces snap_eligible = holds, the gated $478, and net income $226 on the released engine and pinned artifact, exactly as a stranger would run it. Getting there corrected the benchmark itself — the previously certified $226.50 was the un-rounded figure, and 7 CFR 273.10(e)(1)(ii)(A)'s nearest-dollar election on the excess-shelter deduction makes $226 the statutory value; the engine had been right since v0.1.1. The same run then surfaced the next divergence: the hosted API still computes the un-rounded $226.50, so the cross-surface parity leg fails until the API applies the same election. The benefit is $478 on either reading.",
    evidence:
      "[PASS   ] local  outputs={'snap_benefit_amount': '478', 'snap_net_income': '226', 'snap_eligible': 'holds'}\n[FAIL   ] cross-surface: api.snap_net_income=226.5 != local.snap_net_income=226",
    fix: "The API's serving path applies the same whole-dollar elections the artifact does (axiom-api#115); the parity gate's cross-surface leg is the acceptance test.",
  },
  {
    id: "compat",
    title: "The published compatibility contract still lacks its gating dimension",
    status: "Narrowed — checked 2026-07-26",
    detail:
      "requires_engine.min_version says \"0.1.0\", which cannot express the artifact-format boundary that actually decides loadability — a reader comparing version strings reaches the wrong verdict. An artifact_format_version floor exists as a prototyped, unmerged change to the build tool, and the release gate computes the third-party verdict from the published contract and fails when it disagrees with reality. Every manifest a stranger downloads today still carries the misleading floor; this entry closes when the emission merges, ships in a release, and the gate goes green on it.",
    evidence:
      '"requires_engine": {"min_version": "0.1.0", "capabilities": []}\n// loadability is decided by artifact_format_version, absent above',
    fix: "Merge the floor emission, republish artifacts with it, and keep the contract-versus-reality gate so the two can never diverge silently again.",
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
