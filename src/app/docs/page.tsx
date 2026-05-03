import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon, CheckIcon } from "@/components/icons";

export const metadata: Metadata = {
  title: "Documentation — Axiom Foundation",
  description:
    "Canonical Axiom documentation map for architecture, RuleSpec, corpus, claims, and encoder validation.",
};

const docHomes = [
  {
    name: "Cross-system architecture",
    owner: "axiom-foundation.org",
    location: "/docs",
    description:
      "Public index for how Axiom's source, claim, RuleSpec, encoder, runtime, and app layers fit together.",
    href: "/docs",
    internal: true,
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
    name: "Encoder methods log",
    owner: "axiom-encode",
    location: "docs/axiom-encode-methods-log.md",
    description:
      "Harness changes, hypotheses, and validation evidence for benchmark-relevant encoder work.",
    href: "https://github.com/TheAxiomFoundation/axiom-encode/blob/main/docs/axiom-encode-methods-log.md",
  },
  {
    name: "PolicyEngine oracle registry",
    owner: "axiom-encode",
    location: "docs/policyengine-oracle-registry.md",
    description:
      "Mapping and validation notes for comparing RuleSpec outputs to PolicyEngine where the concepts line up.",
    href: "https://github.com/TheAxiomFoundation/axiom-encode/blob/main/docs/policyengine-oracle-registry.md",
  },
];

const ownershipRules = [
  "Repo-owned engineering docs live in the repo that owns the code or contract.",
  "Public and cross-repo docs are indexed here so readers do not need to know the repo layout first.",
  "Schema and validation contracts stay close to the validator or runtime that enforces them.",
  "Historical notes can live in repo docs, but current public architecture should be linked from this page.",
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
    repo: "axiom-rules",
    owns: "RuleSpec language, compiler, runtime, test runner, and executable semantics.",
  },
  {
    repo: "rules-*",
    owns: "Jurisdiction RuleSpec corpora: checked-in `.yaml` rules and companion `.test.yaml` cases.",
  },
  {
    repo: "axiom-foundation.org",
    owns: "Public site, Axiom app shell, docs index, and cross-system presentation.",
  },
];

function DocLink({
  doc,
}: {
  doc: (typeof docHomes)[number];
}) {
  const classes =
    "group grid grid-cols-[minmax(0,1fr)_auto] gap-4 border-t border-[var(--color-rule)] py-5 text-left transition-colors hover:border-[var(--color-accent)]";
  const content = (
    <>
      <div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h3 className="font-body text-lg text-[var(--color-ink)]">
            {doc.name}
          </h3>
          <span className="font-mono text-xs text-[var(--color-ink-muted)]">
            {doc.owner}
          </span>
        </div>
        <p className="mt-2 font-body text-sm leading-relaxed text-[var(--color-ink-secondary)]">
          {doc.description}
        </p>
        <p className="mt-3 font-mono text-xs text-[var(--color-code-text)]">
          {doc.location}
        </p>
      </div>
      <ArrowRightIcon className="mt-1 h-5 w-5 text-[var(--color-ink-muted)] transition-transform group-hover:translate-x-1 group-hover:text-[var(--color-accent)]" />
    </>
  );

  if (doc.internal) {
    return (
      <Link href={doc.href} className={classes}>
        {content}
      </Link>
    );
  }
  return (
    <a
      href={doc.href}
      target="_blank"
      rel="noopener noreferrer"
      className={classes}
    >
      {content}
    </a>
  );
}

export default function DocsPage() {
  return (
    <div className="relative z-1 px-8 py-28">
      <div className="mx-auto max-w-[1080px]">
        <header className="mb-16 grid grid-cols-[minmax(0,0.85fr)_minmax(280px,0.45fr)] gap-12 max-lg:grid-cols-1">
          <div>
            <p className="mb-4 font-mono text-xs uppercase tracking-[0.16em] text-[var(--color-ink-muted)]">
              Axiom documentation
            </p>
            <h1 className="heading-page mb-6">
              Canonical docs live with the system that enforces them.
            </h1>
            <p className="max-w-[720px] font-body text-lg leading-relaxed text-[var(--color-ink-secondary)]">
              This page is the public map. Implementation details stay in the
              owning repos; cross-system architecture is indexed here.
            </p>
          </div>
          <div className="border-l border-[var(--color-rule)] pl-8 max-lg:border-l-0 max-lg:border-t max-lg:pl-0 max-lg:pt-8">
            <p className="mb-4 font-mono text-xs uppercase tracking-[0.16em] text-[var(--color-ink-muted)]">
              Current invariant
            </p>
            <p className="font-body text-[1rem] leading-relaxed text-[var(--color-ink-secondary)]">
              Corpus is source text. Claims are reviewed source meaning.
              RuleSpec is computation. Encoder validates the evidence path
              between them.
            </p>
          </div>
        </header>

        <section className="mb-20">
          <div className="mb-8">
            <h2 className="heading-section mb-3">Documentation homes</h2>
            <p className="max-w-[760px] font-body text-[1rem] leading-relaxed text-[var(--color-ink-secondary)]">
              These are the current canonical docs for architecture and
              validation work. Add new docs to the repo that owns the behavior,
              then link them here when they are useful across repos.
            </p>
          </div>
          <div>
            {docHomes.map((doc) => (
              <DocLink key={`${doc.owner}:${doc.location}`} doc={doc} />
            ))}
          </div>
        </section>

        <section className="mb-20 grid grid-cols-[minmax(0,0.72fr)_minmax(260px,0.38fr)] gap-12 max-lg:grid-cols-1">
          <div>
            <h2 className="heading-section mb-6">Ownership rule</h2>
            <div className="flex flex-col gap-4">
              {ownershipRules.map((rule) => (
                <div
                  key={rule}
                  className="flex items-start gap-3 border-t border-[var(--color-rule)] pt-4"
                >
                  <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-success)]" />
                  <p className="font-body text-sm leading-relaxed text-[var(--color-ink-secondary)]">
                    {rule}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <aside className="border-l border-[var(--color-rule)] pl-8 max-lg:border-l-0 max-lg:border-t max-lg:pl-0 max-lg:pt-8">
            <h2 className="font-body text-lg text-[var(--color-ink)]">
              Related maps
            </h2>
            <div className="mt-5 flex flex-col gap-3">
              <Link href="/stack" className="btn-outline">
                Technical stack
              </Link>
              <Link href="/encoder" className="btn-outline">
                Encoder system map
              </Link>
              <a
                href="https://app.axiom-foundation.org"
                className="btn-outline"
              >
                Open Axiom
              </a>
            </div>
          </aside>
        </section>

        <section>
          <div className="mb-8">
            <h2 className="heading-section mb-3">Repository ownership</h2>
            <p className="max-w-[760px] font-body text-[1rem] leading-relaxed text-[var(--color-ink-secondary)]">
              The repo split is part of the documentation model. A doc should
              move only when the owning system moves.
            </p>
          </div>
          <div className="divide-y divide-[var(--color-rule)] border-y border-[var(--color-rule)]">
            {repoMap.map((item) => (
              <div
                key={item.repo}
                className="grid grid-cols-[220px_minmax(0,1fr)] gap-6 py-5 max-md:grid-cols-1 max-md:gap-2"
              >
                <p className="font-mono text-sm text-[var(--color-code-text)]">
                  {item.repo}
                </p>
                <p className="font-body text-sm leading-relaxed text-[var(--color-ink-secondary)]">
                  {item.owns}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
