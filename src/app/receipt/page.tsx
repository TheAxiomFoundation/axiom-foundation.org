import type { Metadata } from "next";
import { Reveal } from "@/components/landing/reveal";
import { SITE_URL } from "@/lib/urls";

export const metadata: Metadata = {
  title: "receipt — verifiable custody of agent-produced records",
  description:
    "A receipt is the record you keep so anyone can check it later. The receipt package writes them for agent-produced records — one offline verification command.",
  alternates: { canonical: `${SITE_URL}/receipt` },
};

// The package homepage — receipt is an auxiliary open-source package for
// anyone shipping agent-produced records, not an Axiom-internal tool. Axiom's
// own usage appears once, as provenance. Copy stays close to the package
// README (the claims are its claims); no version numbers on the page so
// nothing drifts between releases.
const provides = [
  {
    mod: "receipt.chain",
    what: "Append-only hash-chained manifests over record sets: enumerated genesis, content-addressed links, immutable-prefix verification.",
  },
  {
    mod: "receipt.tsa",
    what: "RFC 3161 dual-witness time verification against trust bundles committed in the consumer's repo, with explicit unavailable-witness outcomes.",
  },
  {
    mod: "receipt.sign",
    what: "Ed25519 producer signatures verified against fingerprints pinned in the consumer's own committed code; N-of-M keyrings with legacy generations — retired keys verify immutable history only.",
  },
  {
    mod: "receipt.attest",
    what: "Workflow-provenance verification with self-anchoring enforcement epochs and a full-history sweep over every protected-tree commit.",
  },
  {
    mod: "receipt.ratchet",
    what: "Shrink-only exception registries recomputed from live state; an excused failure that starts passing is an error until removed.",
  },
  {
    mod: "receipt.chronology",
    what: "Record-vs-event ordering tiers: does witnessed time prove the record existed before the event it predicts or observes?",
  },
];

export default function ReceiptPage() {
  return (
    <div className="relative z-1 pt-32 pb-24 px-8">
      <div className="mx-auto max-w-[960px]">
        <Reveal className="mb-14 max-w-[760px]">
          <span className="kicker mb-6 inline-flex">
            <span className="kicker-mark">&sect;</span>
            receipt
          </span>
          <h1 className="heading-page mb-6 mt-2">
            Verifiable custody of agent-produced records
          </h1>
          <p className="font-body text-[1.2rem] leading-relaxed text-[var(--color-ink-secondary)] text-pretty">
            A receipt is the record you keep so anyone can check it later.
            Agents now produce records faster than any human can witness them —
            forecasts, ledgers, encoded law. The receipt package writes
            receipts for those records, and <code>receipt verify</code> is what
            happens when someone asks to see them: a clone, commodity tools,
            one offline, fail-closed verdict.
          </p>
        </Reveal>

        {/* Install — the whole adoption story is two commands */}
        <Reveal as="section" className="mb-16">
          <pre className="m-0 rounded-md border border-[var(--color-rule)] bg-[var(--color-paper-elevated)] p-5 font-mono text-[0.9rem] leading-relaxed text-[var(--color-ink)] overflow-x-auto">
            {"pip install receipt\nreceipt verify"}
          </pre>
          <p className="mt-3 font-mono text-[0.72rem] uppercase tracking-wider text-[var(--color-ink-muted)]">
            on PyPI as{" "}
            <a
              href="https://pypi.org/project/receipt/"
              className="text-[var(--color-accent)] hover:underline"
            >
              receipt
            </a>{" "}
            · source at{" "}
            <a
              href="https://github.com/TheAxiomFoundation/receipt"
              className="text-[var(--color-accent)] hover:underline"
            >
              github.com/TheAxiomFoundation/receipt
            </a>
          </p>
        </Reveal>

        <Reveal as="section" className="mb-16">
          <h2 className="heading-section m-0 mb-6">What it provides</h2>
          <div className="divide-y divide-[var(--color-rule)] border-y border-[var(--color-rule)]">
            {provides.map((item) => (
              <div
                key={item.mod}
                className="grid grid-cols-[220px_minmax(0,1fr)] gap-6 py-5 max-md:grid-cols-1 max-md:gap-2"
              >
                <p className="m-0 font-mono text-[0.85rem] text-[var(--color-ink)]">
                  {item.mod}
                </p>
                <p className="m-0 font-body text-[0.92rem] leading-relaxed text-[var(--color-ink-secondary)]">
                  {item.what}
                </p>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal as="section" className="mb-16 max-w-[760px]">
          <h2 className="heading-section mb-3">The design principle</h2>
          <p className="font-body text-[1rem] leading-relaxed text-[var(--color-ink-secondary)]">
            Trust anchors live in the consumer&apos;s committed code, never in
            runtime configuration a producer could swap. The package ships
            machinery; consumers pin roots. Retiring or rotating a key is a
            reviewed change to the consumer&apos;s repository — not a setting.
          </p>
        </Reveal>

        <Reveal as="section" className="max-w-[760px]">
          <h2 className="heading-section mb-3">Where it comes from</h2>
          <p className="font-body text-[1rem] leading-relaxed text-[var(--color-ink-secondary)]">
            The machinery arrives by extraction from three production systems
            that each built it independently — pre-registered forecast records,
            an observation-ledger release chain, and a signed statute corpus —
            behind a byte-equivalence gate: the extracted verifier must
            reproduce the source verifier&apos;s verdict, pass and fail alike,
            on the live production chain before any system consumes the
            package. The observation ledger runs on it in production today,
            with differential harnesses re-proving equivalence on every
            package change; adoption by the Axiom corpus is underway. We built
            it because we needed it. We publish it because everyone shipping
            agent-produced records will.
          </p>
          <p className="mt-4 font-mono text-[0.72rem] uppercase tracking-wider text-[var(--color-ink-muted)]">
            Axiom&apos;s own records carry them:{" "}
            <a href="/receipts" className="text-[var(--color-accent)] hover:underline">
              axiom.org/receipts
            </a>
          </p>
        </Reveal>
      </div>
    </div>
  );
}
