/**
 * Reading-column skeleton shown while the section's heavy data
 * (encodings, coverage, graphs) streams in. Rendered as an in-page
 * Suspense fallback — deliberately not a route-level loading.tsx,
 * which would commit an HTTP 200 before notFound() can produce a
 * real 404 for missing paths.
 */
export function SectionSkeleton() {
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
