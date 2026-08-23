import { certificateUrl, coverageBurndown, tariffMetadata } from "@/lib/tariff-schedule";

export function TariffStatusBlock() {
  const date = tariffMetadata.builtAt.slice(0, 10);
  const generated = new Date().toISOString().slice(0, 10);
  return (
    <section aria-labelledby="coverage-status" className="border-y border-[var(--color-rule)] py-6">
      <h2 id="coverage-status" className="m-0 font-body text-lg font-medium text-[var(--color-ink)]">Coverage status: incomplete and not certified.</h2>
      <p className="mt-2 mb-4 max-w-[780px] font-body text-sm leading-relaxed text-[var(--color-ink-secondary)]">
        Executable and exercised checks pass; conformance and closure do not. See the {" "}
        <a className="text-[var(--color-accent)] underline" href={certificateUrl} target="_blank" rel="noreferrer">machine-readable certificate</a> and named burndown.
      </p>
      <details>
        <summary className="cursor-pointer font-mono text-xs uppercase tracking-wider text-[var(--color-accent)]">Named burndown</summary>
        <ul className="mt-4 grid gap-3 pl-5 text-sm text-[var(--color-ink-secondary)]">
          {coverageBurndown.map(([family, status, note]) => <li key={family}><strong className="text-[var(--color-ink)]">{family} — {status}.</strong> {note}</li>)}
        </ul>
      </details>
      <p className="mt-5 mb-0 font-mono text-xs leading-relaxed text-[var(--color-ink-muted)]">
        Built from rulespec-us {tariffMetadata.rulespecCommit.slice(0, 10)} (source commit dated {date}); corpus release {tariffMetadata.corpusRelease}; page generated {generated}. Freshness is the source commit date, not a monitoring guarantee.
      </p>
      <p className="mt-2 mb-0 font-mono text-xs leading-relaxed text-[var(--color-ink-muted)]">
        Certificate SHA-256: {tariffMetadata.certificateSha256}
      </p>
    </section>
  );
}
