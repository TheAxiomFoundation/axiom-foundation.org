"use client";

import { useState } from "react";
import { JURISDICTIONS_SEED } from "@/lib/axiom/jurisdictions-seed";
import type { JurisdictionCoverage } from "@/lib/axiom/coverage-page";
import type { ProgramCoverage } from "@/lib/axiom/program-coverage";

/**
 * The coverage listing: one toggle, two views — by program (every
 * executable program family and where it runs) or by jurisdiction
 * (dense one-line tiles, name + provisions). Deliberately minimal:
 * no sorting, no filtering, everything visible at a glance.
 */

const numberFormat = new Intl.NumberFormat("en-US");
const n = (value: number) => numberFormat.format(value);

/** Display names for known program families; unknown families
 *  humanize their slug. */
const PROGRAM_LABELS: Record<string, { name: string; full: string }> = {
  snap: {
    name: "SNAP",
    full: "Supplemental Nutrition Assistance Program",
  },
  tanf: {
    name: "TANF",
    full: "Temporary Assistance for Needy Families",
  },
  "oasdi-wage-tax": {
    name: "OASDI wage tax",
    full: "Social Security payroll tax",
  },
  scretd: {
    name: "SCRETD",
    full: "Senior Citizens Real Estate Tax Deferral",
  },
  "universal-credit": {
    name: "Universal Credit",
    full: "The UK's unified means-tested benefit",
  },
};

function programLabel(family: string): { name: string; full: string | null } {
  const known = PROGRAM_LABELS[family];
  if (known) return known;
  return {
    name: family
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" "),
    full: null,
  };
}

function jurisdictionLabel(slug: string): string {
  return JURISDICTIONS_SEED.find((j) => j.slug === slug)?.label ?? slug;
}

export function CoverageViews({
  jurisdictions,
  programs,
}: {
  jurisdictions: JurisdictionCoverage[];
  programs: ProgramCoverage[];
}) {
  const [view, setView] = useState<"program" | "jurisdiction">(
    programs.length > 0 ? "program" : "jurisdiction"
  );

  return (
    <div>
      <div className="cov-seg mb-6" role="group" aria-label="Coverage view">
        <button
          type="button"
          onClick={() => setView("program")}
          className={view === "program" ? "cov-seg-btn cov-seg-on" : "cov-seg-btn"}
          aria-pressed={view === "program"}
        >
          By program
        </button>
        <button
          type="button"
          onClick={() => setView("jurisdiction")}
          className={
            view === "jurisdiction" ? "cov-seg-btn cov-seg-on" : "cov-seg-btn"
          }
          aria-pressed={view === "jurisdiction"}
        >
          By jurisdiction
        </button>
      </div>
      {view === "program" ? (
        <ProgramView programs={programs} />
      ) : (
        <JurisdictionView jurisdictions={jurisdictions} />
      )}
    </div>
  );
}

function ProgramView({ programs }: { programs: ProgramCoverage[] }) {
  if (programs.length === 0) {
    return (
      <p className="cov-note">
        The executable program registry is unavailable right now. Reload
        to try again.
      </p>
    );
  }
  return (
    <ul className="cov-prog-grid">
      {programs.map((program) => {
        const label = programLabel(program.family);
        return (
          <li key={program.family} className="cov-progcard">
            <div className="cov-progcard-head">
              <span className="cov-progcard-name">{label.name}</span>
              <span className="cov-progcard-count">
                {program.jurisdictions.length}
                <span className="cov-progcard-count-label">
                  {program.jurisdictions.length === 1
                    ? "jurisdiction"
                    : "jurisdictions"}
                </span>
              </span>
            </div>
            {label.full && (
              <span className="cov-progcard-full">{label.full}</span>
            )}
            <span className="cov-progcard-where">
              {program.jurisdictions
                .map((slug) => jurisdictionLabel(slug))
                .join(" · ")}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function JurisdictionView({
  jurisdictions,
}: {
  jurisdictions: JurisdictionCoverage[];
}) {
  return (
    <>
      <ul className="cov-mini-grid">
        {jurisdictions.map((j) => {
          const inCorpus = j.provisionCount > 0;
          const inner = (
            <>
              <span className="cov-mini-name">{j.label}</span>
              <span
                className={
                  inCorpus ? "cov-mini-num" : "cov-mini-num cov-mini-enc"
                }
              >
                {inCorpus ? n(j.provisionCount) : n(j.encodingFileCount)}
              </span>
            </>
          );
          return (
            <li key={j.slug}>
              {inCorpus ? (
                <a
                  href={`/${j.slug}`}
                  className="cov-mini"
                  aria-label={`${j.label}: ${n(j.provisionCount)} provisions. Browse.`}
                >
                  {inner}
                </a>
              ) : (
                <span
                  className="cov-mini cov-mini-static"
                  aria-label={`${j.label}: ${n(j.encodingFileCount)} encoding files, corpus ingestion pending.`}
                >
                  {inner}
                </span>
              )}
            </li>
          );
        })}
      </ul>
      <p className="cov-legend">
        figures are provisions · amber jurisdictions have encodings ahead
        of corpus ingestion
      </p>
    </>
  );
}
