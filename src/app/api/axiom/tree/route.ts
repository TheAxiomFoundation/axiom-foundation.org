import { NextResponse, type NextRequest } from "next/server";
import { loadTreeNodes } from "@/lib/axiom/tree-node-loader";
import {
  NavigationIndexMissingError,
  NavigationIndexUnavailableError,
} from "@/lib/axiom/navigation-index/read";

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
    const missing = error instanceof NavigationIndexMissingError;
    const unavailable = error instanceof NavigationIndexUnavailableError;
    // The client sees a friendly message; the cause must survive
    // somewhere or 503s become undebuggable (title-26 regression,
    // 2026-07-17).
    console.error(
      `tree route failed for ${dbJurisdictionId}/${rawSegments}:`,
      error
    );
    return NextResponse.json(
      {
        error:
          unavailable
            ? "Navigation data is temporarily unavailable."
            : error instanceof Error
            ? error.message
            : "Navigation data is temporarily unavailable.",
      },
      { status: missing ? 404 : 503 }
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
