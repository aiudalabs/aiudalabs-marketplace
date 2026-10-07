# {{project_title}}

_To be filled in after Phase 1 (`product-discovery`)._

## Quick start

```bash
melos bootstrap
pnpm install
firebase emulators:start --import=./emulator-data --export-on-exit
```

See `AGENTS.md` for the full setup, the conventions and how to work on this repo.

## Project status

See `STATUS.md` for the current sprint and what is in flight, or run `node tools/spec-guard/spec.mjs status`.

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
