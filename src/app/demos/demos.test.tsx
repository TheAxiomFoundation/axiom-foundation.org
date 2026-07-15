import { render, screen } from '@testing-library/react'
import DemosPage, { metadata } from './page'

describe('DemosPage', () => {
  it('renders the header and all three demos', () => {
    render(<DemosPage />)
    expect(
      screen.getByRole('heading', { name: /built on the open layer/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /small company checker/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /benefits assistant/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /colorado snap cliffs/i }),
    ).toBeInTheDocument()
  })

  it('embeds the self-contained demos as iframes', () => {
    render(<DemosPage />)
    expect(screen.getByTitle('Small company checker')).toHaveAttribute(
      'src',
      'https://axiom-reg-demo.vercel.app',
    )
    expect(
      screen.getByTitle('Axiom-grounded benefits assistant'),
    ).toHaveAttribute('src', 'https://finbot-snap-demo.vercel.app')
  })

  it('links out to the SNAP cliffs tool instead of embedding it', () => {
    render(<DemosPage />)
    const launch = screen.getByRole('link', { name: /launch the tool/i })
    expect(launch).toHaveAttribute('href', 'https://axiom-co-snap.vercel.app')
    expect(screen.queryByTitle('Colorado SNAP cliffs')).not.toBeInTheDocument()
  })

  it('is indexable with a descriptive title', () => {
    expect(metadata.title).toMatch(/demos/i)
    expect(metadata.robots).toBeUndefined()
  })
})
