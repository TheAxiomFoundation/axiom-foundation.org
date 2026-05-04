import { redirect } from "next/navigation";

interface ViewerProps {
  params: Promise<{ path: string[] }>;
}

/**
 * The encoded directory at ``/axiom/encoded`` links each row to this
 * route, but now that the standard ``/axiom/<citation>`` URL renders
 * the same rich RuleSpec view (synthesised from the rules-* repo when
 * the corpus has no row), there's no reason to keep a parallel
 * viewer. Send the user to the canonical URL so back/forward, deep
 * links, and shared references all line up.
 */
export default async function EncodedRuleViewerPage({ params }: ViewerProps) {
  const { path } = await params;
  redirect(`/axiom/${path.join("/")}`);
}
