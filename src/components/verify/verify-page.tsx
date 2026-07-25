import Link from "next/link";
import {
  ladder,
  openIssues,
  oracleRows,
  surfaces,
  tierLabel,
  tierNote,
  type Tier,
} from "@/lib/verify-data";

const tierOrder: Tier[] = ["verified", "preview", "demo", "blocked"];

function TierChip({ tier }: { tier: Tier }) {
  const blocked = tier === "blocked";
  return (
    <span
      className={[
        "inline-block font-mono text-[0.68rem] uppercase tracking-[0.14em] px-2 py-1 rounded-sm border whitespace-nowrap",
        blocked
          ? "border-[var(--color-accent)] text-[var(--color-accent)]"
          : "border-[var(--color-rule)] text-[var(--color-ink-secondary)]",
      ].join(" ")}
    >
      {tierLabel[tier]}
    </span>
  );
}

/** Commands are shown as plain preformatted text — nothing on this page needs
 *  JavaScript to be true, and a page about checking things should not ask you
 *  to run ours first. */
function Command({ children }: { children: string }) {
  return (
    <pre className="font-mono text-[0.8rem] leading-6 text-[var(--color-code-text)] bg-[var(--color-code-bg)] border border-[var(--color-rule)] rounded-md p-4 overflow-x-auto">
      {children}
    </pre>
  );
}

export function VerifyPage() {
  return (
    <div className="relative z-1 py-32 px-8">
      <div className="max-w-[1080px] mx-auto">
        <header className="mb-20 max-w-[820px]">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--color-accent)] mb-4">
            Verification
          </p>
          <h1 className="heading-page mb-6">Don&rsquo;t trust it. Check it.</h1>
          <p className="font-body text-xl text-[var(--color-ink-secondary)] leading-relaxed mb-6">
            Every claim on this site carries a label, and the label is a
            statement about evidence rather than about confidence. This page
            lists what each label means, the command that tests it, and what
            the test does not cover.
          </p>
          <p className="font-serif italic text-lg text-[var(--color-ink)] leading-relaxed">
            A claim we cannot check is a claim we do not make.
          </p>
        </header>

        <section className="mb-24">
          <h2 className="heading-section mb-3">What the labels mean</h2>
          <p className="font-body text-[1rem] text-[var(--color-ink-secondary)] max-w-[780px] leading-relaxed mb-8">
            The same standard we apply to encoded law, applied to our own
            surfaces. A label is not a measure of how much work went into
            something.
          </p>
          <dl className="grid gap-4 md:grid-cols-2">
            {tierOrder.map((tier) => (
              <div
                key={tier}
                className="rounded-md border border-[var(--color-rule)] bg-[var(--color-paper-elevated)] p-6"
              >
                <dt className="mb-3">
                  <TierChip tier={tier} />
                </dt>
                <dd className="font-body text-[0.95rem] text-[var(--color-ink-secondary)] leading-relaxed">
                  {tierNote[tier]}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="mb-24" id="check">
          <h2 className="heading-section mb-3">Check it yourself</h2>
          <p className="font-body text-[1rem] text-[var(--color-ink-secondary)] max-w-[780px] leading-relaxed mb-10">
            None of these require an account, an API key, or anything from us
            beyond a public download.
          </p>

          <div className="space-y-6">
            {surfaces.map((s) => (
              <article
                key={s.id}
                className="rounded-md border border-[var(--color-rule)] bg-[var(--color-paper-elevated)] p-8"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-4 mb-4">
                  <h3 className="font-body text-2xl text-[var(--color-ink)]">
                    {s.name}
                  </h3>
                  <TierChip tier={s.tier} />
                </div>

                <p className="font-body text-[1rem] text-[var(--color-ink)] leading-relaxed mb-5">
                  {s.claim}
                </p>

                <Command>{s.check}</Command>

                <div className="grid gap-6 md:grid-cols-2 mt-5">
                  <div>
                    <p className="font-mono text-[0.68rem] uppercase tracking-[0.14em] text-[var(--color-accent)] mb-2">
                      What you should see
                    </p>
                    <p className="font-body text-[0.9rem] text-[var(--color-ink-secondary)] leading-relaxed">
                      {s.expect}
                    </p>
                  </div>
                  <div>
                    <p className="font-mono text-[0.68rem] uppercase tracking-[0.14em] text-[var(--color-ink-muted)] mb-2">
                      What this does not show
                    </p>
                    <p className="font-body text-[0.9rem] text-[var(--color-ink-secondary)] leading-relaxed">
                      {s.limit}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mb-24">
          <h2 className="heading-section mb-3">Checked against other calculators</h2>
          <p className="font-body text-[1rem] text-[var(--color-ink-secondary)] max-w-[780px] leading-relaxed mb-8">
            Counts rather than rates, because a rate hides how many cases were
            tried. Rows where we disagree stay on the page.
          </p>
          <div className="overflow-x-auto rounded-md border border-[var(--color-rule)]">
            <table className="w-full border-collapse min-w-[640px]">
              <thead>
                <tr className="bg-[var(--color-paper-elevated)]">
                  {["Program", "Checked against", "Agreement", "What it means"].map(
                    (h) => (
                      <th
                        key={h}
                        className="text-left font-mono text-[0.68rem] uppercase tracking-[0.14em] text-[var(--color-ink-muted)] px-5 py-4 border-b border-[var(--color-rule)]"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {oracleRows.map((r, i) => (
                  <tr
                    key={`${r.program}-${r.oracle}`}
                    className={
                      i < oracleRows.length - 1
                        ? "border-b border-[var(--color-rule-subtle)]"
                        : undefined
                    }
                  >
                    <td className="px-5 py-4 font-body text-[0.9rem] text-[var(--color-ink)] align-top">
                      {r.program}
                    </td>
                    <td className="px-5 py-4 font-body text-[0.9rem] text-[var(--color-ink-secondary)] align-top">
                      {r.oracle}
                    </td>
                    <td className="px-5 py-4 font-mono text-[0.9rem] text-[var(--color-ink)] align-top whitespace-nowrap">
                      {r.agree}
                    </td>
                    <td className="px-5 py-4 font-body text-[0.85rem] text-[var(--color-ink-secondary)] align-top leading-relaxed">
                      {r.note}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mb-24">
          <h2 className="heading-section mb-3">What is broken right now</h2>
          <p className="font-body text-[1rem] text-[var(--color-ink-secondary)] max-w-[780px] leading-relaxed mb-10">
            Findings from our own checks, with the errors they produce. These
            leave the page when the check passes, not when the wording
            improves.
          </p>

          <div className="space-y-6">
            {openIssues.map((issue) => (
              <article
                key={issue.id}
                className="rounded-md border border-[var(--color-accent)] bg-[var(--color-paper-elevated)] p-8"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-4 mb-4">
                  <h3 className="font-body text-xl text-[var(--color-ink)]">
                    {issue.title}
                  </h3>
                  <span className="font-mono text-[0.68rem] uppercase tracking-[0.14em] text-[var(--color-accent)] whitespace-nowrap">
                    {issue.status}
                  </span>
                </div>

                <p className="font-body text-[0.95rem] text-[var(--color-ink-secondary)] leading-relaxed mb-5">
                  {issue.detail}
                </p>

                {issue.evidence ? <Command>{issue.evidence}</Command> : null}

                <div className="mt-5">
                  <p className="font-mono text-[0.68rem] uppercase tracking-[0.14em] text-[var(--color-ink-muted)] mb-2">
                    Fix
                  </p>
                  <p className="font-body text-[0.9rem] text-[var(--color-ink-secondary)] leading-relaxed">
                    {issue.fix}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section>
          <h2 className="heading-section mb-3">How far you want to go</h2>
          <div className="grid gap-4 md:grid-cols-3 mt-8">
            {ladder.map((rung) => (
              <div
                key={rung.depth}
                className="rounded-md border border-[var(--color-rule)] bg-[var(--color-paper-elevated)] p-6 flex flex-col"
              >
                <p className="font-mono text-[0.68rem] uppercase tracking-[0.14em] text-[var(--color-accent)] mb-3">
                  {rung.depth}
                </p>
                <p className="font-body text-[0.95rem] text-[var(--color-ink-secondary)] leading-relaxed mb-5 flex-1">
                  {rung.what}
                </p>
                {rung.href.startsWith("http") ? (
                  <a href={rung.href} className="btn-outline self-start">
                    {rung.label}
                  </a>
                ) : (
                  <Link href={rung.href} className="btn-outline self-start">
                    {rung.label}
                  </Link>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
