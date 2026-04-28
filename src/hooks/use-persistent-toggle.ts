"use client";

import { useCallback, useState } from "react";

/**
 * A boolean toggle that survives navigation and page reloads by
 * writing its value to ``localStorage``.
 *
 * Used for Axiom viewer preferences (e.g. the "Encoded only" filter)
 * where the user picks a setting and expects it to stick across
 * folders — but we don't want the state living in the URL because
 * it's a personal filter, not something to share.
 *
 * The value is read **synchronously** on the first client render via
 * a lazy useState initializer so downstream data fetches see the
 * correct filter state on their first pass. This avoids the
 * previous flash-of-unfiltered-data where a post-mount useEffect
 * would flip the toggle on after a fetch had already started with
 * the default.
 *
 * SSR returns ``false`` (no window); client hydration runs the lazy
 * initializer and gets the stored value. That can produce a brief
 * hydration mismatch on the button's visible state — callers mask
 * it with ``suppressHydrationWarning`` on the presentational
 * attributes they care about.
 */
export function usePersistentToggle(
  storageKey: string
): [boolean, (next?: boolean) => void] {
  const [enabled, setEnabled] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(storageKey) === "1";
    } catch {
      return false;
    }
  });

  const set = useCallback(
    (next?: boolean) => {
      setEnabled((prev) => {
        const resolved = typeof next === "boolean" ? next : !prev;
        try {
          window.localStorage.setItem(storageKey, resolved ? "1" : "0");
        } catch {
          // privacy mode / disabled storage — fall back to in-memory.
        }
        return resolved;
      });
    },
    [storageKey]
  );

  return [enabled, set];
}
