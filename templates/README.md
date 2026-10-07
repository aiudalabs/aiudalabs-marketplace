# Templates

The skeletons that `new` fills in, one per kind of component:

```bash
node bin/cli.mjs new skill <name>
node bin/cli.mjs new agent <name> --category <category>
node bin/cli.mjs new workflow <name>
node bin/cli.mjs new stack <name>
node bin/cli.mjs new external <name>
```

`{{name}}` becomes the component's name and `{{title}}` the same name in title case. Skills and workflows also get `evals/triggers.json` from `triggers.json`. Every `TODO` is yours to replace; `npm run validate` fails until the description is written.

What goes in each one: [CONTRIBUTING.md](../CONTRIBUTING.md). Every field and rule: [docs/component-formats.md](../docs/component-formats.md).
