# THE GOAL, WITH HELP FROM OPUS

Build a single self-contained client-side web app: a terrain viewshed analyzer. Keep it minimal — one HTML file, plain canvas, no libraries, no backend, no upload.

Terrain: generate a synthetic 200×200 elevation grid in code (e.g. sum of a few sines/gaussian hills), 30 m square cells, elevations in meters. Add a dropdown with two extra presets used for verification: "flat plane" and "single ridge".

Interaction: user clicks a cell to place the observer. Number inputs for observer height (default 2 m), target height (default 0 m), and max range (default: covers the grid). On click, compute which cells are visible and draw a translucent visible/not-visible overlay over a grayscale hillshade of the terrain.

Reason carefully about these — they're the point, don't pattern-match a tutorial:
- Earth curvature drop over distance (~d²/2R) and atmospheric refraction (use effective radius ≈ 7/6·R).
- Observer and target heights added on top of ground elevation.
- Sub-cell sampling: when a sightline passes between grid cells, interpolate the elevation rather than snapping to the nearest cell; justify the choice in a code comment.

Verification behavior: on "flat plane", everything inside the curvature-limited horizon is visible; on "single ridge", there's a clean shadow behind the ridge. Make both visually obvious so I can eyeball correctness.

Keep it lean: a direct per-cell ray-cast is fine — 200×200 runs fast synchronously, so no Web Workers and no sweep-line optimization. Don't over-build the UI or styling.

# FOOTNOTE FROM USER
The important thing is that there's limited amount of tokens. If you know there are intermediate simple-but-sizeable workloads, alert me to switch to another model for those.

This is a demo app, so you are allowed to make your own design calls on e.g. interaction as you see fit, but don't create anything too demanding. If the given design is fine, you can stick to it 100%.
