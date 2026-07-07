#!/usr/bin/env bun
/**
 * Sync the rulespec-* GitHub repos into the encodings.rulespec_files
 * search index (see supabase/migrations/20260701000000_add_rulespec_files_index.sql).
 *
 * One row per encoding YAML: citation path, raw YAML, and a
 * pre-tokenised search_text (path segments, rule names, formula
 * identifiers, module summary). The Axiom app's encoded-search lane
 * queries this table first and only falls back to crawling GitHub at
 * request time when the table is missing or empty.
 *
 * Usage:
 *   SUPABASE_URL=https://<project>.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=... \
 *   [GITHUB_TOKEN=...] \
 *   bun scripts/sync-rulespec-index.mjs
 *
 * Run on a schedule (cron / GitHub Action) or as a post-merge hook on
 * the rulespec-* repos.
 */

import { createClient } from "@supabase/supabase-js";
// Bun resolves the TypeScript imports (and the repo's tsconfig paths)
// directly, so the script reuses the app's canonical RuleSpec parser
// and tree-listing logic instead of mirroring them — a mirror is how
// the index once kept a stale ca→canada slug mapping the app had
// already dropped.
import { parseRuleSpec, tokenizeFormula } from "../src/lib/axiom/rulespec/doc.ts";
import { parseTreeEntries } from "../src/lib/axiom/rulespec/repo-listing.ts";
import {
  GITHUB_ORG,
  discoverRoots,
  githubHeaders,
  githubJson,
} from "./lib/rulespec-discovery.mjs";

const RAW_FETCH_CONCURRENCY = 8;
const UPSERT_CHUNK_SIZE = 100;

const supabaseUrl =
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceKey) {
  console.error(
    "Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) or SUPABASE_SERVICE_ROLE_KEY."
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  db: { schema: "encodings" },
  auth: { autoRefreshToken: false, persistSession: false },
});

async function listFiles(root) {
  const treePath = root.prefix
    ? `${root.branch}:${root.prefix}`
    : root.branch;
  const body = await githubJson(
    `https://api.github.com/repos/${GITHUB_ORG}/${root.repo}/git/trees/${encodeURIComponent(treePath)}?recursive=1`
  );
  if (body.truncated) {
    console.warn(`tree truncated for ${root.repo}:${root.prefix ?? ""}`);
  }
  return parseTreeEntries(body, root.jurisdiction).map((file) => ({
    ...file,
    root,
  }));
}

async function fetchRawYaml(file) {
  const prefixedPath = file.root.prefix
    ? `${file.root.prefix}/${file.filePath}`
    : file.filePath;
  const url = `https://raw.githubusercontent.com/${GITHUB_ORG}/${file.root.repo}/${file.root.branch}/${prefixedPath}`;
  const res = await fetch(url, { headers: githubHeaders });
  if (!res.ok) return null;
  return res.text();
}

/** Bag of words the app's OR-of-terms candidate query matches against. */
function buildSearchText(file, content) {
  const parts = [
    file.citationPath.replace(/[/_-]+/g, " "),
    file.filePath.replace(/[/_.-]+/g, " "),
  ];
  if (content) {
    try {
      const doc = parseRuleSpec(content);
      if (doc.module.summary) parts.push(doc.module.summary);
      for (const rule of doc.rules) {
        parts.push(rule.name.replace(/_/g, " "));
        if (rule.source) parts.push(rule.source);
        for (const version of rule.versions) {
          if (!version.formula) continue;
          for (const segment of tokenizeFormula(version.formula)) {
            if (segment.isIdentifier) parts.push(segment.text.replace(/_/g, " "));
          }
        }
      }
    } catch {
      // Half-broken YAML still gets path-based search text.
    }
  }
  const tokens = new Set(
    parts
      .join(" ")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length >= 2)
  );
  return [...tokens].join(" ");
}

async function mapWithConcurrency(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const index = next++;
        out[index] = await fn(items[index]);
      }
    })
  );
  return out;
}

const startedAt = new Date().toISOString();
const roots = await discoverRoots();
console.log(`${roots.length} jurisdiction roots discovered`);

const seen = new Set();
const files = [];
for (const root of roots) {
  try {
    for (const file of await listFiles(root)) {
      if (seen.has(file.citationPath)) continue;
      seen.add(file.citationPath);
      files.push(file);
    }
  } catch (error) {
    console.warn(
      `skip ${root.repo}:${root.prefix ?? ""} listing: ${error.message}`
    );
  }
}
console.log(`${files.length} encoding files listed`);

const rows = (
  await mapWithConcurrency(files, RAW_FETCH_CONCURRENCY, async (file) => {
    const content = await fetchRawYaml(file).catch(() => null);
    return {
      citation_path: file.citationPath,
      file_path: file.filePath,
      repo: file.root.repo,
      branch: file.root.branch,
      jurisdiction: file.root.jurisdiction,
      bucket: file.bucket,
      raw_yaml: content,
      search_text: buildSearchText(file, content),
      synced_at: new Date().toISOString(),
    };
  })
).filter(Boolean);

let upserted = 0;
for (let i = 0; i < rows.length; i += UPSERT_CHUNK_SIZE) {
  const chunk = rows.slice(i, i + UPSERT_CHUNK_SIZE);
  const { error } = await supabase
    .from("rulespec_files")
    .upsert(chunk, { onConflict: "citation_path" });
  if (error) {
    console.error(`upsert failed at chunk ${i}: ${error.message}`);
    process.exit(1);
  }
  upserted += chunk.length;
}
console.log(`${upserted} rows upserted`);

// Rows not touched this run no longer exist upstream.
const { error: deleteError, count } = await supabase
  .from("rulespec_files")
  .delete({ count: "exact" })
  .lt("synced_at", startedAt);
if (deleteError) {
  console.error(`stale-row cleanup failed: ${deleteError.message}`);
  process.exit(1);
}
console.log(`${count ?? 0} stale rows removed`);
