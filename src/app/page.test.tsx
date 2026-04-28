import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
}))

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
}))

import Home from './page'

describe('Home page', () => {
  it('renders all landing sections', () => {
    render(<Home />)
    // Hero
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    // Axiom section
    expect(screen.getByText(/federal statutes/i)).toBeInTheDocument()
    // CTA section
    expect(screen.getByRole('heading', { name: /get involved/i })).toBeInTheDocument()
  })
})
