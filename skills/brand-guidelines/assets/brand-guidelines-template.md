# [Brand name] brand guidelines

Version: [0.1.0] · Last updated: [YYYY-MM-DD] · Status: [Draft / Approved] · Owner: [name]

Replace every bracketed placeholder. If something has not been decided, write "Not defined yet" and add it to section 10.

## 1. Quick reference

| Element | Value |
| --- | --- |
| Primary color | [hex] |
| Text color | [hex] on [hex] |
| Heading font | [family, weight] |
| Body font | [family, weight] |
| Logo files | [path] |
| Tokens file | [path] |

## 2. Who we are

[One or two sentences on what the company does and for whom, from the brand brief.]

### Brand attributes

| Attribute | What it means | What it rules out |
| --- | --- | --- |
| [attribute] | [meaning] | [exclusion] |
| [attribute] | [meaning] | [exclusion] |
| [attribute] | [meaning] | [exclusion] |

Every rule below traces back to one of these.

## 3. Color

### Ramps

| Step | Primary | Neutral | Accent |
| --- | --- | --- | --- |
| 50 | [hex] | [hex] | [hex] |
| 100 | [hex] | [hex] | [hex] |
| 200 | [hex] | [hex] | [hex] |
| 300 | [hex] | [hex] | [hex] |
| 400 | [hex] | [hex] | [hex] |
| 500 | [hex] | [hex] | [hex] |
| 600 | [hex] | [hex] | [hex] |
| 700 | [hex] | [hex] | [hex] |
| 800 | [hex] | [hex] | [hex] |
| 900 | [hex] | [hex] | [hex] |
| 950 | [hex] | [hex] | [hex] |

Why this primary: [reason, citing a brand attribute].

### Roles

| Role | Light mode | Dark mode | Used for |
| --- | --- | --- | --- |
| Background | [step, hex] | [step, hex] | [use] |
| Surface | [step, hex] | [step, hex] | [use] |
| Text | [step, hex] | [step, hex] | [use] |
| Muted text | [step, hex] | [step, hex] | [use] |
| Action | [step, hex] | [step, hex] | [use] |
| Border | [step, hex] | [step, hex] | [use] |

Use colors through their roles. Do not pick a ramp step directly.

### Semantic colors

| State | Color | Always paired with |
| --- | --- | --- |
| Success | [hex] | [icon or label] |
| Warning | [hex] | [icon or label] |
| Error | [hex] | [icon or label] |

### Allowed pairings

Checked on [date] against WCAG 2.2.

| Text | Background | Ratio | Passes |
| --- | --- | --- | --- |
| [role] | [role] | [ratio] | [AA text / AA large text / AAA] |

### Forbidden pairings

| Text | Background | Why |
| --- | --- | --- |
| [role] | [role] | [ratio, fails] |

### Usage rules

- [Rule that can be checked, with its reason]

## 4. Typography

### Families

| Role | Family | Weights in use | Fallback stack | License and source |
| --- | --- | --- | --- | --- |
| Headings | [family] | [weights] | [stack] | [license, URL] |
| Body | [family] | [weights] | [stack] | [license, URL] |
| Code or data | [family] | [weights] | [stack] | [license, URL] |

Why these: [reason, citing a brand attribute].

### Scale

Base [size], ratio [ratio].

| Step | Used for | Size | Line height | Weight | Letterspacing |
| --- | --- | --- | --- | --- | --- |
| [name] | [job] | [rem / px] | [value] | [weight] | [value] |

### Usage rules

- Maximum line length for body text: [value]
- All caps: [where it is allowed]
- [Other rules, each with its reason]

## 5. Logo

### Variants

| Variant | File | Use when |
| --- | --- | --- |
| [Primary] | [file name] | [context] |
| [Horizontal] | [file name] | [context] |
| [Symbol only] | [file name] | [context] |
| [One color] | [file name] | [context] |
| [Reversed, for dark backgrounds] | [file name] | [context] |

### Clear space

[The rule set for this mark, expressed in a unit taken from the logo itself, with a diagram or description.]

### Minimum size

| Variant | Screen | Print |
| --- | --- | --- |
| [variant] | [value] | [value] |

Set these by testing where this mark stops being legible.

### Backgrounds

| Background | Variant to use |
| --- | --- |
| [Light] | [variant] |
| [Dark] | [variant] |
| [Photo or busy background] | [variant, and any container rule] |

### Misuse

- Do not stretch, rotate or skew the logo.
- Do not recolor it outside the approved variants.
- Do not add shadows, outlines or effects.
- Do not rebuild it by typing the name in the brand font.
- [Misuse specific to this mark]

## 6. Imagery and iconography

### Photography and illustration

- Subject: [what is shown, and what never is]
- Treatment: [lighting, color, crop]
- Sources: [where approved images come from, and their license]

### Icons

- Set: [name, source and license]
- Style: [outline or filled, stroke weight, corner style]
- Sizes: [sizes in use]

### Shape and layout

- Corner radius: [values and where each applies]
- Spacing: [scale]
- Depth: [flat, or which shadows]

## 7. Do and do not

| Do | Do not |
| --- | --- |
| [Concrete case] | [The matching mistake] |
| [Concrete case] | [The matching mistake] |
| [Concrete case] | [The matching mistake] |

## 8. Voice (optional)

Verbal identity has its own guide. If there is none yet, record the minimum here.

| We are | We are not |
| --- | --- |
| [trait] | [its excess] |

## 9. Assets

| Asset | Location | Format |
| --- | --- | --- |
| Logo files | [path or link] | [formats] |
| Tokens | [path or link] | `.tokens.json` |
| Exported CSS | [path or link] | `.css` |
| Fonts | [path or link] | [formats] |
| Templates | [path or link] | [formats] |

File naming: [pattern].

## 10. Governance

- Owner: [name and contact]
- How to request a change: [process]
- Review cadence: [when the guide is revisited]

### Exceptions log

| Date | What differs from the guide | Where | Why | Approved by | Expires |
| --- | --- | --- | --- | --- | --- |
|  |  |  |  |  |  |

### Open questions

- [What is not defined yet, and what is needed to define it]

### Changelog

| Version | Date | Change |
| --- | --- | --- |
| 0.1.0 | [date] | First draft |
