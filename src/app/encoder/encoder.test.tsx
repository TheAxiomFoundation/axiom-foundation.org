import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
}))

import EncoderPage from '@/app/encoder/page'

describe('EncoderPage', () => {
  it('renders the system map with pipeline and guardrails', () => {
    render(<EncoderPage />)

    expect(screen.getByRole('heading', { name: /how the harness actually works/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /recent proof points/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /pipeline explorer/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /failure pattern browser/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /run ledger and provenance files/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /inspect encoding records in axiom/i })).toHaveAttribute('href', 'https://app.axiom-foundation.org')
    expect(screen.getByRole('link', { name: /view broader technical stack/i })).toHaveAttribute('href', '/stack')
    expect(screen.getByText(/accepted autoresearch mutation/i)).toBeInTheDocument()
    expect(screen.getByText(/55-case uk bulk wave promoted/i)).toBeInTheDocument()
  })

  it('switches pipeline detail and guardrail detail panels', () => {
    render(<EncoderPage />)

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
    render(<EncoderPage />)

    expect(
      screen.getByText(/concrete current examples from the accepted autoresearch run and the latest uk bulk promotion/i)
    ).toBeInTheDocument()
  })

  it('shows the autoresearch decision artifact and holdout guardrail', () => {
    render(<EncoderPage />)

    const holdoutButton = screen.getByRole('button', { name: /do not keep prompt mutations without a holdout check/i })
    fireEvent.click(holdoutButton)
    expect(holdoutButton).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText(/autoresearch now scores candidates on frozen training manifests/i)).toBeInTheDocument()
    expect(screen.getByText(/decision\.json keep \/ discard gate/i)).toBeInTheDocument()

    const decisionButton = screen.getByRole('button', { name: /autoresearch decision\.json/i })
    fireEvent.click(decisionButton)
    expect(decisionButton).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText(/candidate_improved_training_and_preserved_final_review/i)).toBeInTheDocument()
    expect(screen.getByText(/baseline_training_score/i)).toBeInTheDocument()
    expect(screen.getByText(/candidate_final_review_score/i)).toBeInTheDocument()
  })
})
