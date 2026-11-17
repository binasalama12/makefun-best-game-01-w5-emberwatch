// EMBERWATCH input: WASD / arrows to walk, mouse to aim, click or Space to
// swing the axe, E to gather / rescue / feed, 1–6 to craft, F to feed the
// fire a log, P pause, M mute, Enter to start / advance / restart.

export function createInput(canvas) {
  const keys = new Set();
  const input = {
    keys,
    mouse: { x: 640, y: 396, down: false, clicked: false },
    swingPressed: false,
    interactPressed: false,
    feedPressed: false,
    craftPressed: null,      // craft index 0..5 when a number key lands
    pausePressed: false,
    restartPressed: false,
    mutePressed: false,
    confirmPressed: false,
    difficultyPressed: null,  // 0..2 when 7/8/9 or Z/X/C lands on title
  };

  function toGame(e) {
    const r = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) * (canvas.width / r.width),
      y: (e.clientY - r.top) * (canvas.height / r.height),
    };
  }

  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
    if (e.repeat) return;
    keys.add(k);
    if (k === ' ') input.swingPressed = true;
    if (k === 'e') input.interactPressed = true;
    if (k === 'f') input.feedPressed = true;
    if (k === 'p') input.pausePressed = true;
    if (k === 'r') input.restartPressed = true;
    if (k === 'm') input.mutePressed = true;
    if (k === 'enter') input.confirmPressed = true;
    if (k >= '1' && k <= '6') input.craftPressed = parseInt(k, 10) - 1;
    if (k === '7') input.difficultyPressed = 0;
    if (k === '8') input.difficultyPressed = 1;
    if (k === '9') input.difficultyPressed = 2;
  });
  window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));

  canvas.addEventListener('mousemove', (e) => {
    const p = toGame(e);
    input.mouse.x = p.x; input.mouse.y = p.y;
  });
  canvas.addEventListener('mousedown', (e) => {
    const p = toGame(e);
    input.mouse.x = p.x; input.mouse.y = p.y;
    input.mouse.down = true; input.mouse.clicked = true;
    input.swingPressed = true; input.confirmPressed = true;
  });
  window.addEventListener('mouseup', () => { input.mouse.down = false; });
  canvas.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    const p = toGame(t);
    input.mouse.x = p.x; input.mouse.y = p.y;
    input.swingPressed = true; input.confirmPressed = true;
  }, { passive: true });

  // Movement vector from held keys, normalised.
  input.moveVec = () => {
    let x = 0, y = 0;
    if (keys.has('a') || keys.has('arrowleft')) x -= 1;
    if (keys.has('d') || keys.has('arrowright')) x += 1;
    if (keys.has('w') || keys.has('arrowup')) y -= 1;
    if (keys.has('s') || keys.has('arrowdown')) y += 1;
    const len = Math.hypot(x, y) || 1;
    return { x: x / len, y: y / len, active: x !== 0 || y !== 0 };
  };

  // Consume one-shot presses at the end of each frame.
  input.endFrame = () => {
    input.swingPressed = false;
    input.interactPressed = false;
    input.feedPressed = false;
    input.craftPressed = null;
    input.pausePressed = false;
    input.restartPressed = false;
    input.mutePressed = false;
    input.confirmPressed = false;
    input.difficultyPressed = null;
    input.mouse.clicked = false;
  };

  return input;
}
