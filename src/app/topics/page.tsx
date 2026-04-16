import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Topics — Axiom Foundation",
  description:
    "Curated entry points into Atlas for specific legal areas. Each topic groups federal statute, federal regulations, and state sources.",
};

type TopicCard = {
  slug: string;
  label: string;
  subtitle: string;
  href: string;
};

const TOPICS: TopicCard[] = [
  {
    slug: "snap",
    label: "SNAP",
    subtitle:
      "Food and Nutrition Act (7 USC Ch 51) and SNAP regulations (7 CFR 271–283)",
    href: "/topics/snap",
  },
];

export default function TopicsIndexPage() {
  return (
    <div className="relative z-1 pt-24 pb-16 px-8">
      <div className="max-w-[1100px] mx-auto">
        <nav
          aria-label="Breadcrumb"
          className="font-mono text-sm text-[var(--color-ink-muted)] mb-6"
        >
          <Link href="/" className="hover:text-[var(--color-accent)]">
            Axiom
          </Link>
          <span className="mx-2">/</span>
          <span className="text-[var(--color-ink)]">Topics</span>
        </nav>

        <header className="mb-14">
          <h1 className="heading-page mb-4">Topics</h1>
          <p className="font-body text-xl text-[var(--color-ink-secondary)] leading-relaxed max-w-[780px]">
            Topics are curated entry points into Atlas for a specific legal
            area. Each one groups the federal statute, federal regulations, and
            state sources that together define the program, so you can jump
            straight from the law to the encoded rules.
          </p>
        </header>

        <div
          className="grid gap-4"
          style={{
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          }}
        >
          {TOPICS.map((topic) => (
            <Link
              key={topic.slug}
              href={topic.href}
              className="block p-6 bg-[var(--color-paper-elevated)] border border-[var(--color-rule)] rounded-md cursor-pointer hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-light)] transition-colors"
            >
              <div className="text-base font-display text-[var(--color-ink)]">
                {topic.label}
              </div>
              <div className="mt-2 text-sm text-[var(--color-ink-secondary)] leading-snug">
                {topic.subtitle}
              </div>
            </Link>
          ))}
        </div>

        <section className="mt-16 pt-8 border-t border-[var(--color-rule)]">
          <p className="font-body text-sm text-[var(--color-ink-secondary)] leading-relaxed max-w-[780px]">
            More topics coming — request one by opening an issue on{" "}
            <a
              href="https://github.com/TheAxiomFoundation/axiom-foundation.org/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--color-accent)] hover:underline"
            >
              GitHub
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
