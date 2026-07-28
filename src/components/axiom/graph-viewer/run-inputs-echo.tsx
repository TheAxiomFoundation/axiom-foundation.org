"use client";

import { humanizeRuleName } from "./citations";

/**
 * "Inputs in this run" — the results sheet echoes every input the
 * reader SELECTED for the scenario: typed values as themselves,
 * selected-but-untouched picks with their registry default and a
 * muted "default" tag ("You answered N of M" still counts typed
 * values only). Renders nothing when nothing was selected.
 */
export interface RunEchoItem {
  name: string;
  /** Typed value, else the registry default (null when the registry
   *  carries none — the engine still defaults it server-side). */
  value: number | boolean | null;
  /** Untouched pick: the value shown is the default, tagged so. */
  isDefault: boolean;
}

function formatValue(value: number | boolean | null): string {
  if (value === null) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return value.toLocaleString("en-US");
}

export function RunInputsEcho({ items }: { items: RunEchoItem[] }) {
  if (items.length === 0) return null;
  return (
    <div className="results-inputs" data-testid="results-inputs">
      <span className="results-inputs-label">Inputs in this run</span>
      <ul>
        {items.map((item) => (
          <li key={item.name}>
            <span>{humanizeRuleName(item.name)}</span>
            <span className="results-inputs-value">
              {item.isDefault && (
                <em
                  className="results-inputs-default"
                  data-testid="results-input-default"
                >
                  default
                </em>
              )}
              <strong>{formatValue(item.value)}</strong>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
