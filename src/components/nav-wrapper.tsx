"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Nav } from "@axiom-foundation/ui";

export function NavWrapper() {
  const pathname = usePathname();
  return <Nav pathname={pathname} renderLink={Link} />;
}
