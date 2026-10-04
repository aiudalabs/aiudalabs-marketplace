# Covers: geometry, authoring, and the press pipeline

New to this? Read `print-basics.md` first — it explains trim, bleed, safe areas and
why a cover is one wide page rather than three.

A wraparound cover is the single easiest thing to get rejected, and the rejection
message will probably point at the wrong problem. Read the first section before
touching the artwork.

## Geometry comes from the printer's template. Only from there.

Download the per-title template **for your exact binding, trim, paper and page
count** (IngramSpark: Cover Template Generator → a ZIP containing a PDF named for
your ISBN and binding, e.g. `<isbn>-ColorCase.pdf`; KDP has an equivalent cover
calculator). Build the artwork to that document's boxes.

Never derive geometry from arithmetic, never scale a cover built for a different
page count, never reuse the previous edition's file. Spine width is a function of
page count and paper stock; changing the interior by a few pages invalidates the
cover.

### Worked example — a case-laminate hardcover

To make the above concrete, here is what a real template looks like: case
laminate, 8×10 trim, premium colour, white paper, **296 pages**. The **cover
document is 23 × 14.5 in** — far larger than the trim, because a case-laminate
cover wraps around the boards and tucks inside them. At 300 units/in the document
is 6900 × 4350.

Your numbers will differ. Read them off your own template; do not copy these.

| Region | x (in) | y from top (in) |
|---|---|---|
| Bleed — fill background to exactly this rect | 3.932 – 22.750 | 0.375 – 11.875 |
| Back cover safe area (pink) | 4.682 – 12.247 | 1.125 – 11.125 |
| Spine bleed (**spine = 0.937 in**) | 12.872 – 13.809 | — |
| Spine safe area | 12.935 – 13.747 | — |
| Front cover safe area (pink) | 14.435 – 22.000 | 1.125 – 11.125 |

Rules the template encodes: all text, images and the barcode stay inside the pink
safe areas; the background fills the bleed rect exactly; nothing sits in the outer
white margin.

### The rejection that wasn't what it said

A submission came back as **"COVER ELEMENTS OUTSIDE SAFETY AREA."** Nothing was
outside the safety area. The document had been built 18.29 × 11.5 in with a 0.79 in
spine — paperback proportions — against a 23 × 14.5 case-laminate template. Wrong
size, misreported as a stray element.

**When a cover is rejected, check the trim size before you go hunting for elements:**

```bash
scripts/verify-pdfx.py cover_CMYK-X1a.pdf --expect-size 23x14.5 --expect-pages 1
```

That prints the actual trim in one line and fails loudly on a mismatch.

## Authoring

Master is an Inkscape SVG at 300 units/in, layered `background / front / spine /
back`. Keep the printer's template as a locked reference layer underneath so the
safe areas stay visible while you work.

**Flowed body text uses SVG 1.2 `<flowRoot>`, which only Inkscape renders.**
rsvg-convert, cairosvg and ImageMagick all silently emit a cover with the
back-cover blurb missing. Do not substitute a "faster" rasterizer — the failure is
invisible until it is in print.

Every font used must be installed locally before export — the display face for
the title as well as the body face. The export converts text to paths, so a
missing font becomes silently wrong glyph shapes in the PDF rather than an error
you can see.

## Render + press-convert

```bash
~/.claude/skills/book-typesetting/scripts/cover-render.sh \
    --title "Your Book Title" \
    --expect 23x14.5 \
    covers/hardcover_8x10.svg
```

Produces, next to the SVG:

- `hardcover_8x10.pdf` — RGB, text converted to paths
- `hardcover_8x10_CMYK-X1a.pdf` — the upload
- `hardcover_8x10_CMYK_PROOF.png` — 150 dpi raster

**Look at the proof.** It is the only step that catches a missing `<flowRoot>`
blurb, a barcode over artwork, or a spine title off-centre.

The underlying steps, if you need them by hand:

```bash
/Applications/Inkscape.app/Contents/MacOS/inkscape cover.svg \
    --export-type=pdf --export-filename=cover.pdf --export-text-to-path

scripts/press-pdf.sh --title "..." --bleed 0 cover.pdf cover_CMYK-X1a.pdf
```

`--bleed 0` is correct here: the bleed is already inside the template's document
box, so TrimBox equals MediaBox. Do **not** pass the template's bleed measurement
as `--bleed` — that would inset the TrimBox a second time.

## Ebook cover

A flat front-only raster, no wraparound, no CMYK — ebook covers stay RGB.
KDP wants roughly 1600 × 2560 px, 1.6:1. Export the front layer alone:

```bash
/Applications/Inkscape.app/Contents/MacOS/inkscape cover.svg \
    --export-id=front --export-id-only \
    --export-type=png --export-width=1600 --export-filename=front_cover_eBook.png
```

## Checklist before uploading a cover

- [ ] Template downloaded for the **current** page count and binding
- [ ] Interior page count re-confirmed from the actual interior PDF, not from memory
- [ ] `verify-pdfx.py --expect-size` passes against the template's document size
- [ ] Proof raster inspected: blurb present, barcode inside safe area, spine centred
- [ ] Background fills the bleed rect edge to edge; nothing in the white margin
