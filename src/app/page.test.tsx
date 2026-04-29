import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
}))

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
}))

import Home from './page'

describe('Home page', () => {
  it('renders all landing sections', () => {
    render(<Home />)
    // Hero
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    // The gap
    expect(screen.getByRole('heading', { name: /laws that govern everyday life/i })).toBeInTheDocument()
    // Encoded law
    expect(screen.getByRole('heading', { name: /what it means to encode a law/i })).toBeInTheDocument()
    // Encoder
    expect(screen.getByRole('heading', { name: /encoded automatically/i })).toBeInTheDocument()
    // Applications
    expect(screen.getByRole('heading', { name: /one encoding\. many places/i })).toBeInTheDocument()
    // Foundation
    expect(screen.getByRole('heading', { name: /501\(c\)\(3\)/i })).toBeInTheDocument()
  })
})
