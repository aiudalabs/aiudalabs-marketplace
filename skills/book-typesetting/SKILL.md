---
name: "book-typesetting"
description: "Use when typesetting a book for print or ebook with Quarto/LaTeX — building a print interior, converting a PDF to press-ready CMYK PDF/X-1a for IngramSpark, KDP or another print-on-demand service, laying out a wraparound cover, turning chapter markdown into a galley proof, or when a print uploader rejects a file over trim size, safety area, TrimBox, annotations, or unembedded fonts."
license: "MIT"
metadata:
  version: "0.1.1"
  author: "Yoel Frischoff"
  source: "https://github.com/yoelf22/book-typesetting-skill"
  requires-tools: "quarto pandoc xelatex gs python3"
---

# Book Typesetting (markdown → print & ebook)

## Start here

**Starting from scratch?** Give them the whole prerequisites list at once —
`reference/getting-started.md` covers software, printer accounts, ISBNs, the
decisions to make before laying out a page, and the order of operations. Don't
drip-feed these; each one discovered mid-flow reads as a failure. Check the
machine with:

```bash
<book-typesetting skill folder>/scripts/doctor.sh
```

`<book-typesetting skill folder>` stands for the folder this file was loaded from. Replace it with that path before running a command.

**Never produced a print book?** Read `reference/print-basics.md` and orient them
before running anything. It explains trim, bleed, safe areas, spine width, CMYK
and PDF/X in plain language. Most mistakes here come from not knowing what the
printer is asking for, not from getting a command wrong.

Then work out where they actually are:

| They say… | They need | Go to |
|---|---|---|
| "I have chapters in markdown, I want a book" | Interior layout | `reference/quarto-layout.md` |
| "I want to proofread one chapter on paper" | A galley proof | `reference/galley-recipe.md` |
| "I have a PDF, the printer won't take it" | Press conversion | `reference/press-pdfx.md` |
| "I need to make the cover" | Cover geometry | `reference/cover-geometry.md` |
| "It got rejected and I don't know why" | Diagnosis | the rejection table below |
| "What even is a bleed?" | Grounding | `reference/print-basics.md` |
| "What do I need to start?" | Prerequisites | `reference/getting-started.md` |
| "What shape must my markdown be in?" | Input contract | `reference/input-contract.md` |
| "I have nothing yet" | Scaffold a project | `scripts/init-book.sh` — see below |
| "My book is a Word file" | Import it | `scripts/import-docx.py` — see below |

**Do not skip to the scripts.** Someone who runs `press-pdf.sh` without knowing
that spine width depends on page count will produce a conformant, correct-looking
cover that is nevertheless the wrong size.

## The route from manuscript to printed book

Walk people through this in order. Each step depends on the one before it.

**1. Decide the trim size before laying anything out.** 6×9 is the trade-paperback
default; 8×10 suits illustrated or technical books. Everything downstream — margins,
figure sizes, page count, spine — follows from this. Changing it later means
redoing the layout.

**2. Build and finish the interior.** If the manuscript is a Word file, scaffold
then import:

```bash
S=<book-typesetting skill folder>
$S/scripts/init-book.sh --title "Their Book" --author "Their Name" ./their-book
$S/scripts/import-docx.py manuscript.docx --target ./their-book --dry-run
```

Read the report, drop `--dry-run`, then delete the starter chapter and wire the
real ones into `book-print.qmd`. Otherwise scaffold and start writing —
it renders immediately, so they see a real book PDF before writing any prose:

```bash
<book-typesetting skill folder>/scripts/init-book.sh \
    --title "Their Book" --author "Their Name" --trim 6x9 --columns 1 ./their-book
cd their-book/typesetting && quarto render book-print.qmd --to pdf
```

Then replace the starter chapter with real prose. `input-contract.md` says what
shape the source must be in; `quarto-layout.md` covers the layout itself. Proof
it, fix it, and **finalize it** — because step 3 depends on the final page count.

**3. Note the final page count from the actual PDF.** Not from memory, not from an
earlier draft. Open the file and read it. This number determines the spine width.

**4. Download the cover template for that exact page count**, binding and paper
stock, from the printer. Never guess cover dimensions, never scale a cover built
for a different page count. See `cover-geometry.md`.

**5. Build the cover artwork** inside the template's marked areas.

**6. Convert both files to press-ready CMYK PDF/X-1a.** See `press-pdfx.md`.

**7. Verify both before uploading.** Non-negotiable — see below.

**8. Order a physical proof copy** before approving for sale. Screens lie about
colour and about how small 8pt type really is.

If they want an ebook too, treat it as a separate track with separate rules
(`print-basics.md` closes with the differences).

## Verify before every upload

This is the habit worth instilling. Print uploaders reject *silently* or with
misleading text, so check the file yourself:

```bash
S=<book-typesetting skill folder>
$S/scripts/verify-pdfx.py interior.pdf --expect-size 8x10 --expect-pages 296
```

**Exit status 1 means do not upload.** It checks the PDF/X marker, the embedded
colour profile, TrimBox on every page, annotations, uniform trim geometry, page
count, and font embedding — and it prints the file's actual trim size, which is how
a wrong-template cover reveals itself in one line.

Pass `--expect-pages` for interiors: if the count is not what you thought, the cover
you already built is now wrong.

## The commands

```bash
S=<book-typesetting skill folder>

# Interior: render, then make press-ready.
quarto render book-print.qmd --to pdf
$S/scripts/press-pdf.sh --title "Your Book Title" \
    _output/book-print.pdf _output/interior-CMYK-X1a.pdf

# Cover: SVG → RGB PDF → CMYK PDF/X-1a → proof image, one step.
$S/scripts/cover-render.sh --title "Your Book Title" \
    --expect 23x14.5 covers/hardcover.svg

# Check anything before uploading.
$S/scripts/verify-pdfx.py file.pdf --expect-size 8x10

# Start a project from nothing (safe to re-run; never overwrites).
$S/scripts/init-book.sh --title "T" --author "A" --trim 6x9 --columns 1 ./book

# Import an existing Word manuscript into that project (--dry-run to preview).
$S/scripts/import-docx.py manuscript.docx --target ./book

# Check the machine has what it needs.
$S/scripts/doctor.sh
```

Every script takes `--help`. They fetch `pikepdf` through `uv` if it isn't
installed; Ghostscript must be present, and Inkscape too for covers.

## When a file is rejected

Work down this table before touching the artwork — the printer's message often
points at the wrong thing.

| Message or symptom | Usual real cause | Fix |
|---|---|---|
| "Elements outside safety area" | Document built to the **wrong overall size** | `verify-pdfx.py --expect-size` against the template; rebuild to the template |
| Rejected with no reason | Leftover link annotations | `press-pdf.sh` (strips them) |
| "Missing TrimBox" | Ghostscript didn't set one | `press-pdf.sh` |
| "Not PDF/X compliant" though you converted | gs silently left PDF/X mode | see gotcha 1 below |
| "Fonts not embedded" | A font the renderer couldn't embed | re-render; check the LaTeX log |
| Colours look wrong in the proof | File was still RGB | convert with `press-pdf.sh` |
| Spine text drifting onto the front | Page count changed after the cover was built | re-download template, rebuild cover |
| File too large | Undownsampled art | retry with `--downsample` |

## Gotchas that cost real time

1. **Ghostscript silently drops out of PDF/X mode** if the input still has
   annotations — it prints `reverting to normal PDF output` — yet the prologue's
   marks still land, so the file *looks* conformant and was never validated. Strip
   annotations **before** the conversion. `press-pdf.sh` does; a hand-rolled `gs`
   command will not.
2. **Authoring tools turn cross-references and URLs into annotations that some
   printers reject without telling you.** A 278-page interior carried 1,389 of them.
3. **Ghostscript does not reliably set a TrimBox**, which PDF/X-1a requires on every
   page. Always run the normalize pass afterwards.
4. **Cover geometry comes only from the printer's per-title template.** Spine width
   is a function of page count and paper. Never guess, never scale.
5. **Only Inkscape renders SVG 1.2 `<flowRoot>` text.** rsvg, cairosvg and magick
   silently produce a cover with the flowed body text *missing*. Always look at the
   proof image.
6. **`longtable` is illegal inside a column.** In a two-column layout every markdown
   table must be converted and broken out full-width — a table that slipped through
   is the usual reason a chapter suddenly won't compile.
7. **Non-Latin text is dropped SILENTLY.** Latin Modern has no Chinese, Japanese,
   Korean, Hebrew, Arabic or Devanagari glyphs, and LaTeX omits what it cannot
   cover without warning — a Chinese term in parentheses just prints as empty
   parentheses. Scaffold with `--cjk`, and heed the importer's warning.
8. **Many Word manuscripts have no real headings** — authors bold their chapter
   titles instead of applying Word's Heading styles, so pandoc produces a file
   with nothing to split on. `import-docx.py` detects this and promotes bold
   paragraphs; check the result.
9. **Don't add `-dPDFSETTINGS=/prepress` reflexively.** It downsamples images to
   300 dpi and can visibly soften cover art. It's opt-in here via `--downsample`.

## What's in this skill

```
SKILL.md
reference/getting-started.md  ← prerequisites: tools, accounts, ISBNs, decisions
reference/print-basics.md     ← the primer: vocabulary and the mental model
reference/input-contract.md   ← what your markdown/images must look like
reference/quarto-layout.md    ← two-column interior, filter chain, page geometry
reference/galley-recipe.md    ← one chapter's markdown → proof PDF
reference/press-pdfx.md       ← RGB → CMYK PDF/X-1a, in depth
reference/cover-geometry.md   ← templates, safe areas, Inkscape pipeline
scripts/press-pdf.sh          ← RGB PDF → press-ready CMYK PDF/X-1a
scripts/cover-render.sh       ← cover SVG → press PDF + proof image
scripts/verify-pdfx.py        ← pre-flight; exit 1 = do not upload
scripts/pdfx-normalize.py     ← TrimBox + annotation stripping
scripts/doctor.sh             ← checks the toolchain; run this first
scripts/init-book.sh          ← scaffolds a complete, rendering project
scripts/import-docx.py        ← Word .docx → per-chapter markdown
assets/templates/             ← master .qmd, galley wrapper, starter chapter
assets/swop.icc               ← U.S. Web Coated (SWOP) v2 colour profile
assets/pdfx-swop.ps.tmpl      ← Ghostscript PDF/X prologue template
assets/filters/               ← Lua filters for two-column print
assets/qr.tex                 ← QR-code box macros for chapter ends
```

The Lua filters and `qr.tex` ship with their per-book tables **empty and
commented** — they are meant to be configured per project, and the defaults are
correct for a book that needs no special-casing.

## Adapting to a different printer

Defaults target US print-on-demand (SWOP v2, PDF/X-1a:2001). For a European
printer wanting FOGRA39, pass `--icc /path/to/FOGRA39.icc` and edit the
`OutputCondition` strings in `assets/pdfx-swop.ps.tmpl` to match — otherwise the
file will describe itself incorrectly. Trim sizes, bleed and spine formulas always
come from that printer's own templates.
