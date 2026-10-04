#!/usr/bin/env bash
# cover-render.sh — Inkscape cover SVG -> RGB PDF -> press-ready CMYK PDF/X-1a
#                   (+ a raster proof you can actually look at).
#
#   cover-render.sh --title "Your Book Title" covers/hardcover_8x10.svg
#
# Writes, alongside the SVG:
#   <name>.pdf                 RGB, text converted to paths
#   <name>_CMYK-X1a.pdf        upload this
#   <name>_CMYK_PROOF.png      150dpi raster — eyeball it before uploading
#
# Why Inkscape and not rsvg/cairosvg/magick: cover SVGs that use SVG 1.2
# <flowRoot> for flowed body text render EMPTY in every other renderer. If the
# back-cover blurb vanishes from the PDF, that is the cause.
set -euo pipefail

SKILL="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INKSCAPE_DEFAULT=/Applications/Inkscape.app/Contents/MacOS/inkscape
INKSCAPE="${INKSCAPE:-$INKSCAPE_DEFAULT}"
TITLE=""
DPI=150
EXPECT_SIZE=""

usage() {
  cat <<'EOF'
usage: cover-render.sh --title "Book Title" [options] <cover.svg>

  --title  TEXT    Title stamped into the PDF/X DOCINFO (required).
  --expect WxH     Expected cover trim in inches (e.g. 23x14.5). Verified after
                   conversion -- catches a cover built to the wrong template.
  --dpi    N       Proof raster resolution (default 150).
  --inkscape PATH  Inkscape binary (default: the macOS app bundle path).

Cover geometry comes ONLY from the printer's per-title template. Never guess it,
and never scale a cover built for a different page count -- see
reference/cover-geometry.md.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --title) TITLE="$2"; shift 2 ;;
    --expect) EXPECT_SIZE="$2"; shift 2 ;;
    --dpi) DPI="$2"; shift 2 ;;
    --inkscape) INKSCAPE="$2"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    -*) echo "unknown option: $1" >&2; usage >&2; exit 2 ;;
    *) break ;;
  esac
done

[[ $# -eq 1 ]] || { usage >&2; exit 2; }
SVG="$1"
[[ -n "$TITLE" ]] || { echo "error: --title is required" >&2; exit 2; }
[[ -f "$SVG" ]] || { echo "error: SVG not found: $SVG" >&2; exit 1; }
[[ -x "$INKSCAPE" ]] || {
  echo "error: Inkscape not found at $INKSCAPE" >&2
  echo "       install it, or pass --inkscape /path/to/inkscape" >&2
  echo "       (do NOT substitute rsvg/cairosvg/magick -- they drop <flowRoot> text)" >&2
  exit 1
}

DIR="$(cd "$(dirname "$SVG")" && pwd)"
BASE="$(basename "$SVG" .svg)"
RGB="$DIR/$BASE.pdf"
CMYK="$DIR/${BASE}_CMYK-X1a.pdf"
PROOF="$DIR/${BASE}_CMYK_PROOF.png"

echo "[cover-render] Inkscape -> $RGB"
"$INKSCAPE" "$SVG" \
  --export-type=pdf \
  --export-filename="$RGB" \
  --export-text-to-path

# Covers are single-page with the bleed already inside the document box, so the
# TrimBox equals the page box: --bleed 0 is correct here.
"$SKILL/scripts/press-pdf.sh" --title "$TITLE" --bleed 0 --no-verify "$RGB" "$CMYK"

VERIFY_ARGS=("$CMYK" --expect-pages 1)
[[ -n "$EXPECT_SIZE" ]] && VERIFY_ARGS+=(--expect-size "$EXPECT_SIZE")

if python3 -c 'import pikepdf' 2>/dev/null; then
  python3 "$SKILL/scripts/verify-pdfx.py" "${VERIFY_ARGS[@]}" || true
elif command -v uv >/dev/null; then
  uv run --quiet --with pikepdf python "$SKILL/scripts/verify-pdfx.py" "${VERIFY_ARGS[@]}" || true
fi

if command -v pdftoppm >/dev/null; then
  echo "[cover-render] proof -> $PROOF"
  pdftoppm -png -r "$DPI" -singlefile "$CMYK" "${PROOF%.png}"
else
  echo "[cover-render] pdftoppm not found; skipping the raster proof (brew install poppler)"
fi

echo "[cover-render] done. LOOK at $PROOF before uploading $CMYK."
