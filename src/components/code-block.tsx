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
  return code
    .split("\n")
    .map((line) => {
      const match = line.match(/^(\s*(?:-\s*)?formula\s*:\s*)(.+)$/);
      if (!match) {
        return Prism.highlight(line, Prism.languages.yaml, "yaml");
      }

      const [, prefix, formula] = match;
      if (/^[>|]/.test(formula.trim())) {
        return Prism.highlight(line, Prism.languages.yaml, "yaml");
      }

      return (
        Prism.highlight(prefix, Prism.languages.yaml, "yaml") +
        Prism.highlight(
          formula,
          Prism.languages["rulespec-formula"],
          "rulespec-formula"
        )
      );
    })
    .join("\n");
}
