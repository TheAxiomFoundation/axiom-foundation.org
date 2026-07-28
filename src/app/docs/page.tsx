import type { Metadata } from "next";
import { ArchitectureStrip } from "@/components/docs/architecture-strip";
import { Reveal } from "@/components/landing/reveal";

export const metadata: Metadata = {
  title: "Documentation — Axiom Foundation",
  description:
    "Canonical Axiom documentation map for architecture, RuleSpec, corpus, claims, and encoder validation.",
};

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
            owning repo, with the system that enforces it.
          </p>
        </Reveal>

        {/* The pipeline strip — rendered natively, not an embed */}
        <Reveal as="section" className="mb-20">
          <h2 className="heading-section m-0 mb-6">The architecture</h2>
          <p className="mb-6 max-w-[720px] font-body text-[1rem] leading-relaxed text-[var(--color-ink-secondary)]">
            The whole pipeline as five stations &mdash; intake, corpus,
            encoding loop, RuleSpec, graph &mdash; then the compile seal and
            the surfaces it powers. One example, &sect;&nbsp;2017&apos;s
            &ldquo;30 per centum&rdquo;, runs the whole way.
          </p>
          <ArchitectureStrip />
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
