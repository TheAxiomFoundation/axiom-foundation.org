import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
}))

import AutoracPage from '@/app/autorac/page'

describe('AutoracPage', () => {
  it('renders the system map with pipeline and guardrails', () => {
    render(<AutoracPage />)

    expect(screen.getByRole('heading', { name: /how the harness actually works/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /pipeline explorer/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /failure pattern browser/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /run ledger and provenance files/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /inspect encoding records in atlas/i })).toHaveAttribute('href', '/atlas')
  })

  it('switches pipeline detail and guardrail detail panels', () => {
    render(<AutoracPage />)

    const ciStageButton = screen.getByRole('button', { name: /run deterministic ci, not just compilation/i })
    fireEvent.click(ciStageButton)
    expect(ciStageButton).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText(/embedded scalar detector/i)).toBeInTheDocument()
    expect(screen.getAllByText(/numeric occurrence coverage/i).length).toBeGreaterThan(0)

    const leadInButton = screen.getByRole('button', { name: /preserve binding lead-in conjuncts in branch slices/i })
    fireEvent.click(leadInButton)
    expect(leadInButton).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText(/dropped an explicit parent conjunct/i)).toBeInTheDocument()
    expect(screen.getByText(/slice-aware generalist review/i)).toBeInTheDocument()
  })

  it('labels artifact examples as representative rather than live-bound', () => {
    render(<AutoracPage />)

    expect(
      screen.getByText(/representative of the file shapes the harness writes, not a live view of the current run directory/i)
    ).toBeInTheDocument()
  })
})
