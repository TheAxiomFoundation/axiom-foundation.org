import type { Metadata } from "next";
import { ArrowRightIcon, GitHubIcon } from "@/components/icons";
import { Reveal } from "@/components/landing/reveal";
import { ContactForm } from "@/components/contact/contact-form";
import { UPDATES_URL } from "@/lib/launch";

export const metadata: Metadata = {
  title: "Contact — Axiom Foundation",
  description:
    "Get in touch with the Axiom Foundation — partnerships, contributions, funding, or anything about open, computable law.",
};

const CHANNELS = [
  {
    label: "Email",
    value: "hello@axiom.org",
    href: "mailto:hello@axiom.org",
    external: false,
  },
  {
    label: "GitHub",
    value: "TheAxiomFoundation",
    href: "https://github.com/TheAxiomFoundation",
    external: true,
  },
  {
    label: "LinkedIn",
    value: "Axiom Foundation",
    href: "https://www.linkedin.com/company/axiom-foundation",
    external: true,
  },
  {
    label: "Newsletter",
    value: "Get updates",
    href: UPDATES_URL,
    external: true,
  },
];

export default function ContactPage() {
  return (
    <div className="relative z-1 pt-32 pb-24 px-8">
      <div className="max-w-[960px] mx-auto">
        <Reveal className="mb-16 max-w-[720px]">
          <span className="kicker mb-6 inline-flex">
            <span className="kicker-mark">&sect;</span>
            Contact
          </span>
          <h1 className="heading-page mb-6 mt-2">Get in touch</h1>
          <p className="font-body text-[1.2rem] text-[var(--color-ink-secondary)] leading-relaxed text-pretty">
            Partnerships, contributions, funding, press &mdash; or just a
            question about open, computable law. We read everything.
          </p>
        </Reveal>

        <div className="grid gap-14 md:grid-cols-[1fr_280px]">
          <Reveal>
            <ContactForm />
          </Reveal>

          <Reveal delay={0.08}>
            <h2 className="m-0 mb-6 font-display text-[1.2rem] font-light tracking-[0.02em] text-[var(--color-ink)]">
              <span aria-hidden className="mb-3 block h-px w-7 bg-[var(--color-accent)]" />
              Channels
            </h2>
            <ul className="flex flex-col gap-5 list-none p-0 m-0">
              {CHANNELS.map((channel) => (
                <li key={channel.label}>
                  <span className="block font-mono text-[0.62rem] tracking-[0.18em] uppercase text-[var(--color-ink-muted)] mb-1">
                    {channel.label}
                  </span>
                  <a
                    href={channel.href}
                    className="inline-flex items-center gap-2 font-body text-[0.95rem] text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] transition-colors no-underline"
                    {...(channel.external
                      ? { target: "_blank", rel: "noopener noreferrer" }
                      : {})}
                  >
                    {channel.label === "GitHub" && (
                      <GitHubIcon className="w-4 h-4" />
                    )}
                    {channel.value}
                    <ArrowRightIcon className="w-3.5 h-3.5" />
                  </a>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </div>
    </div>
  );
}
