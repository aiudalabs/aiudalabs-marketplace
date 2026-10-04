# Two-column print interior with Quarto + LaTeX

New to print layout? Read `print-basics.md` first for trim, gutter and recto/verso.

How a two-column print interior is assembled: an 8×10 `scrbook` whose chapter
bodies are set in two columns via `multicol`, with a Lua filter chain doing the
work Pandoc cannot express in markdown. Adjust the trim size to your own book —
the structure carries over.

A single interior can serve **both** a case-laminate hardcover and a paperback
edition — in practice the two masters end up identical. Plan for it: mirrored
margins with an adequate gutter satisfy both, and you avoid maintaining two
layouts.

## Why `multicol`, not `classoption: twocolumn`

With the class-level `twocolumn` option, footnotes are set per column — narrow,
and doubled at the page foot. With `multicol`, footnotes pool into **one full-width
block** at the bottom of the page, which is what a trade book looks like.

The cost is that `multicol` **forbids floats** and sets `\chapter` inside a column.
The filter chain exists to pay that cost:

- figures become inline `\includegraphics` + `\captionof`, not `figure` environments
- tables and galleries are marked, then broken out of the columns full-width
- chapter titles are lifted above the columns

## Filter chain — order is load-bearing

```yaml
filters:
  - var-filter.lua              # [x]{.var} -> \var{x} (italic blue inline variable)
  - _filters/figurize-mc.lua    # figures inline; galleries -> %MCFW full-width bands
  - _filters/table-mc.lua       # tables -> %MCFW full-width bands
  - _filters/chapterend.lua     # MUST precede themebreak
  - _filters/themebreak.lua     # `---` -> \thematicrule
  - _filters/multicolize.lua    # LAST: wrap bodies in multicols, break out bands
```

Two ordering constraints that will bite you:

1. **`chapterend` before `themebreak`.** `chapterend` replaces the `---` that sits
   before `## Endnotes` with the chapter-end ornament. It has to see a raw
   `HorizontalRule`; `themebreak` would already have turned it into
   `\thematicrule`.
2. **`multicolize` last.** It is a document-level pass that needs to see the final
   block sequence, including the `%%MCFW` sentinels the figure and table filters
   emit.

### What each filter does

| Filter | Role |
|---|---|
| `var-filter.lua` | `[Latency]{.var}` → `\var{Latency}` in LaTeX (italic blue inline variable); leaves the span alone for HTML/EPUB so CSS can style it |
| `figurize-mc.lua` | Merges image + caption into one figure; single figures set inline (no float); montages become `%%MCFW` full-width bands; converts raw `<img>`/`<a>` to images or QR boxes; per-figure scale overrides in a `FIG_SCALE` table |
| `table-mc.lua` | Converts Pandoc's `longtable` to plain `tabular` and emits it as a `%%MCFW` band |
| `table-fullwidth.lua` | Same job for a **non**-multicol two-column layout — uses `cuted`'s `\begin{strip}`. Not used with `multicolize` (strip is illegal in multicol) |
| `chapternum.lua` | Strips the literal `N.` from `# 12. Title`, so it isn't printed twice alongside LaTeX's own chapter counter |
| `chapterend.lua` | Replaces the pre-`Endnotes` rule with a centred `* * *`; drops the print-irrelevant Endnotes heading |
| `themebreak.lua` | `---` → `\thematicrule{}` for print; for EPUB/HTML, keys off H2/H3 and *prepends* a divider, because Quarto's section pass deletes a `---` sitting directly before a heading before any filter can see it |
| `multicolize.lua` | Opens `multicols` after each chapter title, closes before the next chapter, before structural raw blocks (`\frontmatter`, `\part`, part/section divider pages) and around every `%%MCFW` band; strips class-level `\twocolumn`/`\onecolumn` |
| `tblheading.lua` | `{.tbl-heading}` div → centred bold heading with a 1pt rule above a table |

`multicolize` recognises a full-width band by a `%%MCFW` comment prefixing a
RawBlock. If you add a filter that emits its own full-width material, mark it the
same way and make sure it runs before `multicolize`.

## Page geometry (8×10, no bleed, serves both printers)

```yaml
documentclass: scrbook
classoption: [twoside, open=right, cleardoublepage=empty, 10pt,
              numbers=noendperiod, BCOR=0in]
geometry:
  - paperwidth=8in
  - paperheight=10in
  - top=0.65in
  - bottom=0.9in      # multicol puts pooled footnotes BELOW the columns —
                      # they need room to clear the folio
  - inner=0.75in      # gutter, mirrored recto/verso by twoside
  - outer=0.5in
  - columnsep=0.3in
  - headheight=14pt
  - headsep=14pt
  - footskip=43pt     # folio ~0.30in from bottom trim
fontsize: 10pt
linestretch: 1.12
```

`BCOR=0in` because the binding correction is already folded into `inner`.
KDP's minimum bottom margin is 0.25 in; this lands the folio around 0.30 in.

## Preamble pieces worth keeping

- **`\raggedbottom`** — mandatory here. KOMA's `twoside` default `\flushbottom`
  stretches each page to `\textheight`, which under `multicol` pushed the pooled
  footnote block down into the folio.
- **Missing-image guard** — `\includegraphics` is wrapped to draw a visible
  `[missing image]` box instead of failing the build, so a work-in-progress body
  still compiles.
- **Footnote mark width** — `\deffootnote{1.8em}{1.8em}{...}`. KOMA's default
  overhangs the mark into the margin; at 8×10 that put markers ~0.59 in from the
  binding trim.
- **Ragged-right footnotes** with `xurl` — long URLs in narrow columns otherwise
  overflow or gap badly. Body text stays justified.
- **Caption font** at 7.5/9.5pt against 10pt body, `labelformat=empty` (the figure
  number lives in the caption text itself).
- **`\input{_qr.tex}`** — see `assets/qr.tex`. `\qrref`/`\qrfig` (grey),
  `\qrtool` (blue), `\qrdemo` (green), `\qrhome` (neutral). Each is a
  content-sized `\tcbox` so a QR tucks under a figure instead of reserving a
  full-width band. **No `\needspace` inside these** — within `multicol`, column
  material is collected into one tall box before splitting, so `\needspace`'s
  page-geometry test misfires and forces a spurious column break.
- **Dash ligatures under Lua/XeTeX** — `\usepackage{lmodern}` alone does not get
  TeX dash ligatures through `luaotfload`. Re-load via `fontspec` with
  `Ligatures=TeX` or `---` renders as three hyphens.

## Non-Latin text

Latin Modern covers no CJK, Hebrew, Arabic or Devanagari, and LaTeX **silently
omits** characters it cannot cover — a Chinese term prints as empty parentheses
with no warning in the log. Scaffold with `--cjk` (optionally `--cjk-font`), which
emits a LuaTeX fallback:

```latex
\ifLuaTeX
  \directlua{luaotfload.add_fallback("bookfallback",
    { "SongtiSC:mode=base;script=hani;" })}
  \setmainfont{Latin Modern Roman}[Ligatures=TeX, RawFeature={fallback=bookfallback}]
\fi
```

The `\ifLuaTeX` guard keeps the document building under xelatex/pdflatex, where
the fallback mechanism does not exist.

## Rendering

This layout does not use a Quarto *book* project. Keeping `_quarto.yml` to just
`output-dir: _output` and rendering each master file individually gives you direct
control over the LaTeX preamble, which the book project format hides:

```bash
quarto render book-print.qmd --to pdf        # full interior
quarto render chapter-13.qmd --to pdf        # single-chapter proof
```

Build assets (`_qr.tex`, `_filters/`, `*.lua`, CSS, ICC) must sit flat in the
render directory — the paths in the masters assume it.

## Ebook targets

EPUB uses a much shorter filter list (`var-filter.lua` only) plus CSS; none of the
multicol machinery applies. `epub-cover-image` takes a flat RGB front cover.
`themebreak.lua`'s HTML branch is the one piece shared with print, and it exists
purely to work around Quarto deleting `---` before headings.

## When a chapter suddenly fails to compile

Read `<name>.log`, then check, in this order:

1. A markdown pipe table that slipped past `table-mc` → `longtable not in 1-column
   mode`. Convert it to a raw-LaTeX `table*`.
2. A heading with bold markup (`### **Title**`) → `titlesec` errors. Strip the `**`.
3. A stray raw `<img>` the figure filter did not match.
4. A wrong image path (the guard box will show it in the PDF instead of failing).
