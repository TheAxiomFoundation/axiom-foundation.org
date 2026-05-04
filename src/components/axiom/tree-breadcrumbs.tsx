"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { BreadcrumbItem } from "@/lib/tree-data";

interface TreeBreadcrumbsProps {
  items: BreadcrumbItem[];
}

/**
 * In production the app lives at ``app.axiom-foundation.org`` and the
 * proxy rewrites ``/`` to ``/axiom``, so the breadcrumb's "Axiom"
 * root pointing at ``/`` lands on the app overview. On localhost the
 * dev server serves both the marketing site and the app off the same
 * port, so ``/`` is the marketing landing — clicking the root
 * breadcrumb from inside the app drops the user out of the app
 * entirely. Detect that case on mount and rewrite the root href to
 * the explicit ``/axiom`` route.
 */
export function TreeBreadcrumbs({ items }: TreeBreadcrumbsProps) {
  const [resolved, setResolved] = useState(items);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const isLocalhost =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";
    if (!isLocalhost || items.length === 0) {
      setResolved(items);
      return;
    }
    setResolved([
      { ...items[0], href: items[0].href === "/" ? "/axiom" : items[0].href },
      ...items.slice(1),
    ]);
  }, [items]);

  if (resolved.length === 0) {
    return null;
  }

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-2 mb-6 font-mono text-sm"
    >
      {resolved.map((item, index) => {
        const isLast = index === resolved.length - 1;

        return (
          <span key={item.href} className="flex items-center gap-2">
            {index > 0 && (
              <span className="text-[var(--color-ink-muted)]">/</span>
            )}
            {isLast ? (
              <span
                aria-current="page"
                className="text-[var(--color-ink-secondary)]"
              >
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href}
                className="text-[var(--color-accent)] no-underline hover:underline focus-visible:underline"
              >
                {item.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
