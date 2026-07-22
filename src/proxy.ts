import { NextRequest, NextResponse } from "next/server";

const SITE_HOST = "axiom-foundation.org";
const APP_HOST = "app.axiom-foundation.org";

// Citation paths the app is allowed to serve at the root of the
// app subdomain. In production these are rewritten to /axiom/*
// transparently; in local dev (single-host on localhost) we apply
// the same rewrite so the breadcrumb hrefs the app generates
// (``/us/statute/26/3101``) don't 404. Marketing routes (``/``,
// ``/about``, ``/format`` …) are not in this list and pass through
// unchanged so the dev server can also serve the marketing site.
// Any two-letter jurisdiction slug (optionally state-suffixed) plus
// the legacy "canada" alias. Hardcoding a jurisdiction list here
// silently 404'd every newer corpus jurisdiction (nz, be, de, …).
// No marketing route uses a two-letter root segment.
const APP_ROOT_PREFIX_RE = /^\/(?:[a-z]{2}(?:-[a-z]{2})?|canada)(?:\/|$)/;

// Jurisdictions whose corpus rows navigate by provision_id rather
// than citation_path (plus the legacy "canada" alias). The v2
// reader resolves via citation_path only, so these stay on the v1
// tree browser until their corpora gain citation paths.
const V1_ONLY_JURISDICTIONS = new Set(["ca", "canada"]);

// Every jurisdiction-rooted path renders the v2 surface — browse
// levels (jurisdiction / doc type / title) get the v2 list view,
// section depth and deeper the v2 reader. The app root ("/") stays
// on the v1 landing until it is rebuilt.
function appPagePath(pathname: string): string {
  if (pathname === "/") return "/axiom";
  if (!APP_ROOT_PREFIX_RE.test(pathname)) return `/axiom${pathname}`;
  const slug = pathname.split("/")[1];
  return V1_ONLY_JURISDICTIONS.has(slug)
    ? `/axiom${pathname}`
    : `/axiom/v2${pathname}`;
}

function cleanHost(request: NextRequest): string {
  return (request.headers.get("host") ?? "").split(":")[0].toLowerCase();
}

function stripAxiomPrefix(pathname: string): string {
  if (pathname === "/axiom") return "/";
  return pathname.startsWith("/axiom/") ? pathname.slice("/axiom".length) : pathname;
}

// Top-level dirs/files in ``public/`` that ship to the deploy
// verbatim. Without an explicit bypass the app-subdomain rewrite
// turns e.g. ``/logos/foo.svg`` into ``/axiom/logos/foo.svg``, which
// the catch-all page route renders as HTML — the browser then shows
// a broken image instead of the asset.
const STATIC_PUBLIC_PATH_RE = /^\/(?:logos|stack-examples|axiom-icon-)/;

function isBypassPath(pathname: string): boolean {
  return (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    pathname === "/favicon.svg" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname.startsWith("/sitemap/") ||
    STATIC_PUBLIC_PATH_RE.test(pathname)
  );
}

function isLocalDevHost(host: string): boolean {
  return host === "localhost" || host === "127.0.0.1" || host.endsWith(".localhost");
}

function isInternalAxiomPath(pathname: string): boolean {
  return pathname === "/axiom" || pathname.startsWith("/axiom/");
}

// Marketing routes that exist only on the marketing site. The
// app-host catch-all rewrite would otherwise serve app-root content
// for them with HTTP 200 — the global footer links (/about, /team,
// /privacy, /docs) silently landing on the wrong page.
const MARKETING_PATH_RE =
  /^\/(?:about|team|privacy|docs|format|stack|reports|preview)(?:\/|$)/;

export function proxy(request: NextRequest) {
  const host = cleanHost(request);
  const { pathname } = request.nextUrl;

  // "/canada" is a legacy alias the resolver no longer understands —
  // it fell through to the app landing instead of the Canadian
  // browser. Canonicalize to /ca on every host.
  if (pathname === "/canada" || pathname.startsWith("/canada/")) {
    const target = request.nextUrl.clone();
    target.pathname = `/ca${pathname.slice("/canada".length)}`;
    return NextResponse.redirect(target, 308);
  }

  // /axiom/v2/… is the internal rewrite target, never a public URL.
  // Requests that reach it directly (previews, old links) redirect to
  // the canonical bare citation path so one document has one URL.
  if (pathname === "/axiom/v2" || pathname.startsWith("/axiom/v2/")) {
    const target = request.nextUrl.clone();
    target.pathname = pathname.slice("/axiom/v2".length) || "/";
    return NextResponse.redirect(target, 308);
  }

  if (host === APP_HOST) {
    if (isBypassPath(pathname)) {
      return NextResponse.next();
    }

    if (MARKETING_PATH_RE.test(pathname)) {
      const target = request.nextUrl.clone();
      target.hostname = SITE_HOST;
      return NextResponse.redirect(target, 308);
    }

    if (isInternalAxiomPath(pathname)) {
      const target = request.nextUrl.clone();
      target.pathname = stripAxiomPrefix(pathname);
      return NextResponse.redirect(target, 308);
    }

    const target = request.nextUrl.clone();
    target.pathname = appPagePath(pathname);
    return NextResponse.rewrite(target);
  }

  if (host === SITE_HOST && isInternalAxiomPath(pathname)) {
    const target = request.nextUrl.clone();
    target.hostname = APP_HOST;
    target.pathname = stripAxiomPrefix(pathname);
    return NextResponse.redirect(target, 308);
  }

  // The in-app graph viewer resolves on every host, like
  // jurisdiction paths: reader pages link to /graph?focus=… and
  // those links must work on localhost and previews too.
  if (pathname === "/graph") {
    const target = request.nextUrl.clone();
    target.pathname = "/axiom/graph";
    return NextResponse.rewrite(target);
  }

  // Jurisdiction-rooted paths resolve on every host — localhost,
  // Vercel preview deployments, and the marketing host (where the
  // globally mounted palette can navigate to them). App links are
  // subdomain-clean bare paths; without this rewrite they 404
  // anywhere the APP_HOST branch above doesn't apply.
  if (APP_ROOT_PREFIX_RE.test(pathname)) {
    const target = request.nextUrl.clone();
    target.pathname = appPagePath(pathname);
    return NextResponse.rewrite(target);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|favicon.svg).*)"],
};
