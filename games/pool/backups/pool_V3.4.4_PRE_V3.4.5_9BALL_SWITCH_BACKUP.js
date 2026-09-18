/*
============================================================
RO'LYFE GAMING™ — POOL ENGINE V3.4.4
============================================================
POOL BLITZ / ARCADE PHYSICS UPGRADE

8-BALL / 9-BALL / PRACTICE
PvP / PvAI / AIvAI / CHALLENGE

V3.4.4
------------------------------------------------------------
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
    state.balls = [];

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

    if (
      state.gameType ===
      "9ball"
    ) {
      /*
       TRUE 9-BALL DIAMOND
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

      /*
       1 at apex.
       9 in center.
       Remaining balls distributed.
       */

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
       8-BALL TRIANGLE
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
      impulse * nx;

    a.vy -=
      impulse * ny;

    b.vx +=
      impulse * nx;

    b.vy +=
      impulse * ny;

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

        if (
          ball.number === 0
        ) {
          element.classList.add(
            "cue-ball"
          );
        } else if (
          ball.number >= 9 &&
          ball.number <= 15
        ) {
          element.classList.add(
            "stripe-ball"
          );
        } else {
          element.classList.add(
            "object-ball"
          );
        }

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
          ) *
          100;

        const y =
          (
            ball.y /
            CONFIG.tableHeight
          ) *
          100;

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
      state.aiLevel === 2
    ) {
      const target =
        chooseStrategicTarget(
          targets
        );

      return directShotFor(
        cue,
        target
      );
    }

    /*
     LEVEL 3
     Safer/easier target.
     */

    if (
      state.aiLevel === 3
    ) {
      const target =
        chooseStrategicTarget(
          targets
        );

      return directShotFor(
        cue,
        target
      );
    }

    /*
     LEVEL 4
     Direct + bank.
     */

    if (
      state.aiLevel === 4
    ) {
      const target =
        chooseStrategicTarget(
          targets
        );

      const direct =
        directShotFor(
          cue,
          target
        );

      const bank =
        bankShotFor(
          cue,
          target
        );

      /*
       Attempt a bank when:
       - direct shot is poor
       - or randomly to give AI
         variety.
       */

      if (
        bank &&
        (
          !direct ||
          direct.distance >
            500 ||
          Math.random() <
            0.32
        )
      ) {
        return bank;
      }

      return direct;
    }

    /*
     LEVEL 5
     Combination + bank + strategy.
     */

    if (
      state.aiLevel >= 5
    ) {
      const combo =
        comboShotFor(
          cue,
          targets
        );

      if (
        combo &&
        Math.random() <
          0.45
      ) {
        return combo;
      }

      const target =
        chooseStrategicTarget(
          targets
        );

      const bank =
        bankShotFor(
          cue,
          target
        );

      if (
        bank &&
        Math.random() <
          0.42
      ) {
        return bank;
      }

      return directShotFor(
        cue,
        target
      );
    }

    return directShotFor(
      cue,
      targets[0]
    );
  }

  /* ========================================================
     AI POWER
     ======================================================== */

  function aiPowerFor(
    plan
  ) {
    let power;

    switch (
      state.aiLevel
    ) {
      case 1:
        power =
          0.48;
        break;

      case 2:
        power =
          0.62;
        break;

      case 3:
        power =
          0.54;
        break;

      case 4:
        power =
          plan?.type ===
          "bank"
            ? 0.78
            : 0.61;
        break;

      case 5:
        power =
          plan?.type ===
          "combo"
            ? 0.76
            : plan?.type ===
              "bank"
              ? 0.82
              : 0.65;
        break;

      default:
        power =
          0.55;
    }

    /*
     Break receives significantly
     more force.
     */

    if (
      state.breakShot
    ) {
      power =
        0.92;
    }

    /*
     Distance adjustment.
     */

    if (
      plan?.distance >
      650
    ) {
      power +=
        0.08;
    }

    if (
      plan?.distance <
      300
    ) {
      power -=
        0.06;
    }

    power =
      clamp(
        power,
        0.20,
        1
      );

    /*
     AI accuracy improves by level.
     */

    const errors = {
      1: 0.10,
      2: 0.075,
      3: 0.052,
      4: 0.035,
      5: 0.018
    };

    const error =
      errors[
        state.aiLevel
      ] ||
      0.05;

    const angle =
      plan.angle +
      (
        Math.random() -
        0.5
      ) *
        error;

    return {
      power,
      angle
    };
  }

  /* ========================================================
     AI ENGINE
     ======================================================== */

  function cancelAI() {
    state.aiToken++;

    if (
      state.aiTimer
    ) {
      clearTimeout(
        state.aiTimer
      );

      state.aiTimer =
        null;
    }

    state.aiThinking =
      false;
  }

  function scheduleAI(
    delay = CONFIG.aiDelay
  ) {
    cancelAI();

    if (
      state.gameOver ||
      state.paused ||
      !isAIPlayer()
    ) {
      return;
    }

    const token =
      state.aiToken;

    state.aiThinking =
      true;

    updateUI();

    state.aiTimer =
      setTimeout(
        () => {
          if (
            token !==
            state.aiToken
          ) {
            return;
          }

          state.aiTimer =
            null;

          runAI(token);
        },
        delay
      );
  }

  function runAI(
    token
  ) {
    if (
      token !==
      state.aiToken
    ) {
      return;
    }

    if (
      state.gameOver ||
      state.paused ||
      !isAIPlayer() ||
      state.shooting
    ) {
      state.aiThinking =
        false;

      updateUI();

      return;
    }

    const plan =
      chooseAIPlan();

    if (!plan) {
      state.aiThinking =
        false;

      updateUI();

      return;
    }

    const shot =
      aiPowerFor(plan);

    state.aiThinking =
      false;

    state.aimAngle =
      shot.angle;

    state.power =
      shot.power;

    state.lockedTarget =
      plan.target;

    state.lockOn =
      true;

    /*
     Show AI's thinking state briefly.
     */

    updateUI();

    setTimeout(
      () => {
        if (
          state.gameOver ||
          state.paused ||
          !isAIPlayer() ||
          state.shooting
        ) {
          return;
        }

        fireShot(
          shot.angle,
          shot.power,
          true
        );
      },
      CONFIG.aiShotDelay
    );
  }

  /* ========================================================
     8-BALL GROUP ASSIGNMENT
     ======================================================== */

  function assignGroupIfNeeded() {
    if (
      state.gameType !==
      "8ball"
    ) {
      return;
    }

    const player =
      state.players[
        state.currentPlayer
      ];

    if (
      !player ||
      player.group ||
      state.breakShot
    ) {
      return;
    }

    const pocketed =
      state.ballsPocketedThisTurn.filter(
        number =>
          number >= 1 &&
          number <= 15 &&
          number !== 8
      );

    if (
      !pocketed.length
    ) {
      return;
    }

    /*
     First pocketed legal object ball
     determines group.
     */

    const group =
      ballGroup(
        pocketed[0]
      );

    if (!group) {
      return;
    }

    player.group =
      group;

    const opponent =
      state.players[
        1 -
          state.currentPlayer
      ];

    if (opponent) {
      opponent.group =
        group ===
        "solids"
          ? "stripes"
          : "solids";
    }

    announce(
      `${player.name}, you're ${group}.`
    );
  }

  /* ========================================================
     8-BALL LEGALITY
     ======================================================== */

  function legalFirstContact8(
    shooter
  ) {
    if (
      state.firstBallHit ===
      null
    ) {
      /*
       No object ball contact:
       foul.
       */

      return false;
    }

    const player =
      state.players[
        shooter
      ];

    if (
      !player.group
    ) {
      return true;
    }

    /*
     If group is assigned,
     first contact must be own group
     unless shooting the 8 legally.
     */

    if (
      state.firstBallHit ===
      8
    ) {
      return groupCleared(
        player
      );
    }

    return (
      ballGroup(
        state.firstBallHit
      ) ===
      player.group
    );
  }

  /* ========================================================
     9-BALL RESPOT
     ======================================================== */

  function respotNine() {
    const nine =
      state.balls.find(
        ball =>
          ball.number === 9
      );

    if (!nine) {
      return;
    }

    nine.pocketed =
      false;

    nine.vx = 0;
    nine.vy = 0;

    /*
     Standard-ish foot-spot area.
     */

    nine.x =
      720;

    nine.y =
      CONFIG.tableHeight / 2;

    /*
     Find a clear position.
     */

    for (
      let attempt = 0;
      attempt < 30;
      attempt++
    ) {
      const occupied =
        state.balls.some(
          ball =>
            ball !== nine &&
            !ball.pocketed &&
            distance(
              ball,
              nine
            ) <
              CONFIG.ballRadius *
                2.1
        );

      if (!occupied) {
        break;
      }

      nine.y +=
        CONFIG.ballRadius *
        2.2;

      if (
        nine.y >
        CONFIG.tableHeight -
          CONFIG.ballRadius *
            2
      ) {
        nine.y =
          CONFIG.tableHeight /
          2;

        nine.x +=
          CONFIG.ballRadius *
          2.2;
      }
    }

    audioPlay(
      "notify"
    );
  }

  /* ========================================================
     SCRATCH
     ======================================================== */

  function respotCue() {
    if (
      !state.cueBall
    ) {
      return;
    }

    state.cueBall.pocketed =
      false;

    state.cueBall.vx = 0;
    state.cueBall.vy = 0;

    state.cueBall.x =
      205;

    state.cueBall.y =
      CONFIG.tableHeight /
      2;

    /*
     Make sure cue ball doesn't overlap
     another ball after respot.
     */

    for (
      let attempt = 0;
      attempt < 20;
      attempt++
    ) {
      const occupied =
        state.balls.some(
          ball =>
            ball !==
              state.cueBall &&
            !ball.pocketed &&
            distance(
              ball,
              state.cueBall
            ) <
              CONFIG.ballRadius *
                2.1
        );

      if (!occupied) {
        break;
      }

      state.cueBall.y +=
        CONFIG.ballRadius *
        2.2;

      if (
        state.cueBall.y >
        CONFIG.tableHeight -
          CONFIG.ballRadius
      ) {
        state.cueBall.y =
          CONFIG.tableHeight /
          2;

        state.cueBall.x +=
          CONFIG.ballRadius *
          2.2;
      }
    }
  }

  /* ========================================================
     WIN / LOSE
     ======================================================== */

  function winGame(
    winner
  ) {
    if (
      state.gameOver
    ) {
      return;
    }

    state.gameOver =
      true;

    state.shooting =
      false;

    cancelAI();
    stopTimer();

    const name =
      getPlayerDisplayName(
        winner
      );

    if (finalScore) {
      finalScore.textContent =
        `${name} wins! 🏆`;
    }

    if (gameOverModal) {
      gameOverModal.style.display =
        "flex";
    }

    audioPlay("win");

    announce(
      `${name} wins the game.`
    );

    updateUI();
  }

  function loseGame(
    loser
  ) {
    winGame(
      1 - loser
    );
  }

  /* ========================================================
     FINISH SHOT
     ======================================================== */

  function finishShot() {
    if (
      state.shotResolving
    ) {
      return;
    }

    state.shotResolving =
      true;

    const shooter =
      state.currentPlayer;

    const player =
      state.players[
        shooter
      ];

    const pocketed =
      state.ballsPocketedThisTurn.filter(
        number =>
          number !== 0
      );

    const scratch =
      state.foulThisTurn;

    const eightPocketed =
      state.eightBallPocketedThisShot;

    const ninePocketed =
      state.nineBallPocketedThisShot;

    /* ======================================================
       8-BALL
       ====================================================== */

    if (
      state.gameType ===
      "8ball"
    ) {
      /*
       CUSTOM RO'LYFE RULE:
       8 + scratch = automatic win.

       This applies ONLY to 8-ball.
       */

      if (
        eightPocketed &&
        scratch
      ) {
        winGame(
          shooter
        );

        return;
      }

      if (
        eightPocketed
      ) {
        const legalFirst =
          legalFirstContact8(
            shooter
          );

        const cleared =
          groupCleared(
            player
          );

        /*
         8 can only win when:
         - group assigned
         - group cleared
         - correct first contact
         */

        if (
          !player.group ||
          !cleared ||
          !legalFirst
        ) {
          loseGame(
            shooter
          );

          return;
        }

        winGame(
          shooter
        );

        return;
      }

      /*
       Scratch without 8.
       */

      if (
        scratch
      ) {
        audioPlay(
          "foul"
        );

        announce(
          "Foul. Cue ball scratch."
        );

        respotCue();

        state.shotResolving =
          false;

        switchPlayer();

        return;
      }

      /*
       First contact legality.
       */

      if (
        !legalFirstContact8(
          shooter
        )
      ) {
        audioPlay(
          "foul"
        );

        announce(
          "Foul. Wrong ball first."
        );

        state.shotResolving =
          false;

        switchPlayer();

        return;
      }

      /*
       Assign groups after legal shot.
       */

      assignGroupIfNeeded();

      /*
       Score.
       */

      player.score +=
        pocketed.length *
        10;

      player.ballsMade +=
        pocketed.filter(
          number =>
            ballGroup(
              number
            ) ===
            player.group
        ).length;

      /*
       Any legal pocket keeps turn.
       */

      if (
        pocketed.length >
        0
      ) {
        state.shotResolving =
          false;

        queueNextShot();

        return;
      }

      /*
       No pocket = switch.
       */

      state.shotResolving =
        false;

      switchPlayer();

      return;
    }

    /* ======================================================
       9-BALL
       ====================================================== */

    if (
      state.gameType ===
      "9ball"
    ) {
      const legalFirst =
        state.firstBallHit ===
        state.nineBallTargetAtShot;

      /*
       Legal 9 = WIN.
       */

      if (
        ninePocketed &&
        legalFirst &&
        !scratch
      ) {
        winGame(
          shooter
        );

        return;
      }

      /*
       Illegal 9 = RES POT.
       */

      if (
        ninePocketed &&
        !legalFirst
      ) {
        respotNine();

        announce(
          "Illegal nine. Nine ball respotted."
        );
      }

      /*
       Scratch = foul.
       */

      if (
        scratch
      ) {
        respotCue();

        audioPlay(
          "foul"
        );

        announce(
          "Foul. Cue ball scratch."
        );

        state.shotResolving =
          false;

        switchPlayer();

        return;
      }

      /*
       Wrong first ball = foul.
       */

      if (
        state.firstBallHit !==
          null &&
        !legalFirst
      ) {
        audioPlay(
          "foul"
        );

        announce(
          "Foul. Wrong ball first."
        );

        state.shotResolving =
          false;

        switchPlayer();

        return;
      }

      /*
       Any legal pocket except 9
       lets shooter continue.
       */

      if (
        pocketed.length >
          0 &&
        !ninePocketed
      ) {
        state.shotResolving =
          false;

        queueNextShot();

        return;
      }

      /*
       No legal pocket = switch.
       */

      state.shotResolving =
        false;

      switchPlayer();

      return;
    }

    /* ======================================================
       PRACTICE
       ====================================================== */

    if (
      state.gameType ===
      "practice"
    ) {
      if (
        scratch
      ) {
        respotCue();
      }

      const remaining =
        state.balls.filter(
          ball =>
            ball.number !== 0 &&
            !ball.pocketed
        );

      if (
        remaining.length === 0
      ) {
        announce(
          "Practice rack cleared."
        );

        createRack();

        state.shotResolving =
          false;

        return;
      }

      state.shotResolving =
        false;

      if (
        pocketed.length >
        0
      ) {
        queueNextShot();
      } else {
        switchPlayer();
      }

      return;
    }

    state.shotResolving =
      false;

    switchPlayer();
  }

  /* ========================================================
     CONTINUE CURRENT PLAYER
     ======================================================== */

  function queueNextShot() {
    state.shotResolving =
      false;

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

    state.nineBallTargetAtShot =
      null;

    state.lockedTarget =
      null;

    state.lockOn =
      false;

    startTimer();

    updateUI();

    if (
      isAIPlayer()
    ) {
      scheduleAI(
        CONFIG.aiDelay
      );
    } else {
      announceTurn();
    }
  }

  /* ========================================================
     SWITCH PLAYER
     ======================================================== */

  function switchPlayer() {
    cancelAI();

    state.currentPlayer =
      1 -
      state.currentPlayer;

    state.shotResolving =
      false;

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

    state.nineBallTargetAtShot =
      null;

    state.lockedTarget =
      null;

    state.lockOn =
      false;

    startTimer();

    audioPlay(
      "turn"
    );

    announceTurn();

    updateUI();

    if (
      isAIPlayer()
    ) {
      scheduleAI(
        CONFIG.aiDelay
      );
    }
  }

  /* ========================================================
     TIMER
     ======================================================== */

  function stopTimer() {
    if (
      state.timerInterval
    ) {
      clearInterval(
        state.timerInterval
      );

      state.timerInterval =
        null;
    }
  }

  function startTimer() {
    stopTimer();

    state.timerSeconds =
      state.challengeMode
        ? CONFIG.challengeTime
        : CONFIG.playerTime;

    state.timerInterval =
      setInterval(
        () => {
          if (
            state.paused ||
            state.gameOver ||
            state.shooting
          ) {
            return;
          }

          state.timerSeconds--;

          updateTimers();

          if (
            state.timerSeconds <=
            0
          ) {
            stopTimer();

            if (
              state.challengeMode
            ) {
              loseGame(
                state.currentPlayer
              );
            } else {
              switchPlayer();
            }
          }
        },
        1000
      );

    updateTimers();
  }

  function updateTimers() {
    const time =
      formatTime(
        state.timerSeconds
      );

    if (
      state.currentPlayer ===
      0
    ) {
      if (timer0) {
        timer0.textContent =
          time;
      }
    } else {
      if (timer1) {
        timer1.textContent =
          time;
      }
    }
  }

  /* ========================================================
     PAUSE
     ======================================================== */

  function togglePause() {
    if (
      state.gameOver
    ) {
      return;
    }

    state.paused =
      !state.paused;

    if (
      state.paused
    ) {
      cancelAI();

      if (pauseBtn) {
        pauseBtn.textContent =
          "▶ RESUME";
      }

      if (app) {
        app.classList.add(
          "game-paused"
        );
      }

      announce(
        "Game paused."
      );
    } else {
      if (pauseBtn) {
        pauseBtn.textContent =
          "⏸ PAUSE";
      }

      if (app) {
        app.classList.remove(
          "game-paused"
        );
      }

      announce(
        "Game resumed."
      );

      if (
        isAIPlayer()
      ) {
        scheduleAI(
          CONFIG.aiDelay
        );
      }
    }

    updateUI();
  }

  /* ========================================================
     LOCK ON
     ======================================================== */

  function lockOn() {
    if (
      state.shooting ||
      state.paused ||
      state.gameOver ||
      !allBallsStopped()
    ) {
      return;
    }

    const targets =
      getAITargets(
        state.currentPlayer
      );

    if (
      !targets.length
    ) {
      state.lockOn =
        false;

      state.lockedTarget =
        null;

      return;
    }

    if (
      !state.lockedTarget ||
      state.lockedTarget.pocketed
    ) {
      state.lockedTarget =
        targets[0];
    }

    state.lockOn =
      !state.lockOn;

    if (
      state.lockOn
    ) {
      setAimAngle(
        angleBetween(
          state.cueBall,
          state.lockedTarget
        )
      );

      state.selectedTarget =
        state.lockedTarget;

      audioPlay(
        "select"
      );

      render();
    }
  }

  /* ========================================================
     TABLE ART TRANSFORMS
     ======================================================== */

  function removeTableArt() {
    if (
      state.artElement &&
      state.artElement.parentNode
    ) {
      state.artElement.parentNode.removeChild(
        state.artElement
      );
    }

    state.artElement =
      null;

    if (
      tableSurface
    ) {
      tableSurface.style.backgroundImage =
        "";
    }
  }

  function createArtElement(
    text,
    opacity = 0.10
  ) {
    if (
      !tableSurface
    ) {
      return null;
    }

    const element =
      document.createElement(
        "div"
      );

    element.className =
      "pool-theme-art";

    element.textContent =
      text;

    element.style.position =
      "absolute";

    element.style.left =
      "50%";

    element.style.top =
      "50%";

    element.style.transform =
      "translate(-50%, -50%) rotate(-8deg)";

    element.style.pointerEvents =
      "none";

    element.style.userSelect =
      "none";

    element.style.fontWeight =
      "900";

    element.style.fontSize =
      "clamp(26px, 5vw, 68px)";

    element.style.letterSpacing =
      "0.12em";

    element.style.opacity =
      String(opacity);

    element.style.color =
      "#ffffff";

    element.style.textShadow =
      "0 0 14px rgba(255,255,255,.45)";

    element.style.zIndex =
      "1";

    tableSurface.appendChild(
      element
    );

    state.artElement =
      element;

    return element;
  }

  function applyTablePresentation(
    mode
  ) {
    removeTableArt();

    if (
      !tableSurface
    ) {
      return;
    }

    state.tablePresentation =
      mode ||
      "classic";

    if (
      state.tablePresentation ===
      "classic"
    ) {
      return;
    }

    const theme =
      poolTheme?.value ||
      "rolyfe";

    /*
     Theme-specific original
     table artwork.
     */

    const artByTheme = {
      classic:
        "POOL",

      rolyfe:
        "RO'LYFE",

      emg:
        "EM-GAMING",

      ace:
        "ACE",

      business:
        "BUSINESS",

      realestate:
        "REAL ESTATE",

      investor:
        "INVESTOR",

      sevenfigures:
        "7 FIGURES",

      midnight:
        "MIDNIGHT",

      neon:
        "NEON",

      championship:
        "CHAMPIONSHIP"
    };

    const label =
      artByTheme[
        theme
      ] ||
      theme.toUpperCase();

    /*
     Each theme gets a different visual
     treatment while preserving the
     existing theme colors.
     */

    if (
      theme === "emg"
    ) {
      tableSurface.style.backgroundImage =
        `
        radial-gradient(
          circle at 18% 28%,
          rgba(0,220,255,.22),
          transparent 18%
        ),
        radial-gradient(
          circle at 82% 72%,
          rgba(255,220,0,.18),
          transparent 20%
        ),
        linear-gradient(
          135deg,
          rgba(0,0,0,.15),
          rgba(0,220,255,.10),
          rgba(0,0,0,.20)
        )
        `;

      createArtElement(
        label,
        0.13
      );

      return;
    }

    if (
      theme ===
      "realestate"
    ) {
      tableSurface.style.backgroundImage =
        `
        linear-gradient(
          90deg,
          transparent 49%,
          rgba(255,255,255,.06) 50%,
          transparent 51%
        ),
        linear-gradient(
          0deg,
          transparent 49%,
          rgba(255,255,255,.06) 50%,
          transparent 51%
        ),
        linear-gradient(
          135deg,
          rgba(255,255,255,.04),
          transparent
        )
        `;

      createArtElement(
        "REAL ESTATE",
        0.085
      );

      return;
    }

    if (
      theme ===
      "business"
    ) {
      tableSurface.style.backgroundImage =
        `
        linear-gradient(
          135deg,
          rgba(255,255,255,.05),
          transparent 30%,
          rgba(255,255,255,.025)
        ),
        repeating-linear-gradient(
          90deg,
          transparent 0 45px,
          rgba(255,255,255,.025) 46px 47px
        )
        `;

      createArtElement(
        "BUSINESS",
        0.075
      );

      return;
    }

    if (
      theme ===
      "investor"
    ) {
      tableSurface.style.backgroundImage =
        `
        linear-gradient(
          0deg,
          transparent 24%,
          rgba(255,255,255,.045) 25%,
          transparent 26%,
          transparent 49%,
          rgba(255,255,255,.045) 50%,
          transparent 51%,
          transparent 74%,
          rgba(255,255,255,.045) 75%,
          transparent 76%
        ),
        linear-gradient(
          90deg,
          transparent 24%,
          rgba(255,255,255,.045) 25%,
          transparent 26%,
          transparent 49%,
          rgba(255,255,255,.045) 50%,
          transparent 51%,
          transparent 74%,
          rgba(255,255,255,.045) 75%,
          transparent 76%
        )
        `;

      createArtElement(
        "INVESTOR",
        0.075
      );

      return;
    }

    if (
      theme ===
      "sevenfigures"
    ) {
      tableSurface.style.backgroundImage =
        `
        radial-gradient(
          circle at 50% 50%,
          rgba(255,215,0,.13),
          transparent 32%
        ),
        linear-gradient(
          135deg,
          rgba(255,255,255,.045),
          transparent 40%,
          rgba(255,215,0,.05)
        )
        `;

      createArtElement(
        "7 FIGURES",
        0.10
      );

      return;
    }

    if (
      theme ===
      "midnight"
    ) {
      tableSurface.style.backgroundImage =
        `
        radial-gradient(
          circle at 20% 25%,
          rgba(120,140,255,.14),
          transparent 20%
        ),
        radial-gradient(
          circle at 80% 75%,
          rgba(150,90,255,.12),
          transparent 22%
        )
        `;

      createArtElement(
        "MIDNIGHT",
        0.07
      );

      return;
    }

    if (
      theme ===
      "neon"
    ) {
      tableSurface.style.backgroundImage =
        `
        repeating-linear-gradient(
          45deg,
          transparent 0 35px,
          rgba(255,255,255,.035) 36px 37px
        ),
        radial-gradient(
          circle at 50% 50%,
          rgba(255,255,255,.06),
          transparent 35%
        )
        `;

      createArtElement(
        "NEON",
        0.10
      );

      return;
    }

    if (
      theme ===
      "championship"
    ) {
      tableSurface.style.backgroundImage =
        `
        radial-gradient(
          circle at 50% 50%,
          rgba(255,255,255,.09),
          transparent 32%
        ),
        linear-gradient(
          135deg,
          rgba(255,255,255,.05),
          transparent 35%,
          rgba(255,255,255,.035)
        )
        `;

      createArtElement(
        "CHAMPIONSHIP",
        0.08
      );

      return;
    }

    /*
     Generic treatment for remaining themes.
     */

    tableSurface.style.backgroundImage =
      `
      radial-gradient(
        circle at 50% 50%,
        rgba(255,255,255,.055),
        transparent 35%
      ),
      linear-gradient(
        135deg,
        rgba(255,255,255,.035),
        transparent 45%
      )
      `;

    createArtElement(
      label,
      0.07
    );
  }

  /* ========================================================
     THEME
     ======================================================== */

  function applyTheme() {
    const themeId =
      poolTheme?.value ||
      "rolyfe";

    try {
      if (
        window.ROLYFE_POOL_THEME &&
        typeof
          window.ROLYFE_POOL_THEME.change ===
            "function"
      ) {
        window.ROLYFE_POOL_THEME.change(
          themeId
        );
      }
    } catch (error) {
      console.warn(
        "Theme engine:",
        error
      );
    }

    /*
     Default remains classic.
     Art is a secondary presentation
     controlled by the engine.
     */

    applyTablePresentation(
      state.tablePresentation
    );
  }

  /* ========================================================
     OPTIONAL ART SWITCH
     ======================================================== */

  function toggleTableArt() {
    state.tablePresentation =
      state.tablePresentation ===
      "classic"
        ? "art"
        : "classic";

    applyTablePresentation(
      state.tablePresentation
    );

    audioPlay(
      "select"
    );
  }

  /* ========================================================
     FULLSCREEN
     ======================================================== */

  async function toggleFullscreen() {
    try {
      if (
        !document.fullscreenElement
      ) {
        if (
          app &&
          app.requestFullscreen
        ) {
          await app.requestFullscreen();
        }
      } else {
        if (
          document.exitFullscreen
        ) {
          await document.exitFullscreen();
        }
      }
    } catch (error) {
      console.warn(
        "Fullscreen:",
        error
      );
    }
  }

  function updateFullscreenButton() {
    if (!fullscreenBtn) {
      return;
    }

    fullscreenBtn.textContent =
      document.fullscreenElement
        ? "↙ EXIT"
        : "⛶ FULLSCREEN";
  }

  /* ========================================================
     UI
     ======================================================== */

  function updateUI() {
    updatePowerUI();
    updateTimers();

    if (score0) {
      score0.textContent =
        String(
          state.players[0]?.score ||
            0
        );
    }

    if (score1) {
      score1.textContent =
        String(
          state.players[1]?.score ||
            0
        );
    }

    if (group0) {
      group0.textContent =
        state.players[0]?.group ||
        "—";
    }

    if (group1) {
      group1.textContent =
        state.players[1]?.group ||
        "—";
    }

    if (statGame) {
      statGame.textContent =
        state.gameType;
    }

    if (statMode) {
      statMode.textContent =
        state.mode;
    }

    if (statAI) {
      statAI.textContent =
        `Level ${state.aiLevel}`;
    }

    if (shotCount) {
      shotCount.textContent =
        String(
          state.shotCount
        );
    }

    if (challengeScore) {
      challengeScore.textContent =
        String(
          state.challengeScore
        );
    }

    if (challengePanel) {
      challengePanel.style.display =
        state.challengeMode
          ? ""
          : "none";
    }

    const name =
      getPlayerDisplayName(
        state.currentPlayer
      );

    if (turnStatus) {
      turnStatus.textContent =
        `${name}'s turn`;
    }

    if (aiStatus) {
      if (
        state.aiThinking
      ) {
        aiStatus.textContent =
          "🤖 AI THINKING…";
      } else if (
        state.shooting
      ) {
        aiStatus.textContent =
          "🎱 BALLS MOVING…";
      } else {
        aiStatus.textContent =
          "";
      }
    }

    if (player1Status) {
      player1Status.textContent =
        state.currentPlayer ===
        0
          ? "● TURN"
          : "";
    }

    if (player2Status) {
      player2Status.textContent =
        state.currentPlayer ===
        1
          ? "● TURN"
          : "";
    }

    /*
     SHOOT LOCK.

     The button is unavailable whenever
     balls are moving.
     */

    if (shootBtn) {
      const locked =
        state.shooting ||
        state.paused ||
        state.gameOver ||
        !allBallsStopped() ||
        isAIPlayer();

      shootBtn.disabled =
        locked;

      shootBtn.textContent =
        state.shooting ||
        !allBallsStopped()
          ? "BALLS MOVING…"
          : "SHOOT";
    }

    if (pauseBtn) {
      pauseBtn.textContent =
        state.paused
          ? "▶ RESUME"
          : "⏸ PAUSE";
    }

    renderAim();
  }

  /* ========================================================
     RESET
     ======================================================== */

  function resetGame() {
    cancelAI();
    stopTimer();

    if (
      "speechSynthesis" in
      window
    ) {
      try {
        window.speechSynthesis.cancel();
      } catch (_) {}
    }

    state.currentPlayer =
      0;

    state.shooting =
      false;

    state.aiming =
      false;

    state.breakShot =
      true;

    state.gameOver =
      false;

    state.paused =
      false;

    state.challengeScore =
      0;

    state.shotCount =
      0;

    state.shotResolving =
      false;

    state.lockOn =
      false;

    state.lockedTarget =
      null;

    state.selectedTarget =
      null;

    state.aiThinking =
      false;

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

    state.nineBallTargetAtShot =
      null;

    initializePlayers();

    createRack();

    updatePowerUI();

    startTimer();

    updateUI();

    if (
      isAIPlayer()
    ) {
      scheduleAI(
        CONFIG.aiDelay
      );
    } else {
      announceTurn();
    }
  }

  function newRack() {
    resetGame();
  }

  /* ========================================================
     SETTINGS
     ======================================================== */

  function setMode(
    mode
  ) {
    state.mode =
      mode ||
      "pvp";

    state.challengeMode =
      state.mode ===
      "challenge";

    resetGame();
  }

  function setGameType(
    type
  ) {
    state.gameType =
      type ||
      "8ball";

    resetGame();
  }

  function setAILevel(
    level
  ) {
    state.aiLevel =
      clamp(
        Number(level) ||
          1,
        1,
        5
      );

    resetGame();
  }

  /* ========================================================
     EVENT BINDINGS
     ======================================================== */

  function bindEvents() {
    /*
     AIM
     */

    aimLeft?.addEventListener(
      "click",
      () => {
        aimBy(
          -CONFIG.aimStep
        );
      }
    );

    aimRight?.addEventListener(
      "click",
      () => {
        aimBy(
          CONFIG.aimStep
        );
      }
    );

    /*
     SHOOT
     */

    shootBtn?.addEventListener(
      "click",
      event => {
        event.preventDefault();

        shoot();
      }
    );

    /*
     POWER
     */

    powerDown?.addEventListener(
      "click",
      event => {
        event.preventDefault();

        changePower(
          -0.05
        );
      }
    );

    powerUp?.addEventListener(
      "click",
      event => {
        event.preventDefault();

        changePower(
          0.05
        );
      }
    );

    /*
     SETTINGS
     */

    poolGame?.addEventListener(
      "change",
      () => {
        setGameType(
          poolGame.value
        );
      }
    );

    poolMode?.addEventListener(
      "change",
      () => {
        setMode(
          poolMode.value
        );
      }
    );

    poolAILevel?.addEventListener(
      "change",
      () => {
        setAILevel(
          poolAILevel.value
        );
      }
    );

    poolTheme?.addEventListener(
      "change",
      () => {
        applyTheme();
      }
    );

    /*
     GAME
     */

    resetPool?.addEventListener(
      "click",
      () => {
        resetGame();
      }
    );

    newRackBtn?.addEventListener(
      "click",
      () => {
        newRack();
      }
    );

    pauseBtn?.addEventListener(
      "click",
      () => {
        togglePause();
      }
    );

    rulesBtn?.addEventListener(
      "click",
      () => {
        if (rulesModal) {
          rulesModal.style.display =
            "flex";
        }
      }
    );

    closeRulesBtn?.addEventListener(
      "click",
      () => {
        if (rulesModal) {
          rulesModal.style.display =
            "none";
        }
      }
    );

    playAgainBtn?.addEventListener(
      "click",
      () => {
        if (gameOverModal) {
          gameOverModal.style.display =
            "none";
        }

        resetGame();
      }
    );

    /*
     FULLSCREEN
     */

    fullscreenBtn?.addEventListener(
      "click",
      toggleFullscreen
    );

    document.addEventListener(
      "fullscreenchange",
      updateFullscreenButton
    );

    /*
     Existing lock-on action.
     */

    const lockButton =
      document.querySelector(
        '[data-action="lock-on"]'
      );

    lockButton?.addEventListener(
      "click",
      lockOn
    );

    /*
     Optional table-art action if
     an existing/future button uses it.
     */

    const artButton =
      document.querySelector(
        '[data-action="table-art"]'
      );

    artButton?.addEventListener(
      "click",
      toggleTableArt
    );

    /*
     KEYBOARD
     */

    document.addEventListener(
      "keydown",
      event => {
        if (
          event.code ===
          "Space"
        ) {
          event.preventDefault();

          /*
           Space is the ONLY keyboard
           shot trigger.
           */

          if (
            !state.shooting
          ) {
            shoot();
          }
        }

        if (
          event.key ===
          "ArrowLeft"
        ) {
          event.preventDefault();

          aimBy(
            -CONFIG.aimStep
          );
        }

        if (
          event.key ===
          "ArrowRight"
        ) {
          event.preventDefault();

          aimBy(
            CONFIG.aimStep
          );
        }

        if (
          event.key ===
            "Escape" &&
          document.fullscreenElement
        ) {
          document.exitFullscreen();
        }
      }
    );
  }

  /* ========================================================
     MAIN GAME LOOP
     ======================================================== */

  function gameLoop(
    now
  ) {
    const frameSeconds =
      Math.min(
        0.05,
        (
          now -
          state.lastFrame
        ) /
          1000
      );

    state.lastFrame =
      now;

    if (
      !state.paused &&
      !state.gameOver
    ) {
      state.accumulator +=
        frameSeconds;

      state.accumulator =
        Math.min(
          state.accumulator,
          CONFIG.maxAccumulator
        );

      while (
        state.accumulator >=
        CONFIG.fixedStep
      ) {
        if (
          state.shooting
        ) {
          physicsStep(
            CONFIG.fixedStep
          );
        }

        state.accumulator -=
          CONFIG.fixedStep;
      }

      /*
       Always render.
       */

      render();

      /*
       The shot is over ONLY after
       everything stops.
       */

      if (
        state.shooting &&
        allBallsStopped()
      ) {
        state.shooting =
          false;

        /*
         Give the final pocket/collision
         state a moment to settle.
         */

        setTimeout(
          () => {
            if (
              !state.gameOver
            ) {
              finishShot();
            }
          },
          140
        );
      }
    }

    updateUI();

    state.animationFrame =
      requestAnimationFrame(
        gameLoop
      );
  }

  /* ========================================================
     PUBLIC API
     ======================================================== */

  window.ROLYFE_POOL = {
    state,

    resetGame,

    newRack,

    shoot,

    aimLeft() {
      aimBy(
        -CONFIG.aimStep
      );
    },

    aimRight() {
      aimBy(
        CONFIG.aimStep
      );
    },

    lockOn,

    setPower,

    setMode,

    setGameType,

    setAILevel,

    startAI() {
      if (
        isAIPlayer()
      ) {
        scheduleAI(
          CONFIG.aiDelay
        );
      }
    },

    stopAI() {
      cancelAI();
    },

    getScore() {
      return [
        state.players[0]
          ?.score || 0,

        state.players[1]
          ?.score || 0
      ];
    },

    getState() {
      return state;
    },

    toggleVoice() {
      state.voiceEnabled =
        !state.voiceEnabled;

      return state.voiceEnabled;
    },

    speak,

    applyTheme,

    toggleTableArt
  };

  /* ========================================================
     INITIALIZATION
     ======================================================== */

  function initialize() {
    setupAudio();

    setupTouchAim();

    bindEvents();

    /*
     Mobile browser protection.
     */

    if (
      tableSurface
    ) {
      tableSurface.style.touchAction =
        "none";
    }

    /*
     Load saved theme.
     */

    try {
      if (
        window.ROLYFE_POOL_THEME &&
        typeof
          window.ROLYFE_POOL_THEME.load ===
            "function"
      ) {
        const saved =
          window.ROLYFE_POOL_THEME.load();

        if (
          saved &&
          poolTheme
        ) {
          poolTheme.value =
            saved;
        }
      }
    } catch (_) {}

    /*
     Read existing controls.
     */

    if (poolGame) {
      state.gameType =
        poolGame.value ||
        "8ball";
    }

    if (poolMode) {
      state.mode =
        poolMode.value ||
        "pvp";
    }

    if (poolAILevel) {
      state.aiLevel =
        clamp(
          Number(
            poolAILevel.value
          ) || 1,
          1,
          5
        );
    }

    state.challengeMode =
      state.mode ===
      "challenge";

    initializePlayers();

    /*
     Preserve your current default
     presentation.

     Art is OFF by default.
     */

    state.tablePresentation =
      "classic";

    applyTheme();

    createRack();

    updatePowerUI();

    updateFullscreenButton();

    startTimer();

    updateUI();

    if (
      isAIPlayer()
    ) {
      scheduleAI(
        CONFIG.aiDelay
      );
    } else {
      announceTurn();
    }

    state.lastFrame =
      performance.now();

    state.animationFrame =
      requestAnimationFrame(
        gameLoop
      );

    console.log(
      "RO'Lyfe Pool Engine V3.4.4 loaded."
    );
  }

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      initialize,
      {
        once: true
      }
    );
  } else {
    initialize();
  }

})();
