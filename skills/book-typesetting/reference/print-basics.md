# Print basics — read this first if you have never made a print book

No prior knowledge assumed. This explains what a printer is asking for and why,
so the rest of the skill reads as instructions rather than incantations.

## The whole job, in one picture

A print-on-demand service (IngramSpark, Amazon KDP, Lulu…) wants exactly **two
PDFs** from you:

```
   ┌─────────────────────┐        ┌──────────────────────────────────┐
   │   INTERIOR PDF      │        │          COVER PDF               │
   │                     │        │  ┌──────┬───┬──────────────────┐ │
   │  every page of the  │        │  │ back │spi│      front       │ │
   │  book, in order,    │        │  │cover │ne │      cover       │ │
   │  already laid out   │        │  └──────┴───┴──────────────────┘ │
   │                     │        │      ONE page, wrapping around   │
   └─────────────────────┘        └──────────────────────────────────┘
```

The interior is one page per book page. The cover is a **single wide page** — back
cover, spine and front cover side by side, printed on one sheet that wraps around
the book. That surprises people the first time.

Both must be **press-ready**: correct size, correct colour space, fonts embedded,
and marked with the boxes the press equipment reads. Getting a PDF that merely
*looks* right is the easy half.

## Vocabulary

**Trim size** — the finished dimensions of the book, after the printer cuts the
paper. A 8×10 book means 8 inches wide, 10 inches tall. You choose it up front and
everything else follows.

**Bleed** — extra artwork past the trim line, so that when the cutter drifts a
fraction of a millimetre you get ink to the edge instead of a white sliver. If any
colour or image touches the edge of your page, you need bleed (usually 0.125 in).
If everything floats inside a white margin — as in most book interiors — you need
**no bleed**, which is simpler. This skill defaults to no bleed.

**Safe area** (or *live area*) — the region well inside the trim where it is safe
to put text. Anything closer to the edge risks being cut off. Printers mark this in
pink on their templates.

**Gutter** (or *inner margin*) — extra margin on the binding side, because the
binding swallows part of the page. Without it, text disappears into the spine.

**Recto / verso** — right-hand page (odd numbered) and left-hand page (even). They
mirror: the gutter is on the left of a recto and the right of a verso. Chapters
conventionally open on a recto.

**Folio** — the printed page number.

**Front matter / back matter** — everything before chapter one (title page,
copyright, dedication, table of contents) and after the last chapter (appendices,
index, about the author).

**Spine width** — the thickness of the book. It is **calculated from your page
count and paper stock**, not chosen. This is the single most important dependency
in the whole process: change the interior by a few pages and the spine width
changes, which makes your existing cover wrong.

**Case laminate** — a hardcover where the printed cover is glued directly onto the
boards (no separate dust jacket). Its cover PDF is much larger than the trim size,
because it wraps around and tucks inside the boards. A 8×10 case-laminate cover
document can be 23 × 14.5 in.

**Perfect bound** — the standard paperback binding (glued spine). Its cover is
smaller than a case-laminate cover for the same trim.

**Galley / galley proof** — a draft of typeset pages used for proofreading, before
the book is finalized.

## Colour: why your PDF is the wrong colour space

Screens mix **red, green and blue light** (RGB). Presses lay down **cyan, magenta,
yellow and black ink** (CMYK). They can't represent the same set of colours — the
vivid screen blues and greens simply do not exist in ink.

If you hand a printer an RGB file, *something* converts it to CMYK — and if that
something isn't you, you don't get to see the result until the book arrives. So you
convert deliberately, up front, and look at a proof.

**ICC profile** — a file describing how one specific device reproduces colour.
`swop.icc` in this skill is **U.S. Web Coated (SWOP) v2**, the standard description
of American commercial printing. Both IngramSpark and KDP expect it. Converting
"to CMYK" is meaningless without saying *which* CMYK; the profile says which.

**OutputIntent** — a record embedded inside the PDF saying "this file's colours
were prepared for *this* press condition." It's how the printer knows your intent.

## PDF/X-1a: the strict dialect

A normal PDF can do things a press cannot: reference fonts you have but the printer
doesn't, use RGB, embed interactive links, rely on transparency. **PDF/X-1a:2001**
is a restricted subset that forbids all of that. It requires:

- every colour in CMYK or greyscale — no RGB, no spot colours
- every font embedded in the file
- an OutputIntent naming the press condition
- a **TrimBox** on every page
- no annotations (links, comments, form fields)

Printers ask for it because a conforming file cannot surprise them.

**Page boxes** are rectangles recorded per page:

| Box | Meaning |
|---|---|
| **MediaBox** | the whole sheet, including any bleed |
| **TrimBox** | where the cut happens — the finished page |
| **BleedBox** | how far artwork extends past the trim |

With no bleed, TrimBox equals MediaBox. PDF/X-1a *requires* a TrimBox, and
Ghostscript does not reliably add one — which is why this skill runs a fix-up pass
after conversion.

## Why uploads get rejected, and why the message misleads

Print uploaders validate automatically and report tersely. Two failure modes cost
the most time:

1. **Silent rejection.** The file is accepted, then quietly fails later, or is
   rejected with no reason given. Leftover hyperlink annotations from your
   authoring tool are a classic cause.
2. **Misleading messages.** A cover built to the wrong overall size may be reported
   as "elements outside the safety area" — sending you hunting for a stray text box
   when the real problem is that the document is the wrong size entirely.

The defence is to check the file yourself before uploading, against the things that
actually get rejected. That is what `scripts/verify-pdfx.py` does.

## The dependency that bites everyone

```
   interior page count  ──►  spine width  ──►  cover template  ──►  cover artwork
```

Edit a chapter, the page count shifts, and the cover you already built no longer
fits. **Finalize the interior first. Then download the cover template for that
exact page count. Then build the cover.** Re-check the page count immediately
before uploading.

## Resolution

Images should be around **300 dpi at printed size**. A photo 2 inches wide on the
page wants ~600 pixels across. Screenshots and web images are typically 72–96 dpi
and will look soft in print — that is normal and usually unavoidable for UI
screenshots, but do not *downscale* to fix a file-size complaint without looking at
the result.

## Ebooks are a different world

EPUB is **reflowable**: no fixed pages, no page numbers, reader-chosen font size.
None of the above applies — no CMYK, no bleed, no trim size. Cover art is a flat
RGB image, typically ~1600 × 2560 px. Do not spend print effort on the ebook, and
do not expect print layout decisions to carry over.

## Where to go next

- Building the interior from markdown → `quarto-layout.md`
- Proofing one chapter at a time → `galley-recipe.md`
- Making any PDF press-ready → `press-pdfx.md`
- Cover geometry and artwork → `cover-geometry.md`
