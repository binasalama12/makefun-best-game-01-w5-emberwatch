// EMBERWATCH rendering: everything is drawn on the one canvas — the
// procedural Hollowood (grass tufts, stones, mushroom rings, a ragged
// treeline), the campfire and its shrinking light, seven creature kinds and
// The Thicket Warden, the keeper, structures, juice (floating numbers,
// banners, ember particles, firelight glow) — plus the in-canvas HUD panels
// (WIN/LOSE, wave muster, blessing collection, craft bar, combo chain) and
// the title / dawn-draft / end screens.

import { CAMP, WORLD, VIEW_W, VIEW_H, CREATURES, BOSS, BESTIARY_ORDER, CRAFTS, BLESSINGS, DIFFICULTIES, FIRE, TITLE } from './config.js';
import { musterSummary } from './world.js';

const FONT = "Georgia, 'Times New Roman', serif";
let darkCanvas = null;

function fireRadiusOf(s) {
  if (typeof s.fireRadiusNow === 'number') return s.fireRadiusNow;
  return FIRE.radiusMin + (Math.max(0, s.fire.fuel) / 100) * (FIRE.radiusMax - FIRE.radiusMin);
}

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function panel(ctx, x, y, w, h, fill = 'rgba(10,14,10,0.78)', edge = 'rgba(255,215,106,0.35)') {
  ctx.fillStyle = fill;
  rr(ctx, x, y, w, h, 10); ctx.fill();
  ctx.strokeStyle = edge; ctx.lineWidth = 1.5;
  rr(ctx, x, y, w, h, 10); ctx.stroke();
}

function text(ctx, str, x, y, size, color, align = 'left', bold = false) {
  ctx.fillStyle = color;
  ctx.font = `${bold ? 'bold ' : ''}${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(str, x, y);
}

function wrap(ctx, str, x, y, maxW, size, color, lineH) {
  ctx.font = `${size}px ${FONT}`;
  const words = str.split(' ');
  let line = '', yy = y;
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && line) {
      text(ctx, line, x, yy, size, color);
      line = w; yy += lineH;
    } else line = test;
  }
  if (line) text(ctx, line, x, yy, size, color);
  return yy;
}

// ------------------------------------------------------------ the forest
function drawGround(ctx, s) {
  const w = s.world;
  const g = ctx.createLinearGradient(0, WORLD.y, 0, WORLD.y + WORLD.h);
  if (s.phase === 'night' || s.mode === 'draft') { g.addColorStop(0, '#14231a'); g.addColorStop(1, '#0d1a12'); }
  else { g.addColorStop(0, '#2c4a2e'); g.addColorStop(1, '#1f3a24'); }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  // Mottled clearings: soft darker/lighter ellipses for ground texture.
  ctx.save();
  for (let i = 0; i < w.tufts.length; i += 7) {
    const t = w.tufts[i];
    ctx.fillStyle = t.tone > 0.5 ? 'rgba(70,110,60,0.16)' : 'rgba(10,24,14,0.20)';
    ctx.beginPath(); ctx.ellipse(t.x, t.y, 26 + t.tone * 30, 15 + t.tone * 18, t.lean, 0, 6.29); ctx.fill();
  }
  ctx.restore();
  // Stones.
  for (const st of w.stones) {
    ctx.fillStyle = st.tone > 0.5 ? '#5a6658' : '#47523f';
    ctx.beginPath(); ctx.ellipse(st.x, st.y, st.r, st.r * 0.7, 0, 0, 6.29); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.beginPath(); ctx.ellipse(st.x - st.r * 0.3, st.y - st.r * 0.25, st.r * 0.45, st.r * 0.3, 0, 0, 6.29); ctx.fill();
  }
  // Grass tufts.
  ctx.strokeStyle = 'rgba(120,170,90,0.5)';
  ctx.lineWidth = 1.4;
  for (const t of w.tufts) {
    ctx.beginPath();
    for (let b = -1; b <= 1; b++) {
      ctx.moveTo(t.x, t.y);
      ctx.quadraticCurveTo(t.x + b * 3 + Math.cos(t.lean) * 3, t.y - 5 * t.s, t.x + b * 5 + Math.sin(s.time * 0.8 + t.lean) * 1.5, t.y - 9 * t.s);
    }
    ctx.stroke();
  }
  // Mushroom rings.
  for (const ring of w.rings) {
    for (const m of ring.mush) {
      ctx.fillStyle = '#c94f4f';
      ctx.beginPath(); ctx.arc(m.x, m.y, 4.4 * m.s, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#e8dcc0';
      ctx.fillRect(m.x - 1.4 * m.s, m.y, 2.8 * m.s, 4 * m.s);
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(m.x - 1.6 * m.s, m.y - 2 * m.s, 0.9, 0, 6.29); ctx.fill();
    }
  }
  // The camp clearing: worn earth around the fire.
  const cg = ctx.createRadialGradient(CAMP.x, CAMP.y, 10, CAMP.x, CAMP.y, 150);
  cg.addColorStop(0, 'rgba(122,90,52,0.55)');
  cg.addColorStop(0.7, 'rgba(100,76,44,0.28)');
  cg.addColorStop(1, 'rgba(100,76,44,0)');
  ctx.fillStyle = cg;
  ctx.beginPath(); ctx.arc(CAMP.x, CAMP.y, 150, 0, 6.29); ctx.fill();
}

function drawTreeline(ctx, s) {
  for (const t of s.world.treeline) {
    const sway = Math.sin(s.time * 0.6 + t.x * 0.05) * 1.6;
    ctx.fillStyle = '#0a140d';
    ctx.beginPath();
    ctx.moveTo(t.x - 20 * t.s, t.y + 14);
    ctx.lineTo(t.x + sway, t.y - 52 * t.s);
    ctx.lineTo(t.x + 20 * t.s, t.y + 14);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(30,60,36,0.8)';
    ctx.beginPath();
    ctx.moveTo(t.x - 13 * t.s, t.y + 8);
    ctx.lineTo(t.x + sway, t.y - 38 * t.s);
    ctx.lineTo(t.x + 13 * t.s, t.y + 8);
    ctx.closePath(); ctx.fill();
  }
}

function drawTree(ctx, s, t) {
  if (t.felled) {
    // Stump and fallen trunk.
    ctx.fillStyle = '#6e4f2a';
    ctx.beginPath(); ctx.ellipse(t.x, t.y, 10, 6, 0, 0, 6.29); ctx.fill();
    ctx.fillStyle = '#8a6a3c';
    ctx.beginPath(); ctx.ellipse(t.x, t.y, 6.5, 4, 0, 0, 6.29); ctx.fill();
    ctx.save();
    ctx.translate(t.x + 20, t.y + 8); ctx.rotate(0.5);
    ctx.fillStyle = '#5d4225'; ctx.fillRect(-4, -26, 8, 44);
    ctx.fillStyle = 'rgba(46,84,44,0.75)';
    ctx.beginPath(); ctx.arc(0, -30, 15, 0, 6.29); ctx.fill();
    ctx.restore();
    return;
  }
  const sway = Math.sin(s.time * 0.9 + t.sway) * 2;
  ctx.fillStyle = 'rgba(0,0,0,0.30)';
  ctx.beginPath(); ctx.ellipse(t.x + 5, t.y + 7, 24 * t.scale, 9 * t.scale, 0, 0, 6.29); ctx.fill();
  ctx.fillStyle = '#5d4225';
  ctx.fillRect(t.x - 3.4 * t.scale, t.y - 12 * t.scale, 6.8 * t.scale, 15 * t.scale);
  const layers = [
    [0, -34, 27, '#1d4023'], [0, -48, 21, '#265430'], [0, -60, 14.5, '#2f6a3c'],
  ];
  for (const [ox, oy, r, col] of layers) {
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(t.x + ox * t.scale + sway * (r / 27), t.y + oy * t.scale, r * t.scale, 0, 6.29); ctx.fill();
  }
  ctx.fillStyle = 'rgba(140,220,130,0.20)';
  ctx.beginPath(); ctx.arc(t.x - 8 * t.scale + sway, t.y - 52 * t.scale, 9 * t.scale, 0, 6.29); ctx.fill();
  if (t.hp < t.maxHp) {
    ctx.fillStyle = '#d8c9a8';
    text(ctx, '✕'.repeat(t.maxHp - t.hp), t.x, t.y - 66 * t.scale, 11, '#ffe9b8', 'center', true);
  }
}

function drawBush(ctx, s, b) {
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath(); ctx.ellipse(b.x + 3, b.y + 5, 17, 7, 0, 0, 6.29); ctx.fill();
  ctx.fillStyle = '#2c5a2e';
  ctx.beginPath(); ctx.arc(b.x, b.y - 4, 15, 0, 6.29); ctx.fill();
  ctx.fillStyle = '#38703a';
  ctx.beginPath(); ctx.arc(b.x - 8, b.y - 9, 10, 0, 6.29); ctx.arc(b.x + 9, b.y - 8, 9, 0, 6.29); ctx.fill();
  if (b.berries > 0) {
    ctx.fillStyle = '#e85d8a';
    const spots = [[-7, -8], [4, -13], [8, -3], [-2, -2], [0, -16]];
    for (let i = 0; i < b.berries + 2 && i < spots.length; i++) {
      ctx.beginPath(); ctx.arc(b.x + spots[i][0], b.y + spots[i][1], 3, 0, 6.29); ctx.fill();
    }
  }
}

function drawScrap(ctx, s, sc) {
  if (sc.left <= 0) {
    ctx.fillStyle = 'rgba(90,90,90,0.35)';
    ctx.beginPath(); ctx.ellipse(sc.x, sc.y, 12, 5, 0, 0, 6.29); ctx.fill();
    return;
  }
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath(); ctx.ellipse(sc.x + 3, sc.y + 5, 16, 6, 0, 0, 6.29); ctx.fill();
  ctx.save();
  ctx.translate(sc.x, sc.y);
  ctx.fillStyle = '#7d7466';
  ctx.fillRect(-11, -6, 15, 7);
  ctx.fillStyle = '#98907e';
  ctx.fillRect(-3, -11, 13, 6);
  ctx.fillStyle = '#5f594e';
  ctx.fillRect(-13, 1, 20, 5);
  ctx.fillStyle = '#c96f2e';
  ctx.beginPath(); ctx.arc(7, -8, 3.4, 0, 6.29); ctx.fill();
  ctx.restore();
}

function drawCamper(ctx, s, cm) {
  const bob = Math.sin(s.time * 3 + cm.phase) * 1.6;
  const y = cm.y + (cm.home || cm.rescued ? bob : 0);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(cm.x, cm.y + 10, 10, 4, 0, 0, 6.29); ctx.fill();
  ctx.fillStyle = cm.color;
  ctx.beginPath(); ctx.arc(cm.x, y, 10, 0, 6.29); ctx.fill();
  ctx.fillStyle = '#f2d5b8';
  ctx.beginPath(); ctx.arc(cm.x, y - 11, 6, 0, 6.29); ctx.fill();
  ctx.fillStyle = '#3a2c1c';
  ctx.beginPath(); ctx.arc(cm.x - 2.2, y - 11.5, 1.1, 0, 6.29); ctx.arc(cm.x + 2.2, y - 11.5, 1.1, 0, 6.29); ctx.fill();
  if (!cm.rescued) {
    const pulse = 1 + Math.sin(s.time * 4 + cm.phase) * 0.15;
    ctx.fillStyle = '#ffd76a';
    ctx.beginPath(); ctx.arc(cm.x, y - 30, 9 * pulse, 0, 6.29); ctx.fill();
    text(ctx, '!', cm.x, y - 26, 13, '#402c00', 'center', true);
    text(ctx, cm.name, cm.x, y + 24, 11, '#ffe9b8', 'center', true);
  } else if (!cm.home) {
    text(ctx, cm.name + ' — coming!', cm.x, y - 24, 11, '#a5e86b', 'center', true);
  }
}

function drawStructure(ctx, s, st) {
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(st.x, st.y + 8, 18, 6, 0, 0, 6.29); ctx.fill();
  if (st.kind === 'wall') {
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = i % 2 ? '#7a5a30' : '#8a683c';
      ctx.fillRect(st.x - 20, st.y - 16 + i * 10, 40, 8);
    }
    ctx.fillStyle = '#5d4225';
    ctx.fillRect(st.x - 20, st.y - 18, 5, 38); ctx.fillRect(st.x + 15, st.y - 18, 5, 38);
    if (st.hp < st.maxHp) bar(ctx, st.x - 18, st.y - 26, 36, 4, st.hp / st.maxHp, '#e0a44a');
  } else if (st.kind === 'lantern') {
    ctx.fillStyle = '#4a3a22';
    ctx.fillRect(st.x - 2.5, st.y - 20, 5, 26);
    const fl = 0.85 + Math.sin(s.time * 7 + st.x) * 0.15;
    ctx.fillStyle = '#2c2416';
    rr(ctx, st.x - 7, st.y - 30, 14, 13, 3); ctx.fill();
    ctx.fillStyle = `rgba(255,190,80,${fl})`;
    ctx.beginPath(); ctx.arc(st.x, st.y - 23, 4.6, 0, 6.29); ctx.fill();
    if (st.hp < st.maxHp) bar(ctx, st.x - 14, st.y - 38, 28, 4, st.hp / st.maxHp, '#ffd76a');
  } else if (st.kind === 'spikes') {
    ctx.fillStyle = '#8a7a5c';
    for (let i = 0; i < 5; i++) {
      const ox = -18 + i * 9;
      ctx.beginPath();
      ctx.moveTo(st.x + ox - 3.4, st.y + 8);
      ctx.lineTo(st.x + ox, st.y - 12);
      ctx.lineTo(st.x + ox + 3.4, st.y + 8);
      ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = 'rgba(160,40,40,0.5)';
    ctx.beginPath(); ctx.ellipse(st.x, st.y + 8, 20, 4, 0, 0, 6.29); ctx.fill();
  } else if (st.kind === 'snare') {
    ctx.strokeStyle = st.armed ? '#d8c9a8' : 'rgba(120,110,90,0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(st.x, st.y, 15, 8, 0, 0, 6.29); ctx.stroke();
    ctx.fillStyle = '#6e5a38';
    ctx.fillRect(st.x + 10, st.y - 8, 4, 12);
  }
}

function drawFire(ctx, s) {
  const fuel = Math.max(0, s.fire.fuel);
  const t = s.time;
  // Stone ring and logs.
  ctx.fillStyle = '#5c5648';
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    ctx.beginPath(); ctx.ellipse(CAMP.x + Math.cos(a) * 30, CAMP.y + Math.sin(a) * 18, 6.5, 4.6, a, 0, 6.29); ctx.fill();
  }
  ctx.save();
  ctx.translate(CAMP.x, CAMP.y);
  ctx.rotate(0.6); ctx.fillStyle = '#5d4225'; ctx.fillRect(-20, -3.4, 40, 6.8);
  ctx.rotate(-1.1); ctx.fillStyle = '#6e4f2a'; ctx.fillRect(-18, -3, 36, 6);
  ctx.restore();
  if (fuel > 0) {
    const h = 16 + fuel * 0.34;
    const fl = Math.sin(t * 11) * 3 + Math.sin(t * 23) * 1.6;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const layers = [
      [13, h, 'rgba(255,110,20,0.75)'], [9, h * 0.72, 'rgba(255,170,40,0.85)'], [5.2, h * 0.45, 'rgba(255,230,150,0.95)'],
    ];
    for (const [w2, hh, col] of layers) {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(CAMP.x - w2, CAMP.y + 4);
      ctx.quadraticCurveTo(CAMP.x - w2 * 0.6, CAMP.y - hh * 0.5, CAMP.x + fl * (hh / h), CAMP.y - hh);
      ctx.quadraticCurveTo(CAMP.x + w2 * 0.6, CAMP.y - hh * 0.5, CAMP.x + w2, CAMP.y + 4);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    // Firelight glow.
    const R = fireRadiusOf(s);
    const glow = ctx.createRadialGradient(CAMP.x, CAMP.y, 8, CAMP.x, CAMP.y, R);
    glow.addColorStop(0, 'rgba(255,170,60,0.30)');
    glow.addColorStop(0.55, 'rgba(255,140,40,0.12)');
    glow.addColorStop(1, 'rgba(255,120,30,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(CAMP.x, CAMP.y, R, 0, 6.29); ctx.fill();
    // The safe-zone edge: a faint ring of embers on the ground.
    ctx.strokeStyle = 'rgba(255,180,80,0.30)';
    ctx.setLineDash([4, 9]);
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(CAMP.x, CAMP.y, R, 0, 6.29); ctx.stroke();
    ctx.setLineDash([]);
  } else {
    ctx.fillStyle = '#2c2c2c';
    ctx.beginPath(); ctx.ellipse(CAMP.x, CAMP.y, 12, 6, 0, 0, 6.29); ctx.fill();
    text(ctx, 'THE FIRE IS OUT', CAMP.x, CAMP.y - 22, 15, '#e05a5a', 'center', true);
  }
}

function bar(ctx, x, y, w, h, frac, color) {
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w * Math.max(0, Math.min(1, frac)), h);
}

// ------------------------------------------------------------ creatures
function drawCreature(ctx, s, c) {
  const base = c.kind === 'boss' ? BOSS : CREATURES[c.kind];
  const bob = Math.sin(s.time * 5 + c.phase) * 2;
  const flash = c.hitT > 0;
  ctx.fillStyle = 'rgba(0,0,0,0.32)';
  ctx.beginPath(); ctx.ellipse(c.x, c.y + c.r * 0.8, c.r * 0.95, c.r * 0.36, 0, 0, 6.29); ctx.fill();

  // Charge telegraph.
  if (c.mode === 'telegraph') {
    ctx.strokeStyle = 'rgba(224,90,90,0.55)';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.moveTo(c.x, c.y);
    ctx.lineTo(c.x + Math.cos(c.chargeA) * 330, c.y + Math.sin(c.chargeA) * 330);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.save();
  ctx.translate(c.x, c.y + (c.kind === 'nightjar' ? -16 + bob : bob * 0.4));
  const col = flash ? '#ffffff' : base.color;
  const dark = flash ? '#e8e8e8' : base.dark;

  if (c.kind === 'twigling') {
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(0, 0, 12, 0, 6.29); ctx.fill();
    ctx.strokeStyle = dark; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-8, -4); ctx.lineTo(-17, -13); ctx.moveTo(8, -4); ctx.lineTo(17, -13); ctx.moveTo(-6, 6); ctx.lineTo(-13, 14); ctx.moveTo(6, 6); ctx.lineTo(13, 14); ctx.stroke();
    eyes(ctx, -4, 3, -1);
  } else if (c.kind === 'barkhound') {
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.ellipse(0, 0, 17, 10.5, 0, 0, 6.29); ctx.fill();
    ctx.beginPath(); ctx.arc(14, -4, 8.4, 0, 6.29); ctx.fill();
    ctx.fillStyle = dark;
    ctx.beginPath(); ctx.moveTo(9, -11); ctx.lineTo(12, -19); ctx.lineTo(16, -11); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(15, -11); ctx.lineTo(19, -18); ctx.lineTo(21, -10); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = dark; ctx.lineWidth = 3.4;
    ctx.beginPath(); ctx.moveTo(-16, -2); ctx.quadraticCurveTo(-24, -8 + bob, -27, -2); ctx.stroke();
    ctx.fillStyle = '#ffd76a';
    ctx.beginPath(); ctx.arc(16.5, -5, 1.8, 0, 6.29); ctx.fill();
    if (c.mode === 'lunge') { ctx.fillStyle = '#fff'; ctx.fillRect(19, -1, 5, 2.4); }
  } else if (c.kind === 'sporecap') {
    ctx.fillStyle = '#d8cbb0';
    ctx.fillRect(-4.4, -2, 8.8, 13);
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(0, -4, 16, Math.PI, 0); ctx.fill();
    ctx.fillRect(-16, -4, 32, 3.4);
    ctx.fillStyle = '#f2ecd8';
    for (const [ox, oy, r] of [[-8, -12, 2.6], [3, -16, 3.2], [9, -9, 2.2], [-2, -8, 1.8]]) {
      ctx.beginPath(); ctx.arc(ox, oy, r, 0, 6.29); ctx.fill();
    }
    eyes(ctx, -4.4, 4.4, 3);
    if (c.puffT < 0.5) {
      ctx.fillStyle = 'rgba(201,209,106,0.5)';
      ctx.beginPath(); ctx.arc(0, -22, 8 + (0.5 - c.puffT) * 16, 0, 6.29); ctx.fill();
    }
  } else if (c.kind === 'splinter' || c.kind === 'shade') {
    const r = c.kind === 'shade' ? 9 : 14;
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(0, -r - 4); ctx.lineTo(r * 0.72, 0); ctx.lineTo(r * 0.3, r); ctx.lineTo(-r * 0.3, r); ctx.lineTo(-r * 0.72, 0);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = dark;
    ctx.beginPath(); ctx.moveTo(0, -r - 4); ctx.lineTo(0, r); ctx.lineTo(-r * 0.72, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(-2.6, -1, 1.7, 0, 6.29); ctx.arc(3.4, -1, 1.7, 0, 6.29); ctx.fill();
  } else if (c.kind === 'nightjar') {
    const flap = Math.sin(s.time * 13 + c.phase) * 0.55;
    ctx.fillStyle = dark;
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.rotate(side * flap * 0.5);
      ctx.beginPath();
      ctx.moveTo(side * 4, 0); ctx.lineTo(side * 24, -7 - flap * 7); ctx.lineTo(side * 26, 2); ctx.lineTo(side * 5, 5);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.ellipse(0, 0, 12, 8, 0, 0, 6.29); ctx.fill();
    ctx.beginPath(); ctx.arc(9, -3, 5.6, 0, 6.29); ctx.fill();
    ctx.fillStyle = '#ffb347';
    ctx.beginPath(); ctx.moveTo(14, -3); ctx.lineTo(20, -1.2); ctx.lineTo(14, 0.6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffd76a';
    ctx.beginPath(); ctx.arc(10, -4, 1.7, 0, 6.29); ctx.fill();
  } else if (c.kind === 'emberthief') {
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(0, 0, 11, 0, 6.29); ctx.fill();
    ctx.fillStyle = dark;
    ctx.beginPath(); ctx.moveTo(-6, -8); ctx.lineTo(-11, -17); ctx.lineTo(-2, -11); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(6, -8); ctx.lineTo(11, -17); ctx.lineTo(2, -11); ctx.closePath(); ctx.fill();
    eyes(ctx, -3.6, 3.6, -1);
    // The stolen log on its back.
    ctx.save(); ctx.translate(-11, -6); ctx.rotate(-0.7);
    ctx.fillStyle = '#5d4225'; ctx.fillRect(-3, -9, 6, 15);
    ctx.fillStyle = '#ff9a3c'; ctx.beginPath(); ctx.arc(0, -9, 3, 0, 6.29); ctx.fill();
    ctx.restore();
  } else if (c.kind === 'stag') {
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.ellipse(0, 0, 20, 13.5, 0, 0, 6.29); ctx.fill();
    ctx.beginPath(); ctx.arc(16, -6, 9.5, 0, 6.29); ctx.fill();
    ctx.strokeStyle = '#d8c9a8'; ctx.lineWidth = 2.6;
    for (const sx of [12, 19]) {
      ctx.beginPath();
      ctx.moveTo(sx, -13); ctx.lineTo(sx - 3, -24); ctx.moveTo(sx - 1, -19); ctx.lineTo(sx - 8, -23);
      ctx.moveTo(sx, -13); ctx.lineTo(sx + 4, -23);
      ctx.stroke();
    }
    ctx.fillStyle = '#c9a2ff';
    ctx.beginPath(); ctx.arc(18.5, -7, 2.2, 0, 6.29); ctx.fill();
  } else if (c.kind === 'boss') {
    drawBoss(ctx, s, c, flash);
  }
  ctx.restore();

  if (c.stunT > 0) {
    text(ctx, '✦ ✦', c.x, c.y - c.r - 14, 12, '#ffd76a', 'center', true);
  }
  if (c.kind !== 'boss' && c.hp < c.maxHp) {
    bar(ctx, c.x - 15, c.y - c.r - 11, 30, 4, c.hp / c.maxHp, '#e05a5a');
  }
}

function eyes(ctx, lx, rx, y) {
  ctx.fillStyle = '#ffdf5e';
  ctx.beginPath(); ctx.arc(lx, y, 1.9, 0, 6.29); ctx.arc(rx, y, 1.9, 0, 6.29); ctx.fill();
}

function drawBoss(ctx, s, c, flash) {
  const sway = Math.sin(s.time * 1.4) * 2.4;
  ctx.fillStyle = flash ? '#ffffff' : '#4a3520';
  ctx.fillRect(-13, -6, 26, 44);
  ctx.fillStyle = flash ? '#e8e8e8' : BOSS.color;
  ctx.beginPath(); ctx.arc(sway * 0.4, -26, 27, 0, 6.29); ctx.fill();
  ctx.beginPath(); ctx.arc(sway * 0.4 - 19, -12, 17, 0, 6.29); ctx.arc(sway * 0.4 + 19, -12, 17, 0, 6.29); ctx.fill();
  // Branch arms.
  ctx.strokeStyle = flash ? '#fff' : '#3a5a28';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(-22, -16); ctx.lineTo(-44, 4 + sway); ctx.moveTo(22, -16); ctx.lineTo(44, 4 - sway);
  ctx.stroke();
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-44, 4 + sway); ctx.lineTo(-52, -6 + sway); ctx.moveTo(44, 4 - sway); ctx.lineTo(52, -6 - sway);
  ctx.stroke();
  // Antler crown of branches.
  ctx.strokeStyle = '#d8c9a8'; ctx.lineWidth = 3.4;
  for (const sx of [-14, 0, 14]) {
    ctx.beginPath();
    ctx.moveTo(sway * 0.4 + sx, -46);
    ctx.lineTo(sway * 0.4 + sx * 1.5, -66);
    ctx.moveTo(sway * 0.4 + sx * 1.25, -57); ctx.lineTo(sway * 0.4 + sx * 1.25 - 7, -63);
    ctx.moveTo(sway * 0.4 + sx * 1.25, -57); ctx.lineTo(sway * 0.4 + sx * 1.25 + 7, -63);
    ctx.stroke();
  }
  // Glowing eyes and a heart of ember.
  ctx.fillStyle = '#ffb347';
  ctx.beginPath(); ctx.arc(sway * 0.4 - 9, -28, 3.6, 0, 6.29); ctx.arc(sway * 0.4 + 9, -28, 3.6, 0, 6.29); ctx.fill();
  ctx.fillStyle = `rgba(255,120,40,${0.65 + Math.sin(s.time * 6) * 0.3})`;
  ctx.beginPath(); ctx.arc(0, 8, 6.4, 0, 6.29); ctx.fill();
  text(ctx, 'THE THICKET WARDEN', c.x, c.y - 86, 15, '#ffd76a', 'center', true);
}

function drawPlayer(ctx, s) {
  const p = s.player;
  const bob = Math.sin(s.time * 7) * (p.swingT > 0 ? 0 : 1.2);
  ctx.fillStyle = 'rgba(0,0,0,0.32)';
  ctx.beginPath(); ctx.ellipse(p.x, p.y + 12, 12, 5, 0, 0, 6.29); ctx.fill();
  // Cloak.
  ctx.fillStyle = p.hurtT > 0 ? '#c94f4f' : '#2e6a8a';
  ctx.beginPath(); ctx.arc(p.x, p.y + bob * 0.3, 13.5, 0, 6.29); ctx.fill();
  ctx.fillStyle = p.hurtT > 0 ? '#e88a8a' : '#3d86ad';
  ctx.beginPath(); ctx.arc(p.x, p.y - 3 + bob * 0.3, 10.5, 0, 6.29); ctx.fill();
  // Hood and face.
  ctx.fillStyle = '#f2d5b8';
  ctx.beginPath(); ctx.arc(p.x, p.y - 6 + bob * 0.3, 6.2, 0, 6.29); ctx.fill();
  ctx.fillStyle = '#22506b';
  ctx.beginPath(); ctx.arc(p.x, p.y - 9.5 + bob * 0.3, 6.6, Math.PI, 0); ctx.fill();
  // The axe, swung toward the aim.
  const swingA = p.swingT > 0 ? (0.22 - p.swingT) / 0.22 : 0;
  const axeA = p.face + (p.swingT > 0 ? -1.2 + swingA * 2.2 : 0.5);
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(axeA);
  ctx.fillStyle = '#8a683c';
  ctx.fillRect(6, -1.8, 19, 3.6);
  ctx.fillStyle = '#cfd6dd';
  ctx.beginPath();
  ctx.moveTo(23, -6.4); ctx.lineTo(30, -2); ctx.lineTo(30, 3.4); ctx.lineTo(23, 5.4);
  ctx.closePath(); ctx.fill();
  ctx.restore();
  if (p.swingT > 0) {
    ctx.strokeStyle = 'rgba(255,240,200,0.5)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 44, p.face - 0.9 + swingA * 1.4, p.face - 0.3 + swingA * 1.4);
    ctx.stroke();
  }
}

// -------------------------------------------------------------- darkness
function drawDarkness(ctx, s) {
  const night = s.phase === 'night' || s.mode === 'draft' || s.mode === 'end';
  if (!night && s.mode !== 'title') {
    // Day: only a soft vignette.
    const v = ctx.createRadialGradient(640, 396, 380, 640, 396, 860);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,0.30)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    return;
  }
  if (!darkCanvas) { darkCanvas = document.createElement('canvas'); darkCanvas.width = VIEW_W; darkCanvas.height = VIEW_H; }
  const d = darkCanvas.getContext('2d');
  d.clearRect(0, 0, VIEW_W, VIEW_H);
  d.fillStyle = s.mode === 'title' ? 'rgba(3,6,14,0.66)' : 'rgba(3,5,12,0.82)';
  d.fillRect(0, 0, VIEW_W, VIEW_H);
  d.globalCompositeOperation = 'destination-out';
  const flick = 1 + Math.sin(s.time * 9) * 0.012 + Math.sin(s.time * 23) * 0.008;
  const R = fireRadiusOf(s) * flick;
  const g = d.createRadialGradient(CAMP.x, CAMP.y, R * 0.25, CAMP.x, CAMP.y, R);
  g.addColorStop(0, 'rgba(0,0,0,0.97)');
  g.addColorStop(0.75, 'rgba(0,0,0,0.92)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  d.fillStyle = g;
  d.beginPath(); d.arc(CAMP.x, CAMP.y, R, 0, 6.29); d.fill();
  for (const st of s.structures) {
    if (st.kind !== 'lantern' || st.hp <= 0) continue;
    const lg = d.createRadialGradient(st.x, st.y - 20, 8, st.x, st.y - 20, st.light);
    lg.addColorStop(0, 'rgba(0,0,0,0.92)');
    lg.addColorStop(1, 'rgba(0,0,0,0)');
    d.fillStyle = lg;
    d.beginPath(); d.arc(st.x, st.y - 20, st.light, 0, 6.29); d.fill();
  }
  // A small pool of sight around the keeper, lantern or no.
  const p = s.player;
  if (p) {
    const pg = d.createRadialGradient(p.x, p.y, 6, p.x, p.y, 74);
    pg.addColorStop(0, 'rgba(0,0,0,0.55)');
    pg.addColorStop(1, 'rgba(0,0,0,0)');
    d.fillStyle = pg;
    d.beginPath(); d.arc(p.x, p.y, 74, 0, 6.29); d.fill();
  }
  d.globalCompositeOperation = 'source-over';
  ctx.drawImage(darkCanvas, 0, 0);
}

// ------------------------------------------------------------- HUD panels
function drawPlayHud(ctx, s) {
  // WIN / LOSE strip, top centre, under the DOM bar.
  panel(ctx, 340, 54, 600, 40);
  text(ctx, `WIN: DAWN OF NIGHT 9 · RESCUE ALL 4 (${s.rescued}/4)`, 640, 71, 13.5, '#a5e86b', 'center', true);
  text(ctx, 'LOSE: THE FIRE DIES OR YOU FALL', 640, 88, 12, '#e08a8a', 'center', true);

  // Boss bar.
  if (s.boss) {
    panel(ctx, 390, 102, 500, 30, 'rgba(20,10,6,0.85)', 'rgba(255,150,60,0.5)');
    text(ctx, 'THE THICKET WARDEN', 640, 114, 11, '#ffb347', 'center', true);
    bar(ctx, 410, 119, 460, 7, s.boss.hp / s.boss.maxHp, '#e05a3c');
  }

  // Left panel: the watch — chain combo, light radius, campers.
  panel(ctx, 14, 108, 218, 196);
  text(ctx, 'THE WATCH', 28, 130, 12, '#b9a8e8', 'left', true);
  const mult = (1 + 0.25 * s.chain).toFixed(2);
  text(ctx, `NO-DAMAGE CHAIN ×${s.chain}`, 28, 154, 14.5, s.chain > 0 ? '#ffd76a' : '#cfd6dd', 'left', true);
  text(ctx, `kill score ×${mult} · best ×${s.bestChain}`, 28, 172, 11.5, '#cfd6dd');
  text(ctx, 'LIGHT RADIUS', 28, 196, 10.5, '#b9a8e8', 'left', true);
  bar(ctx, 28, 202, 190, 8, fireRadiusOf(s) / (FIRE.radiusMax * 1.18), '#ffb347');
  text(ctx, `${Math.round(fireRadiusOf(s))} paces of safe light`, 28, 226, 11.5, '#cfd6dd');
  text(ctx, 'LOST CAMPERS', 28, 250, 10.5, '#b9a8e8', 'left', true);
  s.world.campers.forEach((cm, i) => {
    text(ctx, `${cm.rescued ? '✓' : '✗'} ${cm.name}`, 28, 268 + i * 14, 11.5, cm.rescued ? '#a5e86b' : '#e0b8b8');
  });

  // Right panel: tonight's muster / what is still out there + blessings.
  const summary = musterSummary(s.night - 1);
  const alive = {};
  for (const c of s.creatures) alive[c.kind] = (alive[c.kind] || 0) + 1;
  if (s.boss) alive.boss = 1;
  const queued = {};
  for (const k of s.waveQueue) queued[k] = (queued[k] || 0) + 1;
  panel(ctx, 1048, 108, 218, 196);
  text(ctx, s.phase === 'day' ? `TONIGHT — NIGHT ${s.night}` : `STILL OUT THERE`, 1062, 130, 12, '#b9a8e8', 'left', true);
  let ry = 152;
  for (const row of summary) {
    const n = s.phase === 'day' ? row.count : (alive[row.kind] || 0) + (queued[row.kind] || 0);
    ctx.fillStyle = row.color;
    ctx.beginPath(); ctx.arc(1070, ry - 4, 5, 0, 6.29); ctx.fill();
    text(ctx, row.name, 1082, ry, 12, '#e8e2d0');
    text(ctx, `×${n}`, 1252, ry, 12.5, n > 0 ? '#ffd76a' : '#7a7a7a', 'right', true);
    ry += 19;
  }
  // Blessing collection.
  panel(ctx, 1048, 316, 218, 150);
  text(ctx, `BLESSINGS (${s.blessings.length})`, 1062, 338, 12, '#b9a8e8', 'left', true);
  if (s.blessings.length === 0) {
    wrap(ctx, 'None yet — rescue a camper, or simply survive: a draft comes at every dawn.', 1062, 358, 190, 11.5, '#cfd6dd', 15);
  } else {
    let by = 358;
    for (const id of s.blessings.slice(0, 7)) {
      const b = BLESSINGS.find((x) => x.id === id);
      text(ctx, `✦ ${b ? b.name : id}`, 1062, by, 12, '#a5e86b');
      by += 17;
    }
    if (s.blessings.length > 7) text(ctx, `…and ${s.blessings.length - 7} more`, 1062, by, 11.5, '#cfd6dd');
  }

  drawCraftBar(ctx, s);
  drawBanner(ctx, s);
}

function drawCraftBar(ctx, s) {
  const w = 152, h = 64, gap = 8, total = w * 6 + gap * 5;
  const x0 = (VIEW_W - total) / 2, y0 = VIEW_H - h - 10;
  text(ctx, 'CRAFT — KEYS 1–6', 640, y0 - 8, 11, '#b9a8e8', 'center', true);
  CRAFTS.forEach((c, i) => {
    const x = x0 + i * (w + gap);
    const afford = Object.entries(c.cost).every(([k, v]) => s.inv[k] >= v);
    panel(ctx, x, y0, w, h, afford ? 'rgba(16,22,14,0.88)' : 'rgba(14,14,14,0.82)', afford ? 'rgba(255,215,106,0.55)' : 'rgba(120,120,120,0.3)');
    text(ctx, `${c.key}`, x + 10, y0 + 20, 13, '#ffd76a', 'left', true);
    text(ctx, c.name, x + 26, y0 + 20, 12.5, afford ? '#ffe9b8' : '#9a9a9a', 'left', true);
    const cost = Object.entries(c.cost).map(([k, v]) => `${v}${k === 'wood' ? '🪵' : k === 'scrap' ? '⛏' : '🫐'}`).join(' ');
    text(ctx, cost, x + 10, y0 + 40, 12, afford ? '#cfd6dd' : '#e08a8a');
    text(ctx, c.kind === 'place' ? 'place at feet' : c.kind === 'eat' ? 'eat now' : 'use now', x + 10, y0 + 56, 10.5, '#8fa3b8');
  });
}

function drawBanner(ctx, s) {
  if (!s.banner) return;
  const b = s.banner;
  const a = b.t < 0.3 ? b.t / 0.3 : b.t > b.life - 0.5 ? Math.max(0, (b.life - b.t) / 0.5) : 1;
  ctx.save();
  ctx.globalAlpha = a;
  const w = Math.max(420, b.text.length * 11.5);
  panel(ctx, 640 - w / 2, 128, w, 46, 'rgba(12,10,4,0.82)', 'rgba(255,180,80,0.6)');
  text(ctx, b.text, 640, 157, 17, '#ffd76a', 'center', true);
  ctx.restore();
}

function drawFloaters(ctx, s) {
  for (const f of s.floaters) {
    const a = f.t < 0.12 ? f.t / 0.12 : 1 - Math.max(0, (f.t - f.life * 0.55) / (f.life * 0.45));
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, a));
    ctx.font = `bold ${f.size}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.strokeStyle = 'rgba(0,0,0,0.75)'; ctx.lineWidth = 3.4;
    ctx.strokeText(f.text, f.x, f.y);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
    ctx.restore();
  }
}

function drawParticles(ctx, s) {
  for (const pt of s.particles) {
    const a = 1 - pt.t / pt.life;
    ctx.save();
    ctx.globalAlpha = Math.max(0, a);
    ctx.fillStyle = pt.color;
    ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size * a + 0.6, 0, 6.29); ctx.fill();
    ctx.restore();
  }
}

// --------------------------------------------------------------- screens
export const TITLE_LAYOUT = {
  diffCards: [0, 1, 2].map((i) => ({ x: 46 + i * 404, y: 540, w: 380, h: 76 })),
  startY: 636,
};

export function titleHit(x, y) {
  for (let i = 0; i < 3; i++) {
    const c = TITLE_LAYOUT.diffCards[i];
    if (x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h) return { type: 'difficulty', index: i };
  }
  return { type: 'start' };
}

function drawTitle(ctx, s) {
  drawWorldScene(ctx, s, { dark: true });
  // Title block.
  ctx.save();
  ctx.shadowColor = 'rgba(255,150,50,0.8)'; ctx.shadowBlur = 26;
  text(ctx, 'EMBERWATCH', 640, 108, 64, '#ffd76a', 'center', true);
  ctx.restore();
  wrap(ctx, TITLE, 340, 138, 600, 15.5, '#ffe9b8', 20);
  text(ctx, 'A day-build / night-survive watch in the Hollowood', 640, 168, 14, '#b9c8b0', 'center');

  // Left: how to play + the crafts.
  panel(ctx, 36, 186, 560, 334);
  text(ctx, 'HOW TO PLAY', 56, 214, 14, '#ffd76a', 'left', true);
  const how = [
    '☀ BY DAY — WASD/arrows walk, mouse aims, click or Space swings the axe.',
    'Chop pines for wood, swing scrap piles, forage berry thickets (E or axe).',
    'Craft with keys 1–6; place walls, spikes, lanterns and snares at your feet.',
    'F feeds the campfire a log. Its light radius is the safe zone — and it',
    'shrinks as the fire burns down. A dead fire is a dead camp.',
    '☾ BY NIGHT — the Hollowood hunts the light in waves. Firelight burns',
    'them; lanterns make new pools of it. Hold the treeline until dawn.',
    'Rescue the 4 lost campers (E beside them). Each dawn: draft 1 of 3',
    'blessings. Survive to the dawn of night 9 — the Warden walks then.',
  ];
  how.forEach((line, i) => text(ctx, line, 56, 240 + i * 19, 12.5, '#e8e2d0'));
  text(ctx, 'THE SIX CRAFTS', 56, 386, 13, '#ffd76a', 'left', true);
  CRAFTS.forEach((c, i) => {
    const cost = Object.entries(c.cost).map(([k, v]) => `${v} ${k}`).join(' + ');
    text(ctx, `${c.key} ${c.name} — ${cost}`, 56, 408 + i * 17, 12, '#cfd6dd');
  });

  // Right: the bestiary.
  panel(ctx, 684, 186, 560, 334);
  text(ctx, 'BESTIARY OF THE HOLLOWOOD', 704, 214, 14, '#ffd76a', 'left', true);
  let by = 240;
  for (const kind of BESTIARY_ORDER) {
    const c = CREATURES[kind];
    ctx.fillStyle = c.color;
    ctx.beginPath(); ctx.arc(716, by - 4, 6, 0, 6.29); ctx.fill();
    text(ctx, c.name, 730, by, 13, '#ffe9b8', 'left', true);
    by += 15;
    by = wrap(ctx, c.line, 730, by, 496, 11.5, '#b9c8b0', 14) + 19;
  }
  ctx.fillStyle = BOSS.color;
  ctx.beginPath(); ctx.arc(716, by - 4, 7, 0, 6.29); ctx.fill();
  text(ctx, 'The Thicket Warden — BOSS, night 9', 730, by, 13, '#ffb347', 'left', true);
  by += 15;
  wrap(ctx, BOSS.line, 730, by, 496, 11.5, '#b9c8b0', 14);

  // Difficulties.
  TITLE_LAYOUT.diffCards.forEach((card, i) => {
    const d = DIFFICULTIES[i];
    const sel = s.difficulty === i;
    panel(ctx, card.x, card.y, card.w, card.h, sel ? 'rgba(46,34,10,0.92)' : 'rgba(10,14,10,0.82)', sel ? '#ffd76a' : 'rgba(255,215,106,0.3)');
    text(ctx, `${i + 7} · ${d.name.toUpperCase()}`, card.x + card.w / 2, card.y + 28, 16, sel ? '#ffd76a' : '#e8e2d0', 'center', true);
    wrap(ctx, d.line, card.x + card.w / 2 - 170, card.y + 52, 340, 11.5, '#cfd6dd', 14);
    // centre the wrapped difficulty line
  });
  text(ctx, 'CLICK A DIFFICULTY, THEN CLICK ANYWHERE — OR PRESS ENTER — TO KEEP THE WATCH', 640, 664, 14.5, '#ffd76a', 'center', true);
  text(ctx, 'P pause · M mute · R restarts a run · everything plays offline, no network', 640, 688, 11.5, '#8fa3b8', 'center');
}

export const DRAFT_LAYOUT = { y0: 268, h: 210, w: 300, gap: 26 };

function drawDraft(ctx, s) {
  drawWorldScene(ctx, s, { dark: true });
  ctx.fillStyle = 'rgba(4,6,10,0.55)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  text(ctx, `DAWN — NIGHT ${s.night} SURVIVED`, 640, 108, 34, '#ffd76a', 'center', true);
  const chainTxt = s.chain > 0 ? `No-damage chain ×${s.chain} — kill score ×${(1 + 0.25 * s.chain).toFixed(2)}` : 'The chain broke last night — take no damage to rebuild it.';
  text(ctx, chainTxt, 640, 140, 15, '#ffe9b8', 'center');
  text(ctx, `Draft ${Math.max(1, (s.draftsTotal || 1) - s.draftsPending + 1)} — choose 1 of 3 blessings${s.draftsPending > 1 ? ` (${s.draftsPending} drafts this dawn)` : ''}`, 640, 168, 14.5, '#b9c8b0', 'center');
  text(ctx, `Score ${Math.floor(s.score).toLocaleString('en-US')} · campers home ${s.rescued}/4 · the thickets have regrown their berries`, 640, 194, 13, '#cfd6dd', 'center');

  const { y0, h, w, gap } = DRAFT_LAYOUT;
  const total = w * 3 + gap * 2;
  const x0 = (VIEW_W - total) / 2;
  s.draftOptions.forEach((b, i) => {
    const x = x0 + i * (w + gap);
    panel(ctx, x, y0, w, h, 'rgba(18,24,14,0.95)', 'rgba(255,215,106,0.6)');
    text(ctx, `✦`, x + w / 2, y0 + 52, 30, '#ffd76a', 'center', true);
    wrapTitle(ctx, b.name, x + w / 2, y0 + 92, w - 36, 19, '#ffe9b8');
    wrap(ctx, b.line, x + 22, y0 + 128, w - 44, 13, '#cfd6dd', 17);
    text(ctx, `PRESS ${i + 1} OR CLICK`, x + w / 2, y0 + h - 16, 11.5, '#8fa3b8', 'center', true);
  });

  // The collection so far — the meta-progression, visible.
  panel(ctx, 190, 512, 900, 128);
  text(ctx, `BLESSINGS CARRIED INTO NIGHT ${s.night + 1} (${s.blessings.length})`, 640, 540, 13.5, '#ffd76a', 'center', true);
  if (s.blessings.length === 0) {
    text(ctx, 'Your first blessing — every dawn adds one more to the watch.', 640, 576, 13, '#cfd6dd', 'center');
  } else {
    const names = s.blessings.map((id) => (BLESSINGS.find((b) => b.id === id) || {}).name || id);
    let ly = 570;
    let line = '';
    ctx.font = `13px ${FONT}`;
    for (const n of names) {
      const t = line ? line + '  ·  ' + n : '✦ ' + n;
      if (ctx.measureText(t).width > 840 && line) { text(ctx, line, 640, ly, 13, '#a5e86b', 'center'); ly += 20; line = '✦ ' + n; }
      else line = t;
    }
    if (line) text(ctx, line, 640, ly, 13, '#a5e86b', 'center');
    text(ctx, 'Blessings stack for the whole run — the Warden is counting on you forgetting that.', 640, 622, 11.5, '#8fa3b8', 'center');
  }
}

function wrapTitle(ctx, str, cx, y, maxW, size, color) {
  ctx.font = `bold ${size}px ${FONT}`;
  if (ctx.measureText(str).width <= maxW) { text(ctx, str, cx, y, size, color, 'center', true); return; }
  const words = str.split(' ');
  let line = '', yy = y - 10;
  for (const w of words) {
    const t = line ? line + ' ' + w : w;
    if (ctx.measureText(t).width > maxW && line) { text(ctx, line, cx, yy, size, color, 'center', true); line = w; yy += size + 4; }
    else line = t;
  }
  if (line) text(ctx, line, cx, yy, size, color, 'center', true);
}

function drawEnd(ctx, s) {
  drawWorldScene(ctx, s, { dark: !s.victory });
  ctx.fillStyle = s.victory ? 'rgba(10,12,4,0.62)' : 'rgba(8,4,4,0.72)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  const rank = s.endRank || '?';
  text(ctx, s.victory ? 'DAWN OF NIGHT 9 — THE WATCH IS KEPT' : 'THE HOLLOWOOD TAKES THE CAMP', 640, 96, 30, s.victory ? '#ffd76a' : '#e08a8a', 'center', true);
  if (!s.victory && s.loseReason) wrap(ctx, s.loseReason, 440, 126, 400, 13.5, '#e8c9c9', 18);
  // The letter rank, huge.
  ctx.save();
  ctx.shadowColor = s.victory ? 'rgba(255,180,60,0.9)' : 'rgba(200,60,60,0.7)';
  ctx.shadowBlur = 30;
  text(ctx, rank, 640, 252, 110, s.victory ? '#ffd76a' : '#e05a5a', 'center', true);
  ctx.restore();
  text(ctx, `FINAL SCORE  ${Math.floor(s.score).toLocaleString('en-US')}`, 640, 292, 22, '#ffe9b8', 'center', true);

  const st = s.stats;
  const mins = Math.floor(st.timeSurvived / 60), secs = Math.floor(st.timeSurvived % 60);
  const rows = [
    ['Nights survived', `${st.nights} / 9`],
    ['Campers rescued', `${st.rescues} / 4`],
    ['Creatures felled', `${st.kills}`],
    ['Resources gathered', `${st.gathered}`],
    ['Items crafted', `${st.crafted}`],
    ['Trees felled', `${st.treesFelled}`],
    ['Best no-damage chain', `×${st.bestChain}`],
    ['Damage taken', `${Math.round(st.damageTaken)}`],
    ['Time on watch', `${mins}:${String(secs).padStart(2, '0')}`],
    ['The Thicket Warden', st.bossDown ? 'FELLED' : 'STILL STANDING'],
  ];
  panel(ctx, 340, 316, 600, rows.length * 25 + 22);
  rows.forEach(([k, v], i) => {
    text(ctx, k, 366, 342 + i * 25, 14, '#cfd6dd');
    text(ctx, v, 914, 342 + i * 25, 14, '#ffd76a', 'right', true);
  });
  // Blessing recap.
  const names = s.blessings.map((id) => (BLESSINGS.find((b) => b.id === id) || {}).name || id);
  text(ctx, `BLESSINGS CARRIED (${names.length})`, 640, 316 + rows.length * 25 + 52, 13, '#b9a8e8', 'center', true);
  wrap(ctx, names.length ? names.join('  ·  ') : 'none — the watch was kept bare-handed', 340, 316 + rows.length * 25 + 76, 600, 13, '#a5e86b', 18);
  text(ctx, 'PRESS ENTER FOR THE TITLE — THE FOREST WILL BE THERE', 640, 700, 13.5, '#ffd76a', 'center', true);
}

// The shared scene: forest, props, fire, creatures, keeper, weather of light.
function drawWorldScene(ctx, s, opts = {}) {
  drawGround(ctx, s);
  drawTreeline(ctx, s);
  const w = s.world;
  // Sort props by y for a top-down depth feel.
  const props = [];
  for (const t of w.trees) props.push({ y: t.y, draw: () => drawTree(ctx, s, t) });
  for (const b of w.bushes) props.push({ y: b.y, draw: () => drawBush(ctx, s, b) });
  for (const sc of w.scraps) props.push({ y: sc.y, draw: () => drawScrap(ctx, s, sc) });
  for (const st of s.structures) props.push({ y: st.y, draw: () => drawStructure(ctx, s, st) });
  props.sort((a, b) => a.y - b.y);
  for (const p of props) p.draw();
  drawFire(ctx, s);
  // Spore clouds and boss roots sit on the ground above the fire's glow.
  for (const cl of s.clouds) {
    const a = cl.t < 0.4 ? cl.t / 0.4 : cl.t > cl.life - 0.6 ? (cl.life - cl.t) / 0.6 : 1;
    ctx.fillStyle = `rgba(178,196,90,${0.34 * a})`;
    ctx.beginPath(); ctx.arc(cl.x, cl.y, cl.r, 0, 6.29); ctx.fill();
    ctx.fillStyle = `rgba(220,230,150,${0.20 * a})`;
    ctx.beginPath(); ctx.arc(cl.x - 10, cl.y - 6, cl.r * 0.6, 0, 6.29); ctx.fill();
  }
  for (const r of s.roots) {
    ctx.strokeStyle = r.t < 0.4 ? 'rgba(224,90,90,0.7)' : 'rgba(90,60,30,0.85)';
    ctx.lineWidth = 4;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + r.x;
      ctx.beginPath();
      ctx.moveTo(r.x, r.y);
      ctx.quadraticCurveTo(r.x + Math.cos(a) * r.r * 0.6, r.y + Math.sin(a) * r.r * 0.6 - 6, r.x + Math.cos(a) * r.r, r.y + Math.sin(a) * r.r);
      ctx.stroke();
    }
  }
  for (const cm of w.campers) drawCamper(ctx, s, cm);
  const beings = s.boss ? [...s.creatures, s.boss] : s.creatures;
  const sorted = beings.slice().sort((a, b) => a.y - b.y);
  for (const c of sorted) drawCreature(ctx, s, c);
  if (s.player && s.mode !== 'title') drawPlayer(ctx, s);
  drawParticles(ctx, s);
  drawDarkness(ctx, s);
  drawFloaters(ctx, s);
}

export function render(ctx, s, input) {
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  if (s.mode === 'title') { drawTitle(ctx, s); return; }
  if (s.mode === 'draft') { drawDraft(ctx, s); return; }
  if (s.mode === 'end') { drawEnd(ctx, s); return; }
  drawWorldScene(ctx, s);
  drawPlayHud(ctx, s);
  if (s.paused) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    text(ctx, 'PAUSED', 640, 360, 40, '#ffd76a', 'center', true);
    text(ctx, 'P to resume — the Hollowood waits, politely', 640, 392, 14, '#cfd6dd', 'center');
  }
}
