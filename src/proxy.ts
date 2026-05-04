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
const APP_ROOT_PREFIX_RE = /^\/(?:us|uk|canada|us-[a-z]{2})(?:\/|$)/;

function cleanHost(request: NextRequest): string {
  return (request.headers.get("host") ?? "").split(":")[0].toLowerCase();
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

export function proxy(request: NextRequest) {
  const host = cleanHost(request);
  const { pathname } = request.nextUrl;

  if (host === APP_HOST) {
    if (isBypassPath(pathname)) {
      return NextResponse.next();
    }

    if (pathname === "/axiom" || pathname.startsWith("/axiom/")) {
      return NextResponse.next();
    }

    const target = request.nextUrl.clone();
    target.pathname = pathname === "/" ? "/axiom" : `/axiom${pathname}`;
    return NextResponse.rewrite(target);
  }

  // Local-dev convenience: the breadcrumb hrefs are subdomain-clean
  // (no ``/axiom`` prefix, because production rewrites them via the
  // APP_HOST branch above). On localhost we don't get that rewrite
  // for free, so rewrite jurisdiction-rooted paths here too.
  if (isLocalDevHost(host) && APP_ROOT_PREFIX_RE.test(pathname)) {
    if (isBypassPath(pathname)) {
      return NextResponse.next();
    }
    const target = request.nextUrl.clone();
    target.pathname = `/axiom${pathname}`;
    return NextResponse.rewrite(target);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|favicon.svg).*)"],
};
