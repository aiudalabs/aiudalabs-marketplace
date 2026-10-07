---
name: aiuda-brand
description: "Produces Aiuda Labs branded business documents (proposals, training proposals, quotes, SOWs, one-pagers, reports, case studies) as print-ready PDF from branded HTML, or HTML or Word on request, in the exact visual identity of aiudalabs.com: Satoshi, Instrument Serif and JetBrains Mono, warm cream background, orange accent, eyebrow labels, dark footer and the <ai/>labs logo. Use for 'propuesta comercial', 'propuesta de capacitación', 'cotización', 'one-pager con la marca de Aiuda Labs', 'dame esto branded'. Applies only the Aiuda Labs brand. Not for writing a brand's guidelines (use `brand-guidelines`), checking a piece against a brand (use `brand-review`), or technical architecture pages (use `html-spec-generator`)."
license: MIT
compatibility: PDF output needs a headless browser (Playwright with Chromium) or WeasyPrint on the machine. Without one, the skill delivers the HTML and the user prints it to PDF from a browser.
metadata:
  version: "1.0.1"
  author: aiudalabs
---

# Aiuda Brand

Produce client- and stakeholder-facing documents that carry the exact Aiuda Labs identity: proposals, training proposals, quotes, statements of work, one-pagers, reports and case studies. The signature deliverable is a PDF the user can email to a client, rendered from a branded HTML source so it matches the website.

The brand lives in [references/DESIGN_SYSTEM.md](references/DESIGN_SYSTEM.md), verified against the source of aiudalabs.com. Read it before generating anything. It is canonical: never improvise hex values, fonts or component styles.

## When to use it

- A commercial or communication document that must look like Aiuda Labs: "propuesta", "propuesta de capacitación", "training proposal", "cotización", "SOW", "one-pager", "reporte branded", "case study", "caso de éxito", "aplícale la marca de Aiuda Labs".

Do not use it when:

- The user wants a technical architecture page: the `html-spec-generator` skill.
- The user wants clickable app screens: the `navegable-mockups` skill.
- The user wants guidelines written for a brand: the `brand-guidelines` skill.
- The user wants a piece checked against brand rules: the `brand-review` skill.
- The document must carry another company's brand: this skill only applies Aiuda Labs.
- The user wants plain content with no styling (a Markdown note, a chat message): just write it.
- The user wants an editable design source (Figma) or changes to the website itself: out of scope.

## Inputs

- [references/DESIGN_SYSTEM.md](references/DESIGN_SYSTEM.md), always.
- The content brief: client and recipient, the offer or scope, pricing if any, timeline, contact. Ask for whatever is missing and matters for the document type. Never invent commercial terms.

## Output

Two files in `./deliverables/` by default:

| File | Purpose |
| --- | --- |
| `{slug}.html` | Branded source, self-contained, opens by double-click; the PDF is rendered from it |
| `{slug}.pdf` | The send-ready deliverable |

`{slug}` is a short kebab-case id, for example `propuesta-capacitacion-acme`. On request: HTML only, PDF only, or `.docx`.

## Document structures

Starting points, adjusted to the actual content.

**Training proposal.** Cover (logo, title, client, date, prepared by) → Contexto y objetivo → Programa (table: module, topics, duration, format) → Metodología → Entregables → Cronograma → Inversión (only with numbers the user gave) → Sobre Aiuda Labs → Próximos pasos y contacto (contacto@aiudalabs.com) → dark footer.

**Commercial proposal or SOW.** Cover → Resumen ejecutivo (`.tldr`) → Alcance → Entregables → Fases y cronograma → Inversión → Supuestos y exclusiones → Términos → Sobre Aiuda Labs → Contacto → footer.

**One-pager.** One scrolling page, no cover: hero (eyebrow, H1, one-line value proposition) → three value blocks → proof or metrics row → one call to action.

**Report.** Cover → `.tldr` → sections with H2, prose, tables and callouts → Conclusiones → footer. Mermaid only when a flow genuinely needs a diagram, themed with the design system's `themeVariables`.

**Case study.** Cover → Cliente y reto → Solución → Resultados (metrics row with large numbers) → testimonial callout → Sobre Aiuda Labs → call to action → footer.

The section labels above are for documents in Spanish; write the document in the language the client reads, and keep the structure.

## Method

### 1. Read the design system

Read [references/DESIGN_SYSTEM.md](references/DESIGN_SYSTEM.md) in full. Do not continue without it.

### 2. Close the gaps in the brief

Identify the document type and ask only for what changes the document and cannot be invented responsibly: client and recipient, scope or modules, pricing, dates, required legal or commercial terms. With no pricing, either drop the Inversión section or leave a clearly marked placeholder and say so. Everything visual comes from the design system, not from the user.

### 3. Build the branded HTML

One self-contained file. The design system is canonical; this checklist only summarizes it:

1. Load the three fonts: Satoshi from Fontshare, Instrument Serif and JetBrains Mono from Google Fonts.
2. Every color through a CSS variable.
3. Page background `var(--bg)`, warm cream. Never white.
4. The `body::before` noise texture.
5. The `<ai/>labs` logo on the cover or header; the dark-background variant in the footer.
6. An eyebrow (line, mono uppercase, accent) before every section heading.
7. H1 and H2 at weight 900; accent words inside headings in `<em>` (Instrument Serif italic, accent color).
8. Dark footer (`background: var(--ink)`).
9. Components from the design system: `.card`, `.callout` and variants, `.tldr`, `.badge-*`, `.btn-*`, `.table-wrap`, `.eyebrow`, `.diagram-card`.
10. Inline `<style>` only. No frameworks, no JavaScript except the Mermaid CDN when a diagram is needed.

Where an example needs data, use realistic LATAM data (Panamá addresses, B/. or $ prices, Spanish names), but never fabricate the client's real terms.

Add print rules so the PDF paginates cleanly:

```css
@page { size: A4; margin: 18mm 16mm; }
@media print {
  body::before { display: none; }        /* noise muddies print */
  nav.site-nav { position: static; }
  .page-break { break-before: page; }
  .card, .callout, .tldr, .table-wrap { break-inside: avoid; }
  h2, h3 { break-after: avoid; }
  a { color: inherit; text-decoration: none; }
}
```

Put `<div class="page-break"></div>` between major sections (after the cover, before Inversión) so each starts on its own page.

### 4. Render the PDF

Write `./deliverables/{slug}.html`, then render it with whatever is available, in this order:

1. **Playwright with Chromium**, best fidelity for web fonts and CSS. Wait for `document.fonts.ready`, then `page.pdf({ printBackground: true, preferCSSPageSize: true })`.
2. **WeasyPrint**: `weasyprint {slug}.html {slug}.pdf`. Its web-font support is weaker; check that Satoshi actually embedded.

`printBackground: true` is mandatory: without it the cream background and the accent fills disappear. If neither renderer exists, deliver the HTML and tell the user to print it from Chrome with "Background graphics" on.

### 5. Check before handing off

- Satoshi renders in both HTML and PDF, not a fallback sans.
- The PDF background is cream.
- Logo on the cover and in the dark footer.
- An eyebrow before every section.
- Nothing overflows the page; sections break cleanly.
- No invented prices, dates or legal terms; every placeholder is marked.
- The accent appears on eyebrows, calls to action and italic heading words.
- The PDF text is selectable, not a rasterized image.

### 6. Hand off

Present both files with a short Spanish message: the HTML is the editable source, the PDF is what goes to the client. List any placeholders the user must fill. Do not oversell.

## Output formats

- **PDF** (default), always with its HTML source.
- **HTML only**, to host, embed or convert later.
- **Word (.docx)**, only when the user needs an editable Office file. Approximate the brand (accent color, heading weights, structure; Satoshi may fall back to a system font) and say plainly that Word cannot reproduce the web brand exactly.

## Anti-patterns

- **Inventing commercial terms**: prices, discounts, durations, headcounts, contract language.
- **White background.**
- **Substituting fonts** (Inter, DM Sans, Arial).
- **Hardcoded hex values.**
- **Frameworks, Tailwind or external JavaScript.**
- **Rendering without `printBackground`.**
- **Cloning the website.** Borrow the design language, not the marketing copy.
- **Stock photos.** Use gradient blocks or no imagery.
- **Overselling in the closing message.** The user judges by opening the file.

## Communication

- Spanish with the user; English in HTML comments.
- Cite tokens when explaining a choice ("el eyebrow usa `var(--accent)`, del design system").
- Be honest about fidelity: PDF from HTML is near exact, Word is an approximation.

## What this skill does not do

- Invent prices, dates, headcounts or legal terms.
- Produce Figma or editable design sources.
- Edit the aiudalabs.com website.
- Brand documents for any company other than Aiuda Labs.
- Design custom illustrations or icon sets.
