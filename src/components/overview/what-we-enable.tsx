"use client";

import { useId, useRef, useState } from "react";
import {
  AUDIENCES,
  PREVIEW_APPS,
  WHAT_WE_ENABLE_INTRO,
} from "./overview-content";

/**
 * Audience switcher for "What we enable".
 *
 * Four audiences carry more copy than an 800px column can show at once, so
 * the section shows one at a time behind a tablist. Every panel stays in the
 * DOM (hidden, not unmounted) so the content is still found by in-page search
 * and by anyone printing the route — the branded PDF at
 * /Axiom-Foundation-Overview.pdf carries all four in sequence.
 */
export function WhatWeEnable() {
  const [active, setActive] = useState(0);
  const tabsId = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const last = AUDIENCES.length - 1;
    let next: number | null = null;

    if (event.key === "ArrowRight") next = active === last ? 0 : active + 1;
    else if (event.key === "ArrowLeft") next = active === 0 ? last : active - 1;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = last;

    if (next === null) return;
    event.preventDefault();
    setActive(next);
    tabRefs.current[next]?.focus();
  }

  return (
    <section id="what-we-enable" className="mb-16 scroll-mt-24">
      <h2 className="heading-sub mb-4">What we enable</h2>
      <p className="font-body text-[1rem] text-[var(--color-ink-secondary)] leading-relaxed mb-6">
        {WHAT_WE_ENABLE_INTRO}
      </p>

      <div
        role="tablist"
        aria-label="Who the encoded layer is for"
        onKeyDown={onKeyDown}
        className="flex flex-wrap gap-2 mb-6"
      >
        {AUDIENCES.map((audience, i) => {
          const isActive = i === active;
          return (
            <button
              key={audience.id}
              ref={(node) => {
                tabRefs.current[i] = node;
              }}
              type="button"
              role="tab"
              id={`${tabsId}-tab-${audience.id}`}
              aria-selected={isActive}
              aria-controls={`${tabsId}-panel-${audience.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => setActive(i)}
              className={`font-mono text-[0.7rem] tracking-[0.16em] uppercase px-4 py-2.5 rounded-md border transition-colors duration-200 ${
                isActive
                  ? "border-[var(--color-accent)] text-[var(--color-accent)] bg-[var(--color-accent-light)]"
                  : "border-[var(--color-rule-strong)] text-[var(--color-ink-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
              }`}
            >
              {audience.tab}
            </button>
          );
        })}
      </div>

      {AUDIENCES.map((audience, i) => (
        <div
          key={audience.id}
          role="tabpanel"
          id={`${tabsId}-panel-${audience.id}`}
          aria-labelledby={`${tabsId}-tab-${audience.id}`}
          hidden={i !== active}
          tabIndex={0}
          className="card-edition p-6"
        >
          <h3 className="font-body text-lg text-[var(--color-ink)] mb-3">
            {audience.headline}
          </h3>
          <p className="font-body text-sm text-[var(--color-ink-secondary)] leading-relaxed mb-4">
            {audience.body}
          </p>
          <p className="font-body text-sm text-[var(--color-ink-secondary)] leading-relaxed m-0 pl-4 border-l-2 border-[var(--color-accent)]">
            <span className="serif-italic text-[var(--color-ink)]">
              In practice.
            </span>{" "}
            {audience.useCase}
          </p>
        </div>
      ))}

      <h3 className="font-mono text-[0.65rem] tracking-[0.22em] uppercase text-[var(--color-ink-muted)] mt-12 mb-3">
        Preview applications
      </h3>
      <p className="font-body text-[1rem] text-[var(--color-ink-secondary)] leading-relaxed mb-6">
        These surfaces run on the encoded layer and show what partners can build
        on top of it. They are usable and still evolving, and the layer
        underneath them is the product.
      </p>
      {/* Two up rather than the auto-fit grid the other card rows use: four
          cards in a three-column track leaves a lone orphan on the second. */}
      <div className="grid gap-6 sm:grid-cols-2">
        {PREVIEW_APPS.map((app) => (
          <div key={app.name} className="card-edition p-6 flex flex-col">
            <h4 className="font-body text-lg text-[var(--color-ink)] mb-2">
              {app.name}
            </h4>
            <p className="font-body text-sm text-[var(--color-ink-secondary)] leading-relaxed grow">
              {app.body}
            </p>
            {/* Cards stay unlinked until a public URL is set, so an
                unfilled deploy shows a description rather than a dead link. */}
            {app.href ? (
              <a
                href={app.href}
                className="font-mono text-sm text-[var(--color-accent)] mt-4 self-start"
              >
                Open preview
                <span className="sr-only"> — {app.name}</span>
              </a>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
