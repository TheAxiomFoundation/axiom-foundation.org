import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
}))

import FormatPage from './page'

describe('FormatPage', () => {
  it('renders the page heading', () => {
    render(<FormatPage />)
    expect(
      screen.getByRole('heading', { level: 1, name: /how rulespec compares/i }),
    ).toBeInTheDocument()
  })

  it('renders all four format tabs', () => {
    render(<FormatPage />)
    expect(screen.getByRole('button', { name: 'RuleSpec' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'DMN' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'OpenFisca/PE' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Catala' })).toBeInTheDocument()
  })

  it('renders all four example selectors', () => {
    render(<FormatPage />)
    expect(screen.getByRole('button', { name: 'NIIT' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'ACA Premium Tax Credit' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Standard Deduction' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'NY EITC' })).toBeInTheDocument()
  })

  it('renders the format comparison table', () => {
    render(<FormatPage />)
    expect(screen.getByText(/format comparison/i)).toBeInTheDocument()
  })

  it('switches to DMN tab on click', () => {
    render(<FormatPage />)
    fireEvent.click(screen.getByRole('button', { name: 'DMN' }))
    expect(screen.getByText('niit.dmn')).toBeInTheDocument()
  })

  it('links back to home and out to spec', () => {
    render(<FormatPage />)
    expect(screen.getByRole('link', { name: /back to overview/i })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: /spec on github/i })).toHaveAttribute(
      'href',
      'https://github.com/TheAxiomFoundation/rulespec',
    )
  })
})
