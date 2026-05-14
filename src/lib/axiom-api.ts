import { supabaseCorpus, type Rule } from "@/lib/supabase";
import { AXIOM_APP_URL } from "@/lib/urls";
import { browseRootLevels } from "@/lib/axiom/browse-root-levels";

export const AXIOM_API_SCHEMA_VERSION = "2026-04-25";
export const AXIOM_API_DEFAULT_LIMIT = 100;
export const AXIOM_API_MAX_LIMIT = 500;
export const AXIOM_API_DEFAULT_DEPTH = 1;
export const AXIOM_API_MAX_DEPTH = 8;
export const AXIOM_API_DEFAULT_CHILD_LIMIT = 500;
export const AXIOM_API_MAX_CHILD_LIMIT = 1000;

const PUBLIC_RULE_COLUMNS =
  "id,jurisdiction,doc_type,parent_id,level,ordinal,heading,effective_date,repeal_date,source_url,source_path,citation_path,rulespec_path,has_rulespec,created_at,updated_at";
const PUBLIC_RULE_COLUMNS_WITH_BODY = `${PUBLIC_RULE_COLUMNS},body`;
const US_STATUTE_ROOT_PATHS = [
  "us/statute/1",
  "us/statute/2",
  "us/statute/3",
  "us/statute/4",
  "us/statute/5",
  "us/statute/6",
  "us/statute/7",
  "us/statute/8",
  "us/statute/9",
  "us/statute/10",
  "us/statute/11",
  "us/statute/12",
  "us/statute/13",
  "us/statute/14",
  "us/statute/15",
  "us/statute/16",
  "us/statute/17",
  "us/statute/18",
  "us/statute/19",
  "us/statute/20",
  "us/statute/21",
  "us/statute/22",
  "us/statute/23",
  "us/statute/24",
  "us/statute/25",
  "us/statute/26",
  "us/statute/27",
  "us/statute/28",
  "us/statute/29",
  "us/statute/30",
  "us/statute/31",
  "us/statute/32",
  "us/statute/33",
  "us/statute/34",
  "us/statute/35",
  "us/statute/36",
  "us/statute/37",
  "us/statute/38",
  "us/statute/39",
  "us/statute/40",
  "us/statute/41",
  "us/statute/42",
  "us/statute/43",
  "us/statute/44",
  "us/statute/45",
  "us/statute/46",
  "us/statute/47",
  "us/statute/48",
  "us/statute/49",
  "us/statute/50",
  "us/statute/51",
  "us/statute/52",
  "us/statute/54",
];

export const AXIOM_API_CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const AXIOM_API_CACHE_HEADERS: Record<string, string> = {
  "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=3600",
};

export class AxiomApiError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = "AxiomApiError";
    this.status = status;
    this.details = details;
  }
}

export interface PublicAxiomRule {
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

export interface PublicAxiomDocument extends PublicAxiomRule {
  subsection_count?: number;
  subsections_truncated?: boolean;
  subsections?: PublicAxiomDocument[];
}

export interface AxiomDocumentListOptions {
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

export interface AxiomDocumentTreeOptions {
  includeBody: boolean;
  depth: number;
  childLimit: number;
}

export interface AxiomDocumentListResult {
  schema_version: string;
  data: PublicAxiomRule[];
  pagination: {
    limit: number;
    offset: number;
    total: number | null;
    has_more: boolean;
  };
  filters: Partial<AxiomDocumentListOptions>;
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
    throw new AxiomApiError(400, `Query parameter "${key}" must be an integer.`);
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

  throw new AxiomApiError(
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

export function parseAxiomDocumentListOptions(
  params: URLSearchParams
): AxiomDocumentListOptions {
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
      AXIOM_API_DEFAULT_LIMIT,
      1,
      AXIOM_API_MAX_LIMIT
    ),
    offset: parseIntegerParam(params, "offset", 0, 0, Number.MAX_SAFE_INTEGER),
  };
}

export function parseAxiomDocumentTreeOptions(
  params: URLSearchParams
): AxiomDocumentTreeOptions {
  return {
    includeBody: parseBooleanParam(params, "include_body", true),
    depth: parseIntegerParam(
      params,
      "depth",
      AXIOM_API_DEFAULT_DEPTH,
      0,
      AXIOM_API_MAX_DEPTH
    ),
    childLimit: parseIntegerParam(
      params,
      "child_limit",
      AXIOM_API_DEFAULT_CHILD_LIMIT,
      1,
      AXIOM_API_MAX_CHILD_LIMIT
    ),
  };
}

export function encodeCitationPath(citationPath: string): string {
  return normalizeCitationPath(citationPath)
    .split("/")
    .map(encodeURIComponent)
    .join("/");
}

export function publicAxiomRuleFromRule(
  rule: Rule,
  options: { includeBody: boolean } = { includeBody: true }
): PublicAxiomRule {
  const citationPath = rule.citation_path ?? null;
  const apiPath = citationPath
    ? `/api/axiom/documents/${encodeCitationPath(citationPath)}`
    : `/api/axiom/documents?id=${encodeURIComponent(rule.id)}`;
  const htmlPath = citationPath
    ? `/${encodeCitationPath(citationPath)}`
    : `/${encodeURIComponent(rule.id)}`;

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
      children: `/api/axiom/documents?parent_id=${encodeURIComponent(rule.id)}`,
    },
  };
}

export function axiomApiHeaders(extra?: HeadersInit): Headers {
  const headers = new Headers({
    ...AXIOM_API_CORS_HEADERS,
    ...AXIOM_API_CACHE_HEADERS,
  });

  if (extra) {
    new Headers(extra).forEach((value, key) => headers.set(key, value));
  }

  return headers;
}

export function axiomApiJson(
  body: unknown,
  init: ResponseInit = {}
): Response {
  return Response.json(body, {
    ...init,
    headers: axiomApiHeaders(init.headers),
  });
}

export function axiomApiOptions(): Response {
  return new Response(null, {
    status: 204,
    headers: axiomApiHeaders({ "Cache-Control": "no-store" }),
  });
}

export function axiomApiErrorPayload(error: unknown): {
  status: number;
  body: { error: string; details?: unknown };
} {
  if (error instanceof AxiomApiError) {
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
    body: { error: "Axiom API request failed." },
  };
}

export function axiomApiErrorResponse(error: unknown): Response {
  const payload = axiomApiErrorPayload(error);
  return axiomApiJson(payload.body, {
    status: payload.status,
    headers: { "Cache-Control": "no-store" },
  });
}

export function makeAxiomApiDiscovery(origin = AXIOM_APP_URL) {
  const base = origin.replace(/\/+$/, "") + "/api/axiom";
  return {
    name: "Axiom API",
    schema_version: AXIOM_API_SCHEMA_VERSION,
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
  filters: Partial<AxiomDocumentListOptions>
): Partial<AxiomDocumentListOptions> {
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== undefined)
  ) as Partial<AxiomDocumentListOptions>;
}

/* v8 ignore start -- Supabase-backed query plumbing is exercised by integration */
function selectColumns(includeBody: boolean): string {
  return includeBody ? PUBLIC_RULE_COLUMNS_WITH_BODY : PUBLIC_RULE_COLUMNS;
}

function sortRowsByOrdinalThenCitation(rows: Rule[]): Rule[] {
  return [...rows].sort((a, b) => {
    const aOrdinal = a.ordinal ?? Number.MAX_SAFE_INTEGER;
    const bOrdinal = b.ordinal ?? Number.MAX_SAFE_INTEGER;
    if (aOrdinal !== bOrdinal) return aOrdinal - bOrdinal;
    return (a.citation_path ?? a.id).localeCompare(b.citation_path ?? b.id);
  });
}

async function resolveParentId(parentCitationPath: string): Promise<string> {
  const normalized = normalizeCitationPath(parentCitationPath);
  const { data, error } = await supabaseCorpus
    .from("current_provisions")
    .select("id")
    .eq("citation_path", normalized)
    .single();

  if (error || !data) {
    throw new AxiomApiError(404, "Parent citation path not found.", {
      parent_citation_path: normalized,
    });
  }

  return data.id;
}

export async function listAxiomDocuments(
  options: AxiomDocumentListOptions
): Promise<AxiomDocumentListResult> {
  const parentId = options.parentCitationPath
    ? await resolveParentId(options.parentCitationPath)
    : options.parentId;
  let query: any = supabaseCorpus
    .from("current_provisions")
    .select(selectColumns(options.includeBody));

  if (options.id) query = query.eq("id", options.id);
  if (options.jurisdiction) query = query.eq("jurisdiction", options.jurisdiction);
  if (options.docType) query = query.eq("doc_type", options.docType);
  if (options.citationPath) {
    query = query.eq("citation_path", normalizeCitationPath(options.citationPath));
  }

  if (
    !parentId &&
    options.root &&
    options.jurisdiction === "us" &&
    options.docType === "statute" &&
    !options.id &&
    !options.citationPath
  ) {
    const pagePaths = US_STATUTE_ROOT_PATHS.slice(
      options.offset,
      options.offset + options.limit
    );

    if (pagePaths.length === 0) {
      return {
        schema_version: AXIOM_API_SCHEMA_VERSION,
        data: [],
        pagination: {
          limit: options.limit,
          offset: options.offset,
          total: null,
          has_more: false,
        },
        filters: compactFilters({
          jurisdiction: options.jurisdiction,
          docType: options.docType,
          root: true,
          includeBody: options.includeBody || undefined,
        }),
      };
    }

    const { data, error } = await query
      .in("citation_path", pagePaths)
      .order("ordinal")
      .range(0, pagePaths.length - 1);

    if (error) {
      throw new AxiomApiError(500, "Failed to fetch Axiom documents.", error);
    }

    const rows = sortRowsByOrdinalThenCitation((data || []) as unknown as Rule[]);
    return {
      schema_version: AXIOM_API_SCHEMA_VERSION,
      data: rows.map((rule) =>
        publicAxiomRuleFromRule(rule, { includeBody: options.includeBody })
      ),
      pagination: {
        limit: options.limit,
        offset: options.offset,
        total: null,
        has_more: options.offset + options.limit < US_STATUTE_ROOT_PATHS.length,
      },
      filters: compactFilters({
        jurisdiction: options.jurisdiction,
        docType: options.docType,
        root: true,
        includeBody: options.includeBody || undefined,
      }),
    };
  }

  if (
    !parentId &&
    options.root &&
    options.jurisdiction &&
    options.docType &&
    !options.id &&
    !options.citationPath
  ) {
    for (const level of browseRootLevels(options.jurisdiction, options.docType)) {
      const { data, error } = await supabaseCorpus
        .from("current_provisions")
        .select(selectColumns(options.includeBody))
        .eq("jurisdiction", options.jurisdiction)
        .eq("doc_type", options.docType)
        .eq("level", level)
        .not("citation_path", "is", null)
        .order("ordinal")
        .range(options.offset, options.offset + options.limit);

      if (error) {
        throw new AxiomApiError(500, "Failed to fetch Axiom documents.", error);
      }

      const fetchedRows = (data || []) as unknown as Rule[];
      if (fetchedRows.length === 0) continue;

      const hasMore = fetchedRows.length > options.limit;
      const rows = hasMore ? fetchedRows.slice(0, options.limit) : fetchedRows;
      return {
        schema_version: AXIOM_API_SCHEMA_VERSION,
        data: sortRowsByOrdinalThenCitation(rows).map((rule) =>
          publicAxiomRuleFromRule(rule, { includeBody: options.includeBody })
        ),
        pagination: {
          limit: options.limit,
          offset: options.offset,
          total: null,
          has_more: hasMore,
        },
        filters: compactFilters({
          jurisdiction: options.jurisdiction,
          docType: options.docType,
          root: true,
          includeBody: options.includeBody || undefined,
        }),
      };
    }

    return {
      schema_version: AXIOM_API_SCHEMA_VERSION,
      data: [],
      pagination: {
        limit: options.limit,
        offset: options.offset,
        total: null,
        has_more: false,
      },
      filters: compactFilters({
        jurisdiction: options.jurisdiction,
        docType: options.docType,
        root: true,
        includeBody: options.includeBody || undefined,
      }),
    };
  }

  if (parentId) {
    query = query.eq("parent_id", parentId);
  } else if (options.root) {
    query = query.is("parent_id", null).not("citation_path", "is", null);
    if (options.jurisdiction && options.docType) {
      const rootPrefix = `${options.jurisdiction}/${options.docType}`;
      query = query
        .eq("level", 0)
        .gte("citation_path", `${rootPrefix}/`)
        .lt("citation_path", `${rootPrefix}~`);
    }
  }

  if (parentId) {
    query = query.order("ordinal");
  }

  if (!parentId && options.root && options.jurisdiction && options.docType) {
    const { data, error } = await query
      .order("citation_path")
      .range(0, AXIOM_API_MAX_LIMIT);

    if (error) {
      throw new AxiomApiError(500, "Failed to fetch Axiom documents.", error);
    }

    const sortedRows = sortRowsByOrdinalThenCitation((data || []) as unknown as Rule[]);
    const rows = sortedRows.slice(options.offset, options.offset + options.limit);
    const hasMore = sortedRows.length > options.offset + options.limit;

    return {
      schema_version: AXIOM_API_SCHEMA_VERSION,
      data: rows.map((rule) =>
        publicAxiomRuleFromRule(rule, { includeBody: options.includeBody })
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

  const { data, error } = await query.range(
    options.offset,
    options.offset + options.limit
  );

  if (error) {
    throw new AxiomApiError(500, "Failed to fetch Axiom documents.", error);
  }

  const fetchedRows = (data || []) as unknown as Rule[];
  const hasMore = fetchedRows.length > options.limit;
  const rows = hasMore ? fetchedRows.slice(0, options.limit) : fetchedRows;

  return {
    schema_version: AXIOM_API_SCHEMA_VERSION,
    data: rows.map((rule) =>
      publicAxiomRuleFromRule(rule, { includeBody: options.includeBody })
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
  options: AxiomDocumentTreeOptions
): Promise<PublicAxiomDocument> {
  const document: PublicAxiomDocument = publicAxiomRuleFromRule(rule, {
    includeBody: options.includeBody,
  });

  if (options.depth <= 0) return document;

  const { data, error, count } = await supabaseCorpus
    .from("current_provisions")
    .select(selectColumns(options.includeBody), { count: "exact" })
    .eq("parent_id", rule.id)
    .order("ordinal")
    .range(0, options.childLimit - 1);

  if (error) {
    throw new AxiomApiError(500, "Failed to fetch Axiom subsections.", error);
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

export async function getAxiomDocumentByCitationPath(
  citationPath: string,
  options: AxiomDocumentTreeOptions
): Promise<PublicAxiomDocument | null> {
  const normalized = normalizeCitationPath(citationPath);
  if (!normalized) {
    throw new AxiomApiError(400, "Citation path is required.");
  }

  const { data, error } = await supabaseCorpus
    .from("current_provisions")
    .select(selectColumns(options.includeBody))
    .eq("citation_path", normalized)
    .single();

  if (error || !data) return null;

  return hydrateDocumentTree(data as unknown as Rule, options);
}
/* v8 ignore stop */
