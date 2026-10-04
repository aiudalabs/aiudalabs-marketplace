#!/usr/bin/env python3
"""
Final PDF/X-1a normalization pass.

Ghostscript (pdfx-swop.ps) stamps the PDF/X-1a subtype, embeds the CMYK ICC and
writes the OutputIntent -- but it does NOT reliably:
  (a) set a TrimBox (X-1a REQUIRES one on every page), or
  (b) strip hyperref /Link annotations (X-1a forbids annotations in the printable
      area; IngramSpark rejects such files silently, with no error message).

This pass fixes both, in place, without disturbing the ICC / OutputIntent / fonts.
It is idempotent -- running it twice is harmless.

Run it as the LAST step, after the Ghostscript distill:

    quarto render book-print.qmd --to pdf
    scripts/press-pdf.sh --title "Your Book Title" \
        _output/book-print.pdf _output/interior-CMYK-X1a.pdf

or standalone:

    python3 pdfx-normalize.py [--bleed 0.125] file.pdf

Bleed: with --bleed 0 (the default) TrimBox == MediaBox, which is correct for a
no-bleed interior. With a nonzero bleed the page box carries N inches of bleed on
every side, so the TrimBox is inset by N inches all round.

Requires: pikepdf  (pip3 install pikepdf)
"""
import argparse
import sys

try:
    import pikepdf
except ImportError:
    sys.exit("pdfx-normalize: pikepdf not installed. `pip3 install pikepdf`, "
             "or run via `uv run --with pikepdf python pdfx-normalize.py ...`")

PT_PER_IN = 72.0


def normalize(path, bleed_in=0.0):
    inset = bleed_in * PT_PER_IN
    pdf = pikepdf.open(path, allow_overwriting_input=True)
    annots_removed = 0
    for page in pdf.pages:
        if "/Annots" in page:
            annots_removed += len(page.Annots)
            del page.Annots
        mb = [float(x) for x in page.MediaBox]
        x0, y0 = min(mb[0], mb[2]), min(mb[1], mb[3])
        x1, y1 = max(mb[0], mb[2]), max(mb[1], mb[3])
        page.TrimBox = pikepdf.Array([x0 + inset, y0 + inset, x1 - inset, y1 - inset])
    root = pdf.Root
    if "/Names" in root and "/Dests" in root.Names:
        del root.Names.Dests  # drop the now-orphaned named-destination tree
    pdf.save(path)
    print(f"[pdfx-normalize] {path}")
    print(f"  removed {annots_removed} annotation(s); "
          f"set TrimBox on {len(pdf.pages)} page(s) "
          f"(bleed {bleed_in}in -> inset {inset:.1f}pt)")


if __name__ == "__main__":
    ap = argparse.ArgumentParser(
        description="PDF/X-1a TrimBox + annotation normalization (in place).")
    ap.add_argument("pdf")
    ap.add_argument("--bleed", type=float, default=0.0,
                    help="bleed in inches; TrimBox is inset from MediaBox by "
                         "this much on all four sides (default 0)")
    args = ap.parse_args()
    normalize(args.pdf, args.bleed)
