"use client";

import { useEffect, useState } from "react";
import { LAUNCH_EVENT_URL, LAUNCH_UTC, UPDATES_URL } from "@/lib/launch";
import { trackAxiomEvent } from "@/lib/analytics";

interface Countdown {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  passed: boolean;
}

function computeCountdown(now: number): Countdown {
  const diff = LAUNCH_UTC - now;
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, passed: true };
  }
  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor(diff / 3_600_000) % 24,
    minutes: Math.floor(diff / 60_000) % 60,
    seconds: Math.floor(diff / 1_000) % 60,
    passed: false,
  };
}

/**
 * Launch announcement — a dark "official notice" invitation that opens the
 * home page above the cream hero. Carries a live countdown to the July 28
 * public launch and the primary call to register for the virtual briefing.
 *
 * The countdown only paints after mount so server and client agree (no
 * hydration mismatch); before mount the tiles show em-dashes.
 */
export function AnnouncementBanner() {
  const [cd, setCd] = useState<Countdown | null>(null);

  useEffect(() => {
    setCd(computeCountdown(Date.now()));
    const id = setInterval(() => setCd(computeCountdown(Date.now())), 1000);
    return () => clearInterval(id);
  }, []);

  const tiles: { value: number | null; label: string }[] = [
    { value: cd?.days ?? null, label: "Days" },
    { value: cd?.hours ?? null, label: "Hrs" },
    { value: cd?.minutes ?? null, label: "Min" },
    { value: cd?.seconds ?? null, label: "Sec" },
  ];

  return (
    <div className="relative z-1 px-4 pt-[84px] sm:px-6">
      <section
        aria-label="Axiom Foundation public launch"
        className="section-dark relative mx-auto max-w-[1120px] overflow-hidden rounded-2xl border shadow-[0_30px_80px_-40px_rgba(0,0,0,0.85)]"
        style={{
          background:
            "radial-gradient(120% 140% at 85% -20%, rgba(217,119,6,0.18), transparent 55%)," +
            "radial-gradient(90% 120% at 0% 120%, rgba(180,83,9,0.14), transparent 60%)," +
            "linear-gradient(155deg, #1a1611 0%, #14100c 55%, #100c08 100%)",
          borderColor: "rgba(217,119,6,0.32)",
        }}
      >
        {/* Amber corner glow that breathes */}
        <div
          aria-hidden
          className="announce-glow pointer-events-none absolute -right-24 -top-32 h-72 w-72 rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(217,119,6,0.4), transparent 70%)",
          }}
        />

        {/* ∀ watermark */}
        <span
          aria-hidden
          className="glyph-axiom pointer-events-none absolute -bottom-16 right-4 select-none text-[16rem] leading-none text-[var(--color-accent)]"
          style={{ opacity: 0.05 }}
        >
          ∀
        </span>

        {/* Sheen sweep across the top hairline */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px overflow-hidden">
          <div
            className="announce-sheen h-px w-1/3"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(217,119,6,0.9), transparent)",
            }}
          />
        </div>

        <div className="relative flex flex-col gap-6 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
          {/* Left: the invitation */}
          <div className="max-w-[560px]">
            <div className="announce-rise flex items-baseline gap-2.5 font-mono text-[0.68rem] font-medium uppercase tracking-[0.28em] text-[var(--color-accent)]">
              <span className="glyph-axiom text-[0.95rem] leading-none">∀</span>
              <span>Public launch</span>
            </div>

            <h2
              className="announce-rise mt-2.5 font-body text-[clamp(1.35rem,2.2vw,1.75rem)] font-light leading-[1.12] tracking-[-0.01em]"
              style={{ animationDelay: "80ms", color: "var(--color-ink)" }}
            >
              The Axiom Foundation goes public on{" "}
              <span
                className="font-serif italic"
                style={{ fontFamily: "var(--f-serif)", color: "var(--color-accent)" }}
              >
                July 28.
              </span>
            </h2>

            <p
              className="announce-rise mt-2 max-w-[52ch] font-body text-[0.9rem] leading-relaxed text-[var(--color-ink-secondary)]"
              style={{ animationDelay: "160ms" }}
            >
              Join the virtual briefing for a first look at the rules
              we&apos;ve encoded &mdash; and everything that launches with
              them.
            </p>

            <div
              className="announce-rise mt-4"
              style={{ animationDelay: "240ms" }}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <a
                  href={LAUNCH_EVENT_URL}
                  onClick={() => trackAxiomEvent("announcement_cta_clicked", { cta: "join_launch_event" })}
                  className="announce-cta inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2 font-body text-[0.88rem] font-medium transition-all duration-200 hover:-translate-y-0.5 hover:bg-[rgba(217,119,6,0.22)]"
                  style={{
                    borderColor: "rgba(217,119,6,0.55)",
                    backgroundColor: "var(--color-accent-light)",
                  }}
                >
                  Join the launch event
                </a>
                <a
                  href={UPDATES_URL}
                  onClick={() => trackAxiomEvent("announcement_cta_clicked", { cta: "get_updates" })}
                  className="announce-link inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--color-rule)] px-4 py-2 font-body text-[0.88rem] font-medium transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--color-rule-strong)]"
                >
                  Get updates
                </a>
              </div>
            </div>
          </div>

          {/* Right: the countdown */}
          <div
            className="announce-rise w-full shrink-0 lg:w-auto"
            style={{ animationDelay: "200ms" }}
          >
            <div className="mb-2 font-mono text-[0.62rem] uppercase tracking-[0.32em] text-[var(--color-ink-muted)]">
              Doors open in
            </div>
            <div className="flex w-full items-stretch gap-1.5 sm:gap-2.5 lg:w-auto">
              {tiles.map((tile, i) => (
                <div
                  key={tile.label}
                  className="flex flex-1 items-stretch gap-1.5 sm:gap-2.5 lg:flex-none"
                >
                  <div className="flex min-w-0 flex-1 flex-col items-center rounded-xl border border-[var(--color-rule)] bg-[#0d0a07]/60 px-2 py-2 sm:px-2.5 lg:min-w-[54px] lg:flex-none">
                    <span
                      className="tnum font-mono text-[1.25rem] font-light leading-none text-[var(--color-ink)] sm:text-[1.45rem]"
                      style={{ fontVariantNumeric: "tabular-nums" }}
                    >
                      {tile.value === null
                        ? "––"
                        : String(tile.value).padStart(2, "0")}
                    </span>
                    <span className="mt-1.5 font-mono text-[0.55rem] uppercase tracking-[0.16em] text-[var(--color-ink-muted)] sm:text-[0.58rem] sm:tracking-[0.18em]">
                      {tile.label}
                    </span>
                  </div>
                  {i < tiles.length - 1 && (
                    <span
                      aria-hidden
                      className="hidden self-center font-mono text-[1.2rem] text-[var(--color-rule-strong)] sm:inline"
                    >
                      :
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
