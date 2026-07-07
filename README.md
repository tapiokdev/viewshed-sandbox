# Terrain Viewshed Sandbox

A self-contained, client-side terrain viewshed sandbox in a single HTML file.
No libraries, no build step, no backend — open `index.html` in a browser.

## Quick start

```
open index.html
```

Default scenario: procedural ridged mountains (fresh random seed on every
bare open; URLs with a seed reproduce their exact terrain), drone mode. Click once to set
point **A**, click again to set **B** — the drone flies the planned route and
the visibility overlay follows it. The full scenario state lives in the URL
hash, so any moment can be bookmarked or shared.

The chrome is a calibrated-instrument layout: the map sits in a well with the
**altimeter** on its right edge, a flight strip (transport + progress +
countdown) directly beneath it, and a sidebar of grouped sections (Mode,
Terrain, Parameters, Flight, Sensors, View, Inspector). Below 900 px it reflows
to one column with the sections as accordions and a touch tool switcher.

## Features

- **Terrain**: 200×200 grid, 30 m cells. Seeded procedural presets (rolling
  fBm hills, ridged multifractal mountains) plus two analytic verification
  presets (flat plane, single gaussian ridge). Hypsometric elevation tint over
  a grayscale hillshade, read against the altimeter's elevation ramp.
- **Modes** (a segmented control at the top of the panel)
  - *observer* — click a cell, see what it sees.
  - *drone A→B* — the observer flies a planned route at a set height above
    ground; viewshed updates each frame (~5–15 fps, synchronous by design).
    The flight strip under the map carries pause/resume, replay, a progress
    bar and a live countdown; a chip by the status line reads planning /
    route pending / flying / paused / landed. A speed slider (0.1×–1.5×,
    default 0.75×) trades pace for detail live. Changing a flight-relevant
    parameter (height, ceiling, range, sensors) mid-flight pauses the drone
    and replans the remaining route from its current position; by default the
    flight auto-resumes ~3 s after the last change and auto-replays 5 s after
    landing (each a toggle), so a shared scenario URL loops as a self-running
    demo. A manual pause always sticks.
  - *exposure* — inverse viewshed: click a target, see everywhere it can be
    seen **from** (uses LOS reciprocity; zero extra physics).
  - Switching modes keeps the marked point, reinterpreting its role. Target
    height is hidden in drone mode and treated as 0 there, so a control that
    isn't shown can't silently shape the field.
- **Altimeter**: the elevation ramp and the flight ceiling fused into one
  vertical instrument on the canvas's right edge. It maps 0–400 m; the
  hypsometric ramp colours the terrain's elevation band, and in drone mode a
  purple band marks the heights above the ceiling (the walls) with a draggable
  thumb, plus a tick at the live eye altitude. Hovering it previews the walls
  on the map. Below 900 px it demotes to a horizontal *Flight ceiling* slider
  under the map.
- **Pathfinding**: the flight ceiling (set on the altimeter) makes tall
  terrain impassable, and the drone plans an A* route around those walls,
  smoothed into straight legs by string-pulling. While a route is being planned
  (before launch) the map shows the walls on its own as a purple contour
  outline, plus sensor coverage as a pale orange fill; the green/red viewshed
  overlay arrives with the launch. Hovering or dragging the altimeter, or
  adjusting the mast-height slider, still previews either layer at full
  strength. No route under the ceiling → route
  pending: A and B stay on the map joined by a dashed red line, every
  parameter change retries the plan, and the flight takes off by itself ~3 s
  after a route appears (with auto-resume on; otherwise it waits for *replay
  flight*). A mid-flight change that walls off B freezes the drone in place
  in the same pending state — coverage intact — and it resumes the sortie
  once a route reappears. A shared URL can carry an unsolvable scenario that
  starts flying the moment the viewer raises the ceiling.
- **Sensors & stealth**: with a mouse, hold the right button to place a sensor
  mast — it follows the cursor and commits on release; right-drag a mast to
  move it, plain right-click to remove it. On a touch screen, switch the tool
  above the map to *sensors* and tap to place, drag to move, tap a mast to
  remove. While placing, while hovering a mast (tapping one on touch), and
  while hovering or adjusting the mast-height slider, an orange preview shows
  the union of sensor viewsheds (what the masts see). Planned flights softly
  avoid terrain the sensors can see (cost ×8); exposed route legs draw red, and
  masts flash red live while they have a clear sight line to the drone.
  Coverage-trail toggle accumulates everything seen during a flight.
- **Sightline profile**: hover any cell (with an observer set) for a
  cross-section showing the curved-earth ground, the line of sight, and the
  exact sample that blocks it, in the Inspector section.
- **Gestures**: click/tap (place), drag (pilot the observer/drone live),
  right-drag or the touch *sensors* tool (place/move a mast), right-click or
  tap a mast (remove it). Listed under the map per mode.

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
