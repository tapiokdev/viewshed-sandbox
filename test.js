const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const core = html.match(/<script id="core">([\s\S]*?)<\/script>/)[1];
const { N, CELL, R_EFF, genTerrain, computeViewshed, findPath, segClear, elevAt, losVisible, exposureField } =
  (0, eval)('(function(){' + core + ';return { N, CELL, R_EFF, genTerrain, computeViewshed, findPath, segClear, elevAt, losVisible, exposureField };})()');

let fails = 0;
const check = (name, cond, detail = '') => {
  console.log((cond ? 'PASS' : 'FAIL') + '  ' + name + (detail ? '  [' + detail + ']' : ''));
  if (!cond) fails++;
};

// ---- Flat plane: horizon must sit at sqrt(2*R_EFF*h) ----
const flat = genTerrain('flat');
const h = 2, horizon = Math.sqrt(2 * R_EFF * h); // ~5452.6 m
console.log('analytic horizon for h=2m:', horizon.toFixed(1), 'm =', (horizon / CELL).toFixed(2), 'cells');

// Observer at corner (0,0), huge range
let t0 = Date.now();
const visF = computeViewshed(flat, 0, 0, h, 0, 1e9);
console.log('flat viewshed compute:', Date.now() - t0, 'ms');

// Along the x-axis: cell 181 (5430 m) inside horizon, cell 182 (5460 m) outside
check('flat: cell at 5430 m visible', visF[181] === 1, 'vis=' + visF[181]);
check('flat: cell at 5550 m (3 cells past horizon) hidden', visF[185] === 0, 'vis=' + visF[185]);

// Global: visible iff dist <= horizon, allowing a small grazing band at the
// boundary (tangent geometry: occlusion depth ~ (d-d_h)^2/2R is micrometers
// just past the horizon, so a cell or two of blur is inherent).
let mismatch = 0, maxDev = 0;
for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
  const d = Math.hypot(x, y) * CELL;
  const want = d <= horizon ? 1 : 0;
  if (Math.abs(d - horizon) < 2.5 * CELL) continue; // grazing band
  if (visF[y * N + x] !== want) { mismatch++; maxDev = Math.max(maxDev, Math.abs(d - horizon)); }
}
check('flat: visibility == analytic disk outside 2.5-cell grazing band', mismatch === 0,
  mismatch + ' mismatches, worst ' + maxDev.toFixed(0) + ' m from horizon');

// Observer at center: whole grid within 4.24 km < horizon => all visible
const visC = computeViewshed(flat, 100, 100, h, 0, 1e9);
let allVis = true;
for (let i = 0; i < N * N; i++) if (visC[i] !== 1) { allVis = false; break; }
check('flat: from center everything visible', allVis);

// ---- Single ridge: clean shadow behind crest at column 130 ----
const ridge = genTerrain('ridge');
const visR = computeViewshed(ridge, 60, 100, h, 0, 1e9);
const at = (x, y) => visR[y * N + x];
check('ridge: open ground west of ridge visible', at(100, 100) === 1, 'vis=' + at(100, 100));
check('ridge: near flank facing observer visible', at(129, 100) === 1, 'vis=' + at(129, 100));
// Rounded (gaussian) crest: from a low observer the sightline grazes tangent
// on the near flank BEFORE the crest, so ground at the crest with 0 m target
// height is correctly occluded — but a 2 m target standing there is seen.
check('ridge: bare ground at crest hidden (tangent grazing)', at(130, 100) === 0, 'vis=' + at(130, 100));
const visR2 = computeViewshed(ridge, 60, 100, h, 2, 1e9);
check('ridge: 2 m target on crest visible', visR2[100 * N + 130] === 1, 'vis=' + visR2[100 * N + 130]);
check('ridge: just behind crest hidden', at(135, 100) === 0, 'vis=' + at(135, 100));
check('ridge: far behind ridge hidden', at(199, 100) === 0, 'vis=' + at(199, 100));
check('ridge: diagonal ray across ridge hidden', at(199, 30) === 0, 'vis=' + at(199, 30));

// Whole east side beyond the ridge should be almost entirely hidden
let hiddenEast = 0, totEast = 0;
for (let y = 0; y < N; y++) for (let x = 145; x < N; x++) { totEast++; if (at(x, y) === 0) hiddenEast++; }
check('ridge: >99% of cells east of ridge hidden', hiddenEast / totEast > 0.99,
  (100 * hiddenEast / totEast).toFixed(2) + '% hidden');

// Refraction sanity: with plain R (no 7/6) the horizon would be ~5048 m,
// so cell 170 (5100 m) distinguishes the two models: must be VISIBLE with R_EFF.
check('flat: refraction extends horizon past geometric (~5048 m)', visF[170] === 1, 'vis=' + visF[170]);

// Max range: cells beyond range flagged 2
const visRange = computeViewshed(flat, 100, 100, h, 0, 1500);
check('range: cell at 3000 m flagged out-of-range', visRange[100 * N + 200 - 1 - 0] === 2 || visRange[100 * N + 199] === 2, 'vis=' + visRange[100 * N + 199]);
check('range: cell at 1200 m in range+visible', visRange[100 * N + 140] === 1, 'vis=' + visRange[100 * N + 140]);

// ---- Procedural presets: determinism + sanity ----
const p1 = genTerrain('hills', 42), p2 = genTerrain('hills', 42), p3 = genTerrain('hills', 43);
let same = true, diff = false;
for (let i = 0; i < N * N; i++) {
  if (p1[i] !== p2[i]) same = false;
  if (p1[i] !== p3[i]) diff = true;
}
check('proc: same seed reproduces identical terrain', same);
check('proc: different seed produces different terrain', diff);
for (const [name, arr] of [['hills', p1], ['ridged', genTerrain('ridged', 42)]]) {
  let mn = Infinity, mx = -Infinity, finite = true;
  for (const v of arr) {
    if (!Number.isFinite(v)) { finite = false; break; }
    if (v < mn) mn = v; if (v > mx) mx = v;
  }
  check(`proc: ${name} all finite`, finite);
  check(`proc: ${name} relief sane (60-500 m)`, mx - mn > 60 && mx - mn < 500,
    (mx - mn).toFixed(0) + ' m relief');
}

// ---- Fractional (drone) observer ----
// Flat plane, fractional observer: horizon disk must match the analytic
// radius around the fractional center, same grazing band as the integer case.
const fx = 50.5, fy = 50.5;
const visFrac = computeViewshed(flat, fx, fy, h, 0, 1e9);
let fMis = 0;
for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
  const d = Math.hypot(x - fx, y - fy) * CELL;
  const want = d <= horizon ? 1 : 0;
  if (Math.abs(d - horizon) < 2.5 * CELL) continue;
  if (visFrac[y * N + x] !== want) fMis++;
}
check('drone: fractional observer disk matches analytic horizon', fMis === 0, fMis + ' mismatches');
check('drone: cell under fractional observer visible', visFrac[50 * N + 50] === 1);

// Ridge + altitude: far cell behind the 160 m ridge is hidden from 2 m AGL
// but visible from 300 m AGL (drone sees over the crest at distance).
const low = computeViewshed(ridge, 100.5, 100, 2, 0, 1e9);
const high = computeViewshed(ridge, 100.5, 100, 300, 0, 1e9);
check('drone: far cell behind ridge hidden at 2 m AGL', low[100 * N + 199] === 0, 'vis=' + low[100 * N + 199]);
check('drone: far cell behind ridge visible at 300 m AGL', high[100 * N + 199] === 1, 'vis=' + high[100 * N + 199]);

// ---- Pathfinding (drone route planning) ----
// Flat plane: straight line, exactly [A, B].
const pFlat = findPath(flat, 10, 10, 190, 190, 5, 100);
check('path: flat plane -> direct [A,B]', pFlat && pFlat.length === 2 &&
  pFlat[0].x === 10 && pFlat[0].y === 10 && pFlat[1].x === 190 && pFlat[1].y === 190,
  pFlat ? pFlat.length + ' waypoints' : 'null');

// Ridge wall spans the whole map: no route under a 150 m ceiling (crest 160+5).
check('path: ridge impassable under 150 m ceiling -> null',
  findPath(ridge, 60, 100, 190, 100, 5, 150) === null);

// Same ridge with a 300 m ceiling: flies straight over.
const pOver = findPath(ridge, 60, 100, 190, 100, 5, 300);
check('path: ridge passable under 300 m ceiling -> direct', pOver && pOver.length === 2,
  pOver ? pOver.length + ' waypoints' : 'null');

// Synthetic peak mid-map: must detour around it and stay under the ceiling.
const peak = new Float32Array(N * N);
for (let y = 0; y < N; y++) for (let x = 0; x < N; x++)
  peak[y * N + x] = 200 * Math.exp(-(((x - 100) ** 2 + (y - 100) ** 2)) / (2 * 15 * 15));
const HP = 5, ALT = 100;
const pPeak = findPath(peak, 40, 100, 160, 100, HP, ALT);
check('path: detours around synthetic peak', pPeak !== null && pPeak.length > 2,
  pPeak ? pPeak.length + ' waypoints' : 'null');
if (pPeak) {
  check('path: endpoints exact',
    pPeak[0].x === 40 && pPeak[0].y === 100 && pPeak.at(-1).x === 160 && pPeak.at(-1).y === 100);
  let clear = true, routeLen = 0;
  for (let i = 1; i < pPeak.length; i++) {
    if (!segClear(peak, pPeak[i-1].x, pPeak[i-1].y, pPeak[i].x, pPeak[i].y, HP, ALT + 1e-9)) clear = false;
    routeLen += Math.hypot(pPeak[i].x - pPeak[i-1].x, pPeak[i].y - pPeak[i-1].y);
  }
  check('path: every segment stays under the ceiling', clear);
  check('path: route longer than blocked straight line', routeLen > 120,
    routeLen.toFixed(1) + ' cells vs 120 straight');
}

// ---- Inverse viewshed: LOS reciprocity ----
// Visibility between P1(h1) and P2(h2) must be symmetric under exchange of
// roles (the chord-sag condition z <= lerp - d(D-d)/2R is endpoint-symmetric).
const zr42 = genTerrain('ridged', 42);
let recipMis = 0, recipChecked = 0;
const rnd = (s => () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x80000000)(7);
for (let k = 0; k < 20; k++) {
  const ax = 5 + Math.floor(rnd() * 190), ay = 5 + Math.floor(rnd() * 190);
  const bx = 5 + Math.floor(rnd() * 190), by = 5 + Math.floor(rnd() * 190);
  for (const [h1, h2] of [[5, 0], [2, 10]]) {
    const vAB = computeViewshed(zr42, ax, ay, h1, h2, 1e9)[by * N + bx];
    const vBA = computeViewshed(zr42, bx, by, h2, h1, 1e9)[ay * N + ax];
    recipChecked++;
    if (vAB !== vBA) recipMis++;
  }
}
check('inverse: LOS reciprocity holds', recipMis === 0, recipMis + '/' + recipChecked + ' asymmetric');

// ---- Stealth routing: penalty field (soft avoidance) ----
// Wide exposure stripe (x 85..115, y 0..170) on flat ground, gap at the top.
// Detour cost < crossing cost (31 cells x8) -> route must go around, fully
// unexposed. A narrow stripe (x 95..105) makes crossing cheaper -> route
// crosses and marks exposed legs.
function stripeField(x0, x1, y1) {
  const p = new Uint8Array(N * N);
  for (let y = 0; y <= y1; y++) for (let x = x0; x <= x1; x++) p[y * N + x] = 1;
  return p;
}
const pWide = findPath(flat, 50, 100, 150, 100, 5, 100, stripeField(85, 115, 170));
check('stealth: wide stripe -> detour exists', pWide !== null && pWide.length > 2,
  pWide ? pWide.length + ' waypoints' : 'null');
if (pWide) {
  let wLen = 0, wExp = false;
  for (let i = 1; i < pWide.length; i++) {
    wLen += Math.hypot(pWide[i].x - pWide[i-1].x, pWide[i].y - pWide[i-1].y);
    if (pWide[i].exp) wExp = true;
  }
  check('stealth: detour route fully unexposed', !wExp);
  check('stealth: detour longer than straight', wLen > 110, wLen.toFixed(1) + ' cells vs 100');
}
const pNarrow = findPath(flat, 50, 100, 150, 100, 5, 100, stripeField(95, 105, 170));
check('stealth: narrow stripe -> crossing chosen', pNarrow !== null &&
  pNarrow.some(pt => pt.exp === 1), pNarrow ? pNarrow.length + ' waypoints' : 'null');
// No penalty: unchanged direct behavior
const pNone = findPath(flat, 50, 100, 150, 100, 5, 100);
check('stealth: no penalty -> direct as before', pNone && pNone.length === 2);

// ---- losVisible: single-ray check must agree with the viewshed field ----
let losMis = 0, losChecked = 0;
const rnd2 = (s => () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x80000000)(99);
for (let k = 0; k < 20; k++) {
  const ax = 5 + Math.floor(rnd2() * 190), ay = 5 + Math.floor(rnd2() * 190);
  const bx = 5 + Math.floor(rnd2() * 190), by = 5 + Math.floor(rnd2() * 190);
  for (const [h1, h2] of [[10, 5], [2, 0]]) {
    const field = computeViewshed(zr42, ax, ay, h1, h2, 1e9)[by * N + bx] === 1;
    const ray = losVisible(zr42, ax, ay, h1, bx, by, h2, 1e9);
    losChecked++;
    if (field !== ray) losMis++;
  }
}
check('los: single-ray agrees with viewshed field', losMis === 0, losMis + '/' + losChecked + ' disagree');
check('los: beyond max range is not visible', losVisible(flat, 0, 0, 5, 100, 0, 0, 1000) === false);

// ---- exposureField: union of per-sensor viewsheds ----
check('exposure: no sensors -> null', exposureField(zr42, [], 10, 5, 1e9) === null);
const snA = { x: 40, y: 60 }, snB = { x: 160, y: 140 };
const vA = computeViewshed(zr42, snA.x, snA.y, 10, 5, 1e9);
const vB = computeViewshed(zr42, snB.x, snB.y, 10, 5, 1e9);
const uOne = exposureField(zr42, [snA], 10, 5, 1e9);
const uTwo = exposureField(zr42, [snA, snB], 10, 5, 1e9);
let oneMis = 0, twoMis = 0;
for (let i = 0; i < N * N; i++) {
  if (uOne[i] !== (vA[i] === 1 ? 1 : 0)) oneMis++;
  if (uTwo[i] !== (vA[i] === 1 || vB[i] === 1 ? 1 : 0)) twoMis++;
}
check('exposure: single sensor equals its viewshed', oneMis === 0, oneMis + ' mismatches');
check('exposure: two sensors equal the union', twoMis === 0, twoMis + ' mismatches');

console.log(fails === 0 ? '\nALL TESTS PASSED' : '\n' + fails + ' TEST(S) FAILED');
process.exit(fails ? 1 : 0);
