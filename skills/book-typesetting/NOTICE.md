# Colour profiles and third-party components

## No ICC profile is distributed with this repository

US print-on-demand services (IngramSpark, Amazon KDP) expect the CMYK press
condition **U.S. Web Coated (SWOP) v2**. That profile is *Copyright Adobe
Systems, Inc.* and is deliberately **not** included here — it is not ours to
redistribute.

`scripts/press-pdf.sh` finds a profile on its own, in this order:

1. `--icc /path/to/profile.icc`
2. `assets/swop.icc` — drop your own copy here and it is used automatically
3. A system Adobe install, e.g.
   `/Library/Application Support/Adobe/Color/Profiles/Recommended/USWebCoatedSWOP.icc`
   (present on any machine with Adobe software)
4. Ghostscript's own `default_cmyk.icc` — **with a warning**, because it is not
   SWOP and the OutputIntent will name a condition the file was not built for.
   Acceptable for proofing, not for production.

If none is found, the run stops and tells you how to get one.

### Where to get the profile

- Any machine with Adobe software already has it (path above).
- Adobe publishes its ICC profile pack free:
  <https://helpx.adobe.com/creative-suite/kb/icc-profile-adobe-applications.html>
- Printing outside the US? Use your printer's own profile — `CoatedFOGRA39.icc`
  is the common European choice — and edit the `OutputCondition` and
  `OutputConditionIdentifier` strings in `assets/pdfx-swop.ps.tmpl` to match, or
  the PDF will misdescribe its own colour intent.

## Everything else

All files in this repository — Lua filters, LaTeX macros, project templates,
scripts and documentation — are original and MIT-licensed. See `LICENSE`.
