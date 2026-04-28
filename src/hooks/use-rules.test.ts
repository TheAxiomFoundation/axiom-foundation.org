import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Supabase with hoisted functions
const { mockFrom, mockSelect, mockOrder, mockRange, mockEq, mockIs, mockSingle, mockLimit, mockTextSearch } = vi.hoisted(() => {
  const mockSingle = vi.fn()
  const mockLimit = vi.fn()
  const mockRange = vi.fn()
  const mockTextSearch = vi.fn()
  const mockEq = vi.fn()
  const mockIs = vi.fn()
  const mockOrder = vi.fn()
  const mockSelect = vi.fn()
  const mockFrom = vi.fn()

  // Set up chain: select → is → [eq/textSearch] → order → order → range
  mockSingle.mockResolvedValue({ data: null, error: null })
  mockLimit.mockResolvedValue({ data: [], error: null, count: 0 })
  mockRange.mockResolvedValue({ data: [], error: null, count: 0 })
  mockOrder.mockReturnValue({ order: mockOrder, range: mockRange, limit: mockLimit })
  mockTextSearch.mockReturnValue({ order: mockOrder })
  mockEq.mockReturnValue({ order: mockOrder, textSearch: mockTextSearch, eq: mockEq, single: mockSingle })
  mockIs.mockReturnValue({ order: mockOrder, eq: mockEq, textSearch: mockTextSearch })
  mockSelect.mockReturnValue({ order: mockOrder, eq: mockEq, is: mockIs, range: mockRange, count: 0 })
  mockFrom.mockReturnValue({ select: mockSelect })

  return { mockFrom, mockSelect, mockOrder, mockRange, mockEq, mockIs, mockSingle, mockLimit, mockTextSearch }
})

vi.mock('@/lib/supabase', () => ({
  supabaseCorpus: {
    from: mockFrom,
  },
}))

import { useRules, useRule } from './use-rules'

describe('useRules', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset chain: select → is → [eq/textSearch] → order → range
    mockRange.mockResolvedValue({ data: [], error: null, count: 0 })
    mockOrder.mockReturnValue({ order: mockOrder, range: mockRange })
    mockTextSearch.mockReturnValue({ order: mockOrder })
    mockEq.mockReturnValue({ order: mockOrder, textSearch: mockTextSearch, eq: mockEq, single: mockSingle })
    mockIs.mockReturnValue({ order: mockOrder, eq: mockEq, textSearch: mockTextSearch })
    mockSelect.mockReturnValue({ order: mockOrder, eq: mockEq, is: mockIs, range: mockRange })
    mockFrom.mockReturnValue({ select: mockSelect })
  })

  it('fetches rules on mount', async () => {
    const mockData = [{ id: 'r1', heading: 'Rule 1', jurisdiction: 'us' }]
    mockRange.mockResolvedValue({ data: mockData, error: null, count: 1 })

    const { result } = renderHook(() => useRules())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.rules).toEqual(mockData)
    expect(result.current.error).toBeNull()
  })

  it('handles fetch error', async () => {
    mockRange.mockResolvedValue({ data: null, error: { message: 'Network error' }, count: 0 })

    const { result } = renderHook(() => useRules())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBe('Failed to fetch rules')
  })

  it('computes hasMore correctly', async () => {
    mockRange.mockResolvedValue({
      data: Array.from({ length: 50 }, (_, i) => ({ id: `r${i}` })),
      error: null,
      count: 100,
    })

    const { result } = renderHook(() => useRules())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.hasMore).toBe(true)
  })

  it('fetches stats for all jurisdictions', async () => {
    mockRange.mockResolvedValue({ data: [], error: null, count: 0 })

    const { result } = renderHook(() => useRules())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // Stats are fetched via select/eq for each jurisdiction
    expect(mockFrom).toHaveBeenCalled()
  })

  it('applies jurisdiction filter', async () => {
    mockRange.mockResolvedValue({ data: [], error: null, count: 0 })

    const { result } = renderHook(() => useRules({ jurisdiction: 'us' }))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // Should call eq with jurisdiction filter
    expect(mockEq).toHaveBeenCalled()
  })

  it('applies text search', async () => {
    // textSearch is called after is(), before order()
    mockTextSearch.mockReturnValue({ order: mockOrder })

    const { result } = renderHook(() => useRules({ search: 'income tax' }))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(mockTextSearch).toHaveBeenCalled()
  })

  it('loadMore fetches next page', async () => {
    // Setup initial data with more available
    mockRange.mockResolvedValue({
      data: Array.from({ length: 50 }, (_, i) => ({ id: `r${i}` })),
      error: null,
      count: 100,
    })

    const { result } = renderHook(() => useRules())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.hasMore).toBe(true)

    // Call loadMore
    result.current.loadMore()

    // Should trigger another fetch
    await waitFor(() => {
      expect(mockRange).toHaveBeenCalledTimes(2)
    })
  })

  it('handles null data from fetch', async () => {
    mockRange.mockResolvedValue({ data: null, error: null, count: 0 })

    const { result } = renderHook(() => useRules())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.rules).toEqual([])
  })

  it('handles Error instance in fetch catch', async () => {
    mockRange.mockRejectedValue(new Error('Network timeout'))

    const { result } = renderHook(() => useRules())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBe('Network timeout')
  })

  it('handles stats fetch error gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    // Make stats fetch throw
    mockSelect.mockImplementation((...args: unknown[]) => {
      // Check if this is a stats call (head: true)
      const opts = args[1] as Record<string, unknown> | undefined
      if (opts && opts.head) {
        throw new Error('Stats fetch failed')
      }
      return { order: mockOrder, eq: mockEq, is: mockIs, range: mockRange }
    })
    mockRange.mockResolvedValue({ data: [], error: null, count: 0 })

    const { result } = renderHook(() => useRules())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(consoleSpy).toHaveBeenCalledWith('Failed to fetch stats:', expect.any(Error))
    consoleSpy.mockRestore()
  })
})

describe('useRule', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSingle.mockResolvedValue({ data: null, error: null })
    mockLimit.mockResolvedValue({ data: [], error: null })
    mockEq.mockReturnValue({ order: mockOrder, single: mockSingle })
    mockOrder.mockReturnValue({ order: mockOrder, range: mockRange, limit: mockLimit, eq: mockEq })
    mockSelect.mockReturnValue({ order: mockOrder, eq: mockEq })
    mockFrom.mockReturnValue({ select: mockSelect })
  })

  it('fetches rule and children by id', async () => {
    const mockRule = { id: 'r1', heading: 'Title 26', jurisdiction: 'us' }
    const mockChildren = [{ id: 'r1-a', heading: 'Section A' }]

    // First call returns the rule, second returns children
    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount <= 1) {
        return {
          select: () => ({
            eq: () => ({
              single: vi.fn().mockResolvedValue({ data: mockRule, error: null }),
            }),
          }),
        }
      }
      return {
        select: () => ({
          eq: () => ({
            order: () => ({
              data: mockChildren,
              error: null,
              then: (fn: any) => fn({ data: mockChildren, error: null }),
            }),
          }),
        }),
      }
    })

    // Use a simpler approach: just mock the resolved values
    mockSingle.mockResolvedValue({ data: mockRule, error: null })
    mockOrder.mockResolvedValue({ data: mockChildren, error: null })
    mockFrom.mockReturnValue({ select: mockSelect })
    mockSelect.mockReturnValue({ eq: mockEq })
    mockEq.mockReturnValue({ single: mockSingle, order: mockOrder })

    const { result } = renderHook(() => useRule('r1'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.rule).toEqual(mockRule)
    expect(result.current.children).toEqual(mockChildren)
  })

  it('returns null when id is null', async () => {
    const { result } = renderHook(() => useRule(null))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.rule).toBeNull()
    expect(result.current.children).toEqual([])
  })

  it('handles fetch error', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: 'Not found' } })

    const { result } = renderHook(() => useRule('bad-id'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBe('Failed to fetch rule')
  })

  it('handles children fetch error', async () => {
    const mockRule = { id: 'r1', heading: 'Title 26', jurisdiction: 'us' }
    mockSingle.mockResolvedValue({ data: mockRule, error: null })
    // Children fetch returns an error
    mockOrder.mockResolvedValue({ data: null, error: { message: 'Children error' } })
    mockFrom.mockReturnValue({ select: mockSelect })
    mockSelect.mockReturnValue({ eq: mockEq })
    mockEq.mockReturnValue({ single: mockSingle, order: mockOrder })

    const { result } = renderHook(() => useRule('r1'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBe('Failed to fetch rule')
  })

  it('handles Error instance in catch', async () => {
    // Make the rule fetch throw an actual Error instance
    mockSingle.mockRejectedValue(new Error('Network timeout'))

    const { result } = renderHook(() => useRule('r1'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBe('Network timeout')
  })
})
