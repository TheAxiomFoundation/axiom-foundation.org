import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock useEncoding
const { mockUseEncoding } = vi.hoisted(() => ({
  mockUseEncoding: vi.fn().mockReturnValue({
    encoding: null,
    sessionEvents: [],
    agentTranscripts: [],
    loading: false,
    error: null,
  }),
}))

vi.mock('@/hooks/use-encoding', () => ({
  useEncoding: mockUseEncoding,
}))

import { SourceTab } from './source-tab'
import { EncodingTab } from './encoding-tab'
import { AgentLogsTab } from './agent-logs-tab'
import { RuleDetailPanel } from './rule-detail-panel'
import type { ViewerDocument } from '@/lib/atlas-utils'
import type { Rule, RuleEncodingData, SDKSessionEvent } from '@/lib/supabase'

function makeDoc(overrides: Partial<ViewerDocument> = {}): ViewerDocument {
  return {
    citation: '26 USC 1',
    title: 'Tax imposed',
    subsections: [
      { id: 'a', text: 'There is hereby imposed a tax.' },
      { id: 'b', text: 'The amount of tax shall be determined.' },
    ],
    hasRac: true,
    jurisdiction: 'us',
    archPath: 'statute/26/1.json',
    ...overrides,
  }
}

function makeRule(overrides: Partial<Rule> = {}): Rule {
  return {
    id: 'rule-1',
    jurisdiction: 'us',
    doc_type: 'statute',
    parent_id: null,
    level: 0,
    ordinal: 1,
    heading: 'Tax imposed',
    body: null,
    effective_date: null,
    repeal_date: null,
    source_url: null,
    source_path: 'statute/26/1',
    citation_path: 'us/statute/26/1',
    rac_path: null,
    has_rac: true,
    created_at: '2025-01-01',
    updated_at: '2025-01-01',
    ...overrides,
  }
}

function makeEncoding(overrides: Partial<RuleEncodingData> = {}): RuleEncodingData {
  return {
    encoding_run_id: 'enc-1',
    citation: '26 USC 1',
    session_id: 'sess-1',
    file_path: 'statute/26/1.rac',
    rac_content: 'rule tax_imposed { ... }',
    final_scores: { rac: 90, formula: 85, parameter: 80, integration: 75 },
    iterations: null,
    total_duration_ms: null,
    agent_type: null,
    agent_model: null,
    data_source: null,
    has_issues: null,
    note: null,
    timestamp: null,
    ...overrides,
  }
}

function makeEvent(overrides: Partial<SDKSessionEvent> = {}): SDKSessionEvent {
  return {
    id: 'evt-1',
    session_id: 'sess-1',
    sequence: 1,
    timestamp: '2025-01-01T10:00:00Z',
    event_type: 'agent_start',
    tool_name: null,
    content: 'Start encoding',
    metadata: null,
    ...overrides,
  }
}

describe('SourceTab', () => {
  it('renders subsections with IDs', () => {
    render(<SourceTab document={makeDoc()} />)
    expect(screen.getByText('(a)')).toBeInTheDocument()
    expect(screen.getByText('(b)')).toBeInTheDocument()
    expect(screen.getByText('There is hereby imposed a tax.')).toBeInTheDocument()
  })

  it('renders archPath when present', () => {
    render(<SourceTab document={makeDoc()} />)
    expect(screen.getByText('statute/26/1.json')).toBeInTheDocument()
  })

  it('does not render source section when archPath is null', () => {
    render(<SourceTab document={makeDoc({ archPath: null })} />)
    expect(screen.queryByText('Source:')).not.toBeInTheDocument()
  })

  it('highlights subsection on hover', () => {
    render(<SourceTab document={makeDoc()} />)
    const subsection = screen.getByText('There is hereby imposed a tax.')
    const container = subsection.closest('div[class*="transition"]')!
    fireEvent.mouseEnter(container)
    expect(container).toHaveClass('bg-[rgba(59,130,246,0.08)]')
    fireEvent.mouseLeave(container)
    expect(container).not.toHaveClass('bg-[rgba(59,130,246,0.08)]')
  })
})

describe('EncodingTab', () => {
  it('shows loading state', () => {
    render(<EncodingTab encoding={null} loading={true} />)
    expect(screen.getByText('Loading encoding data...')).toBeInTheDocument()
  })

  it('shows empty state when no encoding', () => {
    render(<EncodingTab encoding={null} loading={false} />)
    expect(screen.getByText('Not yet encoded')).toBeInTheDocument()
    expect(screen.getByText('This rule has not been encoded into RAC format yet.')).toBeInTheDocument()
  })

  it('renders encoding with scores, RAC content, and file path', () => {
    render(<EncodingTab encoding={makeEncoding()} loading={false} />)
    expect(screen.getByText('90')).toBeInTheDocument()
    expect(screen.getByText('85')).toBeInTheDocument()
    expect(screen.getByText('80')).toBeInTheDocument()
    expect(screen.getByText('75')).toBeInTheDocument()
    expect(screen.getByText('rule tax_imposed { ... }')).toBeInTheDocument()
    expect(screen.getByText('statute/26/1.rac')).toBeInTheDocument()
  })

  it('renders encoding without scores', () => {
    render(<EncodingTab encoding={makeEncoding({ final_scores: null })} loading={false} />)
    expect(screen.getByText('statute/26/1.rac')).toBeInTheDocument()
    expect(screen.queryByText('90')).not.toBeInTheDocument()
  })

  it('renders encoding without RAC content', () => {
    render(<EncodingTab encoding={makeEncoding({ rac_content: null })} loading={false} />)
    expect(screen.getByText('statute/26/1.rac')).toBeInTheDocument()
    expect(screen.queryByText('rule tax_imposed { ... }')).not.toBeInTheDocument()
  })
})

describe('AgentLogsTab', () => {
  it('shows loading state', () => {
    render(<AgentLogsTab sessionEvents={[]} loading={true} sessionId="sess-1" />)
    expect(screen.getByText('Loading agent logs...')).toBeInTheDocument()
  })

  it('shows empty state when no sessionId', () => {
    render(<AgentLogsTab sessionEvents={[]} loading={false} sessionId={null} />)
    expect(screen.getByText('No sessions')).toBeInTheDocument()
    expect(screen.getByText('No agent sessions are linked to this rule.')).toBeInTheDocument()
  })

  it('shows empty state when sessionEvents is empty', () => {
    render(<AgentLogsTab sessionEvents={[]} loading={false} sessionId="sess-1" />)
    expect(screen.getByText('No sessions')).toBeInTheDocument()
  })

  it('renders agent phases and event timeline section headers', () => {
    const events = [
      makeEvent({ id: 'e1', sequence: 1, event_type: 'agent_start' }),
      makeEvent({ id: 'e2', sequence: 2, event_type: 'tool_use', tool_name: 'Read' }),
      makeEvent({ id: 'e3', sequence: 3, event_type: 'agent_end' }),
    ]
    render(<AgentLogsTab sessionEvents={events} loading={false} sessionId="sess-1" />)
    expect(screen.getByText('Agent phases (1)')).toBeInTheDocument()
    expect(screen.getByText('Event timeline (3)')).toBeInTheDocument()
  })

  it('shows "No agent phases found" when expanding phases with no agent_start', () => {
    const events = [
      makeEvent({ id: 'e1', sequence: 1, event_type: 'tool_use' }),
    ]
    render(<AgentLogsTab sessionEvents={events} loading={false} sessionId="sess-1" />)
    // Expand the agent phases section
    fireEvent.click(screen.getByText('Agent phases (0)').closest('button')!)
    expect(screen.getByText(/No agent phases found/)).toBeInTheDocument()
  })

  it('shows "Show more" when expanding event timeline with many events', () => {
    const events = Array.from({ length: 60 }, (_, i) =>
      makeEvent({ id: `e${i}`, sequence: i + 1, event_type: 'tool_use' })
    )
    render(<AgentLogsTab sessionEvents={events} loading={false} sessionId="sess-1" />)
    // Expand event timeline
    fireEvent.click(screen.getByText('Event timeline (60)').closest('button')!)
    expect(screen.getByText(/Show more/)).toBeInTheDocument()
    expect(screen.getByText(/10 remaining/)).toBeInTheDocument()
  })

  it('loads more events when "Show more" is clicked', () => {
    const events = Array.from({ length: 60 }, (_, i) =>
      makeEvent({ id: `e${i}`, sequence: i + 1, event_type: 'tool_use' })
    )
    render(<AgentLogsTab sessionEvents={events} loading={false} sessionId="sess-1" />)
    // Expand event timeline
    fireEvent.click(screen.getByText('Event timeline (60)').closest('button')!)
    fireEvent.click(screen.getByText(/Show more/))
    expect(screen.queryByText(/remaining/)).not.toBeInTheDocument()
  })

  it('toggles event expansion in timeline', () => {
    const events = [
      makeEvent({ id: 'e1', sequence: 1, event_type: 'agent_start', content: 'Hello world content' }),
    ]
    render(<AgentLogsTab sessionEvents={events} loading={false} sessionId="sess-1" />)
    // Expand event timeline section
    fireEvent.click(screen.getByText('Event timeline (1)').closest('button')!)
    const eventRows = screen.getAllByText('#1')
    const timelineRow = eventRows[eventRows.length - 1].closest('[class*="cursor-pointer"]')!
    fireEvent.click(timelineRow)
    expect(screen.getAllByText('Hello world content').length).toBeGreaterThanOrEqual(1)
  })
})

describe('RuleDetailPanel', () => {
  beforeEach(() => {
    mockUseEncoding.mockReturnValue({
      encoding: null,
      sessionEvents: [],
      agentTranscripts: [],
      loading: false,
      error: null,
    })
  })

  it('renders title, citation, and jurisdiction', () => {
    render(<RuleDetailPanel document={makeDoc()} rule={makeRule()} />)
    expect(screen.getByText('Tax imposed')).toBeInTheDocument()
    expect(screen.getByText('26 USC 1')).toBeInTheDocument()
    expect(screen.getByText('US')).toBeInTheDocument()
  })

  it('renders UK jurisdiction', () => {
    render(
      <RuleDetailPanel
        document={makeDoc({ jurisdiction: 'uk' })}
        rule={makeRule({ jurisdiction: 'uk' })}
      />
    )
    expect(screen.getByText('UK')).toBeInTheDocument()
  })

  it('renders Canada jurisdiction', () => {
    render(
      <RuleDetailPanel
        document={makeDoc({ jurisdiction: 'canada' })}
        rule={makeRule({ jurisdiction: 'canada' })}
      />
    )
    expect(screen.getByText('CA')).toBeInTheDocument()
  })

  it('renders state jurisdiction from us- prefix', () => {
    render(
      <RuleDetailPanel
        document={makeDoc({ jurisdiction: 'us-ny' })}
        rule={makeRule({ jurisdiction: 'us-ny' })}
      />
    )
    expect(screen.getByText('NY')).toBeInTheDocument()
  })

  it('shows source and encoding side by side', () => {
    render(<RuleDetailPanel document={makeDoc()} rule={makeRule()} />)
    expect(screen.getByText('Source')).toBeInTheDocument()
    expect(screen.getByText('Encoding')).toBeInTheDocument()
    expect(screen.getByText('There is hereby imposed a tax.')).toBeInTheDocument()
    expect(screen.getByText('Not yet encoded')).toBeInTheDocument()
  })

  it('shows encoding content when available', () => {
    mockUseEncoding.mockReturnValue({
      encoding: makeEncoding(),
      sessionEvents: [],
      agentTranscripts: [],
      loading: false,
      error: null,
    })
    render(<RuleDetailPanel document={makeDoc()} rule={makeRule()} />)
    expect(screen.getByText('rule tax_imposed { ... }')).toBeInTheDocument()
  })

  it('shows back button when onBack is provided', () => {
    const onBack = vi.fn()
    render(<RuleDetailPanel document={makeDoc()} rule={makeRule()} onBack={onBack} />)
    const backBtn = screen.getByTitle('Back to browser')
    fireEvent.click(backBtn)
    expect(onBack).toHaveBeenCalled()
  })

  it('does not show back button when onBack is not provided', () => {
    render(<RuleDetailPanel document={makeDoc()} rule={makeRule()} />)
    expect(screen.queryByTitle('Back to browser')).not.toBeInTheDocument()
  })

  it('shows agent logs drawer when session events exist', () => {
    mockUseEncoding.mockReturnValue({
      encoding: makeEncoding(),
      sessionEvents: [makeEvent()],
      agentTranscripts: [],
      loading: false,
      error: null,
    })
    render(<RuleDetailPanel document={makeDoc()} rule={makeRule()} />)
    expect(screen.getByText('Agent logs')).toBeInTheDocument()
    expect(screen.getByText('(1 events)')).toBeInTheDocument()
  })

  it('toggles agent logs drawer open and closed', () => {
    mockUseEncoding.mockReturnValue({
      encoding: makeEncoding(),
      sessionEvents: [makeEvent()],
      agentTranscripts: [],
      loading: false,
      error: null,
    })
    render(<RuleDetailPanel document={makeDoc()} rule={makeRule()} />)

    // Initially closed — collapsed arrow on the drawer button
    const drawerBtn = screen.getByText('Agent logs').closest('button')!
    expect(drawerBtn.textContent).toContain('\u25B6')

    // Open drawer
    fireEvent.click(drawerBtn)
    expect(drawerBtn.textContent).toContain('\u25BC')

    // Close drawer
    fireEvent.click(drawerBtn)
    expect(drawerBtn.textContent).toContain('\u25B6')
  })

  it('does not show agent logs drawer when no events and not loading', () => {
    render(<RuleDetailPanel document={makeDoc()} rule={makeRule()} />)
    expect(screen.queryByText('Agent logs')).not.toBeInTheDocument()
  })

  it('shows agent logs drawer when loading', () => {
    mockUseEncoding.mockReturnValue({
      encoding: null,
      sessionEvents: [],
      agentTranscripts: [],
      loading: true,
      error: null,
    })
    render(<RuleDetailPanel document={makeDoc()} rule={makeRule()} />)
    expect(screen.getByText('Agent logs')).toBeInTheDocument()
  })

  it('shows status bar with subsection count', () => {
    render(<RuleDetailPanel document={makeDoc()} rule={makeRule()} />)
    expect(screen.getByText(/2 subsections/)).toBeInTheDocument()
    expect(screen.getByText('Connected to Atlas')).toBeInTheDocument()
  })

  it('shows RAC available in status bar when encoding exists', () => {
    mockUseEncoding.mockReturnValue({
      encoding: makeEncoding(),
      sessionEvents: [],
      agentTranscripts: [],
      loading: false,
      error: null,
    })
    render(<RuleDetailPanel document={makeDoc()} rule={makeRule()} />)
    expect(screen.getByText('2 subsections | RAC available')).toBeInTheDocument()
  })

  it('fetches encoding data immediately', () => {
    render(<RuleDetailPanel document={makeDoc()} rule={makeRule()} />)
    expect(mockUseEncoding).toHaveBeenCalledWith('rule-1')
  })
})
