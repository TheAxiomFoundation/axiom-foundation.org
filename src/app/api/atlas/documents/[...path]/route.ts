/* v8 ignore start -- thin Next route wrapper */
import type { NextRequest } from "next/server";
import {
  ATLAS_API_SCHEMA_VERSION,
  AtlasApiError,
  atlasApiErrorResponse,
  atlasApiJson,
  atlasApiOptions,
  getAtlasDocumentByCitationPath,
  parseAtlasDocumentTreeOptions,
} from "@/lib/atlas-api";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return atlasApiOptions();
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> }
) {
  try {
    const { path = [] } = await context.params;
    const citationPath = path.join("/");
    const options = parseAtlasDocumentTreeOptions(request.nextUrl.searchParams);
    const document = await getAtlasDocumentByCitationPath(citationPath, options);

    if (!document) {
      throw new AtlasApiError(404, "Atlas document not found.", {
        citation_path: citationPath,
      });
    }

    return atlasApiJson({
      schema_version: ATLAS_API_SCHEMA_VERSION,
      data: document,
      query: {
        depth: options.depth,
        child_limit: options.childLimit,
        include_body: options.includeBody,
      },
    });
  } catch (error) {
    return atlasApiErrorResponse(error);
  }
}
/* v8 ignore stop */
