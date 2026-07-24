import { ArrowRightIcon } from "@/components/icons";
import { UPDATES_URL } from "@/lib/launch";
import { Reveal } from "./reveal";

export function FoundationSection() {
  return (
    <section
      id="foundation"
      className="section-tint-cream section-mark relative z-1 py-32 px-8"
    >
      <div className="max-w-[1280px] mx-auto">
        <Reveal className="text-center mb-12">
          <span className="kicker mb-6 inline-flex">
            <span className="kicker-mark">&sect;</span>
            Coda &middot; The foundation
          </span>
          <h2 className="heading-section mb-6 mt-2">
            Doing the public-interest work
          </h2>
          <p className="font-body text-lg text-[var(--color-ink-secondary)] leading-relaxed max-w-[680px] mx-auto">
            Everything we publish &mdash; code, data, and the decisions behind
            them &mdash; is open.{" "}
            <span className="serif-italic text-[var(--color-ink)]">
              Encoded law belongs in the open.
            </span>
          </p>
        </Reveal>

        <Reveal className="flex flex-wrap items-center justify-center gap-4">
          <a href="mailto:hello@axiom.org" className="btn-primary">
            Get in touch
            <ArrowRightIcon className="w-5 h-5" />
          </a>
          <a
            href={UPDATES_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-outline"
          >
            Stay updated
          </a>
        </Reveal>
      </div>
    </section>
  );
}
