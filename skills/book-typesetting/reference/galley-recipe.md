# Galley recipe: one chapter's markdown → two-column proof PDF

A *galley proof* is a draft of typeset pages used for proofreading — see
`print-basics.md`. This converts a single chapter of markdown into a standalone
two-column proof PDF. It produces two files and renders them:

- `_chapter-NN-body.qmd` (NN zero-padded: 01, 14)
- `chapter-NN.qmd` (the wrapper)

```bash
quarto render chapter-NN.qmd --to pdf      # -> _output/chapter-NN.pdf
```

**Preserve body prose verbatim.** Keep spaced en-dashes ` – `, em-dashes, quote
characters, numbers and links exactly as written. This is restructuring, not
copyediting. Never rewrite the source `.md`; confine changes to the two
typesetting files.

## 1. The wrapper

Copy an existing wrapper verbatim, then change **only** these four things:

- `title:` — the chapter title with the `# Chapter N — Title` prefix removed
- `subtitle: "<Book Title> — Chapter N"` — bare number, no zero pad
- the running header: `\fancyhead[RO,LE]{\small\sffamily\itshape Ch.\,N~---~<Title>}`
  — bare number, en-dash written as `~---~`
- the include: `{{< include _chapter-NN-body.qmd >}}`

Do not touch the preamble. It already defines the `callout` tcolorbox style, the
`Y` tabularx column type, `\qrfig`, the titleformats for
section/subsection/subsubsection/paragraph, and loads
array/booktabs/tabularx/graphicx/ulem.

## 2. The body — transform rules, applied in order

**1. Title.** Delete the `# Chapter N — Title` heading line; it becomes the
wrapper title.

**2. Lead line.** The bold line right after it (`**Some Subtitle**`) becomes the
first line of the body:

```latex
\noindent\textit{\small Some Subtitle}
```

**3. Author's note.** The italic paragraph following the lead becomes a callout:

```latex
\begin{tcolorbox}[callout]
\small\itshape
<text, surrounding * removed>
\end{tcolorbox}
```

*Exception:* if the chapter opens with a `> *Author's note: ...*` blockquote,
leave it a blockquote.

**4. First rule.** Drop the first `---` immediately after the callout. Keep every
other `---` — they render as thematic rules.

**5. Figures.** Merge each image with its caption into one Pandoc figure:

```markdown
![**Figure N.x — <lead sentence>.** <middle explanation> *<trailing credit>*](../images/<file>){#fig-<slug>}
```

- Source captions appear as `**Figure N.x — ...**` or `***Figure N.x — ...***`.
  Strip the `***`; bold the label + lead sentence; keep middle explanation plain;
  italicize the trailing attribution (Photo/Image/Source/Via/Author's own work).
- Keep inline attribution links `[Name](URL)`.
- **Use the figure number from the caption**, even when the filename's number
  disagrees.
- Verify each image exists. If a path is broken (points at `~/Downloads`,
  `../../..`) but the file exists under `../images/`, repoint it. Report genuinely
  missing images and leave the path as-is.

**6. Raw HTML images.** `<img src="P" style="zoom:50%">` etc. become Pandoc images
with a width, so tall images do not swallow a column:

| Source | Width |
|---|---|
| `zoom:50%` | `{width=62%}` |
| `zoom:33%` | `{width=48%}` |
| tall phone screenshot | `{width=42%}` |

**7. Tables.** Pipe tables must become full-width raw-LaTeX floats — `longtable`
is illegal in two-column:

````markdown
```{=latex}
\begin{table*}[tbp]
\centering\footnotesize
\renewcommand{\arraystretch}{1.25}
\begin{tabularx}{\textwidth}{@{}<colspec>@{}}
\toprule
\textbf{H1} & \textbf{H2} \\
\midrule
cell & cell \\
\bottomrule
\end{tabularx}
\smallskip
{\footnotesize\RaggedRight\textbf{Table N.x — Title.} <rest of caption>}
\end{table*}
```
````

- colspec: narrow label columns `>{\bfseries}l` or `c`; wrapping text columns `Y`
  (equal share) or fixed `>{\raggedright\arraybackslash}p{0.NN\textwidth}` when one
  column needs more room. Widths should sum to roughly the text width.
- `\scriptsize` instead of `\footnotesize` for very text-heavy tables.
- In cells escape `&` `%` `_` `#`; convert `**x**` → `\textbf{x}` (or use a
  `>{\bfseries}` column); strip markdown links to plain text where needed.
- The table's caption paragraph goes inside the float and is removed from the body.

**8. Headings.** Strip bold markup inside headings (`### **Title**` → `### Title`)
— `titlesec` errors otherwise. Otherwise keep levels as-is.

**9.** `<u>x</u>` → `[x]{.underline}`.

**10. Endnotes + QR.** The source ends with `## Endnotes`, an "All references …
companion site." line, a `[View Chapter N References →](URL)` link, and an HTML
`<a href><img ... chNN-refs.png ...>` QR. Keep the heading, the line and the View
link; replace the HTML QR with `\qrfig{../images/qr/chNN-refs.png}` (NN
zero-padded).

A second tool/companion QR:

````markdown
```{=latex}
\begin{center}\includegraphics[width=0.22\linewidth]{../images/qr/<file>.png}\\[2pt]{\footnotesize\itshape <short label>}\end{center}
```
````

A `> **[COMPANION]** ...` blockquote (with its own QR) becomes a `callout`
tcolorbox containing the text — use `\href{URL}{link text}` for markdown links
inside raw LaTeX — plus a centred `\includegraphics[width=0.22\linewidth]{...}`
with an italic caption.

**11. Footnotes.** Keep all `[^n]: ...` definitions at the bottom in source order;
inline `[^n]` refs stay. Footnotes inside figure captions compile fine. A skipped
number in the source is fine — leave it.

**12. Dollar signs.** `$65 million`, `$250M to $6.4B` are fine as-is; pandoc does
not treat them as math here.

## 3. Render and fix

`quarto render chapter-NN.qmd --to pdf`. On failure read `chapter-NN.log`. Usual
causes: a pipe table that slipped through, a stray `<img>`, a heading with bold
markup, a wrong image path.

## 4. Verify and report

Confirm the PDF with `pdfinfo`. Eyeball a page:

```bash
pdftoppm -png -r 80 _output/chapter-NN.pdf /tmp/chk-NN/p
```

Report concisely: page count, file size, number of figures / tables / footnotes,
any QRs — **and** any source problems found (broken image paths, caption vs figure
number mismatches, missing images, malformed tables) plus any judgment calls made.

## Note on dual sources

This recipe produces a *second* representation of each chapter, separate from your
canonical prose. Keeping the two in sync is manual and drifts badly over a long
project.

**If you are starting a new book, don't do this.** Build the full-book master so it
includes the canonical chapter files directly, and use `figurize-mc.lua` to handle
the figure patterns. Reach for this recipe only for a one-off proof of a single
chapter, or when adopting a manuscript whose markdown you cannot restructure.
