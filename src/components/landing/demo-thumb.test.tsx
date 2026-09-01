import { render } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { act } from 'react'
import { describe, it, expect, afterEach } from 'vitest'

import { DemoThumb } from './demo-thumb'

const PROPS = {
  src: 'https://axiom-demo-shell.vercel.app/demos/',
  poster: '/demo-posters/gallery.png',
  title: 'Demo gallery — preview',
}

/** Simulated input environment. The fake matchMedia evaluates the
 *  component's actual query strings against it, so a weakened
 *  predicate (e.g. width-only) fails these tests instead of being
 *  hidden by a constant-returning mock. */
interface Env {
  hover: boolean
  finePointer: boolean
  wide: boolean
  anyPointerCoarse: boolean
  maxTouchPoints: number
}

const PHONE: Env = { hover: false, finePointer: false, wide: false, anyPointerCoarse: true, maxTouchPoints: 5 }
const DESKTOP: Env = { hover: true, finePointer: true, wide: true, anyPointerCoarse: false, maxTouchPoints: 0 }
// A wide touchscreen laptop: primary pointer is the trackpad (fine,
// hover, wide all match) but the screen is still touch-capable.
const HYBRID: Env = { hover: true, finePointer: true, wide: true, anyPointerCoarse: true, maxTouchPoints: 10 }

function installEnv(initial: Env) {
  const env = { ...initial }
  const listeners = new Set<() => void>()
  const evaluate = (query: string): boolean => {
    let ok = true
    if (query.includes('(hover: hover)')) ok &&= env.hover
    if (query.includes('(pointer: fine)')) ok &&= env.finePointer
    if (query.includes('(min-width: 1024px)')) ok &&= env.wide
    if (query.includes('(any-pointer: coarse)')) ok &&= env.anyPointerCoarse
    return ok
  }

  const originalMatchMedia = window.matchMedia
  const originalMaxTouchPoints = Object.getOwnPropertyDescriptor(
    Navigator.prototype,
    'maxTouchPoints',
  )
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      get matches() {
        return evaluate(query)
      },
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: (_: string, cb: () => void) => listeners.add(cb),
      removeEventListener: (_: string, cb: () => void) => listeners.delete(cb),
      dispatchEvent: () => false,
    }),
  })
  Object.defineProperty(navigator, 'maxTouchPoints', {
    configurable: true,
    get: () => env.maxTouchPoints,
  })

  return {
    change(next: Env) {
      Object.assign(env, next)
      act(() => listeners.forEach((cb) => cb()))
    },
    listenerCount: () => listeners.size,
    restore() {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        configurable: true,
        value: originalMatchMedia,
      })
      delete (navigator as any).maxTouchPoints
      if (originalMaxTouchPoints) {
        Object.defineProperty(Navigator.prototype, 'maxTouchPoints', originalMaxTouchPoints)
      }
    },
  }
}

describe('DemoThumb', () => {
  const restores: Array<() => void> = []
  afterEach(() => restores.splice(0).forEach((r) => r()))

  const withEnv = (env: Env) => {
    const handle = installEnv(env)
    restores.push(handle.restore)
    return handle
  }

  it('server-renders the poster and never the iframe', () => {
    // No effects run here, so this pins the pre-hydration default —
    // the markup a crashed or scriptless client is left with.
    const html = renderToString(<DemoThumb {...PROPS} />)
    expect(html).toContain(PROPS.poster)
    expect(html).not.toContain('<iframe')
  })

  it('serves only the poster on a phone', () => {
    withEnv(PHONE)
    const { container } = render(<DemoThumb {...PROPS} />)
    expect(container.querySelector('img')).toHaveAttribute('src', PROPS.poster)
    expect(container.querySelector('iframe')).toBeNull()
  })

  it('serves only the poster on a wide touch-capable hybrid', () => {
    // The crash guard's invariant: no live embed on ANY touch-capable
    // device, even one whose primary pointer is fine and hovering.
    withEnv(HYBRID)
    const { container } = render(<DemoThumb {...PROPS} />)
    expect(container.querySelector('iframe')).toBeNull()
    expect(container.querySelector('img')).toHaveAttribute('src', PROPS.poster)
  })

  it('serves only the poster on a narrow desktop window', () => {
    withEnv({ ...DESKTOP, wide: false })
    const { container } = render(<DemoThumb {...PROPS} />)
    expect(container.querySelector('iframe')).toBeNull()
  })

  it('upgrades to the live iframe on a pure desktop, keeping the poster underneath', () => {
    withEnv(DESKTOP)
    const { container } = render(<DemoThumb {...PROPS} />)
    const iframe = container.querySelector('iframe')
    expect(iframe).toHaveAttribute('src', PROPS.src)
    expect(iframe).toHaveAttribute('loading', 'lazy')
    // The poster stays mounted under the iframe so the upgrade never
    // flashes a blank frame while the embed loads.
    expect(container.querySelector('img')).toHaveAttribute('src', PROPS.poster)
  })

  it('drops the iframe when the environment stops qualifying', () => {
    const handle = withEnv(DESKTOP)
    const { container } = render(<DemoThumb {...PROPS} />)
    expect(container.querySelector('iframe')).not.toBeNull()
    handle.change(HYBRID)
    expect(container.querySelector('iframe')).toBeNull()
    expect(container.querySelector('img')).not.toBeNull()
  })

  it('removes its media listeners on unmount', () => {
    const handle = withEnv(DESKTOP)
    const { unmount } = render(<DemoThumb {...PROPS} />)
    expect(handle.listenerCount()).toBeGreaterThan(0)
    unmount()
    expect(handle.listenerCount()).toBe(0)
  })

  it('keeps the thumb decorative', () => {
    withEnv(PHONE)
    const { container } = render(<DemoThumb {...PROPS} />)
    expect(container.querySelector('span.landing-demo-thumb')).toHaveAttribute('aria-hidden', 'true')
    expect(container.querySelector('img')).toHaveAttribute('alt', '')
  })
})
