# fastapi-react: agent roster

The default roster for this profile. `multi-agent-governance` copies the agent sections below into the project's `docs/AGENT_ROSTER.md`, adapting the lanes only when the architecture changed the repo layout. The format is the one the `spec-guard` scripts read: one `##` heading per agent, named exactly like its agent, then `**Owns:**`, `**Reads:**` and `**Refuses:**`, with globs in backticks.

Each agent is a separate component of the catalog (`engineering/python-dev`, `engineering/react-dev`, `engineering/qa-tester`). This file decides which of them form the roster and what each one owns. Every agent here except `qa-tester` owns issues; an agent that would own none does not belong in the roster. `product/product-advisor` is therefore not in it: it is consulted outside the roster, for spec reviews and scope questions.

Lane rules:

- No path is owned by two agents. Shared files are a design smell: one agent owns them, the others ask for changes.
- Every path an issue will write sits in exactly one lane, and so does every root and generated file. The ones that are easy to miss are assigned here:
  - **Lockfiles** go with the file that produces them: the Python lockfile, when the project uses one (`uv.lock`, `requirements*.txt` compiled from `pyproject.toml`), to `python-dev`; the root `package.json`, `pnpm-workspace.yaml` and `pnpm-lock.yaml` to `react-dev`, the only TypeScript lane.
  - **CI workflows** belong to the lane they validate, one file per lane: `.github/workflows/backend.yml` (`python-dev`, including the Postgres job), `.github/workflows/frontend.yml` (`react-dev`). Deploy workflows and `.github/workflows/spec-guard.yml` belong to `python-dev`; the `spec-guard` installer writes `spec-guard.yml`, and `install.mjs --ci` rewrites it while it keeps the spec-guard marker comment; a `python-dev` issue that customizes it removes that line.
  - **Root configuration** (`.gitignore`, `README.md`) belongs to `python-dev`.
  - **Generated files** (an OpenAPI client or TypeScript types generated from the API, a router registry) are written by a script, never by hand. The script and its output belong to the lane whose code consumes them, and no issue lists the output in `files_touched`.
  - **Paths outside every lane**, listed under `## Paths outside every lane` at the end of the roster; build issues read them and never list them in `files_touched`: the spec documents (`docs/**`, `mockups/**`, `AGENTS.md`, `CLAUDE.md`), installed tooling written by its installer (`tools/spec-guard/**`, `.githooks/**`, `.claude/**`, `.aiudalabs-marketplace.json`) and `STATUS.md`, written by `sprint-runner`.
- **A change to a file outside the lane is requested, not made.** The issue that needs it declares a dependency on an issue in the owning lane (a new endpoint field, a CI step, a deploy variable). Governance plans the known dependency additions in Sprint 0 so later lockfile refreshes stay rare.
- `react-dev` is shared across profiles; its lane here is `frontend/**` plus the pnpm workspace files. The lane in this roster wins over any example path in the agent's own description.
- An API-only product drops `react-dev` from the project roster rather than inventing work for it, and gives `frontend.yml` and the pnpm files to no one (they do not exist).
- The spec documents (`docs/**`, `mockups/**`) and the root `AGENTS.md` and `CLAUDE.md` belong to the spec workflow, not to a build lane. Build issues read them and never write them.
- Domain-driven agents (a payments agent, an ML agent) are added per project by governance, each with its own carved-out lane.

---

## python-dev

Builds the API, the workers and the migrations; trusts constraints over code and keeps the test gate green.

**Owns:** `src/**`, `alembic/**`, `alembic.ini`, `tests/**`, `pyproject.toml`, `uv.lock`, `requirements*.txt`, `deploy/**`, `Dockerfile`, `scripts/**`, `.github/workflows/backend.yml`, `.github/workflows/deploy*.yml`, `.github/workflows/spec-guard.yml`, `.gitignore`, `README.md`
**Reads:** `docs/**`, `frontend/**`
**Refuses:** frontend code, the pnpm workspace and its lockfile

## react-dev

Builds the React frontends; typed end to end against the API, with every list paginated and every state handled.

**Owns:** `frontend/**`, `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `.github/workflows/frontend.yml`
**Reads:** `docs/**`, `mockups/**`, `src/*/shared/**`
**Refuses:** backend code, migrations, deploy configuration

## qa-tester

Reviews every change against its acceptance criteria and the spec; writes findings, not code.

**Owns:** none
**Reads:** `**`
**Refuses:** editing code
