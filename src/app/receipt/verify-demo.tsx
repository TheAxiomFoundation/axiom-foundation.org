"use client";

import { useState } from "react";

// A miniature corpus and the command's own verdicts. Every refusal string
// below is receipt's actual wording (corpus.py, sign.py, release_chain.py,
// cli.py at v0.5.0); the digests are real SHA-256s of the two file contents
// shown. The demo simulates the pass ORDER faithfully too: passes run
// custody → binding → declarations and the run stops at the first failure,
// so later passes never appear in a failing verdict — exactly like the CLI.

type Attack = "pristine" | "rewrite" | "swapkey" | "rewitness" | "dropgate";

const ATTACKS: { id: Attack; label: string }[] = [
  { id: "pristine", label: "pristine clone" },
  { id: "rewrite", label: "rewrite a rule" },
  { id: "swapkey", label: "swap the signing key" },
  { id: "rewitness", label: "regenerate everything" },
  { id: "dropgate", label: "drop a gate declaration" },
];

// Real SHA-256 prefixes of the exact bytes shown in the tree.
const DIGEST_WITNESSED = "e218ac6d2f12"; // "name: rate\nvalue: 0.15\n"
const DIGEST_TAMPERED = "e4075851568e"; // "name: rate\nvalue: 0.99\n"

type Line = { text: string; tone?: "fail" | "ok" | "dim" | "caveat" };

function verdict(attack: Attack, baseRef: boolean): Line[] {
  const pass = (name: string, detail: string): Line[] => [
    { text: `  [ok  ] ${name}`, tone: "ok" },
    { text: `         ${detail}`, tone: "dim" },
  ];
  const fail = (name: string, failure: string[]): Line[] => [
    { text: `  [FAIL] ${name}`, tone: "fail" },
    ...failure.map((t): Line => ({ text: `         ${t}`, tone: "fail" })),
  ];

  if (attack === "swapkey") {
    return [
      { text: "PASSES" },
      ...fail("custody", [
        "producer public-key SPKI is not code-pinned:",
        "0f681077b04af363…",
      ]),
      { text: "" },
      { text: "VERDICT: FAIL — custody", tone: "fail" },
    ];
  }

  if (attack === "rewrite") {
    return [
      { text: "PASSES" },
      ...pass("custody", "chain of 2 release(s), 2 witnesses per release"),
      ...fail("binding", [
        "content file 'rules/tax/rate.yaml' does not match its",
        `witnessed digest: tree has ${DIGEST_TAMPERED}…, journal`,
        `binds ${DIGEST_WITNESSED}…`,
      ]),
      { text: "" },
      { text: "VERDICT: FAIL — binding", tone: "fail" },
    ];
  }

  if (attack === "dropgate") {
    return [
      { text: "PASSES" },
      ...pass("custody", "chain of 2 release(s), 2 witnesses per release"),
      ...pass("binding", "3 content files bound, 1 attested path"),
      ...fail("declarations", [
        "the witnessed journal does not declare a gate the",
        "pinned spec requires: 'rulespec/compile'",
      ]),
      { text: "" },
      { text: "VERDICT: FAIL — declarations", tone: "fail" },
    ];
  }

  if (attack === "rewitness" && baseRef) {
    return [
      { text: "PASSES" },
      ...fail("history", [
        "release history is not immutable: existing release",
        "file bytes changed relative to 5b0d266:",
        "releases/manifests/0001.json",
      ]),
      { text: "" },
      { text: "VERDICT: FAIL — history", tone: "fail" },
    ];
  }

  // Pristine — and, honestly, wholesale regeneration on first contact.
  const lines: Line[] = [
    { text: "ESTABLISHED OFFLINE, FROM THIS CLONE ALONE" },
    ...pass("custody", "chain of 2 release(s), 2 witnesses per release"),
    ...pass("binding", "3 content files bound, 1 attested path"),
    ...pass("declarations", "3 gates declared, every required gate present"),
    { text: "" },
    { text: "VERDICT: PASS — custody and corpus binding" },
  ];
  if (attack === "rewitness") {
    lines.push(
      { text: "" },
      {
        text: "  It does NOT prove the history was never rewritten —",
        tone: "caveat",
      },
      {
        text: "  a producer holding the signing key can regenerate",
        tone: "caveat",
      },
      {
        text: "  and re-witness a whole chain, and this first-contact",
        tone: "caveat",
      },
      { text: "  check would still pass; supply --base-ref against", tone: "caveat" },
      { text: "  a head you recorded earlier to bind against that.", tone: "caveat" },
    );
  }
  return lines;
}

function tree(attack: Attack): Line[] {
  const changed = (s: string): Line => ({ text: s, tone: "fail" });
  const plain = (s: string): Line => ({ text: s });
  const dim = (s: string): Line => ({ text: s, tone: "dim" });
  const regenerated = attack === "rewitness";
  return [
    plain("releases/"),
    regenerated
      ? changed("  manifests/0001.json      re-signed, re-witnessed")
      : plain("  manifests/0001.json"),
    regenerated
      ? changed("  manifests/0002.json      re-signed, re-witnessed")
      : plain("  manifests/0002.json"),
    attack === "swapkey"
      ? changed("  anchors/producer.pub     substituted key")
      : plain("  anchors/producer.pub"),
    plain("rules/"),
    attack === "rewrite"
      ? changed("  tax/rate.yaml            value: 0.99")
      : plain("  tax/rate.yaml            value: 0.15"),
    plain("  benefit/amount.yaml"),
    plain(".axiom/"),
    plain("  journal.jsonl"),
    attack === "dropgate"
      ? changed("    gate rulespec/compile  row deleted")
      : plain("    gate rulespec/compile  outcome: pass"),
    dim(""),
    dim("auditor's own repo — out of the producer's reach"),
    dim("  spec.py   producer SPKI 6092ef9ccc3c0c52…"),
    dim("            two RFC 3161 anchor roots, pinned"),
  ];
}

const TONE: Record<NonNullable<Line["tone"]> | "plain", string> = {
  plain: "text-[var(--color-ink)]",
  ok: "text-[var(--color-ink)]",
  dim: "text-[var(--color-ink-muted)]",
  fail: "text-[var(--color-accent)]",
  caveat: "text-[var(--color-ink-secondary)]",
};

export function VerifyDemo() {
  const [attack, setAttack] = useState<Attack>("pristine");
  const [baseRef, setBaseRef] = useState(false);

  const pick = (next: Attack) => {
    setAttack(next);
    setBaseRef(false);
  };

  const lines = verdict(attack, baseRef);
  const showBaseRefOffer = attack === "rewitness" && !baseRef;

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-x-5 gap-y-2">
        {ATTACKS.map((a) => (
          <button
            key={a.id}
            type="button"
            aria-pressed={attack === a.id}
            onClick={() => pick(a.id)}
            className={
              "font-mono text-[0.7rem] uppercase tracking-[0.14em] " +
              (attack === a.id
                ? "text-[var(--color-ink)] underline underline-offset-4 decoration-[var(--color-accent)]"
                : "text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]")
            }
          >
            {a.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-md border border-[var(--color-rule)] bg-[var(--color-paper-elevated)] p-4 overflow-x-auto">
          <p className="m-0 mb-2 font-mono text-[0.66rem] uppercase tracking-[0.14em] text-[var(--color-ink-muted)]">
            the clone
          </p>
          <pre className="m-0 font-mono text-[0.78rem] leading-relaxed">
            {tree(attack).map((l, i) => (
              <div key={i} className={TONE[l.tone ?? "plain"]}>
                {l.text || " "}
              </div>
            ))}
          </pre>
        </div>

        <div className="rounded-md border border-[var(--color-rule)] bg-[var(--color-paper-elevated)] p-4 overflow-x-auto">
          <p className="m-0 mb-2 font-mono text-[0.66rem] uppercase tracking-[0.14em] text-[var(--color-ink-muted)]">
            receipt verify{baseRef ? " --base-ref 5b0d266" : ""}
          </p>
          <pre className="m-0 font-mono text-[0.78rem] leading-relaxed" aria-live="polite">
            {lines.map((l, i) => (
              <div key={i} className={TONE[l.tone ?? "plain"]}>
                {l.text || " "}
              </div>
            ))}
          </pre>
          {showBaseRefOffer && (
            <button
              type="button"
              onClick={() => setBaseRef(true)}
              className="mt-3 font-mono text-[0.7rem] uppercase tracking-[0.14em] text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]"
            >
              add --base-ref from the auditor&apos;s records
            </button>
          )}
        </div>
      </div>

      <p className="mt-3 font-mono text-[0.72rem] uppercase tracking-wider text-[var(--color-ink-muted)]">
        a miniature corpus; the refusals are the command&apos;s own wording ·
        passes stop at the first failure
      </p>
    </div>
  );
}
