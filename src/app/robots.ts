import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/axiom/metadata";

/**
 * Open policy — we actively want axiom rule pages to be crawled and
 * indexed so external citations (papers, LLM retrieval, policy tools)
 * can resolve them. The sitemap below enumerates every ingested
 * citation_path.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/" }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
