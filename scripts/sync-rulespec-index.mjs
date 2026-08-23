#!/usr/bin/env bun
/**
 * Sync the rulespec-* GitHub repos into the encodings.rulespec_files
 * search index and the encodings.rule_citations reader index.
 *
 * One row per encoding YAML: citation path, raw YAML, source citation
 * paths, and a pre-tokenised search_text (path segments, rule names,
 * formula identifiers, module summary). The Axiom app's encoded-search
 * lane queries this table first and only falls back to crawling GitHub
 * at request time when the table is missing or empty.
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
import {
  parseRuleSpec,
  tokenizeFormula,
} from "../src/lib/axiom/rulespec/doc.ts";
import { ruleCitationRows } from "../src/lib/axiom/rulespec/source-citations.ts";
import { parseTreeEntries } from "../src/lib/axiom/rulespec/repo-listing.ts";
import {
  GITHUB_ORG,
  discoverRoots,
  githubHeaders,
  githubJson,
} from "./lib/rulespec-discovery.mjs";
import { citationPathSetsForFile } from "./lib/source-citation-paths.mjs";

const RAW_FETCH_CONCURRENCY = 8;
const UPSERT_CHUNK_SIZE = 100;
const RULE_CITATION_DELETE_CHUNK_SIZE = 25;
const RULE_CITATION_UPSERT_CHUNK_SIZE = 500;

const supabaseUrl =
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceKey) {
  console.error(
    "Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) or SUPABASE_SERVICE_ROLE_KEY.",
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  db: { schema: "encodings" },
  auth: { autoRefreshToken: false, persistSession: false },
});

async function listFiles(root) {
  const treePath = root.prefix ? `${root.branch}:${root.prefix}` : root.branch;
  const body = await githubJson(
    `https://api.github.com/repos/${GITHUB_ORG}/${root.repo}/git/trees/${encodeURIComponent(treePath)}?recursive=1`,
  );
  if (!Array.isArray(body.tree)) {
    console.warn(
      `tree missing entries for ${root.repo}:${root.prefix ?? ""}`,
    );
    return { complete: false, files: [] };
  }
  if (body.truncated) {
    console.warn(`tree truncated for ${root.repo}:${root.prefix ?? ""}`);
  }
  return {
    complete: !body.truncated,
    files: parseTreeEntries(body, root.jurisdiction).map((file) => ({
      ...file,
      root,
    })),
  };
}

async function fetchRawYaml(file) {
  const prefixedPath = file.root.prefix
    ? `${file.root.prefix}/${file.filePath}`
    : file.filePath;
  const url = `https://raw.githubusercontent.com/${GITHUB_ORG}/${file.root.repo}/${file.root.branch}/${prefixedPath}`;
  const res = await fetch(url, { headers: githubHeaders });
  if (!res.ok) {
    throw new Error(`GitHub returned ${res.status} for ${url}`);
  }
  return res.text();
}

/** Bag of words the app's OR-of-terms candidate query matches against. */
function buildSearchText(file, doc) {
  const parts = [
    file.citationPath.replace(/[/_-]+/g, " "),
    file.filePath.replace(/[/_.-]+/g, " "),
  ];
  if (doc) {
    if (doc.module.summary) parts.push(doc.module.summary);
    for (const rule of doc.rules) {
      parts.push(rule.name.replace(/_/g, " "));
      if (rule.source) parts.push(rule.source);
      for (const version of rule.versions) {
        if (!version.formula) continue;
        for (const segment of tokenizeFormula(version.formula)) {
          if (segment.isIdentifier) {
            parts.push(segment.text.replace(/_/g, " "));
          }
        }
      }
    }
  }
  const tokens = new Set(
    parts
      .join(" ")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length >= 2),
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
    }),
  );
  return out;
}

const startedAt = new Date().toISOString();
const incomplete = {
  discoveryTrees: 0,
  emptyDiscovery: false,
  rootListings: 0,
  rawFiles: 0,
  invalidFiles: 0,
};
const roots = await discoverRoots(() => {
  incomplete.discoveryTrees += 1;
});
if (roots.length === 0) incomplete.emptyDiscovery = true;
console.log(`${roots.length} jurisdiction roots discovered`);

const seen = new Set();
const files = [];
for (const root of roots) {
  try {
    const listing = await listFiles(root);
    if (!listing.complete) incomplete.rootListings += 1;
    for (const file of listing.files) {
      if (seen.has(file.citationPath)) continue;
      seen.add(file.citationPath);
      files.push(file);
    }
  } catch (error) {
    incomplete.rootListings += 1;
    console.warn(
      `skip ${root.repo}:${root.prefix ?? ""} listing: ${error.message}`,
    );
  }
}
console.log(`${files.length} encoding files listed`);

const indexedFiles = (
  await mapWithConcurrency(files, RAW_FETCH_CONCURRENCY, async (file) => {
    let content;
    try {
      content = await fetchRawYaml(file);
    } catch (error) {
      incomplete.rawFiles += 1;
      console.warn(
        `skip ${file.root.repo}:${file.filePath} raw YAML: ${error.message}`,
      );
      return null;
    }

    let doc;
    let citations;
    try {
      doc = parseRuleSpec(content);
      citations = ruleCitationRows(
        doc,
        file.citationPath,
        file.filePath,
        file.root.repo,
        file.root.jurisdiction,
      );
    } catch (error) {
      incomplete.invalidFiles += 1;
      console.warn(
        `skip ${file.root.repo}:${file.filePath} indexing: ${error.message}`,
      );
      return null;
    }
    const citationPathSets = citationPathSetsForFile(
      content,
      `${file.root.repo}:${file.filePath}`,
    );
    const syncedAt = new Date().toISOString();
    return {
      fileRow: {
        citation_path: file.citationPath,
        file_path: file.filePath,
        repo: file.root.repo,
        branch: file.root.branch,
        jurisdiction: file.root.jurisdiction,
        bucket: file.bucket,
        raw_yaml: content,
        search_text: buildSearchText(file, doc),
        source_citation_paths: citationPathSets.all,
        value_citation_paths: citationPathSets.values,
        synced_at: syncedAt,
      },
      ruleCitationRows: citations.map((row) => ({
        ...row,
        synced_at: syncedAt,
      })),
    };
  })
).filter(Boolean);

const rows = indexedFiles.map(({ fileRow }) => fileRow);

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

// Replace each synced module's materialized rules before inserting its
// current rows. Batching the module predicates keeps requests bounded while
// ensuring modules that now have zero citations also lose their old rows.
let ruleCitationRowsUpserted = 0;
for (
  let i = 0;
  i < indexedFiles.length;
  i += RULE_CITATION_DELETE_CHUNK_SIZE
) {
  const moduleChunk = indexedFiles.slice(
    i,
    i + RULE_CITATION_DELETE_CHUNK_SIZE,
  );
  const moduleCitationPaths = moduleChunk.map(
    ({ fileRow }) => fileRow.citation_path,
  );
  const { error: resetError } = await supabase
    .from("rule_citations")
    .delete()
    .in("module_citation_path", moduleCitationPaths);
  if (resetError) {
    console.error(
      `rule citation reset failed at module chunk ${i}: ${resetError.message}`,
    );
    process.exit(1);
  }

  const citationRows = moduleChunk.flatMap(
    ({ ruleCitationRows: moduleRows }) => moduleRows,
  );
  for (
    let j = 0;
    j < citationRows.length;
    j += RULE_CITATION_UPSERT_CHUNK_SIZE
  ) {
    const chunk = citationRows.slice(j, j + RULE_CITATION_UPSERT_CHUNK_SIZE);
    const { error } = await supabase.from("rule_citations").upsert(chunk, {
      onConflict: "citation_path,module_citation_path,rule_name",
    });
    if (error) {
      console.error(
        `rule citation upsert failed at module chunk ${i}, row ${j}: ${error.message}`,
      );
      process.exit(1);
    }
    ruleCitationRowsUpserted += chunk.length;
  }
}
console.log(`${ruleCitationRowsUpserted} rule citation rows upserted`);
console.log(
  `${indexedFiles.filter(({ ruleCitationRows: moduleRows }) => moduleRows.length === 0).length} modules with zero rule citations`,
);

const incompleteReasons = [
  incomplete.emptyDiscovery ? "discovery returned no roots" : null,
  incomplete.discoveryTrees > 0
    ? `${incomplete.discoveryTrees} skipped discovery tree(s)`
    : null,
  incomplete.rootListings > 0
    ? `${incomplete.rootListings} incomplete root listing(s)`
    : null,
  incomplete.rawFiles > 0
    ? `${incomplete.rawFiles} raw YAML fetch failure(s)`
    : null,
  incomplete.invalidFiles > 0
    ? `${incomplete.invalidFiles} invalid or unindexable YAML file(s)`
    : null,
].filter(Boolean);

if (incompleteReasons.length > 0) {
  console.warn(
    `stale cleanup skipped because the sync was incomplete: ${incompleteReasons.join(
      ", ",
    )}`,
  );
} else {
  // Rows not touched by a complete run no longer exist upstream.
  const { error: deleteError, count } = await supabase
    .from("rulespec_files")
    .delete({ count: "exact" })
    .lt("synced_at", startedAt);
  if (deleteError) {
    console.error(`stale-row cleanup failed: ${deleteError.message}`);
    process.exit(1);
  }
  console.log(`${count ?? 0} stale rows removed`);

  const { error: citationDeleteError, count: citationDeleteCount } =
    await supabase
      .from("rule_citations")
      .delete({ count: "exact" })
      .lt("synced_at", startedAt);
  if (citationDeleteError) {
    console.error(
      `stale rule citation cleanup failed: ${citationDeleteError.message}`,
    );
    process.exit(1);
  }
  console.log(`${citationDeleteCount ?? 0} stale rule citation rows removed`);
}
