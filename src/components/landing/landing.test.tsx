import { render, screen, fireEvent, act } from '@testing-library/react'
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
      screen.getByRole('heading', { name: /laws that govern everyday life/i }),
    ).toBeInTheDocument()
    expect(screen.getByText(/each system reimplements the law/i)).toBeInTheDocument()
    expect(screen.getByText(/AI needs ground truth/i)).toBeInTheDocument()
  })

  it('renders both layers and the worked example', () => {
    render(<EncodedLawSection />)
    expect(
      screen.getByRole('heading', { name: /two layers, both in the open/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /open infrastructure for u\.s\. law/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /encoded so they can be computed/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /aca premium tax credit, three eras/i }),
    ).toBeInTheDocument()
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

  it('renders the foundation coda with 501(c)(3) framing', () => {
    render(<FoundationSection />)
    expect(screen.getByRole('heading', { name: /501\(c\)\(3\)/i })).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /encode your jurisdiction/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /validate our work/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /underwrite the public layer/i }),
    ).toBeInTheDocument()
  })
})

describe('Hero demo cycle', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('auto-advances through statute, household, computed', () => {
    render(<Hero />)
    expect(screen.getByRole('button', { name: /statute/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /household/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /computed/i })).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(4500)
    })
    act(() => {
      vi.advanceTimersByTime(4500)
    })
  })

  it('clicking a tab pauses auto-advance and switches view', () => {
    render(<Hero />)
    const computedTab = screen.getByRole('button', { name: /computed/i })
    fireEvent.click(computedTab)

    act(() => {
      vi.advanceTimersByTime(9000)
    })

    fireEvent.click(screen.getByRole('button', { name: /statute/i }))
  })
})
