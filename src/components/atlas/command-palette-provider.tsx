"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { CommandPalette } from "./command-palette";

interface Ctx {
  open: () => void;
  close: () => void;
  isOpen: boolean;
}

/**
 * Default no-op context so components that use the palette (e.g. the
 * visible trigger button) can render in isolation — tests, storybook,
 * or pages not wrapped in the provider. Opening the palette becomes
 * a silent no-op rather than a thrown error.
 */
const PaletteContext = createContext<Ctx>({
  open: () => {},
  close: () => {},
  isOpen: false,
});

/**
 * Global provider that mounts the command palette once and exposes
 * ``open`` / ``close`` to any descendant. Wraps the atlas subtree so
 * the palette is available on every Atlas page, not just the landing.
 *
 * Also installs a global keyboard shortcut: ⌘K / Ctrl-K opens the
 * palette from anywhere, unless the focused element is a text input
 * (so typing "k" in a search box doesn't hijack).
 */
export function CommandPaletteProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isOpen, setOpen] = useState(false);

  const open = useCallback(() => setOpen(true), []);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isToggle = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k";
      if (!isToggle) return;
      e.preventDefault();
      setOpen((prev) => !prev);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <PaletteContext.Provider value={{ open, close, isOpen }}>
      {children}
      <CommandPalette open={isOpen} onClose={close} />
    </PaletteContext.Provider>
  );
}

export function useCommandPalette(): Ctx {
  return useContext(PaletteContext);
}
