"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Nav } from "@axiom-foundation/ui";
import { PaletteTrigger } from "@/components/axiom/palette-trigger";

interface NavClientProps {
  baseUrl?: string;
  appUrl?: string;
}

/** App surfaces (jurisdiction-rooted paths + /axiom/* + /app) get
 *  the search trigger in the nav's top right; marketing pages stay
 *  clean. The palette itself is mounted globally by the root
 *  layout's provider, so ⌘K works everywhere.
 *
 *  /app MUST match: the proxy rewrites it to /axiom/graph, so during
 *  SSR usePathname() reports the rewritten path (matches) while the
 *  browser reports /app — if only one side matches, the trigger
 *  renders on the server and not the client, and React throws a
 *  hydration mismatch (#418) on every /app load. */
const APP_PATH_RE =
  /^\/(?:app(?:\/|$)|axiom(?:\/|$)|(?:[a-z]{2}(?:-[a-z]{2})?|canada)(?:\/|$))/;

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
