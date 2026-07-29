import '@testing-library/jest-dom'

// Mock IntersectionObserver which is not available in jsdom
class MockIntersectionObserver implements IntersectionObserver {
  readonly root: Element | Document | null = null
  readonly rootMargin: string = ''
  readonly scrollMargin: string = ''
  readonly thresholds: ReadonlyArray<number> = []
  private callback: IntersectionObserverCallback

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback
  }

  observe(): void {
    // Immediately trigger with isIntersecting: true so animated components render
    this.callback(
      [{ isIntersecting: true, intersectionRatio: 1 } as IntersectionObserverEntry],
      this,
    )
  }

  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): IntersectionObserverEntry[] {
    return []
  }
}

global.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver

// Node 25 defines `localStorage`/`sessionStorage` globals itself (Web
// Storage backed by --localstorage-file; without that flag localStorage
// is a method-less stub on most versions, a throwing accessor on some,
// e.g. 25.2). Vitest's jsdom environment copies a window key onto the
// global only when the key is NOT already a Node global, so Node's
// broken storage shadows jsdom's working Storage and
// `window.localStorage.clear()` throws. The raw jsdom window is still
// reachable through `frames` (copied unremapped) — reinstall its real
// Storage whenever the ambient global is not a jsdom Storage.
{
  const jsdomWindow = typeof frames === "undefined" ? undefined : frames
  for (const key of ["localStorage", "sessionStorage"] as const) {
    try {
      const real = jsdomWindow?.[key]
      if (!(real instanceof Storage)) continue
      let ambient: unknown
      try {
        ambient = globalThis[key]
      } catch {
        // A throwing ambient accessor is exactly the broken case —
        // treat it as "not a jsdom Storage" and repair it.
        ambient = undefined
      }
      if (!(ambient instanceof Storage)) {
        Object.defineProperty(globalThis, key, {
          configurable: true,
          writable: true,
          value: real,
        })
      }
    } catch {
      // jsdom throws on storage access for opaque origins (no test
      // URL); leave that key's ambient global alone.
    }
  }
}

// jsdom does not implement window.matchMedia. Components that gate
// animations on prefers-reduced-motion need a stub that returns the
// reduced-motion branch so the test snapshot is the final state, not
// the mid-animation frame.
if (typeof window !== "undefined" && typeof window.matchMedia === "undefined") {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: query.includes("prefers-reduced-motion"),
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  })
}
// re-trigger CI run on axiom-landing branch
