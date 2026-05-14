"use client";

import Prism from "prismjs";
import "prismjs/components/prism-python";
import "prismjs/components/prism-markup";
import "prismjs/components/prism-yaml";
import "@/lib/prism-catala";

Prism.languages["rulespec-formula"] = {
  string: {
    pattern: /(["'])(?:\\.|(?!\1)[^\\\r\n])*\1/,
    greedy: true,
  },
  comment: /#.*/,
  function: /\b[A-Za-z_][A-Za-z0-9_]*(?=\s*\()/,
  keyword: /\b(?:and|or|not|if|else|in|is|True|False|None|null)\b/,
  number: /\b(?:0x[\da-f]+|\d+(?:\.\d+)?(?:e[+-]?\d+)?)\b/i,
  operator: /[-+*/%<>=!]=?|\/\/|\*\*|\b(?:and|or|not|in|is)\b/,
  punctuation: /[()[\]{},.:]/,
  variable: /\b[A-Za-z_][A-Za-z0-9_]*\b/,
};

export type CodeLanguage =
  | "xml"
  | "python"
  | "yaml"
  | "catala"
  | "formula"
  | "plain";

const prismLang: Record<CodeLanguage, string> = {
  xml: "markup",
  python: "python",
  yaml: "yaml",
  catala: "catala",
  formula: "rulespec-formula",
  plain: "",
};

interface CodeBlockProps {
  code: string;
  language: CodeLanguage;
  className?: string;
}

export default function CodeBlock({
  code,
  language,
  className,
}: CodeBlockProps) {
  const prismLanguage = prismLang[language];
  const syntaxClass = `code-syntax language-${prismLanguage || "plain"}`;
  const preClassName = [syntaxClass, className].filter(Boolean).join(" ");

  if (language === "plain" || !Prism.languages[prismLanguage]) {
    return (
      <pre className={preClassName}>
        <code className={syntaxClass}>{code}</code>
      </pre>
    );
  }

  const html =
    language === "yaml"
      ? highlightYamlWithFormulaScalars(code)
      : Prism.highlight(code, Prism.languages[prismLanguage], prismLanguage);

  return (
    <pre className={preClassName}>
      <code
        className={syntaxClass}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </pre>
  );
}

function highlightYamlWithFormulaScalars(code: string): string {
  let formulaBlock: { keyIndent: number; bodyIndent: number | null } | null =
    null;
  const highlighted: string[] = [];

  for (const line of code.split("\n")) {
    if (formulaBlock) {
      const indent = leadingSpaceCount(line);
      if (line.trim() === "") {
        highlighted.push("");
        continue;
      }
      if (formulaBlock.bodyIndent === null) {
        if (indent > formulaBlock.keyIndent) {
          formulaBlock.bodyIndent = indent;
          highlighted.push(highlightFormulaBlockLine(line));
          continue;
        }
        formulaBlock = null;
      } else if (indent >= formulaBlock.bodyIndent) {
        highlighted.push(highlightFormulaBlockLine(line));
        continue;
      } else {
        formulaBlock = null;
      }
    }

    const match = line.match(/^(\s*(?:-\s*)?formula\s*:\s*)(.+)$/);
    if (!match) {
      highlighted.push(Prism.highlight(line, Prism.languages.yaml, "yaml"));
      continue;
    }

    const [, prefix, formula] = match;
    const trimmed = formula.trimStart();
    if (/^[>|][+-]?\d*\s*(?:#.*)?$/.test(trimmed)) {
      formulaBlock = { keyIndent: formulaKeyIndent(prefix), bodyIndent: null };
      highlighted.push(Prism.highlight(line, Prism.languages.yaml, "yaml"));
      continue;
    }

    highlighted.push(
      Prism.highlight(prefix, Prism.languages.yaml, "yaml") +
        highlightInlineFormulaValue(formula)
    );
  }

  return highlighted.join("\n");
}

function highlightInlineFormulaValue(value: string): string {
  const quoted = splitQuotedScalar(value);
  if (!quoted) {
    return Prism.highlight(
      value,
      Prism.languages["rulespec-formula"],
      "rulespec-formula"
    );
  }

  return [
    escapeHtml(quoted.leading),
    `<span class="token string">${escapeHtml(quoted.quote)}</span>`,
    Prism.highlight(
      quoted.body,
      Prism.languages["rulespec-formula"],
      "rulespec-formula"
    ),
    `<span class="token string">${escapeHtml(quoted.quote)}</span>`,
    escapeHtml(quoted.trailing),
  ].join("");
}

function splitQuotedScalar(value: string):
  | {
      leading: string;
      quote: "'" | '"';
      body: string;
      trailing: string;
    }
  | null {
  const match = value.match(/^(\s*)(['"])(.*)(\2)(\s*)$/);
  if (!match) return null;
  const [, leading, quote, body, , trailing] = match;
  return {
    leading,
    quote: quote as "'" | '"',
    body,
    trailing,
  };
}

function highlightFormulaBlockLine(line: string): string {
  const match = line.match(/^(\s*)(.*)$/);
  const indent = match?.[1] ?? "";
  const formula = match?.[2] ?? line;
  return (
    escapeHtml(indent) +
    Prism.highlight(
      formula,
      Prism.languages["rulespec-formula"],
      "rulespec-formula"
    )
  );
}

function formulaKeyIndent(prefix: string): number {
  const match = prefix.match(/^(\s*)/);
  return leadingSpaceCount(match?.[1] ?? "");
}

function leadingSpaceCount(value: string): number {
  const match = value.match(/^ */);
  return match?.[0].length ?? 0;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
