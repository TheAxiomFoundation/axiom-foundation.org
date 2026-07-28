"use client";

import { humanizeRuleName } from "./citations";

/**
 * "Inputs you set" — the results sheet echoes exactly the facts the
 * reader entered (name + value), so a run is never a black box.
 * Renders nothing when the scenario is empty (the sheet's "You
 * answered 0 of N" line already says so).
 */
export function RunInputsEcho({
  scenario,
}: {
  scenario: Record<string, number | boolean>;
}) {
  const entries = Object.entries(scenario);
  if (entries.length === 0) return null;
  return (
    <div className="results-inputs" data-testid="results-inputs">
      <span className="results-inputs-label">Inputs you set</span>
      <ul>
        {entries.map(([name, value]) => (
          <li key={name}>
            <span>{humanizeRuleName(name)}</span>
            <strong>
              {typeof value === "boolean"
                ? value
                  ? "Yes"
                  : "No"
                : value.toLocaleString("en-US")}
            </strong>
          </li>
        ))}
      </ul>
    </div>
  );
}
