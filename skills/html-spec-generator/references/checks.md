# Checking the page, and rendering it offline

How to run the Step 8 checks without looking at the page by eye, and how to
make a copy whose diagrams need no network.

## Headless checks

Any headless browser works. With Playwright for Node (not a dependency of this
skill; use it when the machine has it). The script is an ES module, and ES
modules ignore `NODE_PATH`: put it in a folder where `import 'playwright'`
resolves (a scratch folder with `npm i playwright`, or a `node_modules` symlink
to an existing install). When the browsers are installed outside Playwright's
default cache, set `PLAYWRIGHT_BROWSERS_PATH` to their folder.

```javascript
// check-page.mjs: node check-page.mjs docs/architecture.html
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';

const file = pathToFileURL(process.argv[2]).href;
const browser = await chromium.launch();
for (const width of [1280, 375]) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(file, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500); // Mermaid renders after load
  const report = await page.evaluate(() => {
    const blocks = [...document.querySelectorAll('pre.mermaid')];
    const offline = document.documentElement.classList.contains('no-mermaid');
    // rendered height of each label, in screen pixels: under 11 px the text is too small to read
    const tiny = [...document.querySelectorAll('pre.mermaid svg text, pre.mermaid svg foreignObject span')]
      .filter((el) => el.textContent.trim() && el.getBoundingClientRect().height > 0 && el.getBoundingClientRect().height < 11).length;
    const cards = [...document.querySelectorAll('.diagram-card')];
    return {
      offline,
      diagrams: blocks.length,
      // an error diagram is an SVG too: count it as a syntax error, not as rendered
      rendered: blocks.filter((b) => b.querySelector('svg') && !/Syntax error/i.test(b.textContent)).length,
      syntaxErrors: blocks.filter((b) => /Syntax error/i.test(b.textContent)).length,
      tinyText: tiny,
      deadNavLinks: [...document.querySelectorAll('nav.site-nav a[href^="#"]')].filter((a) => !document.getElementById(a.getAttribute('href').slice(1))).map((a) => a.getAttribute('href')),
      pageScrollsSideways: document.documentElement.scrollWidth > window.innerWidth,
      background: getComputedStyle(document.body).backgroundColor,
      wideCards: cards.filter((c) => c.scrollWidth > c.clientWidth).length,
      overWide: cards.filter((c) => c.scrollWidth > 2 * c.clientWidth).length,
      // document.fonts.check() answers true for a family with no @font-face at all, so read the faces instead
      fonts: ['Satoshi', 'Instrument Serif', 'JetBrains Mono'].map((f) => [f, [...document.fonts].some((face) => face.family.replace(/"/g, '') === f && face.status === 'loaded')])
    };
  });
  console.log(width, JSON.stringify(report), errors);
  await page.close();
}
await browser.close();
```

Read the report as:

- `rendered` equals `diagrams` and `syntaxErrors` is 0, or `offline` is true
  (Mermaid could not load) and the offline note is visible.
- `tinyText` is 0 at 1280 px. A wide diagram that fails it needs
  `useMaxWidth: false` for its type, or a split into two diagrams.
- `deadNavLinks` is empty, `pageScrollsSideways` is false at both widths,
  `background` is `rgb(250, 248, 244)` (house style) or `rgb(247, 247, 245)`
  (neutral style).
- `fonts` (house style only): all true with network (a face loads only once
  text uses it, so the page must use all three). A false entry with the font
  host blocked is expected; the text then uses the fallback stack.
- `wideCards` counts diagrams that scroll sideways inside their card: fine,
  never the page itself. `overWide` is 0 at 1280 px: a diagram more than twice
  its card's width is compacted or split (SKILL.md Step 3). At 375 px every
  diagram scrolls; ignore `overWide` there.
- The only console errors are requests to an unreachable font or Mermaid host.

To check that a Mermaid block parses without rendering the page, call
`await mermaid.parse(source)` in the page for each block's source; it throws
on a syntax error.

Links into other files (`UI_SCREENS.md#s-1.2.3`, `../mockups/player-app.html#s-1.2.3`,
or the Git host URL of a document) are checked from the file system: the file
exists under `docs/` (for a host URL, the path after `blob/<branch>/`), and it
contains `id="s-1.2.3"`.

## A fully offline copy

When the page must work with no network (sent by email to someone behind a
strict proxy, archived), replace each diagram by its rendered SVG:

1. Open the page in a headless browser with network (or with Mermaid served
   locally from the `mermaid@10.9.0` npm package for the CDN URL).
2. After rendering, take each `pre.mermaid` element's `innerHTML` (the SVG).
3. Write a copy of the page in which each `<pre class="mermaid">` is replaced by
   `<div class="mermaid-svg">` holding that SVG, and the two Mermaid scripts and
   the offline note are removed.

The SVG keeps the theme colors Mermaid wrote into it. Keep the Mermaid source in
an HTML comment next to each SVG so the next regeneration starts from it. Fonts
still come from their hosts and fall back to the stacks in `:root` without
network, which leaves the page readable.
