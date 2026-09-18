/*
============================================================
RO'LYFE GAMING™ — POOL ENGINE V3.4.5

POOL BLITZ / ARCADE PHYSICS UPGRADE

8-BALL / 9-BALL / PRACTICE
PvP / PvAI / AIvAI / CHALLENGE

V3.4.5

✓ Touch drag = AIM
✓ Touch release NEVER shoots
✓ Mouse release NEVER shoots
✓ SHOOT button / SPACE = shoot
✓ Power control
✓ Shot lock while balls move
✓ Stronger realistic break
✓ Rack dispersal
✓ Pocket Assist
✓ Combination shots
✓ Bank shots
✓ Balls remain visible until actually pocketed
✓ 8-ball group assignment
✓ 8-ball first-contact legality
✓ 8-ball early 8 = loss
✓ Custom 8-ball scratch + 8 rule
✓ 9-ball lowest-ball-first
✓ Illegal 9 respot
✓ Legal 9 wins
✓ Pre-shot 9 target preserved
✓ AI Levels 1–5 actually choose different shots
✓ AI power selection
✓ AI vs AI continuous play
✓ Existing audio.js API
✓ Voice announcer
✓ Classic / ART table presentation
✓ EM-Gaming and all theme transformations
✓ Existing public API
✓ Fullscreen

V3.4.5 FIXES

✓ Clean rack DOM when switching game types
✓ 8-Ball → 9-Ball removes stale 10–15 balls
✓ 9-Ball → 8-Ball restores 1–15 correctly
✓ Ball styling refreshes when game type changes
✓ 9-Ball 1–9 use object-ball styling
✓ Rack-specific 9-Ball state resets cleanly
✓ Game type normalized before rack creation

============================================================
*/

(() => {
"use strict";

/* ========================================================
CONFIG
======================================================== */

const CONFIG = {
  tableWidth: 1000,
  tableHeight: 500,

  ballRadius: 14,

  /*
   Physics
   */

  friction: 0.994,
  rollingResistance: 0.00065,
  stopVelocity: 0.035,

  minPower: 0.10,
  maxPower: 39,

  breakPowerMultiplier: 1.65,

  collisionRestitution: 0.94,
  railRestitution: 0.90,

  /*
   Pocket Assist
   */

  pocketRadius: 39,
  pocketCaptureRadius: 31,

  /*
   Timing
   */

  playerTime: 600,
  challengeTime: 120,

  aiDelay: 800,
  aiShotDelay: 260,

  /*
   Aim
   */

  aimStep: 2.5,
  aimLineLength: 250,

  /*
   AI
   */

  aiMaxThinkTime: 1500,

  /*
   Safety
   */

  maxVelocity: 48,

  /*
   Fixed physics
   */

  fixedStep: 1 / 120,
  maxAccumulator: 0.08,

  collisionSubsteps: 3,

  /*
   Break
   */

  breakMinVelocity: 12,

  /*
   Sound cooldowns
   */

  railSoundCooldown: 70,
  collisionSoundCooldown: 35
};

/* ========================================================
STATE
======================================================== */

const state = {
  gameType: "8ball",
  mode: "pvp",
  aiLevel: 1,

  balls: [],
  players: [],

  currentPlayer: 0,

  shooting: false,
  aiming: false,

  cueBall: null,

  aimAngle: 0,
  aimX: 0,
  aimY: 0,

  power: 0.55,

  breakShot: true,

  ballsPocketedThisTurn: [],
  foulThisTurn: false,
  firstBallHit: null,

  eightBallPocketedThisShot: false,
  nineBallPocketedThisShot: false,

  /*
   IMPORTANT:
   Captured BEFORE the shot.
   */

  nineBallTargetAtShot: null,

  gameOver: false,

  challengeMode: false,
  challengeScore: 0,

  timerSeconds: CONFIG.playerTime,
  timerInterval: null,

  animationFrame: null,
  lastFrame: performance.now(),
  accumulator: 0,

  aiThinking: false,
  aiTimer: null,
  aiToken: 0,

  paused: false,

  lockOn: false,
  lockedTarget: null,

  shotCount: 0,

  shotResolving: false,

  voiceEnabled: true,

  /*
   Human-selected target.
   */

  selectedTarget: null,

  /*
   Table presentation.
   */

  tablePresentation: "classic",

  artElement: null,

  /*
   Physics audio timing.
   */

  railSoundAt: 0,
  collisionSoundAt: 0
};

/* ========================================================
DOM
======================================================== */

const $ = id =>
  document.getElementById(id);

const app =
  $("poolApp");

const poolTable =
  $("poolTable");

const tableSurface =
  document.querySelector(".table-surface") ||
  poolTable;

const ballLayer =
  $("ballLayer");

const soundBtn =
  $("soundBtn");

const fullscreenBtn =
  $("fullscreenBtn");

const poolGame =
  $("poolGame");

const poolMode =
  $("poolMode");

const poolAILevel =
  $("poolAILevel");

const poolTheme =
  $("poolTheme");

const player1 =
  $("player1");

const player2 =
  $("player2");

const player1Status =
  $("player1Status");

const player2Status =
  $("player2Status");

const score0 =
  $("score0");

const score1 =
  $("score1");

const group0 =
  $("group0");

const group1 =
  $("group1");

const timer0 =
  $("timer0");

const timer1 =
  $("timer1");

const turnStatus =
  $("turnStatus");

const aiStatus =
  $("aiStatus");

const aimLine =
  $("aimLine");

const powerDown =
  $("powerDown");

const powerUp =
  $("powerUp");

const powerFill =
  $("powerFill");

const powerValue =
  $("powerValue");

const aimLeft =
  $("aimLeft");

const shootBtn =
  $("shootBtn");

const aimRight =
  $("aimRight");

const resetPool =
  $("resetPool");

const newRackBtn =
  $("newRackBtn");

const pauseBtn =
  $("pauseBtn");

const rulesBtn =
  $("rulesBtn");

const challengePanel =
  $("challengePanel");

const challengeScore =
  $("challengeScore");

const statGame =
  $("statGame");

const statMode =
  $("statMode");

const statAI =
  $("statAI");

const shotCount =
  $("shotCount");

const rulesModal =
  $("rulesModal");

const closeRulesBtn =
  $("closeRulesBtn");

const gameOverModal =
  $("gameOverModal");

const finalScore =
  $("finalScore");

const playAgainBtn =
  $("playAgainBtn");

/* ========================================================
MATH HELPERS
======================================================== */

function clamp(
  value,
  min,
  max
) {
  return Math.max(
    min,
    Math.min(max, value)
  );
}

function distance(
  a,
  b
) {
  return Math.hypot(
    a.x - b.x,
    a.y - b.y
  );
}

function normalize(
  x,
  y
) {
  const d =
    Math.hypot(x, y) || 1;

  return {
    x: x / d,
    y: y / d
  };
}

function angleBetween(
  a,
  b
) {
  return Math.atan2(
    b.y - a.y,
    b.x - a.x
  );
}

function speedOf(ball) {
  return Math.hypot(
    ball.vx,
    ball.vy
  );
}

function allBallsStopped() {
  return state.balls.every(
    ball =>
      ball.pocketed ||
      speedOf(ball) <=
        CONFIG.stopVelocity
  );
}

function objectBallsRemaining() {
  return state.balls.filter(
    ball =>
      ball.number !== 0 &&
      !ball.pocketed
  );
}

function formatTime(seconds) {
  seconds =
    Math.max(
      0,
      Math.floor(seconds || 0)
    );

  const minutes =
    Math.floor(seconds / 60);

  const secs =
    seconds % 60;

  return (
    String(minutes).padStart(2, "0") +
    ":" +
    String(secs).padStart(2, "0")
  );
}

/* ========================================================
AUDIO
======================================================== */

function getAudio() {
  return (
    window.ROLyfeAudio ||
    window.ROlyfeAudio ||
    null
  );
}

function audioPlay(name) {
  const audio =
    getAudio();

  if (!audio) return;

  try {
    if (
      typeof audio.init ===
      "function"
    ) {
      audio.init();
    }

    if (
      typeof audio.play ===
      "function"
    ) {
      audio.play(name);
    }
  } catch (error) {
    console.warn(
      "RO'Lyfe Pool audio:",
      error
    );
  }
}

function updateSoundButton() {
  if (!soundBtn) return;

  const audio =
    getAudio();

  let muted = false;

  try {
    muted =
      audio &&
      typeof audio.isMuted ===
        "function" &&
      audio.isMuted();
  } catch (_) {}

  soundBtn.textContent =
    muted
      ? "🔇 SOUND"
      : "🔊 SOUND";

  soundBtn.setAttribute(
    "aria-pressed",
    muted
      ? "true"
      : "false"
  );
}

function setupAudio() {
  const audio =
    getAudio();

  if (!audio) return;

  try {
    if (
      typeof audio.init ===
      "function"
    ) {
      audio.init();
    }
  } catch (_) {}

  if (!soundBtn) return;

  soundBtn.addEventListener(
    "click",
    () => {
      try {
        if (
          typeof audio.toggleMute ===
          "function"
        ) {
          audio.toggleMute();
        }

        updateSoundButton();

        const muted =
          typeof audio.isMuted ===
            "function" &&
          audio.isMuted();

        if (!muted) {
          audioPlay("click");
        }
      } catch (error) {
        console.warn(
          "Sound toggle:",
          error
        );
      }
    }
  );

  updateSoundButton();
}

/* ========================================================
VOICE
======================================================== */

function speak(text) {
  if (
    !state.voiceEnabled ||
    !("speechSynthesis" in window)
  ) {
    return;
  }

  try {
    window.speechSynthesis.cancel();

    const utterance =
      new SpeechSynthesisUtterance(
        text
      );

    /*
     More natural than the original
     machine-like default.
     */

    utterance.rate = 0.92;
    utterance.pitch = 1.0;
    utterance.volume = 0.9;

    window.speechSynthesis.speak(
      utterance
    );
  } catch (error) {
    console.warn(
      "RO'Lyfe Voice:",
      error
    );
  }
}

function announce(text) {
  speak(text);
}

function getPlayerDisplayName(
  index
) {
  const player =
    state.players[index];

  return (
    player?.name ||
    `Player ${index + 1}`
  );
}

function announceTurn() {
  const name =
    getPlayerDisplayName(
      state.currentPlayer
    );

  if (turnStatus) {
    turnStatus.textContent =
      `${name}'s turn`;
  }

  /*
   Keep voice short and natural.
   */

  announce(
    `${name}, you're up.`
  );
}

/* ========================================================
BALL CREATION
======================================================== */

function createBall(
  number,
  x,
  y
) {
  return {
    number,

    x,
    y,

    vx: 0,
    vy: 0,

    pocketed: false,

    element: null,

    lastRailHit: 0,

    /*
     Prevent duplicate pocket processing.
     */

    pocketFrame: -1
  };
}

/* ========================================================
RACK CREATION
======================================================== */

function createRack() {
  /*
   V3.4.5:
   Always clear the physical rack first.
   This guarantees that switching between
   8-ball and 9-ball cannot carry old balls
   into the new rack.
   */

  state.balls = [];

  /*
   Clear rack-specific 9-ball state.
   */

  state.nineBallTargetAtShot =
    null;

  state.nineBallPocketedThisShot =
    false;

  state.eightBallPocketedThisShot =
    false;

  state.firstBallHit =
    null;

  state.ballsPocketedThisTurn =
    [];

  state.foulThisTurn =
    false;

  /*
   Cue ball.
   */

  const cue =
    createBall(
      0,
      205,
      CONFIG.tableHeight / 2
    );

  state.cueBall =
    cue;

  state.balls.push(cue);

  const spacing =
    CONFIG.ballRadius *
    2.04;

  const rackX =
    720;

  const rackY =
    CONFIG.tableHeight / 2;

  /*
   Normalize the selected game.
   */

  const gameType =
    state.gameType === "9ball"
      ? "9ball"
      : state.gameType === "practice"
        ? "practice"
        : "8ball";

  state.gameType =
    gameType;

  if (
    gameType ===
    "9ball"
  ) {
    /*
     TRUE 9-BALL DIAMOND

     1 at apex.
     9 in center.
     Remaining balls distributed.
     */

    const positions = [
      [0, 0],

      [1, -0.5],
      [1, 0.5],

      [2, -1],
      [2, 0],
      [2, 1],

      [3, -0.5],
      [3, 0.5],

      [4, 0]
    ];

    const numbers = [
      1,
      2,
      3,
      4,
      9,
      5,
      6,
      7,
      8
    ];

    positions.forEach(
      (position, index) => {
        state.balls.push(
          createBall(
            numbers[index],
            rackX +
              position[0] *
                spacing *
                0.866,
            rackY +
              position[1] *
                spacing
          )
        );
      }
    );

  } else {
    /*
     8-BALL / PRACTICE TRIANGLE
     */

    let number = 1;

    for (
      let row = 0;
      row < 5;
      row++
    ) {
      for (
        let col = 0;
        col <= row;
        col++
      ) {
        if (number > 15) {
          break;
        }

        state.balls.push(
          createBall(
            number,
            rackX +
              row *
                spacing *
                0.866,
            rackY +
              (
                col -
                row / 2
              ) *
                spacing
          )
        );

        number++;
      }
    }
  }

  render();
}

/* ========================================================
PLAYERS
======================================================== */

function initializePlayers() {
  state.players = [
    {
      name: "Player 1",
      group: null,
      ballsMade: 0,
      score: 0
    },
    {
      name: "Player 2",
      group: null,
      ballsMade: 0,
      score: 0
    }
  ];

  if (
    state.mode === "pvai"
  ) {
    state.players[1].name =
      `AI — Level ${state.aiLevel}`;
  }

  if (
    state.mode === "aivai"
  ) {
    state.players[0].name =
      `AI Alpha — Level ${state.aiLevel}`;

    state.players[1].name =
      `AI Beta — Level ${
        Math.min(
          5,
          state.aiLevel + 1
        )
      }`;
  }

  if (
    state.mode === "challenge"
  ) {
    state.players[1].name =
      `Challenge AI — Level ${state.aiLevel}`;
  }

  updatePlayerNames();
}

function updatePlayerNames() {
  function update(
    element,
    name
  ) {
    if (!element) return;

    const nameElement =
      element.querySelector(
        ".player-name"
      );

    if (nameElement) {
      nameElement.textContent =
        name;
    }
  }

  update(
    player1,
    state.players[0]?.name ||
      "Player 1"
  );

  update(
    player2,
    state.players[1]?.name ||
      "Player 2"
  );
}

/* ========================================================
AI PLAYER
======================================================== */

function isAIPlayer(
  index = state.currentPlayer
) {
  if (
    state.mode ===
    "aivai"
  ) {
    return true;
  }

  if (
    state.mode ===
    "pvai"
  ) {
    return index === 1;
  }

  if (
    state.mode ===
    "challenge"
  ) {
    return index === 1;
  }

  return false;
}

/* ========================================================
GROUPS
======================================================== */

function ballGroup(
  number
) {
  if (
    number >= 1 &&
    number <= 7
  ) {
    return "solids";
  }

  if (
    number >= 9 &&
    number <= 15
  ) {
    return "stripes";
  }

  return null;
}

function groupBalls(
  group
) {
  return state.balls.filter(
    ball =>
      !ball.pocketed &&
      ballGroup(ball.number) ===
        group
  );
}

function groupCleared(
  player
) {
  if (!player.group) {
    return false;
  }

  return (
    groupBalls(
      player.group
    ).length === 0
  );
}

/* ========================================================
9-BALL
======================================================== */

function lowest9() {
  const balls =
    state.balls
      .filter(
        ball =>
          ball.number >= 1 &&
          ball.number <= 9 &&
          !ball.pocketed
      )
      .sort(
        (a, b) =>
          a.number -
          b.number
      );

  return balls[0] || null;
}

/* ========================================================
POCKETS
======================================================== */

function getPockets() {
  return [
    {
      x: 0,
      y: 0
    },
    {
      x:
        CONFIG.tableWidth / 2,
      y: 0
    },
    {
      x:
        CONFIG.tableWidth,
      y: 0
    },
    {
      x: 0,
      y:
        CONFIG.tableHeight
    },
    {
      x:
        CONFIG.tableWidth / 2,
      y:
        CONFIG.tableHeight
    },
    {
      x:
        CONFIG.tableWidth,
      y:
        CONFIG.tableHeight
    }
  ];
}

function pocketBall(
  ball,
  pocket
) {
  if (
    ball.pocketed
  ) {
    return;
  }

  ball.pocketed =
    true;

  ball.vx = 0;
  ball.vy = 0;

  /*
   Put it physically inside the pocket
   rather than deleting it.
   */

  ball.x =
    pocket.x;

  ball.y =
    pocket.y;

  state.ballsPocketedThisTurn.push(
    ball.number
  );

  if (
    ball.number === 8
  ) {
    state.eightBallPocketedThisShot =
      true;
  }

  if (
    ball.number === 9
  ) {
    state.nineBallPocketedThisShot =
      true;
  }

  if (
    ball.number === 0
  ) {
    state.foulThisTurn =
      true;
  }

  audioPlay(
    ball.number === 0
      ? "scratch"
      : "pocket"
  );

  if (
    state.challengeMode &&
    ball.number !== 0
  ) {
    state.challengeScore +=
      100;
  }
}

function checkPocket(
  ball
) {
  if (
    !ball ||
    ball.pocketed
  ) {
    return false;
  }

  const pockets =
    getPockets();

  for (
    const pocket of pockets
  ) {
    const d =
      Math.hypot(
        ball.x -
          pocket.x,
        ball.y -
          pocket.y
      );

    /*
     Pocket Assist:
     forgiving near the mouth,
     but still requires actual
     proximity to the pocket.
     */

    if (
      d <=
      CONFIG.pocketRadius
    ) {
      pocketBall(
        ball,
        pocket
      );

      return true;
    }
  }

  return false;
}

/* ========================================================
PHYSICS — INTEGRATION
======================================================== */

function integrateBall(
  ball,
  dt
) {
  if (
    ball.pocketed
  ) {
    return;
  }

  ball.x +=
    ball.vx *
    dt *
    60;

  ball.y +=
    ball.vy *
    dt *
    60;

  /*
   Velocity cap.
   */

  const velocity =
    speedOf(ball);

  if (
    velocity >
    CONFIG.maxVelocity
  ) {
    const ratio =
      CONFIG.maxVelocity /
      velocity;

    ball.vx *=
      ratio;

    ball.vy *=
      ratio;
  }

  /*
   Friction.
   */

  const friction =
    Math.pow(
      CONFIG.friction,
      dt * 60
    );

  ball.vx *=
    friction;

  ball.vy *=
    friction;

  /*
   Rolling resistance.
   */

  const speed =
    speedOf(ball);

  if (
    speed > 0
  ) {
    const reduction =
      CONFIG.rollingResistance *
      dt *
      60;

    const newSpeed =
      Math.max(
        0,
        speed -
          reduction
      );

    if (
      newSpeed === 0
    ) {
      ball.vx = 0;
      ball.vy = 0;
    } else {
      const ratio =
        newSpeed /
        speed;

      ball.vx *=
        ratio;

      ball.vy *=
        ratio;
    }
  }

  if (
    speedOf(ball) <=
    CONFIG.stopVelocity
  ) {
    ball.vx = 0;
    ball.vy = 0;
  }
}

/* ========================================================
PHYSICS — RAILS
======================================================== */

function resolveRails(
  ball
) {
  if (
    ball.pocketed
  ) {
    return;
  }

  const radius =
    CONFIG.ballRadius;

  let railHit =
    false;

  /*
   Keep balls inside the playing surface.
   */

  if (
    ball.x <
    radius
  ) {
    ball.x =
      radius;

    ball.vx =
      Math.abs(
        ball.vx
      ) *
      CONFIG.railRestitution;

    railHit =
      true;
  }

  if (
    ball.x >
    CONFIG.tableWidth -
      radius
  ) {
    ball.x =
      CONFIG.tableWidth -
      radius;

    ball.vx =
      -Math.abs(
        ball.vx
      ) *
      CONFIG.railRestitution;

    railHit =
      true;
  }

  if (
    ball.y <
    radius
  ) {
    ball.y =
      radius;

    ball.vy =
      Math.abs(
        ball.vy
      ) *
      CONFIG.railRestitution;

    railHit =
      true;
  }

  if (
    ball.y >
    CONFIG.tableHeight -
      radius
  ) {
    ball.y =
      CONFIG.tableHeight -
      radius;

    ball.vy =
      -Math.abs(
        ball.vy
      ) *
      CONFIG.railRestitution;

    railHit =
      true;
  }

  if (
    railHit &&
    performance.now() >
      state.railSoundAt
  ) {
    state.railSoundAt =
      performance.now() +
      CONFIG.railSoundCooldown;

    audioPlay("rail");
  }
}

/* ========================================================
PHYSICS — BALL COLLISIONS
======================================================== */

function resolveBallCollision(
  a,
  b
) {
  if (
    a.pocketed ||
    b.pocketed
  ) {
    return;
  }

  const dx =
    b.x - a.x;

  const dy =
    b.y - a.y;

  const d =
    Math.hypot(
      dx,
      dy
    );

  const minimum =
    CONFIG.ballRadius * 2;

  if (
    d <= 0 ||
    d >= minimum
  ) {
    return;
  }

  const nx =
    dx / d;

  const ny =
    dy / d;

  const overlap =
    minimum - d;

  /*
   Separate overlapping balls.
   */

  a.x -=
    nx *
    overlap *
    0.51;

  a.y -=
    ny *
    overlap *
    0.51;

  b.x +=
    nx *
    overlap *
    0.51;

  b.y +=
    ny *
    overlap *
    0.51;

  /*
   Relative velocity.
   */

  const rvx =
    b.vx - a.vx;

  const rvy =
    b.vy - a.vy;

  const velocityAlongNormal =
    rvx * nx +
    rvy * ny;

  if (
    velocityAlongNormal > 0
  ) {
    return;
  }

  /*
   Equal mass impulse.
   */

  const impulse =
    -(
      1 +
      CONFIG.collisionRestitution
    ) *
    velocityAlongNormal /
    2;

  a.vx -=
    impulse *
    nx;

  a.vy -=
    impulse *
    ny;

  b.vx +=
    impulse *
    nx;

  b.vy +=
    impulse *
    ny;

  /*
   First object ball contacted by
   cue ball is recorded.
   */

  if (
    state.firstBallHit ===
    null
  ) {
    if (
      a.number === 0 &&
      b.number !== 0
    ) {
      state.firstBallHit =
        b.number;
    } else if (
      b.number === 0 &&
      a.number !== 0
    ) {
      state.firstBallHit =
        a.number;
    }
  }

  if (
    performance.now() >
    state.collisionSoundAt
  ) {
    state.collisionSoundAt =
      performance.now() +
      CONFIG.collisionSoundCooldown;

    audioPlay("collision");
  }
}

/* ========================================================
PHYSICS STEP
======================================================== */

function physicsStep(
  dt
) {
  for (
    const ball of state.balls
  ) {
    integrateBall(
      ball,
      dt
    );
  }

  /*
   Pocket check BEFORE rails.
   */

  for (
    const ball of state.balls
  ) {
    checkPocket(ball);
  }

  for (
    const ball of state.balls
  ) {
    resolveRails(ball);
  }

  /*
   Multiple collision passes.
   */

  for (
    let pass = 0;
    pass <
      CONFIG.collisionSubsteps;
    pass++
  ) {
    for (
      let i = 0;
      i <
        state.balls.length;
      i++
    ) {
      for (
        let j = i + 1;
        j <
          state.balls.length;
        j++
      ) {
        resolveBallCollision(
          state.balls[i],
          state.balls[j]
        );
      }
    }
  }

  /*
   Final pocket check.
   */

  for (
    const ball of state.balls
  ) {
    checkPocket(ball);
  }
}

/* ========================================================
RENDER
======================================================== */

function render() {
  if (!ballLayer) {
    return;
  }

  const existing =
    new Map();

  ballLayer
    .querySelectorAll(
      ".ball"
    )
    .forEach(
      element => {
        existing.set(
          Number(
            element.dataset.ballNumber
          ),
          element
        );
      }
    );

  /*
   V3.4.5 FIX #1
   Remove DOM balls that do not exist
   in the current physical rack.

   This specifically fixes:
   8-Ball → 9-Ball
   where balls 10–15 previously
   remained in the DOM.
   */

  const validNumbers =
    new Set(
      state.balls.map(
        ball =>
          ball.number
      )
    );

  existing.forEach(
    (
      element,
      number
    ) => {
      if (
        !validNumbers.has(
          number
        )
      ) {
        element.remove();
      }
    }
  );

  for (
    const ball of state.balls
  ) {
    let element =
      existing.get(
        ball.number
      );

    if (!element) {
      element =
        document.createElement(
          "div"
        );

      element.className =
        `ball ball-${ball.number}`;

      element.dataset.ballNumber =
        String(
          ball.number
        );

      element.textContent =
        ball.number === 0
          ? ""
          : String(
              ball.number
            );

      ballLayer.appendChild(
        element
      );
    }

    /*
     V3.4.5 FIX #2
     Always refresh ball classes.

     Previously an existing DOM ball could
     retain a stripe class after switching
     game types.
     */

    element.classList.remove(
      "cue-ball",
      "stripe-ball",
      "object-ball"
    );

    if (
      ball.number === 0
    ) {
      element.classList.add(
        "cue-ball"
      );
    } else if (
      state.gameType ===
      "9ball"
    ) {
      /*
       9-BALL:
       1–9 are all object balls.
       */

      element.classList.add(
        "object-ball"
      );
    } else if (
      ball.number >= 9 &&
      ball.number <= 15
    ) {
      /*
       8-BALL:
       9–15 are stripes.
       */

      element.classList.add(
        "stripe-ball"
      );
    } else {
      element.classList.add(
        "object-ball"
      );
    }

    /*
     IMPORTANT:
     Only pocketed balls are hidden.
     */

    element.style.display =
      ball.pocketed
        ? "none"
        : "flex";

    if (
      !ball.pocketed
    ) {
      const x =
        (
          ball.x /
          CONFIG.tableWidth
        ) * 100;

      const y =
        (
          ball.y /
          CONFIG.tableHeight
        ) * 100;

      element.style.left =
        `${x}%`;

      element.style.top =
        `${y}%`;

      element.style.transform =
        "translate(-50%, -50%)";

      /*
       Selected human target.
       */

      if (
        state.selectedTarget ===
        ball
      ) {
        element.classList.add(
          "target-selected"
        );

        element.style.boxShadow =
          "0 0 0 3px rgba(255,255,255,.75), 0 0 18px rgba(0,220,255,.85)";
      } else {
        element.classList.remove(
          "target-selected"
        );

        element.style.boxShadow =
          "";
      }
    }
  }

  renderAim();
}

/* ========================================================
AIM
======================================================== */

function setAimAngle(
  angle
) {
  state.aimAngle =
    angle;

  if (
    state.cueBall
  ) {
    state.aimX =
      state.cueBall.x +
      Math.cos(angle) *
        CONFIG.aimLineLength;

    state.aimY =
      state.cueBall.y +
      Math.sin(angle) *
        CONFIG.aimLineLength;
  }

  renderAim();
}

function renderAim() {
  if (
    !aimLine ||
    !state.cueBall
  ) {
    return;
  }

  aimLine.style.display =
    state.shooting
      ? "none"
      : "block";

  aimLine.style.left =
    `${
      (
        state.cueBall.x /
        CONFIG.tableWidth
      ) * 100
    }%`;

  aimLine.style.top =
    `${
      (
        state.cueBall.y /
        CONFIG.tableHeight
      ) * 100
    }%`;

  aimLine.style.width =
    `${
      (
        CONFIG.aimLineLength /
        CONFIG.tableWidth
      ) * 100
    }%`;

  aimLine.style.transform =
    `rotate(${state.aimAngle}rad)`;

  aimLine.style.transformOrigin =
    "0 50%";
}

function updateAimFromClient(
  clientX,
  clientY
) {
  if (
    state.paused ||
    state.gameOver ||
    state.shooting ||
    !state.cueBall
  ) {
    return;
  }

  if (
    !allBallsStopped()
  ) {
    return;
  }

  const rect =
    tableSurface.getBoundingClientRect();

  const x =
    (
      clientX -
      rect.left
    ) /
      rect.width *
      CONFIG.tableWidth;

  const y =
    (
      clientY -
      rect.top
    ) /
      rect.height *
      CONFIG.tableHeight;

  const angle =
    Math.atan2(
      y -
        state.cueBall.y,
      x -
        state.cueBall.x
    );

  setAimAngle(
    angle
  );

  /*
   Try to identify target along
   current aim direction.
   */

  state.selectedTarget =
    findTargetAlongAim(
      angle
    );

  render();
}

/* ========================================================
HUMAN TARGET SELECTION
======================================================== */

function findTargetAlongAim(
  angle
) {
  if (!state.cueBall) {
    return null;
  }

  const dx =
    Math.cos(angle);

  const dy =
    Math.sin(angle);

  let best = null;

  let bestDistance =
    Infinity;

  for (
    const ball of state.balls
  ) {
    if (
      ball.pocketed ||
      ball.number === 0
    ) {
      continue;
    }

    const bx =
      ball.x -
      state.cueBall.x;

    const by =
      ball.y -
      state.cueBall.y;

    const along =
      bx * dx +
      by * dy;

    if (
      along <= 0
    ) {
      continue;
    }

    const perpendicular =
      Math.abs(
        bx * dy -
        by * dx
      );

    /*
     Target selection corridor.
     */

    if (
      perpendicular <=
        CONFIG.ballRadius *
          2.6 &&
      along <
        bestDistance
    ) {
      best =
        ball;

      bestDistance =
        along;
    }
  }

  return best;
}

/* ========================================================
AIM BUTTONS
======================================================== */

function aimBy(
  degrees
) {
  if (
    state.shooting ||
    state.paused ||
    state.gameOver ||
    !allBallsStopped()
  ) {
    return;
  }

  setAimAngle(
    state.aimAngle +
      degrees *
        Math.PI /
        180
  );

  state.selectedTarget =
    findTargetAlongAim(
      state.aimAngle
    );

  audioPlay("click");

  render();
}

/* ========================================================
TOUCH / MOUSE
======================================================== */

function setupTouchAim() {
  if (!tableSurface) {
    return;
  }

  /*
   Prevent page scrolling while
   aiming.
   */

  tableSurface.style.touchAction =
    "none";

  /*
   TOUCH START
   */

  tableSurface.addEventListener(
    "touchstart",
    event => {
      if (
        isAIPlayer() ||
        state.shooting ||
        state.paused ||
        state.gameOver ||
        !allBallsStopped()
      ) {
        return;
      }

      const touch =
        event.touches[0];

      if (!touch) {
        return;
      }

      state.aiming =
        true;

      updateAimFromClient(
        touch.clientX,
        touch.clientY
      );

      event.preventDefault();
    },
    {
      passive: false
    }
  );

  /*
   TOUCH MOVE
   */

  tableSurface.addEventListener(
    "touchmove",
    event => {
      if (
        !state.aiming
      ) {
        return;
      }

      const touch =
        event.touches[0];

      if (!touch) {
        return;
      }

      updateAimFromClient(
        touch.clientX,
        touch.clientY
      );

      event.preventDefault();
    },
    {
      passive: false
    }
  );

  /*
   TOUCH END

   NEVER SHOOT.
   */

  tableSurface.addEventListener(
    "touchend",
    event => {
      state.aiming =
        false;

      renderAim();

      event.preventDefault();
    },
    {
      passive: false
    }
  );

  tableSurface.addEventListener(
    "touchcancel",
    event => {
      state.aiming =
        false;

      renderAim();

      event.preventDefault();
    },
    {
      passive: false
    }
  );

  /*
   MOUSE
   */

  let mouseAiming =
    false;

  tableSurface.addEventListener(
    "mousedown",
    event => {
      if (
        event.button !== 0 ||
        isAIPlayer() ||
        state.shooting ||
        state.paused ||
        state.gameOver ||
        !allBallsStopped()
      ) {
        return;
      }

      mouseAiming =
        true;

      state.aiming =
        true;

      updateAimFromClient(
        event.clientX,
        event.clientY
      );

      event.preventDefault();
    }
  );

  tableSurface.addEventListener(
    "mousemove",
    event => {
      if (
        !mouseAiming
      ) {
        return;
      }

      updateAimFromClient(
        event.clientX,
        event.clientY
      );

      event.preventDefault();
    }
  );

  window.addEventListener(
    "mouseup",
    () => {
      if (
        !mouseAiming
      ) {
        return;
      }

      /*
       NEVER SHOOT ON RELEASE.
       */

      mouseAiming =
        false;

      state.aiming =
        false;

      renderAim();
    }
  );
}

/* ========================================================
POWER
======================================================== */

function setPower(
  value
) {
  state.power =
    clamp(
      value,
      0.05,
      1
    );

  updatePowerUI();
}

function changePower(
  amount
) {
  if (
    state.shooting ||
    state.paused ||
    state.gameOver ||
    !allBallsStopped()
  ) {
    return;
  }

  setPower(
    state.power +
      amount
  );

  audioPlay("click");
}

function updatePowerUI() {
  const percent =
    Math.round(
      state.power *
        100
    );

  if (powerFill) {
    powerFill.style.width =
      `${percent}%`;
  }

  if (powerValue) {
    powerValue.textContent =
      `${percent}%`;
  }
}

/* ========================================================
FIRE SHOT
======================================================== */

function fireShot(
  angle,
  power,
  isAI = false
) {
  if (
    state.shooting ||
    state.paused ||
    state.gameOver ||
    !state.cueBall
  ) {
    return false;
  }

  if (
    !allBallsStopped()
  ) {
    return false;
  }

  if (
    !isAI &&
    isAIPlayer()
  ) {
    return false;
  }

  /*
   LOCK EVERYTHING IMMEDIATELY.
   */

  state.shooting =
    true;

  state.aiming =
    false;

  state.shotResolving =
    false;

  state.selectedTarget =
    null;

  state.ballsPocketedThisTurn =
    [];

  state.foulThisTurn =
    false;

  state.firstBallHit =
    null;

  state.eightBallPocketedThisShot =
    false;

  state.nineBallPocketedThisShot =
    false;

  /*
   CRITICAL 9-BALL RULE:
   Capture lowest target BEFORE
   anything moves.
   */

  if (
    state.gameType ===
    "9ball"
  ) {
    const target =
      lowest9();

    state.nineBallTargetAtShot =
      target
        ? target.number
        : null;
  }

  /*
   POWER CALCULATION
   */

  const baseSpeed =
    CONFIG.minPower +
    power *
      (
        CONFIG.maxPower -
        CONFIG.minPower
      );

  const breakMultiplier =
    state.breakShot
      ? CONFIG.breakPowerMultiplier
      : 1;

  const finalSpeed =
    clamp(
      baseSpeed *
        breakMultiplier,
      CONFIG.minPower,
      CONFIG.maxVelocity
    );

  state.cueBall.vx =
    Math.cos(angle) *
    finalSpeed;

  state.cueBall.vy =
    Math.sin(angle) *
    finalSpeed;

  state.shotCount++;

  /*
   Break is consumed immediately.
   */

  if (
    state.breakShot
  ) {
    state.breakShot =
      false;
  }

  audioPlay("strike");

  updateUI();

  return true;
}

function shoot() {
  if (
    state.shooting ||
    state.paused ||
    state.gameOver ||
    !allBallsStopped()
  ) {
    return false;
  }

  if (
    isAIPlayer()
  ) {
    return false;
  }

  return fireShot(
    state.aimAngle,
    state.power,
    false
  );
}

/* ========================================================
AI TARGETS
======================================================== */

function getAITargets(
  playerIndex
) {
  if (
    state.gameType ===
    "9ball"
  ) {
    const target =
      lowest9();

    return target
      ? [target]
      : [];
  }

  if (
    state.gameType ===
    "practice"
  ) {
    return objectBallsRemaining();
  }

  const player =
    state.players[
      playerIndex
    ];

  if (
    player?.group
  ) {
    const own =
      groupBalls(
        player.group
      );

    if (
      own.length
    ) {
      return own;
    }

    const eight =
      state.balls.find(
        ball =>
          ball.number === 8 &&
          !ball.pocketed
      );

    return eight
      ? [eight]
      : [];
  }

  /*
   Before group assignment,
   all object balls are candidates.
   */

  return objectBallsRemaining();
}

/* ========================================================
POCKET GEOMETRY
======================================================== */

function nearestPocket(
  ball
) {
  let best = null;

  let bestDistance =
    Infinity;

  for (
    const pocket of getPockets()
  ) {
    const d =
      Math.hypot(
        ball.x -
          pocket.x,
        ball.y -
          pocket.y
      );

    if (
      d <
      bestDistance
    ) {
      bestDistance =
        d;

      best =
        pocket;
    }
  }

  return {
    pocket: best,
    distance:
      bestDistance
  };
}

/* ========================================================
AI DIRECT SHOT
======================================================== */

function directShotFor(
  cue,
  target,
  pocketOverride = null
) {
  const nearest =
    pocketOverride
      ? {
          pocket:
            pocketOverride,
          distance:
            Math.hypot(
              target.x -
                pocketOverride.x,
              target.y -
                pocketOverride.y
            )
        }
      : nearestPocket(
          target
        );

  if (
    !nearest.pocket
  ) {
    return null;
  }

  const pocket =
    nearest.pocket;

  /*
   Ghost-ball point:
   the cue ball must strike the
   object ball from this direction.
   */

  const objectToPocket =
    normalize(
      pocket.x -
        target.x,
      pocket.y -
        target.y
    );

  const ghost = {
    x:
      target.x -
      objectToPocket.x *
        CONFIG.ballRadius *
        2.05,

    y:
      target.y -
      objectToPocket.y *
        CONFIG.ballRadius *
        2.05
  };

  const angle =
    Math.atan2(
      ghost.y -
        cue.y,
      ghost.x -
        cue.x
    );

  const cueDistance =
    Math.hypot(
      ghost.x -
        cue.x,
      ghost.y -
        cue.y
    );

  const objectDistance =
    Math.hypot(
      target.x -
        pocket.x,
      target.y -
        pocket.y
    );

  return {
    type: "direct",

    target,

    pocket,

    ghost,

    angle,

    cueDistance,

    objectDistance,

    distance:
      cueDistance +
      objectDistance
  };
}

/* ========================================================
AI BANK SHOT
======================================================== */

function bankShotFor(
  cue,
  target
) {
  if (
    state.aiLevel < 4
  ) {
    return null;
  }

  const candidates = [];

  /*
   One-rail banks using each rail.
   */

  const virtualPockets = [
    {
      x:
        -CONFIG.tableWidth,
      y: 0
    },
    {
      x:
        CONFIG.tableWidth * 2,
      y: 0
    },
    {
      x: 0,
      y:
        -CONFIG.tableHeight
    },
    {
      x: 0,
      y:
        CONFIG.tableHeight * 2
    }
  ];

  /*
   Use ordinary pockets and
   reflected targets.
   */

  for (
    const pocket of getPockets()
  ) {
    /*
     Horizontal reflection.
     */

    const reflectedX = {
      x:
        2 *
          (
            pocket.x <=
            CONFIG.tableWidth / 2
              ? 0
              : CONFIG.tableWidth
          ) -
        pocket.x,

      y:
        pocket.y
    };

    const shot =
      directShotFor(
        cue,
        target,
        reflectedX
      );

    if (shot) {
      shot.type =
        "bank";

      shot.distance +=
        160;

      candidates.push(
        shot
      );
    }
  }

  for (
    const virtual of
      virtualPockets
  ) {
    const shot =
      directShotFor(
        cue,
        target,
        virtual
      );

    if (shot) {
      shot.type =
        "bank";

      shot.distance +=
        240;

      candidates.push(
        shot
      );
    }
  }

  if (
    !candidates.length
  ) {
    return null;
  }

  candidates.sort(
    (a, b) =>
      a.distance -
      b.distance
  );

  return candidates[0];
}

/* ========================================================
AI COMBINATION SHOT
======================================================== */

function comboShotFor(
  cue,
  targets
) {
  if (
    state.aiLevel < 5 ||
    targets.length < 2
  ) {
    return null;
  }

  let best = null;

  /*
   Try multiple first/second-ball
   combinations.
   */

  for (
    let i = 0;
    i < targets.length;
    i++
  ) {
    for (
      let j = 0;
      j < targets.length;
      j++
    ) {
      if (
        i === j
      ) {
        continue;
      }

      const first =
        targets[i];

      const second =
        targets[j];

      const direction =
        normalize(
          second.x -
            first.x,
          second.y -
            first.y
        );

      const ghost = {
        x:
          first.x -
          direction.x *
            CONFIG.ballRadius *
            2.05,

        y:
          first.y -
          direction.y *
            CONFIG.ballRadius *
            2.05
      };

      const angle =
        Math.atan2(
          ghost.y -
            cue.y,
          ghost.x -
            cue.x
        );

      const distance =
        Math.hypot(
          ghost.x -
            cue.x,
          ghost.y -
            cue.y
        ) +
        Math.hypot(
          second.x -
            first.x,
          second.y -
            first.y
        );

      const shot = {
        type:
          "combo",

        target:
          first,

        secondary:
          second,

        ghost,

        angle,

        distance
      };

      if (
        !best ||
        shot.distance <
          best.distance
      ) {
        best =
          shot;
      }
    }
  }

  return best;
}

/* ========================================================
AI STRATEGIC SHOT
======================================================== */

function chooseStrategicTarget(
  targets
) {
  if (
    !targets.length
  ) {
    return null;
  }

  /*
   Level 1/2:
   first available.

   Level 3+:
   evaluate pocket distance,
   cue distance and angle.
   */

  if (
    state.aiLevel <= 2
  ) {
    return targets[0];
  }

  let best =
    targets[0];

  let bestScore =
    Infinity;

  for (
    const target of
      targets
  ) {
    const pocket =
      nearestPocket(
        target
      );

    const cue =
      state.cueBall;

    const cueDistance =
      Math.hypot(
        target.x -
          cue.x,
        target.y -
          cue.y
      );

    /*
     Lower score = easier.
     */

    const score =
      cueDistance *
        0.65 +
      pocket.distance *
        0.35;

    if (
      score <
      bestScore
    ) {
      bestScore =
        score;

      best =
        target;
    }
  }

  return best;
}

/* ========================================================
AI PLAN
======================================================== */

function chooseAIPlan() {
  const cue =
    state.cueBall;

  if (!cue) {
    return null;
  }

  const targets =
    getAITargets(
      state.currentPlayer
    );

  if (
    !targets.length
  ) {
    return null;
  }

  /*
   LEVEL 1
   Simple direct.
   */

  if (
    state.aiLevel === 1
  ) {
    const target =
      targets[0];

    return directShotFor(
      cue,
      target
    );
  }

  /*
   LEVEL 2
   Direct + stronger power.
   */

  if (
   
