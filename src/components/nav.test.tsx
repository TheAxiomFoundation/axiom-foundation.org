import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

const mockUsePathname = vi.fn()

vi.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}))

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
}))

import { NavClient } from '@/components/nav-client'
import { appHrefForHost, marketingOriginForHost } from '@/components/nav-wrapper'

describe('Nav', () => {
  it('maps app hosts back to the matching marketing origin', () => {
    expect(marketingOriginForHost('app.axiom-foundation.org')).toBe(
      'https://axiom-foundation.org',
    )
    expect(
      marketingOriginForHost(
        'app-axiom-foundation-git-fix-app-header-redirects-policy-engine.vercel.app',
      ),
    ).toBeUndefined()
    expect(marketingOriginForHost('axiom-foundation.org')).toBeUndefined()
    expect(marketingOriginForHost('app-example.vercel.app')).toBeUndefined()
  })

  it('maps marketing hosts to the matching app href', () => {
    expect(appHrefForHost('axiom-foundation.org')).toBe(
      'https://app.axiom-foundation.org',
    )
    expect(appHrefForHost('www.axiom-foundation.org')).toBe(
      'https://app.axiom-foundation.org',
    )
    expect(appHrefForHost('app.axiom-foundation.org')).toBe(
      'https://app.axiom-foundation.org',
    )
    expect(
      appHrefForHost(
        'axiom-foundation-git-fix-app-header-redirects-policy-engine.vercel.app',
      ),
    ).toBe('/axiom')
    expect(appHrefForHost('app-axiom-foundation-git-fix-app-header-redirects-policy-engine.vercel.app')).toBeUndefined()
    expect(appHrefForHost('app-axiom-foundation-preview.vercel.app')).toBeUndefined()
    expect(appHrefForHost('axiom-foundation-preview.vercel.app')).toBeUndefined()
    expect(appHrefForHost('preview-policy-engine.vercel.app')).toBeUndefined()
  })

  it('renders the logo linking to home', () => {
    mockUsePathname.mockReturnValue('/')
    render(<NavClient />)
    const logo = screen.getByAltText('Axiom Foundation')
    expect(logo.closest('a')).toHaveAttribute('href', '/')
  })

  it('renders navigation links', () => {
    mockUsePathname.mockReturnValue('/')
    render(<NavClient />)
    expect(screen.getByText('Axiom')).toBeInTheDocument()
    expect(screen.getByText('Why')).toBeInTheDocument()
    expect(screen.getByText('Encoding')).toBeInTheDocument()
    expect(screen.getByText('Encoder')).toBeInTheDocument()
    expect(screen.queryByText('.yaml')).not.toBeInTheDocument()
    expect(screen.queryByText('Encoding runs')).not.toBeInTheDocument()
    expect(screen.getByText('About')).toBeInTheDocument()
    expect(screen.getByText('Docs')).toBeInTheDocument()
  })

  it('renders anchor links on landing page (pathname /) as bare hashes', () => {
    mockUsePathname.mockReturnValue('/')
    render(<NavClient />)
    const encodingLink = screen.getByText('Encoding')
    expect(encodingLink.closest('a')).toHaveAttribute('href', '#encoded')
    const encoderLink = screen.getByText('Encoder')
    expect(encoderLink.closest('a')).toHaveAttribute('href', '#encoder')
  })

  it('renders anchor links as relative paths on non-landing pages', () => {
    mockUsePathname.mockReturnValue('/about')
    render(<NavClient />)
    const encodingLink = screen.getByText('Encoding')
    expect(encodingLink.closest('a')).toHaveAttribute('href', '/#encoded')
  })

  it('highlights active link on /about', () => {
    mockUsePathname.mockReturnValue('/about')
    render(<NavClient />)
    const aboutLink = screen.getByText('About')
    expect(aboutLink.closest('a')).toHaveClass('opacity-100')
  })

  it('renders GitHub icon link', () => {
    mockUsePathname.mockReturnValue('/')
    render(<NavClient />)
    const links = screen.getAllByRole('link')
    const githubLink = links.find(
      (l) => l.getAttribute('href') === 'https://github.com/TheAxiomFoundation',
    )
    expect(githubLink).toBeInTheDocument()
  })

  it('renders Axiom link to the app subdomain by default', () => {
    mockUsePathname.mockReturnValue('/')
    render(<NavClient />)
    const axiomLink = screen.getByText('Axiom')
    expect(axiomLink.closest('a')).toHaveAttribute('href', 'https://app.axiom-foundation.org')
  })

  it('supports the in-site app route for preview-safe navigation', () => {
    mockUsePathname.mockReturnValue('/')
    render(<NavClient appUrl="/axiom" />)
    const axiomLink = screen.getByText('Axiom')
    expect(axiomLink.closest('a')).toHaveAttribute('href', '/axiom')
  })

  it('renders hamburger button for mobile', () => {
    mockUsePathname.mockReturnValue('/')
    render(<NavClient />)
    const button = screen.getByLabelText('Open menu')
    expect(button).toBeInTheDocument()
  })

  it('opens mobile drawer on hamburger click', () => {
    mockUsePathname.mockReturnValue('/')
    render(<NavClient />)
    const button = screen.getByLabelText('Open menu')
    fireEvent.click(button)
    const axiomLinks = screen.getAllByText('Axiom')
    expect(axiomLinks.length).toBe(2)
    expect(screen.getByLabelText('Close menu')).toBeInTheDocument()
  })

  it('closes mobile drawer on link click', () => {
    mockUsePathname.mockReturnValue('/')
    render(<NavClient />)
    fireEvent.click(screen.getByLabelText('Open menu'))
    const axiomLinks = screen.getAllByText('Axiom')
    fireEvent.click(axiomLinks[1])
    expect(screen.getAllByText('Axiom').length).toBe(1)
  })

  it('renders app-host marketing links as absolute URLs from the first render', () => {
    mockUsePathname.mockReturnValue('/axiom/us')
    render(
      <NavClient
        baseUrl="https://axiom-foundation.org"
        appUrl="https://app.axiom-foundation.org"
      />,
    )

    expect(screen.getByText('Why').closest('a')).toHaveAttribute(
      'href',
      'https://axiom-foundation.org/#gap',
    )
    expect(screen.getByAltText('Axiom Foundation').closest('a')).toHaveAttribute(
      'href',
      'https://axiom-foundation.org',
    )
  })
})
