import type { Metadata } from "next";

// Round 1 pull-back — the entire Axiom app subtree (rule pages,
// /axiom/encoded, /axiom/search, /axiom/ops) is unlinked + noindexed
// until the Jul 28 launch. Pages that export their own `robots` (the
// [[...segments]] catch-all) set the same value; everything else
// inherits this. Remove at launch.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AxiomLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
