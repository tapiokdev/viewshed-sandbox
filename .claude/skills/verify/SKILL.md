---
name: verify
description: How to verify changes to the viewshed sandbox end-to-end (node tests + driving index.html in a headless browser)
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

- **App state is inspectable**: top-level `let`/`const` globals (`sensors`,
  `obs`, `ptA`, `ptB`, `flying`, `paused`, `routePending`, `pendingResume`,
  `snDrag`, `ceilSticky`, `snSticky`, `snMastHover`, `seen`, `touchTool`,
  `coarse`, the countdown deadlines `launchAt`/`autoResumeAt`/`autoReplayAt`
  and their `countdownTicker`, …) are reachable from `page.evaluate` as bare
  identifiers; so is `#stats` text (the main behavioral readout) and
  `location.hash` (full scenario state).
- **Layout landmarks** (all IDs stable): `#cv` map; `#altimeter`/`#altBar`
  the vertical instrument beside it; `#flightstrip` (pause/replay/`#progFill`
  progress/`#countdown`); `#stateChip` beside `#stats`; the sidebar sections
  are `<details class="panel-sec">` (Mode…Inspector), open+inert on desktop,
  accordions < 900 px.
- **Canvas coords**: the map is 200×200 cells on an internal 600×600 canvas,
  but the element is CSS-scaled below 900 px — always convert through the live
  bounding box: `box.x + (gx + 0.5) / 200 * box.width` (never hard-code 600).
- **Gestures (mouse)**: left-drag pilots, right-drag places sensors — use
  `page.mouse.down({button:'right'})` / `move` / `up`; the app suppresses
  `contextmenu` itself. The **flight ceiling** is set by dragging `#altBar`
  (drone mode) or by driving the hidden `#maxAlt` range input via events;
  hovering `#altimeter` sets `ceilHover` for the wall preview.
- **Touch/coarse**: use a context with `hasTouch:true, isMobile:true` so
  `(pointer: coarse)` matches (`coarse === true`). A `[navigate|sensors]`
  tool switcher (`.toolswitch .seg`) reroutes the primary pointer: in the
  sensors tool a `touchscreen.tap` places a mast, a tap on a mast removes it,
  and a drag moves it (dispatch `pointerdown/move/up` with `pointerType:touch`
  since Playwright has no touch-drag helper). Hit radius is 4 cells on coarse.
- **Hash-only `page.goto` does NOT reload the page** — call `page.reload()`
  after navigating to a hash URL to test hash restoration. Hash schema is
  frozen (`p s m h t r a sh v c sn A B o`).
- **Hash writes are debounced 300 ms** — wait ≥400 ms before reading
  `location.hash` after an action.
- Flights animate over 4–20 s; wait a few seconds mid-flight before reading
  flight stats. Screenshots of the page are the evidence for overlays
  (green viewshed, orange sensor preview, purple ceiling walls) and chrome.
