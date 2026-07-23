import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
}))

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
}))

import { Hero } from '@/components/landing/hero'
import { TheGapSection } from '@/components/landing/the-gap-section'
import { EncodedLawSection } from '@/components/landing/encoded-law-section'
import { EncoderSection } from '@/components/landing/encoder-section'
import { ApplicationsSection } from '@/components/landing/applications-section'
import { FoundationSection } from '@/components/landing/foundation-section'

describe('Landing sections', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders the hero with the tagline', () => {
    render(<Hero />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      /computable law for all/i,
    )
  })

  it('renders the gap section with problem framing', () => {
    render(<TheGapSection />)
    expect(
      screen.getByRole('heading', { name: /law for the digital era/i }),
    ).toBeInTheDocument()
    expect(screen.getByText(/each system reimplements the law/i)).toBeInTheDocument()
    expect(screen.getByText(/AI needs ground truth/i)).toBeInTheDocument()
  })

  it('renders both layers (worked example removed)', () => {
    render(<EncodedLawSection />)
    expect(
      screen.getByRole('heading', { name: /two layers, both in the open/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /the primary text, gathered/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /encoded so anyone can compute them/i }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: /aca premium tax credit/i }),
    ).toBeNull()
  })

  it('renders the encoder section with terminal + steps', () => {
    render(<EncoderSection />)
    expect(
      screen.getByRole('heading', { name: /encoded automatically/i }),
    ).toBeInTheDocument()
    expect(screen.getByText(/axiom encode "26 USC 32"/i)).toBeInTheDocument()
    for (const step of ['Read', 'Encode', 'Verify']) {
      expect(screen.getByRole('heading', { name: step })).toBeInTheDocument()
    }
  })

  it('renders the applications section with four use cases', () => {
    render(<ApplicationsSection />)
    expect(
      screen.getByRole('heading', { name: /one encoding\. many places/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /calculators that audit themselves/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /ground truth for AI/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /reform without rewriting/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /government in plain sight/i }),
    ).toBeInTheDocument()
  })

  it('renders the foundation coda with public-interest framing', () => {
    render(<FoundationSection />)
    expect(screen.getByRole('heading', { name: /doing the public-interest work/i })).toBeInTheDocument()
    expect(screen.getByText(/everything we publish/i)).toBeInTheDocument()
    // The fiscal-sponsorship line was removed (Jul 14).
    expect(screen.queryByText(/fiscally sponsored/i)).not.toBeInTheDocument()
    // Contribute / Verify / Fund cards are back for the v2 launch.
    expect(screen.getByText(/encode your jurisdiction/i)).toBeInTheDocument()
    expect(screen.getByText(/validate our work/i)).toBeInTheDocument()
    expect(screen.getByText(/underwrite the public layer/i)).toBeInTheDocument()
    // The quick-links row (Live demos / Meet the team / …) was
    // removed — the footer carries those destinations.
    expect(screen.queryByText(/live demos/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/meet the team/i)).not.toBeInTheDocument()
  })
})

