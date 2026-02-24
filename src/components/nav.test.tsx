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

import { Nav } from '@/components/nav'

describe('Nav', () => {
  it('renders the logo linking to home', () => {
    mockUsePathname.mockReturnValue('/')
    render(<Nav />)
    const logo = screen.getByAltText('Rules Foundation')
    expect(logo).toBeInTheDocument()
    expect(logo.closest('a')).toHaveAttribute('href', '/')
  })

  it('renders navigation links', () => {
    mockUsePathname.mockReturnValue('/')
    render(<Nav />)
    expect(screen.getByText('Atlas')).toBeInTheDocument()
    expect(screen.getByText('.rac')).toBeInTheDocument()
    expect(screen.getByText('AutoRAC')).toBeInTheDocument()
    expect(screen.getByText('Lab')).toBeInTheDocument()
    expect(screen.getByText('Spec')).toBeInTheDocument()
    expect(screen.getByText('About')).toBeInTheDocument()
    expect(screen.getByText('Docs')).toBeInTheDocument()
  })

  it('renders anchor links on landing page (pathname /)', () => {
    mockUsePathname.mockReturnValue('/')
    render(<Nav />)
    const atlasLink = screen.getByText('Atlas')
    expect(atlasLink.closest('a')).toHaveAttribute('href', '#atlas')
  })

  it('renders anchor links as Link on non-landing pages', () => {
    mockUsePathname.mockReturnValue('/about')
    render(<Nav />)
    const atlasLink = screen.getByText('Atlas')
    // On non-landing pages, anchor links should be full href with /#
    expect(atlasLink.closest('a')).toHaveAttribute('href', '/#atlas')
  })

  it('highlights active link on /lab', () => {
    mockUsePathname.mockReturnValue('/lab')
    render(<Nav />)
    const labLink = screen.getByText('Lab')
    // Active link has text-[var(--color-text)] class
    expect(labLink.closest('a')).toHaveClass('text-[var(--color-text)]')
  })

  it('highlights active link on /atlas', () => {
    mockUsePathname.mockReturnValue('/atlas')
    render(<Nav />)
    const browseLink = screen.getByText('Browse')
    expect(browseLink.closest('a')).toHaveClass('text-[var(--color-text)]')
  })

  it('highlights active link on /about', () => {
    mockUsePathname.mockReturnValue('/about')
    render(<Nav />)
    const aboutLink = screen.getByText('About')
    expect(aboutLink.closest('a')).toHaveClass('text-[var(--color-text)]')
  })

  it('renders GitHub icon link', () => {
    mockUsePathname.mockReturnValue('/')
    render(<Nav />)
    const links = screen.getAllByRole('link')
    const githubLink = links.find(
      (l) => l.getAttribute('href') === 'https://github.com/RulesFoundation',
    )
    expect(githubLink).toBeInTheDocument()
  })

  it('renders Browse link to /atlas', () => {
    mockUsePathname.mockReturnValue('/')
    render(<Nav />)
    const browseLink = screen.getByText('Browse')
    expect(browseLink.closest('a')).toHaveAttribute('href', '/atlas')
  })

  it('toggles mobile menu on hamburger click', () => {
    mockUsePathname.mockReturnValue('/')
    render(<Nav />)
    const hamburger = screen.getByLabelText('Toggle menu')

    // Menu should not be visible initially
    expect(screen.queryByText('GitHub')).not.toBeInTheDocument()

    // Open menu
    fireEvent.click(hamburger)
    expect(screen.getByText('GitHub')).toBeInTheDocument()

    // Close menu (X icon shown)
    fireEvent.click(hamburger)
    expect(screen.queryByText('GitHub')).not.toBeInTheDocument()
  })

  it('closes mobile menu when a link is clicked', () => {
    mockUsePathname.mockReturnValue('/')
    render(<Nav />)

    // Open menu
    fireEvent.click(screen.getByLabelText('Toggle menu'))
    expect(screen.getByText('GitHub')).toBeInTheDocument()

    // Click a link in the mobile menu — find the Docs link in mobile menu
    const mobileLinks = screen.getAllByText('Docs')
    fireEvent.click(mobileLinks[mobileLinks.length - 1])

    expect(screen.queryByText('GitHub')).not.toBeInTheDocument()
  })

  it('closes mobile menu when GitHub link is clicked', () => {
    mockUsePathname.mockReturnValue('/')
    render(<Nav />)

    fireEvent.click(screen.getByLabelText('Toggle menu'))
    fireEvent.click(screen.getByText('GitHub'))

    expect(screen.queryByText('GitHub')).not.toBeInTheDocument()
  })

  it('closes mobile menu when a nav link is clicked on landing page', () => {
    mockUsePathname.mockReturnValue('/')
    render(<Nav />)

    fireEvent.click(screen.getByLabelText('Toggle menu'))
    // Mobile menu should have anchor links since we're on /
    const mobileAtlasLinks = screen.getAllByText('Atlas')
    fireEvent.click(mobileAtlasLinks[mobileAtlasLinks.length - 1])

    expect(screen.queryByText('GitHub')).not.toBeInTheDocument()
  })

  it('closes mobile menu when a nav link is clicked on non-landing page', () => {
    mockUsePathname.mockReturnValue('/lab')
    render(<Nav />)

    fireEvent.click(screen.getByLabelText('Toggle menu'))
    // On non-/ pages, anchor links render as Link with /#
    const mobileAtlasLinks = screen.getAllByText('Atlas')
    fireEvent.click(mobileAtlasLinks[mobileAtlasLinks.length - 1])

    expect(screen.queryByText('GitHub')).not.toBeInTheDocument()
  })

  it('closes mobile menu when Browse link is clicked', () => {
    mockUsePathname.mockReturnValue('/')
    render(<Nav />)

    fireEvent.click(screen.getByLabelText('Toggle menu'))
    const browseLinks = screen.getAllByText('Browse')
    fireEvent.click(browseLinks[browseLinks.length - 1])

    expect(screen.queryByText('GitHub')).not.toBeInTheDocument()
  })
})
