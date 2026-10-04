#!/usr/bin/env bash
# init-book.sh — scaffold a working book project from nothing.
#
# Creates the directory layout, a complete master .qmd with the LaTeX preamble,
# the Lua filter chain, the QR macros, a starter chapter and a galley-proof
# wrapper — everything needed to run `quarto render` immediately.
#
#   init-book.sh --title "My Book" --author "A. Writer" ./my-book
#
# Never overwrites an existing file: it reports what it skipped so you can run it
# again safely against a partially built project.
set -euo pipefail

SKILL="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TPL="$SKILL/assets/templates"

TITLE=""
SUBTITLE=""
AUTHOR=""
PUBLISHER=""
YEAR=""
TRIM="8x10"
COLUMNS=2
ACCENT="1F3A93"
CJK=0
CJK_FONT="Songti SC"
TARGET=""
CREATED=0
SKIPPED=0

usage() {
  cat <<'EOF'
usage: init-book.sh --title "Book Title" [options] <target-directory>

  --title     TEXT   Book title (required).
  --author    TEXT   Author name (required).
  --subtitle  TEXT   Subtitle. Default: none.
  --publisher TEXT   Imprint shown on the title page. Default: the author name.
  --year      YYYY   Copyright year. Default: current year.
  --trim      WxH    Trim size in inches. Default 8x10. Common: 6x9, 5.5x8.5, 8x10.
  --columns   1|2    Body columns. Default 2 (technical/illustrated books).
                     Choose 1 for narrative non-fiction and most fiction.
  --accent    HEX    Chapter-heading colour, no leading #. Default 1F3A93 (navy).
  --cjk              Add a Chinese/Japanese/Korean fallback font. WITHOUT this,
                     CJK characters are silently DROPPED from the PDF -- the
                     default Latin Modern face has no glyphs for them and LaTeX
                     does not warn. Requires the LuaTeX engine.
  --cjk-font  NAME   Fallback face for --cjk. Default "Songti SC" (macOS).

Creates:
  <target>/chapters/            your prose, one file per chapter
  <target>/images/  images/qr/  figures and QR codes
  <target>/typesetting/         the build directory -- run quarto from here

Safe to re-run: existing files are never overwritten, only reported.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --title) TITLE="$2"; shift 2 ;;
    --subtitle) SUBTITLE="$2"; shift 2 ;;
    --author) AUTHOR="$2"; shift 2 ;;
    --publisher) PUBLISHER="$2"; shift 2 ;;
    --year) YEAR="$2"; shift 2 ;;
    --trim) TRIM="$2"; shift 2 ;;
    --columns) COLUMNS="$2"; shift 2 ;;
    --accent) ACCENT="${2#\#}"; shift 2 ;;
    --cjk) CJK=1; shift ;;
    --cjk-font) CJK_FONT="$2"; CJK=1; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    -*) echo "unknown option: $1" >&2; usage >&2; exit 2 ;;
    *) TARGET="$1"; shift ;;
  esac
done

[[ -n "$TARGET" ]] || { usage >&2; exit 2; }
[[ -n "$TITLE"  ]] || { echo "error: --title is required" >&2; exit 2; }
[[ -n "$AUTHOR" ]] || { echo "error: --author is required" >&2; exit 2; }
[[ "$COLUMNS" == "1" || "$COLUMNS" == "2" ]] || { echo "error: --columns must be 1 or 2" >&2; exit 2; }
[[ "$ACCENT" =~ ^[0-9A-Fa-f]{6}$ ]] || { echo "error: --accent must be 6 hex digits, e.g. 1F3A93" >&2; exit 2; }

W="${TRIM%%x*}"; H="${TRIM##*x}"
if ! [[ "$W" =~ ^[0-9]+(\.[0-9]+)?$ && "$H" =~ ^[0-9]+(\.[0-9]+)?$ ]]; then
  echo "error: --trim must look like 8x10 or 5.5x8.5, got '$TRIM'" >&2; exit 2
fi

# Latin Modern has no CJK glyphs, and LaTeX drops characters it cannot cover
# SILENTLY -- a transliterated term followed by its Chinese form prints with the
# parentheses empty, and nothing warns you. luaotfload's fallback mechanism fills
# the gap. It is LuaTeX-only, hence the \ifLuaTeX guard, so the document still
# builds under xelatex/pdflatex.
# Heredocs rather than quoted strings: this block is full of backslashes, braces
# and double quotes, which are painful to escape correctly inline.
if [[ "$CJK" == 1 ]]; then
  CJK_TAG="$(printf '%s' "$CJK_FONT" | tr -d ' ')"
  FONT_FALLBACK="$(cat <<EOF
        %% ---- CJK fallback: characters Latin Modern lacks fall through to
        %%      ${CJK_FONT}. Without this they vanish with no warning. ----
        \\ifLuaTeX
          \\directlua{luaotfload.add_fallback("bookfallback",
            { "${CJK_TAG}:mode=base;script=hani;" })}
          \\setmainfont{Latin Modern Roman}[Ligatures=TeX, RawFeature={fallback=bookfallback}]
        \\fi
EOF
)"
else
  FONT_FALLBACK="$(cat <<'EOF'
        %% No CJK fallback configured. If the manuscript contains Chinese,
        %% Japanese or Korean text it will be SILENTLY DROPPED from the PDF.
        %% Re-run init-book.sh with --cjk, or add the fallback by hand.
EOF
)"
fi

[[ -n "$PUBLISHER" ]] || PUBLISHER="$AUTHOR"
[[ -n "$YEAR" ]] || YEAR="$(date +%Y)"

# The title-page subtitle line ends with \\, which is a LaTeX error if the
# subtitle is empty ("There's no line here to end"). Emit the line only when
# there is actually a subtitle.
if [[ -n "$SUBTITLE" ]]; then
  SUBTITLE_TEX="  {\\sffamily\\large\\itshape ${SUBTITLE}}\\\\[3.0em]
"
else
  SUBTITLE_TEX="  \\vspace{2.0em}
"
fi

# --- filter chain differs by column count ------------------------------------
# Two columns: multicol forbids floats, so figures/tables need the -mc filters
# and multicolize must run last. One column: floats and longtable work natively,
# so none of that machinery is needed.
if [[ "$COLUMNS" == "2" ]]; then
  # NOTE: tblheading.lua is deliberately absent here. In two columns, table-mc
  # breaks the table out to full width while the heading Div stays in-column,
  # so the two separate on the page. Single-column projects get it.
  FILTERS='  - var-filter.lua
  - _filters/chapternum.lua     # strip the literal "N." from chapter titles
  - _filters/figurize-mc.lua    # figures inline; galleries -> full-width bands
  - _filters/table-mc.lua       # tables -> full-width bands
  - _filters/chapterend.lua     # MUST run before themebreak
  - _filters/themebreak.lua
  - _filters/multicolize.lua    # LAST: wraps bodies in multicols'
  MULTICOL_PACKAGES='        %% ---- two-column body via multicol (NOT the class `twocolumn` option),
        %%      so footnotes pool into ONE full-width block at the page foot. ----
        \usepackage{multicol}
        \usepackage{cuted}'
else
  FILTERS='  - var-filter.lua
  - tblheading.lua
  - _filters/chapternum.lua     # strip the literal "N." from chapter titles
  - _filters/chapterend.lua     # MUST run before themebreak
  - _filters/themebreak.lua'
  MULTICOL_PACKAGES='        %% single-column body: floats and longtable work natively,
        %% so multicol/cuted are not needed.'
fi

mk() { # mk <path>  -- mkdir -p with reporting
  if [[ -d "$1" ]]; then printf '  exists  %s/\n' "${1#$TARGET/}"
  else mkdir -p "$1"; printf '  created %s/\n' "${1#$TARGET/}"; CREATED=$((CREATED+1)); fi
}

put() { # put <src> <dest>  -- copy, never overwrite
  if [[ -e "$2" ]]; then printf '  skipped %s (exists)\n' "${2#$TARGET/}"; SKIPPED=$((SKIPPED+1))
  else cp "$1" "$2"; printf '  created %s\n' "${2#$TARGET/}"; CREATED=$((CREATED+1)); fi
}

render() { # render <template> <dest>  -- substitute placeholders, never overwrite
  if [[ -e "$2" ]]; then printf '  skipped %s (exists)\n' "${2#$TARGET/}"; SKIPPED=$((SKIPPED+1)); return; fi
  TITLE="$TITLE" SUBTITLE="$SUBTITLE" AUTHOR="$AUTHOR" PUBLISHER="$PUBLISHER" \
  YEAR="$YEAR" W="$W" H="$H" ACCENT="$ACCENT" FILTERS="$FILTERS" \
  SUBTITLE_TEX="$SUBTITLE_TEX" FONT_FALLBACK="$FONT_FALLBACK" \
  MULTICOL_PACKAGES="$MULTICOL_PACKAGES" SRC="$1" DEST="$2" \
  python3 -c '
import os
src, dest = os.environ["SRC"], os.environ["DEST"]
t = open(src, encoding="utf-8").read()
for k in ("TITLE","SUBTITLE","SUBTITLE_TEX","AUTHOR","PUBLISHER","YEAR","W","H",
          "ACCENT","FILTERS","MULTICOL_PACKAGES","FONT_FALLBACK"):
    t = t.replace("@@%s@@" % k, os.environ[k])
open(dest, "w", encoding="utf-8").write(t)
'
  printf '  created %s\n' "${2#$TARGET/}"; CREATED=$((CREATED+1))
}

echo "Scaffolding \"$TITLE\" — ${W}x${H}in, ${COLUMNS}-column"
echo

mk "$TARGET"
mk "$TARGET/chapters"
mk "$TARGET/images"
mk "$TARGET/images/qr"
mk "$TARGET/typesetting"
mk "$TARGET/typesetting/_filters"

# Lua filters: the -mc pair and multicolize only matter for two columns, but
# copying all of them keeps the project switchable later.
for f in "$SKILL"/assets/filters/*.lua; do
  base="$(basename "$f")"
  case "$base" in
    var-filter.lua|tblheading.lua) put "$f" "$TARGET/typesetting/$base" ;;
    *)                             put "$f" "$TARGET/typesetting/_filters/$base" ;;
  esac
done

put "$SKILL/assets/qr.tex" "$TARGET/typesetting/qr.tex"
render "$TPL/quarto.yml.tmpl"      "$TARGET/typesetting/_quarto.yml"
render "$TPL/book-print.qmd.tmpl"  "$TARGET/typesetting/book-print.qmd"
render "$TPL/chapter-proof.qmd.tmpl" "$TARGET/typesetting/chapter-proof.qmd"
put "$TPL/example-chapter.md" "$TARGET/chapters/Chapter-1-Example.print.md"

# A neutral grey placeholder so the starter chapter's figure resolves and the
# very first render succeeds. 4:3 and mid-grey so it reads as obviously
# provisional on the page. Replace it with a real figure.
PLACEHOLDER="$TARGET/images/fig01-01-example.png"
if [[ -e "$PLACEHOLDER" ]]; then
  printf '  skipped %s (exists)\n' "${PLACEHOLDER#$TARGET/}"; SKIPPED=$((SKIPPED+1))
else
  python3 -c '
import struct, sys, zlib

W, H = 800, 600
FILL, BORDER, EDGE = 0xDD, 0x99, 6

rows = bytearray()
for y in range(H):
    rows.append(0)                                    # filter type: none
    if y < EDGE or y >= H - EDGE:
        rows.extend(bytes([BORDER]) * W)
    else:
        rows.extend(bytes([BORDER]) * EDGE)
        rows.extend(bytes([FILL]) * (W - 2 * EDGE))
        rows.extend(bytes([BORDER]) * EDGE)

def chunk(tag, data):
    return (struct.pack(">I", len(data)) + tag + data
            + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF))

png = (b"\x89PNG\r\n\x1a\n"
       + chunk(b"IHDR", struct.pack(">IIBBBBB", W, H, 8, 0, 0, 0, 0))
       + chunk(b"IDAT", zlib.compress(bytes(rows), 9))
       + chunk(b"IEND", b""))
sys.stdout.buffer.write(png)
' > "$PLACEHOLDER"
  printf '  created %s\n' "${PLACEHOLDER#$TARGET/}"; CREATED=$((CREATED+1))
fi

echo
echo "$CREATED created, $SKIPPED skipped."
cat <<EOF

Next:
  cd $TARGET/typesetting
  quarto render book-print.qmd --to pdf        # -> _output/book-print.pdf

Then:
  1. Replace chapters/Chapter-1-Example.print.md with your own prose.
     Read reference/input-contract.md for the conventions the filters expect.
  2. Add one {{< include >}} line per chapter in book-print.qmd.
  3. When the interior is FINAL, note its page count -- it sets the spine width.
  4. $SKILL/scripts/press-pdf.sh --title "$TITLE" \\
         _output/book-print.pdf _output/interior-CMYK-X1a.pdf
EOF
