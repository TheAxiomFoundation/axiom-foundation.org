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
      "Encodings are checked against calculators we did not write, and the disagreements are published as counts, not rates.",
    check: "Per-program oracle results, with denominators, in the table below.",
    expect: "Counts that match what we publish.",
    limit:
      "Oracle agreement shows two implementations agree. Where both read the statute the same wrong way, it shows nothing.",
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

export interface OracleRow {
  program: string;
  oracle: string;
  agree: string;
  note: string;
}

/**
 * Counts, not percentages, wherever a denominator exists — a rate hides how
 * many cases were tried. Rows where we disagree stay in.
 */
export const oracleRows: OracleRow[] = [
  {
    program: "Colorado SNAP",
    oracle: "PolicyEngine",
    agree: "2,144 / 2,144",
    note: "Benefit calculation. 51 modules, 51 / 51 module tests.",
  },
  {
    program: "Colorado SNAP",
    oracle: "SNAP Quality Control administrative sample",
    agree: "816 / 856",
    note: "40 cases disagree. Administrative data, not a reference implementation — a disagreement is a lead, not automatically our bug.",
  },
  {
    program: "Federal individual income tax",
    oracle: "PolicyEngine",
    agree: "99.6%",
    note: "Reported as a rate in our own materials; the denominator belongs here and is being added.",
  },
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
