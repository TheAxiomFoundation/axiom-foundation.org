import { NextResponse } from "next/server";
import { resolveCitationPath } from "@/lib/axiom/resolver";

interface RouteContext {
  params: Promise<{ path: string[] }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { path } = await context.params;
  const inputPath = path.map(decodeSegment).join("/");
  const resolved = await resolveCitationPath(inputPath);

  if (!resolved.rule?.citation_path) {
    return NextResponse.json(
      {
        match: "none",
        citation_path: resolved.citationPath,
        resolved_citation_path: null,
        href: null,
      },
      { status: 404 }
    );
  }

  return NextResponse.json({
    match: resolved.match,
    citation_path: resolved.citationPath,
    resolved_citation_path: resolved.rule.citation_path,
    missing_tail: resolved.missingTail,
    href: `/${resolved.rule.citation_path}`,
  });
}

function decodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}
