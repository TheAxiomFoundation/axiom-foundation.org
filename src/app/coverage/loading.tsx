/**
 * Instant feedback for client navigations to /coverage: the live
 * corpus queries behind the page can take seconds on a cold render,
 * and without this the click feels dead. Mirrors the page skeleton:
 * kicker/title bars, three stacked plane placeholders, a card grid.
 * (Safe here, unlike the reader routes: /coverage never 404s, so
 * committing the response early costs nothing.)
 */
export default function CoverageLoading() {
  const bar = "animate-pulse rounded bg-[var(--color-rule)]/70";
  return (
    <div className="relative z-1 pt-32 pb-24 px-8" aria-busy>
      <div className="max-w-[1080px] mx-auto">
        <div className={`${bar} h-3 w-56`} />
        <div className={`mt-7 ${bar} h-9 w-[420px] max-w-full`} />
        <div className="mt-6 space-y-3 max-w-[720px]">
          <div className={`${bar} h-4 w-full`} />
          <div className={`${bar} h-4 w-5/6`} />
        </div>
        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          <div className="hidden md:flex flex-col items-center gap-4">
            <div className={`${bar} h-24 w-64 rounded-2xl`} />
            <div className={`${bar} h-24 w-64 rounded-2xl`} />
            <div className={`${bar} h-24 w-64 rounded-2xl opacity-80`} />
          </div>
          <div className="space-y-6">
            {[0, 1, 2].map((i) => (
              <div key={i} className="space-y-2">
                <div className={`${bar} h-3 w-36`} />
                <div className={`${bar} h-7 w-28`} />
                <div className={`${bar} h-3 w-64 max-w-full`} />
              </div>
            ))}
          </div>
        </div>
        <div className="mt-20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className={`${bar} h-40 rounded-lg`} />
          ))}
        </div>
        <p className="mt-10 font-mono text-[11px] uppercase tracking-wider text-[var(--color-ink-muted)]">
          counting the corpus…
        </p>
      </div>
    </div>
  );
}
