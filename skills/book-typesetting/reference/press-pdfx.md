# Press prep: RGB PDF → CMYK PDF/X-1a:2001

What IngramSpark and KDP actually want for a print interior, and why each step
exists. Run `scripts/press-pdf.sh`; this file explains what it does so you can
debug it when a printer pushes back.

## The one command

```bash
quarto render book-print.qmd --to pdf
~/.claude/skills/book-typesetting/scripts/press-pdf.sh \
    --title "Your Book Title" \
    _output/book-print.pdf \
    _output/interior-CMYK-X1a.pdf
```

Then read the verifier block it prints. **Exit status 1 means do not upload.**

Options: `--bleed IN` (default 0), `--icc PATH` (default the bundled SWOP v2),
`--downsample` (adds `-dPDFSETTINGS=/prepress`; off by default),
`--no-normalize`, `--no-verify`.

## What PDF/X-1a:2001 requires

| Requirement | Who provides it |
|---|---|
| All colour in DeviceCMYK or DeviceGray (no RGB, no spot) | `gs -sColorConversionStrategy=CMYK` |
| An OutputIntent naming the press condition, with the ICC embedded | the prologue's pdfmarks |
| `/GTS_PDFXVersion (PDF/X-1a:2001)` in DocInfo | the prologue |
| A TrimBox on **every** page | `pdfx-normalize.py` |
| No annotations in the printable area | `pdfx-normalize.py` |
| All fonts embedded and subset | `gs -dEmbedAllFonts` |
| PDF 1.3 compatibility | `gs -dCompatibilityLevel=1.3` |
| No transparency / no JBIG2 | authoring-side; gs flattens most of it |

## Stage order — and why it is not the obvious one

```
input.pdf
   │
   ├─ 1. pre-strip annotations        ← NOT optional; see below
   │
   ├─ 2. gs distill with the prologue  → CMYK + ICC + OutputIntent + X marker
   │
   ├─ 3. normalize                     → TrimBox on every page
   │
   └─ 4. verify                        → prove it before uploading
```

**Why annotations get stripped before the distill, not after.** Given an input with
annotations, Ghostscript prints:

```
Annotation (not TrapNet or PrinterMark) on page,
 not permitted in PDF/X, reverting to normal PDF output
```

and abandons PDF/X enforcement for the whole run — but the prologue's pdfmarks
still write the `/GTS_PDFXVersion` string and the OutputIntent. The result claims
to be PDF/X-1a and was never validated as such. Every Quarto interior triggers
this, because `hyperref` turns cross-references, the TOC and every URL into `/Link`
annotations. (A 278-page interior carried 1,389.)

The original hand-run workflow stripped them *after* gs and shipped anyway;
IngramSpark accepted it, but the file had skipped conformance checking. Stripping
first is strictly better and costs one extra pass.

## The Ghostscript invocation

```bash
gs -dPDFX -dBATCH -dNOPAUSE -dNOSAFER -dQUIET \
   -sColorConversionStrategy=CMYK \
   -sProcessColorModel=DeviceCMYK \
   -dCompatibilityLevel=1.3 \
   -dEmbedAllFonts=true -dSubsetFonts=true \
   -dAutoRotatePages=/None \
   -sDEVICE=pdfwrite \
   -sOutputFile=out_CMYK-X1a.pdf \
   prologue.ps in_rgb.pdf
```

- `-dNOSAFER` is required: the prologue opens the ICC file by path.
- The prologue must come **before** the input file on the command line.
- `-dPDFSETTINGS=/prepress` is deliberately absent. It downsamples images to
  300 dpi; on one 23-inch case-laminate cover that cut the file from 19.5 MB to
  11.6 MB and softened the art. Add it only if an uploader rejects for file size.
- Verified with Ghostscript 10.07.1.

## The prologue

`assets/pdfx-swop.ps.tmpl` — substitute `@@TITLE@@` and `@@ICC@@` (absolute path).
It guards against a wrong `ColorConversionStrategy`, forces the X-1a:2001 marker
regardless of `-dPDFX` level, embeds the ICC as a 4-component stream, and attaches
the OutputIntent to the catalog.

Parens and backslashes in the title are PostScript syntax — `press-pdf.sh` escapes
them. Substituting the template by hand with an unescaped title breaks the file.

## Colour profile

`assets/swop.icc` — U.S. Web Coated (SWOP) v2, CGATS TR001. Both IngramSpark and
KDP name this as the expected CMYK condition for US printing. Pass `--icc` for a
different press (e.g. FOGRA39 for European printers); the OutputCondition strings
in the prologue then need editing to match, or the intent will misdescribe itself.

## Verifying

```bash
scripts/verify-pdfx.py file.pdf --expect-size 8x10 --expect-pages 296
```

Checks the X marker, the OutputIntent and its embedded profile, TrimBox on every
page, annotation count, uniform trim geometry, expected size, expected page count,
and font embedding. It prints the actual trim size of every page group, which is
how a wrong-template cover reveals itself in one line.

`--expect-pages` is worth passing for interiors: the page count determines spine
width, so an unexpected count means the cover you already built is now wrong.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| "reverting to normal PDF output" | annotations at distill time | pre-strip (press-pdf.sh does) |
| Uploader rejects, no reason given | `/Link` annotations | normalize pass |
| "TrimBox missing" | gs did not set one | normalize pass |
| Colours look washed / wrong | source was RGB and never converted | check `-sColorConversionStrategy=CMYK` took effect |
| gs errors opening the ICC | `-dSAFER` blocked it, or a relative path | `-dNOSAFER`, absolute path |
| File rejected as too large | undownsampled art | retry with `--downsample` |
| Fonts flagged as not embedded | a Type3 or a broken source font | re-render the source; check the LaTeX log |
