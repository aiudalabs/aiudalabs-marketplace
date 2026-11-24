# {{project_title}}

_`product-discovery` replaces this line with the brief's tagline at the end of Phase 1._

## Quick start

```bash
CI=true melos bootstrap
pnpm install
cp functions/.env.local.example functions/.env.local
pnpm emulators
```

See `AGENTS.md` for the full setup, the conventions and how to work on this repo.

## Project status

Run `node tools/spec-guard/spec.mjs status`: it reads the documents and reports which phases are done, the sprint progress and the next wave. `STATUS.md` records the outcome of each finished sprint, and `docs/SESSION.md` holds the narrative for the next working session.

## Documentation

All design docs live in `./docs/`, written by the product-spec workflow:

- `docs/PRODUCT_BRIEF.md`: what the product does
- `docs/OPINIONATED_DEFAULTS.md`: locked decisions (D-01, D-02, ...)
- `docs/PRD.md`: functional requirements with acceptance criteria
- `docs/FIREBASE_SCHEMA.md`: data model
- `docs/UI_SCREENS.md`: screen specs
- `docs/ARCHITECTURE.md`: technical architecture
- `docs/AGENT_ROSTER.md`: agents and their lanes
- `docs/ORCHESTRATOR.md`: how a sprint is run
- `docs/ISSUES.md`: the sprint backlog
- `docs/WAVE_DAG.md`: parallel waves per sprint (computed)
- `docs/SPRINT_PROMPTS.md`: paste-ready prompts for the next sprints
- `docs/OPERATIONAL_READINESS.md`: legal, banking and store checklist (parallel track)

## License

© {{year}} {{project_title}} authors.
