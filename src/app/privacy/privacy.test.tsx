import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import PrivacyPage from '@/app/privacy/page'

describe('PrivacyPage', () => {
  it('renders the page title', () => {
    render(<PrivacyPage />)
    expect(screen.getByRole('heading', { name: /privacy policy/i })).toBeInTheDocument()
  })

  it('renders last updated date', () => {
    render(<PrivacyPage />)
    expect(screen.getByText(/last updated/i)).toBeInTheDocument()
  })

  it('renders information we collect section', () => {
    render(<PrivacyPage />)
    expect(screen.getByRole('heading', { name: /information we collect/i })).toBeInTheDocument()
    expect(screen.getByText(/vercel analytics/i)).toBeInTheDocument()
  })

  it('renders how we use information section', () => {
    render(<PrivacyPage />)
    expect(screen.getByRole('heading', { name: /how we use information/i })).toBeInTheDocument()
  })

  it('renders third-party services section', () => {
    render(<PrivacyPage />)
    expect(screen.getByRole('heading', { name: /third-party services/i })).toBeInTheDocument()
  })

  it('renders open source section with GitHub link', () => {
    render(<PrivacyPage />)
    expect(screen.getByRole('heading', { name: /open source/i })).toBeInTheDocument()
    expect(screen.getByText('github.com/RuleAtlas')).toBeInTheDocument()
  })

  it('renders contact section with email', () => {
    render(<PrivacyPage />)
    expect(screen.getByRole('heading', { name: /contact/i })).toBeInTheDocument()
    expect(screen.getByText('hello@ruleatlas.org')).toBeInTheDocument()
  })
})
