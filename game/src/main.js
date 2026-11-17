// EMBERWATCH — the game loop and state.
// Day: chop wood, forage berries, haul scrap, craft defences, feed the
// campfire (its light is the safe zone, shrinking as it burns). Night: the
// Hollowood hunts the light in pulses — hold the treeline. Rescue the 4
// lost campers for dawn blessing drafts. Survive to the dawn of night 9;
// The Thicket Warden walks on night 9. Lose if the fire dies or you fall.

import { CAMP, WORLD, CREATURES, BOSS, CRAFTS, BLESSINGS, NIGHTS, DIFFICULTIES, NIGHT_SECONDS, SCORE, FIRE, PLAYER } from './config.js';
import { buildWorld, nightMuster, spawnPoint } from './world.js';
import { makeRng, shuffle } from './rng.js';
import { createInput } from './input.js';
import { updateHud, setMsg } from './hud.js';
import { sfx, toggleMute, ensureAudio } from './audio.js';
import { render, titleHit } from './render.js';
import { setupShotScene } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const input = createInput(canvas);

export const state = {
  mode: 'title',           // title | play | draft | end
  phase: 'day',            // day | night
  phaseT: 0,
  night: 1,
  difficulty: 1,           // index into DIFFICULTIES (Standard)
  world: null,
  player: null,
  fire: { fuel: FIRE.startFuel },
  inv: { wood: 6, scrap: 2, berry: 1 },
  structures: [],          // walls, lanterns, spikes, snares
  creatures: [],
  boss: null,
  clouds: [],              // spore clouds
  roots: [],               // boss root zones
  floaters: [],
  particles: [],
  banner: null,
  score: 0,
  kills: 0, gathered: 0, crafted: 0, rescued: 0, rescuedToday: 0,
  chain: 0, bestChain: 0, tookDamage: false,
  blessings: [],
  draftOptions: [], draftsPending: 0,
  waveQueue: [], spawnT: 0, spawnedAll: false,
  stats: null,
  time: 0, rng: makeRng(7),
  paused: false, victory: false, loseReason: '',
  shotMode: null, shotSteps: 0,
  msg: '',
};

function diff() { return DIFFICULTIES[state.difficulty]; }

export function fireRadius() {
  const base = FIRE.radiusMin + (Math.max(0, state.fire.fuel) / 100) * (FIRE.radiusMax - FIRE.radiusMin);
  return base * (state.blessings.includes('ward') ? 1.18 : 1);
}

export function lightAt(x, y) {
  const dx = x - CAMP.x, dy = y - CAMP.y;
  if (dx * dx + dy * dy <= fireRadius() * fireRadius()) return true;
  for (const s of state.structures) {
    if (s.kind !== 'lantern' || s.hp <= 0) continue;
    const ddx = x - s.x, ddy = y - s.y;
    if (ddx * ddx + ddy * ddy <= s.light * s.light) return true;
  }
  return false;
}

function newStats() {
  return {
    nights: 0, kills: 0, gathered: 0, crafted: 0, rescues: 0,
    bestChain: 0, damageTaken: 0, treesFelled: 0, timeSurvived: 0, bossDown: false,
  };
}

export function startRun(seed) {
  const s = state;
  s.world = buildWorld(seed);
  s.rng = makeRng(seed * 31 + 7);
  s.player = {
    x: CAMP.x + 46, y: CAMP.y + 30, hp: PLAYER.hp, maxHp: PLAYER.hp,
    hunger: PLAYER.hunger, face: -Math.PI / 2, swingT: 0, swingCd: 0, hurtT: 0, atkT: 0,
  };
  s.fire.fuel = FIRE.startFuel;
  s.inv = { wood: 6, scrap: 2, berry: 1 };
  s.structures = []; s.creatures = []; s.boss = null;
  s.clouds = []; s.roots = []; s.floaters = []; s.particles = [];
  s.night = 1; s.phase = 'day'; s.phaseT = diff().day;
  s.score = 0; s.kills = 0; s.gathered = 0; s.crafted = 0;
  s.rescued = 0; s.rescuedToday = 0;
  s.chain = 0; s.bestChain = 0; s.tookDamage = false;
  s.blessings = []; s.draftOptions = []; s.draftsPending = 0;
  s.waveQueue = []; s.spawnedAll = false;
  s.stats = newStats();
  s.victory = false; s.loseReason = ''; s.paused = false;
  s.mode = 'play';
  showBanner(`DAY 1 — BUILD BEFORE DARK`, 2.6);
  setMsg('Chop trees, forage berries, haul scrap. Craft with 1–6. Feed the fire with F. Night is coming.');
}

function showBanner(text, life = 3) {
  state.banner = { text, t: 0, life };
}

export function addFloater(x, y, text, color = '#ffe9b8', size = 15) {
  state.floaters.push({ x, y, text, color, size, t: 0, life: 1.15 });
  if (state.floaters.length > 42) state.floaters.shift();
}

export function burst(x, y, color, n = 10, speed = 90) {
  for (let i = 0; i < n; i++) {
    const a = state.rng() * Math.PI * 2;
    const v = speed * (0.3 + state.rng() * 0.9);
    state.particles.push({
      x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 26,
      t: 0, life: 0.5 + state.rng() * 0.6, color, size: 2 + state.rng() * 3,
    });
  }
}

function gainScore(n, x, y, label) {
  state.score += n;
  if (x !== undefined) addFloater(x, y, `+${Math.round(n).toLocaleString('en-US')}${label ? ' ' + label : ''}`, '#ffd76a', 16);
}

// ------------------------------------------------------------ creatures
function spawnCreature(kind, x, y) {
  const base = kind === 'boss' ? BOSS : CREATURES[kind];
  const d = diff();
  const c = {
    kind, x, y, r: base.r,
    hp: base.hp * (kind === 'boss' ? 1 : d.hp), maxHp: base.hp * (kind === 'boss' ? 1 : d.hp),
    dmg: base.dmg * d.dmg, speed: base.speed * d.speed,
    phase: state.rng() * 6.28, t: 0, atkCd: 0, stunT: 0, slowT: 0,
    mode: 'hunt', modeT: 0, lungeX: 0, lungeY: 0, puffT: 2 + state.rng() * 2,
    stealT: 0, fleeing: false, chargeT: 0, rootT: 5, summonT: 9, hitT: 0,
    score: base.score,
  };
  if (kind === 'boss') state.boss = c; else state.creatures.push(c);
  return c;
}

function startNight() {
  const s = state;
  s.phase = 'night';
  s.phaseT = NIGHT_SECONDS;
  s.tookDamage = false;
  const { list, def } = nightMuster(s.night - 1);
  s.waveQueue = shuffle(s.rng, list);
  s.spawnT = 0; s.spawnedAll = false;
  showBanner(def.banner || `NIGHT ${s.night} — HOLD THE TREELINE`, 3.4);
  sfx.dusk();
  if (def.boss) {
    const p = { x: CAMP.x, y: WORLD.y - 60 };
    spawnCreature('boss', p.x, p.y);
    sfx.boss();
  }
  setMsg('The Hollowood hunts the light. Stay near the fire — its glow burns them.');
}

function dawn() {
  const s = state;
  // Night survived: chain bookkeeping and the dawn payout.
  if (!s.tookDamage) { s.chain += 1; s.bestChain = Math.max(s.bestChain, s.chain); }
  else s.chain = 0;
  const clearPts = SCORE.nightClear * s.night + SCORE.dawnChain * s.chain;
  s.score += clearPts;
  s.stats.nights = s.night;
  s.stats.bestChain = s.bestChain;
  if (s.blessings.includes('second')) s.player.hp = Math.min(s.player.maxHp, s.player.hp + 30);
  if (s.blessings.includes('bond')) {
    const wood = s.rescued;
    if (wood > 0) { s.inv.wood += wood; }
  }
  for (const b of s.world.bushes) b.berries = 3;   // thickets regrow at dawn
  sfx.dawn();

  if (s.night >= 9) { endRun(true); return; }

  s.draftsPending = Math.max(1, s.rescuedToday);
  s.draftsTotal = s.draftsPending;
  s.rescuedToday = 0;
  rollDraft();
  s.mode = 'draft';
  showBanner(`DAWN OF DAY ${s.night + 1} — +${clearPts.toLocaleString('en-US')} · CHOOSE A BLESSING`, 3);
  sfx.draft();
}

function rollDraft() {
  const owned = new Set(state.blessings);
  const pool = BLESSINGS.filter((b) => !owned.has(b.id));
  const opts = shuffle(state.rng, pool).slice(0, 3);
  while (opts.length < 3) opts.push({ id: 'cache' + opts.length, name: 'Ember Cache', line: '+600 score, banked from the ashes', cache: true });
  state.draftOptions = opts;
}

export function applyBlessing(b) {
  const s = state;
  if (b.cache) { s.score += 600; }
  else {
    s.blessings.push(b.id);
    if (b.id === 'ironbark') { s.player.maxHp += 40; s.player.hp += 40; }
  }
  addFloater(s.player.x, s.player.y - 30, b.name.toUpperCase(), '#a5e86b', 17);
  sfx.draft();
  s.draftsPending -= 1;
  if (s.draftsPending > 0) { rollDraft(); return; }
  // Drafts done: the next day begins.
  s.mode = 'play';
  s.night += 1;
  s.phase = 'day';
  s.phaseT = diff().day;
  showBanner(`DAY ${s.night} — BUILD BEFORE DARK`, 2.6);
  setMsg('The forest regrows its berries at dawn. Tonight will be worse — check the muster panel.');
}

function endRun(victory) {
  const s = state;
  s.victory = victory;
  s.stats.kills = s.kills; s.stats.gathered = s.gathered;
  s.stats.crafted = s.crafted; s.stats.rescues = s.rescued;
  if (!victory) s.stats.nights = Math.max(s.stats.nights, s.night - 1);
  s.stats.bossDown = victory;
  s.endRank = rankFor(s);
  s.mode = 'end';
  if (victory) { sfx.win(); showBanner('DAWN OF NIGHT 9 — THE HOLLOWOOD RETREATS', 4); }
  else { sfx.lose(); }
  setMsg('Press Enter to return to the title.');
}

export function rankFor(s) {
  if (!s.victory) {
    if (s.stats.nights >= 8) return 'B';
    if (s.stats.nights >= 6) return 'C';
    if (s.stats.nights >= 3) return 'D';
    return 'F';
  }
  if (s.score >= 52000 && s.rescued >= 4) return 'S';
  if (s.score >= 42000) return 'A';
  if (s.score >= 30000) return 'B';
  if (s.score >= 18000) return 'C';
  return 'D';
}

// ------------------------------------------------------------- crafting
function canAfford(c) {
  return Object.entries(c.cost).every(([k, v]) => state.inv[k] >= v);
}
function costText(c) {
  return Object.entries(c.cost).map(([k, v]) => `${v} ${k}`).join(' + ');
}

function tryCraft(i) {
  const s = state;
  const c = CRAFTS[i];
  if (!c) return;
  if (!canAfford(c)) {
    addFloater(s.player.x, s.player.y - 26, `NEED ${costText(c).toUpperCase()}`, '#e05a5a', 13);
    setMsg(`${c.name} needs ${costText(c)}. Gather more first.`);
    return;
  }
  for (const [k, v] of Object.entries(c.cost)) s.inv[k] -= v;
  s.crafted += 1; s.score += SCORE.craft;
  const fx = s.player.x + Math.cos(s.player.face) * 46;
  const fy = s.player.y + Math.sin(s.player.face) * 46;
  if (c.kind === 'place') {
    s.structures.push({
      kind: c.id, x: fx, y: fy, hp: c.hp, maxHp: c.hp,
      dps: c.dps || 0, light: c.light || 0, stun: c.stun || 0, dmg: c.dmg || 0,
      armed: true, t: 0,
    });
    addFloater(fx, fy - 18, c.name.toUpperCase(), '#ffd76a', 14);
    setMsg(`${c.name} placed — ${c.line}.`);
  } else if (c.kind === 'eat') {
    s.player.hunger = Math.min(100, s.player.hunger + c.hunger);
    s.player.hp = Math.min(s.player.maxHp, s.player.hp + c.heal);
    addFloater(s.player.x, s.player.y - 26, `+${c.hunger} FOOD · +${c.heal} HP`, '#a5e86b', 15);
    setMsg(`You eat the ${c.name.toLowerCase()}. Warmth spreads.`);
  } else if (c.kind === 'heal') {
    s.player.hp = Math.min(s.player.maxHp, s.player.hp + c.heal);
    addFloater(s.player.x, s.player.y - 26, `+${c.heal} HP`, '#a5e86b', 15);
    setMsg(`Ember Bandage on. +${c.heal} health.`);
  }
  burst(fx, fy, '#ffd76a', 8, 60);
  sfx.craft();
}

// -------------------------------------------------------------- actions
function feedFire() {
  const s = state;
  const d = Math.hypot(s.player.x - CAMP.x, s.player.y - CAMP.y);
  if (d > 110) { setMsg('Get closer to the campfire to feed it.'); return; }
  if (s.inv.wood <= 0) { setMsg('No wood — chop a pine first.'); return; }
  if (s.fire.fuel >= 99) { setMsg('The fire is roaring already. Save the log.'); return; }
  s.inv.wood -= 1;
  s.fire.fuel = Math.min(100, s.fire.fuel + FIRE.woodFuel);
  addFloater(CAMP.x, CAMP.y - 44, `+${FIRE.woodFuel} FIRE`, '#ffb347', 15);
  burst(CAMP.x, CAMP.y, '#ff9a3c', 12, 80);
  sfx.feed();
}

function gatherYield(base) {
  return Math.max(1, Math.round(base * (state.blessings.includes('forager') ? 1.5 : 1)));
}

function swing() {
  const s = state;
  const p = s.player;
  if (p.swingCd > 0) return;
  p.swingCd = PLAYER.axeCooldown;
  p.swingT = 0.22;
  sfx.swing();
  const dmg = PLAYER.axeDamage * (s.blessings.includes('keen') ? 1.3 : 1);
  let hitSomething = false;

  const inArc = (x, y, range) => {
    const dx = x - p.x, dy = y - p.y;
    const d = Math.hypot(dx, dy);
    if (d > range + 10) return false;
    let da = Math.atan2(dy, dx) - p.face;
    while (da > Math.PI) da -= Math.PI * 2;
    while (da < -Math.PI) da += Math.PI * 2;
    return Math.abs(da) <= PLAYER.axeArc / 2 || d < 26;
  };

  // Creatures (and the boss) in the arc.
  const targets = s.boss ? [...s.creatures, s.boss] : s.creatures;
  for (const c of targets) {
    if (c.hp <= 0) continue;
    if (inArc(c.x, c.y, PLAYER.axeRange + c.r)) {
      hurtCreature(c, dmg, Math.atan2(c.y - p.y, c.x - p.x));
      hitSomething = true;
    }
  }
  // Trees, scrap piles, berry thickets in the arc.
  for (const t of s.world.trees) {
    if (t.felled || !inArc(t.x, t.y, PLAYER.axeRange + 14)) continue;
    t.hp -= 1; hitSomething = true;
    burst(t.x, t.y - 20, '#9db36a', 6, 70);
    if (t.hp <= 0) {
      t.felled = true;
      const y = gatherYield(3);
      s.inv.wood += y; s.gathered += y; s.stats.treesFelled += 1;
      gainScore(SCORE.gather * y, t.x, t.y - 34, 'WOOD');
      addFloater(t.x, t.y - 52, `+${y} WOOD`, '#ffd76a', 15);
      sfx.fell();
    } else sfx.chop();
  }
  for (const sc of s.world.scraps) {
    if (sc.left <= 0 || !inArc(sc.x, sc.y, PLAYER.axeRange + 12)) continue;
    sc.left -= 1; hitSomething = true;
    const y = gatherYield(2);
    s.inv.scrap += y; s.gathered += y;
    gainScore(SCORE.gather * y, sc.x, sc.y - 26, 'SCRAP');
    addFloater(sc.x, sc.y - 40, `+${y} SCRAP`, '#c9d4e8', 14);
    sfx.chop();
  }
  for (const b of s.world.bushes) {
    if (b.berries <= 0 || !inArc(b.x, b.y, PLAYER.axeRange + 12)) continue;
    const y = gatherYield(b.berries);
    b.berries = 0;
    s.inv.berry += y; s.gathered += y;
    gainScore(SCORE.gather * y, b.x, b.y - 26, 'BERRIES');
    addFloater(b.x, b.y - 40, `+${y} BERRIES`, '#df6f9e', 14);
    sfx.gather();
  }
  if (hitSomething) s.score += SCORE.hit;
}

function hurtCreature(c, dmg, angle) {
  c.hp -= dmg;
  c.hitT = 0.12;
  c.x += Math.cos(angle) * 7;
  c.y += Math.sin(angle) * 7;
  addFloater(c.x, c.y - c.r - 8, `−${Math.round(dmg)}`, '#fff2cf', 14);
  burst(c.x, c.y, c.kind === 'boss' ? '#7fae56' : (CREATURES[c.kind]?.color || '#ccc'), 5, 70);
  sfx.hit();
  if (c.hp <= 0) killCreature(c);
}

function killCreature(c) {
  const s = state;
  const chainMult = 1 + 0.25 * s.chain;
  const nightMult = 1 + 0.1 * (s.night - 1);
  const bounty = s.blessings.includes('bounty') ? 1.5 : 1;
  const pts = Math.round(c.score * chainMult * nightMult * bounty);
  s.kills += 1;
  gainScore(pts, c.x, c.y - 10, c.kind === 'boss' ? 'WARDEN DOWN' : '');
  burst(c.x, c.y, '#ffb347', c.kind === 'boss' ? 46 : 14, 130);
  sfx.kill();
  if (c.kind === 'splinter') {
    for (let i = 0; i < 2; i++) {
      const sh = spawnCreature('shade', c.x + (i ? 16 : -16), c.y + (i ? 10 : -10));
      sh.hp = CREATURES.shade.hp * diff().hp; sh.maxHp = sh.hp;
    }
    addFloater(c.x, c.y - 30, 'IT SPLITS!', '#c4dcf2', 14);
  }
  if (c.kind === 'emberthief' && c.fleeing) {
    s.fire.fuel = Math.min(100, s.fire.fuel + 4);
    addFloater(c.x, c.y - 30, 'LOG RECOVERED +4 FIRE', '#ffb347', 13);
  }
  if (c.kind === 'boss') {
    state.boss = null;
    showBanner('THE THICKET WARDEN FALLS — HOLD UNTIL DAWN', 3.4);
  }
  c.hp = 0; c.dead = true;
}

function hurtPlayer(dmg, fromX, fromY) {
  const s = state;
  const p = s.player;
  if (p.hurtT > 0) return;
  p.hurtT = 0.45;
  p.hp -= dmg;
  s.tookDamage = true;
  s.stats.damageTaken += dmg;
  addFloater(p.x, p.y - 26, `−${Math.round(dmg)}`, '#e05a5a', 16);
  burst(p.x, p.y, '#e05a5a', 8, 80);
  sfx.hurt();
  if (p.hp <= 0) { p.hp = 0; endRun(false); s.loseReason = 'You fell in the Hollowood. The fire guttered out alone.'; }
}

// --------------------------------------------------------- creature AI
function creatureStep(c, dt) {
  const s = state;
  const p = s.player;
  c.t += dt;
  if (c.hitT > 0) c.hitT -= dt;
  if (c.atkCd > 0) c.atkCd -= dt;
  if (c.stunT > 0) { c.stunT -= dt; return; }

  const dFire = Math.hypot(c.x - CAMP.x, c.y - CAMP.y);
  const dPlayer = Math.hypot(c.x - p.x, c.y - p.y);
  const lit = lightAt(c.x, c.y);
  if (lit && c.kind !== 'boss') {
    c.hp -= FIRE.burnDps * dt;
    if (c.hp <= 0) { killCreature(c); return; }
  }
  const slow = (lit && c.kind !== 'stag' && c.kind !== 'boss') ? 0.55 : 1;

  let tx = CAMP.x, ty = CAMP.y;   // default: hunt the fire
  if (c.kind === 'nightjar' || c.kind === 'shade' || c.kind === 'barkhound') { tx = p.x; ty = p.y; }
  else if (dPlayer < 210) { tx = p.x; ty = p.y; }

  let vx = 0, vy = 0;
  const dx = tx - c.x, dy = ty - c.y;
  const dl = Math.hypot(dx, dy) || 1;

  if (c.kind === 'barkhound') {
    c.modeT -= dt;
    if (c.mode === 'hunt' && dPlayer < 130) { c.mode = 'circle'; c.modeT = 1.5; }
    if (c.mode === 'circle') {
      const a = Math.atan2(c.y - p.y, c.x - p.x) + dt * 2.4;
      vx = (p.x + Math.cos(a) * 92 - c.x) * 3; vy = (p.y + Math.sin(a) * 92 - c.y) * 3;
      if (c.modeT <= 0) { c.mode = 'lunge'; c.modeT = 0.42; c.lungeX = (p.x - c.x) / (dPlayer || 1); c.lungeY = (p.y - c.y) / (dPlayer || 1); }
    } else if (c.mode === 'lunge') {
      vx = c.lungeX * 300; vy = c.lungeY * 300;
      if (c.modeT <= 0) { c.mode = 'hunt'; c.modeT = 0.8; }
    } else { vx = (dx / dl) * c.speed * slow; vy = (dy / dl) * c.speed * slow; }
  } else if (c.kind === 'sporecap') {
    const want = 195;
    const anchor = dPlayer < dFire ? p : CAMP;
    const ad = Math.hypot(c.x - anchor.x, c.y - anchor.y) || 1;
    const dir = ad > want + 26 ? 1 : ad < want - 26 ? -1 : 0;
    vx = ((anchor.x - c.x) / ad) * c.speed * dir * slow + Math.cos(c.t * 0.9 + c.phase) * 12;
    vy = ((anchor.y - c.y) / ad) * c.speed * dir * slow + Math.sin(c.t * 0.7 + c.phase) * 12;
    c.puffT -= dt;
    if (c.puffT <= 0 && ad < 300) {
      c.puffT = 3.4;
      s.clouds.push({ x: anchor.x + (s.rng() - 0.5) * 60, y: anchor.y + (s.rng() - 0.5) * 60, r: 36, t: 0, life: 4.2 });
    }
  } else if (c.kind === 'emberthief') {
    if (!c.fleeing) {
      vx = (dx / dl) * c.speed; vy = (dy / dl) * c.speed;
      if (dFire < 44) {
        c.stealT += dt;
        if (c.stealT > 0.9) {
          c.stealT = 0; c.fleeing = true;
          s.fire.fuel = Math.max(0, s.fire.fuel - 5);
          addFloater(CAMP.x, CAMP.y - 52, 'LOG STOLEN! −5 FIRE', '#e08a3c', 14);
        }
      }
    } else {
      const ex = c.x < CAMP.x ? WORLD.x - 30 : WORLD.x + WORLD.w + 30;
      const ey = c.y;
      const el = Math.hypot(ex - c.x, ey - c.y) || 1;
      vx = ((ex - c.x) / el) * c.speed * 1.25; vy = ((ey - c.y) / el) * c.speed * 1.25;
      if (c.x < WORLD.x - 40 || c.x > WORLD.x + WORLD.w + 40) { c.dead = true; c.hp = 0; s.creatures = s.creatures.filter((o) => o !== c); return; }
    }
  } else if (c.kind === 'stag' || (c.kind === 'boss' && c.hp < c.maxHp * 0.5)) {
    c.chargeT -= dt;
    if (c.mode === 'telegraph') {
      c.modeT -= dt;
      if (c.modeT <= 0) { c.mode = 'charge'; c.modeT = 0.75; c.lungeX = Math.cos(c.chargeA); c.lungeY = Math.sin(c.chargeA); }
    } else if (c.mode === 'charge') {
      vx = c.lungeX * 330; vy = c.lungeY * 330;
      c.modeT -= dt;
      if (c.modeT <= 0) { c.mode = 'hunt'; c.chargeT = 3.6; }
    } else {
      vx = (dx / dl) * c.speed * slow; vy = (dy / dl) * c.speed * slow;
      if (c.chargeT <= 0 && dPlayer < 300) { c.mode = 'telegraph'; c.modeT = 0.7; c.chargeA = Math.atan2(p.y - c.y, p.x - c.x); }
    }
  } else if (c.kind === 'boss') {
    vx = (dx / dl) * c.speed; vy = (dy / dl) * c.speed;
    c.rootT -= dt; c.summonT -= dt;
    if (c.rootT <= 0) {
      c.rootT = 6.5;
      for (let i = 0; i < 3; i++) {
        const a = s.rng() * Math.PI * 2, rr = 40 + s.rng() * 90;
        s.roots.push({ x: p.x + Math.cos(a) * rr, y: p.y + Math.sin(a) * rr, r: 30, t: 0, life: 5 });
      }
      addFloater(c.x, c.y - 60, 'THE GROUND ROOTS!', '#7fae56', 15);
    }
    if (c.summonT <= 0 && s.creatures.length < 8) {
      c.summonT = 11;
      spawnCreature('twigling', c.x - 50, c.y + 30);
      spawnCreature('twigling', c.x + 50, c.y + 30);
      addFloater(c.x, c.y - 60, 'IT CALLS THE WOOD', '#7fae56', 15);
    }
    if (dFire < c.r + 26) { s.fire.fuel = Math.max(0, s.fire.fuel - 3.2 * dt); }
  } else {
    // twigling, shade, nightjar: straight at the target.
    vx = (dx / dl) * c.speed * slow + Math.cos(c.t * 2 + c.phase) * 9;
    vy = (dy / dl) * c.speed * slow + Math.sin(c.t * 1.7 + c.phase) * 9;
  }

  // Structure blocking: chew through walls and lanterns in the way.
  const flying = c.kind === 'nightjar';
  if (!flying) {
    for (const st of s.structures) {
      if (st.kind !== 'wall' && st.kind !== 'lantern') continue;
      if (st.hp <= 0) continue;
      const sd = Math.hypot(c.x - st.x, c.y - st.y);
      const rr = c.r + (st.kind === 'wall' ? 22 : 13);
      if (sd < rr) {
        const push = (rr - sd) || 1;
        c.x += ((c.x - st.x) / (sd || 1)) * push;
        c.y += ((c.y - st.y) / (sd || 1)) * push;
        if (c.atkCd <= 0) {
          c.atkCd = 0.8;
          st.hp -= c.dmg * (c.mode === 'charge' ? 3 : 1);
          burst(st.x, st.y, '#b07a45', 4, 60);
          if (st.hp <= 0) addFloater(st.x, st.y - 20, 'DESTROYED!', '#e05a5a', 13);
        }
        vx = 0; vy = 0;
      }
    }
  }

  c.x += vx * dt; c.y += vy * dt;

  // Spikes and snares underfoot.
  if (!flying) {
    for (const st of s.structures) {
      const sd = Math.hypot(c.x - st.x, c.y - st.y);
      if (st.kind === 'spikes' && sd < 26) {
        c.hp -= st.dps * (s.blessings.includes('trap') ? 1.6 : 1) * dt;
        if (c.hp <= 0 && !c.dead) { killCreature(c); return; }
      }
      if (st.kind === 'snare' && st.armed && sd < 24) {
        st.armed = false; st.hp = 0;
        c.stunT = st.stun;
        hurtCreature(c, st.dmg * (s.blessings.includes('trap') ? 1.6 : 1), Math.atan2(c.y - st.y, c.x - st.x));
        addFloater(c.x, c.y - 30, 'SNARED!', '#ffd76a', 14);
        if (c.dead) return;
      }
    }
  }

  // Contact with the player.
  if (dPlayer < c.r + p.r + 2 && c.atkCd <= 0 && c.stunT <= 0) {
    c.atkCd = 0.85;
    hurtPlayer(c.dmg * (c.mode === 'charge' ? 1.6 : 1), c.x, c.y);
  }
  // Contact with the fire itself: they claw at the flame's heart.
  if (c.kind !== 'emberthief' && c.kind !== 'boss' && dFire < c.r + 20 && c.atkCd <= 0) {
    c.atkCd = 1.1;
    s.fire.fuel = Math.max(0, s.fire.fuel - 1.6);
  }
}

// --------------------------------------------------------------- update
function update(dt) {
  const s = state;
  s.time += dt;
  if (s.banner) { s.banner.t += dt; if (s.banner.t > s.banner.life) s.banner = null; }
  for (const f of s.floaters) { f.t += dt; f.y -= 26 * dt; }
  s.floaters = s.floaters.filter((f) => f.t < f.life);
  for (const pt of s.particles) {
    pt.t += dt; pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.vy += 130 * dt;
  }
  s.particles = s.particles.filter((pt) => pt.t < pt.life);
  // Campfire embers rise whenever the fire lives.
  if (s.fire.fuel > 0 && s.rng() < 0.5) {
    s.particles.push({
      x: CAMP.x + (s.rng() - 0.5) * 30, y: CAMP.y - 6,
      vx: (s.rng() - 0.5) * 22, vy: -44 - s.rng() * 52,
      t: 0, life: 0.9 + s.rng() * 0.9, color: s.rng() < 0.3 ? '#ffd76a' : '#ff9a3c', size: 2 + s.rng() * 2.4,
    });
  }
  for (const cl of s.clouds) cl.t += dt;
  s.clouds = s.clouds.filter((cl) => cl.t < cl.life);
  for (const r of s.roots) r.t += dt;
  s.roots = s.roots.filter((r) => r.t < r.life);

  if (s.mode === 'title') {
    if (input.difficultyPressed !== null) { s.difficulty = input.difficultyPressed; sfx.craft(); }
    if (input.mouse.clicked) {
      const hit = titleHit(input.mouse.x, input.mouse.y);
      if (hit.type === 'difficulty') { s.difficulty = hit.index; sfx.craft(); }
      else ensureStart();
    } else if (input.confirmPressed) { ensureStart(); }
    return;
  }
  if (s.mode === 'end') {
    if (input.confirmPressed) { s.mode = 'title'; setMsg(''); }
    return;
  }
  if (s.mode === 'draft') {
    let pick = -1;
    if (input.craftPressed !== null) pick = input.craftPressed;
    if (input.mouse.clicked) {
      const idx = draftCardAt(input.mouse.x, input.mouse.y);
      if (idx >= 0) pick = idx;
    }
    if (pick >= 0 && s.draftOptions[pick]) applyBlessing(s.draftOptions[pick]);
    return;
  }
  if (s.mode !== 'play' || s.paused) return;

  const p = s.player;
  s.stats.timeSurvived += dt;
  if (p.swingCd > 0) p.swingCd -= dt;
  if (p.swingT > 0) p.swingT -= dt;
  if (p.hurtT > 0) p.hurtT -= dt;

  // Movement + aim.
  const mv = input.moveVec();
  const spd = PLAYER.speed * (s.blessings.includes('swift') ? 1.15 : 1);
  p.x += mv.x * spd * dt;
  p.y += mv.y * spd * dt;
  p.x = Math.max(WORLD.x + 14, Math.min(WORLD.x + WORLD.w - 14, p.x));
  p.y = Math.max(WORLD.y + 14, Math.min(WORLD.y + WORLD.h - 14, p.y));
  for (const t of s.world.trees) {
    if (t.felled) continue;
    const d = Math.hypot(p.x - t.x, p.y - t.y);
    if (d < 24 && d > 0) { p.x += ((p.x - t.x) / d) * (24 - d); p.y += ((p.y - t.y) / d) * (24 - d); }
  }
  p.face = Math.atan2(input.mouse.y - p.y, input.mouse.x - p.x);

  // Actions.
  if (input.swingPressed) swing();
  if (input.feedPressed) feedFire();
  if (input.craftPressed !== null) tryCraft(input.craftPressed);
  if (input.interactPressed) interact();

  // Hunger and the fire burn on, day and night.
  p.hunger = Math.max(0, p.hunger - PLAYER.hungerDrain * dt);
  if (p.hunger <= 0) { p.hp -= PLAYER.starveDps * dt; if (p.hp <= 0) { p.hp = 0; endRun(false); s.loseReason = 'Hunger took you within sight of the fire.'; return; } }
  const drain = (s.phase === 'day' ? FIRE.dayDrain : FIRE.nightDrain) * diff().fireDrain;
  s.fire.fuel -= drain * dt;
  if (s.fire.fuel <= 0) {
    s.fire.fuel = 0;
    endRun(false);
    s.loseReason = 'The campfire died — and the Hollowood does not forgive a dark camp.';
    return;
  }

  // Campers: rescued ones hurry home, then idle by the fire.
  for (const cm of s.world.campers) {
    if (!cm.rescued || cm.home) continue;
    const d = Math.hypot(cm.x - CAMP.x, cm.y - CAMP.y);
    if (d < 120) { cm.home = true; continue; }
    cm.x += ((CAMP.x - cm.x) / d) * 128 * dt;
    cm.y += ((CAMP.y - cm.y) / d) * 128 * dt;
  }

  // Spore clouds and boss roots hurt the keeper.
  for (const cl of s.clouds) {
    if (Math.hypot(p.x - cl.x, p.y - cl.y) < cl.r + p.r) { p.hp -= 7 * dt; s.tookDamage = true; if (p.hp <= 0) { p.hp = 0; endRun(false); s.loseReason = 'Sporecap spores filled your lungs in the dark.'; return; } }
  }
  for (const r of s.roots) {
    if (r.t > 0.4 && Math.hypot(p.x - r.x, p.y - r.y) < r.r) { p.hp -= 10 * dt; s.tookDamage = true; if (p.hp <= 0) { p.hp = 0; endRun(false); s.loseReason = 'The Warden\'s roots held you for the wood.'; return; } }
  }

  // Phase clock.
  s.phaseT -= dt;
  if (s.phase === 'day' && s.phaseT <= 0) startNight();
  else if (s.phase === 'night') {
    // Spawn pulses from the muster queue.
    if (s.waveQueue.length > 0) {
      s.spawnT -= dt;
      if (s.spawnT <= 0) {
        s.spawnT = 2.1;
        const n = Math.min(3, s.waveQueue.length);
        for (let i = 0; i < n; i++) {
          const kind = s.waveQueue.shift();
          const pt = spawnPoint(s.rng);
          spawnCreature(kind, pt.x, pt.y);
        }
      }
    }
    const bossAlive = !!s.boss;
    if (s.waveQueue.length === 0 && s.creatures.length === 0 && !bossAlive) { dawn(); return; }
    if (s.phaseT <= 0) {
      if (s.night >= 9 && s.boss) {
        // Night 9 has no scheduled dawn while the Warden stands: the run
        // ends when it falls, the fire dies, or the keeper does.
        s.phaseT = 0;
      } else {
        // Dawn breaks on schedule even mid-fight on the last pulses: the
        // surviving Hollowood burns away in the light (no score for them).
        for (const c of s.creatures) burst(c.x, c.y, '#ffd76a', 8, 80);
        s.creatures = [];
        if (s.boss) { s.boss = null; }
        dawn(); return;
      }
    }
  }

  // Creatures act.
  const all = s.boss ? [...s.creatures, s.boss] : s.creatures.slice();
  for (const c of all) { if (!c.dead) creatureStep(c, dt); }
  s.creatures = s.creatures.filter((c) => !c.dead && c.hp > 0);
  if (s.boss && s.boss.dead) s.boss = null;

  // Structures decay check (destroyed ones fall).
  s.structures = s.structures.filter((st) => st.hp > 0 || st.kind === 'spikes');

  // Hint line.
  if (s.phase === 'day') {
    setMsg(`Day ${s.night}: WASD move · mouse aim · click/Space swing · E gather/rescue · F feed fire · craft 1–6 · tonight's muster is on the right.`);
  } else {
    setMsg(`Night ${s.night}: hold the treeline. ${s.waveQueue.length + s.creatures.length + (s.boss ? 1 : 0)} still out there.`);
  }
}

function interact() {
  const s = state;
  const p = s.player;
  // Rescue first — it is the point of the whole watch.
  for (const cm of s.world.campers) {
    if (cm.rescued) continue;
    if (Math.hypot(p.x - cm.x, p.y - cm.y) < 52) {
      cm.rescued = true;
      s.rescued += 1; s.rescuedToday += 1;
      gainScore(SCORE.rescue, cm.x, cm.y - 30, 'RESCUED');
      showBanner(`${cm.name.toUpperCase()} FOUND — ${s.rescued}/4 CAMPERS · A BLESSING AT DAWN`, 2.8);
      burst(cm.x, cm.y, cm.color, 16, 100);
      sfx.rescue();
      return;
    }
  }
  // Then the fire, then forage by hand.
  if (Math.hypot(p.x - CAMP.x, p.y - CAMP.y) < 110) { feedFire(); return; }
  for (const b of s.world.bushes) {
    if (b.berries > 0 && Math.hypot(p.x - b.x, p.y - b.y) < 46) {
      const y = gatherYield(b.berries);
      b.berries = 0; s.inv.berry += y; s.gathered += y;
      gainScore(SCORE.gather * y, b.x, b.y - 26, 'BERRIES');
      addFloater(b.x, b.y - 42, `+${y} BERRIES`, '#df6f9e', 14);
      sfx.gather();
      return;
    }
  }
  setMsg('Nothing to do here — swing the axe at trees and scrap, E near campers, bushes and the fire.');
}

function ensureStart() {
  ensureAudio();
  startRun(1000 + Math.floor(Math.random() * 9000));
}

// Draft card hit-testing lives with the layout numbers render.js uses.
export function draftCardAt(x, y) {
  const w = 300, h = 210, gap = 26, total = w * 3 + gap * 2;
  const x0 = (1280 - total) / 2, y0 = 268;
  for (let i = 0; i < 3; i++) {
    const cx = x0 + i * (w + gap);
    if (x >= cx && x <= cx + w && y >= y0 && y <= y0 + h) return i;
  }
  return -1;
}

// ----------------------------------------------------------------- loop
let last = performance.now();
function frame(now) {
  // Staged screenshot scenes step at a fixed dt so renders are identical.
  const dt = state.shotMode ? 1 / 30 : Math.min(0.05, (now - last) / 1000);
  last = now;
  if (input.pausePressed && state.mode === 'play') {
    state.paused = !state.paused;
    setMsg(state.paused ? 'Paused — P to resume.' : '');
  }
  if (input.mutePressed) toggleMute();
  if (input.restartPressed && state.mode === 'play' && !state.shotMode) {
    startRun(1000 + Math.floor(Math.random() * 9000));
  }
  if (!state.paused) update(dt);
  state.fireRadiusNow = fireRadius();
  render(ctx, state, input);
  updateHud(state);
  input.endFrame();

  if (state.shotMode) {
    state.shotSteps += 1;
    if (state.shotSteps >= 10) {
      window.__shotReady = true;
      return; // freeze: screenshots must be byte-stable
    }
  }
  requestAnimationFrame(frame);
}

// Boot: a live title over a seeded forest, or a staged screenshot scene.
state.world = buildWorld(7);
state.player = {
  x: CAMP.x + 46, y: CAMP.y + 30, hp: PLAYER.hp, maxHp: PLAYER.hp,
  hunger: PLAYER.hunger, face: -Math.PI / 2, swingT: 0, swingCd: 0, hurtT: 0, atkT: 0,
};
state.stats = newStats();
const api = { startRun, spawnCreature, showBanner, addFloater, gainScore, fireRadius, state };
if (!setupShotScene(state, api)) {
  showBanner('EMBERWATCH', 0.1);
  state.banner = null;
}
window.__ember = state;
requestAnimationFrame(frame);
