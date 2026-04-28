import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import PrivacyPage from './PrivacyPage'

const renderWithRouter = (ui: React.ReactElement) => {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe('PrivacyPage', () => {
  it('renders the page title', () => {
    renderWithRouter(<PrivacyPage />)
    expect(screen.getByRole('heading', { name: /privacy policy/i })).toBeInTheDocument()
  })

  it('renders last updated date', () => {
    renderWithRouter(<PrivacyPage />)
    expect(screen.getByText(/last updated/i)).toBeInTheDocument()
  })

  it('renders information we collect section', () => {
    renderWithRouter(<PrivacyPage />)
    expect(screen.getByRole('heading', { name: /information we collect/i })).toBeInTheDocument()
    expect(screen.getByText(/vercel analytics/i)).toBeInTheDocument()
  })

  it('renders how we use information section', () => {
    renderWithRouter(<PrivacyPage />)
    expect(screen.getByRole('heading', { name: /how we use information/i })).toBeInTheDocument()
  })

  it('renders third-party services section', () => {
    renderWithRouter(<PrivacyPage />)
    expect(screen.getByRole('heading', { name: /third-party services/i })).toBeInTheDocument()
  })

  it('renders open source section with GitHub link', () => {
    renderWithRouter(<PrivacyPage />)
    expect(screen.getByRole('heading', { name: /open source/i })).toBeInTheDocument()
    expect(screen.getByText('github.com/TheAxiomFoundation')).toBeInTheDocument()
  })

  it('renders contact section with email', () => {
    renderWithRouter(<PrivacyPage />)
    expect(screen.getByRole('heading', { name: /contact/i })).toBeInTheDocument()
    expect(screen.getByText('hello@axiom-foundation.org')).toBeInTheDocument()
  })
})
