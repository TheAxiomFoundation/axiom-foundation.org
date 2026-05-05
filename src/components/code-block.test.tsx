import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import CodeBlock from '@/components/code-block'

describe('CodeBlock', () => {
  it('renders plain language without syntax highlighting', () => {
    render(<CodeBlock code="hello world" language="plain" />)
    expect(screen.getByText('hello world')).toBeInTheDocument()
  })

  it('renders RuleSpec YAML with Prism YAML highlighting', () => {
    const { container } = render(
      <CodeBlock
        code={
          "format: rulespec/v1\nrules:\n  - formula: max(0, wages - base_wages)"
        }
        language="yaml"
      />,
    )
    const codeEl = container.querySelector('code')
    expect(codeEl).toBeInTheDocument()
    expect(codeEl).toHaveClass('code-syntax')
    expect(codeEl).toHaveClass('language-yaml')
    expect(codeEl?.innerHTML).toContain('span')
    expect(codeEl?.innerHTML).toContain('token function')
    expect(codeEl?.innerHTML).toContain('token variable')
  })

  it('highlights quoted RuleSpec formula values as formulas, not plain YAML strings', () => {
    const { container } = render(
      <CodeBlock
        code={"versions:\n  - formula: '0.062'\n  - formula: \"max(0, wages - base_wages)\""}
        language="yaml"
      />,
    )
    const codeEl = container.querySelector('code')
    expect(codeEl?.innerHTML).toContain('token number')
    expect(codeEl?.innerHTML).toContain('token function')
    expect(codeEl?.innerHTML).toContain('token variable')
  })

  it('highlights RuleSpec formula block scalar bodies as formulas', () => {
    const { container } = render(
      <CodeBlock
        code={`versions:
  - formula: |-
      max(
        0,
        current_year_indian_employment_costs
        - base_year_1993_indian_employment_costs
      )
    effective_from: '1993-01-01'`}
        language="yaml"
      />,
    )
    const codeEl = container.querySelector('code')
    expect(codeEl?.innerHTML).toContain('token function')
    expect(codeEl?.innerHTML).toContain('current_year_indian_employment_costs')
    expect(codeEl?.innerHTML).toContain('token variable')
    expect(codeEl?.innerHTML).not.toContain('token variable">effective_from')
    expect(codeEl?.textContent).toContain("effective_from: '1993-01-01'")
  })

  it('renders xml code with Prism highlighting', () => {
    const { container } = render(
      <CodeBlock code="<tag>content</tag>" language="xml" />,
    )
    const codeEl = container.querySelector('code')
    expect(codeEl).toBeInTheDocument()
  })

  it('renders python code with Prism highlighting', () => {
    const { container } = render(
      <CodeBlock code="def foo(): pass" language="python" />,
    )
    const codeEl = container.querySelector('code')
    expect(codeEl).toBeInTheDocument()
    expect(codeEl).toHaveClass('language-python')
  })

  it('renders formula code with Python-like highlighting', () => {
    const { container } = render(
      <CodeBlock code="max(0, wages - base_wages)" language="formula" />,
    )
    const codeEl = container.querySelector('code')
    expect(codeEl).toHaveClass('language-rulespec-formula')
    expect(codeEl?.innerHTML).toContain('token function')
    expect(codeEl?.innerHTML).toContain('token variable')
    expect(codeEl?.innerHTML).toContain('token number')
  })

  it('renders yaml code with Prism highlighting', () => {
    const { container } = render(
      <CodeBlock code="key: value" language="yaml" />,
    )
    const codeEl = container.querySelector('code')
    expect(codeEl).toBeInTheDocument()
  })

  it('renders catala code with Prism highlighting', () => {
    const { container } = render(
      <CodeBlock code="scope Test: definition x equals 1" language="catala" />,
    )
    const codeEl = container.querySelector('code')
    expect(codeEl).toBeInTheDocument()
  })

  it('applies className to pre element', () => {
    const { container } = render(
      <CodeBlock code="test" language="plain" className="custom-class" />,
    )
    expect(container.querySelector('pre')).toHaveClass('custom-class')
  })
})
