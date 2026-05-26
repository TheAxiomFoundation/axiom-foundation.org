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
