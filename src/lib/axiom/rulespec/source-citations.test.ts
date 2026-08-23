import { describe, expect, it } from "vitest";
import { parseRuleSpec } from "./doc";
import {
  VALUE_ATOM_KINDS,
  extractCitationPathSets,
  moduleSourcePaths,
  ruleEncodesProvision,
  ruleValueCitationPaths,
} from "./source-citations";

const BEER = "us/statute/hts/2203.00.00";

function atom(kind: string, path: string): string[] {
  return [
    "          - path: versions[0].values",
    `            kind: ${kind}`,
    "            source:",
    `              corpus_citation_path: ${path}`,
    "              excerpt: text",
  ];
}

function moduleYaml(
  header: string[],
  rules: Array<{ name: string; atoms: string[][] }>,
): string {
  return [
    "format: rulespec/v1",
    ...header,
    "rules:",
    ...rules.flatMap((rule) => [
      `  - name: ${rule.name}`,
      "    kind: parameter",
      "    metadata:",
      "      proof:",
      "        atoms:",
      ...rule.atoms.flat(),
      "    versions:",
      "      - effective_from: '2026-01-01'",
      "        values: {1: 0}",
    ]),
  ].join("\n");
}

describe("moduleSourcePaths", () => {
  it("reads the singular source and the legacy plural list", () => {
    const doc = parseRuleSpec(
      moduleYaml(
        [
          "module:",
          "  source_verification:",
          "    corpus_citation_path: /us/statute/26/1/h",
          "    corpus_citation_paths:",
          "      - us/statute/hts/2201.10.00.00",
          "      - us/statute/hts/2201.10.00.00",
          "      - ''",
        ],
        [],
      ),
    );
    expect(moduleSourcePaths(doc)).toEqual({
      singular: "us/statute/26/1/h",
      plural: ["us/statute/hts/2201.10.00.00"],
    });
  });

  it("returns nothing for a module without declarations", () => {
    expect(moduleSourcePaths(parseRuleSpec("rules: []"))).toEqual({
      singular: null,
      plural: [],
    });
  });
});

describe("extractCitationPathSets", () => {
  it("counts the singular module source as a value citation even without atoms", () => {
    // 135 rulespec-us modules carry a singular source and no proof
    // atoms at all (direct IRS parameter modules among them).
    const doc = parseRuleSpec(
      moduleYaml(
        [
          "module:",
          "  source_verification:",
          "    corpus_citation_path: us/statute/26/1/h/1",
        ],
        [],
      ),
    );
    expect(extractCitationPathSets(doc)).toEqual({
      all: ["us/statute/26/1/h/1"],
      values: ["us/statute/26/1/h/1"],
    });
  });

  it("keeps the plural module list out of the value set", () => {
    const doc = parseRuleSpec(
      moduleYaml(
        [
          "module:",
          "  source_verification:",
          "    corpus_citation_paths:",
          `      - ${BEER}`,
          "      - us/statute/hts/general-note-3/page-1",
        ],
        [{ name: "ch22_general_rate", atoms: [atom("parameter", BEER)] }],
      ),
    );
    expect(extractCitationPathSets(doc)).toEqual({
      all: [BEER, "us/statute/hts/general-note-3/page-1"],
      values: [BEER],
    });
  });

  it("treats every value-bearing atom kind as encoding, and condition-family kinds as reference", () => {
    const doc = parseRuleSpec(
      moduleYaml(
        [],
        [
          {
            name: "de_minimis_threshold",
            atoms: [atom("amount", "us/statute/19/1321/a/2/C")],
          },
          {
            name: "regime_guard",
            atoms: [
              atom("condition", BEER),
              atom("exception", "us/statute/hts/7202"),
              atom("import", "us/statute/hts/general-note-3/page-4"),
              atom("definition", "us/statute/hts/chapter-99/page-1"),
              atom("predicate", "us/statute/hts/chapter-99/page-2"),
            ],
          },
          {
            name: "dated_rate",
            atoms: [
              atom(
                "effective_period",
                "us/rulemaking/fr/2026-02-25/2026-03824",
              ),
              atom("parameter_table", "us/statute/hts/chapter-99/page-330"),
            ],
          },
        ],
      ),
    );
    const sets = extractCitationPathSets(doc);
    expect(sets.values).toEqual([
      "us/statute/19/1321/a/2/C",
      "us/rulemaking/fr/2026-02-25/2026-03824",
      "us/statute/hts/chapter-99/page-330",
    ]);
    expect(sets.all).toHaveLength(8);
    for (const kind of [
      "condition",
      "exception",
      "import",
      "definition",
      "predicate",
    ]) {
      expect(VALUE_ATOM_KINDS.has(kind)).toBe(false);
    }
  });

  it("ignores atoms without a usable path or kind", () => {
    const doc = parseRuleSpec(
      [
        "format: rulespec/v1",
        "rules:",
        "  - name: odd",
        "    kind: parameter",
        "    metadata:",
        "      proof:",
        "        atoms:",
        "          - path: versions[0].values",
        "            source: {corpus_citation_path: '   '}",
        "          - path: versions[0].values",
        "            kind: parameter",
        "          - not-a-record",
        "    versions:",
        "      - effective_from: '2026-01-01'",
        "        values: {1: 0}",
      ].join("\n"),
    );
    expect(extractCitationPathSets(doc)).toEqual({ all: [], values: [] });
    expect(ruleValueCitationPaths(doc.rules[0])).toEqual(new Set());
  });
});

describe("ruleEncodesProvision", () => {
  it("is true for every rule of a module whose singular source is the provision", () => {
    const doc = parseRuleSpec(
      moduleYaml(
        [
          "module:",
          "  source_verification:",
          `    corpus_citation_path: ${BEER}`,
        ],
        [{ name: "no_atoms", atoms: [] }],
      ),
    );
    expect(ruleEncodesProvision(doc, doc.rules[0], BEER)).toBe(true);
    expect(ruleEncodesProvision(doc, doc.rules[0], "us/statute/hts/7202")).toBe(
      false,
    );
  });

  it("is true only for rules whose value atoms cite the provision otherwise", () => {
    const doc = parseRuleSpec(
      moduleYaml(
        [
          "module:",
          "  source_verification:",
          "    corpus_citation_paths:",
          `      - ${BEER}`,
        ],
        [
          { name: "rate", atoms: [atom("parameter", BEER)] },
          { name: "guard", atoms: [atom("condition", BEER)] },
        ],
      ),
    );
    expect(ruleEncodesProvision(doc, doc.rules[0], BEER)).toBe(true);
    expect(ruleEncodesProvision(doc, doc.rules[1], BEER)).toBe(false);
  });
});
