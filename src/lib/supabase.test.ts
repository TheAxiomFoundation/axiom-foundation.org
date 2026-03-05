import { describe, it, expect, vi, beforeEach } from 'vitest'

// Use vi.hoisted to create mock functions that are available during vi.mock hoisting
const { mockFrom, mockRpc } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockRpc: vi.fn(),
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: mockFrom,
    rpc: mockRpc,
  }),
}))

// Now import the functions (they'll use the mocked supabase client)
import {
  getEncodingRuns,
  getAgentTranscripts,
  getTranscriptsBySession,
  getSDKSessions,
  getSDKSessionEvents,
  getSDKSessionMeta,
  getRuleEncoding,
} from './supabase'

describe('supabase lib', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getEncodingRuns', () => {
    it('returns encoding runs from rpc', async () => {
      const mockData = [{ id: '1', citation: '26 USC 1' }]
      mockRpc.mockResolvedValue({ data: mockData, error: null })

      const result = await getEncodingRuns(10, 0)
      expect(result).toEqual(mockData)
      expect(mockRpc).toHaveBeenCalledWith('get_encoding_runs', {
        limit_count: 10,
        offset_count: 0,
      })
    })

    it('returns empty array on error', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockRpc.mockResolvedValue({ data: null, error: { message: 'test error' } })

      const result = await getEncodingRuns()
      expect(result).toEqual([])
      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it('returns empty array when data is null', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      const result = await getEncodingRuns()
      expect(result).toEqual([])
    })

    it('uses default parameters', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await getEncodingRuns()
      expect(mockRpc).toHaveBeenCalledWith('get_encoding_runs', {
        limit_count: 100,
        offset_count: 0,
      })
    })
  })

  describe('getAgentTranscripts', () => {
    it('returns transcripts', async () => {
      const mockData = [{ id: 1, subagent_type: 'encoder' }]
      const rangeFn = vi.fn().mockResolvedValue({ data: mockData, error: null })
      const orderFn = vi.fn().mockReturnValue({ range: rangeFn })
      const selectFn = vi.fn().mockReturnValue({ order: orderFn })
      mockFrom.mockReturnValue({ select: selectFn })

      const result = await getAgentTranscripts(50, 10)
      expect(result).toEqual(mockData)
      expect(mockFrom).toHaveBeenCalledWith('agent_transcripts')
      expect(selectFn).toHaveBeenCalledWith('*')
      expect(orderFn).toHaveBeenCalledWith('created_at', { ascending: false })
      expect(rangeFn).toHaveBeenCalledWith(10, 59)
    })

    it('returns empty array on error', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const rangeFn = vi.fn().mockResolvedValue({ data: null, error: { message: 'err' } })
      const orderFn = vi.fn().mockReturnValue({ range: rangeFn })
      const selectFn = vi.fn().mockReturnValue({ order: orderFn })
      mockFrom.mockReturnValue({ select: selectFn })

      const result = await getAgentTranscripts()
      expect(result).toEqual([])
      consoleSpy.mockRestore()
    })

    it('returns empty when data is null without error', async () => {
      const rangeFn = vi.fn().mockResolvedValue({ data: null, error: null })
      const orderFn = vi.fn().mockReturnValue({ range: rangeFn })
      const selectFn = vi.fn().mockReturnValue({ order: orderFn })
      mockFrom.mockReturnValue({ select: selectFn })

      const result = await getAgentTranscripts()
      expect(result).toEqual([])
    })
  })

  describe('getTranscriptsBySession', () => {
    it('returns transcripts for a session', async () => {
      const mockData = [{ id: 1, session_id: 'sess-1' }]
      const orderFn = vi.fn().mockResolvedValue({ data: mockData, error: null })
      const eqFn = vi.fn().mockReturnValue({ order: orderFn })
      const selectFn = vi.fn().mockReturnValue({ eq: eqFn })
      mockFrom.mockReturnValue({ select: selectFn })

      const result = await getTranscriptsBySession('sess-1')
      expect(result).toEqual(mockData)
      expect(mockFrom).toHaveBeenCalledWith('agent_transcripts')
      expect(eqFn).toHaveBeenCalledWith('session_id', 'sess-1')
    })

    it('returns empty array on error', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const orderFn = vi.fn().mockResolvedValue({ data: null, error: { message: 'err' } })
      const eqFn = vi.fn().mockReturnValue({ order: orderFn })
      const selectFn = vi.fn().mockReturnValue({ eq: eqFn })
      mockFrom.mockReturnValue({ select: selectFn })

      const result = await getTranscriptsBySession('sess-1')
      expect(result).toEqual([])
      consoleSpy.mockRestore()
    })

    it('returns empty when data is null without error', async () => {
      const orderFn = vi.fn().mockResolvedValue({ data: null, error: null })
      const eqFn = vi.fn().mockReturnValue({ order: orderFn })
      const selectFn = vi.fn().mockReturnValue({ eq: eqFn })
      mockFrom.mockReturnValue({ select: selectFn })

      const result = await getTranscriptsBySession('sess-1')
      expect(result).toEqual([])
    })
  })

  describe('getSDKSessions', () => {
    it('returns SDK sessions', async () => {
      const mockData = [{ id: 'sdk-1' }]
      const limitFn = vi.fn().mockResolvedValue({ data: mockData, error: null })
      const orderFn = vi.fn().mockReturnValue({ limit: limitFn })
      const selectFn = vi.fn().mockReturnValue({ order: orderFn })
      mockFrom.mockReturnValue({ select: selectFn })

      const result = await getSDKSessions(10)
      expect(result).toEqual(mockData)
      expect(mockFrom).toHaveBeenCalledWith('sdk_sessions')
      expect(limitFn).toHaveBeenCalledWith(10)
    })

    it('returns empty array on error', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const limitFn = vi.fn().mockResolvedValue({ data: null, error: { message: 'err' } })
      const orderFn = vi.fn().mockReturnValue({ limit: limitFn })
      const selectFn = vi.fn().mockReturnValue({ order: orderFn })
      mockFrom.mockReturnValue({ select: selectFn })

      const result = await getSDKSessions()
      expect(result).toEqual([])
      consoleSpy.mockRestore()
    })

    it('uses default limit', async () => {
      const limitFn = vi.fn().mockResolvedValue({ data: [], error: null })
      const orderFn = vi.fn().mockReturnValue({ limit: limitFn })
      const selectFn = vi.fn().mockReturnValue({ order: orderFn })
      mockFrom.mockReturnValue({ select: selectFn })

      await getSDKSessions()
      expect(limitFn).toHaveBeenCalledWith(50)
    })

    it('returns empty when data is null without error', async () => {
      const limitFn = vi.fn().mockResolvedValue({ data: null, error: null })
      const orderFn = vi.fn().mockReturnValue({ limit: limitFn })
      const selectFn = vi.fn().mockReturnValue({ order: orderFn })
      mockFrom.mockReturnValue({ select: selectFn })

      const result = await getSDKSessions()
      expect(result).toEqual([])
    })
  })

  describe('getSDKSessionEvents', () => {
    it('returns events for a session', async () => {
      const mockData = [{ id: 'evt-1' }]
      const limitFn = vi.fn().mockResolvedValue({ data: mockData, error: null })
      const orderFn = vi.fn().mockReturnValue({ limit: limitFn })
      const eqFn = vi.fn().mockReturnValue({ order: orderFn })
      const selectFn = vi.fn().mockReturnValue({ eq: eqFn })
      mockFrom.mockReturnValue({ select: selectFn })

      const result = await getSDKSessionEvents('sdk-1', 50)
      expect(result).toEqual(mockData)
      expect(mockFrom).toHaveBeenCalledWith('sdk_session_events')
      expect(eqFn).toHaveBeenCalledWith('session_id', 'sdk-1')
    })

    it('returns empty array on error', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const limitFn = vi.fn().mockResolvedValue({ data: null, error: { message: 'err' } })
      const orderFn = vi.fn().mockReturnValue({ limit: limitFn })
      const eqFn = vi.fn().mockReturnValue({ order: orderFn })
      const selectFn = vi.fn().mockReturnValue({ eq: eqFn })
      mockFrom.mockReturnValue({ select: selectFn })

      const result = await getSDKSessionEvents('sdk-1')
      expect(result).toEqual([])
      consoleSpy.mockRestore()
    })

    it('uses default limit', async () => {
      const limitFn = vi.fn().mockResolvedValue({ data: [], error: null })
      const orderFn = vi.fn().mockReturnValue({ limit: limitFn })
      const eqFn = vi.fn().mockReturnValue({ order: orderFn })
      const selectFn = vi.fn().mockReturnValue({ eq: eqFn })
      mockFrom.mockReturnValue({ select: selectFn })

      await getSDKSessionEvents('sdk-1')
      expect(limitFn).toHaveBeenCalledWith(2000)
    })

    it('returns empty when data is null without error', async () => {
      const limitFn = vi.fn().mockResolvedValue({ data: null, error: null })
      const orderFn = vi.fn().mockReturnValue({ limit: limitFn })
      const eqFn = vi.fn().mockReturnValue({ order: orderFn })
      const selectFn = vi.fn().mockReturnValue({ eq: eqFn })
      mockFrom.mockReturnValue({ select: selectFn })

      const result = await getSDKSessionEvents('sdk-1')
      expect(result).toEqual([])
    })
  })

  describe('getSDKSessionMeta', () => {
    it('returns empty object for empty sessionIds', async () => {
      const result = await getSDKSessionMeta([])
      expect(result).toEqual({})
    })

    it('returns meta with title from agent_start events', async () => {
      const startEvents = [
        { session_id: 'sdk-1', content: 'Encode 26 USC 32 subsection a' },
      ]
      const lastEvents = [
        { session_id: 'sdk-1', timestamp: '2025-01-01T10:30:00Z' },
      ]

      // First call: startEvents, second call: lastEvents
      let callCount = 0
      const inFn = vi.fn()
      const eqFn = vi.fn()
      const orderFn = vi.fn()
      const selectFn = vi.fn()

      orderFn.mockImplementation(() => {
        callCount++
        if (callCount <= 1) {
          return { data: startEvents, error: null }
        }
        return { data: lastEvents, error: null }
      })

      eqFn.mockReturnValue({ order: orderFn })
      inFn.mockReturnValue({ eq: eqFn, order: orderFn })
      selectFn.mockReturnValue({ in: inFn })
      mockFrom.mockReturnValue({ select: selectFn })

      const result = await getSDKSessionMeta(['sdk-1'])
      expect(result['sdk-1']).toBeDefined()
      expect(result['sdk-1'].title).toBe('26 USC 32')
      expect(result['sdk-1'].lastEventAt).toBe('2025-01-01T10:30:00Z')
    })

    it('returns content prefix as title when no match pattern', async () => {
      const startEvents = [
        { session_id: 'sdk-1', content: 'Some arbitrary task description' },
      ]

      let callCount = 0
      const inFn = vi.fn()
      const eqFn = vi.fn()
      const orderFn = vi.fn()
      const selectFn = vi.fn()

      orderFn.mockImplementation(() => {
        callCount++
        if (callCount <= 1) {
          return { data: startEvents, error: null }
        }
        return { data: [], error: null }
      })

      eqFn.mockReturnValue({ order: orderFn })
      inFn.mockReturnValue({ eq: eqFn, order: orderFn })
      selectFn.mockReturnValue({ in: inFn })
      mockFrom.mockReturnValue({ select: selectFn })

      const result = await getSDKSessionMeta(['sdk-1'])
      expect(result['sdk-1'].title).toBe('Some arbitrary task description')
    })

    it('handles null content in start events', async () => {
      const startEvents = [
        { session_id: 'sdk-1', content: null },
      ]

      let callCount = 0
      const inFn = vi.fn()
      const eqFn = vi.fn()
      const orderFn = vi.fn()
      const selectFn = vi.fn()

      orderFn.mockImplementation(() => {
        callCount++
        if (callCount <= 1) {
          return { data: startEvents, error: null }
        }
        return { data: [{ session_id: 'sdk-1', timestamp: '2025-01-01T10:30:00Z' }], error: null }
      })

      eqFn.mockReturnValue({ order: orderFn })
      inFn.mockReturnValue({ eq: eqFn, order: orderFn })
      selectFn.mockReturnValue({ in: inFn })
      mockFrom.mockReturnValue({ select: selectFn })

      const result = await getSDKSessionMeta(['sdk-1'])
      // Session has lastEventAt but empty title since content was null
      expect(result['sdk-1']).toEqual({ title: '', lastEventAt: '2025-01-01T10:30:00Z' })
    })

    it('handles null data from queries', async () => {
      const inFn = vi.fn()
      const eqFn = vi.fn()
      const orderFn = vi.fn()
      const selectFn = vi.fn()

      orderFn.mockResolvedValue({ data: null, error: null })
      eqFn.mockReturnValue({ order: orderFn })
      inFn.mockReturnValue({ eq: eqFn, order: orderFn })
      selectFn.mockReturnValue({ in: inFn })
      mockFrom.mockReturnValue({ select: selectFn })

      const result = await getSDKSessionMeta(['sdk-1'])
      expect(result).toEqual({})
    })

    it('only takes first start event per session', async () => {
      const startEvents = [
        { session_id: 'sdk-1', content: 'Encode 26 USC 1' },
        { session_id: 'sdk-1', content: 'Encode 26 USC 2' },
      ]

      let callCount = 0
      const inFn = vi.fn()
      const eqFn = vi.fn()
      const orderFn = vi.fn()
      const selectFn = vi.fn()

      orderFn.mockImplementation(() => {
        callCount++
        if (callCount <= 1) {
          return { data: startEvents, error: null }
        }
        return { data: [], error: null }
      })

      eqFn.mockReturnValue({ order: orderFn })
      inFn.mockReturnValue({ eq: eqFn, order: orderFn })
      selectFn.mockReturnValue({ in: inFn })
      mockFrom.mockReturnValue({ select: selectFn })

      const result = await getSDKSessionMeta(['sdk-1'])
      // Should only take the first
      expect(result['sdk-1'].title).toBe('26 USC 1')
    })
  })

  describe('getRuleEncoding', () => {
    it('returns encoding data when rule has citation_path and encoding exists', async () => {
      // getRuleEncoding calls supabaseArch.from('rules') then supabase.from('encoding_runs')
      // Both clients use the same mockFrom since createClient is mocked once
      let fromCallCount = 0
      mockFrom.mockImplementation((table: string) => {
        fromCallCount++
        if (table === 'rules') {
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({
                  data: { citation_path: 'us/statute/26/1', jurisdiction: 'us' },
                  error: null,
                }),
              }),
            }),
          }
        }
        // encoding_runs
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                limit: () => Promise.resolve({
                  data: [{
                    id: 'enc-1',
                    citation: '26 USC 1',
                    session_id: 'sess-1',
                    file_path: 'statute/26/1.rac',
                    rac_content: 'rule { ... }',
                    final_scores: { rac: 90, formula: 85, parameter: 80, integration: 75 },
                  }],
                  error: null,
                }),
              }),
            }),
          }),
        }
      })

      const result = await getRuleEncoding('rule-1')
      expect(result).toEqual({
        encoding_run_id: 'enc-1',
        citation: '26 USC 1',
        session_id: 'sess-1',
        file_path: 'statute/26/1.rac',
        rac_content: 'rule { ... }',
        final_scores: { rac: 90, formula: 85, parameter: 80, integration: 75 },
        iterations: null,
        total_duration_ms: null,
        agent_type: null,
        agent_model: null,
        data_source: null,
        has_issues: null,
        note: null,
        timestamp: null,
      })
    })

    it('returns null when rule has no citation_path', async () => {
      mockFrom.mockReturnValue({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({
              data: { citation_path: null, jurisdiction: 'us' },
              error: null,
            }),
          }),
        }),
      })

      const result = await getRuleEncoding('rule-no-cp')
      expect(result).toBeNull()
    })

    it('returns null when rule fetch errors', async () => {
      mockFrom.mockReturnValue({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({
              data: null,
              error: { message: 'not found' },
            }),
          }),
        }),
      })

      const result = await getRuleEncoding('rule-missing')
      expect(result).toBeNull()
    })

    it('returns null when no encoding run matches', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'rules') {
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({
                  data: { citation_path: 'us/statute/26/99', jurisdiction: 'us' },
                  error: null,
                }),
              }),
            }),
          }
        }
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                limit: () => Promise.resolve({ data: [], error: null }),
              }),
            }),
          }),
        }
      })

      const result = await getRuleEncoding('rule-no-encoding')
      expect(result).toBeNull()
    })

    it('returns null when encoding_runs query errors', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'rules') {
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({
                  data: { citation_path: 'us/statute/26/1', jurisdiction: 'us' },
                  error: null,
                }),
              }),
            }),
          }
        }
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                limit: () => Promise.resolve({ data: null, error: { message: 'err' } }),
              }),
            }),
          }),
        }
      })

      const result = await getRuleEncoding('rule-err')
      expect(result).toBeNull()
    })
  })
})
