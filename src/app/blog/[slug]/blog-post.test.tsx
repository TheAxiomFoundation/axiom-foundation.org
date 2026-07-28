import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
}))

const { notFound } = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND')
  }),
}))
vi.mock('next/navigation', () => ({ notFound }))

vi.mock('@/lib/ghost', () => ({
  getBlogPost: vi.fn(),
}))

import { getBlogPost } from '@/lib/ghost'
import BlogPostPage, { generateMetadata } from './page'

const POST = {
  slug: 'first-post',
  title: 'Encoding Title 7, end to end',
  excerpt: 'How the encoder walked chapter 51.',
  publishedAt: '2026-07-20T12:00:00.000+00:00',
  featureImage: 'https://example.com/cover.png',
  readingTime: 4,
  html: '<p>The encoder starts from the statute text.</p>',
  authors: ['Ariel Kennan'],
  status: null,
}

const params = Promise.resolve({ slug: 'first-post' })

describe('Blog post page', () => {
  it('renders the post title, byline, and body HTML', async () => {
    vi.mocked(getBlogPost).mockResolvedValue(POST)
    render(await BlogPostPage({ params }))
    expect(
      screen.getByRole('heading', { name: /encoding title 7, end to end/i })
    ).toBeInTheDocument()
    expect(screen.getByText(/ariel kennan · july 20, 2026/i)).toBeInTheDocument()
    expect(
      screen.getByText(/the encoder starts from the statute text/i)
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /blog/i })).toHaveAttribute(
      'href',
      '/blog'
    )
  })

  it('calls notFound for a missing slug', async () => {
    vi.mocked(getBlogPost).mockResolvedValue(null)
    await expect(BlogPostPage({ params })).rejects.toThrow('NEXT_NOT_FOUND')
    expect(notFound).toHaveBeenCalled()
  })

  it('builds metadata from the post', async () => {
    vi.mocked(getBlogPost).mockResolvedValue(POST)
    const meta = await generateMetadata({ params })
    expect(meta.title).toBe('Encoding Title 7, end to end — Axiom Foundation')
    expect(meta.description).toBe('How the encoder walked chapter 51.')
  })
})
