// EMBERWATCH world building: one seeded Hollowood clearing per run.
// The campfire sits at CAMP; around it a procedural forest — choppable
// pines, berry thickets, scrap piles from camps that did not make it, and
// four lost campers hidden out in the trees. Everything is placed with the
// run's seeded RNG, kept clear of the campfire's starting light so day one
// always opens in a safe, readable clearing.

import { CAMP, WORLD, NIGHTS, CREATURES } from './config.js';
import { makeRng } from './rng.js';

const CAMPER_NAMES = ['Wren', 'Tomas', 'Pell', 'Sable'];
const CAMPER_COLORS = ['#e8b64c', '#6fc3df', '#df6f9e', '#9edf6f'];

function dist(ax, ay, bx, by) {
  const dx = ax - bx, dy = ay - by;
  return Math.sqrt(dx * dx + dy * dy);
}

function scatter(rng, count, minCamp, minGap, placed) {
  const out = [];
  let guard = 0;
  while (out.length < count && guard++ < 4000) {
    const x = WORLD.x + 30 + rng() * (WORLD.w - 60);
    const y = WORLD.y + 30 + rng() * (WORLD.h - 60);
    if (dist(x, y, CAMP.x, CAMP.y) < minCamp) continue;
    let ok = true;
    for (const p of placed) if (dist(x, y, p.x, p.y) < minGap) { ok = false; break; }
    if (!ok) continue;
    for (const p of out) if (dist(x, y, p.x, p.y) < minGap * 0.8) { ok = false; break; }
    if (!ok) continue;
    out.push({ x, y });
  }
  return out;
}

export function buildWorld(seed) {
  const rng = makeRng(seed * 7919 + 13);
  const placed = [];

  // Choppable pines: three axe hits each, the day's main wood source.
  const trees = scatter(rng, 64, 150, 34, placed).map((p, i) => {
    placed.push(p);
    return {
      id: 'tree' + i, kind: 'tree', x: p.x, y: p.y, hp: 3, maxHp: 3,
      sway: rng() * Math.PI * 2, scale: 0.85 + rng() * 0.5, felled: false,
    };
  });

  // Berry thickets: forage by hand, regrow each dawn.
  const bushes = scatter(rng, 13, 120, 40, placed).map((p, i) => {
    placed.push(p);
    return { id: 'bush' + i, kind: 'bush', x: p.x, y: p.y, berries: 3, sway: rng() * 6 };
  });

  // Scrap piles: the leavings of earlier camps; swing the axe to haul.
  const scraps = scatter(rng, 11, 130, 44, placed).map((p, i) => {
    placed.push(p);
    return { id: 'scrap' + i, kind: 'scrap', x: p.x, y: p.y, left: 3, sway: rng() * 6 };
  });

  // Four lost campers, hidden deep — each one a dawn blessing waiting.
  const campers = [];
  {
    const spots = scatter(rng, 4, 330, 190, placed);
    for (let i = 0; i < 4; i++) {
      const p = spots[i] || { x: CAMP.x + 380, y: CAMP.y - 200 + i * 120 };
      placed.push(p);
      campers.push({
        id: 'camper' + i, kind: 'camper', x: p.x, y: p.y,
        name: CAMPER_NAMES[i], color: CAMPER_COLORS[i],
        rescued: false, home: false, phase: rng() * 6,
      });
    }
  }

  // Ground dressing: grass tufts, stones, mushroom rings, old stumps —
  // the textured forest floor the screenshots are judged on.
  const tufts = [];
  for (let i = 0; i < 340; i++) {
    tufts.push({
      x: WORLD.x + rng() * WORLD.w, y: WORLD.y + rng() * WORLD.h,
      s: 0.6 + rng() * 0.9, lean: rng() * 6.28, tone: rng(),
    });
  }
  const stones = [];
  for (let i = 0; i < 60; i++) {
    stones.push({
      x: WORLD.x + rng() * WORLD.w, y: WORLD.y + rng() * WORLD.h,
      r: 3 + rng() * 8, tone: rng(),
    });
  }
  const rings = [];
  for (let i = 0; i < 7; i++) {
    const cx = WORLD.x + 80 + rng() * (WORLD.w - 160);
    const cy = WORLD.y + 80 + rng() * (WORLD.h - 160);
    if (dist(cx, cy, CAMP.x, CAMP.y) < 190) continue;
    const mush = [];
    const n = 5 + Math.floor(rng() * 4);
    for (let j = 0; j < n; j++) {
      const a = (j / n) * Math.PI * 2;
      mush.push({ x: cx + Math.cos(a) * 22, y: cy + Math.sin(a) * 15, s: 0.7 + rng() * 0.6 });
    }
    rings.push({ x: cx, y: cy, mush });
  }
  // Dark outer treeline: two ragged rows of silhouette pines framing play.
  const treeline = [];
  for (let x = WORLD.x - 16; x < WORLD.x + WORLD.w + 16; x += 30) {
    treeline.push({ x: x + rng() * 14, y: WORLD.y - 12 - rng() * 16, s: 1.1 + rng() * 0.6, top: true });
    treeline.push({ x: x + rng() * 14, y: WORLD.y + WORLD.h + 14 + rng() * 16, s: 1.1 + rng() * 0.6, top: false });
  }
  for (let y = WORLD.y; y < WORLD.y + WORLD.h; y += 34) {
    treeline.push({ x: WORLD.x - 14 - rng() * 12, y: y + rng() * 12, s: 1.1 + rng() * 0.5, top: false });
    treeline.push({ x: WORLD.x + WORLD.w + 14 + rng() * 12, y: y + rng() * 12, s: 1.1 + rng() * 0.5, top: false });
  }

  return { trees, bushes, scraps, campers, tufts, stones, rings, treeline, seed };
}

// Tonight's muster: the full wave list for a night, expanded and shuffled
// into spawn order (the boss, on night 9, always walks last and alone).
export function nightMuster(nightIdx) {
  const def = NIGHTS[nightIdx];
  const list = [];
  for (const [kind, count] of def.wave) {
    for (let i = 0; i < count; i++) list.push(kind);
  }
  return { list, def };
}

// Muster summary for the incoming-wave panel: [[kind, count], ...] in the
// order the kinds first appear, with display names resolved.
export function musterSummary(nightIdx) {
  const def = NIGHTS[nightIdx];
  const out = def.wave.map(([kind, count]) => ({
    kind, count, name: CREATURES[kind].name, color: CREATURES[kind].color,
  }));
  if (def.boss) out.push({ kind: 'boss', count: 1, name: 'The Thicket Warden', color: '#4d7a3a' });
  return out;
}

// A spawn point just outside the treeline on a random side.
export function spawnPoint(rng) {
  const side = Math.floor(rng() * 4);
  const m = 26;
  if (side === 0) return { x: WORLD.x + rng() * WORLD.w, y: WORLD.y - m };
  if (side === 1) return { x: WORLD.x + rng() * WORLD.w, y: WORLD.y + WORLD.h + m };
  if (side === 2) return { x: WORLD.x - m, y: WORLD.y + rng() * WORLD.h };
  return { x: WORLD.x + WORLD.w + m, y: WORLD.y + rng() * WORLD.h };
}
