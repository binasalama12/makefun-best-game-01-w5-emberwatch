// Deterministic screenshot scenes for EMBERWATCH, driven by the URL:
//   ?shot=boss&seed=9    night 9: The Thicket Warden at the treeline, fire
//                        low, full HUD — the climax cover frame
//   ?shot=draft&seed=9   the dawn blessing draft (the meta screen)
//   ?shot=title&seed=7   the dense title: how-to, bestiary, difficulties
//   ?shot=end&seed=9     the dawn-of-night-9 end screen, S rank, full stats
// Each scene is built from the game's own code with a fixed seed; the main
// loop then fixed-steps it a few frames and raises window.__shotReady, so
// two renders of the same scene come out identical. Without ?shot this
// module does nothing.

import { CAMP, BLESSINGS } from './config.js';

function blessing(id) {
  return BLESSINGS.find((b) => b.id === id);
}

function dressCamp(state) {
  // A camp that has been lived in for nights: walls on the approaches, a
  // lantern post, spikes and a snare on the south path.
  state.structures = [
    { kind: 'wall', x: CAMP.x - 150, y: CAMP.y - 96, hp: 96, maxHp: 130 },
    { kind: 'wall', x: CAMP.x + 158, y: CAMP.y - 70, hp: 130, maxHp: 130 },
    { kind: 'wall', x: CAMP.x - 40, y: CAMP.y + 128, hp: 61, maxHp: 130 },
    { kind: 'lantern', x: CAMP.x - 196, y: CAMP.y + 42, hp: 70, maxHp: 70, light: 96 },
    { kind: 'spikes', x: CAMP.x + 92, y: CAMP.y + 118, hp: 9999, maxHp: 9999, dps: 20 },
    { kind: 'snare', x: CAMP.x + 196, y: CAMP.y + 66, hp: 9999, maxHp: 9999, stun: 4, dmg: 45, armed: true },
  ];
}

function campersHome(state, n) {
  state.world.campers.forEach((cm, i) => {
    if (i < n) {
      cm.rescued = true; cm.home = true;
      cm.x = CAMP.x - 70 + i * 44;
      cm.y = CAMP.y + 58 + (i % 2) * 22;
    }
  });
  state.rescued = n;
}

export function setupShotScene(state, api) {
  const params = new URLSearchParams(location.search);
  const shot = params.get('shot');
  if (!shot) return false;
  const seed = parseInt(params.get('seed') || '7', 10) || 7;
  state.shotMode = shot;

  if (shot === 'title') {
    state.difficulty = 1;
    state.fire.fuel = 72;
    dressCamp(state);
    const msg = document.getElementById('msg');
    if (msg) msg.textContent = '';
    return true;
  }

  if (shot === 'boss') {
    api.startRun(seed);
    const s = state;
    s.night = 9;
    s.phase = 'night';
    s.phaseT = 41;
    s.fire.fuel = 23;                       // the fire is low — that is the point
    s.score = 47850;
    s.chain = 3; s.bestChain = 5;
    s.kills = 104; s.gathered = 296; s.crafted = 24;
    s.inv = { wood: 7, scrap: 5, berry: 2 };
    s.blessings = ['kindled', 'keen', 'ward', 'swift', 'bounty'];
    s.player.maxHp = 140;
    s.player.hp = 86;
    s.player.hunger = 57;
    s.player.x = CAMP.x + 96; s.player.y = CAMP.y + 52;
    s.player.face = Math.atan2(-120, 190);
    s.player.swingT = 0.45;
    dressCamp(s);
    campersHome(s, 3);
    // The Warden, hurt and closing on the flame, with its court around it.
    const boss = api.spawnCreature('boss', CAMP.x + 208, CAMP.y - 128);
    boss.hp = boss.maxHp * 0.55;
    api.spawnCreature('stag', CAMP.x + 268, CAMP.y + 60);
    api.spawnCreature('nightjar', CAMP.x - 210, CAMP.y - 150);
    api.spawnCreature('nightjar', CAMP.x + 60, CAMP.y - 238);
    api.spawnCreature('barkhound', CAMP.x - 168, CAMP.y + 128);
    api.spawnCreature('sporecap', CAMP.x + 300, CAMP.y - 196);
    api.spawnCreature('twigling', CAMP.x - 262, CAMP.y - 40);
    api.spawnCreature('twigling', CAMP.x + 130, CAMP.y + 196);
    api.spawnCreature('emberthief', CAMP.x - 84, CAMP.y - 196);
    s.waveQueue = ['twigling', 'twigling', 'barkhound', 'nightjar', 'stag', 'splinter'];
    api.showBanner('NIGHT 9 — THE THICKET WARDEN COMES FOR THE FLAME', 30);
    api.addFloater(CAMP.x + 150, CAMP.y - 90, '−34', '#fff2cf', 16);
    api.addFloater(CAMP.x + 40, CAMP.y + 30, '+150', '#ffd76a', 16);
    api.addFloater(CAMP.x - 120, CAMP.y + 90, 'SNARED!', '#ffd76a', 14);
    const msg = document.getElementById('msg');
    if (msg) msg.textContent = 'Night 9: hold the treeline. The Warden is at 55% — burn it before the fire dies.';
    return true;
  }

  if (shot === 'draft') {
    api.startRun(seed);
    const s = state;
    s.night = 5;
    s.phase = 'day';
    s.phaseT = 80;
    s.fire.fuel = 64;
    s.score = 23460;
    s.chain = 2; s.bestChain = 2;
    s.kills = 47; s.gathered = 168; s.crafted = 13;
    s.inv = { wood: 11, scrap: 6, berry: 4 };
    s.blessings = ['kindled', 'ironbark', 'forager', 'bond'];
    s.player.maxHp = 140;
    s.player.hp = 118;
    s.player.hunger = 72;
    dressCamp(s);
    campersHome(s, 3);
    s.draftsPending = 2;
    s.draftsTotal = 2;
    s.draftOptions = [blessing('keen'), blessing('ward'), blessing('trap')];
    s.mode = 'draft';
    s.banner = null;
    const msg = document.getElementById('msg');
    if (msg) msg.textContent = '';
    return true;
  }

  if (shot === 'end') {
    api.startRun(seed);
    const s = state;
    s.night = 9;
    s.phase = 'day';
    s.fire.fuel = 41;
    s.score = 54280;
    s.chain = 4; s.bestChain = 5;
    s.blessings = ['kindled', 'ironbark', 'keen', 'forager', 'ward', 'bounty', 'trap'];
    s.player.maxHp = 140;
    s.player.hp = 96;
    dressCamp(s);
    campersHome(s, 4);
    s.victory = true;
    s.endRank = 'S';
    s.stats = {
      nights: 9, kills: 118, gathered: 342, crafted: 27, rescues: 4,
      bestChain: 5, damageTaken: 212, treesFelled: 41, timeSurvived: 1185, bossDown: true,
    };
    s.mode = 'end';
    s.banner = null;
    const msg = document.getElementById('msg');
    if (msg) msg.textContent = '';
    return true;
  }

  return false;
}
