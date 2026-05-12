"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Nav } from "@axiom-foundation/ui";

interface NavClientProps {
  baseUrl?: string;
  appUrl?: string;
}

export function NavClient({ baseUrl, appUrl }: NavClientProps) {
  const pathname = usePathname();

  return (
    <Nav
      pathname={pathname}
      renderLink={Link}
      baseUrl={baseUrl}
      appUrl={appUrl}
    />
  );
}
