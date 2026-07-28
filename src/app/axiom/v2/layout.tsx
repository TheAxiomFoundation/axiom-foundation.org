/**
 * Pass-through layout. Do not delete: without a file anchoring the
 * ``/axiom/v2`` static segment's layout boundary, the dev router can
 * let the sibling optional catch-all (``[[...segments]]``) capture
 * ``/axiom/v2/*`` and render v1 (observed with Turbopack 2026-07-19).
 */
export default function AxiomV2Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
