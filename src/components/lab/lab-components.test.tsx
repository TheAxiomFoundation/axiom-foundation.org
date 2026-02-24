import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

import { AgentPhase } from './agent-phase'
import type { SDKSessionEvent } from '@/lib/supabase'

function mockEvent(overrides: Partial<SDKSessionEvent> = {}): SDKSessionEvent {
  return {
    id: 'evt-1',
    session_id: 'sdk-1',
    sequence: 1,
    timestamp: '2025-01-01T10:00:05Z',
    event_type: 'message',
    tool_name: null,
    content: 'Some content',
    metadata: null,
    ...overrides,
  }
}

const defaultBadgeColors = {
  agent_start: { bg: 'rgba(59, 130, 246, 0.15)', fg: '#3b82f6' },
  agent_end: { bg: 'rgba(59, 130, 246, 0.15)', fg: '#3b82f6' },
  message: { bg: 'rgba(255, 255, 255, 0.08)', fg: '#888' },
  tool_use: { bg: 'rgba(167, 139, 250, 0.15)', fg: '#a78bfa' },
  tool_result: { bg: 'rgba(52, 211, 153, 0.15)', fg: '#34d399' },
}

describe('AgentPhase', () => {
  it('renders with null content (exercises || "" fallback)', () => {
    const phase = mockEvent({
      id: 'e1',
      sequence: 1,
      event_type: 'agent_start',
      content: null,
    })
    const allEvents = [
      phase,
      mockEvent({ id: 'e2', sequence: 2, event_type: 'agent_end', content: null }),
    ]

    render(
      <AgentPhase
        phase={phase}
        phaseIndex={0}
        allEvents={allEvents}
        expandedPhases={new Set()}
        setExpandedPhases={vi.fn()}
        expandedEvents={new Set()}
        setExpandedEvents={vi.fn()}
        sessionStart="2025-01-01T10:00:00Z"
        badgeColors={defaultBadgeColors}
      />
    )

    // Phase renders without crashing, showing "Phase 1" and event count
    expect(screen.getByText('Phase 1')).toBeInTheDocument()
    expect(screen.getByText('2 events')).toBeInTheDocument()
  })

  it('toggles event expansion (add then delete from Set) in expanded phase', () => {
    const phase = mockEvent({
      id: 'e1',
      sequence: 1,
      event_type: 'agent_start',
      content: 'Test phase',
    })
    const event2 = mockEvent({
      id: 'e2',
      sequence: 2,
      event_type: 'tool_use',
      tool_name: 'Read',
      content: 'Reading file',
    })
    const allEvents = [
      phase,
      event2,
      mockEvent({ id: 'e3', sequence: 3, event_type: 'agent_end', content: null }),
    ]

    // Track calls to setExpandedEvents to verify both add and delete branches
    const setExpandedEvents = vi.fn()

    render(
      <AgentPhase
        phase={phase}
        phaseIndex={0}
        allEvents={allEvents}
        expandedPhases={new Set([0])} // Phase is expanded
        setExpandedPhases={vi.fn()}
        expandedEvents={new Set()} // No events expanded yet
        setExpandedEvents={setExpandedEvents}
        sessionStart="2025-01-01T10:00:00Z"
        badgeColors={defaultBadgeColors}
      />
    )

    // Event rows should be visible since phase is expanded
    const eventRow = screen.getByText('#2')
    fireEvent.click(eventRow)

    // setExpandedEvents should be called with an updater function
    expect(setExpandedEvents).toHaveBeenCalled()

    // Execute the updater function — first click adds event id
    const addUpdater = setExpandedEvents.mock.calls[0][0]
    const afterAdd = addUpdater(new Set<string>())
    expect(afterAdd.has('e2')).toBe(true) // add branch covered

    // Now simulate clicking again when event is already expanded
    setExpandedEvents.mockClear()

    // Re-render with e2 in expandedEvents
    const { unmount } = render(
      <AgentPhase
        phase={phase}
        phaseIndex={0}
        allEvents={allEvents}
        expandedPhases={new Set([0])}
        setExpandedPhases={vi.fn()}
        expandedEvents={new Set(['e2'])} // e2 is now expanded
        setExpandedEvents={setExpandedEvents}
        sessionStart="2025-01-01T10:00:00Z"
        badgeColors={defaultBadgeColors}
      />
    )

    const eventRows = screen.getAllByText('#2')
    fireEvent.click(eventRows[eventRows.length - 1])

    // Execute the updater function — second click deletes event id
    const deleteUpdater = setExpandedEvents.mock.calls[0][0]
    const afterDelete = deleteUpdater(new Set(['e2']))
    expect(afterDelete.has('e2')).toBe(false) // delete branch covered

    unmount()
  })
})
