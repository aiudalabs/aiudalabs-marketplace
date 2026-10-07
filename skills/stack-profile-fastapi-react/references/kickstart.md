# fastapi-react: kickstart

The scaffold is done by the `project-kickstart` skill, which reads the locked profile and builds the repository. This file is the profile's half of that contract: what the scaffold must contain for `fastapi-react`. It does not repeat the procedure.

## Repository after the scaffold

```
{repo}/
├── AGENTS.md                # repository constitution (stack, commands, lanes, rules)
├── CLAUDE.md                # one line: @AGENTS.md
├── pyproject.toml           # src-layout, pinned deps, entry points {pkg}-api and {pkg}-worker, extras [dev]
├── alembic.ini + alembic/   # initialized; 0001 matches the seed models
├── src/{pkg}/
│   ├── shared/contracts.py  # base Pydantic models and a LEGAL_TRANSITIONS stub
│   ├── control/main.py      # FastAPI app: /healthz and the auth dependency wired (default-deny)
│   ├── control/core/config.py  # env-driven settings; dev defaults that fail hard in production
│   ├── control/db/models.py, control/db/store.py
│   └── worker/runner.py     # queue consumer stub (claim → no-op → report), entry point {pkg}-worker
├── frontend/{app}/          # Vite + React + TypeScript (pnpm), .env.example with the API URL
├── tests/test_skeleton.py   # seed tests: /healthz returns 200, the transition validator works
├── deploy/
│   ├── docker-compose.yaml  # postgres (no ports) + api + worker, chained healthchecks
│   └── .env.example         # every secret empty; ${VAR:?} enforced in compose
├── Dockerfile               # multi-stage, single image, non-root
├── scripts/demo.sh
├── .github/workflows/ci.yml # the CI shape from architecture.md in this folder
├── .gitignore               # deploy/.env, build/, dist/, __pycache__, .venv
├── mockups/
└── docs/                    # the spec documents of the product-spec workflow
```

## Rules for this profile

- **Green from the first commit:** `pip install -e ".[dev]" && python -m pytest -q` passes on the scaffold, and git is initialized with that state committed.
- **Frontend folders** come from the web apps in `docs/PRODUCT_BRIEF.md`, one `frontend/{app}/` each. An API-only product gets no `frontend/`.
- **The root `AGENTS.md`** states the stack, the dev commands and the test gate from `architecture.md` in this folder, and points to `docs/AGENT_ROSTER.md` for lanes. The root `CLAUDE.md` contains only `@AGENTS.md`, so Claude Code imports the same constitution that Codex, Copilot, Cursor and OpenCode read natively.
- **No secret has a value** in any committed file. Development defaults exist only where the config refuses them in production.
