import Link from "next/link";

/**
 * The published planning model. Every displayed cell is the published
 * planning value; the numeric constants underneath let tests verify the
 * arithmetic chains reproduce each cell within rounding (published cells
 * round at intermediate steps, so end-to-end recomputation can differ by
 * one unit in the last displayed digit).
 */
export const PLANNING_MODEL = {
  asOf: "2026-07-11",
  // Measured encoder base
  runs: 3_582,
  tokensPerPass: 55_000, // [M] ~55k total tokens per pass
  mix: { fresh: 30_300, cachedRead: 18_700, output: 3_800 }, // [D]/[M]/[M] medians, non-additive
  attemptsPerAccepted: 1.43, // [M]
  firstPassAcceptance: { low: 0.63, high: 0.73 }, // [M]; hard-fail allocation uses the 0.73 bound
  throughputPerDay: { recent: 100, peak: 138 }, // [D]
  systemMultiplier: 3.0, // [D] merged-PR composition proxy
  // Coverage tiers — published cells
  tiers: [
    {
      id: "A",
      name: "A — oracle universe",
      scope:
        "Policies checkable against an independent oracle: the 137 programs currently scored in PolicyEngine-US, 51 income-tax jurisdictions, state benefit manuals",
      modules: 20_000,
      modulesLabel: "~20,000",
      modulesProvenance: "D" as const,
      directTokens: "2.1B",
      systemTokens: "6.4B",
      calendar: "199 → 20 days",
    },
    {
      id: "B",
      name: "B — operative detail",
      scope: "+ SSA POMS, IRS/CMS guidance, deep state manuals",
      modules: 49_000,
      modulesLabel: "~49,000",
      modulesProvenance: "D" as const,
      directTokens: "5.2B",
      systemTokens: "15.7B",
      calendar: "16 → 1.6 months",
    },
    {
      id: "C",
      name: "C — full statutory breadth",
      scope:
        "+ complete revenue/welfare titles × 51 (denominator carries roughly 2× uncertainty)",
      modules: 346_000,
      modulesLabel: "~346,000",
      modulesProvenance: "A" as const,
      directTokens: "37B",
      systemTokens: "111B",
      calendar: "9.5 → 0.95 years",
    },
  ],
  // Claude translation — Anthropic list prices as of 2026-06-24, in $/M tokens
  models: [
    {
      name: "Haiku 4.5",
      prices: { input: 1, output: 5 },
      pricesLabel: "$1/$5",
      standard: "$0.100",
      batch: "$0.050",
      system: "$0.150",
      tierA: "$3.0k",
      tierB: "$7.3k",
      pricePoint: "gpt-5.6-luna (did not qualify in our July bake-off)",
    },
    {
      name: "Sonnet 5, intro to 2026-08-31",
      prices: { input: 2, output: 10 },
      pricesLabel: "$2/$10",
      standard: "$0.200",
      batch: "$0.100",
      system: "$0.300",
      tierA: "$6.0k",
      tierB: "$14.7k",
      pricePoint: "gpt-5.6-terra (current pinned encoder)",
    },
    {
      name: "Sonnet 5, list",
      prices: { input: 3, output: 15 },
      pricesLabel: "$3/$15",
      standard: "$0.300",
      batch: "$0.150",
      system: "$0.451",
      tierA: "$9.0k",
      tierB: "$22.0k",
      pricePoint: "",
    },
    {
      name: "Opus 4.8",
      prices: { input: 5, output: 25 },
      pricesLabel: "$5/$25",
      standard: "$0.501",
      batch: "$0.250",
      system: "$0.751",
      tierA: "$14.9k",
      tierB: "$36.7k",
      pricePoint: "gpt-5.5 (3,289-run workhorse sample)",
    },
    {
      name: "Fable 5",
      prices: { input: 10, output: 50 },
      pricesLabel: "$10/$50",
      standard: "$1.001",
      batch: "$0.501",
      system: "$1.502",
      tierA: "$29.9k",
      tierB: "$73.4k",
      pricePoint: "— (adjudication/judging tier)",
    },
  ],
  // Development-fleet usage — corrected dashboard figures (pipeline audited 2026-07-11)
  devUsage: [
    { window: "Trailing 7 days", claude: 28.6, codex: 19.0, total: 47.6 },
    { window: "Trailing 30 days", claude: 43.8, codex: 37.7, total: 81.5 },
    {
      window: "Lifetime (since 2025-11-30)",
      claude: 64.9,
      codex: 204.2,
      total: 269.1,
    },
  ],
};

type ProvenanceKind = "M" | "D" | "A";

const PROVENANCE_TITLES: Record<ProvenanceKind, string> = {
  M: "Measured — from run records or session logs",
  D: "Derived — arithmetic on measured inputs, method shown",
  A: "Assumed — planning assumption, stated as such",
};

function Provenance({ kind }: { kind: ProvenanceKind }) {
  return (
    <span
      title={PROVENANCE_TITLES[kind]}
      className="font-mono text-[10px] px-1 py-0.5 rounded border border-[var(--color-rule)] bg-[var(--color-rule-subtle)] text-[var(--color-ink-muted)] whitespace-nowrap align-middle"
    >
      [{kind}]
    </span>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h2 className="heading-sub mb-4">{children}</h2>;
}

const thBase =
  "font-medium px-4 py-3 font-mono text-[10px] uppercase tracking-wider";

export function PlanningModelPage() {
  const m = PLANNING_MODEL;
  return (
    <div className="relative z-1 py-32 px-8">
      <div className="max-w-[880px] mx-auto">
        <header className="mb-14">
          <h1 className="heading-page mb-6">Compute planning model</h1>
          <p className="font-body text-xl text-[var(--color-ink-secondary)] leading-relaxed">
            The token economics behind Axiom&apos;s encoding plan, published
            with the provenance discipline we use everywhere: every figure is
            labeled <Provenance kind="M" /> measured, <Provenance kind="D" />{" "}
            derived, or <Provenance kind="A" /> assumed, and the arithmetic is
            shown so anything here can be recomputed. Figures as of{" "}
            <span className="font-mono">{m.asOf}</span>.
          </p>
        </header>

        <section className="mb-14">
          <SectionHeading>The measured base</SectionHeading>
          <p className="font-body text-[1rem] text-[var(--color-ink-secondary)] leading-relaxed mb-4">
            Each rule module is produced by an agentic encoder loop: the agent
            reads the provision from an immutable, cryptographically pinned
            corpus release, writes the module, runs a deterministic gate
            battery (schema, citation resolution, dependency closure, oracle
            conformance where one exists), and iterates. Encoders are chosen
            empirically by production bake-off — gate pass-rates on the live
            task mix, never benchmark reputation. Oracle conformance runs
            against PolicyEngine, TAXSIM, EUROMOD/UKMOD, and the SOUTHMOD
            country models, plus state administrative records (95.3%
            exact-match against Colorado SNAP quality-control determinations{" "}
            <Provenance kind="M" />); cross-family judge models review every
            audit-logged run.
          </p>
          <ul className="font-body text-[1rem] text-[var(--color-ink-secondary)] leading-relaxed space-y-2 list-disc pl-5">
            <li>
              <span className="font-mono">3,582</span> encoder runs in the
              measurement window <Provenance kind="M" />
            </li>
            <li>
              ≈<span className="font-mono">55k</span> total tokens per pass{" "}
              <Provenance kind="M" />, with a billing mix of ≈
              <span className="font-mono">30.3k</span> fresh input{" "}
              <Provenance kind="D" /> / <span className="font-mono">18.7k</span>{" "}
              cached-read / <span className="font-mono">3.8k</span> output{" "}
              <Provenance kind="M" /> — independently computed representative
              medians, deliberately non-additive
            </li>
            <li>
              <span className="font-mono">1.43</span> attempts per accepted
              module <Provenance kind="M" />; 63–73% first-pass gate acceptance{" "}
              <Provenance kind="M" />
            </li>
            <li>
              ~<span className="font-mono">100</span> accepted modules/day over
              the recent active window, <span className="font-mono">138</span>
              /day peak <Provenance kind="D" />
            </li>
            <li>
              Surrounding oracle, judging, and infrastructure work carried as a{" "}
              <span className="font-mono">3.0×</span> system-token planning
              proxy <Provenance kind="D" /> — a derived multiplier from
              merged-PR composition, not a literal token measurement
            </li>
          </ul>
        </section>

        <section className="mb-14">
          <SectionHeading>Coverage tiers and token demand</SectionHeading>
          <p className="font-body text-[1rem] text-[var(--color-ink-secondary)] leading-relaxed mb-4">
            Tiers nest: B includes A, C includes B — token columns are
            cumulative totals to finish that tier, not additive increments.
          </p>
          <div className="overflow-x-auto border border-[var(--color-rule)] rounded-lg mb-4">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="bg-[var(--color-rule-subtle)] text-[var(--color-ink-muted)]">
                <tr>
                  <th className={`${thBase} text-left`}>Coverage tier</th>
                  <th className={`${thBase} text-left`}>Central planning scope</th>
                  <th className={`${thBase} text-right`}>Modules remaining [D]</th>
                  <th className={`${thBase} text-right`}>Direct tokens [D]</th>
                  <th className={`${thBase} text-right`}>System tokens (×3) [D]</th>
                  <th className={`${thBase} text-right`}>Calendar @100–1,000/day [D]</th>
                </tr>
              </thead>
              <tbody>
                {m.tiers.map((tier) => (
                  <tr
                    key={tier.id}
                    className="border-t border-[var(--color-rule)]"
                  >
                    <td className="px-4 py-3 font-medium text-[var(--color-ink)] whitespace-nowrap">
                      {tier.name}
                    </td>
                    <td className="px-4 py-3 text-[var(--color-ink-secondary)]">
                      {tier.scope}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-[var(--color-ink)]">
                      {tier.modulesLabel}
                      {tier.modulesProvenance === "A" ? " [A]" : ""}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-[var(--color-ink)]">
                      {tier.directTokens}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-[var(--color-ink)]">
                      {tier.systemTokens}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-[var(--color-ink)] whitespace-nowrap">
                      {tier.calendar}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="card-edition p-6">
            <p className="font-mono text-xs text-[var(--color-ink-muted)] uppercase tracking-wider mb-3">
              The arithmetic
            </p>
            <pre className="font-mono text-[13px] leading-relaxed text-[var(--color-ink-secondary)] overflow-x-auto whitespace-pre">
              {`effective tokens per module ≈ 55k/pass × 1.43 attempts ÷ 0.73 acceptance ≈ 106–108k   [D]
direct tokens  = modules remaining × ≈106k        (Tier A: 20,000 × ≈106k ≈ 2.1B)
system tokens  = direct × 3.0                     (Tier A: ≈6.4B)
calendar       = modules ÷ throughput per day     (Tier A: 20,000 ÷ 100 ≈ 200 days → ÷ 1,000 ≈ 20 days)`}
            </pre>
          </div>
        </section>

        <section className="mb-14">
          <SectionHeading>
            Cost translation at public list prices
          </SectionHeading>
          <p className="font-body text-[1rem] text-[var(--color-ink-secondary)] leading-relaxed mb-4">
            A constant-token normalization: the measured per-pass billing mix
            priced at Anthropic list prices as of 2026-06-24{" "}
            <Provenance kind="M" />, Batch API at 50% <Provenance kind="M" />,
            cache-read at 0.1× included, cache-write premiums excluded
            (lower-bound reuse case, the same treatment as our OpenAI model){" "}
            <Provenance kind="A" />. Two explicit caveats: token counts are
            carried over unchanged from the OpenAI-measured mix{" "}
            <Provenance kind="A" /> — Anthropic&apos;s current-generation
            tokenizer produces roughly 30% more tokens for identical text, so
            treat every Claude figure as ≈+30% pending a native count; and
            quality on this task mix is unmeasured until a Claude bake-off
            runs <Provenance kind="A" /> — the harness qualifies encoders on
            measured gate pass-rates, never on benchmark reputation.
          </p>
          <div className="overflow-x-auto border border-[var(--color-rule)] rounded-lg mb-4">
            <table className="w-full min-w-[960px] text-sm">
              <thead className="bg-[var(--color-rule-subtle)] text-[var(--color-ink-muted)]">
                <tr>
                  <th className={`${thBase} text-left`}>Model</th>
                  <th className={`${thBase} text-right`}>$/module (standard) [D]</th>
                  <th className={`${thBase} text-right`}>$/module (Batch) [D]</th>
                  <th className={`${thBase} text-right`}>System $/module (Batch, ×3) [D]</th>
                  <th className={`${thBase} text-right`}>Tier A generation [D]</th>
                  <th className={`${thBase} text-right`}>Tier B (cumulative) [D]</th>
                  <th className={`${thBase} text-left`}>Closest OpenAI price point (not capability-equivalent)</th>
                </tr>
              </thead>
              <tbody>
                {m.models.map((model) => (
                  <tr
                    key={model.name}
                    className="border-t border-[var(--color-rule)]"
                  >
                    <td className="px-4 py-3 font-medium text-[var(--color-ink)] whitespace-nowrap">
                      {model.name}{" "}
                      <span className="font-mono text-[var(--color-ink-muted)]">
                        ({model.pricesLabel})
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-[var(--color-ink)]">
                      {model.standard}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-[var(--color-ink)]">
                      {model.batch}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-[var(--color-ink)]">
                      {model.system}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-[var(--color-ink)]">
                      {model.tierA}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-[var(--color-ink)]">
                      {model.tierB}
                    </td>
                    <td className="px-4 py-3 text-[var(--color-ink-secondary)]">
                      {model.pricePoint}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="card-edition p-6">
            <p className="font-mono text-xs text-[var(--color-ink-muted)] uppercase tracking-wider mb-3">
              The arithmetic
            </p>
            <pre className="font-mono text-[13px] leading-relaxed text-[var(--color-ink-secondary)] overflow-x-auto whitespace-pre">
              {`$/module (standard) = (30.3k × input + 18.7k × 0.1 × input + 3.8k × output) ÷ 1M × 1.43 ÷ 0.73
  e.g. Opus 4.8:      (30.3k × $5 + 18.7k × $0.5 + 3.8k × $25) ÷ 1M ≈ $0.256/pass → ≈ $0.501/module
$/module (Batch)    = standard × 0.5
system $/module     = Batch × 3.0
tier generation     = system $/module × modules remaining   (Opus 4.8, Tier A: $0.751 × 20,000 ≈ $14.9k)`}
            </pre>
            <p className="font-body text-sm text-[var(--color-ink-muted)] leading-relaxed mt-3">
              Cells are the published planning values; published cells round at
              intermediate steps, so recomputing a chain end-to-end reproduces
              each cell within one unit of its last displayed digit.
            </p>
          </div>
        </section>

        <section className="mb-14">
          <SectionHeading>
            The development fleet is a separate, larger demand line
          </SectionHeading>
          <p className="font-body text-[1rem] text-[var(--color-ink-secondary)] leading-relaxed mb-4">
            Beyond generation, the platform — encoder harness, rules engines,
            ingest adapters, CI, dashboards — is built by agent fleets. Two
            independent measurements: a{" "}
            <a
              href="https://www.maxghenis.com/usage"
              target="_blank"
              rel="noopener noreferrer"
            >
              public live dashboard
            </a>{" "}
            (raw per-model token counts at standard-tier public API list
            prices — no vendor discounts; cache reads and cache writes at
            their own rates), and an independent local recount over the raw
            session logs; both count cache-creation. The dashboard pipeline
            was audited and rebuilt on 2026-07-11 — per-event dating, global
            message dedup, session-resume replays excluded, repriced from
            pinned list-price tables — with the audit trail public in the
            dashboard&apos;s data repository <Provenance kind="M" />. The two
            methods agree within about 10% on every complete month and about
            4% on the lifetime total; where they differ on recent months, the
            dashboard is the lower number, so the table below is the
            conservative line <Provenance kind="M" />. These figures cover the
            operator&apos;s full multi-project workload — Axiom is the
            dominant share this summer but is not isolated here, so treat them
            as a verified operator-wide upper bound <Provenance kind="M" />.
            Actual cash cost today is borne on flat-rate developer
            subscriptions.
          </p>
          <div className="overflow-x-auto border border-[var(--color-rule)] rounded-lg mb-4">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-[var(--color-rule-subtle)] text-[var(--color-ink-muted)]">
                <tr>
                  <th className={`${thBase} text-left`}>Window (as of {m.asOf}) [M]</th>
                  <th className={`${thBase} text-right`}>Claude-family</th>
                  <th className={`${thBase} text-right`}>codex/OpenAI</th>
                  <th className={`${thBase} text-right`}>Total API-equivalent</th>
                </tr>
              </thead>
              <tbody>
                {m.devUsage.map((row) => (
                  <tr
                    key={row.window}
                    className="border-t border-[var(--color-rule)]"
                  >
                    <td className="px-4 py-3 font-medium text-[var(--color-ink)]">
                      {row.window}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-[var(--color-ink)]">
                      ${row.claude.toFixed(1)}k
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-[var(--color-ink)]">
                      ${row.codex.toFixed(1)}k
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-[var(--color-ink)]">
                      ${row.total.toFixed(1)}k
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="font-body text-[1rem] text-[var(--color-ink-secondary)] leading-relaxed">
            The sustained pace is roughly $80k/month (the trailing-30-day
            line) <Provenance kind="D" />, with July to date annualizing at
            about twice that <Provenance kind="D" />; the complete months
            before it were $95.9k (May) and $66.2k (June){" "}
            <Provenance kind="M" />. The Claude-family line — now the larger
            of the two — is cache-read dominated: 27.6B cache-read versus
            0.05B fresh input tokens in July, plus 1.0B of cache writes{" "}
            <Provenance kind="M" />. Prompt-caching economics, not list input
            price, drive this line. This is one operator plus agent fleets;
            scaling with team size is expected to be roughly linear{" "}
            <Provenance kind="A" />.
          </p>
        </section>

        <section className="mb-14">
          <SectionHeading>Where marginal compute plugs in</SectionHeading>
          <p className="font-body text-[1rem] text-[var(--color-ink-secondary)] leading-relaxed mb-4">
            Everything above is the demand side. Marginal capacity — metered
            credits or negotiated throughput, from any vendor whose model
            clears the bake-off — converts into published, verifiable output
            in four places. Quantities reference the tables above; they are
            worked in Claude units to match the translation and price
            identically in any vendor&apos;s units.
          </p>
          <ol className="font-body text-[1rem] text-[var(--color-ink-secondary)] leading-relaxed space-y-4 list-decimal pl-5">
            <li>
              <strong className="text-[var(--color-ink)]">
                Generation waves — finish Tier A, then Tier B.
              </strong>{" "}
              ≈6.4B system-proxy tokens completes Tier A; ≈15.7B cumulative
              completes Tier B <Provenance kind="D" />. The loop fits
              Batch-class queued single-shot waves — each pass is an
              independent request, so encoder iterations run as staged waves{" "}
              <Provenance kind="A" /> — with interactive repair at standard
              tier. At the table&apos;s Batch rates, Tier A generation is
              $3.0–29.9k depending on model tier <Provenance kind="D" />; the
              budget is the small term. Merge and verification throughput
              governs the calendar, assumed to ramp from ~100 toward ~200+
              modules/day as pipeline hardening lands <Provenance kind="A" />.
            </li>
            <li>
              <strong className="text-[var(--color-ink)]">
                Encoder qualification — the standing quarterly bake-off.
              </strong>{" "}
              Any candidate model qualifies on the live production mix:
              grounding-failure rate, cost per accepted module, and
              wall-clock, in about a week of drain time <Provenance kind="D" />
              . Results are publishable either way. This is the empirical gate
              between the price table above and production use.
            </li>
            <li>
              <strong className="text-[var(--color-ink)]">
                Cross-family judging.
              </strong>{" "}
              Every audit-logged encoder run is adjudicated by a model family
              different from the one that generated it. Judging is
              adjudication-dense — the slot where frontier capability binds
              hardest — and is carried inside the 3.0× system proxy{" "}
              <Provenance kind="D" />.
            </li>
            <li>
              <strong className="text-[var(--color-ink)]">
                The development fleet.
              </strong>{" "}
              The separate line above — roughly $80k/month sustained at
              list-price equivalent, an operator-wide upper bound{" "}
              <Provenance kind="D" /> — builds the ingest, verification, and
              merge-train infrastructure that is the actual budget driver. It
              runs on flat-rate developer subscriptions today and is expected
              to scale roughly linearly with team size <Provenance kind="A" />.
            </li>
          </ol>
        </section>

        <section className="mb-14">
          <SectionHeading>Method and provenance</SectionHeading>
          <p className="font-body text-[1rem] text-[var(--color-ink-secondary)] leading-relaxed">
            Measured figures come from encoder run records and session logs as
            of {m.asOf}. Claude figures are constant-token normalizations
            pending a native tokenizer count (≈+30%). Development-usage
            figures are operator-wide, not project-attributed. Nothing here is
            a commitment; the model exists so capacity conversations can start
            from measured demand rather than a guess. Corrections are welcome
            —{" "}
            <a
              href="https://github.com/TheAxiomFoundation/axiom-foundation.org/issues"
              target="_blank"
              rel="noopener noreferrer"
            >
              file an issue
            </a>
            . Related: <Link href="/ops">operations dashboard</Link>.
          </p>
        </section>
      </div>
    </div>
  );
}
