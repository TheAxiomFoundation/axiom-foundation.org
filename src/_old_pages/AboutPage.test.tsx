import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import AboutPage from './AboutPage'

const renderWithRouter = (ui: React.ReactElement) => {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe('AboutPage', () => {
  it('renders the page title', () => {
    renderWithRouter(<AboutPage />)
    expect(screen.getByRole('heading', { name: /about rule atlas/i })).toBeInTheDocument()
  })

  it('renders the mission section', () => {
    renderWithRouter(<AboutPage />)
    expect(screen.getByRole('heading', { name: /our mission/i })).toBeInTheDocument()
    expect(screen.getByText(/machine-readable, verifiable/i)).toBeInTheDocument()
  })

  it('renders the what we do section with Atlas, RAC, and AutoRAC cards', () => {
    renderWithRouter(<AboutPage />)
    expect(screen.getByRole('heading', { name: /what we do/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Atlas' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'RAC' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'AutoRAC' })).toBeInTheDocument()
  })

  it('renders the team section with founder info', () => {
    renderWithRouter(<AboutPage />)
    expect(screen.getByRole('heading', { name: /team/i })).toBeInTheDocument()
    expect(screen.getByAltText('Max Ghenis')).toBeInTheDocument()
    expect(screen.getByText(/PolicyEngine/i)).toBeInTheDocument()
  })

  it('renders the contact section', () => {
    renderWithRouter(<AboutPage />)
    expect(screen.getByRole('heading', { name: /contact/i })).toBeInTheDocument()
    expect(screen.getByText('hello@ruleatlas.org')).toBeInTheDocument()
  })

  it('renders GitHub link in team section', () => {
    renderWithRouter(<AboutPage />)
    expect(screen.getByText('github.com/TheAxiomFoundation')).toBeInTheDocument()
  })
})
