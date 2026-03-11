import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

import { EventRow, type BadgeColors } from './event-row'
import { AgentPhase } from './agent-phase'
import type { SDKSessionEvent } from '@/lib/supabase'

const badgeColors: BadgeColors = {
  agent_start: { bg: 'rgba(59, 130, 246, 0.15)', fg: '#3b82f6' },
  tool_use: { bg: 'rgba(167, 139, 250, 0.15)', fg: '#a78bfa' },
}

function makeEvent(overrides: Partial<SDKSessionEvent> = {}): SDKSessionEvent {
  return {
    id: 'evt-1',
    session_id: 'sess-1',
    sequence: 1,
    timestamp: '2025-01-01T10:01:30Z',
    event_type: 'agent_start',
    tool_name: null,
    content: 'Start encoding',
    metadata: null,
    ...overrides,
  }
}

describe('EventRow', () => {
  const sessionStart = '2025-01-01T10:00:00Z'

  it('renders sequence number, event type, and relative time', () => {
    render(
      <EventRow
        event={makeEvent()}
        sessionStart={sessionStart}
        isExpanded={false}
        badgeColors={badgeColors}
        onToggle={vi.fn()}
      />
    )
    expect(screen.getByText('#1')).toBeInTheDocument()
    expect(screen.getByText('start')).toBeInTheDocument()
    expect(screen.getByText('+1m 30s')).toBeInTheDocument()
  })

  it('shows tool_name in label when present', () => {
    render(
      <EventRow
        event={makeEvent({ event_type: 'tool_use', tool_name: 'WebSearch' })}
        sessionStart={sessionStart}
        isExpanded={false}
        badgeColors={badgeColors}
        onToggle={vi.fn()}
      />
    )
    expect(screen.getByText('WebSearch')).toBeInTheDocument()
  })

  it('truncates content at 150 chars when collapsed', () => {
    const longContent = 'A'.repeat(200)
    render(
      <EventRow
        event={makeEvent({ content: longContent })}
        sessionStart={sessionStart}
        isExpanded={false}
        badgeColors={badgeColors}
        onToggle={vi.fn()}
      />
    )
    expect(screen.getByText('A'.repeat(150) + '...')).toBeInTheDocument()
  })

  it('shows full content when expanded', () => {
    const longContent = 'B'.repeat(150)
    render(
      <EventRow
        event={makeEvent({ content: longContent })}
        sessionStart={sessionStart}
        isExpanded={true}
        badgeColors={badgeColors}
        onToggle={vi.fn()}
      />
    )
    expect(screen.getByText(longContent)).toBeInTheDocument()
  })

  it('shows content without ellipsis when under 120 chars', () => {
    render(
      <EventRow
        event={makeEvent({ content: 'Short text' })}
        sessionStart={sessionStart}
        isExpanded={false}
        badgeColors={badgeColors}
        onToggle={vi.fn()}
      />
    )
    expect(screen.getByText('Short text')).toBeInTheDocument()
  })

  it('shows "--" when content is empty', () => {
    render(
      <EventRow
        event={makeEvent({ content: '' })}
        sessionStart={sessionStart}
        isExpanded={false}
        badgeColors={badgeColors}
        onToggle={vi.fn()}
      />
    )
    expect(screen.getByText('--')).toBeInTheDocument()
  })

  it('shows "--" when content is null', () => {
    render(
      <EventRow
        event={makeEvent({ content: null })}
        sessionStart={sessionStart}
        isExpanded={false}
        badgeColors={badgeColors}
        onToggle={vi.fn()}
      />
    )
    expect(screen.getByText('--')).toBeInTheDocument()
  })

  it('calls onToggle when clicked', () => {
    const onToggle = vi.fn()
    render(
      <EventRow
        event={makeEvent()}
        sessionStart={sessionStart}
        isExpanded={false}
        badgeColors={badgeColors}
        onToggle={onToggle}
      />
    )
    fireEvent.click(screen.getByText('#1').closest('div')!)
    expect(onToggle).toHaveBeenCalled()
  })

  it('uses default badge colors for unknown event type', () => {
    render(
      <EventRow
        event={makeEvent({ event_type: 'unknown_type' })}
        sessionStart={sessionStart}
        isExpanded={false}
        badgeColors={badgeColors}
        onToggle={vi.fn()}
      />
    )
    expect(screen.getByText('unknown_type')).toBeInTheDocument()
  })

  it('handles event before session start (negative offset clamped to 0)', () => {
    render(
      <EventRow
        event={makeEvent({ timestamp: '2025-01-01T09:59:00Z' })}
        sessionStart={sessionStart}
        isExpanded={false}
        badgeColors={badgeColors}
        onToggle={vi.fn()}
      />
    )
    expect(screen.getByText('+0m 00s')).toBeInTheDocument()
  })
})

describe('AgentPhase', () => {
  const sessionStart = '2025-01-01T10:00:00Z'

  const allEvents: SDKSessionEvent[] = [
    makeEvent({ id: 'e1', sequence: 1, event_type: 'agent_start', content: 'Phase 1 prompt' }),
    makeEvent({ id: 'e2', sequence: 2, event_type: 'tool_use', tool_name: 'WebSearch', content: 'Searching' }),
    makeEvent({ id: 'e3', sequence: 3, event_type: 'tool_use', tool_name: 'WebSearch', content: 'Searching again' }),
    makeEvent({ id: 'e4', sequence: 4, event_type: 'tool_use', tool_name: 'Read', content: 'Reading' }),
    makeEvent({ id: 'e5', sequence: 5, event_type: 'agent_end', content: 'Done' }),
  ]

  it('renders phase number and event count', () => {
    render(
      <AgentPhase
        phase={allEvents[0]}
        phaseIndex={0}
        allEvents={allEvents}
        expandedPhases={new Set()}
        setExpandedPhases={vi.fn()}
        expandedEvents={new Set()}
        setExpandedEvents={vi.fn()}
        sessionStart={sessionStart}
        badgeColors={badgeColors}
      />
    )
    expect(screen.getByText('Phase 1')).toBeInTheDocument()
    expect(screen.getByText('5 events')).toBeInTheDocument()
  })

  it('shows phase prompt text', () => {
    render(
      <AgentPhase
        phase={allEvents[0]}
        phaseIndex={0}
        allEvents={allEvents}
        expandedPhases={new Set()}
        setExpandedPhases={vi.fn()}
        expandedEvents={new Set()}
        setExpandedEvents={vi.fn()}
        sessionStart={sessionStart}
        badgeColors={badgeColors}
      />
    )
    expect(screen.getByText('Phase 1 prompt')).toBeInTheDocument()
  })

  it('shows tool usage counts', () => {
    render(
      <AgentPhase
        phase={allEvents[0]}
        phaseIndex={0}
        allEvents={allEvents}
        expandedPhases={new Set()}
        setExpandedPhases={vi.fn()}
        expandedEvents={new Set()}
        setExpandedEvents={vi.fn()}
        sessionStart={sessionStart}
        badgeColors={badgeColors}
      />
    )
    expect(screen.getByText(/WebSearch/)).toBeInTheDocument()
    expect(screen.getByText(/Read/)).toBeInTheDocument()
  })

  it('shows collapsed arrow when not expanded', () => {
    render(
      <AgentPhase
        phase={allEvents[0]}
        phaseIndex={0}
        allEvents={allEvents}
        expandedPhases={new Set()}
        setExpandedPhases={vi.fn()}
        expandedEvents={new Set()}
        setExpandedEvents={vi.fn()}
        sessionStart={sessionStart}
        badgeColors={badgeColors}
      />
    )
    expect(screen.getByText('\u25B6')).toBeInTheDocument()
  })

  it('shows expanded arrow and events when expanded', () => {
    render(
      <AgentPhase
        phase={allEvents[0]}
        phaseIndex={0}
        allEvents={allEvents}
        expandedPhases={new Set([0])}
        setExpandedPhases={vi.fn()}
        expandedEvents={new Set()}
        setExpandedEvents={vi.fn()}
        sessionStart={sessionStart}
        badgeColors={badgeColors}
      />
    )
    expect(screen.getByText('\u25BC')).toBeInTheDocument()
    // Should show event rows within the expanded phase
    expect(screen.getByText('#1')).toBeInTheDocument()
    expect(screen.getByText('#5')).toBeInTheDocument()
  })

  it('toggles expansion on click', () => {
    const setExpandedPhases = vi.fn()
    render(
      <AgentPhase
        phase={allEvents[0]}
        phaseIndex={0}
        allEvents={allEvents}
        expandedPhases={new Set()}
        setExpandedPhases={setExpandedPhases}
        expandedEvents={new Set()}
        setExpandedEvents={vi.fn()}
        sessionStart={sessionStart}
        badgeColors={badgeColors}
      />
    )
    fireEvent.click(screen.getByText('Phase 1').closest('.cursor-pointer')!)
    expect(setExpandedPhases).toHaveBeenCalled()

    // Test the updater function adds the index
    const updater = setExpandedPhases.mock.calls[0][0]
    const newSet = updater(new Set())
    expect(newSet.has(0)).toBe(true)
  })

  it('toggles expansion off on click when already expanded', () => {
    const setExpandedPhases = vi.fn()
    render(
      <AgentPhase
        phase={allEvents[0]}
        phaseIndex={0}
        allEvents={allEvents}
        expandedPhases={new Set([0])}
        setExpandedPhases={setExpandedPhases}
        expandedEvents={new Set()}
        setExpandedEvents={vi.fn()}
        sessionStart={sessionStart}
        badgeColors={badgeColors}
      />
    )
    fireEvent.click(screen.getByText('Phase 1').closest('.cursor-pointer')!)
    const updater = setExpandedPhases.mock.calls[0][0]
    const newSet = updater(new Set([0]))
    expect(newSet.has(0)).toBe(false)
  })

  it('truncates long prompt at 300 chars with ellipsis', () => {
    const longPrompt = 'X'.repeat(350)
    render(
      <AgentPhase
        phase={makeEvent({ content: longPrompt })}
        phaseIndex={0}
        allEvents={[makeEvent({ content: longPrompt })]  }
        expandedPhases={new Set()}
        setExpandedPhases={vi.fn()}
        expandedEvents={new Set()}
        setExpandedEvents={vi.fn()}
        sessionStart={sessionStart}
        badgeColors={badgeColors}
      />
    )
    expect(screen.getByText('X'.repeat(300) + '...')).toBeInTheDocument()
  })

  it('does not add ellipsis for short prompt', () => {
    render(
      <AgentPhase
        phase={makeEvent({ content: 'Short prompt' })}
        phaseIndex={0}
        allEvents={[makeEvent({ content: 'Short prompt' })]  }
        expandedPhases={new Set()}
        setExpandedPhases={vi.fn()}
        expandedEvents={new Set()}
        setExpandedEvents={vi.fn()}
        sessionStart={sessionStart}
        badgeColors={badgeColors}
      />
    )
    expect(screen.getByText('Short prompt')).toBeInTheDocument()
    expect(screen.queryByText('Short prompt...')).not.toBeInTheDocument()
  })

  it('handles phase with no end event (unbounded)', () => {
    const eventsNoEnd = [
      makeEvent({ id: 'e1', sequence: 1, event_type: 'agent_start' }),
      makeEvent({ id: 'e2', sequence: 2, event_type: 'tool_use', tool_name: 'Read' }),
    ]
    render(
      <AgentPhase
        phase={eventsNoEnd[0]}
        phaseIndex={0}
        allEvents={eventsNoEnd}
        expandedPhases={new Set()}
        setExpandedPhases={vi.fn()}
        expandedEvents={new Set()}
        setExpandedEvents={vi.fn()}
        sessionStart={sessionStart}
        badgeColors={badgeColors}
      />
    )
    expect(screen.getByText('2 events')).toBeInTheDocument()
  })

  it('handles phase with no content', () => {
    render(
      <AgentPhase
        phase={makeEvent({ content: null })}
        phaseIndex={0}
        allEvents={[makeEvent({ content: null })]  }
        expandedPhases={new Set()}
        setExpandedPhases={vi.fn()}
        expandedEvents={new Set()}
        setExpandedEvents={vi.fn()}
        sessionStart={sessionStart}
        badgeColors={badgeColors}
      />
    )
    expect(screen.getByText('Phase 1')).toBeInTheDocument()
  })

  it('handles phase with no tool usage', () => {
    const eventsNoTools = [
      makeEvent({ id: 'e1', sequence: 1, event_type: 'agent_start', tool_name: null }),
      makeEvent({ id: 'e2', sequence: 2, event_type: 'message', tool_name: null }),
    ]
    render(
      <AgentPhase
        phase={eventsNoTools[0]}
        phaseIndex={0}
        allEvents={eventsNoTools}
        expandedPhases={new Set()}
        setExpandedPhases={vi.fn()}
        expandedEvents={new Set()}
        setExpandedEvents={vi.fn()}
        sessionStart={sessionStart}
        badgeColors={badgeColors}
      />
    )
    // Should not crash, no tool badges displayed
    expect(screen.getByText('Phase 1')).toBeInTheDocument()
  })

  it('toggles event expansion within expanded phase', () => {
    const setExpandedEvents = vi.fn()
    render(
      <AgentPhase
        phase={allEvents[0]}
        phaseIndex={0}
        allEvents={allEvents}
        expandedPhases={new Set([0])}
        setExpandedPhases={vi.fn()}
        expandedEvents={new Set()}
        setExpandedEvents={setExpandedEvents}
        sessionStart={sessionStart}
        badgeColors={badgeColors}
      />
    )

    // Click on an event row to toggle it
    const eventRow = screen.getByText('#1').closest('[class*="cursor-pointer"]')!
    fireEvent.click(eventRow)
    expect(setExpandedEvents).toHaveBeenCalled()

    // Test the updater adds the event id
    const updater = setExpandedEvents.mock.calls[0][0]
    const newSet = updater(new Set<string>())
    expect(newSet.has('e1')).toBe(true)

    // Test toggling off
    const newSet2 = updater(new Set(['e1']))
    expect(newSet2.has('e1')).toBe(false)
  })
})
