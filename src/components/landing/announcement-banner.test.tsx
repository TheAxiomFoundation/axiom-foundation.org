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
    expect(
      screen.getByRole('heading', { name: /axiom foundation goes public on july 28/i }),
    ).toBeInTheDocument()
    // The date lives in the headline only — the eyebrow doesn't repeat it.
    expect(screen.queryByText('July 28, 2026')).not.toBeInTheDocument()
  })

  it('renders the subhead inviting the virtual briefing', () => {
    render(<AnnouncementBanner />)
    expect(screen.getByText(/join the virtual briefing/i)).toBeInTheDocument()
  })

  it('renders the two launch actions', () => {
    render(<AnnouncementBanner />)
    expect(screen.getByText('Join the launch event')).toBeInTheDocument()
    expect(screen.getByText('Get updates')).toBeInTheDocument()
    expect(screen.queryByText('Register for the briefing')).not.toBeInTheDocument()
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

  describe('after launch', () => {
    beforeEach(() => {
      vi.setSystemTime(new Date('2026-07-28T18:00:00Z'))
    })

    it('flips to the live variant', () => {
      render(<AnnouncementBanner />)
      expect(screen.getByText(/now live/i)).toBeInTheDocument()
      expect(
        screen.getByRole('heading', { name: /axiom foundation is live/i }),
      ).toBeInTheDocument()
      expect(screen.getByText('Explore the app')).toBeInTheDocument()
      expect(screen.getByText('See the demos')).toBeInTheDocument()
      // Countdown invitation is gone.
      expect(screen.queryByText('Join the launch event')).not.toBeInTheDocument()
      expect(screen.queryByText(/goes public on/i)).not.toBeInTheDocument()
    })
  })
})
