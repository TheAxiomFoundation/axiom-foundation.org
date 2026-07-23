"use client";

import { useState } from "react";
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
    <ul className="cov-prog-list">
      {programs.map((program) => (
        <li key={program.family} className="cov-prog">
          <span className="cov-prog-name">{program.family}</span>
          <span className="cov-prog-count">
            {program.jurisdictions.length}{" "}
            {program.jurisdictions.length === 1
              ? "jurisdiction"
              : "jurisdictions"}
          </span>
          <span className="cov-prog-slugs">
            {program.jurisdictions.join(" · ")}
          </span>
        </li>
      ))}
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
