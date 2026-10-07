---
name: project-kickstart
description: "Scaffolds a NEW, empty repository for the product-spec method, from the stack profile: for flutter-firebase a Melos + pnpm monorepo with Firebase config, Cloud Functions, CI and env files from bundled templates; for fastapi-react the src-layout Python API, worker, React frontend and Docker Compose deploy of that profile. Writes the AGENTS.md constitution and a CLAUDE.md that imports it, installs the matching aiuda stack into the chosen harness and the spec-guard guardrails, and commits it all once on main with develop as the working branch. Use at the very start of a project: \"arranca el repo\", \"kickstart\", \"crea la estructura del proyecto\", \"scaffold a new Flutter Firebase monorepo\". For a repository that already has code, use project-adopt; to design the product itself, use product-spec-orchestrator."
license: MIT
compatibility: Needs git, Node.js 22 or later and network access for npx. flutter-firebase also uses Dart with Melos, pnpm and firebase-tools; fastapi-react uses Python 3.11+, pnpm and Docker. Missing tools are reported, not installed. macOS or Linux (WSL2 on Windows).
metadata:
  version: "1.1.0"
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
5. **Harness**: the coding agent the team works in, which receives the agents and skills in Step 6. `claude-code` (default), or another id that `npx github:aiudalabs/aiudalabs-marketplace harnesses` lists (`cursor`, `codex`, `gemini-cli`, `opencode`, ...).
6. **Aiuda Labs look**: should the generated spec page (`html-spec-generator`) carry the Aiuda Labs house style? `yes` copies it to `docs/AIUDA_HOUSE_STYLE.md`; `no` (default) copies nothing. Either way it never styles the product or its mockups: `ui-screens-spec` asks for the product's visual identity in Phase 4.

Wait for all answers; ask follow-ups for anything ambiguous.

## Step 2: Validate

- The name is kebab-case: lowercase letters, digits, single hyphens, starting with a letter.
- The target folder does not exist, or is empty. If it holds files, stop: offer another name, or `project-adopt` if it is a real code base.
- The profile is one of the two. A stack outside both is not scaffolded by this skill; say so and offer to stop or to scaffold the closest profile for manual editing.

## Step 3: Context variables

```
PROJECT_NAME   = "marketplace-pa"
PACKAGE_NAME   = "marketplace_pa"            # snake_case: hyphens become underscores
PROJECT_TITLE  = "Marketplace Pa"
PROFILE        = "flutter-firebase" | "fastapi-react"
STACK          = "aiuda-stack" (flutter-firebase) | "aiuda-stack-fastapi" (fastapi-react)
HARNESS        = "claude-code" | ...
AIUDA_LOOK     = yes | no
AIUDA_LOOK_TEXT = "yes, spec page only (docs/AIUDA_HOUSE_STYLE.md); the product identity is asked in Phase 4" | "no; the product identity is asked in Phase 4"
APPS           = list, or TBD
TRACKER        = "github" | "bitbucket" | "none"
PROJECT_DIR    = absolute path, e.g. "$(pwd)/marketplace-pa"
```

Every path below uses the absolute `PROJECT_DIR`, so a `cd` in an earlier step never changes where a command writes.

Substitutions in every template:

| Placeholder | Value |
|---|---|
| `{{project_name}}` | `PROJECT_NAME` (folders, npm package names, Firebase project ids) |
| `{{package_name}}` | `PACKAGE_NAME`, wherever the name must be an identifier: Dart package names (`pubspec.yaml`, `melos.yaml`) and Python packages |
| `{{project_title}}` | `PROJECT_TITLE` |
| `{{apps_included}}` | comma-separated apps, or "TBD" |
| `{{profile}}`, `{{harness}}` | `PROFILE`, `HARNESS` |
| `{{aiuda_look}}` | `AIUDA_LOOK_TEXT` |
| `{{year}}` | current year |
| `{{node_version}}` | `22` |
| `{{flutter_version}}` | `3.27.0` |

Right after Step 4, `grep -rnI '{{' "$PROJECT_DIR" --exclude-dir=node_modules` must print nothing.

## Step 4: Scaffold by profile

### flutter-firebase

The templates are in this skill's folder, under `assets/flutter-firebase/`. Copy **every** file, including the dotfiles (`.gitignore`, `.env.example`, `.firebaserc`, `.tool-versions`, `.github/workflows/*.yml`, `functions/eslint.config.mjs`), into `PROJECT_DIR`, keeping the relative paths, and apply the substitutions:

```bash
mkdir -p "$PROJECT_DIR"
cp -R "<this skill's folder>/assets/flutter-firebase/." "$PROJECT_DIR/"
mkdir -p "$PROJECT_DIR/docs" && mv "$PROJECT_DIR/SESSION.md" "$PROJECT_DIR/docs/SESSION.md"
if [ "$AIUDA_LOOK" = yes ]; then mv "$PROJECT_DIR/AIUDA_HOUSE_STYLE.md" "$PROJECT_DIR/docs/"; else rm "$PROJECT_DIR/AIUDA_HOUSE_STYLE.md"; fi

# Substitutions (GNU sed; on macOS write `sed -i ''`). Values with a `/` need another delimiter.
grep -rlI '{{' "$PROJECT_DIR" --exclude-dir=node_modules | while read -r file; do
  sed -i -e "s/{{project_name}}/$PROJECT_NAME/g" -e "s/{{package_name}}/$PACKAGE_NAME/g" \
    -e "s/{{project_title}}/$PROJECT_TITLE/g" -e "s/{{apps_included}}/$APPS/g" \
    -e "s/{{profile}}/$PROFILE/g" -e "s/{{harness}}/$HARNESS/g" -e "s|{{aiuda_look}}|$AIUDA_LOOK_TEXT|g" \
    -e "s/{{year}}/$(date +%Y)/g" -e "s/{{node_version}}/22/g" -e "s/{{flutter_version}}/3.27.0/g" "$file"
done
```

What lands where:

| Template | Destination |
|---|---|
| `AGENTS.md` | root: the constitution, with the profile's default roster, lane rules and hard rules |
| `CLAUDE.md` | root: the single line `@AGENTS.md`, so Claude Code imports the constitution |
| `README.md`, `STATUS.md` | root. `STATUS.md` holds sprint outcomes (written by `sprint-runner`); phase progress comes from `spec.mjs status` |
| `SESSION.md` | `docs/SESSION.md`, every phase pending, the kickstart answers under "Last phase: 0" |
| `AIUDA_HOUSE_STYLE.md` | `docs/AIUDA_HOUSE_STYLE.md` when `AIUDA_LOOK` is yes, otherwise delete it. It styles the spec page only, never the product; the name keeps `ui-screens-spec` from reading it as the product's design system |
| `melos.yaml`, `pubspec.yaml`, `package.json`, `pnpm-workspace.yaml` | root: Melos 6 for Dart, pnpm for TypeScript (`packageManager` pins the pnpm version CI uses) |
| `firebase.json`, `.firebaserc`, `firestore.rules`, `firestore.indexes.json`, `database.rules.json`, `storage.rules` | root |
| `functions/` (`package.json`, `tsconfig.json`, `eslint.config.mjs`, three `vitest*.config.ts`, `.gitignore`, `scripts/gen-index.mjs`, `src/init.ts`) | `functions/`. `gen-index.mjs` generates `src/index.ts` before every build, typecheck, lint and test, so no issue edits the barrel; git ignores it |
| `.github/workflows/flutter.yml`, `firebase.yml`, `admin.yml` | `.github/workflows/`: one workflow per lane, each naming its owner in a comment |

Then create the folders:

```bash
mkdir -p "$PROJECT_DIR"/{mockups,emulator-data}
mkdir -p "$PROJECT_DIR"/packages/{core,data,ui} "$PROJECT_DIR"/packages-ts/types
mkdir -p "$PROJECT_DIR"/functions/src/{callable,triggers,scheduled,https}
```

App folders follow the app names:

- A mobile app (`customer-app`, `reader-app`, `mobile-app`): `apps/<name without -app>` (`apps/reader`).
- A tablet app (`supervisor-tablet`): `apps/<name>_tablet` (`apps/supervisor_tablet`).
- A web admin (`*-dashboard`, `*-web`, `*-admin`): one `admin/` folder, whatever the name. Scaffold it with `cd "$PROJECT_DIR" && pnpm create vite admin --template react-ts`, then name it like the other packages: `cd "$PROJECT_DIR/admin" && npm pkg set name="@$PROJECT_NAME/admin"`. Keep the TypeScript version the template ships; the admin builds on its own. That template gives `dev`, `build` (`tsc -b && vite build`), `lint` (whatever linter the current template ships) and `preview`, and nothing else: no Tailwind, no shadcn/ui, no test runner, no `typecheck` (the `build` type-checks). They come from an issue once `docs/ARCHITECTURE.md` chooses them, and that issue adds the command to `AGENTS.md` and `admin.yml`.
- **Without a web admin**: remove `admin` from `pnpm-workspace.yaml`, the `hosting` block from `firebase.json`, `.github/workflows/admin.yml`, and the admin lines from `AGENTS.md` (the stack line, the `pnpm --dir admin` commands, the `react-dev` roster line and the `admin/` folder line).
- **TBD**: no app folders. `docs/SESSION.md` already says Phase 1 names the apps; the first sprint creates them. `flutter.yml` skips its checks while no `pubspec.yaml` exists under `apps/` or `packages/`.

Git does not track empty folders, so give each one a `.gitkeep`; a clone then has the whole layout:

```bash
find "$PROJECT_DIR" -type d -empty -not -path '*/.git/*' -not -path '*/node_modules/*' -exec touch {}/.gitkeep \;
```

### fastapi-react

Load the `stack-profile-fastapi-react` skill and read its `references/kickstart.md`. It specifies the layout (src-layout package with the API and the worker, Alembic, React frontend, Docker Compose deploy, a seed test) and the post-scaffold checks. Follow it exactly; this skill adds only the common steps below. The Python package is `PACKAGE_NAME`.

Write the root `AGENTS.md` constitution with the same sections as the flutter-firebase template (read it in `assets/flutter-firebase/AGENTS.md` for the shape), filled with this profile: `**Stack profile:** fastapi-react`, the roster from the profile skill's `references/agents.md` (`python-dev`, `react-dev`, `qa-tester`), only the commands that exist after the scaffold (`pip install -e ".[dev]"`, `python -m pytest -q`, the frontend's `pnpm` scripts, `docker compose`), and hard rules that name endpoints and the shared transitions module instead of Cloud Functions. Write `CLAUDE.md` with the single line `@AGENTS.md`. Copy `README.md`, `STATUS.md` and `SESSION.md` (to `docs/`) from `assets/flutter-firebase/`, replace the quick-start commands, and copy `AIUDA_HOUSE_STYLE.md` to `docs/` when `AIUDA_LOOK` is yes. Add `.gitkeep` to empty folders as above.

### Common to both

Do **not** create placeholder spec documents (`PRODUCT_BRIEF.md`, `PRD.md`, ...). Each phase skill creates its own file, and `spec.mjs status` reports a phase from the content of its document; stubs add nothing but noise.

## Step 5: Install dependencies and check the scaffold (best effort)

The lockfile must exist before the first commit, because CI installs with `--frozen-lockfile`.

flutter-firebase:

```bash
cd "$PROJECT_DIR"
dart pub global activate melos '>=6.3.0 <7.0.0' || echo "Melos: skipped (Dart missing)"
melos bootstrap || echo "melos bootstrap: skipped"
pnpm install                                     # writes pnpm-lock.yaml
for s in typecheck lint test build test:rules; do pnpm --dir functions run "$s" || echo "functions $s: FAILED"; done
for s in lint build; do pnpm --dir admin run "$s" || echo "admin $s: FAILED"; done   # only with an admin
```

Every script in the functions template passes on the empty scaffold (`vitest` runs with `--passWithNoTests`). Use `pnpm --dir <folder> run <script>`: it fails on a missing script, where `pnpm --filter` exits 0 without running anything. A failure here is a defect to report, not to hide: fix it in the scaffold or list it in the report.

pnpm 10 does not run dependencies' install scripts unless approved, and lists the ones it skipped ("Ignored build scripts: esbuild, protobufjs, …"). None of them is needed by this scaffold: every check above passes without them. If a dependency added later needs its script, approve it with `pnpm approve-builds`, which records it in `package.json`.

fastapi-react: the install and test commands from the profile's `references/kickstart.md`; `python -m pytest -q` must be green.

A missing tool goes in the final report; it never stops the kickstart.

## Step 6: Initialize git, install the agents and the guardrails

```bash
cd "$PROJECT_DIR"
git init
git branch -M main
npx github:aiudalabs/aiudalabs-marketplace add "$STACK" --harness "$HARNESS" --dir "$PROJECT_DIR"
```

`STACK` is `aiuda-stack` for flutter-firebase and `aiuda-stack-fastapi` for fastapi-react. The command installs the agents and skills into the project's folders for that harness and writes the marketplace manifest `.aiudalabs-marketplace.json`; its output prints one line per component with the path it wrote.

Then install the `spec-guard` guardrails with **the copy just installed in the project**: the folder the `add` output printed for `skill/spec-guard`, under `PROJECT_DIR` (not the copy this skill was loaded from, which may be older or global):

```bash
SPEC_GUARD="$PROJECT_DIR/<folder printed for skill/spec-guard>"
# One command: --claude only when HARNESS is claude-code.
node "$SPEC_GUARD/scripts/install.mjs" --root "$PROJECT_DIR" --ci $([ "$HARNESS" = claude-code ] && echo --claude)
```

It copies the tools into `tools/spec-guard/`, sets the pre-commit and commit-msg hooks, adds `.github/workflows/spec-guard.yml` (owned by the lane the profile roster gives it; `firebase-dev` for flutter-firebase) and, with `--claude`, a hook in `.claude/settings.json` that blocks edits outside the lane. The installer is safe to run again: after every `spec-guard` update, run it again to refresh `tools/spec-guard/`; it keeps hooks and settings.

Check that the guardrails pass on the fresh scaffold: `node tools/spec-guard/spec.mjs check --strict` exits 0 before any backlog exists, so `spec-guard.yml` is green on the first push.

## Step 7: Commit once

One commit, after everything above is generated, so the first push has the lockfile, the installed harness folders, the manifest and the spec-guard files:

```bash
cd "$PROJECT_DIR"
git add -A
git status --short     # check: pnpm-lock.yaml, the harness folders, .aiudalabs-marketplace.json, tools/spec-guard/, .githooks/, .github/workflows/spec-guard.yml
git commit -m "chore: kickstart {PROJECT_NAME} ({PROFILE})"
git checkout -b develop
```

On a branch without an issue id the spec-guard hooks restrict nothing, so the commit goes through. `develop` is the working branch; `main` holds tagged releases. Every new clone runs `git config core.hooksPath .githooks` once; `AGENTS.md` says so.

## Step 8: Issue tracker

**github**: ask before creating a remote repository. Never run `gh repo create` without the user's explicit yes, and ask whether it should be private or public. With a yes and an authenticated `gh`:

```bash
cd "$PROJECT_DIR"
gh repo create {PROJECT_NAME} --private --source="$PROJECT_DIR" --push   # or --public, as the user chose
git push -u origin develop
gh label create "sprint-0" --color "808080"
gh label create "blocker" --color "D14520"
gh label create "deferred" --color "B4B2A9"
```

Add one `agent:<name>` label per agent in the constitution. Issues themselves come later, from `node tools/spec-guard/spec.mjs export github` once the backlog exists. If `gh` is missing or not authenticated, list the commands for the user to run later.

**bitbucket**: tell the user to create the repository by hand; `spec.mjs export csv` produces a CSV for Jira or Linear importers once the backlog exists.

**none**: skip.

## Step 9: Report

Count the scaffold without `.git` and `node_modules`:

```bash
cd "$PROJECT_DIR"
git ls-files | xargs -n1 dirname | sort -u | wc -l   # folders in the commit (N)
git ls-files | wc -l                                # files in the commit (M); build output is ignored, so not counted
```

In Spanish:

```
✅ Proyecto {PROJECT_NAME} ({PROFILE}) creado en {PROJECT_DIR}

- {N} carpetas, {M} archivos (sin .git ni node_modules)
- Git inicializado: un commit en `main`, rama `develop` activa
- Agentes y skills: {STACK} para {HARNESS}
- Guardrails de spec-guard: {instalados | pendiente}
- Diseño Aiuda Labs para HTML: {sí | no}
- Comprobaciones del scaffold: {comando: ok | falla} por cada comando del Step 5
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
- **`gh`, `melos`, `pnpm`, `python` missing:** skip that step and report it. Without `pnpm` there is no lockfile: say that CI's `--frozen-lockfile` fails until `pnpm install` runs and its lockfile is committed.
- **A template is missing:** warn and continue.
- **Any non-fatal error:** collect it and report at the end. The kickstart always finishes.
