import Prism from 'prismjs'

// ─── RAC Grammar ──────────────────────────────────────────────────────────────
// RAC (Rules as Code) is a YAML-structured DSL with Python-like formula
// expressions used to encode tax and benefit statutes.

const sectionKeywords = [
  'text',
  'parameter',
  'variable',
  'input',
  'enum',
  'function',
  'versions',
  'module',
  'version',
  'jurisdiction',
  'import',
  'references',
]

const attributeKeys = [
  'description',
  'unit',
  'source',
  'reference',
  'values',
  'imports',
  'entity',
  'period',
  'dtype',
  'label',
  'default',
  'formula',
  'tests',
  'name',
  'inputs',
  'expect',
  'metadata',
  'enacted_by',
  'reverts_to',
  'parameters',
  'threshold',
  'cap',
  'defined_for',
  'private',
  'internal',
]

const formulaKeywords = [
  'if',
  'else',
  'elif',
  'return',
  'for',
  'break',
  'and',
  'or',
  'not',
  'in',
  'as',
  'True',
  'False',
  'None',
  'let',
  'match',
  'case',
]

const formulaBuiltins = ['max', 'min', 'abs', 'round', 'sum', 'len', 'interpolate']

const entityTypes = ['Person', 'TaxUnit', 'Household', 'Family', 'SPMUnit']

const periodTypes = ['Year', 'Month', 'Day', 'Instant']

const dataTypes = ['Money', 'Rate', 'Boolean', 'Integer', 'String', 'USD']

// Build the RAC grammar definition
const racGrammar: Prism.Grammar = {
  // Comments: # and // style
  comment: [
    {
      pattern: /#.*/,
      greedy: true,
    },
    {
      pattern: /\/\/.*/,
      greedy: true,
    },
  ],

  // Section keyword + declaration name (e.g., "parameter niit_rate:")
  // Must be matched as a single pattern to capture the declaration name
  'section-declaration': {
    pattern: new RegExp(
      `^(?:${sectionKeywords.join('|')})(?:\\s+[\\w]+)?\\s*:`,
      'm'
    ),
    lookbehind: false,
    inside: {
      'section-keyword': new RegExp(`^(?:${sectionKeywords.join('|')})`),
      'declaration-name': {
        pattern: /(?<=\s)[\w]+(?=\s*:)/,
      },
      punctuation: /:/,
    },
  },

  // Attribute keys (indented, followed by colon)
  'attr-name': {
    pattern: new RegExp(
      `(?:^|\\n)[ \\t]+(?:- )?(?:${attributeKeys.join('|')})(?=\\s*:)`,
      'gm'
    ),
    inside: {
      'attr-name': new RegExp(`(?:${attributeKeys.join('|')})`),
      punctuation: /-/,
    },
  },

  // Import paths: 26/1411/c#net_investment_income or 26/32#eitc
  'import-path': {
    pattern: /\d+(?:\/[\w]+)+#[\w]+/,
    greedy: true,
  },

  // Dates: YYYY-MM-DD
  date: {
    pattern: /\b\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])\b/,
    greedy: true,
  },

  // Strings
  string: [
    {
      pattern: /"(?:[^"\\]|\\.)*"/,
      greedy: true,
    },
    {
      pattern: /'(?:[^'\\]|\\.)*'/,
      greedy: true,
    },
  ],

  // Block scalar indicators (| and >)
  'block-scalar': {
    pattern: /[|>](?=\s*$)/m,
  },

  // Entity types
  'entity-type': {
    pattern: new RegExp(`\\b(?:${entityTypes.join('|')})\\b`),
  },

  // Period types
  'period-type': {
    pattern: new RegExp(`\\b(?:${periodTypes.join('|')})\\b`),
  },

  // Data types
  dtype: {
    pattern: new RegExp(`\\b(?:${dataTypes.join('|')})\\b`),
  },

  // Builtins (must come before keyword to avoid "in" matching inside "min")
  builtin: {
    pattern: new RegExp(`\\b(?:${formulaBuiltins.join('|')})\\b`),
  },

  // Keywords
  keyword: {
    pattern: new RegExp(`\\b(?:${formulaKeywords.join('|')})\\b`),
  },

  // Booleans: YAML-style true/false (case insensitive)
  boolean: /\b(?:true|false)\b/i,

  // Numbers: hex, floats, integers, percentages, negatives
  number: [
    // Hex
    {
      pattern: /\b0x[\da-fA-F]+\b/,
    },
    // Percentage (must come before generic number)
    {
      pattern: /-?\b\d+(?:\.\d+)?%/,
    },
    // Float or integer (possibly negative)
    {
      pattern: /-?\b\d+(?:\.\d+)?\b/,
    },
  ],

  // Operators
  operator: /==|!=|<=|>=|=>|[+\-*/<>=!?%]/,

  // Punctuation
  punctuation: /[{}[\](),:\.]/,
}

// Register the RAC grammar
Prism.languages.rac = racGrammar

// ─── Catala Grammar ───────────────────────────────────────────────────────────
// Catala is a related legal DSL. We provide basic highlighting support.

const catalaKeywords = [
  'scope',
  'definition',
  'rule',
  'under condition',
  'consequence',
  'assertion',
  'equals',
  'if',
  'then',
  'else',
  'match',
  'with pattern',
  'for',
  'let',
  'in',
  'not',
  'and',
  'or',
  'true',
  'false',
  'content',
  'struct',
  'enum',
  'declaration',
  'context',
  'input',
  'output',
  'internal',
  'state',
  'condition',
  'fulfilled',
  'integer',
  'decimal',
  'money',
  'date',
  'duration',
  'boolean',
  'collection',
  'sum',
  'exists',
  'among',
  'such that',
  'fixed by',
]

const catalaGrammar: Prism.Grammar = {
  // Comments in Catala use > at start of line or ```
  comment: [
    {
      pattern: /#.*/,
      greedy: true,
    },
  ],

  // Catala double-@ titles: @@Title@@
  'catala-title': {
    pattern: /@@[^@]+@@/,
    greedy: true,
  },

  // Catala single-@ sections: @Section@
  'catala-section': {
    pattern: /@[^@]+@/,
    greedy: true,
  },

  // Strings
  string: [
    {
      pattern: /"(?:[^"\\]|\\.)*"/,
      greedy: true,
    },
    {
      pattern: /'(?:[^'\\]|\\.)*'/,
      greedy: true,
    },
  ],

  // Keywords (multi-word first, then single-word)
  keyword: {
    pattern: new RegExp(
      `\\b(?:${catalaKeywords
        .sort((a, b) => b.length - a.length)
        .map((k) => k.replace(/\s+/g, '\\s+'))
        .join('|')})\\b`
    ),
  },

  // Numbers
  number: {
    pattern: /-?\b\d+(?:\.\d+)?\b/,
  },

  // Operators
  operator: /==|!=|<=|>=|--|->|[+\-*/<>=!]/,

  // Punctuation
  punctuation: /[{}[\](),:;\.]/,
}

// Register the Catala grammar
Prism.languages.catala = catalaGrammar

// ─── Exports ──────────────────────────────────────────────────────────────────
export { racGrammar, catalaGrammar }
export default racGrammar
