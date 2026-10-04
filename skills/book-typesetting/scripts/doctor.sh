#!/usr/bin/env bash
# doctor.sh — check whether this machine can build and press-prep a book.
#
#   doctor.sh            check everything
#   doctor.sh --print    skip the ebook-only checks
#
# Reports three tiers:
#   REQUIRED  nothing works without it
#   COVERS    only needed if you are producing a cover
#   OPTIONAL  nice to have; a fallback exists
#
# Exit 1 if anything REQUIRED is missing.
set -uo pipefail

MISSING_REQ=0
INKSCAPE_APP=/Applications/Inkscape.app/Contents/MacOS/inkscape

c_ok()   { printf '  \033[32m ok \033[0m %-14s %s\n' "$1" "${2:-}"; }
c_miss() { printf '  \033[31mMISS\033[0m %-14s %s\n' "$1" "$2"; }
c_warn() { printf '  \033[33mwarn\033[0m %-14s %s\n' "$1" "$2"; }

need() { # need <cmd> <install hint>
  if command -v "$1" >/dev/null 2>&1; then c_ok "$1" "$(command -v "$1")"
  else c_miss "$1" "$2"; MISSING_REQ=$((MISSING_REQ+1)); fi
}
want() { # want <cmd> <install hint>
  command -v "$1" >/dev/null 2>&1 && c_ok "$1" "$(command -v "$1")" || c_warn "$1" "$2"
}

echo "== REQUIRED: render =="
need quarto  "https://quarto.org/docs/download/  (or: brew install --cask quarto)"
need pandoc  "bundled with quarto; else: brew install pandoc"

# LaTeX: Quarto's TinyTeX is usually NOT on PATH, so look for it directly.
TEXBIN=""
for d in "$HOME/Library/TinyTeX/bin"/* "$HOME/.TinyTeX/bin"/*; do
  [ -x "$d/xelatex" ] && TEXBIN="$d" && break
done
if [ -n "$TEXBIN" ]; then
  c_ok "latex" "TinyTeX at $TEXBIN"
elif command -v xelatex >/dev/null 2>&1; then
  c_ok "latex" "$(command -v xelatex)"
else
  c_miss "latex" "quarto install tinytex   (or install MacTeX/TeX Live)"
  MISSING_REQ=$((MISSING_REQ+1))
fi

echo
echo "== REQUIRED: press prep =="
need gs      "brew install ghostscript"
need python3 "preinstalled on macOS; else: brew install python"
if python3 -c 'import pikepdf' 2>/dev/null; then
  c_ok "pikepdf" "importable"
elif command -v uv >/dev/null 2>&1; then
  c_ok "pikepdf" "not installed, but uv will fetch it on demand"
else
  c_miss "pikepdf" "pip3 install pikepdf   (or install uv: brew install uv)"
  MISSING_REQ=$((MISSING_REQ+1))
fi

echo
echo "== COVERS (skip if you are only doing the interior) =="
if [ -x "$INKSCAPE_APP" ]; then c_ok "inkscape" "$INKSCAPE_APP"
elif command -v inkscape >/dev/null 2>&1; then c_ok "inkscape" "$(command -v inkscape)"
else c_warn "inkscape" "brew install --cask inkscape  — REQUIRED for covers; no substitute (see cover-geometry.md)"; fi

echo
echo "== OPTIONAL =="
want pdfinfo  "brew install poppler   — page counts / proof checks"
want pdftoppm "brew install poppler   — renders the cover proof image"
want uv       "brew install uv        — auto-fetches pikepdf"
want magick   "brew install imagemagick — image prep"

# --- LaTeX packages ---------------------------------------------------------
KPSE=""
[ -n "$TEXBIN" ] && [ -x "$TEXBIN/kpsewhich" ] && KPSE="$TEXBIN/kpsewhich"
[ -z "$KPSE" ] && command -v kpsewhich >/dev/null 2>&1 && KPSE="$(command -v kpsewhich)"

echo
echo "== LaTeX packages used by the two-column layout =="
if [ -z "$KPSE" ]; then
  c_warn "kpsewhich" "no LaTeX found; cannot check packages"
else
  missing_pkgs=""
  for p in scrbook.cls scrlayer-scrpage.sty multicol.sty cuted.sty tcolorbox.sty \
           titlesec.sty tabularx.sty booktabs.sty array.sty microtype.sty \
           imakeidx.sty dblfloatfix.sty xurl.sty needspace.sty ragged2e.sty \
           enumitem.sty etoolbox.sty ulem.sty caption.sty fontspec.sty \
           lmodern.sty iftex.sty float.sty lastpage.sty xcolor.sty graphicx.sty; do
    "$KPSE" "$p" >/dev/null 2>&1 || missing_pkgs="$missing_pkgs ${p%.*}"
  done
  if [ -z "$missing_pkgs" ]; then
    c_ok "packages" "all 25 present"
  else
    c_warn "packages" "missing:$missing_pkgs"
    echo "         install with:  tlmgr install$missing_pkgs"
    echo "         (TinyTeX also fetches missing packages automatically on first render)"
  fi
fi

echo
if [ "$MISSING_REQ" -gt 0 ]; then
  echo "$MISSING_REQ required tool(s) missing — install them before starting."
  exit 1
fi
echo "All required tools present."
