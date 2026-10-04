#!/usr/bin/env python3
"""
Import a Word .docx manuscript into the layout this skill expects.

    import-docx.py manuscript.docx --target ./my-book
    import-docx.py manuscript.docx --target ./my-book --dry-run

Runs pandoc, then fixes the four things that pandoc alone gets wrong for a book:

  1. SPLITS the single markdown blob into one file per chapter, classifying each
     H1 as a chapter, front matter, or a part divider.
  2. REDISTRIBUTES footnotes. Pandoc emits every definition at the END of the
     document, so splitting by chapter otherwise strands all of them in the last
     file. Definitions are moved to the chapter that references them and
     renumbered per chapter ([^c12-1]) so ids cannot collide.
  3. LIFTS figure captions out of the alt text. Word captions usually arrive
     inside the image's alt text, escaped; this skill needs them as a separate
     bold paragraph *after* the image.
  4. RENAMES extracted media from pandoc's meaningless rId42.jpg to the
     figNN-MM-slug.ext convention the layout filters key on.

THIS IS A STARTING POINT, NOT A FINISHED CONVERSION. Word documents vary too
much for that. Read the report it prints, then the flagged files.

Requires: pandoc.
"""
import argparse
import os
import re
import shutil
import subprocess
import sys
import tempfile
from collections import OrderedDict

# Standard non-chapter divisions. Anything else that isn't "N. Title" or a part
# divider gets imported anyway and flagged for the human to rename.
FRONT_MATTER = {
    "copyright", "dedication", "epigraph", "foreword", "preface", "prologue",
    "acknowledgments", "acknowledgements", "introduction", "about the author",
    "contents", "table of contents", "conclusion", "afterword", "epilogue",
    "appendix", "glossary", "index", "bibliography", "notes", "references",
    "further reading", "colophon",
}
PART_RE = re.compile(r"^(arc|part|book|section)\b[\s:—–-]", re.I)
# "1. Title", "1) Title", "Chapter 1: Title", "CHAPTER 1 — Title", "Ch.1 Title"
CHAPTER_RE = re.compile(
    r"^(?:chapters?|ch\.?)\s*(\d+)\s*[:.\-—–]?\s*(.*)$|^(\d+)[.)]\s+(.*)$",
    re.I,
)
# A paragraph that is entirely bold -- how many Word manuscripts mark headings
# when the author never applied Word's Heading styles.
BOLD_ONLY_RE = re.compile(r"^\*\*([^*].*?)\*\*$")
# Which of those bold lines are chapter/part level rather than section level.
BOLD_H1_RE = re.compile(
    r"^(chapters?|ch\.|parts?|appendix|appendices|prologue|epilogue|foreword|"
    r"preface|introduction|conclusion|acknowledge?ments?|afterword|glossary|"
    r"index|bibliography|about the author)\b",
    re.I,
)
# One level of nested [] tolerated inside the alt text (links in captions).
IMAGE_RE = re.compile(
    r"!\[((?:[^\[\]]|\[[^\]]*\])*)\]\(([^)\s]+)(?:\s+\"[^\"]*\")?\)(\{[^}]*\})?"
)
FIGNUM_RE = re.compile(r"Figure\s+(\d+)[.\-](\d+)", re.I)
FOOTNOTE_DEF_RE = re.compile(r"^\[\^([^\]]+)\]:\s*(.*)$")
FOOTNOTE_REF_RE = re.compile(r"\[\^([^\]]+)\]")
# pandoc/Word leave an epub backlink at the head of each note: "[3](#ch007#fnref3). "
BACKLINK_RE = re.compile(r"^\[\d+\]\([^)]*\)\.\s*")
# Scripts the default Latin Modern face cannot render. LaTeX drops uncoverable
# characters SILENTLY, so this has to be caught at import time or it is only
# discovered in the printed proof.
NON_LATIN_RANGES = [
    ("CJK", r"[\u3000-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff00-\uffef]"),
    ("Hebrew", r"[\u0590-\u05ff]"),
    ("Arabic", r"[\u0600-\u06ff\u0750-\u077f]"),
    ("Cyrillic", r"[\u0400-\u04ff]"),
    ("Greek", r"[\u0370-\u03ff]"),
    ("Devanagari", r"[\u0900-\u097f]"),
]
CREDIT_RE = re.compile(
    r"\b(Photo|Photograph|Image|Illustration|Source|Courtesy|Credit|Via|Author)\b",
    re.I,
)

notes = []          # things the human must look at


def flag(msg):
    notes.append(msg)


def slugify(text, maxlen=48):
    """Lowercase slug, for image filenames."""
    s = re.sub(r"[^\w\s-]", "", text.lower())
    s = re.sub(r"[\s_]+", "-", s).strip("-")
    return (s[:maxlen].rstrip("-")) or "untitled"


def name_slug(text, maxlen=60):
    """Slug that PRESERVES the author's capitalisation, for chapter filenames.
    Title-casing here would mangle deliberate forms like "THAT" or "iOS"."""
    s = re.sub(r"[^\w\s-]", "", text)
    s = re.sub(r"[\s_]+", "-", s).strip("-")
    return (s[:maxlen].rstrip("-")) or "Untitled"


def unescape(text):
    """Undo pandoc's markdown escaping inside alt text."""
    return re.sub(r"\\([\\`*_{}\[\]()#+\-.!~])", r"\1", text)


def run_pandoc(docx, media_dir):
    out = subprocess.run(
        ["pandoc", str(docx), "-t", "markdown-smart", "--wrap=none",
         f"--extract-media={media_dir}", "-o", "-"],
        capture_output=True, text=True,
    )
    if out.returncode != 0:
        sys.exit(f"pandoc failed:\n{out.stderr.strip()}")
    return out.stdout


def collect_footnotes(md):
    """Pull every footnote definition out of the document body.

    Returns (body_without_definitions, {id: text}). Definitions may span
    continuation lines, which pandoc indents.
    """
    lines = md.split("\n")
    body, defs, i = [], OrderedDict(), 0
    while i < len(lines):
        m = FOOTNOTE_DEF_RE.match(lines[i])
        if not m:
            body.append(lines[i]); i += 1; continue
        fid, first = m.group(1), m.group(2)
        chunk, i = [first], i + 1
        while i < len(lines):
            nxt = lines[i]
            if nxt.strip() == "":
                # blank line only continues the note if indented text follows
                if i + 1 < len(lines) and re.match(r"^(\s{4,}|\t)", lines[i + 1]):
                    chunk.append(""); i += 1; continue
                break
            if re.match(r"^(\s{4,}|\t)", nxt):
                chunk.append(nxt.strip()); i += 1; continue
            break
        text = "\n".join(chunk).strip()
        defs[fid] = BACKLINK_RE.sub("", text)
    return "\n".join(body), defs


def promote_bold_headings(md):
    """Turn wholly-bold paragraphs into ATX headings.

    Many Word manuscripts never use Word's Heading styles -- the author just
    bolded the chapter and section titles. Pandoc faithfully reproduces that as
    bold paragraphs, so the document arrives with ZERO headings and nothing to
    split on. This promotes chapter/part-looking bold lines to H1 and the rest
    to H2, which is enough structure to work with.
    """
    out, n1, n2 = [], 0, 0
    for line in md.split("\n"):
        m = BOLD_ONLY_RE.match(line.strip())
        if not m:
            out.append(line); continue
        text = m.group(1).strip()
        if BOLD_H1_RE.match(text):
            out.append(f"# {text}"); n1 += 1
        else:
            out.append(f"## {text}"); n2 += 1
    return "\n".join(out), n1, n2


def split_sections(md):
    """Split on H1 into [(heading, body)]. Content before the first H1 is
    returned under the heading None."""
    parts, cur_head, cur = [], None, []
    for line in md.split("\n"):
        m = re.match(r"^#\s+(.*)$", line)
        if m:
            parts.append((cur_head, "\n".join(cur).strip()))
            cur_head, cur = m.group(1).strip(), []
        else:
            cur.append(line)
    parts.append((cur_head, "\n".join(cur).strip()))
    return [(h, b) for h, b in parts if h is not None or b]


def classify(heading):
    if heading is None:
        return ("preamble", None, None)
    plain = re.sub(r"[*_`]", "", heading).strip()
    m = CHAPTER_RE.match(plain)
    if m:
        num = m.group(1) or m.group(3)
        title = (m.group(2) if m.group(1) else m.group(4)) or ""
        return ("chapter", int(num), title.strip(" :.-—–") or f"Chapter {num}")
    if PART_RE.match(plain):
        return ("part", None, plain)
    if plain.lower().strip(" :") in FRONT_MATTER:
        return ("front", None, plain)
    return ("other", None, plain)


def rebuild_caption(raw, fignum):
    """Turn mangled alt text into `**Figure N.M — lead.** middle *credit*`."""
    clean = unescape(raw)
    clean = re.sub(r"\*+", "", clean).strip()          # drop stray emphasis
    clean = re.sub(r"^Figure\s+[\d.\-]+\s*[—–:-]?\s*", "", clean, flags=re.I).strip()
    if not clean:
        return f"**{fignum}**", ""
    credit = ""
    cm = CREDIT_RE.search(clean)
    if cm and cm.start() > 0:
        credit, clean = clean[cm.start():].strip(), clean[:cm.start()].strip()
    clean = clean.rstrip(" .")
    sm = re.search(r"(?<=[.!?])\s+", clean)
    if sm:
        lead, middle = clean[:sm.start()].rstrip(" ."), clean[sm.end():].strip()
    else:
        lead, middle = clean, ""
    cap = f"**{fignum} — {lead}.**"
    if middle:
        cap += f" {middle}"
    if credit:
        cap += f" *{credit}*"
    return cap, credit


def scan_claimed(md):
    """Every (chapter, figure) number the captions in the WHOLE document claim.

    Must be global, not per-section: all front matter maps to chapter 0, so a
    per-section scan lets the Introduction's real "Figure 0.1" collide with an
    uncaptioned image in the Foreword, both landing on fig00-01-*.
    """
    claimed = set()
    for m in IMAGE_RE.finditer(md):
        fm = FIGNUM_RE.search(unescape(m.group(1)))
        if fm:
            claimed.add((int(fm.group(1)), int(fm.group(2))))
    return claimed


def process_figures(body, chap_no, media_src, images_dir, dry, claimed):
    """Lift captions out of alt text, rename media, rewrite paths.

    `claimed` is shared across the whole import and mutated here, so numbers
    handed to uncaptioned images are unique document-wide.
    """
    default_cn = chap_no if chap_no is not None else 0

    def repl(m):
        alt, src, _attrs = m.group(1), m.group(2), m.group(3)
        fm = FIGNUM_RE.search(unescape(alt))
        if fm:
            cn, fn = int(fm.group(1)), int(fm.group(2))
        else:
            cn = default_cn
            fn = max((f for c, f in claimed if c == cn), default=0) + 1
            while (cn, fn) in claimed:
                fn += 1
            claimed.add((cn, fn))
            flag(f"ch{cn}: image {os.path.basename(src)} had no 'Figure N.M' "
                 f"caption — named fig{cn:02d}-{fn:02d}-untitled, caption left blank")
        if chap_no is not None and fm and cn != chap_no:
            flag(f"ch{chap_no}: caption says 'Figure {cn}.{fn}' but sits in "
                 f"chapter {chap_no} — kept the caption's number")
        label = f"Figure {cn}.{fn}"
        caption, _credit = (rebuild_caption(alt, label) if fm else (f"**{label} — TODO caption.**", ""))
        slug = slugify(re.sub(r"\*+", "", unescape(alt)).replace(label, "")) if fm else "untitled"
        ext = os.path.splitext(src)[1] or ".png"
        newname = f"fig{cn:02d}-{fn:02d}-{slug}{ext}"

        old = os.path.join(media_src, os.path.basename(src)) if not os.path.isabs(src) else src
        if not os.path.exists(old):
            cand = os.path.join(os.path.dirname(media_src), os.path.basename(src))
            old = cand if os.path.exists(cand) else old
        if os.path.exists(old):
            if not dry:
                shutil.copy2(old, os.path.join(images_dir, newname))
        else:
            flag(f"ch{cn}: source image not found for {src}")
        return f"![](../images/{newname})\n\n{caption}"

    return IMAGE_RE.sub(repl, body)


def process_footnotes(body, defs, chap_no, label):
    """Move the definitions this section references into it, renumbered."""
    used = [fid for fid in OrderedDict.fromkeys(FOOTNOTE_REF_RE.findall(body))
            if fid in defs]
    if not used:
        return body, 0
    prefix = f"c{chap_no}" if chap_no is not None else slugify(label or "fm")[:8]
    mapping = {fid: f"{prefix}-{i}" for i, fid in enumerate(used, 1)}
    body = FOOTNOTE_REF_RE.sub(
        lambda m: f"[^{mapping[m.group(1)]}]" if m.group(1) in mapping else m.group(0),
        body)
    block = "\n\n".join(f"[^{mapping[f]}]: {defs[f]}" for f in used)
    return body.rstrip() + "\n\n" + block + "\n", len(used)


def main():
    ap = argparse.ArgumentParser(
        description="Import a .docx manuscript into this skill's layout.")
    ap.add_argument("docx")
    ap.add_argument("--target", required=True,
                    help="project directory (created if absent)")
    ap.add_argument("--dry-run", action="store_true",
                    help="report what would happen; write nothing")
    ap.add_argument("--bold-headings", choices=["auto", "always", "never"],
                    default="auto",
                    help="treat wholly-bold paragraphs as headings. 'auto' (the "
                         "default) does so only when the file has no real "
                         "headings at all")
    args = ap.parse_args()

    if not shutil.which("pandoc"):
        sys.exit("error: pandoc not found on PATH")
    if not os.path.isfile(args.docx):
        sys.exit(f"error: no such file: {args.docx}")

    target = os.path.abspath(args.target)
    chapters_dir = os.path.join(target, "chapters")
    images_dir = os.path.join(target, "images")
    dry = args.dry_run

    tmp = tempfile.mkdtemp(prefix="docx-import-")
    try:
        md = run_pandoc(args.docx, os.path.join(tmp, "media"))
        media_src = os.path.join(tmp, "media", "media")
        if not os.path.isdir(media_src):
            media_src = os.path.join(tmp, "media")

        if not dry:
            os.makedirs(chapters_dir, exist_ok=True)
            os.makedirs(os.path.join(images_dir, "qr"), exist_ok=True)

        for label, pattern in NON_LATIN_RANGES:
            hits = re.findall(pattern, md)
            if hits:
                sample = "".join(dict.fromkeys(hits))[:12]
                flag(f"{label} characters present ({len(hits)} occurrences, e.g. "
                     f"{sample}) — the default Latin Modern font has NO glyphs for "
                     f"these and LaTeX drops them SILENTLY. Re-run init-book.sh "
                     f"with --cjk (or add a fallback font) before rendering")

        has_headings = re.search(r"^#{1,6}\s", md, re.M) is not None
        if args.bold_headings == "always" or (
                args.bold_headings == "auto" and not has_headings):
            md, n1, n2 = promote_bold_headings(md)
            if n1 or n2:
                flag(f"this .docx used no Word heading styles — promoted {n1} "
                     f"bold line(s) to chapter level and {n2} to section level. "
                     f"CHECK the split: a bolded pull-quote becomes a heading too")
            if not n1:
                flag("no chapter-level headings could be identified — every "
                     "section landed as front matter; check the .docx structure")

        body, defs = collect_footnotes(md)
        sections = split_sections(body)
        claimed = scan_claimed(body)

        counts = {"chapter": 0, "front": 0, "part": 0, "other": 0, "preamble": 0}
        written, total_figs, total_notes = [], 0, 0

        for heading, sec in sections:
            kind, num, title = classify(heading)
            counts[kind] = counts.get(kind, 0) + 1

            if kind == "preamble":
                if sec.strip():
                    flag("content before the first chapter heading was NOT "
                         "imported — usually the title/copyright page, which "
                         "book-print.qmd generates for you. Check nothing else "
                         "was in there")
                continue
            if kind == "part":
                flag(f"part divider '{title}' — convert it by hand into a "
                     f"\\part{{}} block in the master (see input-contract.md)")
            if kind == "other":
                flag(f"H1 '{title}' matched neither a chapter nor known front "
                     f"matter — imported as front matter, rename if wrong")

            n_figs = len(IMAGE_RE.findall(sec))
            sec = process_figures(sec, num, media_src, images_dir, dry, claimed)
            sec, n_notes = process_footnotes(sec, defs, num, title)
            total_figs += n_figs
            total_notes += n_notes

            if kind == "chapter":
                fname = f"Chapter-{num}-{name_slug(title)}.print.md"
                head = f"# {num}. {title}"
            else:
                fname = f"{name_slug(title)}.md"
                head = f"# {title}"

            content = f"{head}\n\n{sec.strip()}\n"
            if not dry:
                with open(os.path.join(chapters_dir, fname), "w", encoding="utf-8") as fh:
                    fh.write(content)
            written.append((fname, kind, n_figs, n_notes, len(content.split())))

        # ---- report ----------------------------------------------------------
        print(f"{'DRY RUN — nothing written' if dry else 'Imported'}: {args.docx}")
        print(f"  -> {chapters_dir}\n")
        print(f"{'file':<52}{'kind':<10}{'figs':>5}{'notes':>7}{'words':>8}")
        print("-" * 82)
        for fname, kind, f, n, w in written:
            print(f"{fname[:51]:<52}{kind:<10}{f:>5}{n:>7}{w:>8}")
        print("-" * 82)
        print(f"{len(written)} file(s): "
              + ", ".join(f"{v} {k}" for k, v in counts.items() if v)
              + f" | {total_figs} figures | {total_notes} footnotes")

        if len(defs) != total_notes:
            flag(f"{len(defs)} footnote definitions found but {total_notes} placed "
                 f"— {len(defs) - total_notes} were never referenced; check the docx")
        if os.path.exists(os.path.join(chapters_dir, "Chapter-1-Example.print.md")):
            flag("the scaffolder's starter chapter (Chapter-1-Example.print.md) is "
                 "still present — delete it and drop its include from book-print.qmd")

        print("\nNEEDS ATTENTION")
        if not notes:
            print("  (nothing flagged)")
        else:
            seen = set()
            for n in notes:
                if n not in seen:
                    print(f"  - {n}")
                    seen.add(n)

        print("""
NEXT
  1. Read reference/input-contract.md, then spot-check a converted chapter.
  2. Figure captions were reconstructed heuristically from Word's alt text --
     re-read them; the lead sentence / credit split is a guess.
  3. Add one {{< include >}} line per chapter to typesetting/book-print.qmd,
     in reading order. Run scripts/init-book.sh first if there is no project.
  4. Word footnotes became markdown footnotes; endnote-style references and any
     "## Endnotes" section have to be arranged by hand.""")
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


if __name__ == "__main__":
    main()
