import { render, screen } from '@testing-library/react'
import DemosPage, { metadata } from './page'

const props = (params: Record<string, string> = {}) => ({
  searchParams: Promise.resolve(params),
})

describe('DemosPage', () => {
  it('renders the header and embeds the demo-shell gallery', async () => {
    render(await DemosPage(props()))
    expect(
      screen.getByRole('heading', { name: /built on the open layer/i }),
    ).toBeInTheDocument()
    expect(screen.getByTitle('Axiom demo gallery')).toHaveAttribute(
      'src',
      'https://axiom-demo-shell.vercel.app/',
    )
    // Closing CTA still points into the app.
    expect(screen.getByText(/the axiom app/i).closest('a')).toHaveAttribute(
      'href',
      'https://app.axiom-foundation.org',
    )
  })

  it('passes valid ?d= deep links through to the shell', async () => {
    render(await DemosPage(props({ d: 'finbot' })))
    expect(screen.getByTitle('Axiom demo gallery')).toHaveAttribute(
      'src',
      'https://axiom-demo-shell.vercel.app/?d=finbot',
    )
  })

  it('strips unknown ?d= values instead of forwarding them', async () => {
    render(await DemosPage(props({ d: 'not-a-demo"><script>' })))
    expect(screen.getByTitle('Axiom demo gallery')).toHaveAttribute(
      'src',
      'https://axiom-demo-shell.vercel.app/',
    )
  })

  it('keeps the page metadata', () => {
    expect(metadata.title).toMatch(/live demos/i)
  })
})
