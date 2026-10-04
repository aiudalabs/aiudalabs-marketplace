# What you need before you start

Everything to gather **once**, up front. Collect it all before step one rather than
discovering each item mid-flow.

Check the machine first:

```bash
~/.claude/skills/book-typesetting/scripts/doctor.sh
```

It reports what is present, what is missing, and the exact install command for
each gap. Exit 1 means something required is missing.

Once it passes, you can have a rendering book project in one command — you do not
need any of the layout files yourself:

```bash
~/.claude/skills/book-typesetting/scripts/init-book.sh \
    --title "My Book" --author "A. Writer" --trim 6x9 --columns 1 ./my-book
cd my-book/typesetting && quarto render book-print.qmd --to pdf
```

## 1. Software

| Tool | Needed for | Install |
|---|---|---|
| **Quarto** | rendering markdown → PDF/EPUB | `brew install --cask quarto` |
| **LaTeX** | the PDF engine Quarto drives | `quarto install tinytex` |
| **Ghostscript** | RGB → CMYK PDF/X-1a | `brew install ghostscript` |
| **Python 3** | the TrimBox / verify passes | preinstalled on macOS |
| **pikepdf** | PDF surgery | `pip3 install pikepdf`, or install `uv` and the scripts fetch it |
| **Inkscape** | cover SVG → PDF — **covers only** | `brew install --cask inkscape` |
| **poppler** | proof rasters, page counts | `brew install poppler` |

Two notes worth knowing in advance:

- **`quarto install tinytex` puts LaTeX somewhere not on your `PATH`** (usually
  `~/Library/TinyTeX`). That is fine — Quarto finds it. `doctor.sh` looks there too.
  Don't conclude LaTeX is missing because `which xelatex` comes up empty.
- **Inkscape has no substitute for covers.** rsvg, cairosvg and ImageMagick
  silently drop SVG 1.2 flowed text, producing a cover with the back-cover blurb
  missing and no error. If you're only doing the interior, skip it.

## 2. Accounts

Decide *where* you're printing before designing anything, because each service
dictates its own trim sizes, margins and cover geometry.

| | IngramSpark | Amazon KDP |
|---|---|---|
| Reaches | bookstores, libraries, global distribution | Amazon only |
| Hardcover | yes, incl. case laminate | limited |
| Setup fee | sometimes charged; waivers are common | none |
| Proof copies | paid | paid |
| Best for | wide distribution, hardcover | Amazon-first, simplest start |

Many authors use **both** — KDP for Amazon, IngramSpark for everyone else. That's
also why this skill's default interior geometry is built to satisfy both at once,
so one interior file serves both editions.

Neither requires a paid subscription. You will need bank details and tax
information (a W-8BEN or equivalent if you're outside the US) before you can
publish, so gather those early — that step blocks publication, not layout.

## 3. An ISBN

- One ISBN **per format**: paperback, hardcover and ebook each need their own.
- KDP will give you a free ISBN, but it lists Amazon as publisher and **cannot be
  used elsewhere**. If you intend to distribute through IngramSpark too, buy your
  own.
- Buying your own means your imprint is the publisher. Prices vary by country;
  blocks of 10 are far better value than singles.
- You need the ISBN **before generating the cover template** — it's part of the
  barcode and the template filename.

## 4. Decisions to make before laying out a page

Have answers ready; changing any of these later means redoing work.

- **Trim size.** 6×9 is the trade-paperback default; 8×10 suits illustrated or
  technical books. Everything downstream follows from this.
- **Binding(s).** Paperback, case-laminate hardcover, or both.
- **Interior colour.** Black-and-white is dramatically cheaper. Premium colour
  costs more per page and changes the price you must charge.
- **Paper stock.** White or cream. Affects spine width.
- **One column or two.** Pass `--columns 2` for technical or illustrated books,
  `--columns 1` for narrative non-fiction and fiction. The scaffolder builds a
  different filter chain for each, so decide before generating.
- **Fonts**, and whether their licences permit embedding in a commercial PDF.

## 5. If your manuscript is already written

Word `.docx` imports directly:

```bash
~/.claude/skills/book-typesetting/scripts/import-docx.py \
    manuscript.docx --target ./my-book --dry-run
```

See `input-contract.md` for what it does and what it leaves for you. Google Docs
and Apple Pages both export to `.docx`, so route through that. Scrivener compiles
to markdown directly — prefer that over its `.docx` export.

## 6. Content you'll need beyond the chapters

Easy to forget until they block you:

- Title page, copyright page, dedication, table of contents
- Back-cover blurb, author bio, author photo
- Cover artwork at print resolution (~300 dpi at final printed size)
- Any endorsements or foreword
- Index, if the book needs one

## 7. Order of operations

The dependencies are real — each step needs the one before it finished.

```
1. choose trim size + binding + printer
2. get ISBN(s)
3. build and FINALIZE the interior          ← page count must stop changing
4. read the final page count from the PDF
5. download the cover template for THAT page count
6. build the cover artwork inside it
7. convert both to CMYK PDF/X-1a
8. verify both                              ← verify-pdfx.py
9. upload, order a physical proof
10. approve for sale
```

**Step 3 must finish before step 5.** Spine width is computed from the page count;
editing a chapter after building the cover invalidates the cover.

## 8. Gotchas, stated in advance

- **Page count drives spine width.** The single most common way to waste a day.
- **Rejection messages mislead.** A cover built to the wrong overall size is often
  reported as "elements outside the safety area." Check size first.
- **Some rejections are silent** — leftover hyperlink annotations from your
  authoring tool are a classic cause. Always run `verify-pdfx.py` before uploading.
- **Screens lie about colour.** CMYK cannot reproduce vivid screen blues and
  greens. Order a physical proof before approving.
- **Screenshots will look soft.** Web images are 72–96 dpi against a 300 dpi
  target. Usually unavoidable; just don't be surprised.
- **Uploads are slow and validation takes minutes.** Budget time; don't leave it
  to the evening before a launch.
- **Never approve for sale without holding a printed proof.** Margins, type size
  and colour all read differently on paper.

## Then what

Read `print-basics.md` for the vocabulary, then follow the route in `SKILL.md`.
