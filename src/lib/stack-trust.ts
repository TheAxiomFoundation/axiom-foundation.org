/**
 * Trust overlay for /stack.
 *
 * The stack page answers "how does a provision become an executable rule?".
 * This adds the second question an auditor actually asks: "at this layer, what
 * can I check, and what am I taking on faith?"
 *
 * Rules for editing:
 *  - `checkable` may only list things a non-employee can confirm from public
 *    bytes. If confirming it needs our credentials, it is not checkable.
 *  - `open` is not a disclaimer section. It names the specific thing that is
 *    not yet independently confirmable, so the gap is legible rather than
 *    implied by silence.
 *  - When a gap closes, the line moves up. It does not just disappear.
 *
 * DRAFT — the `checkable` lines for layers 01–03 describe artifacts that the
 * pipeline produces; confirm each is reachable from a public URL before this
 * ships. Layers 04–07 were verified against published releases on 2026-07-25.
 */

export interface LayerTrust {
  /** What a third party can confirm about this layer's output. */
  checkable: string[];
  /** What is not yet independently confirmable here. */
  open: string[];
}

export const layerTrust: Record<string, LayerTrust> = {
  scrape: {
    checkable: [
      "Each captured document keeps its origin URL and capture date.",
      "The archived copy is retained, so a later edit upstream does not silently rewrite history.",
    ],
    open: [
      "Continuous re-checking against the publisher's live copy is not published as a check.",
    ],
  },

  "source-structure": {
    checkable: [
      "Normalization is deterministic: the same input document produces the same structured output.",
    ],
    open: [
      "The normalized tree is not separately hash-published today — it is checkable only by re-running the parser.",
    ],
  },

  "source-graph": {
    checkable: [
      "Every encoded value carries the durable legal id of the slice it came from, so a claim can be traced back to statutory text.",
    ],
    open: [
      "That the slice faithfully represents the provision is a human judgment, checked by review rather than by a machine.",
    ],
  },

  rulespec: {
    checkable: [
      "Corpus releases are pinned and publicly mirrored; the canonical sha256 recomputes from the downloaded bytes.",
      "Each program in the manifest declares its spec path and spec sha256.",
    ],
    open: [
      "Coverage is per-program. There is no blanket coverage claim, and there should not be one.",
    ],
  },

  encoder: {
    checkable: [
      "Generation runs on operator-controlled compute and is recorded as an event; the record of what was generated is separate from the decision to accept it.",
    ],
    open: [
      "Model output is never the thing you are asked to trust — acceptance is decided downstream, by checks that do not involve a model.",
    ],
  },

  engine: {
    checkable: [
      "Engine releases publish a sha256 per platform target and a build attestation resolving to the release workflow and commit.",
      "Program artifacts are content-addressed; the manifest declares each artifact's sha256 before you download it.",
      "Encodings are compared against calculators built by other people, and every disagreement on a covered policy is classified with evidence that CI recomputes.",
    ],
    open: [
      "The released engine cannot currently execute the published artifacts — a format-version gap, with the error and fix on the verify page.",
      "Coverage is the live limit: 34 of 127 in-scope US policies have a comparison suite today.",
      "Agreement shows two implementations agree; where both misread a provision the same way, it shows nothing.",
    ],
  },

  axiom: {
    checkable: [
      "Every displayed value links to the provision it came from and the release it was computed in.",
    ],
    open: [
      "The hosted surfaces are a developer preview: live and usable, with no service commitment yet.",
    ],
  },
};
