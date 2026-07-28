import type { Metadata } from "next";
import { Reveal } from "@/components/landing/reveal";
import { axiomAppHref } from "@/lib/urls";
import { SITE_URL } from "@/lib/urls";

export const metadata: Metadata = {
  title: "Receipts — Axiom Foundation",
  description:
    "A receipt is the record you keep so anyone can check it later. Everything Axiom publishes carries one — the evidence to re-verify it without asking us.",
  alternates: { canonical: `${SITE_URL}/receipts` },
};

// Every row links a PUBLIC surface — the receipt is only a receipt if a
// stranger can follow it. (ops is private; certification status is public
// through the app, which mirrors the certified ledger.)
const receipts = [
  {
    name: "The receipt package",
    what:
      "Verifiable custody for agent-produced records: append-only hash-chained manifests, dual RFC 3161 time witnesses, Ed25519 signatures pinned in the consumer's own committed code, and workflow-provenance attestation. One command — receipt verify — gives an outside auditor a clone, commodity tools, and one offline, fail-closed verdict.",
    href: "https://github.com/TheAxiomFoundation/receipt",
    label: "github.com/TheAxiomFoundation/receipt",
  },
  {
    name: "Releases",
    what:
      "Engine releases ship checksums and build attestations. Verify the binary you downloaded against the attestation log with commodity tools before you run it.",
    href: "https://github.com/TheAxiomFoundation/axiom-rules-engine/releases",
    label: "axiom-rules-engine/releases",
  },
  {
    name: "Encodings",
    what:
      "Every rule cites the provision of law it encodes and lands with a companion test. The repositories are the receipt: the citation, the test, and the history of both are public.",
    href: "https://github.com/TheAxiomFoundation/rulespec-us",
    label: "rulespec-us",
  },
  {
    name: "Validation",
    what:
      "Encodings are compared against independent implementations in the open, and disagreements are recorded rather than resolved quietly.",
    href: "https://github.com/TheAxiomFoundation/axiom-oracles",
    label: "axiom-oracles",
  },
  {
    name: "Certification",
    what:
      "Computed, not granted: the harness derives completeness and fidelity, and a node certifies itself — nobody, including us, grants it by hand. Every node wears its tier in the app, including the empty certified tier at launch. The emptiness is the credibility.",
    href: axiomAppHref(),
    label: "the Axiom app",
  },
];

export default function ReceiptsPage() {
  return (
    <div className="relative z-1 pt-32 pb-24 px-8">
      <div className="mx-auto max-w-[960px]">
        <Reveal className="mb-14 max-w-[760px]">
          <span className="kicker mb-6 inline-flex">
            <span className="kicker-mark">&sect;</span>
            Receipts
          </span>
          <h1 className="heading-page mb-6 mt-2">We show our receipts</h1>
          <p className="font-body text-[1.2rem] leading-relaxed text-[var(--color-ink-secondary)] text-pretty">
            A receipt is the record you keep so anyone can check it later.
            Everything Axiom publishes carries one — the evidence to re-verify
            it, offline, without asking us. Trust anchors live in the
            verifier&apos;s own committed code, never in configuration we could
            swap.
          </p>
        </Reveal>

        <Reveal as="section" className="mb-20">
          <div className="divide-y divide-[var(--color-rule)] border-y border-[var(--color-rule)]">
            {receipts.map((item) => (
              <div
                key={item.name}
                className="grid grid-cols-[200px_minmax(0,1fr)] gap-6 py-6 max-md:grid-cols-1 max-md:gap-2"
              >
                <div>
                  <p className="m-0 font-mono text-[0.85rem] text-[var(--color-ink)]">
                    {item.name}
                  </p>
                  <a
                    href={item.href}
                    className="font-mono text-[0.72rem] text-[var(--color-accent)] hover:underline"
                  >
                    {item.label}
                  </a>
                </div>
                <p className="m-0 font-body text-[0.95rem] leading-relaxed text-[var(--color-ink-secondary)]">
                  {item.what}
                </p>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal as="section">
          <h2 className="heading-section mb-3">What&apos;s next</h2>
          <p className="max-w-[720px] font-body text-[1rem] leading-relaxed text-[var(--color-ink-secondary)]">
            The receipts get thicker, not thinner: we intend to publish the
            full agent logs behind every encoding as telemetry — the complete
            record of how each rule came to say what it says.
          </p>
        </Reveal>
      </div>
    </div>
  );
}
