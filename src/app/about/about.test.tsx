import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

// Mock next/image
vi.mock('next/image', () => ({
  default: (props: any) => <img {...props} />,
}))

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
}))

import AboutPage from '@/app/about/page'

describe('AboutPage', () => {
  it('renders the page title', () => {
    render(<AboutPage />)
    expect(screen.getByRole('heading', { name: /about the axiom foundation/i })).toBeInTheDocument()
  })

  it('renders the mission section', () => {
    render(<AboutPage />)
    expect(screen.getByRole('heading', { name: /our mission/i })).toBeInTheDocument()
    expect(screen.getByText(/machine-readable, verifiable/i)).toBeInTheDocument()
  })

  it('renders the what we do section with Atlas, RAC, and AutoRAC cards', () => {
    render(<AboutPage />)
    expect(screen.getByRole('heading', { name: /what we do/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Atlas' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'RAC' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'AutoRAC' })).toBeInTheDocument()
  })

  it('renders the team section with founder info', () => {
    render(<AboutPage />)
    expect(screen.getByRole('heading', { name: /team/i })).toBeInTheDocument()
    expect(screen.getByAltText('Max Ghenis')).toBeInTheDocument()
    expect(screen.getByText(/PolicyEngine/i)).toBeInTheDocument()
  })

  it('renders the contact section', () => {
    render(<AboutPage />)
    expect(screen.getByRole('heading', { name: /contact/i })).toBeInTheDocument()
    expect(screen.getByText('hello@ruleatlas.org')).toBeInTheDocument()
  })

  it('renders GitHub link in team section', () => {
    render(<AboutPage />)
    expect(screen.getByText('github.com/RuleAtlas')).toBeInTheDocument()
  })
})
