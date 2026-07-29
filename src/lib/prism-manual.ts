/**
 * Must be imported BEFORE prismjs anywhere in the client bundle.
 *
 * Prism reads `window.Prism.manual` at module-evaluation time; without
 * it, it re-highlights every `code[class*="language-"]` element on
 * DOMContentLoaded — overwriting our server-rendered markup (a React
 * hydration mismatch on every reader page) and destroying the custom
 * RuleSpec formula highlighting with plain YAML.
 */
declare global {
  interface Window {
    Prism?: { manual?: boolean };
  }
}

if (typeof window !== "undefined") {
  window.Prism = window.Prism || {};
  window.Prism.manual = true;
}

export {};
