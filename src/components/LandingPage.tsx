import { useState, useEffect, useRef } from 'react'
import * as styles from './LandingPage.css'
import Header from './Header'
import CodeBlock from './CodeBlock'
import {
  GitHubIcon,
  ArrowRightIcon,
  CheckIcon,
  XIcon,
  CodeIcon,
  CpuIcon,
  TargetIcon,
  FileIcon,
  CitationIcon,
  ParameterIcon,
  FormulaIcon,
  TestIcon,
  ImportIcon,
  VersionIcon,
} from './Icons'
import {
  type ExampleType,
  heroRacCode,
  racExamples,
  specContent,
} from '../lib/rac-examples'

// ============================================
// CODE EXAMPLES
// ============================================
type FormatTab = 'rac' | 'dmn' | 'openfisca' | 'catala'

const examples: Record<ExampleType, { label: string; citation: string }> = {
  'niit': { label: 'NIIT', citation: '26 USC § 1411(a)' },
  'aca-ptc': { label: 'ACA Premium Tax Credit', citation: '26 USC § 36B(b)(3)(A)' },
  'std-ded': { label: 'Standard Deduction', citation: '26 USC § 63(c)(2)(A)' },
  'ny-eitc': { label: 'NY EITC', citation: 'NY Tax Law § 606(d)' },
}

const formatLabels: Record<FormatTab, string> = {
  rac: 'RAC',
  dmn: 'DMN',
  openfisca: 'OpenFisca/PE',
  catala: 'Catala',
}

const getFilename = (example: ExampleType, format: FormatTab): string => {
  const filenames: Record<ExampleType, Record<FormatTab, string>> = {
    'niit': {
      rac: 'statute/26/1411/a.rac',
      dmn: 'niit.dmn',
      openfisca: 'variables/gov/irs/tax/federal_income/net_investment_income_tax.py',
      catala: 'niit.catala_en',
    },
    'aca-ptc': {
      rac: 'statute/26/36B/b/3/A.rac',
      dmn: 'aca_ptc.dmn',
      openfisca: 'variables/gov/aca/ptc/aca_required_contribution_percentage.py',
      catala: 'aca_ptc.catala_en',
    },
    'std-ded': {
      rac: 'statute/26/63/c/2/A.rac',
      dmn: 'standard_deduction.dmn',
      openfisca: 'variables/gov/irs/income/taxable_income/deductions/standard_deduction/basic_standard_deduction.py',
      catala: 'standard_deduction.catala_en',
    },
    'ny-eitc': {
      rac: 'statute/ny/tax/606/d.rac',
      dmn: 'ny_eitc.dmn',
      openfisca: 'variables/gov/states/ny/tax/income/credits/ny_eitc.py',
      catala: 'ny_eitc.catala_en',
    },
  }
  return filenames[example][format]
}

const getNote = (format: FormatTab): string => {
  const notes: Record<FormatTab, string> = {
    rac: 'Single self-contained file',
    dmn: 'XML + FEEL expression language',
    openfisca: 'Python + YAML (3 files)',
    catala: 'Literate programming',
  }
  return notes[format]
}

// RAC code examples (from shared source)
const RacCode = ({ example }: { example: ExampleType }) => {
  return (
    <CodeBlock code={racExamples[example]} language="rac" className={styles.codePre} />
  )
}

// DMN code examples
const DmnCode = ({ example }: { example: ExampleType }) => {
  const dmnExamples: Record<ExampleType, string> = {
    'niit': `<?xml version="1.0" encoding="UTF-8"?>
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
    'aca-ptc': `<?xml version="1.0" encoding="UTF-8"?>
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
    'std-ded': `<?xml version="1.0" encoding="UTF-8"?>
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
    'ny-eitc': `<?xml version="1.0" encoding="UTF-8"?>
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
  }

  return (
    <CodeBlock code={dmnExamples[example]} language="xml" className={styles.codePre} />
  )
}

// OpenFisca/PolicyEngine code examples
const OpenFiscaCode = ({ example }: { example: ExampleType }) => {
  const openfiscaExamples: Record<ExampleType, string> = {
    'niit': `# File 1: variables/gov/irs/.../net_investment_income_tax.py
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
    'aca-ptc': `# File 1: variables/gov/aca/.../aca_required_contribution_percentage.py
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
    'std-ded': `# File 1: variables/.../basic_standard_deduction.py
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
    'ny-eitc': `# File 1: variables/gov/states/ny/.../ny_eitc.py
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
  }

  return (
    <CodeBlock code={openfiscaExamples[example]} language="python" className={styles.codePre} />
  )
}

// Catala code examples
const CatalaCode = ({ example }: { example: ExampleType }) => {
  const catalaExamples: Record<ExampleType, string> = {
    'niit': `@@26 USC § 1411(a) - Net Investment Income Tax@@

/*
(a) In general.— There is hereby imposed a tax equal to
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
    'aca-ptc': `@@26 USC § 36B(b)(3)(A) - ACA Premium Tax Credit@@

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
    'std-ded': `@@26 USC § 63(c)(2)(A) - Standard Deduction (Joint)@@

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
    'ny-eitc': `@@NY Tax Law § 606(d) - NY Earned Income Credit@@

/*
§ 606(d) A resident individual allowed the federal EITC
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
  }

  return (
    <CodeBlock code={catalaExamples[example]} language="catala" className={styles.codePre} />
  )
}

// Animated code transformation for hero - interactive
function CodeTransform() {
  const [phase, setPhase] = useState(0)
  const [isPaused, setIsPaused] = useState(false)

  useEffect(() => {
    if (isPaused) return
    const interval = setInterval(() => {
      setPhase(p => (p + 1) % 3)
    }, 3000)
    return () => clearInterval(interval)
  }, [isPaused])

  const handleClick = () => {
    setIsPaused(true)
    setPhase(p => (p + 1) % 3)
  }

  const statuteText = `(a) In general.— There is hereby
imposed a tax equal to 3.8 percent
of the lesser of net investment
income or modified AGI in excess
of the threshold amount.`

  const racCode = heroRacCode

  return (
    <div className={styles.codeTransform} onClick={handleClick} style={{ cursor: 'pointer' }} title="Click to advance">
      <div className={`${styles.codePanel} ${phase === 0 ? styles.codePanelActive : ''}`}>
        <div className={styles.codePanelHeader}>
          <span className={styles.codePanelDot} />
          <span className={styles.codePanelLabel}>26 USC § 1411(a)</span>
        </div>
        <CodeBlock code={statuteText} language="plain" className={styles.codePanelContent} />
      </div>

      <div className={styles.codeArrow}>
        <div className={`${styles.codeArrowLine} ${phase === 1 ? styles.codeArrowLineActive : ''}`} />
        <span className={`${styles.codeArrowLabel} ${phase === 1 ? styles.codeArrowLabelActive : ''}`}>
          AutoRAC
        </span>
      </div>

      <div className={`${styles.codePanel} ${styles.codePanelRac} ${phase === 2 ? styles.codePanelActive : ''}`}>
        <div className={styles.codePanelHeader}>
          <span className={`${styles.codePanelDot} ${styles.codePanelDotRac}`} />
          <span className={styles.codePanelLabel}>statute/26/1411/a.rac</span>
        </div>
        <CodeBlock code={racCode} language="rac" className={styles.codePanelContent} />
      </div>
    </div>
  )
}

// Tabbed code examples component
function TabbedCodeExamples() {
  const [activeExample, setActiveExample] = useState<ExampleType>('niit')
  const [activeTab, setActiveTab] = useState<FormatTab>('rac')

  const filename = getFilename(activeExample, activeTab)

  return (
    <div className={styles.codeExamplesContainer}>
      {/* Example selector */}
      <div className={styles.exampleBar}>
        {(Object.keys(examples) as ExampleType[]).map((ex) => (
          <button
            key={ex}
            className={`${styles.examplePill} ${activeExample === ex ? styles.examplePillActive : ''}`}
            onClick={() => setActiveExample(ex)}
          >
            {examples[ex].label}
          </button>
        ))}
      </div>

      {/* Format tabs */}
      <div className={styles.tabBar}>
        {(['rac', 'dmn', 'openfisca', 'catala'] as FormatTab[]).map((tab) => (
          <button
            key={tab}
            className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {formatLabels[tab]}
          </button>
        ))}
      </div>

      {/* Code block */}
      <div className={styles.codeBlock}>
        <div className={styles.codeHeader}>
          <span className={styles.codeFilename}>
            <FileIcon className={styles.iconSmall} />
            {filename}
          </span>
          <span className={styles.codeNote}>{getNote(activeTab)}</span>
        </div>
        <div className={styles.codeContent}>
          {activeTab === 'rac' && <RacCode example={activeExample} />}
          {activeTab === 'dmn' && <DmnCode example={activeExample} />}
          {activeTab === 'openfisca' && <OpenFiscaCode example={activeExample} />}
          {activeTab === 'catala' && <CatalaCode example={activeExample} />}
        </div>
      </div>
    </div>
  )
}

// ============================================
// AUTORAC TERMINAL
// ============================================

interface TerminalLine {
  content: React.ReactNode
  delay: number
}

function AutoRACTerminal() {
  const [visible, setVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true) },
      { threshold: 0.2 },
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  const lines: TerminalLine[] = [
    { delay: 0, content: (
      <>
        <span className={styles.terminalPrompt}>$ </span>
        <span className={styles.terminalCommand}>autorac encode &quot;26 USC 32&quot;</span>
      </>
    )},
    { delay: 0.4, content: <span className={styles.terminalDim}>&nbsp;</span> },
    { delay: 0.6, content: (
      <>
        <span className={`${styles.terminalLabel} ${styles.terminalLabelAtlas}`}>[atlas]</span>
        <span className={styles.terminalMuted}> Loading 26 USC 32...</span>
        <span className={styles.terminalHighlight}> 81,247 characters</span>
      </>
    )},
    { delay: 0.9, content: (
      <>
        <span className={`${styles.terminalLabel} ${styles.terminalLabelAtlas}`}>[atlas]</span>
        <span className={styles.terminalMuted}> Parsing subsection tree...</span>
      </>
    )},
    { delay: 1.2, content: (
      <>
        <span className={`${styles.terminalLabel} ${styles.terminalLabelAtlas}`}>[atlas]</span>
        <span className={styles.terminalDim}>   (a) Allowance of credit </span>
        <span className={styles.terminalMuted}>           2,341 chars</span>
      </>
    )},
    { delay: 1.35, content: (
      <>
        <span className={`${styles.terminalLabel} ${styles.terminalLabelAtlas}`}>[atlas]</span>
        <span className={styles.terminalDim}>   (b) Percentages and amounts </span>
        <span className={styles.terminalMuted}>       4,892 chars</span>
      </>
    )},
    { delay: 1.5, content: (
      <>
        <span className={`${styles.terminalLabel} ${styles.terminalLabelAtlas}`}>[atlas]</span>
        <span className={styles.terminalDim}>   (c) Definitions and special rules </span>
        <span className={styles.terminalMuted}> 5,675 chars</span>
      </>
    )},
    { delay: 1.65, content: (
      <>
        <span className={`${styles.terminalLabel} ${styles.terminalLabelAtlas}`}>[atlas]</span>
        <span className={styles.terminalDim}>   ...</span>
      </>
    )},
    { delay: 1.8, content: (
      <>
        <span className={`${styles.terminalLabel} ${styles.terminalLabelAtlas}`}>[atlas]</span>
        <span className={styles.terminalDim}>   (n) Supplemental child credit </span>
        <span className={styles.terminalMuted}>     1,203 chars</span>
      </>
    )},
    { delay: 2.0, content: (
      <>
        <span className={`${styles.terminalLabel} ${styles.terminalLabelAtlas}`}>[atlas]</span>
        <span className={styles.terminalHighlight}> 14 subsections extracted</span>
      </>
    )},
    { delay: 2.3, content: <span className={styles.terminalDim}>&nbsp;</span> },
    { delay: 2.5, content: (
      <>
        <span className={`${styles.terminalLabel} ${styles.terminalLabelEncode}`}>[encode]</span>
        <span className={styles.terminalMuted}> Wave 1: </span>
        <span className={styles.terminalDim}>(a), (b), (c), (d), (f), (h), (i), (j), (m), (n)</span>
      </>
    )},
    { delay: 2.8, content: (
      <>
        <span className={`${styles.terminalLabel} ${styles.terminalLabelEncode}`}>[encode]</span>
        <span className={styles.terminalMuted}> Wave 2: </span>
        <span className={styles.terminalDim}>(e), (g), (k), (l)</span>
        <span className={styles.terminalMuted}> — depends on wave 1</span>
      </>
    )},
    { delay: 3.2, content: (
      <>
        <span className={`${styles.terminalLabel} ${styles.terminalLabelEncode}`}>[encode]</span>
        <span className={styles.terminalProgressBar}> ████████████████████</span>
        <span className={styles.terminalHighlight}> 14/14 complete</span>
      </>
    )},
    { delay: 3.6, content: <span className={styles.terminalDim}>&nbsp;</span> },
    { delay: 3.8, content: (
      <>
        <span className={`${styles.terminalLabel} ${styles.terminalLabelValidate}`}>[validate]</span>
        <span className={styles.terminalMuted}> CI:           </span>
        <span className={styles.terminalSuccess}>14/14 passed</span>
      </>
    )},
    { delay: 4.1, content: (
      <>
        <span className={`${styles.terminalLabel} ${styles.terminalLabelValidate}`}>[validate]</span>
        <span className={styles.terminalMuted}> PolicyEngine: </span>
        <span className={styles.terminalSuccess}>12/14 match</span>
        <span className={styles.terminalDim}>  ✓</span>
      </>
    )},
    { delay: 4.4, content: (
      <>
        <span className={`${styles.terminalLabel} ${styles.terminalLabelValidate}`}>[validate]</span>
        <span className={styles.terminalMuted}> TAXSIM:       </span>
        <span className={styles.terminalSuccess}>11/14 match</span>
        <span className={styles.terminalDim}>  ✓</span>
      </>
    )},
    { delay: 4.7, content: (
      <>
        <span className={`${styles.terminalLabel} ${styles.terminalLabelValidate}`}>[validate]</span>
        <span className={styles.terminalMuted}> LLM review:   </span>
        <span className={styles.terminalHighlight}>2 issues flagged → auto-fixing</span>
      </>
    )},
    { delay: 5.1, content: <span className={styles.terminalDim}>&nbsp;</span> },
    { delay: 5.3, content: (
      <>
        <span className={`${styles.terminalLabel} ${styles.terminalLabelDone}`}>[done]</span>
        <span className={styles.terminalSuccess}> 14 .rac files written to </span>
        <span className={styles.terminalHighlight}>statute/26/32/</span>
      </>
    )},
  ]

  return (
    <div className={styles.terminalContainer} ref={ref}>
      <div className={styles.terminal}>
        <div className={styles.terminalHeader}>
          <span className={`${styles.terminalDot} ${styles.terminalDotRed}`} />
          <span className={`${styles.terminalDot} ${styles.terminalDotYellow}`} />
          <span className={`${styles.terminalDot} ${styles.terminalDotGreen}`} />
          <span className={styles.terminalTitle}>autorac — zsh</span>
        </div>
        <div className={styles.terminalBody}>
          {lines.map((line, i) => (
            <div
              key={i}
              className={styles.terminalLine}
              style={visible ? { animationDelay: `${line.delay}s` } : { animation: 'none' }}
            >
              {line.content}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function LandingPage() {
  const [mounted, setMounted] = useState(false)
  const [specExpanded, setSpecExpanded] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className={styles.page}>
      {/* Background effects */}
      <div className={styles.bgGrid} />
      <div className={styles.bgGlow} />

      <Header variant="landing" />

      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={`${styles.heroContent} ${mounted ? styles.heroContentVisible : ''}`}>
          <div className={styles.heroBadge}>
            <span className={styles.heroBadgeDot} />
            Open Source Infrastructure
          </div>

          <h1 className={styles.heroTitle}>
            Encoding the{' '}
            <span className={styles.heroTitleAccent}>world's rules</span>
          </h1>

          <p className={styles.heroSubtitle}>
            The Rules Foundation builds open, machine-readable encodings of statutes, regulations, and policy rules.
            Ground truth for AI systems. Verifiable by design.
          </p>

          <div className={styles.heroActions}>
            <a href="#atlas" className={styles.btnPrimary}>
              Learn More
              <ArrowRightIcon className={styles.icon} />
            </a>
            <a href="https://github.com/RulesFoundation" className={styles.btnSecondary}>
              <GitHubIcon className={styles.icon} />
              View on GitHub
            </a>
          </div>
        </div>
      </section>

      {/* Atlas Section - The foundation: raw legal source files */}
      <section id="atlas" className={styles.section}>
        <div className={styles.sectionContent}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionLabel}>Foundation</span>
            <h2 className={styles.sectionTitle}>Atlas</h2>
            <p className={styles.sectionSubtitle}>
              It all starts here. A comprehensive map of government source files —
              statutes, regulations, IRS guidance, and state codes. The legal source of truth.
            </p>
          </div>

          <div className={styles.atlasGrid}>
            <div className={styles.atlasCard}>
              <h4>Federal statutes</h4>
              <p>53 USC titles • 82,854 sections • 160,360 cross-references</p>
            </div>
            <div className={styles.atlasCard}>
              <h4>IRS guidance</h4>
              <p>148 Rev. Procs • 105 Rev. Rulings • 317 Notices</p>
            </div>
            <div className={styles.atlasCard}>
              <h4>State codes</h4>
              <p>48 states archived • NY, CA, DC with full section data</p>
            </div>
            <div className={styles.atlasCard}>
              <h4>Regulations</h4>
              <p>CFR titles, Treasury regulations, agency rules — coming soon</p>
            </div>
          </div>

          <div className={styles.atlasFeatures}>
            <div className={styles.autoracFeature}>
              <CheckIcon className={styles.iconSmall} />
              <span>Provenance tracking — fetch date, source URL, checksums</span>
            </div>
            <div className={styles.autoracFeature}>
              <CheckIcon className={styles.iconSmall} />
              <span>Full-text search — query by citation, keyword, or path</span>
            </div>
            <div className={styles.autoracFeature}>
              <CheckIcon className={styles.iconSmall} />
              <span>Change detection — know when upstream sources update</span>
            </div>
          </div>

          <div className={styles.atlasCta}>
            <a href="https://github.com/RulesFoundation/atlas" className={styles.btnSecondary}>
              <GitHubIcon className={styles.icon} />
              View Atlas on GitHub
            </a>
          </div>
        </div>
      </section>

      {/* What is RAC Section */}
      <section id="about" className={styles.section}>
        <div className={styles.sectionContent}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionLabel}>What is RAC</span>
            <h2 className={styles.sectionTitle}>Rules as Code</h2>
            <p className={styles.sectionSubtitle}>
              A domain-specific language for encoding rules with auditability,
              temporal versioning, and legal citations built in.
            </p>
          </div>

          <CodeTransform />

          <div className={styles.features}>
            <div className={styles.feature}>
              <div className={styles.featureIcon}>
                <CodeIcon className={styles.iconMedium} />
              </div>
              <h3 className={styles.featureTitle}>Self-contained</h3>
              <p className={styles.featureDesc}>
                One file captures statute text (as comments), parameters, and formulas.
                Parsed into a typed AST, compiled to IR, executed or compiled to native Rust.
              </p>
            </div>

            <div className={styles.feature}>
              <div className={styles.featureIcon}>
                <CheckIcon className={styles.iconSmall} />
              </div>
              <h3 className={styles.featureTitle}>Legally grounded</h3>
              <p className={styles.featureDesc}>
                File paths mirror legal citations. Every value traces back to statute.
                No magic numbers allowed.
              </p>
            </div>

            <div className={styles.feature}>
              <div className={styles.featureIcon}>
                <CpuIcon className={styles.iconMedium} />
              </div>
              <h3 className={styles.featureTitle}>Temporal versioning</h3>
              <p className={styles.featureDesc}>
                Track how law changes over time. Every definition uses
                <code>from</code> clauses with effective dates.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* .rac Format Section with Tabbed Examples */}
      <section id="format" className={styles.sectionAlt}>
        <div className={styles.sectionContent}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionLabel}>File format</span>
            <h2 className={styles.sectionTitle}>.rac</h2>
            <p className={styles.sectionSubtitle}>
              Self-contained statute encoding format. One file captures the law:
              statute text, parameters, and computed values.
            </p>
          </div>

          <TabbedCodeExamples />

          {/* Format Comparison Table */}
          <div className={styles.comparisonSection}>
            <h3 className={styles.comparisonTitle}>Format comparison</h3>
            <p className={styles.comparisonSubtitle}>
              RAC is purpose-built for encoding law with auditability and temporal accuracy.
            </p>

            <div className={styles.tableWrapper}>
              <table className={styles.comparisonTable}>
                <thead>
                  <tr>
                    <th>Capability</th>
                    <th>DMN</th>
                    <th>OpenFisca/PE</th>
                    <th>Catala</th>
                    <th className={styles.racColumnHeader}>RAC</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Legal citations</td>
                    <td className={styles.noSupport}><XIcon className={styles.iconSmall} /></td>
                    <td className={styles.neutralSupport}>Partial</td>
                    <td className={styles.neutralSupport}>Partial</td>
                    <td className={styles.hasSupport}><CheckIcon className={styles.iconSmall} /></td>
                  </tr>
                  <tr>
                    <td>Temporal versioning</td>
                    <td className={styles.noSupport}><XIcon className={styles.iconSmall} /></td>
                    <td className={styles.hasSupport}><CheckIcon className={styles.iconSmall} /></td>
                    <td className={styles.noSupport}><XIcon className={styles.iconSmall} /></td>
                    <td className={styles.hasSupport}><CheckIcon className={styles.iconSmall} /></td>
                  </tr>
                  <tr>
                    <td>Formula language</td>
                    <td className={styles.neutralSupport}>FEEL</td>
                    <td className={styles.hasSupport}>Python</td>
                    <td className={styles.neutralSupport}>Custom</td>
                    <td className={styles.hasSupport}>Python-like</td>
                  </tr>
                  <tr>
                    <td>File format</td>
                    <td className={styles.noSupport}>XML</td>
                    <td className={styles.neutralSupport}>Py + YAML</td>
                    <td className={styles.neutralSupport}>Custom</td>
                    <td className={styles.hasSupport}>Custom DSL</td>
                  </tr>
                  <tr>
                    <td>Self-contained</td>
                    <td className={styles.noSupport}><XIcon className={styles.iconSmall} /></td>
                    <td className={styles.noSupport}><XIcon className={styles.iconSmall} /></td>
                    <td className={styles.hasSupport}><CheckIcon className={styles.iconSmall} /></td>
                    <td className={styles.hasSupport}><CheckIcon className={styles.iconSmall} /></td>
                  </tr>
                  <tr>
                    <td>Reform modeling</td>
                    <td className={styles.noSupport}><XIcon className={styles.iconSmall} /></td>
                    <td className={styles.hasSupport}><CheckIcon className={styles.iconSmall} /></td>
                    <td className={styles.noSupport}><XIcon className={styles.iconSmall} /></td>
                    <td className={styles.hasSupport}><CheckIcon className={styles.iconSmall} /></td>
                  </tr>
                  <tr>
                    <td>No magic numbers</td>
                    <td className={styles.noSupport}><XIcon className={styles.iconSmall} /></td>
                    <td className={styles.noSupport}><XIcon className={styles.iconSmall} /></td>
                    <td className={styles.noSupport}><XIcon className={styles.iconSmall} /></td>
                    <td className={styles.hasSupport}><CheckIcon className={styles.iconSmall} /></td>
                  </tr>
                  <tr>
                    <td>LLM-friendly</td>
                    <td className={styles.noSupport}><XIcon className={styles.iconSmall} /></td>
                    <td className={styles.neutralSupport}>Partial</td>
                    <td className={styles.neutralSupport}>Partial</td>
                    <td className={styles.hasSupport}><CheckIcon className={styles.iconSmall} /></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Features Grid */}
          <div className={styles.featuresGrid}>
            <div className={styles.featureCard}>
              <div className={styles.featureCardIcon}><CitationIcon className={styles.iconMedium} /></div>
              <h3>Legal citations</h3>
              <p>
                Filepath mirrors statute citation. <code>26/24/d/1/B.rac</code> encodes
                26 USC § 24(d)(1)(B).
              </p>
            </div>

            <div className={styles.featureCard}>
              <div className={styles.featureCardIcon}><ParameterIcon className={styles.iconMedium} /></div>
              <h3>Time-varying values</h3>
              <p>
                Policy values change over time. Definitions track every historical value
                with <code>from</code> effective dates.
              </p>
            </div>

            <div className={styles.featureCard}>
              <div className={styles.featureCardIcon}><FormulaIcon className={styles.iconMedium} /></div>
              <h3>No magic numbers</h3>
              <p>
                Only small integers (-1 to 3) allowed in formulas. All policy values
                must come from named definitions with statute citations.
              </p>
            </div>

            <div className={styles.featureCard}>
              <div className={styles.featureCardIcon}><ImportIcon className={styles.iconMedium} /></div>
              <h3>Cross-references</h3>
              <p>
                Statute sections reference each other by name. The compiler
                resolves dependencies via topological sort.
              </p>
            </div>

            <div className={styles.featureCard}>
              <div className={styles.featureCardIcon}><TestIcon className={styles.iconMedium} /></div>
              <h3>Reform modeling</h3>
              <p>
                The <code>amend</code> keyword overrides any definition with new values.
                Model policy reforms without touching enacted statute files.
              </p>
            </div>

            <div className={styles.featureCard}>
              <div className={styles.featureCardIcon}><VersionIcon className={styles.iconMedium} /></div>
              <h3>Temporal formulas</h3>
              <p>
                When laws change, track different formula versions with
                <code>from</code> effective dates and sunset provisions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* AutoRAC Section */}
      <section id="autorac" className={styles.section}>
        <div className={styles.sectionContent}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionLabel}>AI encoding</span>
            <h2 className={styles.sectionTitle}>AutoRAC</h2>
            <p className={styles.sectionSubtitle}>
              Point it at a statute. Get validated RAC.
            </p>
          </div>

          <AutoRACTerminal />

          {/* 3-Tier Validation */}
          <div className={styles.validationSection}>
            <h3 className={styles.validationTitle}>3-tier validation pipeline</h3>

            <div className={styles.validationTiers}>
              <div className={styles.validationTier}>
                <div className={styles.tierNumber}>1</div>
                <div className={styles.tierContent}>
                  <h4>CI validation</h4>
                  <p><code>rac pytest</code> — instant, free</p>
                  <p className={styles.tierDetail}>Catches syntax errors, format issues, missing imports</p>
                  <div className={styles.tierBranch}>
                    <span className={styles.tierFail}><XIcon className={styles.iconSmall} /> Fail - Fix errors, retry (max 3)</span>
                    <span className={styles.tierPass}><CheckIcon className={styles.iconSmall} /> Pass - Proceed to oracles</span>
                  </div>
                </div>
              </div>

              <div className={styles.tierConnector} />

              <div className={styles.validationTier}>
                <div className={styles.tierNumber}>2</div>
                <div className={styles.tierContent}>
                  <h4>External oracles</h4>
                  <div className={styles.oracleBadges}>
                    <span className={styles.oracleBadge}>PE</span>
                    <span>PolicyEngine</span>
                    <span className={styles.oracleBadge}>TX</span>
                    <span>TAXSIM</span>
                  </div>
                  <p className={styles.tierDetail}>Fast (~10s), free — generates comparison data for LLM reviewers</p>
                </div>
              </div>

              <div className={styles.tierConnector} />

              <div className={styles.validationTier}>
                <div className={styles.tierNumber}>3</div>
                <div className={styles.tierContent}>
                  <h4>LLM reviewers</h4>
                  <div className={styles.reviewerTags}>
                    <span>RAC Reviewer</span>
                    <span>Formula Reviewer</span>
                    <span>Parameter Reviewer</span>
                    <span>Integration Reviewer</span>
                  </div>
                  <p className={styles.tierDetail}>Receive oracle comparison data to diagnose WHY discrepancies exist</p>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.autoracFeatures}>
            <div className={styles.autoracFeature}>
              <CheckIcon className={styles.iconSmall} />
              <span>14 subsections → 14 parallel agents → 14 .rac files</span>
            </div>
            <div className={styles.autoracFeature}>
              <CheckIcon className={styles.iconSmall} />
              <span>Each agent sees only its subsection — no wasted context</span>
            </div>
            <div className={styles.autoracFeature}>
              <CheckIcon className={styles.iconSmall} />
              <span>Validated against real-world calculators, not just syntax</span>
            </div>
            <div className={styles.autoracFeature}>
              <CheckIcon className={styles.iconSmall} />
              <span>Every encoding decision logged for audit</span>
            </div>
          </div>
        </div>
      </section>

      {/* RAC specification section */}
      <section id="spec" className={styles.section}>
        <div className={styles.sectionContent}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionLabel}>Reference</span>
            <h2 className={styles.sectionTitle}>RAC_SPEC.md</h2>
            <p className={styles.sectionSubtitle}>
              Complete specification for the .rac file format
            </p>
          </div>

          <div className={styles.specContainer}>
            <div className={styles.specHeader}>
              <span className={styles.specTitle}>RAC_SPEC.md</span>
              <button
                className={styles.specToggle}
                onClick={() => setSpecExpanded(!specExpanded)}
              >
                {specExpanded ? 'Collapse' : 'Expand full spec'}
              </button>
            </div>

            <div className={`${styles.specContent} ${specExpanded ? styles.specContentExpanded : ''}`}>
              <CodeBlock code={specContent} language="rac" className={styles.specPre} />
            </div>
          </div>
        </div>
      </section>

      {/* Ground Truth for AI Section */}
      <section className={styles.section}>
        <div className={styles.sectionContent}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionLabel}>Ground truth for AI</span>
            <h2 className={styles.sectionTitle}>Verifiable rewards</h2>
            <p className={styles.sectionSubtitle}>
              AI systems answering questions about policy rules need ground truth.
              RAC encodings provide verifiable correctness signals for training.
            </p>
          </div>

          <div className={styles.rlvrGrid}>
            <div className={styles.rlvrCard}>
              <div className={styles.rlvrCardIcon}>
                <TargetIcon className={styles.iconMedium} />
              </div>
              <h3>Training datasets</h3>
              <p>
                Millions of (situation, correct_answer) pairs grounded in actual statute.
                Not synthetic - legally verified.
              </p>
            </div>

            <div className={styles.rlvrCard}>
              <div className={styles.rlvrCardIcon}>
                <CpuIcon className={styles.iconMedium} />
              </div>
              <h3>Verifier</h3>
              <p>
                LLM generates answer, RAC executor checks correctness, binary reward signal.
                Real-time RLVR for policy rule accuracy.
              </p>
            </div>

            <div className={styles.rlvrCard}>
              <div className={styles.rlvrCardIcon}>
                <CheckIcon className={styles.iconSmall} />
              </div>
              <h3>Evaluation benchmarks</h3>
              <p>
                Standardized test suites measuring AI accuracy on EITC, SNAP,
                Medicaid, and hundreds more programs.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Coverage Dashboard Section */}
      <section id="coverage" className={styles.sectionAlt}>
        <div className={styles.sectionContent}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionLabel}>Progress</span>
            <h2 className={styles.sectionTitle}>Encoding coverage</h2>
            <p className={styles.sectionSubtitle}>
              Current state of statute encoding across jurisdictions.
            </p>
          </div>

          <div className={styles.rlvrGrid}>
            <div className={styles.rlvrCard}>
              <div className={styles.rlvrCardIcon}>
                <TargetIcon className={styles.iconMedium} />
              </div>
              <h3>Federal (rac-us)</h3>
              <p>
                74 .rac files • EITC • CTC • ACA PTC • standard deduction • SNAP • education credits
              </p>
            </div>

            <div className={styles.rlvrCard}>
              <div className={styles.rlvrCardIcon}>
                <CodeIcon className={styles.iconMedium} />
              </div>
              <h3>California (rac-us-ca)</h3>
              <p>
                23 .rac files • RTC §17041 income tax • CalEITC • Young Child Tax Credit • Mental Health surtax
              </p>
            </div>

            <div className={styles.rlvrCard}>
              <div className={styles.rlvrCardIcon}>
                <CpuIcon className={styles.iconMedium} />
              </div>
              <h3>New York (rac-us-ny)</h3>
              <p>
                7 .rac files • Tax Law §601 rates • NY EITC • Empire State Child Credit • NYC income tax
              </p>
            </div>
          </div>

          <div className={styles.autoracFeatures}>
            <div className={styles.autoracFeature}>
              <CheckIcon className={styles.iconSmall} />
              <span>100+ total .rac files across 3 US jurisdictions</span>
            </div>
            <div className={styles.autoracFeature}>
              <CheckIcon className={styles.iconSmall} />
              <span>Canada benefits also encoded (.cosilico format)</span>
            </div>
            <div className={styles.autoracFeature}>
              <CheckIcon className={styles.iconSmall} />
              <span>All encodings validated against external oracles</span>
            </div>
          </div>
        </div>
      </section>

      {/* Experiment Lab Section */}
      <section id="lab" className={styles.section}>
        <div className={styles.sectionContent}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionLabel}>Development</span>
            <h2 className={styles.sectionTitle}>Experiment lab</h2>
            <p className={styles.sectionSubtitle}>
              Live experiment tracking, agent transcripts, and calibration data.
              See what AutoRAC is working on in real time.
            </p>
          </div>

          {/* Lab Components Grid */}
          <div className={styles.labGrid}>
            <a href="/lab" className={styles.labCard} style={{ textDecoration: 'none' }}>
              <div className={styles.labCardIcon}>
                <CpuIcon className={styles.iconMedium} />
              </div>
              <h3>Encoding runs</h3>
              <p>
                Track every statute encoding attempt. See iteration counts,
                oracle match rates, and reviewer verdicts.
              </p>
              <div className={styles.labCardMeta}>
                <span>PASS/FAIL: RAC, Formula, Parameter, Integration</span>
              </div>
            </a>

            <a href="/lab" className={styles.labCard} style={{ textDecoration: 'none' }}>
              <div className={styles.labCardIcon}>
                <CodeIcon className={styles.iconMedium} />
              </div>
              <h3>Agent transcripts</h3>
              <p>
                Full chronological view of agent thinking, tool calls, and outputs.
                See orchestrator reasoning for why each agent was spawned.
              </p>
              <div className={styles.labCardMeta}>
                <span>Timeline view with THINKING, OUTPUT, TOOL events</span>
              </div>
            </a>

            <a href="/lab" className={styles.labCard} style={{ textDecoration: 'none' }}>
              <div className={styles.labCardIcon}>
                <TargetIcon className={styles.iconMedium} />
              </div>
              <h3>SDK sessions</h3>
              <p>
                Mission-level view of encoding campaigns. Token usage,
                cost tracking, and event streams from the Agent SDK.
              </p>
              <div className={styles.labCardMeta}>
                <span>Duration, events, tokens, cost per mission</span>
              </div>
            </a>
          </div>

          {/* CTA to Lab */}
          <div style={{ textAlign: 'center', marginTop: '2rem' }}>
            <a href="/lab" className={styles.btnPrimary}>
              Open experiment lab
              <ArrowRightIcon className={styles.icon} />
            </a>
          </div>
        </div>
      </section>

      {/* Get involved CTA */}
      <section className={styles.ctaSection}>
        <div className={styles.ctaContent}>
          <h2 className={styles.ctaTitle}>Get involved</h2>
          <p className={styles.ctaSubtitle}>
            Rules Foundation builds open infrastructure for AI safety in legal domains.
          </p>

          <div className={styles.ctaActions}>
            <a href="https://github.com/RulesFoundation/rac-us" className={styles.btnPrimary}>
              <CodeIcon className={styles.icon} />
              Encode your jurisdiction
            </a>
            <a href="https://github.com/RulesFoundation/rac/issues" className={styles.btnSecondary}>
              Validate our work
            </a>
            <a href="mailto:hello@rules.foundation" className={styles.btnSecondary}>
              Fund the mission
            </a>
          </div>

          <div className={styles.ctaLinks}>
            <a href="https://github.com/RulesFoundation/rac">
              RAC specification
            </a>
            <a href="https://github.com/RulesFoundation/atlas">
              Atlas archive
            </a>
            <a href="https://github.com/RulesFoundation/autorac">
              AutoRAC encoder
            </a>
            <a href="/about">
              About us
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerLogo}>
            <span className={styles.logoMark}>RULES</span>
            <span className={styles.logoText}>Foundation</span>
          </div>
          <p className={styles.footerText}>
            Open infrastructure for encoded law.
          </p>
          <div className={styles.footerLinks}>
            <a href="/about">About</a>
            <a href="https://github.com/RulesFoundation">GitHub</a>
            <a href="mailto:hello@rules.foundation">Contact</a>
            <a href="/privacy">Privacy</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
