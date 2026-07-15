import type { Metadata } from "next";
import { ArrowRightIcon } from "@/components/icons";
import { Reveal } from "@/components/landing/reveal";

export const metadata: Metadata = {
  title: "Live demos — Axiom Foundation",
  description:
    "Applications running on the Axiom encodings: statutes computed in your browser, AI assistants grounded in cited rules, and policy tools built on the open layer.",
};

interface Demo {
  slug: string;
  kicker: string;
  title: string;
  body: string;
  url: string;
  /** Embed as an iframe; false renders a link-out card instead. */
  embed: boolean;
}

const DEMOS: Demo[] = [
  {
    slug: "reg-demo",
    kicker: "For builders · in-browser computation",
    title: "Small company checker",
    body:
      "Companies Act 2006 s.382, computed in your browser from the Axiom encoding — cited, time-aware, executable. No data leaves the page.",
    url: "https://axiom-reg-demo.vercel.app",
    embed: true,
  },
  {
    slug: "finbot",
    kicker: "For AI labs · grounded answers",
    title: "Axiom-grounded benefits assistant",
    body:
      "An AI assistant on top of the Axiom rules engine — SNAP calculations for Colorado, California, and New York, every answer with citations, side by side with the ungrounded model.",
    url: "https://finbot-snap-demo.vercel.app",
    embed: true,
  },
  {
    slug: "co-snap-cliffs",
    kicker: "For government · policy analysis",
    title: "Colorado SNAP cliffs",
    body:
      "Adjust Colorado SNAP parameters and watch how benefit cliffs shift — reform without rewriting, on the same encoding the calculators run.",
    url: "https://axiom-co-snap.vercel.app",
    embed: false,
  },
];

export default function DemosPage() {
  return (
    <div className="relative z-1 pt-32 pb-24 px-8">
      <div className="max-w-[1080px] mx-auto">
        <Reveal className="mb-16 max-w-[760px]">
          <span className="kicker mb-6 inline-flex">
            <span className="kicker-mark">&sect;</span>
            Demos &middot; The application layer
          </span>
          <h1 className="heading-page mb-6 mt-2">Built on the open layer</h1>
          <p className="font-body text-[1.2rem] text-[var(--color-ink-secondary)] leading-relaxed text-pretty">
            Every demo below runs on the same published encodings &mdash; the
            statute text, the RuleSpec rules, and the citations connecting
            them. What one encoding powers, anyone can build.
          </p>
        </Reveal>

        <div className="flex flex-col gap-16">
          {DEMOS.map((demo) => (
            <Reveal key={demo.slug} as="section" id={demo.slug} className="scroll-mt-28">
              <div className="flex flex-wrap items-baseline justify-between gap-3 mb-4">
                <div>
                  <span className="font-mono text-[0.65rem] tracking-[0.2em] uppercase text-[var(--color-ink-muted)] block mb-2">
                    {demo.kicker}
                  </span>
                  <h2 className="m-0 font-display text-[1.5rem] font-light tracking-[0.02em] text-[var(--color-ink)]">
                    {demo.title}
                  </h2>
                </div>
                <a
                  href={demo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 font-mono text-[0.75rem] tracking-[0.12em] uppercase text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] transition-colors no-underline"
                >
                  Open full size
                  <ArrowRightIcon className="w-4 h-4" />
                </a>
              </div>
              <p className="font-body text-[0.95rem] text-[var(--color-ink-secondary)] leading-relaxed max-w-[720px] mb-6">
                {demo.body}
              </p>
              {demo.embed ? (
                <div className="border border-[var(--color-rule)] rounded-md overflow-hidden bg-[var(--color-paper-elevated)] shadow-[0_16px_48px_rgba(0,0,0,0.08)]">
                  <iframe
                    src={demo.url}
                    title={demo.title}
                    loading="lazy"
                    className="block w-full h-[620px] border-0"
                  />
                </div>
              ) : (
                <a
                  href={demo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="card-edition inline-flex items-center gap-3 px-7 py-4 no-underline font-mono text-[0.85rem] text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] transition-transform duration-300 hover:-translate-y-0.5"
                >
                  Launch the tool
                  <ArrowRightIcon className="w-4 h-4" />
                </a>
              )}
            </Reveal>
          ))}
        </div>

        <Reveal className="mt-20 pt-10 border-t border-[var(--color-rule-subtle)] text-center">
          <p className="m-0 font-body text-[0.95rem] text-[var(--color-ink-muted)] leading-relaxed max-w-[640px] mx-auto">
            These are previews of what open, computable law makes possible.{" "}
            <span className="serif-italic text-[var(--color-ink-secondary)]">
              The layer underneath is the product
            </span>{" "}
            &mdash; explore it in{" "}
            <a
              href="https://app.axiom-foundation.org"
              className="text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] no-underline"
            >
              the Axiom app
            </a>
            .
          </p>
        </Reveal>
      </div>
    </div>
  );
}
