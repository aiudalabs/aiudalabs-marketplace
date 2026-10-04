# Input contract — what your manuscript must look like

The Lua filters do not guess. They recognise **specific patterns** in your
markdown and convert them; anything they don't recognise passes straight through
to LaTeX, which usually means it renders wrong or fails to compile.

This file is the contract. Everything below was verified by running a fixture
through the full filter chain.

## Don't build this by hand

`scripts/init-book.sh` creates the whole layout below — master `.qmd` with the
LaTeX preamble, filter chain, QR macros, a starter chapter and a galley-proof
wrapper — and it renders straight away:

```bash
init-book.sh --title "My Book" --author "A. Writer" --trim 6x9 --columns 1 ./my-book
cd my-book/typesetting && quarto render book-print.qmd --to pdf
```

It never overwrites an existing file, so it is safe to re-run against a partly
built project. The rest of this file describes what it generates and the
conventions your prose must follow.

## Starting from a Word manuscript

Most authors arrive with a `.docx`. `scripts/import-docx.py` converts one into
this layout — but pandoc alone will not do it, because four things go wrong that
only matter for books:

| What breaks | What the importer does |
|---|---|
| Everything lands in one giant file | Splits on H1; classifies chapters vs front matter vs part dividers |
| **All footnote definitions are emitted at the END of the document** | Moves each to the chapter that references it, renumbered `[^c12-1]` so ids can't collide |
| Word captions arrive *inside* the image alt text, escaped | Lifts them out into the bold caption paragraph this layout requires |
| Media extracts as `rId42.jpg` | Renames to `figNN-MM-slug.ext`, numbered document-wide so nothing collides |

```bash
init-book.sh --title "My Book" --author "A. Writer" ./my-book
import-docx.py manuscript.docx --target ./my-book --dry-run   # preview first
```

Two cases it handles that trip people up:

- **No heading styles.** Many authors bold their chapter titles rather than
  applying Word's Heading styles, so pandoc emits a file with zero headings. The
  importer detects that and promotes wholly-bold paragraphs — chapter/part-looking
  ones to H1, the rest to H2. It also reads `Chapter 7: Title` as well as
  `7. Title`. Control it with `--bold-headings auto|always|never`.
- **Non-Latin characters.** It reports CJK, Hebrew, Arabic, Cyrillic, Greek and
  Devanagari text, because the default font cannot render them and LaTeX drops
  them **silently**. Scaffold with `--cjk` when that warning appears.

**It is a starting point, not a finished conversion.** Word documents vary too
much. The report lists exactly what needs a human: images with no recognisable
caption (they get a visible `TODO caption.` in the PDF), part dividers needing a
`\part{}` block, headings it could not classify, and unreferenced footnotes.
Captions are reconstructed heuristically — the lead-sentence/credit split is a
guess, so re-read them.

## Directory layout

```
your-book/
  chapters/                    ← canonical prose, one file per chapter
    Chapter-1-Some-Title.print.md
    Chapter-2-Another.print.md
    Foreword.md  Preface.md  Acknowledgments.md
    Part-I-Divider.md          ← optional part/section dividers
  images/                      ← every figure
    fig01-01-descriptive-slug.png
    fig01-02a.png  fig01-02b.png    ← montage panels: same number, letter suffix
    qr/
      ch01-refs.png            ← per-chapter QR codes
  typesetting/                 ← the build directory; run quarto from here
    book-print.qmd             ← the master
    _filters/*.lua  qr.tex  swop.icc
```

Two rules that matter:

- **Image paths in markdown are relative to the build directory**, so they read
  `../images/fig01-01-thing.png`. This is why the build lives in its own folder.
- **Build assets must sit flat in the build directory** — the master's paths
  assume it.

## Chapter file structure

```markdown
# 1. The Chapter Title

**The Bold Lead Line**

*An italic author's note.*

---

Body prose starts here.
```

- **`# N. Title`** — H1, numbered. The filter strips the leading `N.` so the
  chapter number comes from LaTeX's counter rather than being printed twice.
- The **bold lead line** and **italic note** are conventions, not requirements.
  Turning the note into a boxed callout is a *manual* step (see
  `galley-recipe.md`) — no filter does it automatically.
- `---` becomes a thematic rule. Use it for scene breaks; the author convention
  in this layout is also to place one before each `##` heading.

## Figures

**A single figure** — image, blank line, then a bold caption paragraph:

```markdown
![Alt text](../images/fig01-01-thing.png)

**Figure 1.1 — Lead sentence.** Middle explanation. *Photo: credit.*
```

The filter merges the two into one figure, drops the alt text (so the caption
isn't doubled), and sets it inline in the column.

**A montage** — several `<img>` in a raw HTML block, then the same caption
pattern:

```markdown
<div>
  <img src="../images/fig01-02a.png" width="48%" />
  <img src="../images/fig01-02b.png" width="48%" />
</div>

**Figure 1.2 — A two-panel montage.** *Author's own work.*
```

The filter emits a full-width band that breaks out of the two columns.

Requirements:

- The caption paragraph **must begin with bold text starting `Figure`** — that is
  the entire detection rule. `***Figure 1.1 …***` also works. A caption that
  starts with anything else is treated as ordinary prose.
- The caption must be **its own paragraph**, separated by a blank line.
- **Filename prefix `figNN-MM`** is what `FIG_SCALE` and `FIG_FULLWIDTH` key on
  in `figurize-mc.lua`. Without that prefix you cannot size a figure per-book.
- The **figure number in the caption wins** if it disagrees with the filename.

## Tables

Plain markdown pipe tables. The filter converts them to `tabular` and breaks them
out full-width, because `longtable` is illegal inside a column.

An optional titled heading above a table:

```markdown
::: {.tbl-heading}
**Table 1.1 — A titled table.**
:::

| Option | Cost |
|---|---|
| A | Low |
```

**Single-column layouts only.** `tblheading.lua` is not in the two-column filter
chain, and shouldn't be: `table-mc` breaks the table out to full page width while
the heading Div stays inside its column, so the two drift apart on the page. In a
two-column book, put the table's title in the caption line inside the float
instead (see `galley-recipe.md`, rule 7).

Very complex tables (multi-row headers, per-column widths) still need to be
hand-written as raw LaTeX — see `galley-recipe.md`, rule 7.

## Inline conventions

| Markup | Renders as | Notes |
|---|---|---|
| `[NPV]{.var}` | italic blue inline variable | for maths variables in prose |
| `` `\index{term}`{=latex} `` | an index entry | raw LaTeX, print only; invisible in EPUB |
| `[^c13-2]` + `[^c13-2]: …` | footnote | prefix ids per chapter to avoid collisions |
| `[text](url)` | link | fine anywhere |
| `<u>x</u>` | ✗ **not supported** | use `[x]{.underline}` |

Footnote definitions go at the **bottom of the chapter file**, in source order.
Gaps in the numbering are fine.

## Chapter ending

```markdown
## Endnotes

[^c13-1]: A footnote definition.
[^c13-2]: Another.

All references for this chapter are available at the companion site.

[View Chapter 13 References →](https://example.com/references/ch13.html)

<a href="https://example.com/references/ch13.html"><img src="../images/qr/ch13-refs.png" alt="Scan for chapter references" style="width: 120px;" /></a>
```

- **The `## Endnotes` H2 is required for the chapter-end ornament.** `chapterend.lua`
  keys on it: it replaces the heading with a centred `* * *` and removes the
  heading itself (print puts notes at the page foot, so a separate endnotes
  section is redundant). No `## Endnotes` heading means no ornament.
- A QR is recognised by its path containing `/qr/` **or** by the `120px` width
  convention. It becomes a boxed QR macro, styled by the link target: `/references/`
  → grey, `/tools/` or github → blue, `/demos/` → green.

## The master file

Chapters are pulled in with Quarto includes:

```markdown
{{< include ../chapters/Chapter-1-Some-Title.print.md >}}
```

Build the master so it includes canonical chapter files **directly**. Do not
maintain a second, hand-edited copy of each chapter in the build directory — that
split is a standing source of drift.

## Minimum viable input

To get something rendering, you need only:

- one `.md` per chapter with an `# N. Title` H1 and prose
- an `images/` folder if you have figures
- a master `.qmd` with the filter list, geometry and includes

Everything else — montages, QRs, index entries, `.var` spans, table headings — is
opt-in. Adopt each convention when you need it.

## What breaks, and how it shows up

| Input problem | Symptom |
|---|---|
| Caption not starting with bold `Figure` | Caption sets as body prose; image has no caption |
| Caption not its own paragraph | Same |
| Pipe table the filter missed | `longtable not in 1-column mode` — build fails |
| Bold inside a heading (`### **T**`) | `titlesec` error — build fails |
| Wrong image path | A visible `[missing image]` box in the PDF (build still succeeds) |
| No `## Endnotes` heading | No chapter-end ornament, silently |
| `<u>x</u>` | Passes through as literal HTML |
| Duplicate footnote ids across chapters | Pandoc renumbers or warns |

The missing-image case is deliberate: the preamble wraps `\includegraphics` to
draw a placeholder rather than fail, so a work-in-progress chapter still compiles.
**Check the rendered PDF for placeholder boxes** — they will not show up as errors.
