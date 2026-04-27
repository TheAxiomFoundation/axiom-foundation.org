/* v8 ignore start -- thin Next route wrapper */
import type { NextRequest } from "next/server";
import {
  atlasApiJson,
  atlasApiOptions,
  makeAtlasApiDiscovery,
} from "@/lib/atlas-api";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return atlasApiOptions();
}

export function GET(request: NextRequest) {
  return atlasApiJson(makeAtlasApiDiscovery(request.nextUrl.origin));
}
/* v8 ignore stop */
