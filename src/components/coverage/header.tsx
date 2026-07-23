/**
 * The /coverage header, shared by the page and its loading state so
 * the streamed handoff never jumps: kicker, title, one lede
 * sentence, and the live status line — the page's credibility is
 * that nothing on it is hand-maintained.
 */
export function CoverageHeader() {
  return (
    <>
      <span className="kicker mb-6 inline-flex">
        <span className="kicker-mark">&sect;</span>
        Coverage &middot; Depth &amp; breadth
      </span>
      <h1 className="heading-page mb-5 mt-2" suppressHydrationWarning>
        The whole stack, counted
      </h1>
      <p className="max-w-[680px] font-body text-[1.15rem] text-[var(--color-ink-secondary)] leading-relaxed text-pretty">
        A running census of everything Axiom holds — from source law to
        the machine-executable rules built on it.
      </p>
    </>
  );
}
