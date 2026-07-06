---
name: verify
description: How to verify changes to the viewshed analyzer end-to-end (node tests + driving index.html in a headless browser)
---

# Verifying changes in this repo

Two surfaces: the pure-computation core (`<script id="core">` in `index.html`)
and the browser UI around it.

## Core / physics / algorithms

```
node test.js
```

No dependencies. The tests eval the core script block directly; new pure
functions must be added to the export list at the top of `test.js`.

## UI / gestures / rendering

Drive `index.html` with Playwright (no server needed — `file://` works):

```bash
cd <scratchpad> && npm i playwright && npx playwright install chromium
```

```js
const { chromium } = require('playwright');
const page = await (await chromium.launch()).newPage();
await page.goto('file:///Users/tapiok/projects/gis1/index.html');
```

Gotchas that matter here:

- **App state is inspectable**: top-level `let` globals (`sensors`, `obs`,
  `ptA`, `snDrag`, `ceilSticky`, …) are reachable from `page.evaluate` as bare
  identifiers; so is `#stats` text (the main behavioral readout) and
  `location.hash` (full scenario state).
- **Canvas coords**: the map is 200×200 cells on a 600×600 canvas; convert
  with `box.x + (gx + 0.5) / 200 * box.width` from `#cv`'s bounding box.
- **Gestures**: left-drag pilots, right-drag places sensors — use
  `page.mouse.down({button:'right'})` / `move` / `up`; the app suppresses
  `contextmenu` itself.
- **Hash-only `page.goto` does NOT reload the page** — call `page.reload()`
  after navigating to a hash URL to test hash restoration.
- **Hash writes are debounced 300 ms** — wait ≥400 ms before reading
  `location.hash` after an action.
- Flights animate over 4–20 s; wait a few seconds mid-flight before reading
  flight stats. Screenshots of the page are the evidence for overlays
  (green viewshed, orange sensor preview, purple ceiling walls).
