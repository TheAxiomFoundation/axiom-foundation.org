import { NextResponse, type NextRequest } from "next/server";
import { loadTreeNodes } from "@/lib/axiom/tree-node-loader";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const dbJurisdictionId = params.get("jurisdiction") ?? "";
  const hasCitationPaths = params.get("hasCitationPaths") === "1";
  const encodedOnly = params.get("encodedOnly") === "1";
  const page = Number(params.get("page") ?? "0");
  const rawSegments = params.get("segments") ?? "";
  const ruleSegments = rawSegments
    ? rawSegments.split("/").map(decodeSegment).filter(Boolean)
    : [];

  if (!dbJurisdictionId || !Number.isInteger(page) || page < 0) {
    return NextResponse.json(
      { error: "Invalid tree navigation request." },
      { status: 400 }
    );
  }

  try {
    const result = await loadTreeNodes({
      dbJurisdictionId,
      ruleSegments,
      hasCitationPaths,
      encodedOnly,
      page,
    });
    return NextResponse.json({
      nodes: result.nodes,
      hasMore: result.hasMore,
      currentRule: result.currentRule ?? null,
      leafRule: result.leafRule ?? null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Navigation data is temporarily unavailable.",
      },
      { status: 503 }
    );
  }
}

function decodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}
