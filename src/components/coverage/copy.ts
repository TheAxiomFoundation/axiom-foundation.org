/**
 * The stack's layer copy, shared by the hero and the route loading
 * state so the two can never drift — the loading screen is the same
 * hero with its figures still spinning.
 */
export const STACK_LAYERS = [
  {
    key: "documents",
    name: "Source documents",
    /** Digit pattern the loading reels spin in before data arrives. */
    loadingPattern: "0,000",
    detail:
      "Statutes, regulations, and agency guidance — from U.S. Code titles and CFR parts to state benefit manuals.",
  },
  {
    key: "provisions",
    name: "Provisions",
    loadingPattern: "00,000",
    detail:
      "Every document, split into the atomic citable sections the reader, search, and citation graph all work on.",
  },
  {
    key: "encodings",
    name: "RuleSpec encodings",
    loadingPattern: "0,000",
    detail:
      "Machine-readable rules, each linked back to the exact provisions it encodes.",
  },
] as const;
