[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/binasalama12/makefun-best-game-01-w5-emberwatch/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/binasalama12/makefun-best-game-01-w5-emberwatch/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

# EMBERWATCH

**EMBERWATCH — build by day, hold by night: 9 nights, 7 creatures, 6 crafts, 4 rescues, boss The Thicket Warden**

A day-build / night-survive game on a 2D canvas — no libraries, no build step, no
network. Open `game/index.html` from any static server and play.

## The game

You are the fire-keeper of a camp in the Hollowood. **By day** you chop pines,
forage berry thickets and haul scrap from camps that did not make it, then craft
defences and feed the campfire. The fire's light radius is the safe zone — and it
**shrinks as the fire burns down**. **By night** the Hollowood hunts the light in
waves: firelight burns them, lantern posts make new pools of it, walls and spikes
and snares hold the treeline. Four lost campers — Wren, Tomas, Pell and Sable —
are hidden in the trees; bring each one home and the dawn grants a **blessing
draft, 1 of 3**, from ten named blessings that stack for the whole run. Survive
to the **dawn of night 9**, when **The Thicket Warden** — the forest itself,
walking — comes for the flame. Lose if the fire dies or you fall.

- **9 nights**, each with a bigger muster shown on the incoming-wave panel before dusk.
- **7 creature kinds** with distinct behaviours, plus the boss: **Twigling** (shambles for the fire), **Barkhound** (circles, then lunges), **Sporecap** (puffs choking spore clouds from range), **Splinter Wraith** (splits into two Sapling Shades), **Nightjar** (flies over walls and dives), **Emberthief** (steals burning logs and drags your fire down), **Gloam Stag** (telegraphed straight-line charges).
- **6 crafts**: Timber Wall, Spike Strip, Lantern Post, Hunter's Stew, Snare Trap, Ember Bandage.
- **4 rescues**, each worth score now and a blessing draft at dawn.
- **10 blessings** drafted 1-of-3 at every dawn: Kindled Heart, Ironbark Skin, Swift Boots, Keen Axe, Forager's Eye, Ember Ward, Night's Bounty, Second Wind, Trapmaster, Camper's Bond.
- **Night 9: The Thicket Warden** — it roots the ground around you, calls Twiglings out of the wood, and below half health charges like the Stag. Night 9 has no scheduled dawn while it stands.
- **3 difficulties** — Story, Standard, Nightmare — scaling the Hollowood's teeth, the day's length and the fire's hunger.
- Score chains: night kills pay more on later nights, and every night survived **without taking damage** grows a chain multiplier (×1.25 per link) paid out at dawn. A full winning run scores in the **tens of thousands**.

## Controls

- **WASD / arrows:** walk. **Mouse:** aim. **Click / Space:** swing the axe.
- **E:** rescue a camper, forage a thicket, feed the fire. **F:** feed the fire a log.
- **1–6:** craft. **1–3:** pick a blessing at the dawn draft (or click the card).
- **7 / 8 / 9 or click:** choose Story / Standard / Nightmare on the title.
- **Enter / click:** start, advance, restart. **R:** restart the run. **P:** pause. **M:** mute.

## Screens

`screenshots/` holds four real renders of the game itself, in judging order: the
night-9 climax — the Warden at the treeline, fire low, full HUD; the dawn
blessing draft, the run's meta screen; the dense title with how-to, the full
bestiary and the three difficulties; and the dawn-of-night-9 end screen with the
S rank, ten run statistics and the blessing recap.

## Layout

- `game/index.html` — the page and the DOM HUD strip (night, clock, fire / health / hunger bars, haul, score).
- `game/src/config.js` — the Hollowood: creatures, crafts, blessings, night musters, difficulties, scoring, fire and keeper tuning.
- `game/src/world.js` — the seeded forest: pines, thickets, scrap, the four campers, ground dressing, wave musters, spawn points.
- `game/src/main.js` — the game loop and state: day/night phases, creature AI, combat, crafting, rescues, the dawn draft, win / lose.
- `game/src/render.js` — all canvas art and screens: procedural forest, firelight and darkness, creatures, the boss, HUD panels, title / draft / end.
- `game/src/hud.js`, `game/src/input.js`, `game/src/audio.js` — HUD strip, controls, WebAudio synth blips.
- `game/src/shots.js` — deterministic `?shot=` scenes used to render the screenshots.
- `main.ts` — the hand-in program: copies `game/` and `screenshots/` out and writes the dossier.
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged.

## Hand in

```
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
node serve.ts        # or any static server over game/, to play it
```

MIT licensed — see `LICENSE`.
