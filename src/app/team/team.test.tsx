import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

// Mock next/image
vi.mock('next/image', () => ({
  default: (props: any) => <img {...props} />,
}))

import TeamPage from '@/app/team/page'

describe('TeamPage', () => {
  it('renders the page title', () => {
    render(<TeamPage />)
    expect(screen.getByRole('heading', { name: /^team$/i })).toBeInTheDocument()
  })

  it('renders all three team members with titles', () => {
    render(<TeamPage />)
    expect(screen.getByRole('heading', { name: 'Max Ghenis' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Ariel Kennan' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Pavel Makarchuk' })).toBeInTheDocument()
    expect(screen.getByText(/chief executive officer/i)).toBeInTheDocument()
    expect(screen.getByText(/^president$/i)).toBeInTheDocument()
    expect(screen.getByText(/product lead/i)).toBeInTheDocument()
  })

  it('renders a headshot for each member', () => {
    render(<TeamPage />)
    expect(screen.getByAltText('Max Ghenis')).toBeInTheDocument()
    expect(screen.getByAltText('Ariel Kennan')).toBeInTheDocument()
    expect(screen.getByAltText('Pavel Makarchuk')).toBeInTheDocument()
  })

  it('renders LinkedIn links but no GitHub link-outs', () => {
    render(<TeamPage />)
    const linkedin = screen.getAllByText('LinkedIn')
    expect(linkedin.length).toBe(3)
    expect(screen.queryByText(/github/i)).not.toBeInTheDocument()
  })
})
