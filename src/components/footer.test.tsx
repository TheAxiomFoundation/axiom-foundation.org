import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
}))

import { Footer } from '@axiom-foundation/ui'

describe('Footer', () => {
  it('renders the footer with wordmark', () => {
    render(<Footer />)
    const logo = screen.getByAltText('Axiom Foundation')
    expect(logo).toBeInTheDocument()
  })

  it('renders tagline', () => {
    render(<Footer />)
    expect(screen.getByText(/computable law for all/i)).toBeInTheDocument()
  })

  it('renders navigation links', () => {
    render(<Footer />)
    expect(screen.getByText('About')).toBeInTheDocument()
    expect(screen.getByText('Team')).toBeInTheDocument()
    expect(screen.getByText('Contact')).toBeInTheDocument()
    expect(screen.getByText('Privacy')).toBeInTheDocument()
    // GitHub link-outs are pulled back in Round 1.
    expect(screen.queryByText('GitHub')).not.toBeInTheDocument()
  })

  it('links to correct destinations', () => {
    render(<Footer />)
    expect(screen.getByText('About').closest('a')).toHaveAttribute('href', '/about')
    expect(screen.getByText('Team').closest('a')).toHaveAttribute('href', '/team')
    expect(screen.getByText('Privacy').closest('a')).toHaveAttribute('href', '/privacy')
    expect(screen.getByText('Contact').closest('a')).toHaveAttribute('href', 'mailto:hello@axiom.org')
  })
})
