import type { Metadata } from "next";
import { GraphClient } from "./graph-client";

/**
 * The rule-graph viewer as a first-class app surface: the structural
 * projection of the corpus the reader shows textually. ?program=
 * selects a compiled package, ?focus= pre-selects the rules derived
 * from a provision, ?compose= builds a graph on demand for law no
 * package covers. Section pages deep-link here; graph nodes cite
 * back into the reader.
 */

export const metadata: Metadata = {
  title: "Rule graph · Axiom",
  description:
    "Explore the dependency graph of encoded law — which rules feed which, across statutes, regulations, and policy.",
  robots: { index: false, follow: true },
};

export default function GraphPage() {
  return <GraphClient />;
}
