import { CommandPaletteProvider } from "@/components/axiom/command-palette-provider";

/**
 * The v2 reader subtree shares one command palette (⌘K + the trigger
 * in the section header). Results use bare citation paths — the
 * proxy routes section depth to this reader, browse depth to v1.
 */
export default function AxiomV2Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CommandPaletteProvider>
      {children}
    </CommandPaletteProvider>
  );
}
