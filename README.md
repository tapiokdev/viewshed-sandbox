# Terrain Viewshed Sandbox

A self-contained, client-side terrain viewshed sandbox in a single HTML file.
No libraries, no build step, no backend — open `index.html` in a browser.

## Quick start

```
open index.html
```

Default scenario: procedural ridged mountains, drone mode. Click once to set
point **A**, click again to set **B** — the drone flies the planned route and
the visibility overlay follows it. The full scenario state lives in the URL
hash, so any moment can be bookmarked or shared.

## Features

- **Terrain**: 200×200 grid, 30 m cells. Seeded procedural presets (rolling
  fBm hills, ridged multifractal mountains) plus two analytic verification
  presets (flat plane, single gaussian ridge). Hypsometric elevation tint over
  a grayscale hillshade, with a legend.
- **Modes**
  - *observer* — click a cell, see what it sees.
  - *drone A→B* — the observer flies a planned route at a set height above
    ground; viewshed updates each frame (~5–15 fps, synchronous by design).
    Flights can be paused/resumed, and a speed slider (0.25×–4×) gives
    slow-motion or fast-forward live. Changing a flight-relevant parameter
    (height, ceiling, range, sensors) mid-flight pauses the drone and replans
    the remaining route from its current position.
  - *exposure* — inverse viewshed: click a target, see everywhere it can be
    seen **from** (uses LOS reciprocity; zero extra physics).
  - Switching modes keeps the marked point, reinterpreting its role.
- **Pathfinding**: a max-altitude ceiling makes tall terrain impassable, and
  the drone plans an A* route around those walls, smoothed into straight legs
  by string-pulling. Hovering or adjusting the ceiling slider previews the
  walls in purple. No route → the flight refuses to launch and says why.
- **Sensors & stealth**: hold the right button to place a sensor mast — it
  follows the cursor and commits on release; right-drag a mast to move it,
  plain right-click to remove it. While placing, and while hovering or
  adjusting the mast-height slider, an orange preview shows the union of
  sensor viewsheds (what the masts see). Planned flights softly avoid terrain
  the sensors can see (cost ×8); exposed route legs draw red, and masts flash
  red live while they have a clear sight line to the drone. Coverage-trail
  toggle accumulates everything seen during a flight.
- **Sightline profile**: hover any cell (with an observer set) for a
  cross-section showing the curved-earth ground, the line of sight, and the
  exact sample that blocks it.
- **Gestures**: click (place), drag (pilot the observer/drone live),
  right-drag (place/move a sensor), right-click a mast (remove it). Listed
  under the map per mode.

## Physics

- **Earth curvature + refraction**: every sightline sample drops by
  `d² / (2·R_eff)` with `R_eff = 7/6 × 6371 km` — the classic effective-earth
  model for standard atmospheric refraction. On the flat-plane preset the
  visible disk ends at `√(2·R_eff·h)` (≈ 5.45 km for a 2 m observer),
  verified against the analytic value.
- **Sub-cell sampling**: rays sample bilinearly-interpolated elevation every
  15 m rather than snapping to cells, so viewshed edges are smooth and
  direction-independent (see the comment on `elevAt` in the source).
- **Heights** sit on top of ground elevation: observer/drone height, target
  height, and sensor mast height are all independent inputs.
- **Reciprocity**: visibility between two points is symmetric under exchange
  of heights — the property that makes the exposure mode a single viewshed
  call. Verified numerically in the test suite.

## Verification

```
node test.js
```

43 checks, no dependencies. The pure computation functions are extracted from
the `<script id="core">` block of `index.html` (kept deliberately DOM-free)
and tested against analytic ground truth: the flat-plane horizon disk, ridge
shadowing, tangent grazing at a rounded crest, LOS reciprocity, seeded-terrain
determinism, pathfinding around synthetic obstacles, stealth-routing
detours vs. crossings, and the union of sensor viewsheds.

The `flat plane` and `single ridge` presets exist for eyeball verification in
the browser — the help fold in the app explains what to look for.

## Implementation notes

- One file; the core physics/algorithms live in a DOM-free script block so
  the node tests can eval them directly.
- Everything is synchronous — no workers. A full 200×200 viewshed costs
  ~100–250 ms; flights advance by wall-clock time so choppiness never changes
  the drone's ground speed.
- A* runs once per launch (~15 ms) — routing is never the bottleneck.
