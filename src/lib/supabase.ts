import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Supabase configuration
/* v8 ignore start -- env-dependent module initialization */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const isTestEnv = !supabaseUrl || process.env.NODE_ENV === 'test'
export const supabase: SupabaseClient = isTestEnv
  ? createClient('https://placeholder.supabase.co', 'placeholder-key')
  : createClient(supabaseUrl, supabaseAnonKey)

// Arch schema client for atlas/rule browsing
export const supabaseArch: SupabaseClient = isTestEnv
  ? createClient('https://placeholder.supabase.co', 'placeholder-key', { db: { schema: 'arch' } })
  : createClient(supabaseUrl, supabaseAnonKey, { db: { schema: 'arch' } })
/* v8 ignore stop */

// Types for encoding runs (AutoRAC Experiment Lab)
export interface EncodingRunIteration {
  attempt: number
  success: boolean
  duration_ms: number
  errors: { type: string; message: string }[]
}

export interface EncodingRunScores {
  rac: number
  formula: number
  parameter: number
  integration: number
}

export type DataSource = 'reviewer_agent' | 'ci_only' | 'mock' | 'manual_estimate' | 'unknown'

export interface EncodingRun {
  id: string
  timestamp: string
  citation: string
  iterations: EncodingRunIteration[]
  scores: EncodingRunScores
  has_issues: boolean | null
  note: string | null
  total_duration_ms: number | null
  agent_type: string | null
  agent_model: string | null
  data_source: DataSource
  session_id: string | null
}

// Fetch encoding runs from Supabase
export async function getEncodingRuns(limit = 100, offset = 0): Promise<EncodingRun[]> {
  const { data, error } = await supabase
    .rpc('get_encoding_runs', { limit_count: limit, offset_count: offset })

  if (error) {
    console.error('Error fetching encoding runs:', error)
    return []
  }

  return (data || []) as EncodingRun[]
}

// Types for agent transcripts (AutoRAC Experiment Lab)
export interface TranscriptMessage {
  type: string
  message?: {
    role: string
    content: Array<{ type: string; text?: string; thinking?: string }>
  }
  timestamp?: string
  agentId?: string
}

export interface AgentTranscript {
  id: number
  session_id: string
  agent_id: string | null
  tool_use_id: string
  subagent_type: string
  prompt: string | null
  description: string | null
  response_summary: string | null
  transcript: TranscriptMessage[] | null
  orchestrator_thinking: string | null
  message_count: number
  created_at: string
  uploaded_at: string | null
}

// Fetch agent transcripts from Supabase
export async function getAgentTranscripts(limit = 100, offset = 0): Promise<AgentTranscript[]> {
  const { data, error } = await supabase
    .from('agent_transcripts')
    .select('*')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    console.error('Error fetching agent transcripts:', error)
    return []
  }

  return (data || []) as AgentTranscript[]
}

// Fetch transcripts for a specific session (linked to an encoding run)
export async function getTranscriptsBySession(sessionId: string): Promise<AgentTranscript[]> {
  const { data, error } = await supabase
    .from('agent_transcripts')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching transcripts by session:', error)
    return []
  }

  return (data || []) as AgentTranscript[]
}

// Types for SDK orchestrator sessions (full encoding pipeline runs)
export interface SDKSession {
  id: string
  started_at: string
  ended_at: string | null
  model: string | null
  cwd: string | null
  event_count: number
  input_tokens: number
  output_tokens: number
  cache_read_tokens: number
  estimated_cost_usd: number
}

export interface SDKSessionEvent {
  id: string
  session_id: string
  sequence: number
  timestamp: string
  event_type: string
  tool_name: string | null
  content: string | null
  metadata: Record<string, unknown> | null
}

// Fetch SDK orchestrator sessions from Supabase
export async function getSDKSessions(limit = 50): Promise<SDKSession[]> {
  const { data, error } = await supabase
    .from('sdk_sessions')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching SDK sessions:', error)
    return []
  }

  return (data || []) as SDKSession[]
}

// Fetch session metadata
export async function getSDKSessionMeta(
  sessionIds: string[]
): Promise<Record<string, { title: string; lastEventAt: string | null }>> {
  if (sessionIds.length === 0) return {}

  const { data: startEvents } = await supabase
    .from('sdk_session_events')
    .select('session_id, content')
    .in('session_id', sessionIds)
    .eq('event_type', 'agent_start')
    .order('sequence', { ascending: true })

  const { data: lastEvents } = await supabase
    .from('sdk_session_events')
    .select('session_id, timestamp')
    .in('session_id', sessionIds)
    .order('sequence', { ascending: false })

  const meta: Record<string, { title: string; lastEventAt: string | null }> = {}

  if (startEvents) {
    for (const row of startEvents) {
      if (!meta[row.session_id] && row.content) {
        const match = row.content.match(/(?:Analyze|Encode)\s+(.+?)(?:\s+subsection|\s*$)/i)
        meta[row.session_id] = {
          title: match ? match[1].trim() : row.content.slice(0, 60),
          lastEventAt: null,
        }
      }
    }
  }

  if (lastEvents) {
    const seen = new Set<string>()
    for (const row of lastEvents) {
      if (!seen.has(row.session_id)) {
        seen.add(row.session_id)
        if (meta[row.session_id]) {
          meta[row.session_id].lastEventAt = row.timestamp
        } else {
          meta[row.session_id] = { title: '', lastEventAt: row.timestamp }
        }
      }
    }
  }

  return meta
}

// Fetch events for a specific SDK session
export async function getSDKSessionEvents(sessionId: string, limit = 2000): Promise<SDKSessionEvent[]> {
  const { data, error } = await supabase
    .from('sdk_session_events')
    .select('*')
    .eq('session_id', sessionId)
    .order('sequence', { ascending: true })
    .limit(limit)

  if (error) {
    console.error('Error fetching SDK session events:', error)
    return []
  }

  return (data || []) as SDKSessionEvent[]
}

// Atlas/Rule types (from atlas-viewer)
export interface Rule {
  id: string
  jurisdiction: string
  doc_type: string
  parent_id: string | null
  level: number
  ordinal: number | null
  heading: string | null
  body: string | null
  effective_date: string | null
  repeal_date: string | null
  source_url: string | null
  source_path: string | null
  rac_path: string | null
  has_rac: boolean
  created_at: string
  updated_at: string
}
