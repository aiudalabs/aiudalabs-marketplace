---
name: project-kickstart
description: "Scaffolds a NEW, empty repository for the product-spec method, from the stack profile: for flutter-firebase a Melos + pnpm monorepo with Firebase config, Cloud Functions, CI and env files from bundled templates; for fastapi-react the src-layout Python API, worker, React frontend and Docker Compose deploy of that profile. Writes the AGENTS.md constitution and a CLAUDE.md that imports it, starts git on develop, and installs the spec-guard guardrails. Use at the very start of a project: \"arranca el repo\", \"kickstart\", \"crea la estructura del proyecto\", \"scaffold a new Flutter Firebase monorepo\". For a repository that already has code, use project-adopt; to design the product itself, use product-spec-orchestrator."
license: MIT
compatibility: Needs git and Node.js 20 or later. flutter-firebase also uses Dart with Melos, pnpm and firebase-tools; fastapi-react uses Python 3.11+, pnpm and Docker. Missing tools are reported, not installed. macOS or Linux (WSL2 on Windows).
metadata:
  version: "1.0.0"
  author: aiudalabs
  requires: stack-profile-flutter-firebase stack-profile-fastapi-react spec-guard
---

# Project Kickstart

Creates a new repository with the folder layout, configuration and conventions of a stack profile, ready for the product-spec workflow and for coding agents. Run it once, at the start.

It writes no application code and creates no cloud projects. It always finishes with as much done as possible: a missing tool is reported at the end, not a reason to abort.

## When to use it

- "arranca el repo" / "kickstart" / "crea la estructura del proyecto"
- "scaffold a new monorepo for this app"
- After `product-discovery` locked the profile, or before the spec when the user wants the repo first

Do not use it when the folder already holds a code base: `project-adopt` brings an existing repository into the method without overwriting it.

## Step 1: Gather inputs

Ask in one message:

1. **Project name**, kebab-case (`marketplace-pa`, `delivery-app`). Used for the folder, package names and suggested cloud project ids.
2. **Stack profile**: `flutter-firebase` (default) or `fastapi-react`. If `docs/OPINIONATED_DEFAULTS.md` already locks `**Stack profile:**`, use it and do not ask.
3. **Apps** (free form). Examples:
   - Two-sided marketplace: `customer-app, provider-app, admin-dashboard`
   - Content platform: `reader-app, author-app, admin-dashboard`
   - Delivery: `customer-app, courier-app, restaurant-app, ops-dashboard`
   - K-12: `student-app, teacher-app, parent-app, school-admin`
   - B2B internal: `field-mobile, supervisor-tablet, audit-web`
   - **TBD**: the scaffold creates no app folders; Phase 1 names the apps.
4. **Issue tracker**: `github`, `bitbucket` or `none`.

Wait for all answers; ask follow-ups for anything ambiguous.

## Step 2: Validate

- The name is kebab-case: lowercase letters, digits, single hyphens.
- The target folder does not exist, or is empty. If it holds files, stop: offer another name, or `project-adopt` if it is a real code base.
- The profile is one of the two. A stack outside both is not scaffolded by this skill; say so and offer to stop or to scaffold the closest profile for manual editing.

## Step 3: Context variables

```
PROJECT_NAME   = "marketplace-pa"
PROJECT_TITLE  = "Marketplace Pa"
PROFILE        = "flutter-firebase" | "fastapi-react"
APPS           = list, or TBD
TRACKER        = "github" | "bitbucket" | "none"
PROJECT_DIR    = "./{PROJECT_NAME}"
```

Substitutions in every template: `{{project_name}}`, `{{project_title}}`, `{{apps_included}}` (comma-separated, or "TBD"), `{{year}}`, `{{node_version}}` = `20`, `{{flutter_version}}` = `3.27.0`.

## Step 4: Scaffold by profile

### flutter-firebase

The templates are in this skill's folder, under `assets/flutter-firebase/`. Copy **every** file, including the dotfiles (`.gitignore`, `.env.example`, `.firebaserc`, `.tool-versions`, `.github/workflows/ci.yml`), into `PROJECT_DIR`, keeping the relative paths, and apply the substitutions:

```bash
mkdir -p "$PROJECT_DIR"
cp -R "<this skill's folder>/assets/flutter-firebase/." "$PROJECT_DIR/"
```

What lands where:

| Template | Destination |
|---|---|
| `AGENTS.md` | root: the constitution, with the profile's default roster and hard rules |
| `CLAUDE.md` | root: the single line `@AGENTS.md`, so Claude Code imports the constitution |
| `README.md`, `STATUS.md` | root |
| `SESSION.md` | `docs/SESSION.md` (move it) |
| `DESIGN_SYSTEM.md` | `docs/DESIGN_SYSTEM.md` only when the user wants the Aiuda Labs look for HTML mockups and specs; otherwise delete it |
| `melos.yaml`, `pubspec.yaml`, `package.json`, `pnpm-workspace.yaml` | root: Melos for Dart, pnpm for TypeScript |
| `firebase.json`, `.firebaserc`, `firestore.rules`, `firestore.indexes.json`, `database.rules.json`, `storage.rules` | root |
| `functions/package.json`, `functions/tsconfig.json`, `functions/src/index.ts` | `functions/` |
| `.github/workflows/ci.yml` | `.github/workflows/` |

Then create the folders:

```bash
cd "$PROJECT_DIR"
mkdir -p docs mockups emulator-data
mkdir -p packages/core packages/data packages/ui packages-ts/types
mkdir -p functions/src/callable functions/src/triggers functions/src/scheduled functions/src/https
```

App folders follow the app names:

- A mobile app (`customer-app`, `reader-app`, `mobile-app`): `apps/<name without -app>` (`apps/reader`).
- A tablet app (`supervisor-tablet`): `apps/<name>_tablet` (`apps/supervisor_tablet`).
- A web admin (`*-dashboard`, `*-web`, `*-admin`): one `admin/` folder, whatever the name. Scaffold it with `pnpm create vite admin --template react-ts`. Without a web admin, remove `admin` from `pnpm-workspace.yaml` and the `hosting` block from `firebase.json`.
- **TBD**: no app folders. Note in `STATUS.md` that Phase 1 decides them and the first sprint creates them.

### fastapi-react

Load the `stack-profile-fastapi-react` skill and read its `references/kickstart.md`. It specifies the layout (src-layout package with the API and the worker, Alembic, React frontend, Docker Compose deploy, a seed test) and the post-scaffold checks. Follow it exactly; this skill adds only the common steps below.

Write the root `AGENTS.md` constitution with the same sections as the flutter-firebase template (read it in `assets/flutter-firebase/AGENTS.md` for the shape), filled with this profile: `**Stack profile:** fastapi-react`, the roster from the profile skill's `references/agents.md` (`python-dev`, `react-dev`, `qa-tester`), its commands (`pip install -e ".[dev]"`, `python -m pytest -q`, the frontend's `pnpm` scripts, `docker compose`), and hard rules that name endpoints and the shared transitions module instead of Cloud Functions. Write `CLAUDE.md` with the single line `@AGENTS.md`. Copy `README.md`, `STATUS.md` and `SESSION.md` (to `docs/`) from `assets/flutter-firebase/` and replace the quick-start commands.

Post-scaffold, `python -m pytest -q` must be green before the first commit.

### Common to both

Do **not** create placeholder spec documents (`PRODUCT_BRIEF.md`, `PRD.md`, ...). Each phase skill creates its own file, and `spec.mjs status` reports a phase from the content of its document; stubs add nothing but noise.

## Step 5: Initialize git

```bash
cd "$PROJECT_DIR"
git init
git branch -M main
git add .
git commit -m "chore: kickstart {PROJECT_NAME} ({PROFILE})"
git checkout -b develop
```

`develop` is the working branch; `main` holds tagged releases.

## Step 6: Install dependencies (best effort)

flutter-firebase:

```bash
dart pub global activate melos || echo "Melos: skipped (Dart missing)"
melos bootstrap || echo "melos bootstrap: skipped"
pnpm install || echo "pnpm install: skipped"
```

fastapi-react: the install and test commands from the profile's `references/kickstart.md`.

A missing tool goes in the final report; it never stops the kickstart.

## Step 7: Issue tracker

**github**: ask before creating a remote repository. Never run `gh repo create` without the user's explicit yes, and ask whether it should be private or public. With a yes and an authenticated `gh`:

```bash
gh repo create {PROJECT_NAME} --private --source=. --push   # or --public, as the user chose
gh label create "sprint-0" --color "808080"
gh label create "blocker" --color "D14520"
gh label create "deferred" --color "B4B2A9"
```

Add one `agent:<name>` label per agent in the constitution. Issues themselves come later, from `node tools/spec-guard/spec.mjs export github` once the backlog exists. If `gh` is missing or not authenticated, list the commands for the user to run later.

**bitbucket**: tell the user to create the repository by hand; `spec.mjs export csv` produces a CSV for Jira or Linear importers once the backlog exists.

**none**: skip.

## Step 8: Install the agents and the guardrails

The agents and skills come from the marketplace, installed into the user's harness:

```bash
npx github:aiudalabs/aiudalabs-marketplace add <stack-or-component> --harness <id> --dir {PROJECT_DIR}
```

Then install the `spec-guard` guardrails from the project root, last, because they need the git repository:

```bash
node <spec-guard skill folder>/scripts/install.mjs --ci           # every harness
node <spec-guard skill folder>/scripts/install.mjs --ci --claude  # when the user works in Claude Code
```

It copies the tools into `tools/spec-guard/`, sets the pre-commit and commit-msg hooks, and adds the CI check (`--claude` adds a hook that blocks edits outside the lane). Commit `tools/spec-guard/` and `.githooks/` on `develop`: on a branch without an issue id the hooks restrict nothing, so the setup commit goes through. Every new clone runs `git config core.hooksPath .githooks` once; say so in `AGENTS.md`.

## Step 9: Report

In Spanish:

```
✅ Proyecto {PROJECT_NAME} ({PROFILE}) creado en {absolute path}

- {N} carpetas, {M} archivos
- Git inicializado, rama `develop` activa
- Guardrails de spec-guard: {instalados | pendiente}
- Tracker: {estado}
- Herramientas faltantes: {lista o "ninguna"}

Próximos pasos:
1. Crea el proyecto cloud (flutter-firebase: `firebase projects:create {PROJECT_NAME}-dev`, luego `firebase use --add`).
2. Abre el repo en tu agente: lee `AGENTS.md` (Claude Code lo importa vía `CLAUDE.md`).
3. Diseña el producto con `product-spec-orchestrator`:
   > "Quiero diseñar un producto nuevo. Es {descripción}."
4. En paralelo, `operational-readiness` para la parte legal, bancaria y de tiendas.
```

## What this skill does not do

- Create cloud projects, IAM or service accounts
- Install Flutter, Dart, Node, pnpm, Python, Docker or firebase-tools
- Create a remote repository without asking
- Create backlog issues (that is `multi-agent-governance`, then `spec.mjs export`)
- Write application code
- Scaffold into a folder that already has code (`project-adopt`)

## When something goes wrong

- **Folder exists:** ask for another name, or switch to `project-adopt`.
- **`gh`, `melos`, `pnpm`, `python` missing:** skip that step and report it.
- **A template is missing:** warn and continue.
- **Any non-fatal error:** collect it and report at the end. The kickstart always finishes.
