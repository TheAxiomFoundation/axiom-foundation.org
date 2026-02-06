import Prism from 'prismjs'
import 'prismjs/components/prism-python'
import 'prismjs/components/prism-markup'
import 'prismjs/components/prism-yaml'
import '../lib/prism-rac' // Registers Prism.languages.rac
import '../lib/prism-rac/dark.css'
import '../lib/prism-catala' // Registers Prism.languages.catala
import '../lib/prism-catala/dark.css'

type Language = 'rac' | 'xml' | 'python' | 'yaml' | 'catala' | 'plain'

const prismLang: Record<Language, string> = {
  rac: 'rac',
  xml: 'markup',
  python: 'python',
  yaml: 'yaml',
  catala: 'catala',
  plain: '',
}

interface CodeBlockProps {
  code: string
  language: Language
  className?: string
}

export default function CodeBlock({ code, language, className }: CodeBlockProps) {
  if (language === 'plain' || !Prism.languages[prismLang[language]]) {
    return (
      <pre className={className}>
        <code>{code}</code>
      </pre>
    )
  }

  const html = Prism.highlight(
    code,
    Prism.languages[prismLang[language]],
    prismLang[language],
  )

  return (
    <pre className={className}>
      <code dangerouslySetInnerHTML={{ __html: html }} />
    </pre>
  )
}
