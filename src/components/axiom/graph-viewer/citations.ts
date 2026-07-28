/**
 * Citation helpers for render-side use. Mirrors the logic in
 * apps/builder/src/citations.ts and compute/engine.py so legal IDs render
 * the same way wherever the user encounters them.
 */

const JURISDICTION_LABELS: Record<string, string> = {
  us: "Federal",
  "us-co": "Colorado",
  "us-ca": "California",
  "us-ny": "New York",
};

const KIND_SINGULAR: Record<string, string> = {
  regulations: "regulation",
  statutes: "statute",
  policies: "policy",
  guidance: "guidance",
  bills: "bill",
  manual: "manual",
};

/** Encoding-only leaves ("block-1") that never exist as corpus nodes. */
const ENCODING_LEAF = /^block-\d+$/i;

export function humanizeCitation(fileLegalId: string): string {
  if (!fileLegalId.includes(":")) return fileLegalId;
  const [jurisdiction, body] = fileLegalId.split(":") as [string, string];
  const parts = body.split("/").filter(Boolean);
  if (parts.length === 0) return fileLegalId;
  const [kind, ...rest] = parts;

  if (kind === "statutes" && rest.length >= 2) {
    const title = rest[0];
    const section = rest[1];
    const subs = rest.slice(2);
    const suffix = subs.map((s) => `(${s})`).join("");
    return `${title} USC § ${section}${suffix}`;
  }

  if (kind === "regulations" && rest.length >= 2) {
    const slug = rest[0]!;
    // Legal convention: part.section, then parenthetical subsections —
    // "387.12(f)(3)(v)(a)", never "387.12.f.3.v.a".
    const segments = rest.slice(1);
    const path =
      segments.slice(0, 2).join(".") +
      segments
        .slice(2)
        .map((segment) => `(${segment})`)
        .join("");
    if (slug.toLowerCase() === "7-cfr") return `7 CFR § ${path}`;
    const readable = slug.replace(/-/g, " ").toUpperCase();
    const suffix = jurisdiction === "us-co" ? " (Colorado)" : "";
    return `${readable} § ${path}${suffix}`;
  }

  if (kind === "manual" && rest.length >= 1) {
    // "manual/dss/snap/1115-000-00/…/1115-035-25/block-1" →
    // "MO DSS SNAP Manual 1115.035.25": agency/program segments lead,
    // the deepest numeric section reads dotted, encoding leaves drop.
    const agency = rest
      .filter((s) => /[a-z]/i.test(s) && !ENCODING_LEAF.test(s))
      .map((s) => s.toUpperCase())
      .join(" ");
    const section = [...rest].reverse().find((s) => /^\d[\d-]*$/.test(s));
    const state =
      jurisdiction.split("-")[1]?.toUpperCase() ?? jurisdiction.toUpperCase();
    const parts = [state, agency, "Manual", section?.replace(/-/g, ".")];
    return parts.filter(Boolean).join(" ");
  }

  return `${JURISDICTION_LABELS[jurisdiction] ?? jurisdiction} · ${body}`;
}

/**
 * Some rules carry a raw legal id in their `source` field (synthesized
 * package rules cite their statute as "us:statutes/7/2014"), others a
 * slash-form citation path ("us-ny/regulation/18-nycrr/387/14/a/5(i)").
 * Render both as citations; pass genuine citation text through
 * untouched.
 */
export function humanizeSource(source: string): string {
  if (/^[a-z]{2}(?:-[a-z]{2})?:/.test(source)) {
    return humanizeCitation(source.split("#")[0] ?? source);
  }
  const pathish = source.match(
    /^([a-z]{2}(?:-[a-z]{2})?)\/(statutes?|regulations?|polic(?:y|ies)|guidance|manual)\/(.+)$/,
  );
  if (pathish) {
    const bucket = pathish[2]!.startsWith("statute")
      ? "statutes"
      : pathish[2]!.startsWith("regulation")
        ? "regulations"
        : pathish[2]!.startsWith("polic")
          ? "policies"
          : pathish[2] === "manual"
            ? "manual"
            : "guidance";
    return humanizeCitation(`${pathish[1]}:${bucket}/${pathish[3]}`);
  }
  return source;
}

export function axiomAppUrl(fileLegalId: string): string | null {
  if (!fileLegalId || !fileLegalId.includes(":")) return null;
  const [jurisdiction, body] = fileLegalId.split(":") as [string, string];
  const parts = body.split("/").filter(Boolean);
  if (parts.length < 1) return null;
  const [kind, ...rest] = parts;
  const singular = KIND_SINGULAR[kind!];
  if (!singular) return null;
  const appRest = normalizeAxiomAppSegments(jurisdiction, kind!, rest);
  const path = [jurisdiction, singular, ...appRest].join("/");
  // In-app viewer: bare citation paths are canonical on every host.
  return `/${path}`;
}

function normalizeAxiomAppSegments(
  jurisdiction: string,
  kind: string,
  rest: string[],
): string[] {
  if (
    jurisdiction === "us" &&
    kind === "regulations" &&
    rest.length > 0 &&
    rest[0]?.endsWith("-cfr")
  ) {
    const [title, ...tail] = rest;
    return [title.replace(/-cfr$/, ""), ...tail];
  }
  // Manuals: encoding-only leaves ("block-1") are not corpus nodes —
  // link to the deepest real section instead.
  if (kind === "manual") {
    const trimmed = [...rest];
    while (trimmed.length > 0 && ENCODING_LEAF.test(trimmed[trimmed.length - 1]!)) {
      trimmed.pop();
    }
    return trimmed;
  }
  return rest;
}

/** Acronyms that must stay upper-case when a snake_case rule name is
 *  humanized ("cdcc" → "CDCC", "snap_agi_limit" → "SNAP AGI Limit"). */
const RULE_NAME_ACRONYMS = new Set([
  "cdcc", "snap", "tanf", "wic", "ssi", "eitc", "ctc", "agi", "magi",
  "cola", "usda", "irs", "fpl", "abawd", "uc",
]);

/** Humanize a snake_case rule name: title-case words, acronyms
 *  upper-cased. The doors and tooltips lead with this. */
export function humanizeRuleName(name: string): string {
  return name
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((word) =>
      RULE_NAME_ACRONYMS.has(word.toLowerCase())
        ? word.toUpperCase()
        : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(" ");
}

/** A legalId for a rule or input is `<file>#rule.<name>` / `<file>#input.<name>`.
 *  Split off the `#…` suffix to recover the file legalId for citation/url. */
export function fileLegalIdOf(legalId: string): string {
  const hashIdx = legalId.indexOf("#");
  return hashIdx >= 0 ? legalId.slice(0, hashIdx) : legalId;
}
