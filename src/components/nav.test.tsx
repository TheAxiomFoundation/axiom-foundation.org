import { render, screen, fireEvent } from '@testing-library/react'
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

import { NavWrapper } from '@/components/nav-wrapper'

describe('Nav', () => {
  it('renders the logo linking to home', () => {
    mockUsePathname.mockReturnValue('/')
    render(<NavWrapper />)
    const logo = screen.getByAltText('Axiom Foundation')
    expect(logo.closest('a')).toHaveAttribute('href', '/')
  })

  it('renders navigation links', () => {
    mockUsePathname.mockReturnValue('/')
    render(<NavWrapper />)
    expect(screen.getByText('Browse')).toBeInTheDocument()
    expect(screen.getByText('.yaml')).toBeInTheDocument()
    expect(screen.getByText('AutoRuleSpec')).toBeInTheDocument()
    expect(screen.queryByText('Lab')).not.toBeInTheDocument()
    expect(screen.getByText('Spec')).toBeInTheDocument()
    expect(screen.getByText('About')).toBeInTheDocument()
    expect(screen.getByText('Docs')).toBeInTheDocument()
  })

  it('renders anchor links on landing page (pathname /)', () => {
    mockUsePathname.mockReturnValue('/')
    render(<NavWrapper />)
    const rulespecLink = screen.getByText('.yaml')
    expect(rulespecLink.closest('a')).toHaveAttribute('href', '#format')
  })

  it('renders anchor links as Link on non-landing pages', () => {
    mockUsePathname.mockReturnValue('/about')
    render(<NavWrapper />)
    const rulespecLink = screen.getByText('.yaml')
    expect(rulespecLink.closest('a')).toHaveAttribute('href', '/#format')
  })

  it('highlights active link on /atlas', () => {
    mockUsePathname.mockReturnValue('/atlas')
    render(<NavWrapper />)
    const atlasLink = screen.getByText('Browse')
    expect(atlasLink.closest('a')).toHaveClass('opacity-100')
  })

  it('highlights active link on /about', () => {
    mockUsePathname.mockReturnValue('/about')
    render(<NavWrapper />)
    const aboutLink = screen.getByText('About')
    expect(aboutLink.closest('a')).toHaveClass('opacity-100')
  })

  it('renders GitHub icon link', () => {
    mockUsePathname.mockReturnValue('/')
    render(<NavWrapper />)
    const links = screen.getAllByRole('link')
    const githubLink = links.find(
      (l) => l.getAttribute('href') === 'https://github.com/TheAxiomFoundation',
    )
    expect(githubLink).toBeInTheDocument()
  })

  it('renders Browse link to /atlas', () => {
    mockUsePathname.mockReturnValue('/')
    render(<NavWrapper />)
    const atlasLink = screen.getByText('Browse')
    expect(atlasLink.closest('a')).toHaveAttribute('href', '/atlas')
  })

  it('renders hamburger button for mobile', () => {
    mockUsePathname.mockReturnValue('/')
    render(<NavWrapper />)
    const button = screen.getByLabelText('Open menu')
    expect(button).toBeInTheDocument()
  })

  it('opens mobile drawer on hamburger click', () => {
    mockUsePathname.mockReturnValue('/')
    render(<NavWrapper />)
    const button = screen.getByLabelText('Open menu')
    fireEvent.click(button)
    // Mobile drawer renders duplicate links
    const browseLinks = screen.getAllByText('Browse')
    expect(browseLinks.length).toBe(2)
    expect(screen.getByLabelText('Close menu')).toBeInTheDocument()
  })

  it('closes mobile drawer on link click', () => {
    mockUsePathname.mockReturnValue('/')
    render(<NavWrapper />)
    fireEvent.click(screen.getByLabelText('Open menu'))
    const browseLinks = screen.getAllByText('Browse')
    fireEvent.click(browseLinks[1]) // click mobile link
    // Drawer should close, back to single link
    expect(screen.getAllByText('Browse').length).toBe(1)
  })
})
