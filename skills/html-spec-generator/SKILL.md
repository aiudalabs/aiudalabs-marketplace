---
name: html-spec-generator
description: "Turns a project's architecture and data schema documents into one self-contained, navigable HTML technical reference (docs/architecture.html) with a sticky section nav, Mermaid diagrams of the system, core flows, data model, auth and deployment, tables and callouts, in the Aiuda Labs house style. Use for 'genera la arquitectura en HTML', 'spec navegable', 'página de arquitectura', 'quiero el documento de arquitectura para compartir con el equipo'. Needs docs/ARCHITECTURE.md from `system-architecture`. Not for client-facing proposals, quotes or reports (use `aiuda-brand`), clickable app screens (use `navegable-mockups`), or designing the architecture itself (use `system-architecture`)."
license: MIT
metadata:
  version: "1.0.0"
  author: aiudalabs
  requires: system-architecture
---

# HTML Spec Generator

Produce one HTML file that an engineer double-clicks to navigate the whole technical reference of a project: system overview, core flows, data model, auth, deployment, risks. No server, no build step. The audience is engineers and technical stakeholders; the content comes only from the spec documents.

The page uses the Aiuda Labs house style, defined in [references/DESIGN_SYSTEM.md](references/DESIGN_SYSTEM.md). Read that file before writing any HTML; it is the canonical source of every token, font and component class.

## When to use it

- The user wants the architecture as a shareable, navigable HTML page.
- After `docs/ARCHITECTURE.md` is approved (Phase 5 of the product-spec workflow), or at any later point when the architecture changes.

Stop and redirect when:

- `docs/ARCHITECTURE.md` does not exist: run the `system-architecture` skill first.
- The user wants a proposal, quote, SOW, one-pager or report for a client: that is the `aiuda-brand` skill.
- The user wants clickable app screens: that is the `navegable-mockups` skill.
- The user wants a single diagram: draw the Mermaid block in the conversation instead.
- The user wants Figma or a PDF: out of scope.

## Inputs

| File | Use |
| --- | --- |
| `docs/ARCHITECTURE.md` | Required. Apps, services, integrations, flows, environments, risks |
| The schema document | `docs/FIREBASE_SCHEMA.md` or `docs/DATA_SCHEMA.md`, whichever the stack profile produced. Entities, state machines, access rules |
| `docs/PRODUCT_BRIEF.md` | Product and app names, personas, for real labels |
| `docs/OPINIONATED_DEFAULTS.md` | The `**Stack profile:**` line, to know which schema document and services apply |
| [references/DESIGN_SYSTEM.md](references/DESIGN_SYSTEM.md) | Tokens, fonts, logo, components, Mermaid theme |

## Output

`docs/architecture.html`: sticky nav, one section per topic, Mermaid rendered in the browser from the CDN, everything else inline.

Default sections; keep only those the documents support and never invent one:

| # | Section | Content |
| --- | --- | --- |
| 0 | TL;DR | One paragraph: what the system does, how many apps, what backend, key numbers as badges |
| 1 | System overview | `flowchart TB` of apps, backend services and external integrations |
| 2 | Core flows | One `sequenceDiagram` per key journey (booking, onboarding, payment...) |
| 3 | Data model | `erDiagram` of the entities, then a field table |
| 4 | Auth and security | Auth flow, roles table, summary of the access rules |
| 5 | Deployment | `flowchart LR` of environments and CI/CD, environment table |
| 6 | Risks and open questions | Table of risks, severity, mitigation, status |

## Method

### 1. Read the source documents

Read the architecture and schema documents in full and extract: apps; backend services in use (for Firebase: Firestore, Auth, Functions, Storage; for FastAPI: API service, database, workers, queues); external integrations (payments, maps, notifications); entities with key fields; state machines; roles and claims; functions or endpoints inventory; environments and pipeline; risks and open decisions.

### 2. Read the design system

Read [references/DESIGN_SYSTEM.md](references/DESIGN_SYSTEM.md). Copy its `:root` variables verbatim into the page's `<style>`, load the three fonts exactly as it shows, and use its component classes: `.eyebrow`, `.tldr`, `.callout` and its variants, `.badge-*`, `.table-wrap`, `.diagram-card`, `nav.site-nav`, `footer.site-footer`.

### 3. Plan the diagrams

Pick four to seven diagrams from what the architecture actually contains. Minimum: one system overview, one data model, one to three sequence diagrams for the most important flows. Each node and entity must exist in the documents. Tell the user which diagrams you will draw before writing the file.

Load Mermaid from `https://cdn.jsdelivr.net/npm/mermaid@10.9.0/dist/mermaid.min.js` and initialize it with the `themeVariables` block from the design system, unchanged.

### 4. Build the sticky nav

`nav.site-nav` from the design system, fixed to the top:

- The `<span>`-based inline logo from the design system on the left (not the SVG favicon).
- One link per section on the right, JetBrains Mono 12 px uppercase.
- The section in view highlighted with `color: var(--accent)`, using an `IntersectionObserver`.

### 5. Build the sections

Every section opens with an eyebrow (`SYSTEM OVERVIEW`, `DATA MODEL`...), then an H2 in Satoshi 900, a short paragraph, then its diagram inside a `.diagram-card` with a `<pre class="mermaid">`.

- **TL;DR**: `.tldr` block, two or three sentences, key numbers as `.badge-accent`.
- **System overview**: real app, service and integration names.
- **Core flows**: one H3 per flow, one sentence of context ("When a customer books a court..."), a `sequenceDiagram` that follows the state machine in the schema document.
- **Data model**: `erDiagram`, then a table of entity, key fields, types (as `.badge-neutral`), description.
- **Auth and security**: auth flow as `flowchart LR`, a roles table (role, claim, can read, can write), a `.callout-navy` with the philosophy of the access rules.
- **Deployment**: `flowchart LR` from laptop to CI to emulators or test environment to staging to production; a table of environment, project or alias, deploy trigger.
- **Risks and open questions**: table with a severity badge; take every row from `ARCHITECTURE.md`.

### 6. Assemble

One `<!DOCTYPE html>` file: `<head>` with charset, viewport, title, font links, the favicon SVG from the design system as a data URI, and one `<style>`; `<body>` with the nav, the sections with `id`s matching the nav links, the dark footer with the dark-background logo, and one `<script>` with Mermaid initialization and the nav highlight. Write it to `docs/architecture.html`.

### 7. Check before handing off

- Every diagram uses only nodes and entities that exist in the documents.
- Every Mermaid block parses (a parse error silently blanks the diagram); open the file and look.
- Every nav anchor matches a section `id`.
- Component styles use only CSS variables; no stray hex values.
- The page background is `var(--bg)`, never white.
- All three fonts load.
- Real product names from the brief; no Lorem ipsum, no placeholder company names.
- No console errors.

## Anti-patterns

- **Tailwind or any CSS framework.** One inline `<style>`.
- **JavaScript beyond Mermaid.** No jQuery, no chart libraries.
- **White page background.**
- **Hex values in component styles** instead of variables.
- **Diagrams of components that are not in the spec.** The page documents reality.
- **Truncated diagrams.** A half-drawn diagram is worse than none; write each one in full.
- **Placeholder data.**

## Communication

- Spanish with the user; English in the page and in code comments.
- Cite the source when deciding ("según ARCHITECTURE.md §3, hay dos apps Flutter...").
- Say which diagrams you will generate before writing.

## Next steps to offer

- **Share**: the file is self-contained; it can go by email or chat.
- **Iterate**: if a diagram is wrong, fix `docs/ARCHITECTURE.md` (or the schema document) and run this skill again. Do not patch the HTML by hand; it will drift from the spec.
- **Mockups**: the `navegable-mockups` skill builds the clickable app screens.
