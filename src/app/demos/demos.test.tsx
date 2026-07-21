import { render, screen } from '@testing-library/react'
import DemosPage, { metadata } from './page'

describe('DemosPage', () => {
  it('renders the header and all eight demos', () => {
    render(<DemosPage />)
    expect(
      screen.getByRole('heading', { name: /built on the open layer/i }),
    ).toBeInTheDocument()
    for (const title of [
      /small company checker/i,
      /form builder/i,
      /architecture map/i,
      /benefits assistant/i,
      /guidance impact visualizer/i,
      /colorado snap workflow checker/i,
      /colorado snap cliffs/i,
      /microsimulation/i,
    ]) {
      expect(screen.getByRole('heading', { name: title })).toBeInTheDocument()
    }
  })

  it('embeds the two flagship demos as iframes', () => {
    render(<DemosPage />)
    expect(screen.getByTitle('Small company checker')).toHaveAttribute(
      'src',
      'https://axiom-reg-demo.vercel.app',
    )
    expect(
      screen.getByTitle('Axiom-grounded benefits assistant'),
    ).toHaveAttribute('src', 'https://finbot-snap-demo.vercel.app')
    expect(document.querySelectorAll('iframe')).toHaveLength(2)
  })

  it('links out to the remaining demos instead of embedding them', () => {
    render(<DemosPage />)
    const launches = screen.getAllByRole('link', { name: /launch the tool/i })
    expect(launches).toHaveLength(6)
    const hrefs = launches.map((l) => l.getAttribute('href'))
    expect(hrefs).toContain('https://axiom-co-snap.vercel.app')
    expect(hrefs).toContain('https://co-snap-workflow-checker.vercel.app')
    expect(hrefs).toContain('https://axiom-microsim.vercel.app')
  })

  it('anchors every demo section for dropdown deep links', () => {
    render(<DemosPage />)
    for (const slug of [
      'reg-demo',
      'form-builder',
      'architecture',
      'finbot',
      'guidance-impact',
      'workflow-checker',
      'co-snap-cliffs',
      'microsim',
    ]) {
      expect(document.getElementById(slug)).not.toBeNull()
    }
  })

  it('is indexable with a descriptive title', () => {
    expect(metadata.title).toMatch(/demos/i)
    expect(metadata.robots).toBeUndefined()
  })
})
