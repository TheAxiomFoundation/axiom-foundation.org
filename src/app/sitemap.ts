import type { MetadataRoute } from "next";
import { supabaseAkn } from "@/lib/supabase";
import { SITE_URL } from "@/lib/atlas/metadata";

/**
 * Sitemap pagination for the Atlas.
 *
 * Each rule URL is addressed at its atomic ``citation_path`` — the
 * same atomic grammar the viewer uses. The atlas is large enough
 * that a ``count('exact')`` scan of ``akn.rules`` regularly hits
 * statement-timeout, so we skip the count and pre-declare a
 * generous upper bound of chunks. Empty tail chunks render as
 * empty sitemaps, which Google tolerates.
 *
 * ``CHUNK_SIZE`` is capped at the Supabase default
 * ``max_rows`` so each sitemap is a single round-trip.
 */

const CHUNK_SIZE = 1000;
/**
 * Upper bound on paginated sitemap chunks. Each chunk is a
 * build-time Supabase query so leaving a lot of empty chunks just
 * wastes build time. Grow when the ingested corpus visibly exceeds
 * ``MAX_CHUNKS * CHUNK_SIZE``. The count RPC isn't indexable cheaply
 * so we keep this static rather than auto-sized.
 */
const MAX_CHUNKS = 20;

export function generateSitemaps(): { id: number }[] {
  return Array.from({ length: MAX_CHUNKS }, (_, id) => ({ id }));
}

const STATIC_ENTRIES: MetadataRoute.Sitemap = [
  {
    url: `${SITE_URL}/`,
    priority: 1.0,
    changeFrequency: "weekly",
  },
  {
    url: `${SITE_URL}/atlas`,
    priority: 0.9,
    changeFrequency: "daily",
  },
  {
    url: `${SITE_URL}/about`,
    priority: 0.5,
    changeFrequency: "monthly",
  },
  {
    url: `${SITE_URL}/stack`,
    priority: 0.5,
    changeFrequency: "monthly",
  },
  {
    url: `${SITE_URL}/autorac`,
    priority: 0.6,
    changeFrequency: "weekly",
  },
];

export default async function sitemap({
  id,
}: {
  id: number | string;
}): Promise<MetadataRoute.Sitemap> {
  // Next 16 passes ``id`` as a string; coerce defensively so the
  // offset math doesn't collapse to NaN.
  const chunk = typeof id === "number" ? id : Number.parseInt(id, 10);
  const safeChunk = Number.isFinite(chunk) ? chunk : 0;
  const offset = safeChunk * CHUNK_SIZE;
  const { data, error } = await supabaseAkn
    .from("rules")
    .select("citation_path, updated_at, has_rac")
    .not("citation_path", "is", null)
    .order("citation_path", { ascending: true })
    .range(offset, offset + CHUNK_SIZE - 1);

  if (error) {
    return safeChunk === 0 ? STATIC_ENTRIES : [];
  }
  if (!data || data.length === 0) {
    return safeChunk === 0 ? STATIC_ENTRIES : [];
  }

  const ruleEntries: MetadataRoute.Sitemap = data
    .filter((row): row is { citation_path: string; updated_at: string; has_rac: boolean } =>
      Boolean(row.citation_path)
    )
    .map((row) => ({
      url: `${SITE_URL}/atlas/${row.citation_path}`,
      lastModified: row.updated_at ? new Date(row.updated_at) : undefined,
      changeFrequency: "monthly" as const,
      // Encoded rules are higher-value destinations — give the crawler
      // a priority hint so freshly-encoded rules surface faster.
      priority: row.has_rac ? 0.8 : 0.6,
    }));

  return safeChunk === 0 ? [...STATIC_ENTRIES, ...ruleEntries] : ruleEntries;
}
