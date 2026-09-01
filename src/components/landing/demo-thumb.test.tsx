import { render } from '@testing-library/react'
import { describe, it, expect, afterEach, vi } from 'vitest'

import { DemoThumb } from './demo-thumb'

const PROPS = {
  src: 'https://axiom-demo-shell.vercel.app/demos/',
  poster: '/demo-posters/gallery.png',
  title: 'Demo gallery — preview',
}

function stubMatchMedia(matches: boolean) {
  const original = window.matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  })
  return () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: original,
    })
  }
}

describe('DemoThumb', () => {
  const restores: Array<() => void> = []
  afterEach(() => {
    restores.splice(0).forEach((r) => r())
    vi.restoreAllMocks()
  })

  it('serves the static poster when the device is not desktop-class', () => {
    // The global test stub answers false for the hover/pointer/width
    // query — the same answer a phone gives. The crash guard: no live
    // iframe may mount here (each one boots a full app document, and
    // the stack crash-loops mobile Safari).
    const { container } = render(<DemoThumb {...PROPS} />)
    const img = container.querySelector('img')
    expect(img).toHaveAttribute('src', PROPS.poster)
    expect(container.querySelector('iframe')).toBeNull()
  })

  it('upgrades to the live iframe on desktop-class devices', () => {
    restores.push(stubMatchMedia(true))
    const { container } = render(<DemoThumb {...PROPS} />)
    const iframe = container.querySelector('iframe')
    expect(iframe).toHaveAttribute('src', PROPS.src)
    expect(iframe).toHaveAttribute('loading', 'lazy')
    expect(container.querySelector('img')).toBeNull()
  })

  it('keeps the thumb decorative in both states', () => {
    const { container } = render(<DemoThumb {...PROPS} />)
    const span = container.querySelector('span.landing-demo-thumb')
    expect(span).toHaveAttribute('aria-hidden', 'true')
    expect(container.querySelector('img')).toHaveAttribute('alt', '')
  })
})
