import Prism from 'prismjs'
import 'prismjs/components/prism-python'
import 'prismjs/components/prism-markup'
import 'prismjs/components/prism-yaml'
import 'prism-rac' // Registers Prism.languages.rac and Prism.languages.catala
import 'prism-rac/themes/dark.css'

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
