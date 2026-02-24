import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

import { transformRuleToViewerDoc } from '@/lib/atlas-utils'
import type { Rule } from '@/lib/supabase'

// Mock next/navigation
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, back: vi.fn() }),
  usePathname: () => '/atlas/rule-1',
}))

// Mock motion/react
vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

import { RulePageClient } from './[ruleId]/rule-page-client'

function makeRule(overrides: Partial<Rule> = {}): Rule {
  return {
    id: 'rule-1',
    jurisdiction: 'us',
    doc_type: 'statute',
    parent_id: null,
    level: 0,
    ordinal: 1,
    heading: 'Section 1 - Tax imposed',
    body: null,
    effective_date: null,
    repeal_date: null,
    source_url: null,
    source_path: 'statute/26/1',
    rac_path: null,
    has_rac: true,
    created_at: '2025-01-01',
    updated_at: '2025-01-01',
    ...overrides,
  }
}

describe('transformRuleToViewerDoc', () => {
  it('creates subsections from children', () => {
    const rule = makeRule()
    const children = [
      makeRule({ id: 'c1', body: 'Child 1 text', heading: null }),
      makeRule({ id: 'c2', body: null, heading: 'Child 2 heading' }),
      makeRule({ id: 'c3', body: null, heading: null }),
    ]
    const doc = transformRuleToViewerDoc(rule, children)
    expect(doc.subsections).toEqual([
      { id: 'a', text: 'Child 1 text' },
      { id: 'b', text: 'Child 2 heading' },
      { id: 'c', text: '' },
    ])
    expect(doc.title).toBe('Section 1 - Tax imposed')
    expect(doc.citation).toBe('statute/26/1')
  })

  it('splits body into paragraphs when no children', () => {
    const rule = makeRule({ body: 'Paragraph one.\n\nParagraph two.' })
    const doc = transformRuleToViewerDoc(rule, [])
    expect(doc.subsections).toEqual([
      { id: 'a', text: 'Paragraph one.' },
      { id: 'b', text: 'Paragraph two.' },
    ])
  })

  it('uses heading fallback when no body and no children', () => {
    const rule = makeRule({ body: null })
    const doc = transformRuleToViewerDoc(rule, [])
    expect(doc.subsections).toEqual([
      { id: 'a', text: 'Section 1 - Tax imposed' },
    ])
  })

  it('uses "No content available." when no heading, body, or children', () => {
    const rule = makeRule({ heading: null, body: null })
    const doc = transformRuleToViewerDoc(rule, [])
    expect(doc.subsections).toEqual([
      { id: 'a', text: 'No content available.' },
    ])
    expect(doc.title).toBe('Untitled')
  })

  it('uses rule.id as citation when source_path is null', () => {
    const rule = makeRule({ source_path: null })
    const doc = transformRuleToViewerDoc(rule, [])
    expect(doc.citation).toBe('rule-1')
  })

  it('passes hasRac, jurisdiction, and archPath', () => {
    const rule = makeRule({ has_rac: true, jurisdiction: 'uk', source_path: 'statute/uk/1' })
    const doc = transformRuleToViewerDoc(rule, [])
    expect(doc.hasRac).toBe(true)
    expect(doc.jurisdiction).toBe('uk')
    expect(doc.archPath).toBe('statute/uk/1')
  })
})
