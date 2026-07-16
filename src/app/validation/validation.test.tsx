import { render, screen } from '@testing-library/react'
import ValidationPage, { metadata } from './page'

describe('ValidationPage', () => {
  it('renders the header and method steps', () => {
    render(<ValidationPage />)
    expect(
      screen.getByRole('heading', { name: /every encoding, cross-checked/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /same case, every engine/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /disagreements explained/i }),
    ).toBeInTheDocument()
  })

  it('lists the independent oracles with link-outs', () => {
    render(<ValidationPage />)
    for (const oracle of [
      'PolicyEngine',
      'TAXSIM',
      'UKMOD / EUROMOD / SOUTHMOD',
      'PSL Tax-Calculator',
      'ACCESS NYC',
      'SNAP quality-control data',
    ]) {
      expect(screen.getByRole('heading', { name: oracle })).toBeInTheDocument()
    }
    const outs = screen.getAllByRole('link', { name: /visit the oracle/i })
    expect(outs).toHaveLength(6)
    for (const link of outs) {
      expect(link).toHaveAttribute('target', '_blank')
    }
  })

  it('links to the validation dashboard from the header', () => {
    render(<ValidationPage />)
    expect(
      screen.getByRole('link', { name: /open the validation dashboard/i }),
    ).toHaveAttribute('href', 'https://axiom-oracles.vercel.app')
  })

  it('invites ecosystem contributions in the closing band', () => {
    render(<ValidationPage />)
    expect(
      screen.getByRole('link', { name: /contribute an oracle/i }),
    ).toHaveAttribute(
      'href',
      'https://github.com/TheAxiomFoundation/axiom-oracles',
    )
    expect(
      screen.getByRole('link', { name: /report a discrepancy/i }),
    ).toHaveAttribute(
      'href',
      'https://github.com/TheAxiomFoundation/axiom-rules-engine/issues',
    )
  })

  it('is indexable with a descriptive title', () => {
    expect(metadata.title).toMatch(/validation/i)
    expect(metadata.robots).toBeUndefined()
  })
})
