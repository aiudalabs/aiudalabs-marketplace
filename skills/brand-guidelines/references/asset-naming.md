# Asset organization and naming

Adapted from the `brand` skill in ui-ux-pro-max (MIT, Next Level Builder). See `THIRD_PARTY_NOTICES.md` in this skill.

People find brand files by browsing a folder or by searching a name. Both work only if the structure and the names are predictable.

## Folder structure

```
brand/
├── brand-guidelines.md
├── brand-brief.md
├── tokens/
│   ├── brand.tokens.json
│   ├── brand.dark.tokens.json
│   └── brand.css
├── logo/
│   ├── svg/
│   ├── png/
│   └── source/
├── fonts/
├── icons/
├── images/
├── templates/
└── archive/
```

- Keep source files (`.ai`, `.fig`, `.sketch`) in `source/`, apart from the exports people actually use.
- Move retired files to `archive/` with the date in the folder name. Do not delete them, and do not leave them beside current files.
- Store fonts only if their license allows redistribution within the team.

## File naming

Use lowercase and hyphens. No spaces, no version words like "final".

```
{brand}-{asset}-{variant}-{color}-{size}.{ext}
```

| Part | Values | Required |
| --- | --- | --- |
| brand | The brand name, lowercase | Yes |
| asset | `logo`, `symbol`, `wordmark`, `icon`, `pattern` | Yes |
| variant | `horizontal`, `stacked`, `square` | When there is more than one |
| color | `color`, `mono`, `reversed` | For logos |
| size | Pixel width, or `1x` and `2x` | For raster files |

Examples:

```
acme-logo-horizontal-color.svg
acme-logo-horizontal-reversed.svg
acme-symbol-mono.svg
acme-symbol-color-512.png
```

## One file per variant

Do not combine light and dark versions, or several sizes, in one file. A person looking for "the white logo" should find a file with that name.

## Formats

| Format | Use for |
| --- | --- |
| SVG | The master for logos and icons. Scales to any size. |
| PNG | Where SVG is not accepted, and where transparency is needed |
| PDF | Print, when the printer asks for vector |
| JPG | Photographs only. Never for logos: it has no transparency and blurs edges. |

## Versions

The files in `brand/` are always the current version. The version number lives in the guide and the tokens file, not in file names. When a major version replaces the logo or colors, move the old files to `archive/{date}/` in the same change.
