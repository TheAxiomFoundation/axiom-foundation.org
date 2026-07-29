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
// is a stub with no methods at all). Vitest's jsdom environment copies
// a window key onto the global only when the key is NOT already a Node
// global, so Node's stub shadows jsdom's working Storage and
// `window.localStorage.clear()` throws. The raw jsdom window is still
// reachable through `frames` (copied unremapped) — reinstall its real
// Storage whenever the ambient global is not a jsdom Storage.
try {
  const jsdomWindow = typeof frames === "undefined" ? undefined : frames
  for (const key of ["localStorage", "sessionStorage"] as const) {
    const real = jsdomWindow?.[key]
    if (real instanceof Storage && !(globalThis[key] instanceof Storage)) {
      Object.defineProperty(globalThis, key, {
        configurable: true,
        writable: true,
        value: real,
      })
    }
  }
} catch {
  // jsdom throws on storage access for opaque origins (no test URL);
  // in that case leave the ambient globals alone.
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
