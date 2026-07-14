import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/urls";

/**
 * Round 1 pull-back — the site is a pre-launch tease (Home · About ·
 * Team). Product pages and per-rule corpus pages are noindexed via
 * per-page metadata; the sitemap only lists the three public pages.
 *
 * At the Jul 28 launch, restore the chunked rule sitemaps (see
 * git history + `AXIOM_SITEMAP_CHUNKS`) so encoded rule pages are
 * crawled and indexed again.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/" }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
