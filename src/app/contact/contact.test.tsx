import { render, screen } from '@testing-library/react'
import ContactPage, { metadata } from './page'

describe('ContactPage', () => {
  it('renders the header, form, and channels', () => {
    render(<ContactPage />)
    expect(
      screen.getByRole('heading', { name: /get in touch/i }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/message/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send message/i })).toBeInTheDocument()
  })

  it('lists the direct channels', () => {
    render(<ContactPage />)
    expect(
      screen.getByRole('link', { name: /hello@axiom\.org/i }),
    ).toHaveAttribute('href', 'mailto:hello@axiom.org')
    expect(
      screen.getByRole('link', { name: /axiom foundation/i }),
    ).toHaveAttribute(
      'href',
      'https://www.linkedin.com/company/axiom-foundation',
    )
    expect(
      screen.getByRole('link', { name: /get updates/i }),
    ).toHaveAttribute('href', expect.stringContaining('list-manage.com'))
  })

  it('is indexable with a descriptive title', () => {
    expect(metadata.title).toMatch(/contact/i)
    expect(metadata.robots).toBeUndefined()
  })
})
