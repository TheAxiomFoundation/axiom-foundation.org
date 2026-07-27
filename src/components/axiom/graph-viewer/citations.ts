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
};

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
    /^([a-z]{2}(?:-[a-z]{2})?)\/(statutes?|regulations?|polic(?:y|ies)|guidance)\/(.+)$/,
  );
  if (pathish) {
    const bucket = pathish[2]!.startsWith("statute")
      ? "statutes"
      : pathish[2]!.startsWith("regulation")
        ? "regulations"
        : pathish[2]!.startsWith("polic")
          ? "policies"
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
  return rest;
}

/** A legalId for a rule or input is `<file>#rule.<name>` / `<file>#input.<name>`.
 *  Split off the `#…` suffix to recover the file legalId for citation/url. */
export function fileLegalIdOf(legalId: string): string {
  const hashIdx = legalId.indexOf("#");
  return hashIdx >= 0 ? legalId.slice(0, hashIdx) : legalId;
}
