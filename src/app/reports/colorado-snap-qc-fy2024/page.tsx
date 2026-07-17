import type { Metadata } from "next";
import { SITE_URL } from "@/lib/urls";

export const metadata: Metadata = {
  title: "Colorado SNAP and the FY 2024 Quality Control data - Axiom Foundation",
  description:
    "Encoded SNAP rules validated against all 856 Colorado FY 2024 Quality Control cases, and what the error cases show about where payment-error dollars come from.",
  alternates: {
    canonical: `${SITE_URL}/reports/colorado-snap-qc-fy2024`,
  },
};

function StatRow({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-6 py-3 border-b border-[var(--color-rule)]">
      <div className="font-body text-sm text-[var(--color-ink-secondary)]">
        {label}
        {note ? (
          <span className="block text-xs text-[var(--color-ink-muted)]">
            {note}
          </span>
        ) : null}
      </div>
      <div className="font-mono text-base text-[var(--color-ink)] whitespace-nowrap">
        {value}
      </div>
    </div>
  );
}

export default function ColoradoSnapQcReport() {
  return (
    <div className="relative z-1 py-32 px-8">
      <div className="max-w-[800px] mx-auto">
        <header className="mb-16">
          <p className="font-body text-xs tracking-[0.14em] uppercase text-[var(--color-ink-muted)] mb-4">
            Report · July 2026
          </p>
          <h1 className="heading-page mb-6">
            Colorado SNAP and the FY 2024 Quality Control data
          </h1>
          <p className="font-body text-xl text-[var(--color-ink-secondary)] leading-relaxed">
            We validated open, encoded SNAP rules against all 856 Colorado
            cases in USDA&apos;s FY 2024 Quality Control file — the federal
            government&apos;s own recomputation of each household&apos;s
            correct benefit — and reproduced the federal computation exactly,
            case by case and stage by stage. The same harness then decomposes
            where Colorado&apos;s payment-error dollars come from, including
            the classes that better software eliminates outright.
          </p>
        </header>

        <section className="mb-16">
          <h2 className="heading-sub mb-4">Why the error rate is now a budget line</h2>
          <p className="font-body text-[1rem] text-[var(--color-ink-secondary)] leading-relaxed mb-6">
            Under 7 U.S.C. 2013(a)(2), as amended in 2025, states begin paying
            a share of SNAP benefit costs in fiscal year 2028, set by their
            payment error rate: 0% below a 6% error rate, 5% from 6 to 8, 10%
            from 8 to 10, and 15% at or above 10. The fiscal year 2028 share is
            keyed to the state&apos;s FY 2025 or FY 2026 error rate — the
            period being measured now.
          </p>
          <div className="card-edition p-6">
            <StatRow
              label="Colorado official FY 2024 payment error rate"
              note="7.91 over-payments + 2.06 under-payments (USDA FNS)"
              value="9.97%"
            />
            <StatRow
              label="Distance to the 15% cost-share tier"
              value="0.03 points"
            />
            <StatRow
              label="Approximate value of one tier to Colorado"
              note="5% of ≈$1.27B FY 2024 issuance (QC-file weighted)"
              value="≈$63M / year"
            />
            <StatRow
              label="National official FY 2024 payment error rate"
              value="10.93%"
            />
          </div>
        </section>

        <section className="mb-16">
          <h2 className="heading-sub mb-4">
            First, the credibility check: reproducing the federal computation
          </h2>
          <p className="font-body text-[1rem] text-[var(--color-ink-secondary)] leading-relaxed mb-4">
            The Quality Control file is a stratified sample of real, reviewed
            SNAP cases; for each one it carries the inputs a federal reviewer
            verified and FNS&apos;s own recomputation of the correct benefit.
            We replayed every Colorado FY 2024 case through our encoded rules
            and compared the result to the federal computation at every stage
            — gross income, each deduction, net income, maximum allotment,
            benefit.
          </p>
          <p className="font-body text-[1rem] text-[var(--color-ink-secondary)] leading-relaxed">
            The result: <strong className="text-[var(--color-ink)]">856 of
            856 cases exact — every case, every stage, at zero
            tolerance</strong>. Two of the details exact agreement required
            illustrate why validating against administrative records
            matters. The regulation&apos;s printed text still carries a $143
            maximum for the homeless shelter deduction; statute indexes it
            annually, and the operative FY 2024 value — $179.66 — appears
            only in USDA&apos;s annual cost-of-living memorandum. And the
            federal computation rounds to whole dollars at specific steps,
            so a computation that carries cents lands a dollar off. Printed
            text and operative rules drift apart in exactly these ways;
            catching that drift is what this infrastructure is for. Every
            run, comparison, and correction is public and reproducible.
          </p>
        </section>

        <section className="mb-16">
          <h2 className="heading-sub mb-4">
            Where Colorado&apos;s error dollars come from
          </h2>
          <p className="font-body text-[1rem] text-[var(--color-ink-secondary)] leading-relaxed mb-4">
            Colorado&apos;s 305 sampled error cases carry $112.6M per year in
            weighted error dollars. Each error finding carries the
            reviewer&apos;s cause code, which separates client-side information
            problems from agency-side ones — and, within the agency side,
            software causes from worker causes:
          </p>
          <div className="card-edition p-6 mb-2">
            <StatRow
              label="Client-side information"
              note="unreported, incomplete, or changed information (codes 1–8)"
              value="$58.3M / yr (51.8%)"
            />
            <StatRow
              label="Agency process"
              note="verification and follow-up not completed (codes 12–16, 23–25)"
              value="$49.4M / yr (43.9%)"
            />
            <StatRow
              label="Data entry and keying"
              note="cause code 18"
              value="$18.5M / yr (16.4%)"
            />
            <StatRow
              label="System software"
              note="programming errors + computer-generated mass changes (codes 17, 19)"
              value="$7.0M / yr (6.2%)"
            />
            <StatRow
              label="Policy misapplied or amount mis-budgeted"
              note="codes 10, 22 — worker or system"
              value="$3.7M / yr (3.3%)"
            />
            <StatRow
              label="Worker computation"
              note="arithmetic and system-use errors (codes 20, 21)"
              value="$1.2M / yr (1.1%)"
            />
          </div>
          <p className="font-body text-xs text-[var(--color-ink-muted)] leading-relaxed mb-6">
            Case-attributed: an error case counts toward every class its
            findings carry, so shares overlap and exceed 100% in total.
          </p>
          <p className="font-body text-[1rem] text-[var(--color-ink-secondary)] leading-relaxed mb-4">
            The replay adds a distinction the cause codes alone cannot make.
            Using the reviewers&apos; error findings, we reconstructed each
            error case&apos;s original, pre-correction values (building on
            published work by Eric Giannella and Ben Molin) and ran those
            through the verified rules. Of the software-attributed cases, most
            turn out to be automation feeding itself a wrong input — a
            cost-of-living mass change writing the wrong Social Security
            amount, an interface budgeting the wrong child support — and then
            computing correctly on it. A smaller set is computation logic
            itself: cases where no input value, under correct rules, reproduces
            what the system issued.
          </p>
          <p className="font-body text-[1rem] text-[var(--color-ink-secondary)] leading-relaxed">
            Across all cause codes, ten Colorado cases are in that strictest
            class: on the facts the agency itself recorded, the verified rules
            return the reviewer-certified correct benefit, and the issued
            benefit differed — initial-month proration, wrong utility
            standards, a child-support deduction computed incorrectly, a
            homeless shelter deduction omitted. Together, the computation and
            policy-application classes are on the order of one percentage
            point of Colorado&apos;s error rate — twice the margin between its
            FY 2024 rate and the 15% tier boundary, and half the distance to
            the 8% boundary below.
          </p>
        </section>

        <section className="mb-16">
          <h2 className="heading-sub mb-4">What each class responds to</h2>
          <p className="font-body text-[1rem] text-[var(--color-ink-secondary)] leading-relaxed">
            The decomposition matters because each class has a different fix.
            Computation and policy-application errors are eliminated by
            verified rules logic — rules encoded once, validated against the
            federal answer key, and executed the same way every time.
            Automation-fed input errors are eliminated by verified
            integrations. Data-entry errors respond to validation at the point
            of entry. Client-side information errors — the majority everywhere
            — are the domain of verification practice and reporting design,
            not software. A state that knows which share is which can direct
            effort where a point of error rate is actually recoverable.
          </p>
        </section>

        <section className="mb-16">
          <h2 className="heading-sub mb-4">Method notes and caveats</h2>
          <ul className="font-body text-sm text-[var(--color-ink-secondary)] leading-relaxed list-disc pl-5 space-y-2">
            <li>
              Data: USDA FNS SNAP Quality Control public-use file, FY 2024
              (44,891 cases; 856 in Colorado), with its technical
              documentation; official error rates from FNS&apos;s FY 2024
              payment error rate table. All dollar figures are weighted by the
              file&apos;s sample weights and annualized.
            </li>
            <li>
              The QC sample is designed for national and regional estimates;
              within-state tabulations carry wider uncertainty, and the
              official state rate uses a regression adjustment. Shares are
              more robust than dollar levels here.
            </li>
            <li>
              Cause codes are assigned by state reviewers and mix software and
              worker action in some categories; the engine replay is an
              independent check on them, not a replacement.
            </li>
            <li>
              The replay validates the benefit computation. Original-value
              reconstruction follows Giannella &amp; Molin&apos;s published
              method (their solver and our engine partition the replayable
              error cases identically); comparisons use the file&apos;s own
              $5 consistency tolerance.
            </li>
            <li>
              Scope: one state, one program, one fiscal year, benefit
              computation only. The encodings, the comparison harness, and
              the full validation history are public:{" "}
              <a
                href="https://github.com/TheAxiomFoundation/rulespec-us"
                target="_blank"
                rel="noopener noreferrer"
              >
                rulespec-us
              </a>
              ,{" "}
              <a
                href="https://github.com/TheAxiomFoundation/axiom-oracles"
                target="_blank"
                rel="noopener noreferrer"
              >
                axiom-oracles
              </a>
              .
            </li>
          </ul>
        </section>

        <section className="mb-8">
          <div className="card-edition p-6">
            <p className="font-body text-[1rem] text-[var(--color-ink)] leading-relaxed mb-2">
              Every artifact behind this report is open and reproducible.
            </p>
            <p className="font-body text-sm text-[var(--color-ink-secondary)] leading-relaxed">
              Questions, or interested in running this for your state or
              program:{" "}
              <a href="mailto:hello@axiom.org">
                hello@axiom.org
              </a>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
