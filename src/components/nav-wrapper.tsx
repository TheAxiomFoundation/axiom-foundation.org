"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Nav } from "@axiom-foundation/ui";

function useIsAppSubdomain() {
  if (typeof window === "undefined") return false;
  return window.location.hostname === "app.axiom-foundation.org";
}

export function NavWrapper() {
  const pathname = usePathname();
  const isApp = useIsAppSubdomain();
  const baseUrl = isApp ? "https://axiom-foundation.org" : undefined;
  return <Nav pathname={pathname} renderLink={Link} baseUrl={baseUrl} />;
}
