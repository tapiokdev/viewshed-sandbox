# Future development ideas

Not implemented — notes for future sessions.

The first two ideas share one concept and should be built together; the third is
independent but pairs well visually.

## 1. Let the user set B even when no route exists ("route pending" state)

Today a failed launch refuses the B click outright: `startFlight`'s `if (!path)`
branch clears `ptB`, parks the drone at A, and says "No route under max
altitude". Since routes now replan on every parameter change, the better UX is
to accept both points and treat "no route" as a *state*, not an error:

- Keep `ptA`/`ptB` on a failed plan; enter a `routePending` state. The A/B
  labels already draw whenever `ptB` is set, so the map shows both points with
  no polyline between them — that absence, plus a stats line ("no route under
  this ceiling — raise max alt"), is the "no route shows on the map" signal.
  Optionally draw a thin dashed red A→B line to make the blocked intent
  explicit.
- Every flight-relevant parameter change already funnels through
  `replanFlight()`; extend its not-flying branch (which now handles the
  auto-replay postponement) to also retry `findPath` when `routePending`.
  On success: adopt the path and launch.
- Launch on success should reuse the settle-countdown pattern (~3 s like
  auto-resume), NOT fire immediately — otherwise the flight starts mid-slider-
  drag, the exact jank the auto-replay postponement fix (37cf31f) removed.
  Stats meanwhile: "route found — launching soon".
- Hash: `ptB` persisting means `B=` stays in the URL, so a shared link can
  carry an *unsolvable-until-you-fix-it* scenario that starts flying the moment
  the viewer raises the ceiling. The hash-restore launch failure path needs the
  same keep-B treatment as the click path.

## 2. Mid-flight replan failure: clear the route instead of keeping the old one

Today `replanFlight`'s `if (!path)` branch keeps the stale path ("old route
kept" note), and resuming flies the drone through walls the current ceiling
forbids. Once idea 1 exists, the honest behavior is to fall into the same
pending state:

- On a failed mid-flight replan: `flightPath = null`, drone stays frozen at its
  current (fractional) position, `routePending` with the plan origin being the
  *current position*, not A (`ptA` is kept only for replay semantics).
- Each subsequent parameter change retries from the frozen position; when a
  route reappears, adopt it and resume via the same ~3 s countdown.
- The pause button has nothing to resume while pending — disable it (or label
  it "no route"). Left click/drag still cancels everything, as today.
- Coverage (`seen`) should persist through the pending gap — it's still the
  same sortie.

Combined model for 1+2: `routePending` = "origin (A or current position) and B
are known, but no legal path exists; every replan trigger retries; success
adopts + counts down to launch/resume." One state, two entry points.

## 3. Show ceiling walls + sensor coverage while planning a route

The purple walls and orange sensor union currently appear only on hover/pin of
their sliders, and placing A or B *dismisses* the pinned preview (map
`pointerdown` clears `ceilSticky`/`snSticky`) — exactly when the information is
most needed. Observed usage: hovering the max-alt slider constantly while
thinking about where to fly.

- Proposal: in drone mode, whenever no flight path is active (`!ptB`, or
  `routePending` from ideas 1–2), render both constraint layers automatically —
  no hover needed. Once a flight launches, they disappear and the flight
  overlay takes over. Hover-peek stays as-is for the full-strength look and for
  other situations.
- Noise control (the acknowledged worry) — options, roughly in order of appeal:
  - Draw the ambient walls as *outlines*: only blocked cells with at least one
    unblocked 4-neighbor get the purple tint. Reads as a contour line around
    impassable regions instead of a filled mass; interiors stay legible.
  - Lower the ambient opacity well below the hover version (e.g. half), so
    peeking still "lights up" the full layer.
  - Sensor union probably keeps its fill (it IS an area quantity) but at the
    reduced ambient opacity; full orange on hover/placement as today.
- The parked observer viewshed (green/red at A) still renders during planning;
  three overlapping hues is the noisy worst case. If it's too much, precedence
  during planning could be: walls outline > sensor fill > viewshed — or suppress
  the red "hidden" tint during planning and keep only green.
- Pairs with idea 1: the ambient walls are what *explain* a pending route — the
  user sees the purple band separating A from B while the stats say "no route".

Open question for all three: should a pending route auto-launch when it first
becomes valid (recommended: yes, with the countdown + a "launching soon" note,
consistent with the auto-resume/auto-replay demo-loop behavior), or wait for an
explicit click? The auto toggles could gate this too: with auto-resume off,
pending success could just show the route and wait.
