"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Nav } from "@axiom-foundation/ui";
import { PaletteTrigger } from "@/components/axiom/palette-trigger";

interface NavClientProps {
  baseUrl?: string;
  appUrl?: string;
}

/** App surfaces (jurisdiction-rooted paths + /axiom/*) get the
 *  search trigger in the nav's top right; marketing pages stay
 *  clean. The palette itself is mounted globally by the root
 *  layout's provider, so ⌘K works everywhere. */
const APP_PATH_RE = /^\/(?:axiom(?:\/|$)|(?:[a-z]{2}(?:-[a-z]{2})?|canada)(?:\/|$))/;

export function NavClient({ baseUrl, appUrl }: NavClientProps) {
  const pathname = usePathname();

  return (
    <Nav
      pathname={pathname}
      renderLink={Link}
      baseUrl={baseUrl}
      appUrl={appUrl}
      rightSlot={
        APP_PATH_RE.test(pathname ?? "") ? (
          <PaletteTrigger variant="compact" />
        ) : undefined
      }
    />
  );
}
