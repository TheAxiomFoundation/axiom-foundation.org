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
// Bun resolves the TypeScript import (and the repo's tsconfig paths)
// directly, so the script reuses the app's canonical RuleSpec parser.
import { parseRuleSpec, tokenizeFormula } from "../src/lib/axiom/rulespec/doc.ts";

const GITHUB_ORG = "TheAxiomFoundation";
const RAW_FETCH_CONCURRENCY = 8;
const UPSERT_CHUNK_SIZE = 100;

const REPO_TO_CITATION_BUCKET = {
  statutes: "statute",
  regulations: "regulation",
  policies: "policy",
};
const RULESPEC_BUCKETS = new Set([
  "statutes",
  "regulations",
  "policies",
  "manuals",
  "rulemaking",
  "forms",
  "guidance",
]);

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

const githubHeaders = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  ...(process.env.GITHUB_TOKEN
    ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
    : {}),
};

async function githubJson(url) {
  const res = await fetch(url, { headers: githubHeaders });
  if (!res.ok) throw new Error(`GitHub returned ${res.status} for ${url}`);
  return res.json();
}

function isJurisdictionSegment(value) {
  return (
    value === "us" ||
    value === "uk" ||
    value === "be" ||
    value === "nz" ||
    value === "ca" ||
    /^be-[a-z-]+$/.test(value) ||
    /^us-[a-z]{2}$/.test(value) ||
    /^uk-[a-z-]+$/.test(value)
  );
}

function jurisdictionFromRepoName(repoName) {
  const suffix = repoName.replace(/^rulespec-/, "");
  if (!suffix || suffix === repoName) return null;
  return suffix;
}

/**
 * App-surface visibility marker (.axiom/registry.toml). Absent file/key or
 * any fetch failure means "public" so a hiccup can't hide a live country;
 * an explicit `app_visibility = "experimental"` keeps a repo off the
 * encoded-search index (stale rows are removed by the end-of-run cleanup).
 * Parsed line-wise — keep the marker in simple `key = "value"` form.
 */
async function fetchAppVisibility(repo) {
  const url = `https://raw.githubusercontent.com/${GITHUB_ORG}/${repo.name}/${repo.default_branch}/.axiom/registry.toml`;
  const res = await fetch(url, { headers: githubHeaders }).catch(() => null);
  if (!res || !res.ok) return "public";
  const text = await res.text().catch(() => null);
  if (!text) return "public";
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*app_visibility\s*=\s*"([a-z]+)"\s*(?:#.*)?$/);
    if (match) return match[1] === "experimental" ? "experimental" : "public";
  }
  return "public";
}

/**
 * Discover jurisdiction roots across the org's rulespec-* repos:
 * monorepos with per-jurisdiction directories (rulespec-us → us/,
 * us-co/, …) and standalone repos with buckets at top level
 * (rulespec-nz).
 */
async function discoverRoots() {
  const repos = await githubJson(
    `https://api.github.com/orgs/${GITHUB_ORG}/repos?per_page=100&type=all&sort=pushed`
  );
  const roots = [];
  for (const repo of repos) {
    if (!repo.name.startsWith("rulespec-")) continue;
    if ((await fetchAppVisibility(repo)) === "experimental") {
      console.log(`skip ${repo.name}: app_visibility=experimental`);
      continue;
    }
    let tree;
    try {
      tree = await githubJson(
        `https://api.github.com/repos/${GITHUB_ORG}/${repo.name}/git/trees/${repo.default_branch}`
      );
    } catch (error) {
      console.warn(`skip ${repo.name}: ${error.message}`);
      continue;
    }
    const entries = tree.tree ?? [];
    const jurisdictionDirs = entries
      .filter(
        (entry) => entry.type === "tree" && isJurisdictionSegment(entry.path)
      )
      .map((entry) => entry.path);
    if (jurisdictionDirs.length > 0) {
      for (const jurisdiction of jurisdictionDirs) {
        roots.push({
          repo: repo.name,
          branch: repo.default_branch,
          jurisdiction,
          prefix: jurisdiction,
        });
      }
      continue;
    }
    if (
      entries.some(
        (entry) => entry.type === "tree" && RULESPEC_BUCKETS.has(entry.path)
      )
    ) {
      const jurisdiction = jurisdictionFromRepoName(repo.name);
      if (jurisdiction) {
        roots.push({
          repo: repo.name,
          branch: repo.default_branch,
          jurisdiction,
          prefix: null,
        });
      }
    }
  }
  return roots;
}

function isEncodingFile(path) {
  return (
    path.endsWith(".yaml") &&
    !path.endsWith(".test.yaml") &&
    !path.endsWith(".meta.yaml") &&
    // Repo plumbing beside the buckets — .axiom/ manifests, .github/
    // config, and sources/ corpus slices (plain YAML mirrors of the
    // encodings in root-layout repos like rulespec-ca).
    !isRepoPlumbingSegment(path.split("/")[0])
  );
}

function isRepoPlumbingSegment(segment) {
  return segment.startsWith(".") || segment === "sources";
}

/** Mirror of parseTreeEntries + normaliseTitleSegment in repo-listing.ts. */
function toEncodedFile(path, jurisdiction) {
  const stripped = path.replace(/\.yaml$/, "");
  const segs = stripped.split("/");
  const repoBucket = segs[0];
  const citationBucket = REPO_TO_CITATION_BUCKET[repoBucket] ?? repoBucket;
  let tail = segs.slice(1);
  if (jurisdiction === "us" && repoBucket === "regulations" && tail.length > 0) {
    tail = [...tail];
    tail[0] = tail[0].replace(/-cfr$/, "");
  }
  const joined = tail.join("/");
  return {
    filePath: path,
    citationPath: joined
      ? `${jurisdiction}/${citationBucket}/${joined}`
      : `${jurisdiction}/${citationBucket}`,
    bucket: repoBucket,
  };
}

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
  return (body.tree ?? [])
    .filter((entry) => entry.type === "blob" && isEncodingFile(entry.path))
    .map((entry) => ({ ...toEncodedFile(entry.path, root.jurisdiction), root }));
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
