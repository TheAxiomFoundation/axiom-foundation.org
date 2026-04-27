/* v8 ignore start -- thin Next route wrapper */
import type { NextRequest } from "next/server";
import {
  atlasApiErrorResponse,
  atlasApiJson,
  atlasApiOptions,
  listAtlasDocuments,
  parseAtlasDocumentListOptions,
} from "@/lib/atlas-api";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return atlasApiOptions();
}

export async function GET(request: NextRequest) {
  try {
    const options = parseAtlasDocumentListOptions(request.nextUrl.searchParams);
    const result = await listAtlasDocuments(options);
    return atlasApiJson(result);
  } catch (error) {
    return atlasApiErrorResponse(error);
  }
}
/* v8 ignore stop */
