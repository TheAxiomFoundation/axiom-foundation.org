import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: () => '/browse',
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
}))

// Mock motion/react to avoid animation issues in tests
vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

// Mock Supabase with hoisted functions
const { mockFrom, mockSelect, mockOrder, mockRange, mockEq, mockIs, mockTextSearch, mockLimit } = vi.hoisted(() => {
  const mockLimit = vi.fn()
  const mockRange = vi.fn()
  const mockEq = vi.fn()
  const mockIs = vi.fn()
  const mockTextSearch = vi.fn()
  const mockOrder = vi.fn()
  const mockSelect = vi.fn()
  const mockFrom = vi.fn()

  // Chain them so each returns the next
  mockLimit.mockResolvedValue({ data: [], error: null, count: 0 })
  mockRange.mockReturnValue({ data: [], error: null, count: 0 })
  mockTextSearch.mockReturnValue({ range: mockRange })
  mockEq.mockReturnValue({ order: mockOrder, textSearch: mockTextSearch, range: mockRange })
  mockIs.mockReturnValue({ order: mockOrder, eq: mockEq, textSearch: mockTextSearch, range: mockRange })
  mockOrder.mockReturnValue({ order: mockOrder, range: mockRange, limit: mockLimit, is: mockIs, eq: mockEq })
  mockSelect.mockReturnValue({ order: mockOrder, eq: mockEq, is: mockIs, range: mockRange, limit: mockLimit, count: 0, data: [], error: null })
  mockFrom.mockReturnValue({ select: mockSelect })

  return { mockFrom, mockSelect, mockOrder, mockRange, mockEq, mockIs, mockTextSearch, mockLimit }
})

vi.mock('@/lib/supabase', () => ({
  supabaseArch: {
    from: mockFrom,
  },
  supabase: {
    from: mockFrom,
  },
}))

import { RuleTree } from './rule-tree'
import { AtlasBrowser } from './document-browser'

describe('RuleTree', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset chain after clearing
    mockLimit.mockResolvedValue({ data: [], error: null, count: 0 })
    mockRange.mockReturnValue({ data: [], error: null, count: 0 })
    mockEq.mockReturnValue({ order: mockOrder })
    mockIs.mockReturnValue({ order: mockOrder })
    mockOrder.mockReturnValue({ order: mockOrder, range: mockRange, limit: mockLimit })
    mockSelect.mockReturnValue({ order: mockOrder, eq: mockEq, is: mockIs, range: mockRange, limit: mockLimit })
    mockFrom.mockReturnValue({ select: mockSelect })
  })

  const mockRules = [
    {
      id: 'rule-1',
      jurisdiction: 'us',
      doc_type: 'statute',
      parent_id: null,
      level: 0,
      ordinal: 1,
      heading: 'Title 26 - Internal Revenue Code',
      body: null,
      effective_date: null,
      repeal_date: null,
      source_url: null,
      source_path: 'statute/26',
      citation_path: null,
      rac_path: null,
      has_rac: false,
      created_at: '2025-01-01',
      updated_at: '2025-01-01',
    },
    {
      id: 'rule-2',
      jurisdiction: 'uk',
      doc_type: 'statute',
      parent_id: null,
      level: 0,
      ordinal: 2,
      heading: 'Income Tax Act 2007',
      body: null,
      effective_date: null,
      repeal_date: null,
      source_url: null,
      source_path: 'statute/ita2007',
      citation_path: null,
      rac_path: null,
      has_rac: false,
      created_at: '2025-01-01',
      updated_at: '2025-01-01',
    },
  ]

  it('renders rule items with jurisdiction labels', () => {
    render(<RuleTree rules={mockRules} onSelect={vi.fn()} />)
    expect(screen.getByText('Title 26 - Internal Revenue Code')).toBeInTheDocument()
    expect(screen.getByText('Income Tax Act 2007')).toBeInTheDocument()
    expect(screen.getByText('US')).toBeInTheDocument()
    expect(screen.getByText('UK')).toBeInTheDocument()
  })

  it('renders citation paths or truncated ids', () => {
    const rulesWithCitation = [
      { ...mockRules[0], citation_path: 'us/statute/26' },
      mockRules[1], // citation_path: null, falls back to truncated id
    ]
    render(<RuleTree rules={rulesWithCitation} onSelect={vi.fn()} />)
    expect(screen.getByText('us/statute/26')).toBeInTheDocument()
    expect(screen.getByText('rule-2')).toBeInTheDocument() // truncated id (first 8 chars)
  })

  it('calls onSelect when a rule is clicked', () => {
    const onSelect = vi.fn()
    render(<RuleTree rules={mockRules} onSelect={onSelect} />)
    fireEvent.click(screen.getByText('Title 26 - Internal Revenue Code'))
    expect(onSelect).toHaveBeenCalledWith(mockRules[0])
  })

  it('renders truncated id when citation_path is null', () => {
    const rules = [{
      ...mockRules[0],
      citation_path: null,
      id: 'abcdefghij',
    }]
    render(<RuleTree rules={rules} onSelect={vi.fn()} />)
    expect(screen.getByText('abcdefgh')).toBeInTheDocument()
  })

  it('renders "(no heading)" when heading is null', () => {
    const rules = [{ ...mockRules[0], heading: null }]
    render(<RuleTree rules={rules} onSelect={vi.fn()} />)
    expect(screen.getByText('(no heading)')).toBeInTheDocument()
  })
})

describe('AtlasBrowser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLimit.mockResolvedValue({ data: [], error: null, count: 0 })
    mockRange.mockResolvedValue({ data: [], error: null, count: 0 })
    mockEq.mockReturnValue({ order: mockOrder, textSearch: mockTextSearch, range: mockRange })
    mockIs.mockReturnValue({ order: mockOrder, eq: mockEq, textSearch: mockTextSearch, range: mockRange })
    mockOrder.mockReturnValue({ order: mockOrder, range: mockRange, limit: mockLimit, is: mockIs, eq: mockEq })
    mockSelect.mockReturnValue({ order: mockOrder, eq: mockEq, is: mockIs, range: mockRange, limit: mockLimit, count: 0, data: [], error: null })
    mockFrom.mockReturnValue({ select: mockSelect })
  })

  it('renders atlas header and search', () => {
    render(<AtlasBrowser />)
    expect(screen.getByText('Atlas')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Search statutes...')).toBeInTheDocument()
  })

  it('renders jurisdiction filter buttons', () => {
    render(<AtlasBrowser />)
    expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'US' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'UK' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Canada' })).toBeInTheDocument()
  })

  it('shows "No rules found" when empty', async () => {
    render(<AtlasBrowser />)
    await waitFor(() => {
      expect(screen.getByText('No rules found.')).toBeInTheDocument()
    })
  })

  it('shows description text', () => {
    render(<AtlasBrowser />)
    expect(screen.getByText(/browse the legal document archive/i)).toBeInTheDocument()
  })

  it('filters by jurisdiction on button click', async () => {
    render(<AtlasBrowser />)
    fireEvent.click(screen.getByRole('button', { name: 'US' }))
    // Should trigger re-fetch with jurisdiction filter
    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalled()
    })
  })

  it('updates search input', () => {
    render(<AtlasBrowser />)
    const input = screen.getByPlaceholderText('Search statutes...')
    fireEvent.change(input, { target: { value: 'tax' } })
    expect(input).toHaveValue('tax')
  })
})
