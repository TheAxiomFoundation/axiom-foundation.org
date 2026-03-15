import Image from "next/image";
import { CheckIcon } from "@/components/icons";

export default function AboutPage() {
  return (
    <div className="relative z-1 py-32 px-8">
      <div className="max-w-[800px] mx-auto">
        <header className="text-center mb-16">
          <h1 className="heading-page mb-6">
            About the Axiom Foundation
          </h1>
          <p className="font-body text-xl text-[var(--color-ink-secondary)] leading-relaxed max-w-[600px] mx-auto">
            Open infrastructure for encoded law. We build machine-readable
            encodings of statutes, regulations, and policy rules to serve as
            ground truth for AI systems.
          </p>
        </header>

        <section className="mb-16">
          <h2 className="heading-sub mb-4">
            Our mission
          </h2>
          <p className="font-body text-[1rem] text-[var(--color-ink-secondary)] leading-relaxed">
            Our mission is to make legal rules machine-readable, verifiable,
            and accessible to everyone. We&apos;re a fiscally sponsored project of
            the{" "}
            <a
              href="https://psl-foundation.org"
              target="_blank"
              rel="noopener noreferrer"
            >
              PSL Foundation
            </a>
            .
          </p>
        </section>

        <section className="mb-16">
          <h2 className="heading-sub mb-6">
            What we do
          </h2>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-6">
            {[
              {
                title: "Atlas",
                desc: "Open platform for exploring encoded law. The Archive holds 53 USC titles, 570+ IRS guidance documents, and 48 states. Atlas brings together source documents, RAC encodings, and validation results.",
              },
              {
                title: "RAC",
                desc: "Rules as Code DSL for encoding statutes with citations, temporal versioning, and tests. Purpose-built for legal encoding.",
              },
              {
                title: "AutoRAC",
                desc: "AI-powered encoding pipeline with 3-tier validation. Automated statute encoding with CI testing, oracle validation, and LLM review.",
              },
            ].map((card) => (
              <div
                key={card.title}
                className="p-6 bg-[var(--color-paper-elevated)] border border-[var(--color-rule)] rounded-md"
              >
                <h3 className="font-body text-lg text-[var(--color-ink)] mb-2">
                  {card.title}
                </h3>
                <p className="font-body text-sm text-[var(--color-ink-secondary)] leading-relaxed">
                  {card.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-16">
          <h2 className="heading-sub mb-6">Team</h2>
          <div className="flex gap-8 items-start max-md:flex-col">
            <Image
              src="https://maxghenis.com/images/headshot.png"
              alt="Max Ghenis"
              width={120}
              height={120}
              className="rounded-full shrink-0"
            />
            <div>
              <p className="font-body text-[1rem] text-[var(--color-ink-secondary)] leading-relaxed mb-4">
                The Axiom Foundation is led by{" "}
                <a
                  href="https://maxghenis.com"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Max Ghenis
                </a>
                , who also founded PolicyEngine. We&apos;re an open-source
                community project and welcome contributors from all backgrounds
                &mdash; developers, policy experts, legal researchers, and
                anyone passionate about making rules more transparent and
                accessible.
              </p>
              <div className="flex items-center gap-2 font-body text-sm text-[var(--color-ink-secondary)]">
                <CheckIcon className="w-4 h-4 text-[var(--color-success)]" />
                <span>
                  Join us on{" "}
                  <a
                    href="https://github.com/RuleAtlas"
                    className="text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]"
                  >
                    github.com/RuleAtlas
                  </a>
                </span>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="heading-sub mb-4">
            Contact
          </h2>
          <p className="font-body text-[1rem] text-[var(--color-ink-secondary)] leading-relaxed mb-4">
            Have questions or want to get involved? We&apos;d love to hear from
            you.
          </p>
          <div className="inline-block px-6 py-3 bg-[var(--color-paper-elevated)] border border-[var(--color-rule)] rounded-md">
            <a
              href="mailto:hello@ruleatlas.org"
              className="font-mono text-[var(--color-accent)] text-[0.95rem]"
            >
              hello@ruleatlas.org
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
