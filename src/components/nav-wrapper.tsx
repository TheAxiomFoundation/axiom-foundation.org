"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Nav } from "@axiom-foundation/ui";
import { SITE_URL } from "@/lib/urls";

export function NavWrapper() {
  const pathname = usePathname();
  return <Nav baseUrl={SITE_URL} pathname={pathname} renderLink={Link} />;
}
