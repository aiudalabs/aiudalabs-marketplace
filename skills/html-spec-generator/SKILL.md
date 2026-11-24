---
name: html-spec-generator
description: "Turns a project's spec documents into one navigable HTML reference (docs/architecture.html) with a sticky section nav, in the Aiuda Labs house style or a neutral one: the product layer when present (brief summary, D-xx decisions table, PRD requirements index with ids, screens index linked to the mockups) and the architecture (Mermaid diagrams of the system, core flows, data model, auth and deployment, tables, open questions), stamped with each source version. Use for 'genera la arquitectura en HTML', 'spec navegable', 'página de arquitectura', 'quiero ver las especificaciones en una página', 'quiero el documento de arquitectura para compartir con el equipo', or to regenerate the page after a phase changed the docs. Architecture sections need docs/ARCHITECTURE.md from `system-architecture`. Not for client-facing proposals, quotes or reports (use `aiuda-brand`), clickable app screens (use `navegable-mockups`), or designing the architecture itself (use `system-architecture`)."
license: MIT
metadata:
  version: "1.1.0"
  author: aiudalabs
  requires: system-architecture
---

# HTML Spec Generator

Produce one HTML file that an engineer or a stakeholder double-clicks to navigate the spec of a project: what the product is and what was decided, what it must do, which screens it has, and how the system is built. No server, no build step. The content comes only from the spec documents.

**Style.** The project chooses it once, in `project-kickstart` (question "Aiuda Labs look"). Read the answer, first match wins:

1. The `**Spec page style:**` line in `AGENTS.md`, or the "Aiuda Labs look for the spec page" line in `docs/SESSION.md`.
2. Neither line (later phases rewrite both files): `docs/AIUDA_HOUSE_STYLE.md` exists means yes, otherwise no.
3. Not a kickstarted project (no `AGENTS.md`): ask once ("¿La página lleva el estilo Aiuda Labs o uno neutro?"); neutral by default.

- **yes**: the Aiuda Labs house style, [references/DESIGN_SYSTEM.md](references/DESIGN_SYSTEM.md). Always read this bundled copy; `docs/AIUDA_HOUSE_STYLE.md` only records the choice and may be older.
- **no**: the neutral style, [references/NEUTRAL_STYLE.md](references/NEUTRAL_STYLE.md): the same layout and components with a neutral palette and system fonts. Read DESIGN_SYSTEM.md too, for the components.

Read the chosen file before writing any HTML. Where this skill and the design system seem to disagree on a style, the design system wins. Either style is for this page only: the product's own tokens (docs/UI_SCREENS.md) never style it, and it never becomes the product's identity.

## When to use it

- The user wants the spec, or the architecture, as a shareable, navigable HTML page.
- Under `product-spec-orchestrator`: at the handoff, after Phase 6, and again after every approved change to a source document.
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
| [references/DESIGN_SYSTEM.md](references/DESIGN_SYSTEM.md), [references/NEUTRAL_STYLE.md](references/NEUTRAL_STYLE.md) | Tokens, fonts, logo, nav, components, Mermaid theme, per the chosen style |

## Output

`docs/architecture.html`: sticky nav, one section per topic, Mermaid diagrams, everything else inline. Keep only the sections whose source document exists and never invent one. The product layer comes first, so a reader meets the product before the system:

| # | Section | Source | Content |
| --- | --- | --- | --- |
| 0 | TL;DR | all | What the product does, for whom, how many apps, what backend; key counts as badges (decisions, requirements, screens, execution units) |
| 1 | Product | Brief | Tagline, apps table (id, users, platform), user groups and personas with their job ids |
| 2 | Decisions | Defaults | Table: id, title, the lock line; `deferred` and `existing` as badges |
| 3 | Requirements | PRD | Index table grouped by capability: id, title, the job ids it traces to, `deferred` badge; then the user stories by `US-<n>` id (by persona in a PRD written before story ids); the non-functional requirements summarized by kind as the PRD groups them ("9 budgets, 4 yes/no checks"), never one invented total |
| 4 | Screens | UI screens | Per app: id, title, a `key` badge for key screens; each id links to `UI_SCREENS.md#s-<screen-id>` (Step 6, links), each key screen with a mockup also to `../mockups/<app-id>.html#s-<screen-id>` |
| 5 | System overview | Architecture | `flowchart TB` of apps, backend services and external integrations |
| 6 | Core flows | Architecture, schema | One `sequenceDiagram` per key journey |
| 7 | Data model | Schema | `erDiagram`, then a field table |
| 8 | Auth and security | Architecture, schema, IAM | Auth flow, roles table, service accounts, summary of the access rules |
| 9 | Deployment | Architecture | `flowchart LR` of environments and CI/CD, environment table |
| 10 | Open questions and risks | all | The architecture's open questions and risks with their severity, its changes to earlier documents, the PRD's open questions and assumptions (Step 1) |
| 11 | Sources | all | Each source document with its version (Step 1) |

The product sections are indexes, not copies: they give the ids and titles and point to the document for the full text. A reader finds `FR-BOOKING-2` and its title here, and reads its acceptance criteria in `PRD.md`.

## Method

### 1. Read the source documents

Read each input in full, at the start of the run. Extract, per section: apps; personas and job ids; every decision id and lock line; every requirement id, title and traced job ids; user story ids; screen ids and titles per app and which are key screens; backend services in use (for Firebase: Firestore, Auth, Functions, Storage; for FastAPI: API service, database, workers, queues); external integrations; entities with key fields; state machines; roles and claims; execution units; environments and pipeline; open items.

**Open items** come from the documents, in this order:

- `ARCHITECTURE.md` "Open questions and risks" (§16 of the `system-architecture` outline): every row, with the severity badge it gives (`high` as `.badge-accent`, `medium` as `.badge-navy`, `low` as `.badge-neutral`) and what would resolve it.
- `ARCHITECTURE.md` "Changes to earlier documents" (§15): each item with its document and change.
- The PRD's open questions and assumptions, and every `[SUPUESTO]` marker in the other documents, with a kind badge (`assumption`, `open`, `deferred`).

Add a `resolved` badge (`.badge-emerald`) to any item the document itself marks resolved or applied (the orchestrator's coherence check marks §15 items applied). Show no status the document does not state.

An architecture written before that outline has no §16: then take its open, coherence or deferred-complexity section instead, and show a kind badge, never an invented severity.

Note each document's version for the stamp and the Step 7 check:

- Committed and unchanged: short hash and date of its last commit (`git log -1 --format='%h %cs' -- <file>`).
- Uncommitted changes, or no git: `uncommitted` and its modification time to the minute (`date -r <file> '+%Y-%m-%d %H:%M'`).
- Also a content hash (`git hash-object <file>` or `sha256sum`), kept for Step 7, not printed.

### 2. Read the design system

Read [references/DESIGN_SYSTEM.md](references/DESIGN_SYSTEM.md), and [references/NEUTRAL_STYLE.md](references/NEUTRAL_STYLE.md) for the neutral style. Copy the chosen style's `:root` variables verbatim into the page's `<style>`, load the fonts exactly as it shows (none for the neutral style), and use its component classes: `.eyebrow`, `.tldr`, `.callout` and its variants, `.badge-*`, `.table-wrap`, `.diagram-card`, `nav.site-nav`, `footer.site-footer`.

The variables carry the fallback stacks (`system-ui`, `Georgia`, `monospace`), so the page stays readable when a font host is unreachable. Write every `font-family` through those variables, as the design system's own CSS does; only the logo markup and the favicon spell font names out.

Rule 12 of the design system (realistic LATAM placeholder data) is for deliverables that need illustrative data. This page has none: every name, number and label comes from the documents.

### 3. Plan the diagrams

Pick four to seven diagrams from what the architecture actually contains. Minimum: one system overview, one data model, one to three sequence diagrams for the most important flows. Tell the user which diagrams you will draw before writing the file.

Every node and entity maps to something in the documents; nothing is invented. Readability may still group what the documents list:

- Fold several services into one labeled node or a `subgraph` (`Eventarc + Scheduler` as one trigger node, the observability stack as one node) when drawing them one by one makes the overview unreadable.
- Leave cross-cutting services out of a diagram when they connect to everything (logging, error reporting, monitoring), and list them in a table under it instead.

Say what was grouped or left out in the diagram's caption.

**Width ceiling.** A diagram whose natural width exceeds about twice its card's width (about 2,200 px at a 1,280 px viewport) is unreadable even scrolling. Compact it first: edges between subgraphs rather than between every node, long labels wrapped with `<br/>`, `TB` instead of `LR`. Still too wide: split it (one overview of groups, then one diagram per group; one sequence per phase of a long flow).

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

**Escape the source.** Inside `<pre class="mermaid">`, write `&` as `&amp;`, `<` as `&lt;` and `>` as `&gt;` (so `<br/>` is `&lt;br/&gt;`). Mermaid decodes them before parsing, and the offline view then shows the source as written.

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

`nav.site-nav` exactly as the design system defines it: `position: sticky`, links in the design system's nav style (`var(--display)`, 14 px, weight 500, `var(--ink3)`).

- On the left, the `<span>`-based logo from the design system, copied as it is there, inline colors included (not the SVG favicon); in the neutral style, the project's name.
- On the right, one link per section inside a wrapper that scrolls sideways when the links do not fit, at any width:

```css
nav.site-nav { gap: 24px; }
nav.site-nav > :first-child { flex-shrink: 0; }
.nav-links { display: flex; gap: 20px; min-width: 0; overflow-x: auto; white-space: nowrap; scrollbar-width: none; }
```

- The section in view highlighted with `color: var(--accent)`, using an `IntersectionObserver`, which also scrolls the active link into view inside `.nav-links`.

### 6. Build the sections

Every section opens with an eyebrow (`PRODUCT`, `DECISIONS`, `SYSTEM OVERVIEW`, `DATA MODEL`...), then an H2 in Satoshi 900, a short paragraph, then its diagram inside a `.diagram-card` with a `<pre class="mermaid">`, or its table inside a `.table-wrap`.

- **TL;DR**: `.tldr` block, two or three sentences, key counts as `.badge-accent`.
- **Product**: the tagline as a lead paragraph, the apps table, the personas table with their job ids.
- **Decisions**: every `D-xx`, in order, with its lock line. Ids in `var(--mono)`.
- **Requirements**: the index table grouped by area, then the user stories table, then the non-functional summary. Link the section heading to `PRD.md`.
- **Screens**: one table per app; link targets as in the Output table, relative to `docs/`. Link a mockup only when its file exists. When `UI_SCREENS.md` has no `<a id="s-<screen-id>">` anchors (a document written before that convention), link the document without an anchor rather than to a dead one.
- **System overview**: real app, service and integration names.
- **Core flows**: one H3 per flow, one sentence of context ("When a player books a court..."), a `sequenceDiagram` that follows the state machine in the schema document.
- **Data model**: `erDiagram`, then a table of entity, key fields, types (as `.badge-neutral`), description.
- **Auth and security**: auth flow as `flowchart LR`, a roles table (role, claim or membership, can read, can write), the service accounts from `IAM_REQUIREMENTS.md` when it exists, a `.callout-navy` with the philosophy of the access rules.
- **Deployment**: `flowchart LR` from laptop to CI to emulators or test environment to staging to production; a table of environment, project or alias, deploy trigger.
- **Open questions and risks**: the open items from Step 1, with their severity or kind badge, source document, and the `resolved` badge where the document gives one.
- **Sources**: a table of each source document, its version, and what it feeds.

**Links to documents.** A browser opening the page from disk shows a `.md` file as raw text and ignores its anchors. When the project has a Git host remote (`git remote get-url origin`), link each document to its rendered page there (`https://<host>/<owner>/<repo>/blob/<default branch>/docs/UI_SCREENS.md#s-<screen-id>`). Without one, keep the relative links and say under the Sources table that they open on the Git host or in a Markdown viewer. Mockup links stay relative: they work from disk.

**Stamp.** Under the page title and in the footer: `Generated {YYYY-MM-DD HH:MM} from {document} ({version}), ...`, with the versions from Step 1. A reader who sees a newer commit, or a later modification, of a listed document knows the page is stale.

### 7. Assemble

One `<!DOCTYPE html>` file: `<head>` with charset, viewport, title, font links, the favicon SVG from the design system as a data URI, and one `<style>`; `<body>` with the nav, the stamp, the offline note, the sections with `id`s matching the nav links, the dark footer with the dark-background logo and the stamp, the Mermaid script, and one `<script>` with Mermaid initialization and the nav highlight.

Before writing, hash each source document again and compare with Step 1 (dates cannot see a change made the same day). If one changed, as when a coherence fix runs while this skill works, read it again, update the affected sections and its version in the stamp. Then write `docs/architecture.html`.

The page is committed with the docs. Whoever changes a source document later (an approved phase iteration, a coherence fix, a fix during the build) regenerates it with this skill, or leaves the stamp saying how old it is.

### 8. Check before handing off

Run the checks in [references/checks.md](references/checks.md), in a browser or headless:

- Every Mermaid block rendered to an SVG with no "Syntax error" text (Mermaid 10.9 draws an error diagram instead of blanking), or, with no network, the offline note shows and every source is readable.
- No diagram text smaller than 11 px; wide diagrams scroll inside their card, and none is wider than twice it (Step 3).
- Every nav anchor matches a section `id`, and every link to a document or a mockup points to a file, and an anchor, that exists.
- Every id in the decisions, requirements and screens tables appears in its source document, and every id in the source appears in the table.
- Component colors come from the variables; the only literals are the design system's own `rgba()` translucencies and `white`, copied as it writes them. Hex values appear only in `:root`, the design system's logo markup, the favicon data URI and the Mermaid `themeVariables`.
- The page background is `var(--bg)`, never white.
- House style: the three fonts load when the network allows; without it, text renders in the fallback stacks with no broken layout.
- No horizontal page scroll at 1280 px and 375 px (cards and tables scroll inside themselves).
- No console errors other than unreachable font or Mermaid hosts, which the page handles.
- The stamp lists every source document read, with its version.

## Anti-patterns

- **Tailwind or any CSS framework.** One inline `<style>`.
- **JavaScript beyond Mermaid** and the nav highlight. No jQuery, no chart libraries.
- **White page background.**
- **Hex values in component styles** instead of variables.
- **The house style without the project's yes**, or the product's tokens on this page.
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
