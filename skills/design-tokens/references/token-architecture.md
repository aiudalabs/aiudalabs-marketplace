# Token architecture

Adapted from the `design-system` skill in ui-ux-pro-max (MIT, Next Level Builder). See `THIRD_PARTY_NOTICES.md` in this skill.

## Three layers

| Layer | Holds | Example | Changes when |
| --- | --- | --- | --- |
| Primitive | Raw values with no meaning attached | `color.primary.600`, `space.4` | The brand itself changes. Rare. |
| Semantic | A purpose, pointing to a primitive | `color.action.default` → `{color.primary.600}` | A theme is switched, or a role is remapped |
| Component | One component's override, pointing to a semantic token | `button.background` → `{color.action.default}` | One component needs to differ |

Start with primitive and semantic. Add component tokens when a real component needs an override, not before. Three layers defined up front for a brand with no product yet is structure nobody uses.

## Why layers

- **Theming.** A dark theme redefines semantic tokens and leaves primitives alone. `color.background.default` points to `neutral.50` in light and `neutral.950` in dark.
- **Rebranding.** Changing the primary ramp updates every action, link and focus ring that points to it.
- **Safety.** Product code that only uses semantic tokens cannot drift into one-off colors.

## Naming

Semantic names describe purpose, never appearance.

| Good | Bad | Why |
| --- | --- | --- |
| `color.action.default` | `color.blue-button` | The button may stop being blue |
| `color.text.muted` | `color.grey-600-text` | Repeats the primitive |
| `space.section` | `space.big` | "Big" compared to what |

Pattern for a path: `category.role.variant`, optionally followed by a state.

```
color.text.default
color.text.muted
color.action.default
color.action.hover
color.background.subtle
```

Names must not contain `.`, `{` or `}`, and must not start with `$`.

## Categories for a brand

| Category | Primitive examples | Semantic examples |
| --- | --- | --- |
| `color` | `color.primary.50` to `950`, `color.neutral.*` | `color.text.*`, `color.background.*`, `color.border.*`, `color.action.*` |
| `font` | `font.family.heading`, `font.weight.bold`, `font.size.lg` | `font.family.body` pointing to a primitive family |
| `space` | `space.1`, `space.2`, `space.4` | `space.section`, `space.component` |
| `radius` | `radius.sm`, `radius.md`, `radius.lg` | `radius.control`, `radius.card` |
| `shadow` | `shadow.sm`, `shadow.md` | `shadow.raised` |
| `duration` | `duration.fast`, `duration.slow` | `duration.transition` |

## Spacing and radius

Use a small, regular set. A common approach is a base unit with multiples, such as steps of 0.25rem. Name primitive steps by multiple (`space.4` is four units) so the scale can gain steps without renaming.

## Dark theme

Keep one file per theme. The dark file redefines only the semantic tokens that change:

```json
{
  "color": {
    "$type": "color",
    "background": { "default": { "$value": "{color.neutral.950}" } },
    "text": { "default": { "$value": "{color.neutral.50}" } }
  }
}
```

Because every file must resolve its own references, include the primitive groups the references point to.

## Moving from flat values

If the brand already has values scattered through a codebase:

1. Collect every color, size and font value in use.
2. Merge near-duplicates into one primitive each.
3. Name the purpose each one serves, as semantic tokens.
4. Replace the raw values in code with the semantic variables.
