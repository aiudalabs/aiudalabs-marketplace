#!/usr/bin/env python3
"""
Pre-flight a press PDF before uploading it to IngramSpark / KDP.

Checks what those uploaders actually reject on, and prints the page geometry so a
size/spine mismatch is caught HERE rather than three days later in a rejection
email. A cover once came back as "COVER ELEMENTS OUTSIDE SAFETY AREA" when the
real fault was that the document was built to the wrong trim size entirely --
this report would have shown that in one line.

    python3 verify-pdfx.py file.pdf [--expect-size 23x14.5] [--expect-pages 296]

Exit status 0 = all hard checks pass, 1 = at least one FAIL.
Requires: pikepdf  (pip3 install pikepdf)
"""
import argparse
import sys
from collections import Counter

try:
    import pikepdf
except ImportError:
    sys.exit("verify-pdfx: pikepdf not installed. `pip3 install pikepdf`, "
             "or run via `uv run --with pikepdf python verify-pdfx.py ...`")

PT_PER_IN = 72.0
FAILED = []
WARNED = []


def ok(msg):
    print(f"  PASS  {msg}")


def fail(msg):
    print(f"  FAIL  {msg}")
    FAILED.append(msg)


def warn(msg):
    print(f"  WARN  {msg}")
    WARNED.append(msg)


def box_in(box):
    v = [float(x) for x in box]
    w = abs(v[2] - v[0]) / PT_PER_IN
    h = abs(v[3] - v[1]) / PT_PER_IN
    return round(w, 4), round(h, 4)


def main():
    ap = argparse.ArgumentParser(description="PDF/X-1a pre-flight for print uploaders.")
    ap.add_argument("pdf")
    ap.add_argument("--expect-size", metavar="WxH",
                    help='expected trim size in inches, e.g. "8x10" or "23x14.5"')
    ap.add_argument("--expect-pages", type=int, help="expected page count")
    args = ap.parse_args()

    pdf = pikepdf.open(args.pdf)
    n = len(pdf.pages)
    print(f"[verify-pdfx] {args.pdf}  ({n} page{'s' if n != 1 else ''})")

    # --- PDF/X marker -------------------------------------------------------
    docinfo = pdf.docinfo or {}
    xver = str(docinfo.get("/GTS_PDFXVersion", ""))
    if "PDF/X-1a" in xver:
        ok(f"PDF/X version: {xver}")
    elif xver:
        warn(f"PDF/X version is {xver!r}, expected PDF/X-1a:2001")
    else:
        fail("no /GTS_PDFXVersion in DocInfo -- this is not marked as PDF/X")

    # --- OutputIntent -------------------------------------------------------
    intents = pdf.Root.get("/OutputIntents")
    if intents and len(intents) > 0:
        oi = intents[0]
        cond = str(oi.get("/OutputCondition", oi.get("/Info", "?")))
        has_profile = "/DestOutputProfile" in oi
        if has_profile:
            ok(f"OutputIntent with embedded profile: {cond}")
        else:
            fail(f"OutputIntent present ({cond}) but no /DestOutputProfile embedded")
    else:
        fail("no OutputIntent -- X-1a requires one naming the CMYK press condition")

    # --- TrimBox on every page ---------------------------------------------
    missing_trim = [i + 1 for i, p in enumerate(pdf.pages) if "/TrimBox" not in p]
    if missing_trim:
        show = missing_trim[:8]
        more = "" if len(missing_trim) <= 8 else f" (+{len(missing_trim) - 8} more)"
        fail(f"{len(missing_trim)} page(s) have no TrimBox: {show}{more}"
             " -- run pdfx-normalize.py")
    else:
        ok(f"TrimBox present on all {n} page(s)")

    # --- annotations --------------------------------------------------------
    total_annots = sum(len(p.Annots) for p in pdf.pages if "/Annots" in p)
    if total_annots:
        fail(f"{total_annots} annotation(s) present -- X-1a forbids them and "
             "IngramSpark rejects silently; run pdfx-normalize.py")
    else:
        ok("no annotations")

    # --- geometry -----------------------------------------------------------
    sizes = Counter(box_in(p.get("/TrimBox", p.MediaBox)) for p in pdf.pages)
    for (w, h), count in sizes.most_common():
        label = f"{w}in x {h}in"
        print(f"  ....  trim {label} on {count} page(s)")
    if len(sizes) > 1:
        warn(f"{len(sizes)} distinct trim sizes -- print uploaders expect one uniform size")

    if args.expect_size:
        try:
            ew, eh = (float(v) for v in args.expect_size.lower().split("x"))
        except ValueError:
            sys.exit(f"error: --expect-size must look like 8x10, got {args.expect_size!r}")
        aw, ah = sizes.most_common(1)[0][0]
        if abs(aw - ew) <= 0.01 and abs(ah - eh) <= 0.01:
            ok(f"trim size matches expected {ew}in x {eh}in")
        else:
            fail(f"trim size is {aw}in x {ah}in, expected {ew}in x {eh}in "
                 "-- rebuild to the printer's template, do not scale")

    if args.expect_pages is not None:
        if n == args.expect_pages:
            ok(f"page count matches expected {args.expect_pages}")
        else:
            fail(f"page count is {n}, expected {args.expect_pages} "
                 "-- a stale interior changes the spine width")

    # --- fonts --------------------------------------------------------------
    not_embedded = set()
    for page in pdf.pages:
        fonts = page.get("/Resources", {}).get("/Font", {})
        for font in fonts.values():
            desc = font.get("/FontDescriptor")
            if desc is None and font.get("/Subtype") == "/Type0":
                for d in font.get("/DescendantFonts", []):
                    desc = d.get("/FontDescriptor")
            if desc is None:
                continue
            if not any(k in desc for k in ("/FontFile", "/FontFile2", "/FontFile3")):
                not_embedded.add(str(font.get("/BaseFont", "?")))
    if not_embedded:
        fail(f"font(s) not embedded: {sorted(not_embedded)}")
    else:
        ok("all fonts embedded (or none referenced)")

    print()
    if FAILED:
        print(f"[verify-pdfx] {len(FAILED)} FAILED, {len(WARNED)} warning(s) -- do not upload")
        return 1
    print(f"[verify-pdfx] all checks passed, {len(WARNED)} warning(s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
