/**
 * Single source of truth for RuleSpec code examples used across the site.
 *
 * Update these when the RuleSpec syntax changes — the website, spec section,
 * and hero animation all pull from here.
 */

// -- Hero animation snippet ---------------------------------------------------

export const heroRuleSpecCode = `format: rulespec/v1
imports:
  - us:statutes/26/24/c
rules:
  - name: child_tax_credit
    kind: derived
    entity: TaxUnit
    dtype: Money
    period: Year
    versions:
      - effective_from: '1998-01-01'
        formula: ctc_amount_per_child * qualifying_children`

// -- Code comparison examples -------------------------------------------------

export type ExampleType = 'niit' | 'aca-ptc' | 'std-ded' | 'ny-eitc'

export const rulespecExamples: Record<ExampleType, string> = {
  'niit': `format: rulespec/v1
module:
  summary: IRC section 1411(a) imposes the net investment income tax.
imports:
  - us:statutes/26/1411/b
  - us:statutes/26/1411/c
rules:
  - name: niit_rate
    kind: parameter
    dtype: Rate
    source: 26 USC 1411(a)
    versions:
      - effective_from: '2013-01-01'
        formula: '0.038'
  - name: net_investment_income_tax
    kind: derived
    entity: TaxUnit
    dtype: Money
    period: Year
    unit: USD
    source: 26 USC 1411(a)
    versions:
      - effective_from: '2013-01-01'
        formula: |-
          niit_rate * min(
              net_investment_income,
              max(0, modified_agi - threshold_amount)
          )`,

  'aca-ptc': `format: rulespec/v1
module:
  summary: IRC section 36B(b)(3)(A) defines applicable percentage.
imports:
  - us:statutes/26/36B/b/3
rules:
  - name: applicable_percentage
    kind: derived
    entity: TaxUnit
    dtype: Rate
    period: Year
    source: 26 USC 36B(b)(3)(A)
    versions:
      - effective_from: '2014-01-01'
        formula: applicable_percentage_base`,

  'std-ded': `format: rulespec/v1
module:
  summary: IRC section 63(c)(5) defines the dependent standard deduction.
imports:
  - us:policies/irs/rev-proc-2025-32/standard-deduction
rules:
  - name: dependent_standard_deduction
    kind: derived
    entity: Person
    dtype: Money
    period: Year
    unit: USD
    source: IRC section 63(c)(5)
    versions:
      - effective_from: '2026-01-01'
        formula: |-
          min(
              single_basic_standard_deduction,
              max(
                  dependent_minimum,
                  earned_income + dependent_earned_income_addition
              )
          )`,

  'ny-eitc': `format: rulespec/v1
module:
  summary: New York Tax Law section 606(d) defines the state earned income credit.
imports:
  - us:statutes/26/32
rules:
  - name: ny_eitc_rate
    kind: parameter
    dtype: Rate
    source: NY Tax Law section 606(d)
    versions:
      - effective_from: '2003-01-01'
        formula: '0.30'
  - name: ny_eitc
    kind: derived
    entity: TaxUnit
    dtype: Money
    period: Year
    unit: USD
    source: NY Tax Law section 606(d)
    versions:
      - effective_from: '2003-01-01'
        formula: federal_eitc * ny_eitc_rate`,
}

// -- Spec section content -----------------------------------------------------

export const specContent = `# RuleSpec file specification

RuleSpec is the executable legal computation layer for Axiom. It is YAML with
structured provenance, durable legal IDs, typed rules, effective dates, and
formula strings that compile into the Axiom Rules runtime.

## File Structure

\`\`\`yaml
format: rulespec/v1
module:
  summary: IRC section 3101(a) imposes OASDI tax on wages.
  source_verification:
    corpus_citation_path: us/statute/26/3101
rules:
  - name: oasdi_wage_tax_rate
    kind: parameter
    dtype: Rate
    source: 26 USC 3101(a)
    versions:
      - effective_from: '1990-01-01'
        formula: '0.062'
  - name: oasdi_wage_tax
    kind: derived
    entity: TaxUnit
    dtype: Money
    period: Year
    unit: USD
    source: 26 USC 3101(a)
    versions:
      - effective_from: '1990-01-01'
        formula: wages * oasdi_wage_tax_rate
\`\`\`

Every file starts with \`format: rulespec/v1\`. Jurisdiction repositories use the
file path as the durable legal module ID.

## Top-level keys

| Key | Purpose |
|-----|---------|
| \`format\` | Schema discriminator. |
| \`module\` | Summary and source verification metadata. |
| \`imports\` | Other RuleSpec modules by canonical path. |
| \`relations\` | Declared entity relations. |
| \`rules\` | Parameters, derived outputs, relations, and reiterations. |

## Imports and IDs

\`\`\`yaml
imports:
  - us:policies/usda/snap/fy-2026-cola/maximum-allotments
  - us-co:regulations/10-ccr-2506-1/4.207.3
\`\`\`

The canonical form is \`<jurisdiction>:<relative path without extension>\`.
Executable outputs append \`#<rule_name>\`:

\`\`\`text
us:statutes/7/2017/a#snap_regular_month_allotment
us-co:regulations/10-ccr-2506-1/4.403.2#snap_countable_earned_income
\`\`\`

Formula strings may use local symbols after imports resolve. API calls, tests,
notebooks, traces, and machine-readable outputs use durable legal IDs.

## Rule kinds

\`\`\`yaml
rules:
  - name: snap_maximum_allotment_table
    kind: parameter
    dtype: Money
    unit: USD
    indexed_by: household_size
    versions:
      - effective_from: '2025-10-01'
        values:
          1: 298
          2: 546
  - name: snap_maximum_allotment
    kind: derived
    entity: Household
    dtype: Money
    period: Month
    unit: USD
    versions:
      - effective_from: '2025-10-01'
        formula: snap_maximum_allotment_table[household_size]
\`\`\`

Use table parameters for source-stated tables so reforms can target specific
cells. Use derived rules for computations. Use \`reiteration\` for provisions
that restate an upstream rule without changing computation.

## Tests and execution

\`\`\`yaml
- name: regular_allotment_subtracts_contribution
  period: 2026-01
  input:
    us:statutes/7/2017/a#input.household_size: 1
    us:policies/usda/snap/fy-2026-cola/maximum-allotments#snap_maximum_allotment: 298
    us:statutes/7/2014/e/6/A#snap_net_income: 100
    us:statutes/7/2017/a#input.snap_eligible: true
  output:
    us:statutes/7/2017/a#snap_regular_month_allotment: 268
\`\`\`

Bare friendly keys are invalid at public boundaries. Input slots use
\`#input.<local symbol>\`, relation facts use \`#relation.<relation name>\`, and
imported values use the upstream rule ID.

## Formula syntax

Formula strings are Python-like expressions parsed by the Axiom Rules runtime:

- Conditionals: \`if cond: expr else: expr\`
- Pattern matching: \`match expr: pattern => result\`
- Logic: \`and\`, \`or\`, \`not\`
- Built-ins: \`max\`, \`min\`, \`abs\`, \`round\`, \`sum\`, \`len\`
- Table lookup: \`table_name[index_expr]\`

Formula literals must be grounded in the source provision. Inflation-adjusted
values, agency tables, and downstream options belong in the authority that
actually states them.

## File Naming

Filepath = legal or policy authority:

\`\`\`text
rules-us/statutes/7/2017/a.yaml
rules-us/statutes/26/63/c/5.yaml
rules-us/policies/usda/snap/fy-2026-cola/maximum-allotments.yaml
rules-us-co/regulations/10-ccr-2506-1/4.403.2.yaml
\`\`\``
