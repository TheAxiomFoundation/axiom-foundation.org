import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/urls";

/**
 * Round 1 pull-back sitemap.
 *
 * Until the Jul 28 launch the site is a pre-launch tease: only Home,
 * About, and Team are public. The product pages (`/axiom`, `/encoder`,
 * `/format`, `/docs`, `/stack`) and the per-rule corpus pages are
 * unlinked + noindexed, so we deliberately do NOT advertise them here.
 *
 * At launch, restore the corpus-backed, chunked sitemap (see git
 * history: `generateSitemaps` + `current_provisions` scan) so external
 * citations can resolve encoded rule pages again.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/`, priority: 1.0, changeFrequency: "weekly" },
    { url: `${SITE_URL}/about`, priority: 0.6, changeFrequency: "monthly" },
    { url: `${SITE_URL}/team`, priority: 0.6, changeFrequency: "monthly" },
  ];
}
