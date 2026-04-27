"use client";

import { useState } from "react";
import CodeBlock from "@/components/code-block";
import {
  FileIcon,
  CheckIcon,
  XIcon,
  CitationIcon,
  ParameterIcon,
  FormulaIcon,
  ImportIcon,
  TestIcon,
  VersionIcon,
} from "@/components/icons";
import { type ExampleType, rulespecExamples } from "@/lib/rulespec-examples";

type FormatTab = "rulespec" | "dmn" | "openfisca" | "catala";

const examples: Record<ExampleType, { label: string }> = {
  niit: { label: "NIIT" },
  "aca-ptc": { label: "ACA Premium Tax Credit" },
  "std-ded": { label: "Standard Deduction" },
  "ny-eitc": { label: "NY EITC" },
};

const formatLabels: Record<FormatTab, string> = {
  rulespec: "RuleSpec",
  dmn: "DMN",
  openfisca: "OpenFisca/PE",
  catala: "Catala",
};

const getFilename = (example: ExampleType, format: FormatTab): string => {
  const filenames: Record<ExampleType, Record<FormatTab, string>> = {
    niit: {
      rulespec: "statute/26/1411/a.yaml",
      dmn: "niit.dmn",
      openfisca:
        "variables/gov/irs/tax/federal_income/net_investment_income_tax.py",
      catala: "niit.catala_en",
    },
    "aca-ptc": {
      rulespec: "statute/26/36B/b/3/A.yaml",
      dmn: "aca_ptc.dmn",
      openfisca:
        "variables/gov/aca/ptc/aca_required_contribution_percentage.py",
      catala: "aca_ptc.catala_en",
    },
    "std-ded": {
      rulespec: "statute/26/63/c/2/A.yaml",
      dmn: "standard_deduction.dmn",
      openfisca:
        "variables/gov/irs/income/taxable_income/deductions/standard_deduction/basic_standard_deduction.py",
      catala: "standard_deduction.catala_en",
    },
    "ny-eitc": {
      rulespec: "statute/ny/tax/606/d.yaml",
      dmn: "ny_eitc.dmn",
      openfisca: "variables/gov/states/ny/tax/income/credits/ny_eitc.py",
      catala: "ny_eitc.catala_en",
    },
  };
  return filenames[example][format];
};

const getNote = (format: FormatTab): string => {
  const notes: Record<FormatTab, string> = {
    rulespec: "Single self-contained file",
    dmn: "XML + FEEL expression language",
    openfisca: "Python + YAML (3 files)",
    catala: "Literate programming",
  };
  return notes[format];
};

const dmnExamples: Record<ExampleType, string> = {
  niit: `<?xml version="1.0" encoding="UTF-8"?>
<definitions name="NIIT">
  <inputData id="modified_agi"/>
  <inputData id="net_investment_income"/>
  <inputData id="threshold_amount"/>

  <decision id="niit" name="Net Investment Income Tax">
    <literalExpression>
      <text>
        0.038 * min(net_investment_income,
                    max(0, modified_agi - threshold_amount))
      </text>
    </literalExpression>
  </decision>

  <!-- Where does 0.038 come from? When did it take effect?
       What's the legal citation? DMN doesn't say. -->
</definitions>`,
  "aca-ptc": `<?xml version="1.0" encoding="UTF-8"?>
<definitions name="ACA_PTC">
  <inputData id="fpl"/>

  <decision id="applicable_pct">
    <literalExpression>
      <text>
        if fpl <= 150 then 0
        else if fpl <= 200 then
          (0.02 - 0) * (fpl - 150) / 50
        else if fpl <= 250 then
          0.02 + (0.04 - 0.02) * (fpl - 200) / 50
        else if fpl <= 300 then
          0.04 + (0.06 - 0.04) * (fpl - 250) / 50
        else 0.085
      </text>
    </literalExpression>
  </decision>

  <!-- Where do 150, 200, 250, 300, 0.02, 0.04, 0.06, 0.085 come from?
       DMN has no temporal versioning or legal citations. -->
</definitions>`,
  "std-ded": `<?xml version="1.0" encoding="UTF-8"?>
<definitions name="StandardDeduction">
  <inputData id="basic_std_ded_other"/>

  <decision id="joint_deduction">
    <literalExpression>
      <text>basic_std_ded_other * 2</text>
    </literalExpression>
  </decision>

  <!-- Where does 2 come from? "200 percent" from statute.
       DMN has no way to cite the source. -->
</definitions>`,
  "ny-eitc": `<?xml version="1.0" encoding="UTF-8"?>
<definitions name="NY_EITC">
  <inputData id="federal_eitc"/>

  <decision id="ny_eitc">
    <literalExpression>
      <text>federal_eitc * 0.30</text>
    </literalExpression>
  </decision>

  <!-- Magic number 0.30 with no citation.
       What if NY changes their rate? No history. -->
</definitions>`,
};

const openfiscaExamples: Record<ExampleType, string> = {
  niit: `# File 1: variables/gov/irs/.../net_investment_income_tax.py
class net_investment_income_tax(Variable):
    value_type = float
    entity = TaxUnit
    definition_period = YEAR
    reference = "https://www.law.cornell.edu/uscode/text/26/1411"
    unit = USD

    def formula(tax_unit, period, parameters):
        p = parameters(period).gov.irs.investment.net_investment_income_tax
        threshold = p.threshold[tax_unit("filing_status", period)]
        excess_agi = max_(0, tax_unit("adjusted_gross_income", period) - threshold)
        base = min_(max_(0, tax_unit("net_investment_income", period)), excess_agi)
        return p.rate * base

# File 2: parameters/.../net_investment_income_tax/rate.yaml
description: "Net Investment Income Tax rate"
metadata:
  unit: "currency-USD"
values:
  2013-01-01: 0.038

# File 3: tests/.../net_investment_income_tax.yaml
- name: "Rental income just above threshold"
  period: 2019
  input:
    adjusted_gross_income: 205_000
    rental_income: 205_000
    filing_status: "SINGLE"
  output:
    net_investment_income_tax: 190`,
  "aca-ptc": `# File 1: variables/gov/aca/.../aca_required_contribution_percentage.py
class aca_required_contribution_percentage(Variable):
    value_type = float
    entity = TaxUnit
    definition_period = YEAR
    reference = "https://law.cornell.edu/uscode/text/26/36B#b_3_A"

    def formula(tax_unit, period, parameters):
        magi_frac = tax_unit("aca_magi_fraction", period)
        p = parameters(period).gov.aca.required_contribution_percentage
        return np.interp(magi_frac, p.thresholds, p.amounts)

# File 2: parameters/gov/aca/required_contribution_percentage.yaml
description: "ACA PTC phase out rate by MAGI % FPL"
brackets:
  - threshold:
      2021-01-01: 0
    amount:
      2021-01-01: 0       # ARPA: 0% at 0
      2026-01-01: 0.021   # Revert
  - threshold:
      2021-01-01: 1.50
    amount:
      2021-01-01: 0.0     # ARPA: 0% at 150%
      2026-01-01: 0.0419  # Revert`,
  "std-ded": `# File 1: variables/.../basic_standard_deduction.py
class basic_standard_deduction(Variable):
    value_type = float
    entity = TaxUnit
    definition_period = YEAR
    unit = USD
    reference = "https://www.law.cornell.edu/uscode/text/26/63#c_2"

    def formula(tax_unit, period, parameters):
        p = parameters(period).gov.irs.deductions.standard
        filing_status = tax_unit("filing_status", period)
        return p.amount[filing_status]

# File 2: parameters/gov/irs/deductions/standard/amount.yaml
description: "Federal deduction from AGI if not itemizing"
SINGLE:
  2024-01-01: 14_600
  2025-01-01: 15_750
JOINT:
  2024-01-01: 29_200
  2025-01-01: 31_500
metadata:
  unit: "currency-USD"`,
  "ny-eitc": `# File 1: variables/gov/states/ny/.../ny_eitc.py
class ny_eitc(Variable):
    value_type = float
    entity = TaxUnit
    unit = USD
    definition_period = YEAR
    reference = "https://www.nysenate.gov/legislation/laws/TAX/606"
    defined_for = StateCode.NY

    def formula(tax_unit, period, parameters):
        federal_eitc = tax_unit("eitc", period)
        p = parameters(period).gov.states.ny.tax.income.credits
        return federal_eitc * p.eitc.match

# File 2: parameters/gov/states/ny/.../match.yaml
description: "NY matches this fraction of federal EITC"
values:
  1994-01-01: 0.075
  1995-01-01: 0.1
  1996-01-01: 0.2
  2000-01-01: 0.225
  2003-01-01: 0.3`,
};

const catalaExamples: Record<ExampleType, string> = {
  niit: `@@26 USC \u00A7 1411(a) - Net Investment Income Tax@@

/*
(a) In general.\u2014 There is hereby imposed a tax equal to
3.8 percent of the lesser of net investment income or
modified AGI in excess of the threshold amount.
*/

declaration scope NIIT:
  input modified_agi content money
  input net_investment_income content money
  input threshold_amount content money
  internal niit_rate content decimal
  output tax content money

scope NIIT:
  definition niit_rate equals 3.8%
  definition tax equals
    let excess = max($0, modified_agi - threshold_amount)
    in niit_rate * min(net_investment_income, excess)

# Literate style, but no temporal versioning:
# When did 3.8% take effect? What's the legal history?`,
  "aca-ptc": `@@26 USC \u00A7 36B(b)(3)(A) - ACA Premium Tax Credit@@

/*
The applicable percentage... shall increase on a
sliding scale from the initial to final percentage.
*/

declaration scope PremiumTaxCredit:
  input fpl content decimal
  output applicable_pct content decimal

scope PremiumTaxCredit:
  definition applicable_pct equals
    if fpl <= 150 then 0.00
    else if fpl <= 200 then
      (0.02 - 0.00) * (fpl - 150) / 50
    else if fpl <= 250 then
      0.02 + (0.04 - 0.02) * (fpl - 200) / 50
    else if fpl <= 300 then
      0.04 + (0.06 - 0.04) * (fpl - 250) / 50
    else 0.085

# Values hardcoded - no temporal versioning`,
  "std-ded": `@@26 USC \u00A7 63(c)(2)(A) - Standard Deduction (Joint)@@

/*
(A) 200 percent of the dollar amount in effect under
subparagraph (C) for joint returns or surviving spouses.
*/

declaration scope StandardDeduction:
  input basic_std_ded_other content money
  internal joint_multiplier content decimal
  output joint_deduction content money

scope StandardDeduction:
  definition joint_multiplier equals 2  # "200 percent"
  definition joint_deduction equals
    basic_std_ded_other * joint_multiplier

# Clean, but when did "200 percent" take effect?
# What was it before 1988? Catala doesn't track this.`,
  "ny-eitc": `@@NY Tax Law \u00A7 606(d) - NY Earned Income Credit@@

/*
\u00A7 606(d) A resident individual allowed the federal EITC
shall be allowed a credit equal to thirty percent of
such federal credit.
*/

declaration scope NYEITC:
  input federal_eitc content money
  internal ny_eitc_rate content decimal
  output ny_eitc content money

scope NYEITC:
  definition ny_eitc_rate equals 30%  # "thirty percent"
  definition ny_eitc equals federal_eitc * ny_eitc_rate

# What if NY changes their rate? No temporal history.
# When did "thirty percent" start? Need external tracking.`,
};

function getCodeLanguage(
  format: FormatTab
): "rulespec" | "xml" | "python" | "catala" {
  switch (format) {
    case "rulespec":
      return "rulespec";
    case "dmn":
      return "xml";
    case "openfisca":
      return "python";
    case "catala":
      return "catala";
  }
}

function getCodeContent(format: FormatTab, example: ExampleType): string {
  switch (format) {
    case "rulespec":
      return rulespecExamples[example];
    case "dmn":
      return dmnExamples[example];
    case "openfisca":
      return openfiscaExamples[example];
    case "catala":
      return catalaExamples[example];
  }
}

function TabbedCodeExamples() {
  const [activeExample, setActiveExample] = useState<ExampleType>("niit");
  const [activeTab, setActiveTab] = useState<FormatTab>("rulespec");

  const filename = getFilename(activeExample, activeTab);

  return (
    <div className="max-w-[800px] mx-auto mb-16">
      {/* Example selector */}
      <div className="flex gap-2 mb-4 flex-wrap justify-center">
        {(Object.keys(examples) as ExampleType[]).map((ex) => (
          <button
            key={ex}
            className={`px-4 py-1.5 rounded-full font-mono text-xs transition-all duration-150 border ${
              activeExample === ex
                ? "bg-[var(--color-accent-light)] border-[var(--color-accent)] text-[var(--color-accent)]"
                : "bg-transparent border-[var(--color-rule)] text-[var(--color-ink-muted)] hover:border-[var(--color-rule)] hover:text-[var(--color-ink-secondary)]"
            }`}
            onClick={() => setActiveExample(ex)}
          >
            {examples[ex].label}
          </button>
        ))}
      </div>

      {/* Format tabs */}
      <div className="flex border-b border-[var(--color-rule)] mb-0">
        {(["rulespec", "dmn", "openfisca", "catala"] as FormatTab[]).map((tab) => (
          <button
            key={tab}
            className={`px-5 py-3 font-mono text-xs font-medium border-b-2 transition-colors duration-150 bg-transparent ${
              activeTab === tab
                ? "border-[var(--color-accent)] text-[var(--color-accent)]"
                : "border-transparent text-[var(--color-ink-muted)] hover:text-[var(--color-ink-secondary)]"
            }`}
            onClick={() => setActiveTab(tab)}
          >
            {formatLabels[tab]}
          </button>
        ))}
      </div>

      {/* Code block */}
      <div className="bg-[var(--color-code-bg)] border border-[var(--color-rule)] border-t-0 rounded-b-md overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 bg-[var(--color-paper-elevated)] border-b border-[var(--color-rule)]">
          <span className="flex items-center gap-2 font-mono text-xs text-[var(--color-ink-muted)]">
            <FileIcon className="w-3.5 h-3.5" />
            {filename}
          </span>
          <span className="font-mono text-[0.7rem] text-[var(--color-ink-muted)]">
            {getNote(activeTab)}
          </span>
        </div>
        <div className="overflow-x-auto">
          <CodeBlock
            code={getCodeContent(activeTab, activeExample)}
            language={getCodeLanguage(activeTab)}
            className="m-0 p-6 font-mono text-[0.8rem] leading-relaxed whitespace-pre-wrap border-0 rounded-none bg-transparent"
          />
        </div>
      </div>
    </div>
  );
}

export function RuleSpecFormat() {
  return (
    <section
      id="format"
      className="relative z-1 py-32 px-8 border-t border-[var(--color-rule-subtle)]"
    >
      <div className="max-w-[1280px] mx-auto">
        <div className="text-center mb-20">
          <h2 className="heading-section mb-6">
            .yaml
          </h2>
          <p className="font-body text-lg text-[var(--color-ink-secondary)] max-w-[600px] mx-auto leading-relaxed">
            Self-contained statute encoding format. One file captures the law:
            statute text, parameters, and computed values.
          </p>
        </div>

        <TabbedCodeExamples />

        {/* Format comparison table */}
        <div className="mt-16 mb-16">
          <h3 className="font-display text-2xl text-[var(--color-ink)] text-center mb-2">
            Format comparison
          </h3>
          <p className="font-body text-base text-[var(--color-ink-secondary)] text-center mb-8">
            RuleSpec is purpose-built for encoding law with auditability and temporal
            accuracy.
          </p>

          <div className="overflow-x-auto rounded-md border border-[var(--color-rule)]">
            <table className="w-full border-collapse font-body text-[0.9rem]">
              <thead>
                <tr>
                  <th className="px-5 py-3 text-left font-semibold text-[var(--color-code-text)] bg-[var(--color-code-bg)] border-b border-[var(--color-rule)]">
                    Capability
                  </th>
                  <th className="px-5 py-3 text-left font-semibold text-[var(--color-code-text)] bg-[var(--color-code-bg)] border-b border-[var(--color-rule)]">
                    DMN
                  </th>
                  <th className="px-5 py-3 text-left font-semibold text-[var(--color-code-text)] bg-[var(--color-code-bg)] border-b border-[var(--color-rule)]">
                    OpenFisca/PE
                  </th>
                  <th className="px-5 py-3 text-left font-semibold text-[var(--color-code-text)] bg-[var(--color-code-bg)] border-b border-[var(--color-rule)]">
                    Catala
                  </th>
                  <th className="px-5 py-3 text-left font-semibold bg-[var(--color-accent-light)] text-[var(--color-accent)] border-b border-[var(--color-rule)]">
                    RuleSpec
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  { cap: "Legal citations", dmn: "no", of: "partial", cat: "partial", rulespec: "yes" },
                  { cap: "Temporal versioning", dmn: "no", of: "yes", cat: "no", rulespec: "yes" },
                  { cap: "Formula language", dmn: "FEEL", of: "Python", cat: "Custom", rulespec: "Python-like" },
                  { cap: "File format", dmn: "XML", of: "Py + YAML", cat: "Custom", rulespec: "Custom DSL" },
                  { cap: "Self-contained", dmn: "no", of: "no", cat: "yes", rulespec: "yes" },
                  { cap: "Reform modeling", dmn: "no", of: "yes", cat: "no", rulespec: "yes" },
                  { cap: "No magic numbers", dmn: "no", of: "no", cat: "no", rulespec: "yes" },
                  { cap: "LLM-friendly", dmn: "no", of: "partial", cat: "partial", rulespec: "yes" },
                ].map((row, i, arr) => (
                  <tr key={row.cap}>
                    <td className={`px-5 py-3 text-[var(--color-ink-secondary)] ${i < arr.length - 1 ? "border-b border-[var(--color-rule-subtle)]" : ""}`}>
                      {row.cap}
                    </td>
                    {(["dmn", "of", "cat", "rulespec"] as const).map((col) => {
                      const val = row[col];
                      let cls = "text-[var(--color-ink-muted)]";
                      let content: React.ReactNode = val;
                      if (val === "yes") {
                        cls = "text-[var(--color-success)] font-medium";
                        content = <CheckIcon className="w-4 h-4" />;
                      } else if (val === "no") {
                        cls = "text-[var(--color-ink-muted)]";
                        content = <XIcon className="w-4 h-4" />;
                      } else if (val === "partial") {
                        cls = "text-[var(--color-warning)]";
                        content = "Partial";
                      }
                      return (
                        <td key={col} className={`px-5 py-3 ${cls} ${i < arr.length - 1 ? "border-b border-[var(--color-rule-subtle)]" : ""}`}>
                          {content}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Features grid */}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-6 mt-12">
          {[
            {
              icon: <CitationIcon className="w-5 h-5" />,
              title: "Legal citations",
              desc: (
                <>
                  Filepath mirrors statute citation.{" "}
                  <code className="font-mono text-[0.8rem] px-1.5 py-0.5 bg-[var(--color-accent-light)] rounded text-[var(--color-accent)]">
                    26/24/d/1/B.yaml
                  </code>{" "}
                  encodes 26 USC &sect; 24(d)(1)(B).
                </>
              ),
            },
            {
              icon: <ParameterIcon className="w-5 h-5" />,
              title: "Time-varying values",
              desc: (
                <>
                  Policy values change over time. Definitions track every
                  historical value with{" "}
                  <code className="font-mono text-[0.8rem] px-1.5 py-0.5 bg-[var(--color-accent-light)] rounded text-[var(--color-accent)]">
                    from
                  </code>{" "}
                  effective dates.
                </>
              ),
            },
            {
              icon: <FormulaIcon className="w-5 h-5" />,
              title: "No magic numbers",
              desc: "Only small integers (-1 to 3) allowed in formulas. All policy values must come from named definitions with statute citations.",
            },
            {
              icon: <ImportIcon className="w-5 h-5" />,
              title: "Cross-references",
              desc: "Statute sections reference each other by name. The compiler resolves dependencies via topological sort.",
            },
            {
              icon: <TestIcon className="w-5 h-5" />,
              title: "Reform modeling",
              desc: (
                <>
                  The{" "}
                  <code className="font-mono text-[0.8rem] px-1.5 py-0.5 bg-[var(--color-accent-light)] rounded text-[var(--color-accent)]">
                    amend
                  </code>{" "}
                  keyword overrides any definition with new values. Model policy
                  reforms without touching enacted statute files.
                </>
              ),
            },
            {
              icon: <VersionIcon className="w-5 h-5" />,
              title: "Temporal formulas",
              desc: (
                <>
                  When laws change, track different formula versions with{" "}
                  <code className="font-mono text-[0.8rem] px-1.5 py-0.5 bg-[var(--color-accent-light)] rounded text-[var(--color-accent)]">
                    from
                  </code>{" "}
                  effective dates and sunset provisions.
                </>
              ),
            },
          ].map((f) => (
            <div
              key={f.title}
              className="p-6 bg-[var(--color-paper-elevated)] border border-[var(--color-rule)] rounded-md transition-all duration-200 hover:bg-[var(--color-accent-light)] hover:border-[var(--color-accent)] hover:-translate-y-1"
            >
              <div className="w-12 h-12 flex items-center justify-center bg-[var(--color-accent-light)] rounded-md text-[var(--color-accent)] mb-5">
                {f.icon}
              </div>
              <h3 className="font-body text-[1.1rem] text-[var(--color-ink)] mb-2">
                {f.title}
              </h3>
              <p className="font-body text-[0.9rem] text-[var(--color-ink-secondary)] leading-relaxed">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
