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
export const supabaseArch = isTestEnv
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
  autorac_version: string | null
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
  citation_path: string | null
  rac_path: string | null
  has_rac: boolean
  created_at: string
  updated_at: string
}

// Encoding data linked to a rule via citation_path
export interface RuleEncodingData {
  encoding_run_id: string
  citation: string
  session_id: string | null
  file_path: string
  rac_content: string | null
  final_scores: EncodingRunScores | null
  // Lab metadata (only present for encoding_runs sources)
  iterations: EncodingRunIteration[] | null
  total_duration_ms: number | null
  agent_type: string | null
  agent_model: string | null
  data_source: DataSource | null
  has_issues: boolean | null
  note: string | null
  timestamp: string | null
  autorac_version: string | null
}

// Generate candidate file paths walking up the hierarchy
// e.g. "statute/26/32/b/1" → ["statute/26/32/b/1.rac", "statute/26/32/b.rac", "statute/26/32.rac"]
function parentPaths(basePath: string): string[] {
  const paths: string[] = [basePath + '.rac']
  const parts = basePath.split('/')
  for (let i = parts.length - 1; i >= 2; i--) {
    paths.push(parts.slice(0, i).join('/') + '.rac')
  }
  return paths
}

// Fetch RAC content from GitHub rac-us repo (fallback for hand-written encodings)
/* v8 ignore start -- network fetch to GitHub, tested via integration */
async function fetchRacFromGitHub(
  basePath: string,
  jurisdiction: string
): Promise<RuleEncodingData | null> {
  const repoMap: Record<string, string> = {
    us: 'rac-us',
    'us-ca': 'rac-us-ca',
    'us-ny': 'rac-us-ny',
    ca: 'rac-ca',
  }
  const repo = repoMap[jurisdiction]
  if (!repo) return null

  for (const filePath of parentPaths(basePath)) {
    const url = `https://raw.githubusercontent.com/TheAxiomFoundation/${repo}/main/${filePath}`
    try {
      const res = await fetch(url, { next: { revalidate: 3600 } } as RequestInit)
      if (!res.ok) continue
      const rac_content = await res.text()
      return {
        encoding_run_id: `github:${filePath}`,
        citation: filePath.replace('.rac', ''),
        session_id: null,
        file_path: filePath,
        rac_content,
        final_scores: null,
        iterations: null,
        total_duration_ms: null,
        agent_type: null,
        agent_model: null,
        data_source: null,
        has_issues: null,
        note: null,
        timestamp: null,
        autorac_version: null,
      }
    } catch {
      continue
    }
  }
  return null
}
/* v8 ignore stop */

// Fetch encoding data for a rule by its ID
export async function getRuleEncoding(ruleId: string): Promise<RuleEncodingData | null> {
  // First get the rule's citation_path and jurisdiction
  const { data: rule, error: ruleError } = await supabaseArch
    .from('rules')
    .select('citation_path, jurisdiction')
    .eq('id', ruleId)
    .single()

  if (ruleError || !rule?.citation_path) return null

  // Match citation_path to encoding_runs.file_path
  // citation_path: "us/statute/26/1/j/2" → file_path: "statute/26/1/j/2.rac"
  const basePath = rule.citation_path.replace(rule.jurisdiction + '/', '')

  // Single query: try all candidate paths at once, pick the most specific match
  const candidates = parentPaths(basePath)
  const { data, error } = await supabase
    .from('encoding_runs')
    .select('id, citation, session_id, file_path, rac_content, final_scores, iterations, total_duration_ms, agent_type, agent_model, data_source, has_issues, note, timestamp, autorac_version')
    .in('file_path', candidates)
    .order('timestamp', { ascending: false })

  if (!error && data && data.length > 0) {
    // Pick the most specific match (earliest in candidates list = most specific path)
    const pathPriority = new Map(candidates.map((p, i) => [p, i]))
    /* v8 ignore next 2 -- reduce comparator only exercises b-branch with multiple results */
    const best = data.reduce((a, b) =>
      (pathPriority.get(a.file_path) ?? Infinity) <= (pathPriority.get(b.file_path) ?? Infinity) ? a : b
    )
    return {
      encoding_run_id: best.id,
      citation: best.citation,
      session_id: best.session_id,
      file_path: best.file_path,
      rac_content: best.rac_content,
      final_scores: best.final_scores,
      iterations: best.iterations ?? null,
      total_duration_ms: best.total_duration_ms ?? null,
      agent_type: best.agent_type ?? null,
      agent_model: best.agent_model ?? null,
      data_source: best.data_source ?? null,
      has_issues: best.has_issues ?? null,
      note: best.note ?? null,
      timestamp: best.timestamp ?? null,
      autorac_version: best.autorac_version ?? null,
    }
  }

  // Fallback: fetch from GitHub rac-* repo
  return fetchRacFromGitHub(basePath, rule.jurisdiction)
}
