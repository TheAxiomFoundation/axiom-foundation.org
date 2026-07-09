"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { parseCitationInput } from "@/lib/axiom/citation-jump";

/**
 * Type-a-citation-and-go: "26 usc 32(c)", "7 cfr 273.9", "crs
 * 26-2-706" → the v2 section page. Invalid input shakes the border
 * red instead of navigating.
 */
export function CitationJump() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [invalid, setInvalid] = useState(false);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const path = parseCitationInput(value);
    if (!path) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    router.push(`/axiom/v2/${path}`);
  }

  return (
    <form onSubmit={submit} className="flex items-center gap-1.5">
      <label htmlFor="citation-jump" className="sr-only">
        Go to citation
      </label>
      <input
        id="citation-jump"
        type="text"
        value={value}
        placeholder="Go to citation — 26 USC 32(c)…"
        onChange={(event) => {
          setValue(event.target.value);
          if (invalid) setInvalid(false);
        }}
        aria-invalid={invalid}
        className={`w-56 rounded border bg-transparent px-2 py-1 font-mono text-xs text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-colors ${
          invalid
            ? "border-[var(--color-error,#b91c1c)]"
            : "border-[var(--color-rule)]"
        }`}
      />
      <button
        type="submit"
        aria-label="Go"
        className="rounded border border-[var(--color-rule)] px-2 py-1 font-mono text-xs text-[var(--color-ink-muted)] cursor-pointer hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors"
      >
        →
      </button>
    </form>
  );
}
