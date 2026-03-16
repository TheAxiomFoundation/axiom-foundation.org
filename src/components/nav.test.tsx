import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

const mockUsePathname = vi.fn()

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}))

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
}))

import { Nav } from '@/components/nav'

describe('Nav', () => {
  it('renders the logo linking to home', () => {
    mockUsePathname.mockReturnValue('/')
    render(<Nav />)
    const logo = screen.getByAltText('Axiom Foundation')
    expect(logo).toBeInTheDocument()
    expect(logo.closest('a')).toHaveAttribute('href', '/')
  })

  it('renders navigation links', () => {
    mockUsePathname.mockReturnValue('/')
    render(<Nav />)
    expect(screen.getByText('Browse')).toBeInTheDocument()
    expect(screen.getByText('.rac')).toBeInTheDocument()
    expect(screen.getByText('AutoRAC')).toBeInTheDocument()
    expect(screen.queryByText('Lab')).not.toBeInTheDocument()
    expect(screen.getByText('Browse')).toBeInTheDocument()
    expect(screen.getByText('Spec')).toBeInTheDocument()
    expect(screen.getByText('About')).toBeInTheDocument()
    expect(screen.getByText('Docs')).toBeInTheDocument()
  })

  it('renders anchor links on landing page (pathname /)', () => {
    mockUsePathname.mockReturnValue('/')
    render(<Nav />)
    const racLink = screen.getByText('.rac')
    expect(racLink.closest('a')).toHaveAttribute('href', '#format')
  })

  it('renders anchor links as Link on non-landing pages', () => {
    mockUsePathname.mockReturnValue('/about')
    render(<Nav />)
    const racLink = screen.getByText('.rac')
    expect(racLink.closest('a')).toHaveAttribute('href', '/#format')
  })

  it('highlights active link on /atlas', () => {
    mockUsePathname.mockReturnValue('/atlas')
    render(<Nav />)
    const atlasLink = screen.getByText('Browse')
    expect(atlasLink.closest('a')).toHaveClass('opacity-100')
  })

  it('highlights active link on /about', () => {
    mockUsePathname.mockReturnValue('/about')
    render(<Nav />)
    const aboutLink = screen.getByText('About')
    expect(aboutLink.closest('a')).toHaveClass('opacity-100')
  })

  it('renders GitHub icon link', () => {
    mockUsePathname.mockReturnValue('/')
    render(<Nav />)
    const links = screen.getAllByRole('link')
    const githubLink = links.find(
      (l) => l.getAttribute('href') === 'https://github.com/RuleAtlas',
    )
    expect(githubLink).toBeInTheDocument()
  })

  it('renders Browse link to /atlas', () => {
    mockUsePathname.mockReturnValue('/')
    render(<Nav />)
    const atlasLink = screen.getByText('Browse')
    expect(atlasLink.closest('a')).toHaveAttribute('href', '/atlas')
  })
})
