import Prism from 'prismjs'

// ─── RAC Grammar ──────────────────────────────────────────────────────────────
// RAC (Rules as Code) is a YAML-structured DSL with Python-like formula
// expressions used to encode tax and benefit statutes.

const sectionKeywords = [
  'text',
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
  'imports',
  'entity',
  'period',
  'dtype',
  'label',
  'default',
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
  'from',
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

const typeKeywords = [
  'Person', 'TaxUnit', 'Household', 'Family', 'SPMUnit',
  'Year', 'Month', 'Day', 'Instant',
  'Money', 'Rate', 'Boolean', 'Integer', 'String', 'USD',
]

const racGrammar: Prism.Grammar = {
  comment: {
    pattern: /#.*|\/\/.*/,
    greedy: true,
  },

  'section-declaration': {
    pattern: new RegExp(
      `^(?:${sectionKeywords.join('|')})(?:\\s+[\\w]+)?\\s*:`,
      'm'
    ),
    inside: {
      'section-keyword': new RegExp(`^(?:${sectionKeywords.join('|')})`),
      'declaration-name': {
        pattern: /(?<=\s)[\w]+(?=\s*:)/,
      },
      punctuation: /:/,
    },
  },

  'bare-declaration': {
    pattern: /^[\w]+\s*:/m,
    inside: {
      'declaration-name': {
        pattern: /^[\w]+/,
      },
      punctuation: /:/,
    },
  },

  'triple-string': {
    pattern: /"""[\s\S]*?"""/,
    greedy: true,
    alias: 'string',
  },

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

  'import-path': {
    pattern: /\d+(?:\/[\w]+)+#[\w]+/,
    greedy: true,
  },

  date: {
    pattern: /\b\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])\b/,
    greedy: true,
  },

  string: {
    pattern: /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/,
    greedy: true,
  },

  'block-scalar': {
    pattern: /[|>](?=\s*$)/m,
  },

  'type-keyword': {
    pattern: new RegExp(`\\b(?:${typeKeywords.join('|')})\\b`),
  },

  // Must come before keyword to avoid "in" matching inside "min"
  builtin: {
    pattern: new RegExp(`\\b(?:${formulaBuiltins.join('|')})\\b`),
  },

  keyword: {
    pattern: new RegExp(`\\b(?:${formulaKeywords.join('|')})\\b`),
  },

  boolean: /\b(?:true|false)\b/i,

  number: /\b0x[\da-fA-F]+\b|-?\b\d+(?:\.\d+)?%|-?\b\d+(?:\.\d+)?\b/,

  operator: /==|!=|<=|>=|=>|[+\-*/<>=!?%]/,
  punctuation: /[{}[\](),:\.]/,
}

Prism.languages.rac = racGrammar

export { racGrammar }
export default racGrammar
