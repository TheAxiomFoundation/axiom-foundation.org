import { CommandPaletteProvider } from "@/components/axiom/command-palette-provider";

/**
 * The v2 reader subtree shares one command palette (⌘K + the trigger
 * in the section header). Section-depth results navigate within v2;
 * shallower browse paths still land on the v1 tree browser.
 */
export default function AxiomV2Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CommandPaletteProvider hrefPrefix="/axiom/v2">
      {children}
    </CommandPaletteProvider>
  );
}
