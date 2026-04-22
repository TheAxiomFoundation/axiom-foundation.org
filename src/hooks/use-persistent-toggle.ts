"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * A boolean toggle that survives navigation and page reloads by
 * writing its value to ``localStorage``.
 *
 * Used for Atlas viewer preferences (e.g. the "Encoded only" filter)
 * where the user picks a setting and expects it to stick across
 * folders — but we don't want the state living in the URL because
 * it's a personal filter, not something to share.
 *
 * The initial render returns ``false`` to avoid a hydration mismatch;
 * the stored value is applied on mount. Writes are best-effort —
 * a quota-exceeded or privacy-mode storage rejection is swallowed so
 * the toggle still works in-memory.
 */
export function usePersistentToggle(
  storageKey: string
): [boolean, (next?: boolean) => void] {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (window.localStorage.getItem(storageKey) === "1") {
        setEnabled(true);
      }
    } catch {
      // privacy mode / disabled storage — fall back to in-memory.
    }
  }, [storageKey]);

  const set = useCallback(
    (next?: boolean) => {
      setEnabled((prev) => {
        const resolved = typeof next === "boolean" ? next : !prev;
        try {
          window.localStorage.setItem(storageKey, resolved ? "1" : "0");
        } catch {
          // swallow — state still updates in-memory.
        }
        return resolved;
      });
    },
    [storageKey]
  );

  return [enabled, set];
}
