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
      <CodeBlock code="format: rulespec/v1\nrules: []" language="yaml" />,
    )
    const codeEl = container.querySelector('code')
    expect(codeEl).toBeInTheDocument()
    expect(codeEl?.innerHTML).toContain('span')
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
