#!/usr/bin/env bash
#
# Regenerate the portable Axiom wordmark assets from the source wordmark SVG.
#
# The source (public/logos/axiom-foundation.svg) is a *text* SVG: it draws the
# wordmark in Geist with a flipped "A" (∀) and uses textLength to stretch XIOM
# and span FOUNDATION the full width. That renders correctly on the web (where
# the Geist webfont loads) but falls back to the wrong font — and drops the
# textLength stretch — in tools that lack the webfont (PDF/doc generators, many
# SVG rasterizers). So it is not reusable as-is for offer letters, decks, etc.
#
# This bakes the exact layout into geometry, producing drop-anywhere assets:
#   - public/logos/axiom-wordmark.svg   text outlined to paths (font-independent)
#   - public/logos/axiom-wordmark.png   2360px-wide, transparent
#
# Requires: usvg + resvg   ->   cargo install usvg resvg
# Geist comes from the `geist` npm dependency, so run `bun install` first.
#
set -euo pipefail
cd "$(dirname "$0")/.."
export PATH="$HOME/.cargo/bin:$PATH"

SRC="public/logos/axiom-foundation.svg"
FONTS="node_modules/geist/dist/fonts/geist-sans"
OUT_SVG="public/logos/axiom-wordmark.svg"
OUT_PNG="public/logos/axiom-wordmark.png"

command -v usvg  >/dev/null || { echo "usvg not found — run: cargo install usvg resvg"  >&2; exit 1; }
command -v resvg >/dev/null || { echo "resvg not found — run: cargo install usvg resvg" >&2; exit 1; }
[ -d "$FONTS" ] || { echo "$FONTS missing — run: bun install" >&2; exit 1; }

# 1. Outline text -> paths. usvg resolves "Geist" (including weights 300/400)
#    from the npm font dir and bakes the textLength layout into the geometry.
usvg --use-fonts-dir "$FONTS" --font-family "Geist" "$SRC" "$OUT_SVG"

# 2. Render a high-res transparent PNG from the now font-independent SVG.
resvg --width 2360 "$OUT_SVG" "$OUT_PNG"

echo "Wrote $OUT_SVG and $OUT_PNG"
