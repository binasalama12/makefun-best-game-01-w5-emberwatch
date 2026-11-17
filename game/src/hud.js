// EMBERWATCH DOM HUD strip: the always-on numbers across the top of the
// stage — night, phase clock, campfire fuel, health, hunger, the haul and
// the score. The richer panels (wave muster, blessings, craft bar, WIN/LOSE)
// are drawn on the canvas by render.js so they land in every screenshot.

const els = {};
function el(id) {
  if (!els[id]) els[id] = document.getElementById(id);
  return els[id];
}

export function updateHud(s) {
  const night = el('h-night');
  if (night) night.textContent = s.mode === 'title' ? '–' : `${Math.min(s.night, 9)} / 9`;
  const phase = el('h-phase');
  if (phase) {
    phase.textContent =
      s.mode === 'title' ? 'EMBERWATCH' :
      s.mode === 'draft' ? 'DAWN — DRAFT' :
      s.mode === 'end' ? (s.victory ? 'DAWN OF NIGHT 9' : 'THE FIRE IS OUT') :
      `${s.phase === 'day' ? '☀ DAY' : '☾ NIGHT'} ${Math.max(0, Math.ceil(s.phaseT))}s`;
  }
  const score = el('h-score');
  if (score) score.textContent = Math.floor(s.score).toLocaleString('en-US');
  const haul = el('h-haul');
  if (haul) haul.textContent = `🪵 ${s.inv.wood}   ⛏ ${s.inv.scrap}   🫐 ${s.inv.berry}`;
  const res = el('h-rescue');
  if (res) res.textContent = `Campers ${s.rescued}/4`;
  const fuel = el('h-fuelbar');
  if (fuel) fuel.style.width = `${Math.max(0, Math.min(100, s.fire.fuel))}%`;
  const hp = el('h-hpbar');
  if (hp) hp.style.width = `${Math.max(0, (s.player.hp / s.player.maxHp) * 100)}%`;
  const food = el('h-foodbar');
  if (food) food.style.width = `${Math.max(0, s.player.hunger)}%`;
}

export function setMsg(text) {
  const m = el('msg');
  if (m) m.textContent = text || '';
}
