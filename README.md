# RO’Lyfe Gaming™

Live arcade hub: https://rolrichman.github.io/rolyfe-egaming/

## Playable rooms

- **RO’Lyfe Pool** — `games/pool/`; 8-Ball, 9-Ball, Practice, PvP / PvAI / AIvAI / Challenge modes, table themes, and pool-specific rules.
- **RO’Lyfe Orbital Blitz** — `games/orbital-blitz/`; canvas arcade combat with bouncing energy orbs, escalating waves, touch / keyboard steering, held FIRE, optional FIRE LOCK auto-fire, collectible shields, and selectable charged Pulse / Laser / Plasma weapons.
- **RO’Lyfe Ping Pong** — `games/ping-pong/`; local Atlas paddle opponent, three AI levels, two-player keyboard mode, left/right player-side selection, and player-color coding.
- **RO’Lyfe Block Breaker** — `games/block-breaker/`; brick-grid ricochets, speed control, collectible shield / multi-ball / laser drops, selectable special weapons, boss levels with red screen flash, local save points, and RO’Lyfe trophies.
- **RO’Lyfe Pinball** — `games/pinball/`; touch / keyboard flippers, bumper scoring, bonus shield and multi-ball rewards, and local best score.
- **RO’Lyfe Golf Quest** — `games/golf-quest/`; side-view physics courses with bridges, varied platforms, sticky landing pads, power and speed settings, flag and hole targets.
- **RO’Lyfe Stick Fighter** — `games/stick-fighter/`; stick-figure sparring prototype with movement, jump, punch, kick, guard, Atlas opponent difficulty, and touch controls.

## Shared arcade interface

- Floating quick controls for **Top**, **Game focus**, **AI guide**, and **Trophy Case** are injected by `shared/arcade-controls.js`.
- The shared browser-local arcade profile exposes trophy awards and per-game save-point helpers. Local data is stored in the current browser profile and does not sync across devices.
- The AI guide surfaces each room's local hint text. It does not claim a live cross-game conversational Atlas integration.
- The Gaming hub links to playable rooms and keeps GitHub repository / internal resource-directory shortcuts out of visitor-facing buttons. The trading app link points to its live GitHub Pages destination.

## Project boundaries

RO’Lyfe Gaming is the discovery and launch page for independent game rooms. Each playable room keeps its own source under `games/`. These are original browser-based prototypes and do not require an account or remote game API. A room should be called fully verified only after testing its controls and gameplay in a real browser on phone, tablet, and desktop.
