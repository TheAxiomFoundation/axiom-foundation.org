import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: () => '/atlas',
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
}))

// Mock motion/react
vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

// Mock useRules hook
const { mockLoadMore } = vi.hoisted(() => ({
  mockLoadMore: vi.fn(),
}))
vi.mock('@/hooks/use-rules', () => ({
  useRules: vi.fn().mockReturnValue({
    rules: [],
    stats: [],
    loading: false,
    error: null,
    hasMore: false,
    loadMore: mockLoadMore,
  }),
}))

// Mock supabaseArch
vi.mock('@/lib/supabase', () => ({
  supabaseArch: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    }),
  },
}))

import { supabaseArch } from '@/lib/supabase'
import { useRules } from '@/hooks/use-rules'
import { AtlasBrowser } from './document-browser'

describe('AtlasBrowser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useRules).mockReturnValue({
      rules: [],
      stats: [],
      loading: false,
      error: null,
      hasMore: false,
      loadMore: mockLoadMore,
    })
  })

  it('shows loading state', () => {
    vi.mocked(useRules).mockReturnValue({
      rules: [],
      stats: [],
      loading: true,
      error: null,
      hasMore: false,
      loadMore: mockLoadMore,
    })

    render(<AtlasBrowser />)
    expect(screen.getByText('Loading rules...')).toBeInTheDocument()
  })

  it('shows error state', () => {
    vi.mocked(useRules).mockReturnValue({
      rules: [],
      stats: [],
      loading: false,
      error: 'Failed to connect',
      hasMore: false,
      loadMore: mockLoadMore,
    })

    render(<AtlasBrowser />)
    expect(screen.getByText('Failed to connect')).toBeInTheDocument()
  })

  it('shows empty state', () => {
    render(<AtlasBrowser />)
    expect(screen.getByText('No rules found.')).toBeInTheDocument()
  })

  it('renders rules in tree when data is present', () => {
    vi.mocked(useRules).mockReturnValue({
      rules: [{
        id: 'r1',
        jurisdiction: 'us',
        doc_type: 'statute',
        parent_id: null,
        level: 0,
        ordinal: 1,
        heading: 'Title 26',
        body: null,
        effective_date: null,
        repeal_date: null,
        source_url: null,
        source_path: 'statute/26',
        rac_path: null,
        has_rac: false,
        created_at: '2025-01-01',
        updated_at: '2025-01-01',
      }],
      stats: [{ jurisdiction: 'us', count: 100 }],
      loading: false,
      error: null,
      hasMore: false,
      loadMore: mockLoadMore,
    })

    render(<AtlasBrowser />)
    expect(screen.getByText('Title 26')).toBeInTheDocument()
    expect(screen.getByText('100 total')).toBeInTheDocument()
  })

  it('shows load more button when hasMore is true', () => {
    vi.mocked(useRules).mockReturnValue({
      rules: [{
        id: 'r1',
        jurisdiction: 'us',
        doc_type: 'statute',
        parent_id: null,
        level: 0,
        ordinal: 1,
        heading: 'Title 26',
        body: null,
        effective_date: null,
        repeal_date: null,
        source_url: null,
        source_path: 'statute/26',
        rac_path: null,
        has_rac: false,
        created_at: '2025-01-01',
        updated_at: '2025-01-01',
      }],
      stats: [],
      loading: false,
      error: null,
      hasMore: true,
      loadMore: mockLoadMore,
    })

    render(<AtlasBrowser />)
    const loadMoreBtn = screen.getByRole('button', { name: /load more/i })
    expect(loadMoreBtn).toBeInTheDocument()
    fireEvent.click(loadMoreBtn)
    expect(mockLoadMore).toHaveBeenCalled()
  })

  it('shows "Loading..." on load more button when loading', () => {
    vi.mocked(useRules).mockReturnValue({
      rules: [{
        id: 'r1',
        jurisdiction: 'us',
        doc_type: 'statute',
        parent_id: null,
        level: 0,
        ordinal: 1,
        heading: 'Title 26',
        body: null,
        effective_date: null,
        repeal_date: null,
        source_url: null,
        source_path: 'statute/26',
        rac_path: null,
        has_rac: false,
        created_at: '2025-01-01',
        updated_at: '2025-01-01',
      }],
      stats: [],
      loading: true,
      error: null,
      hasMore: true,
      loadMore: mockLoadMore,
    })

    render(<AtlasBrowser />)
    expect(screen.getByRole('button', { name: /loading\.\.\./i })).toBeInTheDocument()
  })

  it('renders stats badges', () => {
    vi.mocked(useRules).mockReturnValue({
      rules: [],
      stats: [
        { jurisdiction: 'us', count: 500 },
        { jurisdiction: 'uk', count: 200 },
        { jurisdiction: 'canada', count: 50 },
      ],
      loading: false,
      error: null,
      hasMore: false,
      loadMore: mockLoadMore,
    })

    render(<AtlasBrowser />)
    // 'US' appears both in filter buttons and stats badge
    expect(screen.getAllByText('US').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText('500')).toBeInTheDocument()
    expect(screen.getByText('750 total')).toBeInTheDocument()
  })

  it('does not show stats badge when total is 0', () => {
    render(<AtlasBrowser />)
    expect(screen.queryByText('total')).not.toBeInTheDocument()
  })

  it('filters by jurisdiction', () => {
    render(<AtlasBrowser />)
    fireEvent.click(screen.getByRole('button', { name: 'US' }))
    expect(useRules).toHaveBeenCalledWith(expect.objectContaining({
      jurisdiction: 'us',
    }))
  })

  it('searches by text', () => {
    render(<AtlasBrowser />)
    const input = screen.getByPlaceholderText('Search statutes...')
    fireEvent.change(input, { target: { value: 'income tax' } })
    expect(useRules).toHaveBeenCalledWith(expect.objectContaining({
      search: 'income tax',
    }))
  })

  it('selects a rule and renders DocumentViewer', async () => {
    const mockRule = {
      id: 'r1',
      jurisdiction: 'us',
      doc_type: 'statute',
      parent_id: null,
      level: 0,
      ordinal: 1,
      heading: 'Title 26 - Internal Revenue Code',
      body: 'Main body text here.',
      effective_date: null,
      repeal_date: null,
      source_url: null,
      source_path: 'statute/26',
      rac_path: null,
      has_rac: true,
      created_at: '2025-01-01',
      updated_at: '2025-01-01',
    }

    vi.mocked(useRules).mockReturnValue({
      rules: [mockRule],
      stats: [],
      loading: false,
      error: null,
      hasMore: false,
      loadMore: mockLoadMore,
    })

    // Mock supabaseArch.from().select().eq().order() for selectRule's children fetch
    const mockOrder = vi.fn().mockResolvedValue({
      data: [
        { ...mockRule, id: 'r1-child', heading: 'Subsection A', body: 'Child body text', parent_id: 'r1' },
      ],
      error: null,
    })
    const mockEqFn = vi.fn().mockReturnValue({ order: mockOrder })
    const mockSelectFn = vi.fn().mockReturnValue({ eq: mockEqFn })
    vi.mocked(supabaseArch.from).mockReturnValue({ select: mockSelectFn } as any)

    render(<AtlasBrowser />)

    // Click on the rule in the tree to trigger selectRule
    fireEvent.click(screen.getByText('Title 26 - Internal Revenue Code'))

    // Wait for the Supabase fetch to complete and DocumentViewer to render
    await waitFor(() => {
      // DocumentViewer shows the title
      expect(screen.getByText('Title 26 - Internal Revenue Code')).toBeInTheDocument()
      // DocumentViewer shows the citation (source_path) in header and Source section
      expect(screen.getAllByText('statute/26').length).toBeGreaterThanOrEqual(1)
      // DocumentViewer shows a back button
      expect(screen.getByTitle('Back to browser')).toBeInTheDocument()
      // Status bar shows connected
      expect(screen.getByText('Connected to Atlas')).toBeInTheDocument()
    })

    // Click back button to return to browser
    fireEvent.click(screen.getByTitle('Back to browser'))

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search statutes...')).toBeInTheDocument()
    })
  })

  it('handles selectRule when Supabase returns null children data', async () => {
    const mockRule = {
      id: 'r2',
      jurisdiction: 'uk',
      doc_type: 'statute',
      parent_id: null,
      level: 0,
      ordinal: 1,
      heading: 'Income Tax Act',
      body: null,
      effective_date: null,
      repeal_date: null,
      source_url: null,
      source_path: 'statute/ita',
      rac_path: null,
      has_rac: false,
      created_at: '2025-01-01',
      updated_at: '2025-01-01',
    }

    vi.mocked(useRules).mockReturnValue({
      rules: [mockRule],
      stats: [],
      loading: false,
      error: null,
      hasMore: false,
      loadMore: mockLoadMore,
    })

    // Children fetch returns null data — exercises `children || []` fallback
    const mockOrder = vi.fn().mockResolvedValue({ data: null, error: null })
    const mockEqFn = vi.fn().mockReturnValue({ order: mockOrder })
    const mockSelectFn = vi.fn().mockReturnValue({ eq: mockEqFn })
    vi.mocked(supabaseArch.from).mockReturnValue({ select: mockSelectFn } as any)

    render(<AtlasBrowser />)

    fireEvent.click(screen.getByText('Income Tax Act'))

    await waitFor(() => {
      // DocumentViewer renders with the rule heading as title and fallback subsection
      expect(screen.getAllByText('Income Tax Act').length).toBeGreaterThanOrEqual(1)
      expect(screen.getByTitle('Back to browser')).toBeInTheDocument()
    })
  })

  it('handles selectRule when Supabase fetch throws', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const mockRule = {
      id: 'r3',
      jurisdiction: 'us',
      doc_type: 'statute',
      parent_id: null,
      level: 0,
      ordinal: 1,
      heading: 'Failed Rule',
      body: 'Some body text.',
      effective_date: null,
      repeal_date: null,
      source_url: null,
      source_path: 'statute/fail',
      rac_path: null,
      has_rac: false,
      created_at: '2025-01-01',
      updated_at: '2025-01-01',
    }

    vi.mocked(useRules).mockReturnValue({
      rules: [mockRule],
      stats: [],
      loading: false,
      error: null,
      hasMore: false,
      loadMore: mockLoadMore,
    })

    // Children fetch throws
    vi.mocked(supabaseArch.from).mockImplementation(() => {
      throw new Error('Network error')
    })

    render(<AtlasBrowser />)

    fireEvent.click(screen.getByText('Failed Rule'))

    await waitFor(() => {
      // Even on error, the viewer should show with empty children
      expect(screen.getByTitle('Back to browser')).toBeInTheDocument()
    })

    expect(consoleSpy).toHaveBeenCalledWith('Failed to fetch children:', expect.any(Error))
    consoleSpy.mockRestore()
  })
})
