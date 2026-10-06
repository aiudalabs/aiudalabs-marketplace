# The website

A searchable catalog, served by GitHub Pages at [aiudalabs.github.io/aiudalabs-marketplace](https://aiudalabs.github.io/aiudalabs-marketplace/). Plain HTML, CSS and JavaScript: no framework, no build tools, no dependencies.

```bash
npm run site                      # builds _site/
python3 -m http.server -d _site   # then open http://localhost:8000
```

Opening `_site/index.html` from disk also works, except that a component's page cannot load its instructions and links to the repository instead.

## Where things come from

| What | Source |
| --- | --- |
| Cards, counts, install commands, "installs with it", "used by" | `lib/site.mjs`, from the components and adapters, at build time |
| Each component's instructions | Its `SKILL.md` or agent file, copied to `_site/content/` |
| The "How it works" text and diagrams | Written by hand in `index.html` |

So a new component appears on the site with no change here. A new kind of component or a new harness needs the home page updated; a test fails when the harness count changes.

## Design rules

Everything visual goes through the custom properties at the top of `styles.css`. Do not write a color, a font size or a spacing value anywhere else.

- **Color.** [Radix Colors](https://www.radix-ui.com/colors) scales, each step in the role Radix documents for it: 1 to 3 for backgrounds, 6 for separators, 9 for solid fills, 11 or 12 for text. Slate is the neutral. Each kind of component has one hue, the same one the CLI uses: cyan for skills, pink for agents, orange for workflows, grass for stacks, violet for externals.
- **Contrast.** [WCAG 2.2](https://www.w3.org/TR/WCAG22/) level AA in both themes: text reaches 4.5:1 on every surface it sits on, and the border of a control reaches 3:1. `test/site.test.mjs` checks the tokens, so a change that breaks this fails.
- **Type.** One scale: 12, 14, 16, 18, 20, 24, 30 and 36 px. Body text is 16 px and nothing is smaller than 12. Geist for text, Geist Mono for names, commands and code.
- **Space.** A 4 px grid, through `--s1` to `--s8`.
- **Controls.** 40 px high, 44 px on narrow screens; secondary ones 32 and 36 px. Every one is reachable by keyboard and shows a focus ring.
- **Themes.** Dark and light. The first visit follows the system setting; the toggle is remembered.
- **Motion.** Almost none, and none when the system asks for reduced motion.
