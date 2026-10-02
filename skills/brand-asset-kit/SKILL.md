---
name: brand-asset-kit
description: Produces the image files a brand needs from its logo and colors, such as favicon, web app and app store icons, maskable icons, Apple touch icon and social share images, at the exact pixel sizes each platform asks for, and verifies every file. Use when the user asks for a favicon, app icons, PWA icons, an Open Graph or social share image, logo exports in PNG, or a full set of brand assets.
license: MIT
compatibility: The render script needs Node.js 18 or later and one renderer already installed, either a Chromium-based browser (Chrome, Chromium or Edge) or ImageMagick. It installs nothing. Without a renderer it lists the files still to be produced.
metadata:
  version: "0.1.0"
  author: aiudalabs
---

# Brand Asset Kit

Turn a finished logo into the files that websites, app stores and social platforms ask for, at the right sizes, and prove each file is what it claims to be.

## Inputs

- The logo as SVG: at least the symbol or a square-friendly variant, and the full logo
- The brand colors, for backgrounds
- Which surfaces are in scope: website, installable web app, iOS app, Android app, social sharing

If there is no SVG logo yet, stop. Exporting from a screenshot or a low-resolution PNG produces blurry assets. Get the SVG first.

## Workflow

### 1. Decide what is needed

Go through [references/platform-sizes.md](references/platform-sizes.md) with the user and list only the assets for surfaces that are in scope. Each size in that file has its source; where the file says a value is a convention, treat it as one.

For printed and physical items such as business cards or signage, [references/deliverables.csv](references/deliverables.csv) lists 50 typical deliverables with usual dimensions and formats. The dimensions in that table are common conventions, not requirements: confirm them with the printer. Those items need a designer and a printer; this skill covers screen assets.

### 2. Check the renderer

```bash
node scripts/render-assets.mjs asset-manifest.json --check
```

It reports which renderer it found. A Chromium-based browser renders both SVG and HTML sources and loads web fonts. ImageMagick renders SVG sources only, and text in the SVG needs the font installed, so prefer logos with text converted to outlines. With no renderer, deliver the SVG files and the list of sizes still pending, and say so.

### 3. Write the manifest

Copy [assets/asset-manifest.template.json](assets/asset-manifest.template.json) and edit it. Each entry names the output, its source, its exact pixel size, and optionally a background and padding:

```json
{ "name": "icon-512-maskable", "source": "logo/acme-symbol-color.svg", "width": 512, "height": 512, "background": "#ffffff", "padding": 112 }
```

- Use the symbol, not the full logo, for anything square and small.
- Icons that a platform will crop to a shape need padding, so nothing important is cut. See the safe zone notes in the sizes reference.
- Icons that must not be transparent need a `background`.

### 4. Build the social share image

Copy [assets/og-image.template.html](assets/og-image.template.html), set the brand colors, font and text, and inline the logo SVG. Add it to the manifest as an HTML source at 1200 by 630. Keep the text short and large: the image is often shown small.

Write only what the user has given you. Do not invent a tagline.

### 5. Render and verify

```bash
node scripts/render-assets.mjs asset-manifest.json
```

The script writes each PNG, reads it back, and checks its pixel size against the manifest. It prints `ok`, `FAILED` or `pending` per file. Exit code 0 means everything was rendered and verified.

Then look at the results yourself, especially the smallest icon. A mark that is unreadable at 32 pixels needs the simplified small-size variant, not a different export setting.

### 6. Hand over

Deliver the files with the snippet that uses them, taken from the sizes reference: the `<link>` tags for the favicon and Apple touch icon, the `icons` entries for the web app manifest, and the `og:image` meta tag.

## Output

1. The asset manifest, so the kit can be regenerated when the logo changes
2. The rendered PNG files and the SVG sources
3. The script output showing each file verified
4. The HTML and manifest snippets
5. A list of anything pending, with the reason

## Quality checks

- [ ] Every file was rendered from SVG or HTML, never upscaled from a raster image
- [ ] The script reported `ok` for every file, with the size it verified
- [ ] Maskable and platform-cropped icons keep the mark inside the safe zone
- [ ] Icons that must be opaque have a background
- [ ] The smallest icon was looked at and is legible
- [ ] No text in the share image was invented
- [ ] Sizes came from the reference, and conventions are labeled as conventions
