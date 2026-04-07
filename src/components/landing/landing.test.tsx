import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
}))

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
}))

import { Hero } from '@/components/landing/hero'
import { AtlasSection } from '@/components/landing/atlas-section'
import { RacSection } from '@/components/landing/rac-section'
import { RacFormat } from '@/components/landing/rac-format'
import { AutoracSection } from '@/components/landing/autorac-section'
import { SpecSection } from '@/components/landing/spec-section'
import { GroundTruthSection } from '@/components/landing/ground-truth-section'
import { CoverageSection } from '@/components/landing/coverage-section'
import { CtaSection } from '@/components/landing/cta-section'

describe('Landing sections', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders the hero section with mission statement', () => {
    render(<Hero />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/the world.*rules.*encoded/i)
  })

  it('renders the Atlas section', () => {
    render(<AtlasSection />)
    expect(screen.getByRole('heading', { name: /atlas/i })).toBeInTheDocument()
    expect(screen.getByText(/federal statutes/i)).toBeInTheDocument()
  })

  it('renders the RAC DSL section', () => {
    render(<RacSection />)
    expect(screen.getByText(/rules as code/i)).toBeInTheDocument()
  })

  it('renders the .rac format section with code examples', () => {
    render(<RacFormat />)
    expect(screen.getAllByText(/file format/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/format comparison/i)).toBeInTheDocument()
  })

  it('renders the AutoRAC section', () => {
    render(<AutoracSection />)
    expect(screen.getAllByText(/autorac/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/3-tier validation pipeline/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /open the system map/i })).toHaveAttribute('href', '/autorac')
  })

  it('renders the RAC specification section', () => {
    render(<SpecSection />)
    expect(screen.getAllByText(/RAC_SPEC\.md/i).length).toBeGreaterThan(0)
  })

  it('renders the ground truth for AI section', () => {
    render(<GroundTruthSection />)
    expect(screen.getByText(/verifiable rewards/i)).toBeInTheDocument()
  })

  it('renders encoding coverage section', () => {
    render(<CoverageSection />)
    expect(screen.getByText(/encoding coverage/i)).toBeInTheDocument()
    expect(screen.getByText(/Federal \(rac-us\)/i)).toBeInTheDocument()
    expect(screen.getByText(/California \(rac-us-ca\)/i)).toBeInTheDocument()
    expect(screen.getByText(/New York \(rac-us-ny\)/i)).toBeInTheDocument()
  })

  it('renders get involved CTA', () => {
    render(<CtaSection />)
    expect(screen.getByRole('heading', { name: /get involved/i })).toBeInTheDocument()
  })
})

describe('RacFormat tabbed code examples', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('switches format tabs to show different code examples', () => {
    render(<RacFormat />)

    // Default is RAC tab - switch to DMN
    const dmnTab = screen.getByRole('button', { name: 'DMN' })
    fireEvent.click(dmnTab)
    expect(screen.getByText('niit.dmn')).toBeInTheDocument()

    // Switch to OpenFisca
    const ofTab = screen.getByRole('button', { name: 'OpenFisca/PE' })
    fireEvent.click(ofTab)
    expect(screen.getAllByText(/net_investment_income_tax/i).length).toBeGreaterThan(0)

    // Switch to Catala
    const catalaTab = screen.getByRole('button', { name: 'Catala' })
    fireEvent.click(catalaTab)
    expect(screen.getByText('niit.catala_en')).toBeInTheDocument()
  })

  it('switches code examples between statutes', () => {
    render(<RacFormat />)

    // Click ACA PTC example
    fireEvent.click(screen.getByRole('button', { name: 'ACA Premium Tax Credit' }))
    expect(screen.getByText('statute/26/36B/b/3/A.rac')).toBeInTheDocument()

    // Click Standard Deduction
    fireEvent.click(screen.getByRole('button', { name: 'Standard Deduction' }))
    expect(screen.getByText('statute/26/63/c/2/A.rac')).toBeInTheDocument()

    // Click NY EITC
    fireEvent.click(screen.getByRole('button', { name: 'NY EITC' }))
    expect(screen.getByText('statute/ny/tax/606/d.rac')).toBeInTheDocument()
  })

  it('switches non-RAC format tabs across different examples', () => {
    render(<RacFormat />)

    // Switch to ACA PTC + DMN
    fireEvent.click(screen.getByRole('button', { name: 'ACA Premium Tax Credit' }))
    fireEvent.click(screen.getByRole('button', { name: 'DMN' }))
    expect(screen.getByText('aca_ptc.dmn')).toBeInTheDocument()

    // Switch to Standard Deduction + OpenFisca
    fireEvent.click(screen.getByRole('button', { name: 'Standard Deduction' }))
    fireEvent.click(screen.getByRole('button', { name: 'OpenFisca/PE' }))

    // Switch to NY EITC + Catala
    fireEvent.click(screen.getByRole('button', { name: 'NY EITC' }))
    fireEvent.click(screen.getByRole('button', { name: 'Catala' }))
    expect(screen.getByText('ny_eitc.catala_en')).toBeInTheDocument()
  })

  it('shows all Catala examples', () => {
    render(<RacFormat />)

    fireEvent.click(screen.getByRole('button', { name: 'Catala' }))
    expect(screen.getByText('niit.catala_en')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'ACA Premium Tax Credit' }))
    expect(screen.getByText('aca_ptc.catala_en')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Standard Deduction' }))
    expect(screen.getByText('standard_deduction.catala_en')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'NY EITC' }))
    expect(screen.getByText('ny_eitc.catala_en')).toBeInTheDocument()
  })

  it('shows all DMN examples', () => {
    render(<RacFormat />)

    fireEvent.click(screen.getByRole('button', { name: 'DMN' }))
    expect(screen.getByText('niit.dmn')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'ACA Premium Tax Credit' }))
    expect(screen.getByText('aca_ptc.dmn')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Standard Deduction' }))
    expect(screen.getByText('standard_deduction.dmn')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'NY EITC' }))
    expect(screen.getByText('ny_eitc.dmn')).toBeInTheDocument()
  })

  it('shows all OpenFisca examples', () => {
    render(<RacFormat />)

    fireEvent.click(screen.getByRole('button', { name: 'OpenFisca/PE' }))

    fireEvent.click(screen.getByRole('button', { name: 'ACA Premium Tax Credit' }))
    fireEvent.click(screen.getByRole('button', { name: 'Standard Deduction' }))
    fireEvent.click(screen.getByRole('button', { name: 'NY EITC' }))
  })
})

describe('Hero transform', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('auto-toggles between statute and RAC views', () => {
    render(<Hero />)

    act(() => {
      vi.advanceTimersByTime(4000)
    })

    act(() => {
      vi.advanceTimersByTime(4000)
    })
  })

  it('click pauses auto-toggle and switches view', () => {
    render(<Hero />)

    const transform = screen.getByTitle('Click to toggle')

    fireEvent.click(transform)

    act(() => {
      vi.advanceTimersByTime(8000)
    })

    fireEvent.click(transform)
  })
})

describe('SpecSection expand/collapse', () => {
  it('expands and collapses the RAC spec', () => {
    render(<SpecSection />)

    const expandBtn = screen.getByRole('button', { name: /expand full spec/i })
    fireEvent.click(expandBtn)

    expect(screen.getByRole('button', { name: /collapse/i })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /collapse/i }))
    expect(screen.getByRole('button', { name: /expand full spec/i })).toBeInTheDocument()
  })
})
