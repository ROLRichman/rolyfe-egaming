# RO’Lyfe Gaming™

## Playable arcade rooms

- **RO’Lyfe Pool** — `games/pool/`, the playable 8-Ball / 9-Ball / Practice room with PvP, PvAI, AIvAI and Challenge modes.
- **RO’Lyfe Orbital Blitz** — `games/orbital-blitz/`, original canvas arcade gameplay with bouncing energy orbs, player shots, waves, shields, keyboard and touch controls.
- **RO’Lyfe Ping Pong** — `games/ping-pong/`, paddle-and-ball arcade play with a local Atlas paddle opponent, three difficulty settings, and two-player keyboard mode.
- These are self-contained browser games. They do not require a user account or call a remote game API.
- Orbital Blitz’s Atlas game guide currently provides built-in tactical hints; the cross-game conversational Atlas assistant remains a separate integration task.
- Other library cards such as Chess, Checkers, Connect Four, Tic-Tac-Toe, Monopoly, and Dominoes remain in development until their playable rooms are built and verified.

## Project boundaries

RO’Lyfe Gaming is the discovery and launch page for independent game rooms. Each playable room keeps its own source in this repository under `games/`. Game scores and settings may be saved locally by the individual game and are not automatically synchronized between devices.
