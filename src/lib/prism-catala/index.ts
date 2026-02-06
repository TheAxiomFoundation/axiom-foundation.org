import Prism from 'prismjs'

// ─── Catala Grammar ──────────────────────────────────────────────────────────
// Catala is a literate programming language for law, developed by DGFIP and Inria.
// Files use .catala_en, .catala_fr extensions.
// https://catala-lang.org

// Keywords that are NOT type names (type names are handled separately)
const catalaKeywords = [
  'scope', 'definition', 'rule', 'under condition', 'consequence',
  'assertion', 'equals', 'if', 'then', 'else', 'match', 'with pattern',
  'for', 'let', 'in', 'not', 'and', 'or', 'true', 'false',
  'content', 'struct', 'enum', 'declaration', 'context',
  'input', 'output', 'internal', 'state', 'condition', 'fulfilled',
  'sum', 'exists', 'among', 'such that', 'fixed by',
]

const typeNames = ['money', 'decimal', 'integer', 'boolean', 'date', 'duration', 'collection']

const catalaGrammar: Prism.Grammar = {
  // Comments: # line comments and /* */ block comments
  comment: [
    { pattern: /#.*/, greedy: true },
    { pattern: /\/\*[\s\S]*?\*\//, greedy: true },
  ],

  // Document structure: @@Title@@ (must come before section to avoid partial matches)
  'catala-title': {
    pattern: /@@[^@]+@@/,
    greedy: true,
  },

  // Document structure: @Section@
  'catala-section': {
    pattern: /@[^@]+@/,
    greedy: true,
  },

  // Strings
  string: [
    { pattern: /"(?:[^"\\]|\\.)*"/, greedy: true },
    { pattern: /'(?:[^'\\]|\\.)*'/, greedy: true },
  ],

  // Scope declaration: "declaration scope Name" or "scope Name"
  // Matched as a composite pattern with inner tokenization
  'scope-declaration': {
    pattern: /\b(?:declaration\s+scope|scope)\s+\w+/,
    inside: {
      keyword: /\b(?:declaration|scope)\b/,
      'scope-name': /\w+$/,
    },
  },

  // Type names (must come before keyword to avoid being consumed)
  'type-name': {
    pattern: new RegExp(`\\b(?:${typeNames.join('|')})\\b`),
  },

  // Keywords (multi-word keywords sorted longest-first to match greedily)
  keyword: {
    pattern: new RegExp(
      `\\b(?:${catalaKeywords
        .sort((a, b) => b.length - a.length)
        .map((k) => k.replace(/\s+/g, '\\s+'))
        .join('|')})\\b`
    ),
  },

  // Numbers: percentages, floats, integers (possibly negative)
  number: [
    { pattern: /-?\b\d+(?:\.\d+)?%/ },
    { pattern: /-?\b\d+(?:\.\d+)?\b/ },
  ],

  // Operators
  operator: /==|!=|<=|>=|--|->|[+\-*/<>=!]/,

  // Punctuation
  punctuation: /[{}[\](),:;\.]/,
}

// Register the Catala grammar
Prism.languages.catala = catalaGrammar

// ─── Exports ──────────────────────────────────────────────────────────────────
export { catalaGrammar }
export default catalaGrammar
