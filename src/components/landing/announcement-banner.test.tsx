import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { AnnouncementBanner } from '@/components/landing/announcement-banner'

describe('AnnouncementBanner', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // Pin "now" before the launch so the countdown shows real values.
    vi.setSystemTime(new Date('2026-07-09T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders the launch eyebrow and headline', () => {
    render(<AnnouncementBanner />)
    expect(screen.getByText(/public launch/i)).toBeInTheDocument()
    expect(screen.getByText(/july 28, 2026/i)).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /see what computable law makes possible/i }),
    ).toBeInTheDocument()
  })

  it('renders the subhead inviting the virtual briefing', () => {
    render(<AnnouncementBanner />)
    expect(screen.getByText(/join the virtual briefing/i)).toBeInTheDocument()
  })

  it('renders all three launch actions', () => {
    render(<AnnouncementBanner />)
    expect(screen.getByText('Join the launch event')).toBeInTheDocument()
    expect(screen.getByText('Register for the briefing')).toBeInTheDocument()
    expect(screen.getByText('Get launch updates')).toBeInTheDocument()
  })

  it('renders the countdown with all four units', () => {
    render(<AnnouncementBanner />)
    expect(screen.getByText(/doors open in/i)).toBeInTheDocument()
    for (const unit of ['Days', 'Hrs', 'Min', 'Sec']) {
      expect(screen.getByText(unit)).toBeInTheDocument()
    }
  })

  it('has no GitHub link-outs (Round 1)', () => {
    render(<AnnouncementBanner />)
    expect(screen.queryByText(/github/i)).not.toBeInTheDocument()
  })
})
