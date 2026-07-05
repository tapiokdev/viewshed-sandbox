# Future development ideas

Not implemented — notes for future sessions.

## Sensor placement by right-click-drag

Place a sensor on right-button *release* rather than immediately on
right-click, with the mast following the cursor during the drag. Lets the
user fine-tune the spot before committing.

- Needs `pointerdown`/`pointermove`/`pointerup` handling for button 2 (plus
  `contextmenu` suppression); the current instant placement lives in the
  `contextmenu` handler.
- A plain right-click (no drag) on an existing mast should still remove it.
- Pairs naturally with the sensor-visibility preview below: while dragging,
  the preview would update live under the cursor.

## Sensor visibility preview

While placing a sensor (and while adjusting sensor height), show visibility
*from the sensors* (union of sensor viewsheds) instead of the observer/drone
viewshed — the same peek/pin pattern as the max-alt ceiling preview.

- The union field already exists at flight launch (`startFlight`'s exposure
  computation); this would surface it interactively.
- Cost is one viewshed per sensor per update — same as a launch, fine for a
  hover/drag preview with few sensors.
- Open question: overlay color. Exposure ("seen by sensors") probably wants
  its own hue (e.g. orange) so it can't be confused with the green
  observer-viewshed or the purple ceiling walls.

## Sensor height as a slider

Change `Sensor h` from a number input to a slider like max alt (with live
value label). Continuous `input` events would drive the sensor-visibility
preview above, mirroring how the ceiling slider drives the wall preview.
