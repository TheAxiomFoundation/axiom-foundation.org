"use client";

import Link from "next/link";
import type { BreadcrumbItem } from "@/lib/tree-data";

interface TreeBreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function TreeBreadcrumbs({ items }: TreeBreadcrumbsProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-2 mb-6 font-mono text-sm"
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <span key={item.href} className="flex items-center gap-2">
            {index > 0 && (
              <span className="text-[var(--color-ink-muted)]">/</span>
            )}
            {isLast ? (
              <span className="text-[var(--color-ink-secondary)]">
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href}
                className="text-[var(--color-accent)] no-underline hover:underline"
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
