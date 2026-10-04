#!/usr/bin/env bash
# press-pdf.sh — RGB PDF -> press-ready CMYK PDF/X-1a:2001.
#
# One command for both book interiors and covers:
#   press-pdf.sh --title "Book Title" in_rgb.pdf out_CMYK-X1a.pdf
#
# Steps: (1) Ghostscript distill with the SWOP prologue — converts to DeviceCMYK,
# embeds the ICC, writes the OutputIntent, stamps PDF/X-1a:2001; (2) pdfx-normalize
# — sets TrimBox on every page and strips /Link annotations; (3) verify-pdfx — prove
# the result actually conforms before you upload it.
#
# Requires: ghostscript (>= 9.5x), python3. pikepdf is fetched on demand via uv if
# it is not importable.
set -euo pipefail

SKILL="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TITLE=""
ICC=""
BLEED_IN=0
NORMALIZE=1
VERIFY=1
DOWNSAMPLE=0

usage() {
  cat <<'EOF'
usage: press-pdf.sh --title "Doc Title" [options] <input_rgb.pdf> <output.pdf>

  --title  TEXT   Document title stamped into the PDF/X DOCINFO (required).
  --icc    PATH   CMYK ICC profile. If omitted, one is discovered automatically
                  (see "Colour profile" below).
  --bleed  IN     Bleed in inches. TrimBox is inset from MediaBox by this much on
                  all four sides. Default 0 (interiors and no-bleed covers).
  --no-normalize  Skip the TrimBox/annotation pass (rarely correct — see below).
  --no-verify     Skip the conformance report.
  --downsample    Add -dPDFSETTINGS=/prepress (images down to 300dpi). OFF by
                  default: it shrinks the file but can visibly soften cover art.
                  Use only if the uploader rejects the file for size.

Colour profile
  Resolution order: --icc, then assets/swop.icc, then a system Adobe
  USWebCoatedSWOP.icc, then Ghostscript's default_cmyk.icc (with a warning --
  it is not SWOP). If none is found the run stops with instructions.

Notes
  * Interiors: bleed is normally 0, so TrimBox == MediaBox. Ghostscript alone does
    NOT reliably set a TrimBox and X-1a requires one on every page, so keep the
    normalize pass on.
  * Covers exported from Inkscape have no annotations, but the normalize pass is
    idempotent and harmless — leave it on and read the verify report.
  * IngramSpark silently rejects files with /Link annotations in the printable
    area. That is what the normalize pass strips.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --title) TITLE="$2"; shift 2 ;;
    --icc) ICC="$2"; shift 2 ;;
    --bleed) BLEED_IN="$2"; shift 2 ;;
    --no-normalize) NORMALIZE=0; shift ;;
    --no-verify) VERIFY=0; shift ;;
    --downsample) DOWNSAMPLE=1; shift ;;
    -h|--help) usage; exit 0 ;;
    -*) echo "unknown option: $1" >&2; usage >&2; exit 2 ;;
    *) break ;;
  esac
done

[[ $# -eq 2 ]] || { usage >&2; exit 2; }
IN="$1"; OUT="$2"

[[ -n "$TITLE" ]] || { echo "error: --title is required" >&2; exit 2; }
[[ -f "$IN" ]] || { echo "error: input not found: $IN" >&2; exit 1; }
# --- resolve the CMYK profile -------------------------------------------------
# The Adobe SWOP v2 profile is not redistributed with this tool, so look for one
# in order of preference and explain clearly if nothing turns up.
if [[ -z "$ICC" ]]; then
  CANDIDATES=(
    "$SKILL/assets/swop.icc"
    "/Library/Application Support/Adobe/Color/Profiles/Recommended/USWebCoatedSWOP.icc"
    "/Library/Application Support/Adobe/Color/Profiles/USWebCoatedSWOP.icc"
    "$HOME/Library/Application Support/Adobe/Color/Profiles/Recommended/USWebCoatedSWOP.icc"
    "/usr/share/color/icc/USWebCoatedSWOP.icc"
    "/usr/share/color/icc/colord/USWebCoatedSWOP.icc"
  )
  for c in "${CANDIDATES[@]}"; do
    [[ -f "$c" ]] && { ICC="$c"; break; }
  done
  # Last resort: Ghostscript's own CMYK profile. Freely redistributable, but it
  # is NOT SWOP -- the OutputIntent will name a press condition the file was not
  # actually built for, so say so loudly.
  if [[ -z "$ICC" ]]; then
    GS_ICC="$(dirname "$(command -v gs)")/../share/ghostscript"
    FOUND="$(find "$GS_ICC" -name default_cmyk.icc 2>/dev/null | head -1)"
    if [[ -n "$FOUND" ]]; then
      ICC="$FOUND"
      echo "WARNING: no SWOP profile found; falling back to Ghostscript's" >&2
      echo "         default_cmyk.icc. Colour will be approximate and the" >&2
      echo "         OutputIntent will not match your printer's condition." >&2
      echo "         Supply the real one with --icc for production files." >&2
    fi
  fi
fi

if [[ -z "$ICC" || ! -f "$ICC" ]]; then
  cat >&2 <<'NOICC'
error: no CMYK ICC profile found.

  US print-on-demand services expect "U.S. Web Coated (SWOP) v2". It is not
  bundled with this tool (it is Adobe's, and not ours to redistribute).

  Get one, then either pass it with --icc or drop it at assets/swop.icc:
    * Any machine with Adobe software already has it at
      /Library/Application Support/Adobe/Color/Profiles/Recommended/USWebCoatedSWOP.icc
    * Otherwise download Adobe's free ICC profile pack:
      https://helpx.adobe.com/creative-suite/kb/icc-profile-adobe-applications.html
    * Printing outside the US? Use your printer's profile instead
      (e.g. CoatedFOGRA39.icc in Europe) and edit the OutputCondition strings
      in assets/pdfx-swop.ps.tmpl to match.
NOICC
  exit 1
fi
command -v gs >/dev/null || { echo "error: ghostscript (gs) not on PATH" >&2; exit 1; }

PS="$(mktemp -t pdfx-swop.XXXXXX.ps)"
trap 'rm -f "$PS"' EXIT
ICC_ABS="$(cd "$(dirname "$ICC")" && pwd)/$(basename "$ICC")"

# Fill the prologue template. Done in python, not sed: inside a PostScript string
# literal `(`, `)` and `\` must be backslash-escaped, and sed would additionally
# treat `&` in the replacement as "the whole match" -- an ampersand in a book
# title ("Design & Build") would silently corrupt the file.
TITLE="$TITLE" ICC_ABS="$ICC_ABS" TMPL="$SKILL/assets/pdfx-swop.ps.tmpl" \
python3 - > "$PS" <<'PY'
import os, sys

def ps_escape(s):
    """Render a Python str as the body of a PostScript string literal.

    ASCII stays readable. Anything else is emitted as UTF-16BE with a byte-order
    mark, octal-escaped -- that is the only encoding a PDF text string can carry
    reliably. Passing raw UTF-8 bytes through instead makes an em-dash in a book
    title surface as mojibake in the reader's title bar.
    """
    try:
        s.encode("ascii")
    except UnicodeEncodeError:
        data = b"\xfe\xff" + s.encode("utf-16-be")
        return "".join("\\%03o" % b for b in data)
    for a, b in (("\\", "\\\\"), ("(", "\\("), (")", "\\)")):
        s = s.replace(a, b)
    return s

with open(os.environ["TMPL"], encoding="utf-8") as fh:
    tmpl = fh.read()
out = (tmpl.replace("@@TITLE@@", ps_escape(os.environ["TITLE"]))
           .replace("@@ICC@@", ps_escape(os.environ["ICC_ABS"])))
sys.stdout.write(out)
PY

mkdir -p "$(dirname "$OUT")"

py() {
  if python3 -c 'import pikepdf' 2>/dev/null; then python3 "$@";
  elif command -v uv >/dev/null; then uv run --quiet --with pikepdf python "$@";
  else
    echo "error: pikepdf is not importable and uv is not installed." >&2
    echo "       pip3 install pikepdf   (or install uv)" >&2
    exit 1
  fi
}

# --- pre-strip -----------------------------------------------------------
# Ghostscript BAILS OUT of PDF/X mode if the input still carries annotations:
#   "Annotation (not TrapNet or PrinterMark) on page, not permitted in PDF/X,
#    reverting to normal PDF output"
# The pdfmarks in the prologue still land, so the result LOOKS like X-1a to a
# casual check while never having been validated as such. Quarto's hyperref
# links mean every book interior hits this. So strip annotations from a scratch
# copy of the input FIRST, and let gs run in true PDF/X mode.
SRC="$IN"
if [[ "$NORMALIZE" == 1 ]]; then
  PRESTRIP="$(mktemp -t pdfx-prestrip.XXXXXX).pdf"
  trap 'rm -f "$PS" "$PRESTRIP"' EXIT
  cp "$IN" "$PRESTRIP"
  echo "[press-pdf] pre-stripping annotations so gs stays in PDF/X mode ..."
  py "$SKILL/scripts/pdfx-normalize.py" --bleed "$BLEED_IN" "$PRESTRIP"
  SRC="$PRESTRIP"
fi

echo "[press-pdf] distilling to CMYK PDF/X-1a:2001 ..."
# -dNOSAFER: the prologue must open the ICC file by absolute path.
# -dCompatibilityLevel=1.3: PDF/X-1a:2001 is defined against PDF 1.3.
# NO -dPDFSETTINGS by default: /prepress downsamples images to 300dpi, which
# silently degrades a cover that was authored at higher effective resolution.
# Pass --downsample only if the uploader is rejecting the file for size.
GS_EXTRA=()
[[ "$DOWNSAMPLE" == 1 ]] && GS_EXTRA+=(-dPDFSETTINGS=/prepress)
gs -dPDFX -dBATCH -dNOPAUSE -dNOSAFER -dQUIET \
   -sColorConversionStrategy=CMYK \
   -sProcessColorModel=DeviceCMYK \
   -dCompatibilityLevel=1.3 \
   -dEmbedAllFonts=true -dSubsetFonts=true \
   -dAutoRotatePages=/None \
   ${GS_EXTRA[@]+"${GS_EXTRA[@]}"} \
   -sDEVICE=pdfwrite \
   -sOutputFile="$OUT" \
   "$PS" "$SRC"

# Post-pass: gs does not reliably carry a TrimBox through, and X-1a requires one
# on every page. (Also catches any annotation gs may have re-synthesized.)
if [[ "$NORMALIZE" == 1 ]]; then
  py "$SKILL/scripts/pdfx-normalize.py" --bleed "$BLEED_IN" "$OUT"
fi
if [[ "$VERIFY" == 1 ]]; then
  py "$SKILL/scripts/verify-pdfx.py" "$OUT"
fi

echo "[press-pdf] wrote $OUT"
