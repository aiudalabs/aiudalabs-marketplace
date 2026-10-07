# fastapi-react: agent roster

The default roster for this profile. `multi-agent-governance` copies the agent sections below into the project's `docs/AGENT_ROSTER.md`, adapting the lanes only when the architecture changed the repo layout. The format is the one the `spec-guard` scripts read: one `##` heading per agent, named exactly like its agent, then `**Owns:**`, `**Reads:**` and `**Refuses:**`, with globs in backticks.

Each agent is a separate component of the catalog (`engineering/python-dev`, `engineering/react-dev`, `engineering/qa-tester`, `product/product-advisor`). This file decides which of them form the roster and what each one owns.

Lane rules:

- No path is owned by two agents. Shared files are a design smell: one agent owns them, the others ask for changes.
- Every path an issue will write sits in exactly one lane. Root files are assigned below so none is orphaned.
- `react-dev` is shared across profiles; its lane here is `frontend/**`. The lane in this roster wins over any example path in the agent's own description.
- An API-only product drops `react-dev` from the project roster rather than inventing work for it.
- The spec documents (`docs/**`, `mockups/**`) and the root `AGENTS.md` and `CLAUDE.md` belong to the spec workflow, not to a build lane. Build issues read them and never write them.
- Domain-driven agents (a payments agent, an ML agent) are added per project by governance, each with its own carved-out lane.

---

## python-dev

Builds the API, the workers and the migrations; trusts constraints over code and keeps the test gate green.

**Owns:** `src/**`, `alembic/**`, `alembic.ini`, `tests/**`, `pyproject.toml`, `deploy/**`, `Dockerfile`, `scripts/**`, `.github/**`
**Reads:** `docs/**`, `frontend/**`
**Refuses:** frontend code

## react-dev

Builds the React frontends; typed end to end against the API, with every list paginated and every state handled.

**Owns:** `frontend/**`
**Reads:** `docs/**`, `mockups/**`, `src/*/shared/**`
**Refuses:** backend code, migrations, deploy configuration

## qa-tester

Reviews every change against its acceptance criteria and the spec; writes findings, not code.

**Owns:** none
**Reads:** `**`
**Refuses:** editing code

## product-advisor

Stack-agnostic reviewer of the spec documents: looks for gaps, contradictions and untraced scope between phases.

**Owns:** none
**Reads:** `docs/**`, `mockups/**`
**Refuses:** editing code or spec documents
