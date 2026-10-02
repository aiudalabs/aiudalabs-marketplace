# Contributing

Thanks for helping build the catalog. Contributions of agents, skills, stacks and harness adapters are welcome.

## Setup

You need Node.js 20 or later. There are no dependencies to install.

```bash
git clone https://github.com/aiudalabs/aiudalabs-marketplace.git
cd aiudalabs-marketplace
npm run validate
npm test
```

## Decide what you are adding

| You have | Add |
| --- | --- |
| A specialist identity: how someone thinks, communicates and judges quality | An agent |
| A repeatable procedure, with or without scripts and templates | A skill |
| A set of agents and skills that work well together | A stack |
| Support for another AI tool | An adapter |

If your idea is both a persona and a procedure, submit both: a short agent that lists the skill, and the skill that holds the steps.

## Add a skill

1. Create `skills/<name>/SKILL.md`. The folder name and the `name` field must match.
2. Write a `description` that says what the skill does and when to use it. Harnesses see only this at discovery time.
3. Set `metadata.version` to `"0.1.0"`.
4. Keep `SKILL.md` under 500 lines. Put long material in `references/`, templates in `assets/`, runnable code in `scripts/`.
5. Scripts must run without installing anything, or state their requirements in `compatibility`.

## Add an agent

1. Create `agents/<category>/<name>.md`. Reuse an existing category when one fits.
2. Fill in `name`, `description`, `version`, and `skills` if it uses any.
3. Write the persona using the sections in [docs/component-formats.md](docs/component-formats.md).
4. Describe tools by capability ("file search", "script execution"), not by one harness's tool names.

## Add a stack

Create `stacks/<name>/stack.json` listing agents and skills that already exist in the repository.

## Add a harness adapter

Follow [adapters/README.md](adapters/README.md). Link the vendor documentation you used.

## Before you open a pull request

```bash
npm run catalog    # regenerate the catalog and plugin manifest
npm run validate   # must report 0 errors
npm test           # must pass
```

Commit the regenerated files along with your change.

## Versioning

Components use semver.

- Patch: wording fixes that do not change behavior
- Minor: new capability, backward compatible
- Major: a change that alters what the component does or requires

Bump the version of every component you change. The repository version in `package.json` is bumped by maintainers at release time.

## Quality bar

- Original work, or work you have the right to contribute under the MIT license
- No secrets, private data or references to internal systems
- Facts you can back up: do not invent tool names, API fields or paths
- Tested by you in at least one harness; say which one in the pull request

## License

By contributing, you agree that your contribution is licensed under the [MIT License](LICENSE).
