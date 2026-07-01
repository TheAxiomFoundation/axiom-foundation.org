import { supabaseEncodings } from "@/lib/supabase";

/**
 * Read side of the encodings.rulespec_files search index (populated by
 * scripts/sync-rulespec-index.mjs).
 *
 * Returns candidate encoding files for a token set in a single indexed
 * query — including the raw YAML, so the caller can score rule symbols
 * locally without any GitHub round-trips. Returns null when the index
 * cannot answer (table missing, query error, or not yet populated);
 * the caller then falls back to crawling GitHub at request time.
 */
export interface IndexedRuleSpecFile {
  filePath: string;
  citationPath: string;
  bucket: string;
  jurisdiction: string;
  rawYaml: string | null;
}

const CANDIDATE_LIMIT = 400;

export async function fetchIndexedRuleSpecCandidates(
  tokens: string[],
  hintedJurisdictions: Set<string>,
  bucket: string | null
): Promise<IndexedRuleSpecFile[] | null> {
  if (tokens.length === 0) return [];
  try {
    let builder = supabaseEncodings
      .from("rulespec_files")
      .select("file_path, citation_path, bucket, jurisdiction, raw_yaml")
      // OR of sanitised single terms — tokens come from tokenise(), so
      // they are lowercase alphanumerics safe to splice into a tsquery.
      .textSearch("search_tsv", tokens.join(" | "))
      .limit(CANDIDATE_LIMIT);
    if (hintedJurisdictions.size > 0) {
      builder = builder.in("jurisdiction", [...hintedJurisdictions]);
    }
    if (bucket) builder = builder.eq("bucket", bucket);
    const { data, error } = await builder;
    if (error) return null;

    if (!data || data.length === 0) {
      // Distinguish "no match" from "index not populated yet".
      const { count, error: countError } = await supabaseEncodings
        .from("rulespec_files")
        .select("citation_path", { count: "exact", head: true });
      if (countError || !count) return null;
      return [];
    }

    return data.map((row) => ({
      filePath: row.file_path as string,
      citationPath: row.citation_path as string,
      bucket: row.bucket as string,
      jurisdiction: row.jurisdiction as string,
      rawYaml: (row.raw_yaml as string | null) ?? null,
    }));
  } catch {
    return null;
  }
}
