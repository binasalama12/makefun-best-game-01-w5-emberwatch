// EMBERWATCH configuration: the camp, the Hollowood, its seven creature
// kinds, six crafts, ten dawn blessings, nine nights and three difficulties.
// By day you chop, forage and fortify the campfire — its light radius is the
// safe zone and it shrinks as the fire burns down. By night the Hollowood
// hunts the light. Rescue 4 lost campers, hold the treeline, and see the
// dawn of night 9, when The Thicket Warden comes for the flame itself.

export const VIEW_W = 1280;
export const VIEW_H = 720;
export const HUD_H = 46;
export const CAMP = { x: 640, y: 396 };       // the campfire, heart of camp
export const WORLD = { x: 26, y: 66, w: 1228, h: 628 }; // the forest clearing

export const TITLE =
  'EMBERWATCH — build by day, hold by night: 9 nights, 7 creatures, 6 crafts, 4 rescues, boss The Thicket Warden';

// ---------------------------------------------------------------- creatures
// Seven Hollowood kinds, each with one distinct behaviour (the bestiary line
// is shown verbatim on the title screen). hp/dmg/speed are Standard values;
// difficulty scales them. score is the base bounty before night/chain mults.
export const CREATURES = {
  twigling: {
    name: 'Twigling', color: '#9db36a', dark: '#5d7038', r: 13,
    hp: 40, dmg: 7, speed: 46, score: 60,
    line: 'shambles straight for the fire, too dim to fear the light',
  },
  barkhound: {
    name: 'Barkhound', color: '#b07a45', dark: '#6e4525', r: 14,
    hp: 55, dmg: 10, speed: 92, score: 90,
    line: 'circles its prey twice, then lunges — strike it mid-lunge',
  },
  sporecap: {
    name: 'Sporecap', color: '#c9d16a', dark: '#7d8438', r: 15,
    hp: 65, dmg: 6, speed: 26, score: 110,
    line: 'keeps its distance and puffs choking spore clouds at the camp',
  },
  splinter: {
    name: 'Splinter Wraith', color: '#a8c8e8', dark: '#5d7ea3', r: 14,
    hp: 48, dmg: 8, speed: 58, score: 120,
    line: 'splits into two Sapling Shades when it falls — finish them fast',
  },
  shade: {
    name: 'Sapling Shade', color: '#c4dcf2', dark: '#7d9bbd', r: 9,
    hp: 18, dmg: 5, speed: 74, score: 40,
    line: 'a splinter of a wraith — quick, frail, and angry',
  },
  nightjar: {
    name: 'Nightjar', color: '#8a6fd0', dark: '#513f83', r: 12,
    hp: 38, dmg: 11, speed: 104, score: 130,
    line: 'flies over walls and dives out of the dark at the fire-keeper',
  },
  emberthief: {
    name: 'Emberthief', color: '#e08a3c', dark: '#8f5520', r: 12,
    hp: 34, dmg: 4, speed: 96, score: 150,
    line: 'ignores you — it steals burning logs and drags your fire down',
  },
  stag: {
    name: 'Gloam Stag', color: '#7a5a8f', dark: '#463258', r: 19,
    hp: 150, dmg: 20, speed: 62, score: 260,
    line: 'lowers its antlers and charges in a straight line — sidestep it',
  },
};
export const BESTIARY_ORDER = ['twigling', 'barkhound', 'sporecap', 'splinter', 'nightjar', 'emberthief', 'stag'];

export const BOSS = {
  name: 'The Thicket Warden', color: '#4d7a3a', dark: '#2c4a20', r: 40,
  hp: 1500, dmg: 26, speed: 34, score: 5000,
  line: 'the forest itself, walking — it roots the ground, calls Twiglings, and charges the flame',
};

// ------------------------------------------------------------------- crafts
// Six recipes. wood/scrap/berry costs; kind decides what using the key does:
// 'place' drops a structure at the player's facing point, 'eat'/'heal' are
// consumed on the spot.
export const CRAFTS = [
  { key: '1', id: 'wall',    name: 'Timber Wall',   cost: { wood: 4 },           kind: 'place', hp: 130, line: 'a barricade the Hollowood must chew through' },
  { key: '2', id: 'spikes',  name: 'Spike Strip',   cost: { wood: 3, scrap: 2 }, kind: 'place', hp: 9999, dps: 20, line: 'sharpened stakes that bleed anything crossing' },
  { key: '3', id: 'lantern', name: 'Lantern Post',  cost: { wood: 2, scrap: 3 }, kind: 'place', hp: 70, light: 96, line: 'a second sun — its glow burns the Hollowood' },
  { key: '4', id: 'stew',    name: "Hunter's Stew", cost: { berry: 3 },          kind: 'eat', hunger: 60, heal: 25, line: 'berries and bark-tea: fills the belly, mends a little' },
  { key: '5', id: 'snare',   name: 'Snare Trap',    cost: { wood: 1, scrap: 2 }, kind: 'place', hp: 9999, stun: 4, dmg: 45, line: 'a wire noose — stuns and wounds the first thing in' },
  { key: '6', id: 'bandage', name: 'Ember Bandage', cost: { berry: 2 },          kind: 'heal', heal: 40, line: 'ember-ash poultice: +40 health, right now' },
];

// ---------------------------------------------------------------- blessings
// Ten named dawn blessings with real effects. At each dawn the keeper drafts
// 1 of 3 (one draft per camper rescued that day, minimum one). The draft is
// the meta screen: screenshot 2.
export const BLESSINGS = [
  { id: 'kindled',  name: 'Kindled Heart',   line: 'the fire burns 25% slower all run', },
  { id: 'ironbark', name: 'Ironbark Skin',   line: '+40 max health, and heal 40 now', },
  { id: 'swift',    name: 'Swift Boots',     line: '+15% movement speed', },
  { id: 'keen',     name: 'Keen Axe',        line: '+30% axe damage', },
  { id: 'forager',  name: "Forager's Eye",   line: '+50% wood, scrap and berries gathered', },
  { id: 'ward',     name: 'Ember Ward',      line: 'campfire light radius +18%', },
  { id: 'bounty',   name: "Night's Bounty",  line: '+50% score from night kills', },
  { id: 'second',   name: 'Second Wind',     line: 'heal 30 at every dawn from now on', },
  { id: 'trap',     name: 'Trapmaster',      line: 'spikes and snares deal +60% damage', },
  { id: 'bond',     name: "Camper's Bond",   line: 'each rescued camper hauls +1 wood every dawn', },
];

// ------------------------------------------------------------- nights/waves
// Wave composition per night: [creatureKind, count] pulses. The day panel
// shows tonight's full muster before dusk; night spawns it in three pulses.
export const NIGHTS = [
  { night: 1, wave: [['twigling', 6]] },
  { night: 2, wave: [['twigling', 8], ['barkhound', 3]] },
  { night: 3, wave: [['twigling', 9], ['barkhound', 4], ['sporecap', 2]] },
  { night: 4, wave: [['twigling', 10], ['barkhound', 5], ['sporecap', 3], ['splinter', 3]] },
  { night: 5, wave: [['twigling', 11], ['barkhound', 5], ['sporecap', 3], ['splinter', 4], ['nightjar', 3]] },
  { night: 6, wave: [['twigling', 12], ['barkhound', 6], ['sporecap', 4], ['splinter', 4], ['nightjar', 4], ['emberthief', 2]] },
  { night: 7, wave: [['twigling', 13], ['barkhound', 7], ['sporecap', 4], ['splinter', 5], ['nightjar', 5], ['emberthief', 3], ['stag', 1]], banner: 'NIGHT 7 — THEY SMELL THE FIRE' },
  { night: 8, wave: [['twigling', 14], ['barkhound', 8], ['sporecap', 5], ['splinter', 6], ['nightjar', 6], ['emberthief', 3], ['stag', 2]] },
  { night: 9, wave: [['twigling', 12], ['barkhound', 7], ['sporecap', 5], ['splinter', 6], ['nightjar', 6], ['emberthief', 3], ['stag', 2]], boss: true, banner: 'NIGHT 9 — THE THICKET WARDEN COMES FOR THE FLAME' },
];

// -------------------------------------------------------------- difficulties
export const DIFFICULTIES = [
  { id: 'story',    name: 'Story',    line: 'gentler Hollowood, long days — learn the treeline', hp: 0.7, dmg: 0.6, speed: 0.9, day: 95, fireDrain: 0.8 },
  { id: 'standard', name: 'Standard', line: 'the Hollowood as it is meant to be faced',          hp: 1.0, dmg: 1.0, speed: 1.0, day: 80, fireDrain: 1.0 },
  { id: 'nightmare', name: 'Nightmare', line: 'short days, hungry fire, faster teeth',           hp: 1.45, dmg: 1.5, speed: 1.15, day: 65, fireDrain: 1.3 },
];

export const NIGHT_SECONDS = 62;

export const SCORE = {
  gather: 5,          // per unit of wood / scrap / berry hauled
  craft: 15,          // per item crafted
  rescue: 1500,       // per camper brought home
  nightClear: 500,    // × night number when dawn breaks
  dawnChain: 250,     // × no-damage chain count, paid at dawn
  hit: 2,             // per axe hit landed
};

export const FIRE = {
  max: 100,
  startFuel: 78,
  dayDrain: 0.34,     // fuel per second by day (× difficulty fireDrain)
  nightDrain: 0.62,   // fuel per second by night
  woodFuel: 9,        // fuel restored per log fed
  radiusMin: 74,
  radiusMax: 268,     // at full fuel, before Ember Ward
  burnDps: 9,         // what standing in firelight does to the Hollowood
};

export const PLAYER = {
  hp: 100, hunger: 100, speed: 178, r: 14,
  axeDamage: 34, axeRange: 66, axeArc: 1.9, axeCooldown: 0.38,
  hungerDrain: 0.22,  // per second, day and night alike (~3 cycles to empty)
  starveDps: 2.2,     // health lost per second at zero hunger
};
