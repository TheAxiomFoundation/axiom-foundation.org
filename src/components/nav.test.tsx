import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

const mockUsePathname = vi.fn()

vi.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}))

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
}))

import { NavWrapper } from '@/components/nav-wrapper'

describe('Nav', () => {
  it('renders the logo linking to home', () => {
    mockUsePathname.mockReturnValue('/')
    render(<NavWrapper />)
    const logo = screen.getByAltText('Axiom Foundation')
    expect(logo.closest('a')).toHaveAttribute('href', 'https://axiom-foundation.org')
  })

  it('renders navigation links', () => {
    mockUsePathname.mockReturnValue('/')
    render(<NavWrapper />)
    expect(screen.getByText('Axiom')).toBeInTheDocument()
    expect(screen.getByText('Why')).toBeInTheDocument()
    expect(screen.getByText('Encoding')).toBeInTheDocument()
    expect(screen.getByText('Encoder')).toBeInTheDocument()
    expect(screen.queryByText('.yaml')).not.toBeInTheDocument()
    expect(screen.queryByText('Encoding runs')).not.toBeInTheDocument()
    expect(screen.getByText('About')).toBeInTheDocument()
    expect(screen.getByText('Docs')).toBeInTheDocument()
  })

  it('renders anchor links on landing page (pathname /)', () => {
    mockUsePathname.mockReturnValue('/')
    render(<NavWrapper />)
    const encodingLink = screen.getByText('Encoding')
    expect(encodingLink.closest('a')).toHaveAttribute('href', 'https://axiom-foundation.org/#encoded')
    const encoderLink = screen.getByText('Encoder')
    expect(encoderLink.closest('a')).toHaveAttribute('href', 'https://axiom-foundation.org/#encoder')
  })

  it('renders anchor links as Link on non-landing pages', () => {
    mockUsePathname.mockReturnValue('/about')
    render(<NavWrapper />)
    const encodingLink = screen.getByText('Encoding')
    expect(encodingLink.closest('a')).toHaveAttribute('href', 'https://axiom-foundation.org/#encoded')
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

  it('renders Axiom link to the app subdomain', () => {
    mockUsePathname.mockReturnValue('/')
    render(<NavWrapper />)
    const axiomLink = screen.getByText('Axiom')
    expect(axiomLink.closest('a')).toHaveAttribute('href', 'https://app.axiom-foundation.org')
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
    const axiomLinks = screen.getAllByText('Axiom')
    expect(axiomLinks.length).toBe(2)
    expect(screen.getByLabelText('Close menu')).toBeInTheDocument()
  })

  it('closes mobile drawer on link click', () => {
    mockUsePathname.mockReturnValue('/')
    render(<NavWrapper />)
    fireEvent.click(screen.getByLabelText('Open menu'))
    const axiomLinks = screen.getAllByText('Axiom')
    fireEvent.click(axiomLinks[1])
    expect(screen.getAllByText('Axiom').length).toBe(1)
  })
})
