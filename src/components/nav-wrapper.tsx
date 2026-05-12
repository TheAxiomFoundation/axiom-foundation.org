"use client";

import { useEffect, useState } from "react";
import { NavClient } from "./nav-client";
import { SITE_URL, axiomAppHref } from "@/lib/urls";

const PRODUCTION_APP_ORIGIN = "https://app.axiom-foundation.org";
const PRODUCTION_MARKETING_ORIGIN = "https://axiom-foundation.org";
const PRODUCTION_MARKETING_HOSTS = new Set([
  "axiom-foundation.org",
  "www.axiom-foundation.org",
  "app.axiom-foundation.org",
]);
const MARKETING_PREVIEW_HOST_RE =
  /^axiom-foundation-.+-policy-engine\.vercel\.app$/;

export function marketingOriginForHost(hostname: string): string | undefined {
  if (hostname === "app.axiom-foundation.org") {
    return PRODUCTION_MARKETING_ORIGIN;
  }

  return undefined;
}

export function appHrefForHost(hostname: string): string | undefined {
  if (PRODUCTION_MARKETING_HOSTS.has(hostname)) {
    return PRODUCTION_APP_ORIGIN;
  }

  if (MARKETING_PREVIEW_HOST_RE.test(hostname)) {
    return axiomAppHref();
  }

  return undefined;
}

interface NavOrigins {
  baseUrl?: string;
  appUrl?: string;
}

function navOriginsForHost(hostname: string): NavOrigins {
  return {
    baseUrl: marketingOriginForHost(hostname),
    appUrl: appHrefForHost(hostname),
  };
}

export function NavWrapper() {
  const [origins, setOrigins] = useState<NavOrigins>({
    baseUrl: SITE_URL,
    appUrl: axiomAppHref(),
  });

  useEffect(() => {
    setOrigins(navOriginsForHost(window.location.hostname));
  }, []);

  return <NavClient baseUrl={origins.baseUrl} appUrl={origins.appUrl} />;
}
