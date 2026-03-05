export default function PrivacyPage() {
  return (
    <div className="relative z-1 py-32 px-8">
      <div className="max-w-[800px] mx-auto">
        <header className="text-center mb-16">
          <h1 className="heading-page text-[var(--color-text)] mb-4">
            Privacy policy
          </h1>
          <p className="font-[family-name:var(--f-mono)] text-sm text-[var(--color-text-muted)]">
            Last updated: February 2026
          </p>
        </header>

        <div className="flex flex-col gap-12">
          <section>
            <h2 className="heading-sub text-[var(--color-text)] mb-4">
              Information we collect
            </h2>
            <p className="font-[family-name:var(--f-body)] text-[1rem] text-[var(--color-text-secondary)] leading-relaxed">
              We collect minimal data. Our website uses Vercel Analytics for anonymous usage statistics.
            </p>
          </section>

          <section>
            <h2 className="heading-sub text-[var(--color-text)] mb-4">
              How we use information
            </h2>
            <p className="font-[family-name:var(--f-body)] text-[1rem] text-[var(--color-text-secondary)] leading-relaxed">
              To improve our tools and understand how they&apos;re used.
            </p>
          </section>

          <section>
            <h2 className="heading-sub text-[var(--color-text)] mb-4">
              Third-party services
            </h2>
            <p className="font-[family-name:var(--f-body)] text-[1rem] text-[var(--color-text-secondary)] leading-relaxed">
              Vercel (hosting), GitHub (code hosting), Supabase (database for experiment tracking)
            </p>
          </section>

          <section>
            <h2 className="heading-sub text-[var(--color-text)] mb-4">
              Open source
            </h2>
            <p className="font-[family-name:var(--f-body)] text-[1rem] text-[var(--color-text-secondary)] leading-relaxed">
              All our code is open source at{" "}
              <a
                href="https://github.com/RuleAtlas"
                target="_blank"
                rel="noopener noreferrer"
              >
                github.com/RuleAtlas
              </a>
            </p>
          </section>

          <section>
            <h2 className="heading-sub text-[var(--color-text)] mb-4">
              Contact
            </h2>
            <p className="font-[family-name:var(--f-body)] text-[1rem] text-[var(--color-text-secondary)] leading-relaxed">
              For privacy questions, email{" "}
              <a href="mailto:hello@ruleatlas.org">
                hello@ruleatlas.org
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
