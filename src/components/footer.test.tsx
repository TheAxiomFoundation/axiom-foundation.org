import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
}))

import { Footer } from './footer'

describe('Footer', () => {
  it('renders the footer with wordmark', () => {
    render(<Footer />)
    const logo = screen.getByAltText('Axiom Foundation')
    expect(logo).toBeInTheDocument()
    expect(logo).toHaveAttribute('src', '/logos/rules-atlas.svg')
  })

  it('renders tagline', () => {
    render(<Footer />)
    expect(screen.getByText(/the world.*rules, encoded/i)).toBeInTheDocument()
  })

  it('renders navigation links', () => {
    render(<Footer />)
    expect(screen.getByText('About')).toBeInTheDocument()
    expect(screen.getByText('GitHub')).toBeInTheDocument()
    expect(screen.getByText('Contact')).toBeInTheDocument()
    expect(screen.getByText('Privacy')).toBeInTheDocument()
  })

  it('links to correct destinations', () => {
    render(<Footer />)
    expect(screen.getByText('About').closest('a')).toHaveAttribute('href', '/about')
    expect(screen.getByText('Privacy').closest('a')).toHaveAttribute('href', '/privacy')
    expect(screen.getByText('GitHub').closest('a')).toHaveAttribute('href', 'https://github.com/RuleAtlas')
    expect(screen.getByText('Contact').closest('a')).toHaveAttribute('href', 'mailto:hello@axiom-foundation.org')
  })
})
