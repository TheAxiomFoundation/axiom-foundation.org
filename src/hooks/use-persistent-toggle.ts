"use client";

import { useCallback, useState } from "react";

/**
 * A boolean toggle that survives navigation and page reloads by
 * writing its value to ``localStorage`` and, optionally, a cookie.
 *
 * Used for Axiom viewer preferences (e.g. the "Encoded only" filter)
 * where the user picks a setting and expects it to stick across
 * folders — but we don't want the state living in the URL because
 * it's a personal filter, not something to share.
 *
 * Callers that SSR content affected by the toggle can pass an
 * initialValue derived from a cookie. In that mode the first client
 * render deliberately uses the server value so hydration stays
 * identical; updates write both localStorage and the optional cookie.
 */
export function usePersistentToggle(
  storageKey: string,
  options: {
    initialValue?: boolean;
    cookieName?: string;
  } = {}
): [boolean, (next?: boolean) => void] {
  const { initialValue, cookieName } = options;
  const [enabled, setEnabled] = useState<boolean>(() => {
    if (typeof initialValue === "boolean") return initialValue;
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
        try {
          if (cookieName) {
            document.cookie = `${encodeURIComponent(cookieName)}=${
              resolved ? "1" : "0"
            }; path=/; max-age=31536000; SameSite=Lax`;
          }
        } catch {
          // disabled cookies — fall back to in-memory/localStorage.
        }
        return resolved;
      });
    },
    [cookieName, storageKey]
  );

  return [enabled, set];
}
