/**
 * Route-level loading skeleton for the v2 surface. The pages are
 * force-dynamic (multiple corpus queries per render), so without
 * this the browser sits on a blank viewport for the whole fetch —
 * "no obvious loading pattern" was the review feedback.
 */
export default function SectionLoading() {
  const bar = "animate-pulse rounded bg-[var(--color-rule)]/60";
  return (
    <div className="mx-auto w-full max-w-3xl px-4 pt-24 pb-16" aria-busy>
      <div className={`${bar} h-3 w-48`} />
      <div className={`mt-6 ${bar} h-3 w-28`} />
      <div className={`mt-3 ${bar} h-7 w-80`} />
      <div className="mt-8 space-y-3">
        <div className={`${bar} h-4 w-full`} />
        <div className={`${bar} h-4 w-11/12`} />
        <div className={`${bar} h-4 w-full`} />
        <div className={`${bar} h-4 w-3/4`} />
        <div className={`mt-6 ${bar} h-4 w-10/12`} />
        <div className={`${bar} h-4 w-full`} />
        <div className={`${bar} h-4 w-2/3`} />
      </div>
      <p className="mt-10 font-mono text-[11px] uppercase tracking-wider text-[var(--color-ink-muted)]">
        loading…
      </p>
    </div>
  );
}
