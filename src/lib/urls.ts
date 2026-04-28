export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://axiom-foundation.org";

export const AXIOM_APP_URL =
  process.env.NEXT_PUBLIC_AXIOM_APP_URL ?? "https://app.axiom-foundation.org";

export function axiomAppHref(path = ""): string {
  const base = AXIOM_APP_URL.replace(/\/+$/, "");
  const suffix = path.replace(/^\/+/, "");
  return suffix ? `${base}/${suffix}` : base;
}
