import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGetRuleEncoding, mockGetSDKSessionEvents, mockGetTranscriptsBySession } = vi.hoisted(() => ({
  mockGetRuleEncoding: vi.fn(),
  mockGetSDKSessionEvents: vi.fn(),
  mockGetTranscriptsBySession: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  getRuleEncoding: mockGetRuleEncoding,
  getSDKSessionEvents: mockGetSDKSessionEvents,
  getTranscriptsBySession: mockGetTranscriptsBySession,
}))

import { useEncoding } from '@/hooks/use-encoding'

describe('useEncoding', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns default state when ruleId is null', () => {
    const { result } = renderHook(() => useEncoding(null))
    expect(result.current.encoding).toBeNull()
    expect(result.current.sessionEvents).toEqual([])
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('fetches encoding data for a valid ruleId', async () => {
    const mockEncoding = {
      encoding_run_id: 'enc-1',
      citation: '26 USC 1',
      session_id: null,
      file_path: 'statute/26/1.rac',
      rac_content: 'rule { ... }',
      final_scores: { rac: 90, formula: 85, parameter: 80, integration: 75 },
    }
    mockGetRuleEncoding.mockResolvedValue(mockEncoding)

    const { result } = renderHook(() => useEncoding('rule-1'))

    // Loading state
    expect(result.current.loading).toBe(true)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.encoding).toEqual(mockEncoding)
    expect(result.current.sessionEvents).toEqual([])
    expect(result.current.error).toBeNull()
    expect(mockGetRuleEncoding).toHaveBeenCalledWith('rule-1')
  })

  it('fetches session events when encoding has session_id', async () => {
    const mockEncoding = {
      encoding_run_id: 'enc-1',
      citation: '26 USC 1',
      session_id: 'sess-1',
      file_path: 'statute/26/1.rac',
      rac_content: 'rule { ... }',
      final_scores: null,
    }
    const mockEvents = [
      { id: 'evt-1', session_id: 'sess-1', sequence: 1, timestamp: '2025-01-01T10:00:00Z', event_type: 'agent_start', tool_name: null, content: 'Start', metadata: null },
    ]
    mockGetRuleEncoding.mockResolvedValue(mockEncoding)
    mockGetSDKSessionEvents.mockResolvedValue(mockEvents)
    mockGetTranscriptsBySession.mockResolvedValue([])

    const { result } = renderHook(() => useEncoding('rule-1'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.encoding).toEqual(mockEncoding)
    expect(result.current.sessionEvents).toEqual(mockEvents)
    expect(result.current.agentTranscripts).toEqual([])
    expect(mockGetSDKSessionEvents).toHaveBeenCalledWith('sess-1')
    expect(mockGetTranscriptsBySession).toHaveBeenCalledWith('sess-1')
  })

  it('returns null encoding when getRuleEncoding returns null', async () => {
    mockGetRuleEncoding.mockResolvedValue(null)

    const { result } = renderHook(() => useEncoding('rule-1'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.encoding).toBeNull()
    expect(result.current.sessionEvents).toEqual([])
  })

  it('sets error on fetch failure', async () => {
    mockGetRuleEncoding.mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useEncoding('rule-1'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBe('Failed to load encoding data')
    expect(result.current.encoding).toBeNull()
    expect(result.current.sessionEvents).toEqual([])
  })

  it('cancels in-flight requests when ruleId changes', async () => {
    let resolveFirst: (v: any) => void
    const firstPromise = new Promise((resolve) => {
      resolveFirst = resolve
    })
    mockGetRuleEncoding
      .mockReturnValueOnce(firstPromise)
      .mockResolvedValueOnce(null)

    const { result, rerender } = renderHook(
      ({ ruleId }) => useEncoding(ruleId),
      { initialProps: { ruleId: 'rule-1' as string | null } }
    )

    // Change ruleId before first request resolves
    rerender({ ruleId: 'rule-2' })

    // Resolve first request
    resolveFirst!({
      encoding_run_id: 'stale',
      citation: 'stale',
      session_id: null,
      file_path: 'stale.rac',
      rac_content: null,
      final_scores: null,
    })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // Should NOT have the stale data
    expect(result.current.encoding).toBeNull()
  })

  it('resets state when ruleId changes to null', async () => {
    mockGetRuleEncoding.mockResolvedValue({
      encoding_run_id: 'enc-1',
      citation: '26 USC 1',
      session_id: null,
      file_path: 'statute/26/1.rac',
      rac_content: null,
      final_scores: null,
    })

    const { result, rerender } = renderHook(
      ({ ruleId }) => useEncoding(ruleId),
      { initialProps: { ruleId: 'rule-1' as string | null } }
    )

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.encoding).not.toBeNull()

    rerender({ ruleId: null })

    expect(result.current.encoding).toBeNull()
    expect(result.current.sessionEvents).toEqual([])
    expect(result.current.error).toBeNull()
  })
})
