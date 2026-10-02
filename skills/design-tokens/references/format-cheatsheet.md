# Design Tokens format cheatsheet

Based on the Design Tokens Format Module 2025.10 and the Color Module 2025.10, published by the Design Tokens Community Group:

- <https://www.designtokens.org/tr/2025.10/format/>
- <https://www.designtokens.org/tr/2025.10/color/>

The 2025.10 format is a final Community Group report and is described as stable. It is not a W3C Standard. When this cheatsheet and the specification disagree, the specification wins.

## Files

- Extension: `.tokens` or `.tokens.json`
- Media type: `application/design-tokens+json`

## Tokens and groups

A token is an object with a `$value`. Everything else that is an object is a group.

| Property | On | Meaning |
| --- | --- | --- |
| `$value` | token | Required. The value, or a reference. |
| `$type` | token or group | The type. A group's `$type` is inherited by the tokens inside it. |
| `$description` | token or group | Plain text description |
| `$deprecated` | token or group | `true`, or a string explaining why |
| `$extensions` | token or group | Vendor-specific data |

Names must not start with `$` and must not contain `{`, `}` or `.`.

A token's type is its own `$type`; otherwise the type of the token it references; otherwise the `$type` of the closest parent group. A token with no type from any of these is invalid.

## References

```json
{ "$value": "{color.primary.600}" }
```

The curly brace form points to a whole token by its path and resolves to that token's `$value`. The format also defines `$ref` with JSON Pointer syntax for pointing inside a value; the bundled scripts do not process `$ref`.

## Types

Primitive: `color`, `dimension`, `fontFamily`, `fontWeight`, `duration`, `cubicBezier`, `number`, `strokeStyle`.

Composite: `shadow`, `border`, `transition`, `gradient`, `typography`.

### color

```json
{
  "$type": "color",
  "$value": { "colorSpace": "srgb", "components": [1, 0, 1], "alpha": 1, "hex": "#ff00ff" }
}
```

- `colorSpace` is one of: `srgb`, `srgb-linear`, `hsl`, `hwb`, `lab`, `lch`, `oklab`, `oklch`, `display-p3`, `a98-rgb`, `prophoto-rgb`, `rec2020`, `xyz-d65`, `xyz-d50`.
- `components` has three entries. For `srgb` each is from 0 to 1. For `oklch` they are lightness (0 to 1), chroma (0 or more) and hue (0 up to 360). An entry may be the string `"none"`.
- `alpha` is optional, from 0 to 1, and counts as 1 when omitted.
- `hex` is optional and uses six digits, so it never carries alpha.
- A plain string such as `"#ff00ff"` is not a valid color value.

### dimension

```json
{ "$type": "dimension", "$value": { "value": 0.5, "unit": "rem" } }
```

The unit is `px` or `rem`.

### duration

```json
{ "$type": "duration", "$value": { "value": 100, "unit": "ms" } }
```

The unit is `ms` or `s`.

### fontFamily

A single font name as a string, or an array of names in fallback order.

### fontWeight

A number from 1 to 1000, or one of: `thin`, `hairline`, `extra-light`, `ultra-light`, `light`, `normal`, `regular`, `book`, `medium`, `semi-bold`, `demi-bold`, `bold`, `extra-bold`, `ultra-bold`, `black`, `heavy`, `extra-black`, `ultra-black`.

### cubicBezier

An array of four numbers: `[P1x, P1y, P2x, P2y]`.

### number

A JSON number. Use it for unitless values such as line height.

### shadow, border, transition

| Type | Required properties |
| --- | --- |
| `shadow` | `color`, `offsetX`, `offsetY`, `blur`, `spread` |
| `border` | `color`, `width`, `style` |
| `transition` | `duration`, `delay`, `timingFunction` |

Each property takes a value of the matching type, or a reference.

## What the bundled scripts cover

| Feature | `validate-tokens.mjs` | `export-tokens.mjs` |
| --- | --- | --- |
| Names, `$value`, type resolution, curly brace references | Checked | Used |
| color, dimension, duration, fontFamily, fontWeight, cubicBezier, number | Checked | Exported |
| shadow | Required properties checked | Exported |
| border, transition | Required properties checked | Skipped with a message |
| strokeStyle, gradient, typography | Warning only | Skipped with a message |
| `$ref`, `$extends` | Warning only | Not processed |

Because composite `typography` tokens are not checked or exported, the example file stores type as separate primitive tokens: family, weight, size and line height.
