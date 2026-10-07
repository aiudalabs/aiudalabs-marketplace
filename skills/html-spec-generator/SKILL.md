---
name: html-spec-generator
description: "Turns a project's spec documents into one navigable HTML reference (docs/architecture.html) with a sticky section nav, in the Aiuda Labs house style: the product layer when present (brief summary, D-xx decisions table, PRD requirements index with ids, screens index linked to the mockups) and the architecture (Mermaid diagrams of the system, core flows, data model, auth and deployment, tables, open questions), stamped with the date of each source document. Use for 'genera la arquitectura en HTML', 'spec navegable', 'página de arquitectura', 'quiero ver las especificaciones en una página', 'quiero el documento de arquitectura para compartir con el equipo', or to regenerate the page after a phase changed the docs. Architecture sections need docs/ARCHITECTURE.md from `system-architecture`. Not for client-facing proposals, quotes or reports (use `aiuda-brand`), clickable app screens (use `navegable-mockups`), or designing the architecture itself (use `system-architecture`)."
license: MIT
metadata:
  version: "1.1.0"
  author: aiudalabs
  requires: system-architecture
---

# HTML Spec Generator

Produce one HTML file that an engineer or a stakeholder double-clicks to navigate the spec of a project: what the product is and what was decided, what it must do, which screens it has, and how the system is built. No server, no build step. The content comes only from the spec documents.

The page uses the Aiuda Labs house style, defined in [references/DESIGN_SYSTEM.md](references/DESIGN_SYSTEM.md). Read that file before writing any HTML; it is the canonical source of every token, font, component class, the nav and the logo. Where this skill and the design system seem to disagree on a style, the design system wins.

## When to use it

- The user wants the spec, or the architecture, as a shareable, navigable HTML page.
- After `docs/ARCHITECTURE.md` is approved (Phase 5 of the product-spec workflow).
- **Again after any phase or coherence fix that changes a source document** (the brief, the decisions, the PRD, the schema, the screens, the architecture, the IAM requirements). The page is generated: it is only as current as its last run, and its stamp says which versions it shows.

Stop and redirect when:

- `docs/ARCHITECTURE.md` does not exist: run the `system-architecture` skill first, or, if the user wants to read the product documents now, offer a page with the product layer only, stamped as such.
- The user wants a proposal, quote, SOW, one-pager or report for a client: that is the `aiuda-brand` skill.
- The user wants clickable app screens: that is the `navegable-mockups` skill.
- The user wants a single diagram: draw the Mermaid block in the conversation instead.
- The user wants Figma or a PDF: out of scope.

## Inputs

Read every one that exists; each feeds the sections listed.

| File | Feeds |
| --- | --- |
| `docs/PRODUCT_BRIEF.md` | Product: tagline, apps and their ids, user groups, personas and their jobs (`J-<PERSONA>-<n>` ids) |
| `docs/OPINIONATED_DEFAULTS.md` | Decisions: every `D-xx` with its lock line; the `**Stack profile:**` line, to know which schema document and services apply |
| `docs/PRD.md` | Requirements: every `### FR-...` heading under its `## 5.x` capability group, user stories (`US-<n>`), non-functional requirements, open questions and assumptions |
| `docs/UI_SCREENS.md` | Screens: apps, screen ids and titles, key screens, the `s-<screen-id>` anchors |
| `docs/ARCHITECTURE.md` | Architecture: apps, services, integrations, execution units, flows, environments, deferred items, changes to earlier documents (§15), open questions and risks (§16) |
| The schema document | `docs/FIREBASE_SCHEMA.md` or `docs/DATA_SCHEMA.md`, whichever the stack profile produced: entities, state machines, access rules |
| `docs/IAM_REQUIREMENTS.md` | Service accounts and roles, when the profile produced it |
| `mockups/*.html` | Which key screens have a mockup to link to |
| [references/DESIGN_SYSTEM.md](references/DESIGN_SYSTEM.md) | Tokens, fonts, logo, nav, components, Mermaid theme |

## Output

`docs/architecture.html`: sticky nav, one section per topic, Mermaid diagrams, everything else inline. Keep only the sections whose source document exists and never invent one. The product layer comes first, so a reader meets the product before the system:

| # | Section | Source | Content |
| --- | --- | --- | --- |
| 0 | TL;DR | all | What the product does, for whom, how many apps, what backend; key counts as badges (decisions, requirements, screens, execution units) |
| 1 | Product | Brief | Tagline, apps table (id, users, platform), user groups and personas with their job ids |
| 2 | Decisions | Defaults | Table: id, title, the lock line; `deferred` and `existing` as badges |
| 3 | Requirements | PRD | Index table grouped by capability: id, title, the job ids it traces to, `deferred` badge; then the user stories by `US-<n>` id (by persona in a PRD written before story ids); the count of non-functional requirements |
| 4 | Screens | UI screens | Per app: id, title, a `key` badge for key screens; each id links to `UI_SCREENS.md#s-<screen-id>`, each key screen with a mockup also to `../mockups/<app-id>.html#s-<screen-id>` |
| 5 | System overview | Architecture | `flowchart TB` of apps, backend services and external integrations |
| 6 | Core flows | Architecture, schema | One `sequenceDiagram` per key journey |
| 7 | Data model | Schema | `erDiagram`, then a field table |
| 8 | Auth and security | Architecture, schema, IAM | Auth flow, roles table, service accounts, summary of the access rules |
| 9 | Deployment | Architecture | `flowchart LR` of environments and CI/CD, environment table |
| 10 | Open questions and risks | all | The architecture's open questions and risks with their severity, its changes to earlier documents, the PRD's assumptions (Step 1) |
| 11 | Sources | all | Each source document with its date (Step 6) |

The product sections are indexes, not copies: they give the ids and titles and point to the document for the full text. A reader finds `FR-BOOKING-2` and its title here, and reads its acceptance criteria in `PRD.md`.

## Method

### 1. Read the source documents

Read each input in full, at the start of the run. Extract, per section: apps; personas and job ids; every decision id and lock line; every requirement id, title and traced job ids; user story ids; screen ids and titles per app and which are key screens; backend services in use (for Firebase: Firestore, Auth, Functions, Storage; for FastAPI: API service, database, workers, queues); external integrations; entities with key fields; state machines; roles and claims; execution units; environments and pipeline; open items.

**Open items** come from the documents, in this order:

- `ARCHITECTURE.md` "Open questions and risks" (§16 of the `system-architecture` outline): every row, with the severity badge the row gives (`high` as `.badge-accent`, `medium` as `.badge-navy`, `low` as `.badge-neutral`) and its mitigation and status.
- `ARCHITECTURE.md` "Changes to earlier documents" (§15): each change with a `resolved` or `pending` badge, as the section states it.
- The PRD's open questions and assumptions, and every `[SUPUESTO]` marker in the other documents, with a kind badge (`assumption`, `open`, `deferred`).

An architecture written before that outline has no §16: then take its open, coherence or deferred-complexity section instead, and show a kind badge, never an invented severity.

Note each document's date for the stamp: the date of its last commit (`git log -1 --format=%cs -- <file>`), or its modification date when it has uncommitted changes or the project has no git history.

### 2. Read the design system

Read [references/DESIGN_SYSTEM.md](references/DESIGN_SYSTEM.md). Copy its `:root` variables verbatim into the page's `<style>`, load the three fonts exactly as it shows, and use its component classes: `.eyebrow`, `.tldr`, `.callout` and its variants, `.badge-*`, `.table-wrap`, `.diagram-card`, `nav.site-nav`, `footer.site-footer`.

The variables carry the fallback stacks (`system-ui`, `Georgia`, `monospace`), so the page stays readable when a font host is unreachable. Write every `font-family` through those variables, never a bare `"Satoshi"`.

Rule 12 of the design system (realistic LATAM placeholder data) is for deliverables that need illustrative data. This page has none: every name, number and label comes from the documents.

### 3. Plan the diagrams

Pick four to seven diagrams from what the architecture actually contains. Minimum: one system overview, one data model, one to three sequence diagrams for the most important flows. Tell the user which diagrams you will draw before writing the file.

Every node and entity maps to something in the documents; nothing is invented. Readability may still group what the documents list:

- Fold several services into one labeled node or a `subgraph` (`Eventarc + Scheduler` as one trigger node, the observability stack as one node) when drawing them one by one makes the overview unreadable.
- Leave cross-cutting services out of a diagram when they connect to everything (logging, error reporting, monitoring), and list them in a table under it instead.

Say what was grouped or left out in the diagram's caption.

### 4. Wire Mermaid

Load Mermaid from `https://cdn.jsdelivr.net/npm/mermaid@10.9.0/dist/mermaid.min.js` and initialize it with the `themeVariables` block from the design system, unchanged. Add `useMaxWidth: false` for the diagram types you draw, so a wide diagram keeps its natural size and scrolls inside its `.diagram-card` (which has `overflow-x: auto`) instead of shrinking its text to a few pixels:

```js
mermaid.initialize({
  startOnLoad: true,
  theme: 'base',
  themeVariables: { /* copied unchanged from DESIGN_SYSTEM.md */ },
  flowchart: { useMaxWidth: false },
  sequence: { useMaxWidth: false },
  er: { useMaxWidth: false }
});
```

**Diagrams need the network.** Mermaid comes from a CDN, so on a machine with no network, or behind a proxy that blocks jsDelivr, the diagrams cannot render. The page degrades instead of breaking: each `<pre class="mermaid">` holds the diagram source, which stays visible as text, and the script tag's `onerror` shows a note saying so:

```html
<script src="https://cdn.jsdelivr.net/npm/mermaid@10.9.0/dist/mermaid.min.js"
        onerror="document.documentElement.classList.add('no-mermaid')"></script>
<script>if (window.mermaid) mermaid.initialize({ /* as above */ });</script>
```

```css
pre.mermaid { font-family: var(--mono); font-size: 12px; white-space: pre; margin: 0; } /* the .diagram-card scrolls, not the pre */
.diagram-offline { display: none; }
.no-mermaid .diagram-offline { display: block; }
```

Put one `<div class="callout diagram-offline">Diagrams need a network connection to render; their Mermaid source is shown instead.</div>` near the top of the page. When the user needs a page that works fully offline, pre-render the diagrams to inline SVG as [references/checks.md](references/checks.md) describes, and drop the Mermaid script.

### 5. Build the sticky nav

`nav.site-nav` exactly as the design system defines it: `position: sticky`, links in the design system's nav style (Satoshi through `var(--display)`, 14 px, weight 500, `var(--ink3)`).

- The `<span>`-based logo from the design system on the left, copied as it is there, inline colors included (not the SVG favicon).
- One link per section on the right. With many sections, the link list scrolls horizontally on narrow screens (`overflow-x: auto; white-space: nowrap`) rather than wrapping.
- The section in view highlighted with `color: var(--accent)`, using an `IntersectionObserver`.

### 6. Build the sections

Every section opens with an eyebrow (`PRODUCT`, `DECISIONS`, `SYSTEM OVERVIEW`, `DATA MODEL`...), then an H2 in Satoshi 900, a short paragraph, then its diagram inside a `.diagram-card` with a `<pre class="mermaid">`, or its table inside a `.table-wrap`.

- **TL;DR**: `.tldr` block, two or three sentences, key counts as `.badge-accent`.
- **Product**: the tagline as a lead paragraph, the apps table, the personas table with their job ids.
- **Decisions**: every `D-xx`, in order, with its lock line. Ids in `var(--mono)`.
- **Requirements**: the index table grouped by area, then the user stories table. Link the section heading to `PRD.md`.
- **Screens**: one table per app; link targets as in the Output table, relative to `docs/`. Link a mockup only when its file exists. When `UI_SCREENS.md` has no `<a id="s-<screen-id>">` anchors (a document written before that convention), link the document without an anchor rather than to a dead one.
- **System overview**: real app, service and integration names.
- **Core flows**: one H3 per flow, one sentence of context ("When a player books a court..."), a `sequenceDiagram` that follows the state machine in the schema document.
- **Data model**: `erDiagram`, then a table of entity, key fields, types (as `.badge-neutral`), description.
- **Auth and security**: auth flow as `flowchart LR`, a roles table (role, claim or membership, can read, can write), the service accounts from `IAM_REQUIREMENTS.md` when it exists, a `.callout-navy` with the philosophy of the access rules.
- **Deployment**: `flowchart LR` from laptop to CI to emulators or test environment to staging to production; a table of environment, project or alias, deploy trigger.
- **Open questions and risks**: the open items from Step 1, with their severity or kind badge, source document and status.
- **Sources**: a table of each source document, its date, and what it feeds.

**Stamp.** Under the page title and in the footer: `Generated {YYYY-MM-DD} from {document} ({date}), ...`, with the dates from Step 1. A reader who sees a document dated after the page knows it is stale.

### 7. Assemble

One `<!DOCTYPE html>` file: `<head>` with charset, viewport, title, font links, the favicon SVG from the design system as a data URI, and one `<style>`; `<body>` with the nav, the stamp, the offline note, the sections with `id`s matching the nav links, the dark footer with the dark-background logo and the stamp, the Mermaid script, and one `<script>` with Mermaid initialization and the nav highlight.

Before writing, check that no source document changed since Step 1 (compare the dates). If one did, as when a coherence fix runs while this skill works, read it again and update the affected sections. Then write `docs/architecture.html`.

The page is committed with the docs. Whoever changes a source document later (a phase skill, the orchestrator's coherence check, a fix during the build) regenerates it with this skill, or leaves the stamp saying how old it is.

### 8. Check before handing off

Run the checks in [references/checks.md](references/checks.md), in a browser or headless:

- Every Mermaid block rendered to an SVG with no "Syntax error" text (Mermaid 10.9 draws an error diagram instead of blanking), or, with no network, the offline note shows and every source is readable.
- No diagram text smaller than about 11 px; wide diagrams scroll inside their card.
- Every nav anchor matches a section `id`, and every link to `UI_SCREENS.md#s-...` or a mockup points to an anchor or file that exists.
- Every id in the decisions, requirements and screens tables appears in its source document, and every id in the source appears in the table.
- Component styles use only CSS variables. Hex values appear only in `:root`, the design system's logo markup, the favicon data URI and the Mermaid `themeVariables`.
- The page background is `var(--bg)`, never white.
- The three fonts load when the network allows; without it, text renders in the fallback stacks with no broken layout.
- No horizontal page scroll at 1280 px and 375 px (cards and tables scroll inside themselves).
- No console errors other than unreachable font or Mermaid hosts, which the page handles.
- The stamp lists every source document read, with its date.

## Anti-patterns

- **Tailwind or any CSS framework.** One inline `<style>`.
- **JavaScript beyond Mermaid** and the nav highlight. No jQuery, no chart libraries.
- **White page background.**
- **Hex values in component styles** instead of variables.
- **Diagrams of components that are not in the spec.** The page documents reality; grouping is fine, inventing is not.
- **Truncated diagrams.** A half-drawn diagram is worse than none; write each one in full.
- **Copying the documents.** The product sections are indexes with ids; the documents hold the text.
- **Invented data**: severities, owners or dates the documents do not give.
- **Patching the HTML by hand.** Fix the source document and regenerate.

## Communication

- Spanish with the user; English in the page and in code comments.
- Cite the source when deciding ("según ARCHITECTURE.md §3, hay dos apps Flutter...").
- Say which diagrams you will generate, and what you will group, before writing.

## Next steps to offer

- **Share**: one file, no build. Without network it shows the text and the diagram sources; for a fully offline copy, pre-render the diagrams (Step 4).
- **Iterate**: if something is wrong, fix the source document and run this skill again. Do not patch the HTML by hand; it will drift from the spec.
- **Mockups**: the `navegable-mockups` skill builds the clickable app screens the Screens section links to.
