/* v8 ignore start -- thin Next route wrapper */
import type { NextRequest } from "next/server";
import {
  AXIOM_API_SCHEMA_VERSION,
  AxiomApiError,
  axiomApiErrorResponse,
  axiomApiJson,
  axiomApiOptions,
  getAxiomDocumentByCitationPath,
  parseAxiomDocumentTreeOptions,
} from "@/lib/axiom-api";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return axiomApiOptions();
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> }
) {
  try {
    const { path = [] } = await context.params;
    const citationPath = path.join("/");
    const options = parseAxiomDocumentTreeOptions(request.nextUrl.searchParams);
    const document = await getAxiomDocumentByCitationPath(citationPath, options);

    if (!document) {
      throw new AxiomApiError(404, "Axiom document not found.", {
        citation_path: citationPath,
      });
    }

    return axiomApiJson({
      schema_version: AXIOM_API_SCHEMA_VERSION,
      data: document,
      query: {
        depth: options.depth,
        child_limit: options.childLimit,
        include_body: options.includeBody,
      },
    });
  } catch (error) {
    return axiomApiErrorResponse(error);
  }
}
/* v8 ignore stop */
