import { supabaseArch, type Rule } from "@/lib/supabase";

export const ATLAS_API_SCHEMA_VERSION = "2026-04-25";
export const ATLAS_API_DEFAULT_LIMIT = 100;
export const ATLAS_API_MAX_LIMIT = 500;
export const ATLAS_API_DEFAULT_DEPTH = 1;
export const ATLAS_API_MAX_DEPTH = 8;
export const ATLAS_API_DEFAULT_CHILD_LIMIT = 500;
export const ATLAS_API_MAX_CHILD_LIMIT = 1000;

const PUBLIC_RULE_COLUMNS =
  "id,jurisdiction,doc_type,parent_id,level,ordinal,heading,effective_date,repeal_date,source_url,source_path,citation_path,rulespec_path,has_rulespec,created_at,updated_at";
const PUBLIC_RULE_COLUMNS_WITH_BODY = `${PUBLIC_RULE_COLUMNS},body`;

export const ATLAS_API_CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const ATLAS_API_CACHE_HEADERS: Record<string, string> = {
  "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=3600",
};

export class AtlasApiError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = "AtlasApiError";
    this.status = status;
    this.details = details;
  }
}

export interface PublicAtlasRule {
  id: string;
  jurisdiction: string;
  doc_type: string;
  parent_id: string | null;
  level: number;
  ordinal: number | null;
  heading: string | null;
  citation_path: string | null;
  citation_segments: string[];
  effective_date: string | null;
  repeal_date: string | null;
  source_url: string | null;
  source_path: string | null;
  rulespec_path: string | null;
  has_rulespec: boolean;
  created_at: string;
  updated_at: string;
  body?: string | null;
  links: {
    self: string;
    html: string;
    children: string;
  };
}

export interface PublicAtlasDocument extends PublicAtlasRule {
  subsection_count?: number;
  subsections_truncated?: boolean;
  subsections?: PublicAtlasDocument[];
}

export interface AtlasDocumentListOptions {
  id?: string;
  jurisdiction?: string;
  docType?: string;
  parentId?: string;
  parentCitationPath?: string;
  citationPath?: string;
  root?: boolean;
  includeBody: boolean;
  limit: number;
  offset: number;
}

export interface AtlasDocumentTreeOptions {
  includeBody: boolean;
  depth: number;
  childLimit: number;
}

export interface AtlasDocumentListResult {
  schema_version: string;
  data: PublicAtlasRule[];
  pagination: {
    limit: number;
    offset: number;
    total: number | null;
    has_more: boolean;
  };
  filters: Partial<AtlasDocumentListOptions>;
}

function getParam(params: URLSearchParams, key: string): string | undefined {
  const value = params.get(key)?.trim();
  return value ? value : undefined;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function parseIntegerParam(
  params: URLSearchParams,
  key: string,
  defaultValue: number,
  min: number,
  max: number
): number {
  const raw = getParam(params, key);
  if (!raw) return defaultValue;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed)) {
    throw new AtlasApiError(400, `Query parameter "${key}" must be an integer.`);
  }
  return clamp(parsed, min, max);
}

function parseBooleanParam(
  params: URLSearchParams,
  key: string,
  defaultValue: boolean
): boolean {
  const raw = getParam(params, key);
  if (!raw) return defaultValue;

  const normalized = raw.toLowerCase();
  if (["1", "true", "yes"].includes(normalized)) return true;
  if (["0", "false", "no"].includes(normalized)) return false;

  throw new AtlasApiError(
    400,
    `Query parameter "${key}" must be true or false.`
  );
}

export function normalizeCitationPath(path: string): string {
  return path
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean)
    .join("/");
}

export function parseAtlasDocumentListOptions(
  params: URLSearchParams
): AtlasDocumentListOptions {
  return {
    id: getParam(params, "id"),
    jurisdiction: getParam(params, "jurisdiction"),
    docType: getParam(params, "doc_type"),
    parentId: getParam(params, "parent_id"),
    parentCitationPath: getParam(params, "parent_citation_path"),
    citationPath: getParam(params, "citation_path"),
    root: parseBooleanParam(params, "root", false),
    includeBody: parseBooleanParam(params, "include_body", false),
    limit: parseIntegerParam(
      params,
      "limit",
      ATLAS_API_DEFAULT_LIMIT,
      1,
      ATLAS_API_MAX_LIMIT
    ),
    offset: parseIntegerParam(params, "offset", 0, 0, Number.MAX_SAFE_INTEGER),
  };
}

export function parseAtlasDocumentTreeOptions(
  params: URLSearchParams
): AtlasDocumentTreeOptions {
  return {
    includeBody: parseBooleanParam(params, "include_body", true),
    depth: parseIntegerParam(
      params,
      "depth",
      ATLAS_API_DEFAULT_DEPTH,
      0,
      ATLAS_API_MAX_DEPTH
    ),
    childLimit: parseIntegerParam(
      params,
      "child_limit",
      ATLAS_API_DEFAULT_CHILD_LIMIT,
      1,
      ATLAS_API_MAX_CHILD_LIMIT
    ),
  };
}

export function encodeCitationPath(citationPath: string): string {
  return normalizeCitationPath(citationPath)
    .split("/")
    .map(encodeURIComponent)
    .join("/");
}

export function publicAtlasRuleFromRule(
  rule: Rule,
  options: { includeBody: boolean } = { includeBody: true }
): PublicAtlasRule {
  const citationPath = rule.citation_path ?? null;
  const apiPath = citationPath
    ? `/api/atlas/documents/${encodeCitationPath(citationPath)}`
    : `/api/atlas/documents?id=${encodeURIComponent(rule.id)}`;
  const htmlPath = citationPath
    ? `/atlas/${encodeCitationPath(citationPath)}`
    : `/atlas/${encodeURIComponent(rule.id)}`;

  return {
    id: rule.id,
    jurisdiction: rule.jurisdiction,
    doc_type: rule.doc_type,
    parent_id: rule.parent_id,
    level: rule.level,
    ordinal: rule.ordinal,
    heading: rule.heading,
    citation_path: citationPath,
    citation_segments: citationPath ? citationPath.split("/") : [],
    effective_date: rule.effective_date,
    repeal_date: rule.repeal_date,
    source_url: rule.source_url,
    source_path: rule.source_path,
    rulespec_path: rule.rulespec_path,
    has_rulespec: rule.has_rulespec,
    created_at: rule.created_at,
    updated_at: rule.updated_at,
    ...(options.includeBody ? { body: rule.body ?? null } : {}),
    links: {
      self: apiPath,
      html: htmlPath,
      children: `/api/atlas/documents?parent_id=${encodeURIComponent(rule.id)}`,
    },
  };
}

export function atlasApiHeaders(extra?: HeadersInit): Headers {
  const headers = new Headers({
    ...ATLAS_API_CORS_HEADERS,
    ...ATLAS_API_CACHE_HEADERS,
  });

  if (extra) {
    new Headers(extra).forEach((value, key) => headers.set(key, value));
  }

  return headers;
}

export function atlasApiJson(
  body: unknown,
  init: ResponseInit = {}
): Response {
  return Response.json(body, {
    ...init,
    headers: atlasApiHeaders(init.headers),
  });
}

export function atlasApiOptions(): Response {
  return new Response(null, {
    status: 204,
    headers: atlasApiHeaders({ "Cache-Control": "no-store" }),
  });
}

export function atlasApiErrorPayload(error: unknown): {
  status: number;
  body: { error: string; details?: unknown };
} {
  if (error instanceof AtlasApiError) {
    return {
      status: error.status,
      body: {
        error: error.message,
        ...(error.details === undefined ? {} : { details: error.details }),
      },
    };
  }

  return {
    status: 500,
    body: { error: "Atlas API request failed." },
  };
}

export function atlasApiErrorResponse(error: unknown): Response {
  const payload = atlasApiErrorPayload(error);
  return atlasApiJson(payload.body, {
    status: payload.status,
    headers: { "Cache-Control": "no-store" },
  });
}

export function makeAtlasApiDiscovery(origin = "https://axiom-foundation.org") {
  const base = origin.replace(/\/+$/, "") + "/api/atlas";
  return {
    name: "Axiom Atlas API",
    schema_version: ATLAS_API_SCHEMA_VERSION,
    description:
      "Public JSON access to law documents, citation paths, and subsection structure.",
    endpoints: {
      documents: {
        href: `${base}/documents`,
        query: [
          "jurisdiction",
          "doc_type",
          "parent_id",
          "parent_citation_path",
          "citation_path",
          "root",
          "include_body",
          "limit",
          "offset",
        ],
      },
      document: {
        href: `${base}/documents/{citation_path}`,
        query: ["depth", "child_limit", "include_body"],
      },
    },
    examples: [
      `${base}/documents?jurisdiction=us&doc_type=statute&root=true&limit=25`,
      `${base}/documents/us/statute/26/32?depth=3`,
      `${base}/documents?parent_citation_path=us/statute/26/32&include_body=true`,
    ],
  };
}

function compactFilters(
  filters: Partial<AtlasDocumentListOptions>
): Partial<AtlasDocumentListOptions> {
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== undefined)
  ) as Partial<AtlasDocumentListOptions>;
}

/* v8 ignore start -- Supabase-backed query plumbing is exercised by integration */
function selectColumns(includeBody: boolean): string {
  return includeBody ? PUBLIC_RULE_COLUMNS_WITH_BODY : PUBLIC_RULE_COLUMNS;
}

async function resolveParentId(parentCitationPath: string): Promise<string> {
  const normalized = normalizeCitationPath(parentCitationPath);
  const { data, error } = await supabaseArch
    .from("rules")
    .select("id")
    .eq("citation_path", normalized)
    .single();

  if (error || !data) {
    throw new AtlasApiError(404, "Parent citation path not found.", {
      parent_citation_path: normalized,
    });
  }

  return data.id;
}

export async function listAtlasDocuments(
  options: AtlasDocumentListOptions
): Promise<AtlasDocumentListResult> {
  const parentId = options.parentCitationPath
    ? await resolveParentId(options.parentCitationPath)
    : options.parentId;
  let query: any = supabaseArch
    .from("rules")
    .select(selectColumns(options.includeBody));

  if (options.id) query = query.eq("id", options.id);
  if (options.jurisdiction) query = query.eq("jurisdiction", options.jurisdiction);
  if (options.docType) query = query.eq("doc_type", options.docType);
  if (options.citationPath) {
    query = query.eq("citation_path", normalizeCitationPath(options.citationPath));
  }
  if (parentId) {
    query = query.eq("parent_id", parentId);
  } else if (options.root) {
    query = query.is("parent_id", null);
  }

  if (parentId) {
    query = query.order("ordinal");
  }

  const { data, error } = await query.range(
    options.offset,
    options.offset + options.limit
  );

  if (error) {
    throw new AtlasApiError(500, "Failed to fetch Atlas documents.", error);
  }

  const fetchedRows = (data || []) as unknown as Rule[];
  const hasMore = fetchedRows.length > options.limit;
  const rows = hasMore ? fetchedRows.slice(0, options.limit) : fetchedRows;

  return {
    schema_version: ATLAS_API_SCHEMA_VERSION,
    data: rows.map((rule) =>
      publicAtlasRuleFromRule(rule, { includeBody: options.includeBody })
    ),
    pagination: {
      limit: options.limit,
      offset: options.offset,
      total: null,
      has_more: hasMore,
    },
    filters: compactFilters({
      id: options.id,
      jurisdiction: options.jurisdiction,
      docType: options.docType,
      parentId,
      parentCitationPath: options.parentCitationPath,
      citationPath: options.citationPath,
      root: options.root || undefined,
      includeBody: options.includeBody || undefined,
    }),
  };
}

async function hydrateDocumentTree(
  rule: Rule,
  options: AtlasDocumentTreeOptions
): Promise<PublicAtlasDocument> {
  const document: PublicAtlasDocument = publicAtlasRuleFromRule(rule, {
    includeBody: options.includeBody,
  });

  if (options.depth <= 0) return document;

  const { data, error, count } = await supabaseArch
    .from("rules")
    .select(selectColumns(options.includeBody), { count: "exact" })
    .eq("parent_id", rule.id)
    .order("ordinal")
    .range(0, options.childLimit - 1);

  if (error) {
    throw new AtlasApiError(500, "Failed to fetch Atlas subsections.", error);
  }

  const children = (data || []) as unknown as Rule[];
  const childOptions = { ...options, depth: options.depth - 1 };

  document.subsection_count = count ?? children.length;
  document.subsections_truncated = document.subsection_count > children.length;
  document.subsections = await Promise.all(
    children.map((child) => hydrateDocumentTree(child, childOptions))
  );

  return document;
}

export async function getAtlasDocumentByCitationPath(
  citationPath: string,
  options: AtlasDocumentTreeOptions
): Promise<PublicAtlasDocument | null> {
  const normalized = normalizeCitationPath(citationPath);
  if (!normalized) {
    throw new AtlasApiError(400, "Citation path is required.");
  }

  const { data, error } = await supabaseArch
    .from("rules")
    .select(selectColumns(options.includeBody))
    .eq("citation_path", normalized)
    .single();

  if (error || !data) return null;

  return hydrateDocumentTree(data as unknown as Rule, options);
}
/* v8 ignore stop */
