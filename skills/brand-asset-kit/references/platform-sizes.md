# Platform asset sizes

Each requirement below names its source. Platform requirements change, so open the source before a release and confirm. Sizes were read from these sources on 2026-10-02.

Where no authoritative source was found, the entry says "convention".

## Website

### Favicon

| Asset | Size | Status |
| --- | --- | --- |
| `favicon.svg` | Vector | Convention. Scales to any size; supported by current browsers. |
| `favicon-32.png` | 32 × 32 | Convention. A common fallback size. |

There is no single standard set of favicon sizes. An SVG plus one small PNG covers current browsers. Add an `.ico` file only if you must support software that requires it.

```html
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon-32.png" sizes="32x32" type="image/png">
```

### Apple touch icon

Source: Chrome for Developers, Lighthouse apple-touch-icon audit, <https://developer.chrome.com/docs/lighthouse/pwa/apple-touch-icon>

| Asset | Size | Notes |
| --- | --- | --- |
| `apple-touch-icon.png` | 180 × 180 (192 × 192 is also accepted) | The background must not be transparent |

```html
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
```

### Social share image (Open Graph)

Source: Meta for Developers, Images in Link Shares, <https://developers.facebook.com/docs/sharing/webmasters/images/>

| Property | Value |
| --- | --- |
| Recommended size | At least 1200 × 630 |
| Minimum for a large preview | 600 × 315 |
| Aspect ratio | As close to 1.91:1 as possible |
| Maximum file size | 8 MB |

```html
<meta property="og:image" content="https://example.com/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
```

Other platforms read the same tag but may crop differently. Keep the logo and text away from the edges.

## Installable web app (PWA)

Sources: web.dev, Add a web app manifest, <https://web.dev/articles/add-manifest>; web.dev, Maskable icons, <https://web.dev/articles/maskable-icon>; MDN, Define your app icons, <https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/How_to/Define_app_icons>

| Asset | Size | Notes |
| --- | --- | --- |
| `icon-192.png` | 192 × 192 | Required by Chromium |
| `icon-512.png` | 512 × 512 | Required by Chromium |
| `icon-512-maskable.png` | 512 × 512 | Optional. Declared with `"purpose": "maskable"`. |

**Maskable safe zone.** The platform may crop a maskable icon to a circle or another shape. Only a centered circle with a diameter of 80% of the icon is guaranteed to stay visible. The background must fill the whole square, and the mark must fit inside that circle.

For a 512 pixel icon the safe circle is about 410 pixels across. A square mark fits inside it with about 112 pixels of padding on each side; a round mark needs about 52.

```json
{
  "icons": [
    { "src": "icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "icon-512-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

## iOS, iPadOS and macOS apps

Source: Apple Human Interface Guidelines, App icons, <https://developer.apple.com/design/human-interface-guidelines/app-icons>

| Asset | Size | Notes |
| --- | --- | --- |
| App icon | 1024 × 1024 | Square. The system applies the mask, so do not round the corners yourself. |

Current Apple platforms build icons from layers and support several appearances, including dark and tinted. A single flat PNG is a starting point. Follow the guidelines and Apple's tooling for the final icon.

## Android apps

Sources: Android Developers, Adaptive icons, <https://developer.android.com/develop/ui/views/launch/icon_design_adaptive>; Google Play Console Help, preview assets, <https://support.google.com/googleplay/android-developer/answer/9866151>

| Asset | Size | Notes |
| --- | --- | --- |
| Adaptive icon layers | 108 × 108 dp each | Separate foreground and background layers. Keep the mark inside the central 66 × 66 dp safe zone; the outer 18 dp on each side can be masked. |
| Monochrome layer | 108 × 108 dp | For themed icons |
| Google Play store icon | 512 × 512 px | 32-bit PNG, up to 1024 KB |
| Google Play feature graphic | 1024 × 500 px |  |

Adaptive icons are defined in density-independent pixels and are normally produced as vector drawables in Android Studio. Export the store icon and feature graphic with this skill, and build the adaptive icon in the Android toolchain.

## Social profiles

Profile and cover image sizes differ by platform and change often, so they are not listed here. Before producing them, open each platform's current help page and record the size and its source in the manifest. As a general rule, profile images are square and are displayed cropped to a circle, so use the symbol with generous padding.

## Summary: a typical website and web app kit

| File | Size | Background | Padding |
| --- | --- | --- | --- |
| `favicon.svg` | vector | transparent | none |
| `favicon-32.png` | 32 × 32 | transparent | none |
| `apple-touch-icon.png` | 180 × 180 | solid | a little, by eye |
| `icon-192.png` | 192 × 192 | transparent or solid | none |
| `icon-512.png` | 512 × 512 | transparent or solid | none |
| `icon-512-maskable.png` | 512 × 512 | solid | inside the 80% circle |
| `og-image.png` | 1200 × 630 | solid | keep content off the edges |
