/**
 * Single source of truth for RAC code examples used across the site.
 *
 * Update these when the RAC syntax changes — the website, spec section,
 * and hero animation all pull from here.
 */

// -- Hero animation snippet ---------------------------------------------------

export const heroRacCode = `ctc_amount_per_child:
  from 1998-01-01: 400
  from 1999-01-01: 500
  from 2001-01-01: 600
  from 2003-01-01: 1000
  from 2018-01-01: 2000
  from 2025-01-01: 2200

child_tax_credit:
  imports:
    - 26/24/c#qualifying_children
  entity: TaxUnit
  from 1998-01-01:
    ctc_amount_per_child * qualifying_children`

// -- Code comparison examples -------------------------------------------------

export type ExampleType = 'niit' | 'aca-ptc' | 'std-ded' | 'ny-eitc'

export const racExamples: Record<ExampleType, string> = {
  'niit': `# 26 USC 1411(a) - Net Investment Income Tax

# (a) In general.— There is hereby imposed a tax equal
# to 3.8 percent of the lesser of— (1) net investment
# income, or (2) modified AGI in excess of the
# threshold amount.

# "3.8 percent"
niit_rate:
    from 2013-01-01: 0.038

# Lesser of NII or excess MAGI over threshold
excess_magi:
    imports:
        - 26/62#modified_agi
        - 26/1411/b#threshold_amount
    entity: TaxUnit
    from 2013-01-01: max(0, modified_agi - threshold_amount)

net_investment_income_tax:
    imports:
        - 26/1411/c#net_investment_income
    entity: TaxUnit
    from 2013-01-01: niit_rate * min(net_investment_income, excess_magi)`,

  'aca-ptc': `# 26 USC 36B(b)(3) - Applicable percentage

# (iii) Temporary percentages for 2021 through 2025
# Up to 150%:     Initial: 0.0   Final: 0.0
# 150% to 200%:   Initial: 0.0   Final: 2.0
# 200% to 250%:   Initial: 2.0   Final: 4.0
# 250% to 300%:   Initial: 4.0   Final: 6.0
# 300% to 400%:   Initial: 6.0   Final: 8.5

# IRA temporary table tier thresholds
ira_tier_1_threshold:
    from 2021-01-01: 0

ira_tier_2_threshold:
    from 2021-01-01: 1.50

ira_tier_3_threshold:
    from 2021-01-01: 2.00

# Initial premium percentages
ira_initial_1:
    from 2021-01-01: 0.0

ira_initial_2:
    from 2021-01-01: 0.0

ira_initial_3:
    from 2021-01-01: 0.02

# Computed: applicable percentage
applicable_percentage:
    imports:
        - 26/36B/b/3#applicable_percentage_base
    entity: TaxUnit
    from 2014-01-01: applicable_percentage_base`,

  'std-ded': `# 26 USC 63(c)(2)(A) - Standard deduction (joint)

# (A) 200 percent of the dollar amount in effect under
# subparagraph (C) for the taxable year in the case of—
# (i) a joint return, or (ii) a surviving spouse

# "200 percent"
joint_multiplier:
    from 1988-01-01: 2

basic_std_ded_joint:
    imports:
        - 26/63/c/2/C#basic_std_ded_other
    entity: TaxUnit
    from 1988-01-01: basic_std_ded_other * joint_multiplier`,

  'ny-eitc': `# NY Tax Law 606(d) - NY Earned Income Credit

# 606(d) For taxable years beginning after 2002, a
# resident individual who is allowed the earned income
# credit under section 32 of the IRC shall be allowed
# a credit equal to thirty percent of such federal credit.

# "thirty percent"
ny_eitc_rate:
    from 2003-01-01: 0.30

ny_eitc:
    imports:
        - 26/32#federal_eitc
    entity: TaxUnit
    from 2003-01-01: federal_eitc * ny_eitc_rate`,
}

// -- Spec section content -----------------------------------------------------

export const specContent = `# RAC file specification

Self-contained statute encoding format for tax and benefit rules.
Parsed by a recursive descent parser into a typed AST.

## File Structure

\`\`\`
# path/to/section.rac - Title

# Statute text in comments
# (a) In general.— ...

param_name:
    from 2024-01-01: 100
    from 2023-01-01: 95

var_name:
    entity: TaxUnit
    from 2024-01-01: param_name * input_value
\`\`\`

## Top-level declarations

| Declaration | Syntax | Purpose |
|-------------|--------|---------|
| Comment | \`# ...\` | Statute text, section headers |
| Definition | \`name:\` | Parameter or computed value (inferred from fields) |
| \`entity\` | \`entity name:\` | Entity type with fields |
| \`amend\` | \`amend path:\` | Override for reform modeling |

## Entity declarations

Define entity types with typed fields and relationships:

\`\`\`
entity Person:
    age: int
    income: float
    tax_unit: -> TaxUnit

entity TaxUnit:
    members: [Person]
\`\`\`

## Definitions (parameters and computed values)

No keyword prefix needed — the parser infers type from fields.
Definitions without \`entity:\` are parameters (pure scalar values).
Definitions with \`entity:\` are computed per-entity.

Optional metadata fields: \`source\`, \`label\`, \`description\`, \`unit\`.

\`\`\`
# Parameter: "30 per centum of household income"
income_contribution_rate:
    from 1977-10-01: 0.30

# Computed value
snap_allotment:
    entity: Household
    from 1977-10-01:
        max(0, thrifty_food_plan_cost -
            snap_net_income * income_contribution_rate)
\`\`\`

Definitions earlier in a file are in scope for later ones.

## Temporal values

Use \`from YYYY-MM-DD:\` for effective dates.
Use \`from DATE to DATE:\` for sunset provisions:

\`\`\`
ctc_base_amount:
    from 1998-01-01: 400
    from 1999-01-01: 500
    from 2001-01-01: 600
    from 2003-01-01: 1000
    from 2018-01-01: 2000  # TCJA
    from 2025-01-01: 2200  # P.L. 119-21

# Sunset clause
arpa_bonus:
    from 2021-01-01 to 2025-12-31: 1600
\`\`\`

## Expression syntax

Python-like with restrictions:
- Conditionals: \`if cond: expr else: expr\`
- Pattern matching: \`match expr: pattern => result\`
- Logic: \`and\`, \`or\`, \`not\`
- Built-ins: \`max\`, \`min\`, \`abs\`, \`round\`, \`sum\`, \`len\`, \`clip\`
- Field access: \`person.income\`
- **No magic numbers** — only -1, 0, 1, 2, 3 in formulas

\`\`\`
applicable_percentage:
    entity: TaxUnit
    from 2026-01-01:
        if is_joint_return: joint_rate else: single_rate

threshold:
    entity: TaxUnit
    from 2026-01-01:
        match filing_status:
            "SINGLE" => single_threshold
            "JOINT" => joint_threshold
\`\`\`

## Amendments (Reform Modeling)

\`\`\`
amend gov/tax/personal_allowance:
    from 2025-04-06: 15000
\`\`\`

## File Naming

Filepath = legal citation:
\`\`\`
statute/7/2017/a.rac      -> 7 USC 2017(a)
statute/26/24/d/1/B.rac   -> 26 USC 24(d)(1)(B)
statute/26/32/b.rac       -> 26 USC 32(b)
\`\`\``
