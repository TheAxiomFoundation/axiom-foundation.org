import { fireEvent, render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'

import OverviewPage from '@/app/overview/page'
import { WhatWeEnable } from '@/components/overview/what-we-enable'
import { SubscribeLink } from '@/components/overview/subscribe-link'
import {
  AUDIENCES,
  LICENSE_LINKS,
  OVERVIEW_PDF_PATH,
  PREVIEW_APPS,
  SUBSCRIBE_URL,
  WHAT_WE_DO,
} from '@/components/overview/overview-content'

describe('Overview page', () => {
  it('titles the page for the organization and keeps the tagline underneath', () => {
    render(<OverviewPage />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      /the axiom foundation overview/i,
    )
    expect(screen.getByText(/computable law for all/i)).toBeInTheDocument()
    expect(
      screen.getAllByRole('link', { name: /open the axiom app/i }).length,
    ).toBeGreaterThan(0)
    expect(screen.getByTestId('overview-pdf-link')).toHaveAttribute(
      'href',
      OVERVIEW_PDF_PATH,
    )
  })

  it('labels the three what-we-do cards Encode, Verify, and Publish', () => {
    render(<OverviewPage />)
    expect(WHAT_WE_DO.map((card) => card.label)).toEqual([
      'Encode',
      'Verify',
      'Publish',
    ])
    for (const card of WHAT_WE_DO) {
      expect(screen.getByText(card.label)).toBeInTheDocument()
      expect(
        screen.getByRole('heading', { name: card.title }),
      ).toBeInTheDocument()
    }
  })

  it('reprises the download button instead of a trailing download sentence', () => {
    render(<OverviewPage />)
    const pdfLinks = screen
      .getAllByRole('link', { name: /download 1-page pdf/i })
      .map((link) => link.getAttribute('href'))
    expect(pdfLinks).toEqual([OVERVIEW_PDF_PATH, OVERVIEW_PDF_PATH])
    expect(
      screen.queryByRole('link', { name: /download this overview as a pdf/i }),
    ).not.toBeInTheDocument()
  })

  it('points at the team rather than citing years of experience', () => {
    render(<OverviewPage />)
    expect(screen.getByRole('link', { name: /meet the team/i })).toHaveAttribute(
      'href',
      '/team',
    )
    expect(screen.queryByText(/six years/i)).not.toBeInTheDocument()
  })

  it('states both licences under what we do, linked rather than asserted', () => {
    render(<OverviewPage />)
    // The split is the point: encodings and code carry different licences,
    // and the PDF makes the same claim — they must not drift apart.
    expect(screen.getByRole('link', { name: /cc by 4\.0/i })).toHaveAttribute(
      'href',
      LICENSE_LINKS.encodings,
    )
    expect(screen.getByRole('link', { name: /apache 2\.0/i })).toHaveAttribute(
      'href',
      LICENSE_LINKS.code,
    )
  })

  it('anchors the sections the PDF links back to', () => {
    const { container } = render(<OverviewPage />)
    expect(container.querySelector('#what-we-do')).toBeInTheDocument()
    expect(container.querySelector('#what-we-enable')).toBeInTheDocument()
    expect(container.querySelector('#get-involved')).toBeInTheDocument()
  })

  it('shows one audience at a time and switches on click', () => {
    render(<WhatWeEnable />)

    const tabs = screen.getAllByRole('tab')
    expect(tabs).toHaveLength(AUDIENCES.length)
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true')

    // Panels are queried by id rather than by role: `getAllByRole('tabpanel')`
    // skips the hidden ones, and the point of this test is that exactly one is
    // shown while the rest stay mounted for in-page search.
    const panelFor = (id: string) =>
      document.querySelector(`[role="tabpanel"][id$="-panel-${id}"]`)

    expect(panelFor('government')).not.toHaveAttribute('hidden')
    expect(panelFor('ai-labs')).toHaveAttribute('hidden')

    fireEvent.click(screen.getByRole('tab', { name: /ai labs/i }))

    expect(screen.getByRole('tab', { name: /ai labs/i })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(tabs[0]).toHaveAttribute('aria-selected', 'false')
    expect(panelFor('ai-labs')).not.toHaveAttribute('hidden')
    expect(panelFor('government')).toHaveAttribute('hidden')
    // Still mounted, just hidden — the copy stays findable and printable.
    expect(panelFor('government')).toHaveTextContent(/stop paying to re-implement/i)
  })

  it('moves between audiences with the arrow keys and wraps at the ends', () => {
    render(<WhatWeEnable />)
    const tablist = screen.getByRole('tablist')

    fireEvent.keyDown(tablist, { key: 'ArrowLeft' })
    expect(screen.getAllByRole('tab')[AUDIENCES.length - 1]).toHaveAttribute(
      'aria-selected',
      'true',
    )

    fireEvent.keyDown(tablist, { key: 'ArrowRight' })
    expect(screen.getAllByRole('tab')[0]).toHaveAttribute('aria-selected', 'true')

    fireEvent.keyDown(tablist, { key: 'End' })
    expect(screen.getAllByRole('tab')[AUDIENCES.length - 1]).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })

  it('sends the subscribe CTA to the Mailchimp list the axiom.org nav uses', () => {
    render(<SubscribeLink />)
    const link = screen.getByTestId('subscribe-link')
    expect(link).toHaveAttribute('href', SUBSCRIBE_URL)
    expect(SUBSCRIBE_URL).toContain('list-manage.com/subscribe')
    // Opens off-site, so it needs the tab-nabbing guard.
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'))
  })

  it('links every preview card to its own demo, disambiguated for screen readers', () => {
    const { container } = render(<WhatWeEnable />)
    for (const app of PREVIEW_APPS) {
      const link = container.querySelector(`a[href="${app.href}"]`)
      expect(link).toBeInTheDocument()
      // Four links reading only "Open preview" are indistinguishable in a
      // screen reader's link list, so each carries its own visually-hidden name.
      expect(link).toHaveTextContent(app.name)
    }
    // Every card carries a real URL — a card that looks clickable but
    // resolves nowhere is worse than a plain description.
    expect(PREVIEW_APPS.every((app) => app.href.startsWith('https://'))).toBe(true)
  })

  it('names the previews with the action phrases the axiom.org nav uses', () => {
    // These are the live nav labels, not our own paraphrases — a visitor
    // arriving from /demos should see the same words on both surfaces.
    expect(PREVIEW_APPS.map((app) => app.name)).toEqual([
      'Get accurate answers',
      'Build a form',
      'Explore benefits cliffs',
      'Reconcile primary sources',
    ])
  })
})
