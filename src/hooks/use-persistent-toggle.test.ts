import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import { usePersistentToggle } from "./use-persistent-toggle";

function installLocalStorage() {
  const store = new Map<string, string>();
  const storage: Storage = {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key) => store.get(key) ?? null,
    key: (index) => Array.from(store.keys())[index] ?? null,
    removeItem: (key) => {
      store.delete(key);
    },
    setItem: (key, value) => {
      store.set(key, value);
    },
  };

  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: storage,
  });
}

describe("usePersistentToggle", () => {
  beforeEach(() => {
    installLocalStorage();
  });

  it("defaults to false", () => {
    const { result } = renderHook(() => usePersistentToggle("k"));
    expect(result.current[0]).toBe(false);
  });

  it("reads the stored value after mount", () => {
    window.localStorage.setItem("k", "1");
    const { result } = renderHook(() => usePersistentToggle("k"));
    expect(result.current[0]).toBe(true);
  });

  it("toggles and writes through to storage", () => {
    const { result } = renderHook(() => usePersistentToggle("k"));
    act(() => result.current[1]());
    expect(result.current[0]).toBe(true);
    expect(window.localStorage.getItem("k")).toBe("1");
    act(() => result.current[1]());
    expect(result.current[0]).toBe(false);
    expect(window.localStorage.getItem("k")).toBe("0");
  });

  it("accepts an explicit value", () => {
    const { result } = renderHook(() => usePersistentToggle("k"));
    act(() => result.current[1](true));
    expect(result.current[0]).toBe(true);
    act(() => result.current[1](true));
    expect(result.current[0]).toBe(true);
    expect(window.localStorage.getItem("k")).toBe("1");
  });

  it("survives a remount via storage", () => {
    const { result, unmount } = renderHook(() => usePersistentToggle("k"));
    act(() => result.current[1](true));
    unmount();
    const { result: second } = renderHook(() => usePersistentToggle("k"));
    expect(second.current[0]).toBe(true);
  });
});
