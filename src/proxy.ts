import { NextRequest, NextResponse } from "next/server";

const SITE_HOST = "axiom-foundation.org";
const APP_HOST = "app.axiom-foundation.org";

function cleanHost(request: NextRequest): string {
  return (request.headers.get("host") ?? "").split(":")[0].toLowerCase();
}

function isBypassPath(pathname: string): boolean {
  return (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    pathname === "/favicon.svg" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname.startsWith("/sitemap/")
  );
}

export function proxy(request: NextRequest) {
  const host = cleanHost(request);
  const { pathname } = request.nextUrl;

  if (host === APP_HOST) {
    if (isBypassPath(pathname)) {
      return NextResponse.next();
    }

    const target = request.nextUrl.clone();
    target.pathname = pathname === "/" ? "/axiom" : `/axiom${pathname}`;
    return NextResponse.rewrite(target);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|favicon.svg).*)"],
};
