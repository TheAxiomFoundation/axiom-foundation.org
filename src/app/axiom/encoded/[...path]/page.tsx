import { redirect } from "next/navigation";

interface ViewerProps {
  params: Promise<{ path: string[] }>;
}

/**
 * The encoded directory at ``/encoded`` links each row to this internal
 * route, but now that the standard ``/<citation>`` URL renders
 * the same rich RuleSpec view (synthesised from the rulespec-* repo when
 * the corpus has no row), there's no reason to keep a parallel
 * viewer. Send the user to the canonical URL so back/forward, deep
 * links, and shared references all line up.
 */
export default async function EncodedRuleViewerPage({ params }: ViewerProps) {
  const { path } = await params;
  redirect(`/${path.join("/")}`);
}
