import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon } from "@/components/icons";
import { Reveal } from "@/components/landing/reveal";
import { axiomAppHref } from "@/lib/urls";

export const metadata: Metadata = {
  title: "Documentation — Axiom Foundation",
  description:
    "Canonical Axiom documentation map for architecture, RuleSpec, corpus, claims, and encoder validation.",
};

const docHomes = [
  {
    name: "Cross-system architecture",
    owner: "axiom-architecture",
    location: "axiom-architecture-one.vercel.app",
    description:
      "Interactive map of how Axiom's source, claim, RuleSpec, encoder, runtime, and app layers fit together.",
    href: "https://axiom-architecture-one.vercel.app",
  },
  {
    name: "Signed corpus releases",
    owner: "axiom-corpus",
    location: "docs/named-release-publication.md",
    description:
      "The immutable named-release model: content-addressed artifacts, signature verification, and transactional activation of the serving projection.",
    href: "https://github.com/TheAxiomFoundation/axiom-corpus/blob/main/docs/named-release-publication.md",
  },
  {
    name: "RuleSpec proof validation",
    owner: "axiom-encode",
    location: "docs/rulespec-proof-validation.md",
    description:
      "Proof-tree contract for keeping corpus anchors, accepted source claims, and executable RuleSpec separate.",
    href: "https://github.com/TheAxiomFoundation/axiom-encode/blob/main/docs/rulespec-proof-validation.md",
  },
  {
    name: "Upstream-first encoding",
    owner: "axiom-encode",
    location: "docs/upstream-first-encoding-plan.md",
    description:
      "Source-ordering and source-graph plan for encoding statutes, regulations, guidance, and downstream manuals.",
    href: "https://github.com/TheAxiomFoundation/axiom-encode/blob/main/docs/upstream-first-encoding-plan.md",
  },
  {
    name: "Oracle adapters & comparisons",
    owner: "axiom-oracles",
    location: "README.md",
    description:
      "The cross-engine validation harness behind the validation dashboard — adapters, concept-keyed cases, and mismatch reports.",
    href: "https://github.com/TheAxiomFoundation/axiom-oracles",
  },
];

const repoMap = [
  {
    repo: "axiom-corpus",
    owns: "Corpus source text, anchors, hierarchy, tables, hashes, and source claims.",
  },
  {
    repo: "axiom-encode",
    owns: "Encoder prompts, harness validation, proof validation, oracles, eval suites, and methods notes.",
  },
  {
    repo: "axiom-rules-engine",
    owns: "RuleSpec language, compiler, runtime, test runner, and executable semantics.",
  },
  {
    repo: "rulespec-*",
    owns: "Jurisdiction RuleSpec corpora: checked-in .yaml rules and companion .test.yaml cases.",
  },
  {
    repo: "axiom-foundation.org",
    owns: "Public site, Axiom app shell, docs index, and cross-system presentation.",
  },
];

const RELATED = [
  { href: "/stack", label: "Technical stack", internal: true },
  { href: "/encoder", label: "Encoder system map", internal: true },
  { href: "/validation", label: "How we validate", internal: true },
];

function DocLink({ doc }: { doc: (typeof docHomes)[number] }) {
  return (
    <a
      href={doc.href}
      target="_blank"
      rel="noopener noreferrer"
      className="group grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 border-t border-[var(--color-rule)] py-6 no-underline transition-colors hover:border-[var(--color-accent)]"
    >
      <div>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h3 className="m-0 font-body text-[1.1rem] font-medium text-[var(--color-ink)] group-hover:text-[var(--color-accent)] transition-colors">
            {doc.name}
          </h3>
          <span className="font-mono text-[0.65rem] tracking-[0.14em] uppercase text-[var(--color-ink-muted)]">
            {doc.owner}
          </span>
        </div>
        <p className="mt-2 mb-0 font-body text-[0.92rem] leading-relaxed text-[var(--color-ink-secondary)]">
          {doc.description}
        </p>
        <p className="mt-2.5 mb-0 font-mono text-[0.75rem] text-[var(--color-ink-muted)]">
          {doc.location}
        </p>
      </div>
      <ArrowRightIcon className="mt-1.5 h-5 w-5 shrink-0 text-[var(--color-ink-muted)] transition-all group-hover:translate-x-1 group-hover:text-[var(--color-accent)]" />
    </a>
  );
}

export default function DocsPage() {
  return (
    <div className="relative z-1 pt-32 pb-24 px-8">
      <div className="mx-auto max-w-[960px]">
        {/* Header */}
        <Reveal className="mb-14 max-w-[760px]">
          <span className="kicker mb-6 inline-flex">
            <span className="kicker-mark">&sect;</span>
            Documentation
          </span>
          <h1 className="heading-page mb-6 mt-2">
            Docs live with the system that enforces them
          </h1>
          <p className="font-body text-[1.2rem] leading-relaxed text-[var(--color-ink-secondary)] text-pretty">
            This page is the public map. Implementation detail stays in the
            owning repo &mdash; what you find here is every doc worth reading
            across the ecosystem, in one place.
          </p>
        </Reveal>

        {/* The invariant, as a full-width strip instead of a squeezed sidebar */}
        <Reveal className="mb-20 rounded-md border border-[var(--color-rule)] bg-[var(--color-paper-elevated)] px-7 py-5">
          <p className="m-0 font-body text-[0.95rem] leading-relaxed text-[var(--color-ink-secondary)]">
            <span className="font-mono text-[0.62rem] tracking-[0.18em] uppercase text-[var(--color-accent)] mr-3">
              The invariant
            </span>
            Corpus is source text. Claims are reviewed source meaning. RuleSpec
            is computation. The encoder validates the evidence path between
            them.
          </p>
        </Reveal>

        {/* Canonical docs */}
        <Reveal as="section" className="mb-20">
          <h2 className="heading-section mb-3">Documentation homes</h2>
          <p className="mb-8 max-w-[720px] font-body text-[1rem] leading-relaxed text-[var(--color-ink-secondary)]">
            The current canonical docs for architecture and validation work.
          </p>
          <div className="border-b border-[var(--color-rule)]">
            {docHomes.map((doc) => (
              <DocLink key={`${doc.owner}:${doc.location}`} doc={doc} />
            ))}
          </div>
        </Reveal>

        {/* Related maps — a simple row, not an aside */}
        <Reveal as="section" className="mb-20">
          <h2 className="heading-section mb-8">Related maps</h2>
          <div className="flex flex-wrap gap-4">
            {RELATED.map((link) => (
              <Link key={link.href} href={link.href} className="btn-outline">
                {link.label}
              </Link>
            ))}
            <a href={axiomAppHref()} className="btn-outline">
              Open Axiom
            </a>
          </div>
        </Reveal>

        {/* Repo ownership */}
        <Reveal as="section">
          <h2 className="heading-section mb-3">Repository ownership</h2>
          <p className="mb-8 max-w-[720px] font-body text-[1rem] leading-relaxed text-[var(--color-ink-secondary)]">
            The repo split is part of the documentation model: engineering
            docs live in the repo that owns the code or contract, and a doc
            moves only when the owning system moves.
          </p>
          <div className="divide-y divide-[var(--color-rule)] border-y border-[var(--color-rule)]">
            {repoMap.map((item) => (
              <div
                key={item.repo}
                className="grid grid-cols-[220px_minmax(0,1fr)] gap-6 py-5 max-md:grid-cols-1 max-md:gap-2"
              >
                <p className="m-0 font-mono text-[0.85rem] text-[var(--color-ink)]">
                  {item.repo}
                </p>
                <p className="m-0 font-body text-[0.92rem] leading-relaxed text-[var(--color-ink-secondary)]">
                  {item.owns}
                </p>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </div>
  );
}
