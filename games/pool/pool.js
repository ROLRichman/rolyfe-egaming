/*
============================================================
RO'LYFE GAMING™ — POOL ENGINE V3.4.3
------------------------------------------------------------
Touch Aim + Shot Lock + Audio + Voice + AI Continuation
8-Ball / 9-Ball / Practice
PvP / PvAI / AIvAI / Challenge
EM-Gaming Table Skin
============================================================

PRESERVES:
- Existing DOM IDs
- window.ROLYFE_POOL public API
- themes.js
- shared/audio.js
- existing pool.css
- fullscreen
- practice mode
- power controls
- lock-on
- timers
- AI levels

IMPORTANT:
Touch/mouse release NEVER fires a shot.
Only SHOOT button or Space fires.
============================================================
*/

(() => {
  "use strict";

  const CONFIG = {
    tableWidth: 1000,
    tableHeight: 500,
    ballRadius: 14,

    friction: 0.992,
    rollingResistance: 0.0008,
    stopVelocity: 0.045,

    minPower: 0.12,
    maxPower: 34,
    breakPowerMultiplier: 1.35,

    collisionRestitution: 0.94,
    railRestitution: 0.88,

    pocketRadius: 38,
    pocketCaptureRadius: 31,

    playerTime: 600,
    challengeTime: 120,

    aimStep: 2.5,
    aimLineLength: 240,

    aiDelay: 850,
    aiMaxThinkTime: 1500,

    maxVelocity: 38,

    fixedStep: 1 / 120,
    maxAccumulator: 0.08,

    collisionSubsteps: 2
  };

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

    railSoundCooldown: 0,
    collisionSoundCooldown: 0,

    touchActive: false,
    mouseActive: false,

    emgSkinElement: null
  };

  /* ========================================================
     DOM
  ======================================================== */

  const $ = (id) => document.getElementById(id);

  const app = $("poolApp");
  const poolTable = $("poolTable");
  const tableSurface = document.querySelector(".table-surface") || poolTable;
  const ballLayer = $("ballLayer");

  const soundBtn = $("soundBtn");
  const fullscreenBtn = $("fullscreenBtn");

  const poolGame = $("poolGame");
  const poolMode = $("poolMode");
  const poolAILevel = $("poolAILevel");
  const poolTheme = $("poolTheme");

  const player1 = $("player1");
  const player2 = $("player2");

  const player1Status = $("player1Status");
  const player2Status = $("player2Status");

  const score0 = $("score0");
  const score1 = $("score1");

  const group0 = $("group0");
  const group1 = $("group1");

  const timer0 = $("timer0");
  const timer1 = $("timer1");

  const turnStatus = $("turnStatus");
  const aiStatus = $("aiStatus");

  const aimLine = $("aimLine");

  const powerDown = $("powerDown");
  const powerUp = $("powerUp");
  const powerFill = $("powerFill");
  const powerValue = $("powerValue");

  const aimLeft = $("aimLeft");
  const shootBtn = $("shootBtn");
  const aimRight = $("aimRight");

  const resetPool = $("resetPool");
  const newRackBtn = $("newRackBtn");
  const pauseBtn = $("pauseBtn");
  const rulesBtn = $("rulesBtn");

  const challengePanel = $("challengePanel");
  const challengeScore = $("challengeScore");

  const statGame = $("statGame");
  const statMode = $("statMode");
  const statAI = $("statAI");
  const shotCount = $("shotCount");

  const rulesModal = $("rulesModal");
  const closeRulesBtn = $("closeRulesBtn");

  const gameOverModal = $("gameOverModal");
  const finalScore = $("finalScore");
  const playAgainBtn = $("playAgainBtn");

  /* ========================================================
     HELPERS
     ======================================================== */

  const clamp = (v, min, max) =>
    Math.max(min, Math.min(max, v));

  const dist = (a, b) =>
    Math.hypot(a.x - b.x, a.y - b.y);

  const normalize = (x, y) => {
    const d = Math.hypot(x, y) || 1;
    return {
      x: x / d,
      y: y / d
    };
  };

  const angleBetween = (a, b) =>
    Math.atan2(b.y - a.y, b.x - a.x);

  const isMoving = (b) =>
    b && !b.pocketed &&
    Math.hypot(b.vx, b.vy) > CONFIG.stopVelocity;

  function allBallsStopped() {
    return state.balls.every(b =>
      b.pocketed ||
      Math.hypot(b.vx, b.vy) <= CONFIG.stopVelocity
    );
  }

  function objectBallsRemaining() {
    return state.balls.filter(b =>
      b.number !== 0 && !b.pocketed
    );
  }

  function formatTime(seconds) {
    seconds = Math.max(0, Math.floor(seconds || 0));
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  /* ========================================================
     AUDIO
     ======================================================== */

  function getAudio() {
    return window.ROLyfeAudio ||
           window.ROlyfeAudio ||
           null;
  }

  function audioPlay(name) {
    const audio = getAudio();
    if (!audio) return;

    try {
      if (typeof audio.init === "function") {
        audio.init();
      }

      if (typeof audio.play === "function") {
        audio.play(name);
      }
    } catch (err) {
      console.warn("RO'Lyfe Pool audio:", err);
    }
  }

  function setupAudio() {
    const audio = getAudio();
    if (!audio) return;

    try {
      if (typeof audio.init === "function") {
        audio.init();
      }
    } catch (err) {
      console.warn("Audio init:", err);
    }

    if (!soundBtn) return;

    soundBtn.addEventListener("click", () => {
      try {
        if (typeof audio.toggleMute === "function") {
          audio.toggleMute();
        }

        updateSoundButton();

        const muted =
          typeof audio.isMuted === "function"
            ? audio.isMuted()
            : false;

        if (!muted) {
          audioPlay("click");
        }
      } catch (err) {
        console.warn("Sound toggle:", err);
      }
    });

    updateSoundButton();
  }

  function updateSoundButton() {
    if (!soundBtn) return;

    const audio = getAudio();
    let muted = false;

    try {
      muted =
        audio &&
        typeof audio.isMuted === "function" &&
        audio.isMuted();
    } catch (_) {}

    soundBtn.textContent = muted
      ? "🔇 SOUND"
      : "🔊 SOUND";

    soundBtn.setAttribute(
      "aria-pressed",
      muted ? "true" : "false"
    );
  }

  /* ========================================================
     VOICE ANNOUNCER
     ======================================================== */

  function speak(text) {
    if (!state.voiceEnabled) return;

    if (!("speechSynthesis" in window)) return;

    try {
      window.speechSynthesis.cancel();

      const utterance =
        new SpeechSynthesisUtterance(text);

      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 0.9;

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn("RO'Lyfe Voice:", err);
    }
  }

  function playerName(index) {
    if (index === 0) {
      return player1?.querySelector?.(".player-name")?.textContent ||
             player1?.textContent?.trim() ||
             "Player 1";
    }

    return player2?.querySelector?.(".player-name")?.textContent ||
           player2?.textContent?.trim() ||
           "Player 2";
  }

  function announceTurn() {
    const name = playerName(state.currentPlayer);

    turnStatus && (
      turnStatus.textContent =
        `${name}'s turn`
    );

    speak(`${name}'s turn.`);
  }

  function announce(text) {
    speak(text);
  }

  /* ========================================================
     BALL
     ======================================================== */

  function createBall(number, x, y) {
    return {
      number,
      x,
      y,

      vx: 0,
      vy: 0,

      pocketed: false,

      element: null,

      colorClass:
        number === 0
          ? "cue"
          : number <= 7
            ? "solid"
            : "stripe",

      lastRailHit: 0
    };
  }

  /* ========================================================
     RACK
     ======================================================== */

  function createRack() {
    state.balls = [];

    const cue =
      createBall(
        0,
        210,
        CONFIG.tableHeight / 2
      );

    state.cueBall = cue;
    state.balls.push(cue);

    const spacing =
      CONFIG.ballRadius * 2.05;

    const rackX = 720;
    const rackY = CONFIG.tableHeight / 2;

    if (state.gameType === "9ball") {
      /*
       9-ball diamond:
       1 at front
       9 in center
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
        1, 2, 9, 3, 4, 5, 6, 7, 8
      ];

      positions.forEach((p, i) => {
        state.balls.push(
          createBall(
            numbers[i],
            rackX + p[0] * spacing * 0.866,
            rackY + p[1] * spacing
          )
        );
      });

    } else {
      let number = 1;

      for (let row = 0; row < 5; row++) {
        for (let col = 0; col <= row; col++) {
          if (number > 15) break;

          state.balls.push(
            createBall(
              number,
              rackX +
                row *
                  spacing *
                  0.866,

              rackY +
                (col - row / 2) *
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

    if (state.mode === "pvai") {
      state.players[1].name =
        `AI — Level ${state.aiLevel}`;
    }

    if (state.mode === "aivai") {
      state.players[0].name =
        `AI Alpha — Level ${state.aiLevel}`;

      state.players[1].name =
        `AI Beta — Level ${Math.min(
          5,
          Math.max(1, state.aiLevel + 1)
        )}`;
    }

    if (state.mode === "challenge") {
      state.players[1].name =
        `Challenge AI — Level ${state.aiLevel}`;
    }

    updatePlayerNames();
  }

  function updatePlayerNames() {
    const setName = (el, name) => {
      if (!el) return;

      const nameEl =
        el.querySelector(".player-name");

      if (nameEl) {
        nameEl.textContent = name;
      }
    };

    setName(
      player1,
      state.players[0]?.name || "Player 1"
    );

    setName(
      player2,
      state.players[1]?.name || "Player 2"
    );
  }

  /* ========================================================
     AI CHECK
     ======================================================== */

  function isAIPlayer(index = state.currentPlayer) {
    if (state.mode === "aivai") {
      return true;
    }

    if (state.mode === "pvai") {
      return index === 1;
    }

    if (state.mode === "challenge") {
      return index === 1;
    }

    return false;
  }

  /* ========================================================
     8-BALL / 9-BALL TARGETING
     ======================================================== */

  function lowest9() {
    const remaining =
      state.balls
        .filter(b =>
          b.number >= 1 &&
          b.number <= 9 &&
          !b.pocketed
        )
        .sort((a, b) =>
          a.number - b.number
        );

    return remaining[0] || null;
  }

  function ballGroup(number) {
    if (number >= 1 && number <= 7) {
      return "solids";
    }

    if (number >= 9 && number <= 15) {
      return "stripes";
    }

    return null;
  }

  function groupBalls(group) {
    return state.balls.filter(b =>
      !b.pocketed &&
      ballGroup(b.number) === group
    );
  }

  function groupCleared(player) {
    if (!player.group) return false;

    return groupBalls(player.group).length === 0;
  }

  function legalTargetForPlayer(ball, playerIndex) {
    if (state.gameType === "9ball") {
      return ball.number ===
        state.nineBallTargetAtShot;
    }

    if (state.gameType === "practice") {
      return true;
    }

    const player =
      state.players[playerIndex];

    if (!player.group) {
      return ball.number !== 0;
    }

    return (
      ball.number === 8 ||
      ballGroup(ball.number) === player.group
    );
  }

  /* ========================================================
     POCKETS
     ======================================================== */

  function getPockets() {
    return [
      { x: 0, y: 0 },
      {
        x: CONFIG.tableWidth / 2,
        y: 0
      },
      {
        x: CONFIG.tableWidth,
        y: 0
      },
      {
        x: 0,
        y: CONFIG.tableHeight
      },
      {
        x: CONFIG.tableWidth / 2,
        y: CONFIG.tableHeight
      },
      {
        x: CONFIG.tableWidth,
        y: CONFIG.tableHeight
      }
    ];
  }

  function nearestPocket(ball) {
    let best = null;
    let bestDistance = Infinity;

    for (const pocket of getPockets()) {
      const d =
        Math.hypot(
          ball.x - pocket.x,
          ball.y - pocket.y
        );

      if (d < bestDistance) {
        bestDistance = d;
        best = pocket;
      }
    }

    return {
      pocket: best,
      distance: bestDistance
    };
  }

  function checkPocket(ball) {
    if (
      !ball ||
      ball.pocketed
    ) {
      return false;
    }

    const pockets = getPockets();

    for (const pocket of pockets) {
      const d =
        Math.hypot(
          ball.x - pocket.x,
          ball.y - pocket.y
        );

      /*
       Pocket Assist:
       Slightly forgiving but still requires
       the ball to actually reach the pocket.
       */

      if (d <= CONFIG.pocketRadius) {
        pocketBall(ball, pocket);
        return true;
      }
    }

    return false;
  }

  function pocketBall(ball, pocket) {
    if (ball.pocketed) return;

    ball.pocketed = true;
    ball.vx = 0;
    ball.vy = 0;

    state.ballsPocketedThisTurn.push(
      ball.number
    );

    if (ball.number === 8) {
      state.eightBallPocketedThisShot = true;
    }

    if (ball.number === 9) {
      state.nineBallPocketedThisShot = true;
    }

    if (ball.number === 0) {
      state.foulThisTurn = true;
    }

    audioPlay("pocket");

    if (state.challengeMode &&
        ball.number !== 0) {
      state.challengeScore += 100;
    }

    render();
  }

  /* ========================================================
     PHYSICS
     ======================================================== */

  function integrateBall(ball, dt) {
    if (
      ball.pocketed ||
      !Number.isFinite(ball.x) ||
      !Number.isFinite(ball.y)
    ) {
      return;
    }

    ball.x += ball.vx * dt * 60;
    ball.y += ball.vy * dt * 60;

    const friction =
      Math.pow(
        CONFIG.friction,
        dt * 60
      );

    ball.vx *= friction;
    ball.vy *= friction;

    const speed =
      Math.hypot(
        ball.vx,
        ball.vy
      );

    if (
      speed > 0 &&
      speed < CONFIG.stopVelocity
    ) {
      ball.vx = 0;
      ball.vy = 0;
    }

    if (
      CONFIG.rollingResistance > 0 &&
      speed > 0
    ) {
      const reduction =
        CONFIG.rollingResistance *
        dt *
        60;

      const newSpeed =
        Math.max(
          0,
          speed - reduction
        );

      if (newSpeed === 0) {
        ball.vx = 0;
        ball.vy = 0;
      } else {
        const ratio =
          newSpeed / speed;

        ball.vx *= ratio;
        ball.vy *= ratio;
      }
    }
  }

  function resolveRails(ball) {
    if (
      ball.pocketed ||
      !ball
    ) {
      return;
    }

    const r = CONFIG.ballRadius;

    let hitRail = false;

    if (ball.x < r) {
      ball.x = r;
      ball.vx =
        Math.abs(ball.vx) *
        CONFIG.railRestitution;
      hitRail = true;
    }

    if (
      ball.x >
      CONFIG.tableWidth - r
    ) {
      ball.x =
        CONFIG.tableWidth - r;

      ball.vx =
        -Math.abs(ball.vx) *
        CONFIG.railRestitution;

      hitRail = true;
    }

    if (ball.y < r) {
      ball.y = r;
      ball.vy =
        Math.abs(ball.vy) *
        CONFIG.railRestitution;

      hitRail = true;
    }

    if (
      ball.y >
      CONFIG.tableHeight - r
    ) {
      ball.y =
        CONFIG.tableHeight - r;

      ball.vy =
        -Math.abs(ball.vy) *
        CONFIG.railRestitution;

      hitRail = true;
    }

    if (
      hitRail &&
      performance.now() >
        ball.lastRailHit + 70
    ) {
      ball.lastRailHit =
        performance.now();

      audioPlay("rail");
    }
  }

  function resolveBallCollision(a, b) {
    if (
      a.pocketed ||
      b.pocketed
    ) {
      return;
    }

    const dx = b.x - a.x;
    const dy = b.y - a.y;

    const distance =
      Math.hypot(dx, dy);

    const minimum =
      CONFIG.ballRadius * 2;

    if (
      distance <= 0 ||
      distance >= minimum
    ) {
      return;
    }

    const nx = dx / distance;
    const ny = dy / distance;

    const overlap =
      minimum - distance;

    /*
     Positional correction.
     This prevents balls from visually
     sinking into each other.
     */

    a.x -= nx * overlap * 0.5;
    a.y -= ny * overlap * 0.5;

    b.x += nx * overlap * 0.5;
    b.y += ny * overlap * 0.5;

    const rvx =
      b.vx - a.vx;

    const rvy =
      b.vy - a.vy;

    const velocityAlongNormal =
      rvx * nx +
      rvy * ny;

    if (velocityAlongNormal > 0) {
      return;
    }

    const impulse =
      -(1 + CONFIG.collisionRestitution) *
      velocityAlongNormal /
      2;

    a.vx -= impulse * nx;
    a.vy -= impulse * ny;

    b.vx += impulse * nx;
    b.vy += impulse * ny;

    if (
      performance.now() >
      state.collisionSoundCooldown
    ) {
      state.collisionSoundCooldown =
        performance.now() + 35;

      audioPlay("collision");
    }

    if (
      !state.firstBallHit &&
      a.number === 0 &&
      b.number !== 0
    ) {
      state.firstBallHit = b.number;
    }

    if (
      !state.firstBallHit &&
      b.number === 0 &&
      a.number !== 0
    ) {
      state.firstBallHit = a.number;
    }
  }

  function physicsStep(dt) {
    for (const ball of state.balls) {
      integrateBall(ball, dt);
    }

    for (const ball of state.balls) {
      checkPocket(ball);
    }

    for (const ball of state.balls) {
      if (!ball.pocketed) {
        resolveRails(ball);
      }
    }

    for (
      let sub = 0;
      sub < CONFIG.collisionSubsteps;
      sub++
    ) {
      for (
        let i = 0;
        i < state.balls.length;
        i++
      ) {
        for (
          let j = i + 1;
          j < state.balls.length;
          j++
        ) {
          resolveBallCollision(
            state.balls[i],
            state.balls[j]
          );
        }
      }
    }

    for (const ball of state.balls) {
      checkPocket(ball);
    }
  }

  /* ========================================================
     RENDER
     ======================================================== */

  function render() {
    if (!ballLayer) return;

    /*
     Rebuild only when necessary.
     This guarantees balls never disappear
     simply because they touch a cushion.
     */

    const existing =
      new Map();

    ballLayer
      .querySelectorAll(".ball")
      .forEach(el => {
        existing.set(
          Number(
            el.dataset.ballNumber
          ),
          el
        );
      });

    for (const ball of state.balls) {
      let el =
        existing.get(ball.number);

      if (!el) {
        el =
          document.createElement("div");

        el.className =
          `ball ball-${ball.number}`;

        el.dataset.ballNumber =
          String(ball.number);

        if (ball.number === 0) {
          el.classList.add("cue-ball");
        } else if (
          ball.number >= 9 &&
          ball.number <= 15
        ) {
          el.classList.add("stripe-ball");
        } else {
          el.classList.add("object-ball");
        }

        el.textContent =
          ball.number === 0
            ? ""
            : String(ball.number);

        ballLayer.appendChild(el);
      }

      el.style.display =
        ball.pocketed
          ? "none"
          : "flex";

      if (!ball.pocketed) {
        const x =
          ball.x /
          CONFIG.tableWidth *
          100;

        const y =
          ball.y /
          CONFIG.tableHeight *
          100;

        el.style.left =
          `${x}%`;

        el.style.top =
          `${y}%`;

        el.style.transform =
          "translate(-50%, -50%)";
      }
    }

    renderAim();
  }

  /* ========================================================
     AIM
     ======================================================== */

  function setAimAngle(angle) {
    state.aimAngle = angle;

    state.aimX =
      state.cueBall.x +
      Math.cos(angle) *
      CONFIG.aimLineLength;

    state.aimY =
      state.cueBall.y +
      Math.sin(angle) *
      CONFIG.aimLineLength;

    renderAim();
  }

  function renderAim() {
    if (!aimLine || !state.cueBall) {
      return;
    }

    if (
      !state.aiming &&
      !state.lockOn
    ) {
      aimLine.style.display =
        "block";
    }

    const cue =
      state.cueBall;

    const length =
      CONFIG.aimLineLength;

    aimLine.style.display =
      state.shooting
        ? "none"
        : "block";

    aimLine.style.left =
      `${cue.x / CONFIG.tableWidth * 100}%`;

    aimLine.style.top =
      `${cue.y / CONFIG.tableHeight * 100}%`;

    aimLine.style.width =
      `${length /
        CONFIG.tableWidth *
        100}%`;

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
      (clientX - rect.left) /
      rect.width *
      CONFIG.tableWidth;

    const y =
      (clientY - rect.top) /
      rect.height *
      CONFIG.tableHeight;

    const angle =
      Math.atan2(
        y - state.cueBall.y,
        x - state.cueBall.x
      );

    setAimAngle(angle);
  }

  function aimBy(delta) {
    if (
      state.shooting ||
      state.paused ||
      state.gameOver ||
      !allBallsStopped()
    ) {
      return;
    }

    state.aiming = false;

    setAimAngle(
      state.aimAngle + delta
    );

    audioPlay("click");
  }

  /* ========================================================
     TOUCH + MOUSE
     IMPORTANT: RELEASE NEVER SHOOTS
     ======================================================== */

  function setupTouchAim() {
    if (!tableSurface) return;

    tableSurface.style.touchAction =
      "none";

    /*
     TOUCH
     */

    tableSurface.addEventListener(
      "touchstart",
      e => {
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
          e.touches[0];

        if (!touch) return;

        state.touchActive = true;
        state.aiming = true;

        updateAimFromClient(
          touch.clientX,
          touch.clientY
        );

        e.preventDefault();
      },
      {
        passive: false
      }
    );

    tableSurface.addEventListener(
      "touchmove",
      e => {
        if (!state.touchActive) {
          return;
        }

        const touch =
          e.touches[0];

        if (!touch) return;

        updateAimFromClient(
          touch.clientX,
          touch.clientY
        );

        e.preventDefault();
      },
      {
        passive: false
      }
    );

    tableSurface.addEventListener(
      "touchend",
      e => {
        /*
         NEVER SHOOT HERE.
         */

        state.touchActive = false;
        state.aiming = false;

        renderAim();

        e.preventDefault();
      },
      {
        passive: false
      }
    );

    tableSurface.addEventListener(
      "touchcancel",
      e => {
        state.touchActive = false;
        state.aiming = false;

        renderAim();

        e.preventDefault();
      },
      {
        passive: false
      }
    );

    /*
     MOUSE
     */

    tableSurface.addEventListener(
      "mousedown",
      e => {
        if (
          isAIPlayer() ||
          state.shooting ||
          state.paused ||
          state.gameOver ||
          !allBallsStopped()
        ) {
          return;
        }

        state.mouseActive = true;
        state.aiming = true;

        updateAimFromClient(
          e.clientX,
          e.clientY
        );

        e.preventDefault();
      }
    );

    tableSurface.addEventListener(
      "mousemove",
      e => {
        if (!state.mouseActive) {
          return;
        }

        updateAimFromClient(
          e.clientX,
          e.clientY
        );

        e.preventDefault();
      }
    );

    window.addEventListener(
      "mouseup",
      e => {
        if (!state.mouseActive) {
          return;
        }

        /*
         NEVER SHOOT ON RELEASE.
         */

        state.mouseActive = false;
        state.aiming = false;

        renderAim();
      }
    );
  }

  /* ========================================================
     POWER
     ======================================================== */

  function setPower(value) {
    state.power =
      clamp(
        value,
        0.05,
        1
      );

    updatePowerUI();
  }

  function changePower(delta) {
    if (
      state.shooting ||
      state.paused ||
      state.gameOver
    ) {
      return;
    }

    setPower(
      state.power + delta
    );

    audioPlay("click");
  }

  function updatePowerUI() {
    const percent =
      Math.round(
        state.power * 100
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

    state.shooting = true;
    state.aiming = false;
    state.shotResolving = false;

    state.ballsPocketedThisTurn = [];
    state.foulThisTurn = false;
    state.firstBallHit = null;

    state.eightBallPocketedThisShot =
      false;

    state.nineBallPocketedThisShot =
      false;

    /*
     CRITICAL:
     Store 9-ball target BEFORE shot.
     */

    if (state.gameType === "9ball") {
      const target =
        lowest9();

      state.nineBallTargetAtShot =
        target
          ? target.number
          : null;
    }

    const speed =
      CONFIG.minPower +
      state.power *
      (CONFIG.maxPower -
       CONFIG.minPower);

    const finalSpeed =
      speed *
      (
        state.breakShot
          ? CONFIG.breakPowerMultiplier
          : 1
      );

    state.cueBall.vx =
      Math.cos(angle) *
      finalSpeed;

    state.cueBall.vy =
      Math.sin(angle) *
      finalSpeed;

    state.shotCount++;

    if (state.breakShot) {
      state.breakShot = false;
    }

    audioPlay("strike");

    renderAim();
    updateUI();

    return true;
  }

  function shoot() {
    if (
      state.shooting ||
      state.paused ||
      state.gameOver
    ) {
      return false;
    }

    if (isAIPlayer()) {
      return false;
    }

    if (!allBallsStopped()) {
      return false;
    }

    return fireShot(
      state.aimAngle,
      state.power,
      false
    );
  }

  /* ========================================================
     AI TARGET / SHOT PLANNING
     ======================================================== */

  function getAITargets(playerIndex) {
    let targets = [];

    if (state.gameType === "9ball") {
      const target =
        lowest9();

      if (target) {
        targets = [target];
      }

      return targets;
    }

    if (state.gameType === "practice") {
      return objectBallsRemaining();
    }

    const player =
      state.players[playerIndex];

    if (player.group) {
      targets =
        groupBalls(player.group);
    } else {
      targets =
        objectBallsRemaining()
          .filter(b =>
            b.number !== 8
          );

      if (!targets.length) {
        const eight =
          state.balls.find(b =>
            b.number === 8 &&
            !b.pocketed
          );

        if (eight) {
          targets = [eight];
        }
      }
    }

    /*
     Level 3+ prefers easier targets.
     */

    if (state.aiLevel >= 3) {
      targets.sort((a, b) =>
        nearestPocket(a).distance -
        nearestPocket(b).distance
      );
    }

    return targets;
  }

  function directShotFor(
    cue,
    target
  ) {
    const nearest =
      nearestPocket(target);

    if (!nearest.pocket) {
      return null;
    }

    const pocket =
      nearest.pocket;

    const targetToPocket =
      normalize(
        pocket.x - target.x,
        pocket.y - target.y
      );

    const ghost = {
      x:
        target.x -
        targetToPocket.x *
        CONFIG.ballRadius *
        2.05,

      y:
        target.y -
        targetToPocket.y *
        CONFIG.ballRadius *
        2.05
    };

    const angle =
      Math.atan2(
        ghost.y - cue.y,
        ghost.x - cue.x
      );

    const cueDistance =
      Math.hypot(
        ghost.x - cue.x,
        ghost.y - cue.y
      );

    const objectDistance =
      Math.hypot(
        target.x - pocket.x,
        target.y - pocket.y
      );

    return {
      type: "direct",
      target,
      pocket,
      ghost,
      angle,
      distance:
        cueDistance +
        objectDistance
    };
  }

  function bankShotFor(
    cue,
    target
  ) {
    if (state.aiLevel < 4) {
      return null;
    }

    const pockets =
      getPockets();

    let best = null;

    for (const pocket of pockets) {
      const reflected = {
        x:
          CONFIG.tableWidth -
          pocket.x,

        y:
          pocket.y
      };

      const dir =
        normalize(
          reflected.x - target.x,
          reflected.y - target.y
        );

      const ghost = {
        x:
          target.x -
          dir.x *
          CONFIG.ballRadius *
          2.05,

        y:
          target.y -
          dir.y *
          CONFIG.ballRadius *
          2.05
      };

      const angle =
        Math.atan2(
          ghost.y - cue.y,
          ghost.x - cue.x
        );

      const distance =
        Math.hypot(
          ghost.x - cue.x,
          ghost.y - cue.y
        );

      const candidate = {
        type: "bank",
        target,
        pocket,
        ghost,
        angle,
        distance:
          distance + 180
      };

      if (
        !best ||
        candidate.distance <
          best.distance
      ) {
        best = candidate;
      }
    }

    return best;
  }

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

    const first =
      targets[0];

    const second =
      targets[1];

    const direction =
      normalize(
        second.x - first.x,
        second.y - first.y
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

    return {
      type: "combo",
      target: first,
      secondary: second,
      angle:
        Math.atan2(
          ghost.y - cue.y,
          ghost.x - cue.x
        ),
      ghost,
      distance:
        Math.hypot(
          ghost.x - cue.x,
          ghost.y - cue.y
        ) + 120
    };
  }

  function chooseAIPlan() {
    const cue =
      state.cueBall;

    if (!cue) return null;

    const targets =
      getAITargets(
        state.currentPlayer
      );

    if (!targets.length) {
      return null;
    }

    /*
     Level 1:
     simple direct shots
     */

    if (state.aiLevel === 1) {
      return directShotFor(
        cue,
        targets[0]
      );
    }

    /*
     Level 2:
     direct shots with stronger power
     */

    if (state.aiLevel === 2) {
      return directShotFor(
        cue,
        targets[0]
      );
    }

    /*
     Level 3:
     safest/easiest direct target
     */

    if (state.aiLevel === 3) {
      let best = null;

      for (const target of targets) {
        const shot =
          directShotFor(
            cue,
            target
          );

        if (
          shot &&
          (!best ||
            shot.distance <
              best.distance)
        ) {
          best = shot;
        }
      }

      return best;
    }

    /*
     Level 4:
     direct or bank
     */

    if (state.aiLevel === 4) {
      const direct =
        directShotFor(
          cue,
          targets[0]
        );

      const bank =
        bankShotFor(
          cue,
          targets[0]
        );

      if (
        bank &&
        (!direct ||
          Math.random() < 0.35)
      ) {
        return bank;
      }

      return direct;
    }

    /*
     Level 5:
     combo / bank / strategic direct
     */

    const combo =
      comboShotFor(
        cue,
        targets
      );

    if (
      combo &&
      Math.random() < 0.45
    ) {
      return combo;
    }

    const bank =
      bankShotFor(
        cue,
        targets[0]
      );

    if (
      bank &&
      Math.random() < 0.40
    ) {
      return bank;
    }

    return directShotFor(
      cue,
      targets[0]
    );
  }

  function aiPowerFor(plan) {
    let power =
      0.42;

    if (state.aiLevel === 1) {
      power = 0.38;
    }

    if (state.aiLevel === 2) {
      power = 0.55;
    }

    if (state.aiLevel === 3) {
      power = 0.45;
    }

    if (state.aiLevel === 4) {
      power =
        plan?.type === "bank"
          ? 0.68
          : 0.53;
    }

    if (state.aiLevel === 5) {
      power =
        plan?.type === "combo"
          ? 0.64
          : plan?.type === "bank"
            ? 0.70
            : 0.56;
    }

    /*
     Different AI levels get different
     aim variance.
     */

    const errors = {
      1: 0.095,
      2: 0.070,
      3: 0.050,
      4: 0.032,
      5: 0.018
    };

    const error =
      errors[state.aiLevel] ||
      0.05;

    return {
      power,
      angle:
        plan.angle +
        (
          Math.random() -
          0.5
        ) *
        error
    };
  }

  /* ========================================================
     AI ENGINE
     ======================================================== */

  function cancelAI() {
    state.aiToken++;

    if (state.aiTimer) {
      clearTimeout(
        state.aiTimer
      );

      state.aiTimer = null;
    }

    state.aiThinking = false;
  }

  function scheduleAI(delay = CONFIG.aiDelay) {
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

    state.aiThinking = true;

    updateUI();

    state.aiTimer =
      setTimeout(() => {
        if (
          token !==
          state.aiToken
        ) {
          return;
        }

        state.aiTimer = null;

        runAI(token);

      }, delay);
  }

  function runAI(token) {
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
      state.aiThinking = false;
      updateUI();
      return;
    }

    const plan =
      chooseAIPlan();

    if (!plan) {
      state.aiThinking = false;
      updateUI();
      return;
    }

    const shot =
      aiPowerFor(plan);

    state.aiThinking = false;

    state.aimAngle =
      shot.angle;

    state.power =
      shot.power;

    state.lockedTarget =
      plan.target;

    state.lockOn = true;

    /*
     Slight human-like thinking delay.
     */

    setTimeout(() => {
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

    }, 180);
  }

  /* ========================================================
     SHOT RESULT
     ======================================================== */

  function assignGroupIfNeeded() {
    if (
      state.gameType !== "8ball"
    ) {
      return;
    }

    const player =
      state.players[
        state.currentPlayer
      ];

    if (
      player.group ||
      state.breakShot
    ) {
      return;
    }

    const pocketed =
      state.ballsPocketedThisTurn
        .filter(n =>
          n >= 1 &&
          n <= 15 &&
          n !== 8
        );

    if (!pocketed.length) {
      return;
    }

    const first =
      pocketed[0];

    const group =
      ballGroup(first);

    if (!group) return;

    player.group = group;

    const other =
      state.players[
        1 - state.currentPlayer
      ];

    other.group =
      group === "solids"
        ? "stripes"
        : "solids";
  }

  function respotNine() {
    const nine =
      state.balls.find(b =>
        b.number === 9
      );

    if (!nine) return;

    nine.pocketed = false;
    nine.vx = 0;
    nine.vy = 0;

    nine.x = 720;
    nine.y =
      CONFIG.tableHeight / 2;

    /*
     Move it slightly forward if
     occupied.
     */

    let occupied = true;
    let attempts = 0;

    while (
      occupied &&
      attempts < 20
    ) {
      occupied =
        state.balls.some(b =>
          b !== nine &&
          !b.pocketed &&
          dist(b, nine) <
            CONFIG.ballRadius * 2.1
        );

      if (occupied) {
        nine.y +=
          CONFIG.ballRadius * 2.2;

        if (
          nine.y >
          CONFIG.tableHeight -
          CONFIG.ballRadius * 2
        ) {
          nine.y =
            CONFIG.tableHeight / 2;
          nine.x +=
            CONFIG.ballRadius * 2.2;
        }
      }

      attempts++;
    }

    audioPlay("notify");
  }

  function scratchCue() {
    if (!state.cueBall) return;

    state.cueBall.pocketed =
      false;

    state.cueBall.vx = 0;
    state.cueBall.vy = 0;

    state.cueBall.x = 210;
    state.cueBall.y =
      CONFIG.tableHeight / 2;

    audioPlay("scratch");
  }

  function winGame(winner) {
    state.gameOver = true;
    state.shooting = false;

    cancelAI();
    stopTimer();

    const winnerName =
      state.players[winner]?.name ||
      `Player ${winner + 1}`;

    if (finalScore) {
      finalScore.textContent =
        `${winnerName} wins! 🏆`;
    }

    if (gameOverModal) {
      gameOverModal.style.display =
        "flex";
    }

    audioPlay("win");

    announce(
      `${winnerName} wins the game.`
    );

    updateUI();
  }

  function loseGame(loser) {
    winGame(1 - loser);
  }

  function finishShot() {
    if (
      state.shotResolving
    ) {
      return;
    }

    state.shotResolving = true;

    const shooter =
      state.currentPlayer;

    const player =
      state.players[shooter];

    const scratch =
      state.foulThisTurn;

    const pocketed =
      state.ballsPocketedThisTurn
        .filter(n => n !== 0);

    const eightPocketed =
      state.eightBallPocketedThisShot;

    const ninePocketed =
      state.nineBallPocketedThisShot;

    /*
     ========================================================
     8-BALL
     ========================================================
     */

    if (
      state.gameType === "8ball"
    ) {
      /*
       CUSTOM RO'LYFE HOUSE RULE:

       If the 8 is pocketed AND the cue
       scratches on the same shot,
       award the win.

       This rule applies ONLY to 8-ball.
       */

      if (
        eightPocketed &&
        scratch
      ) {
        winGame(shooter);
        return;
      }

      if (eightPocketed) {
        const legalFirstContact =
          state.firstBallHit === null ||
          legalTargetForPlayer(
            {
              number:
                state.firstBallHit
            },
            shooter
          );

        const groupClearedBefore8 =
          groupCleared(player);

        if (
          !player.group ||
          !groupClearedBefore8 ||
          !legalFirstContact
        ) {
          loseGame(shooter);
          return;
        }

        winGame(shooter);
        return;
      }

      if (scratch) {
        audioPlay("foul");
        announce(
          "Foul. Cue ball scratch."
        );

        scratchCue();

        state.shotResolving = false;

        switchPlayer();

        return;
      }

      /*
       First-contact legality.
       */

      if (
        state.firstBallHit !== null &&
        player.group &&
        !legalTargetForPlayer(
          {
            number:
              state.firstBallHit
          },
          shooter
        )
      ) {
        state.foulThisTurn = true;

        audioPlay("foul");

        announce("Foul.");

        state.shotResolving = false;

        switchPlayer();

        return;
      }

      assignGroupIfNeeded();

      player.ballsMade +=
        pocketed.filter(n =>
          ballGroup(n) ===
          player.group
        ).length;

      player.score +=
        pocketed.length * 10;

      /*
       If player pocketed an object ball,
       they continue.
       */

      if (pocketed.length > 0) {
        state.shotResolving = false;

        queueNextShot();

        return;
      }

      state.shotResolving = false;

      switchPlayer();

      return;
    }

    /*
     ========================================================
     9-BALL
     ========================================================
     */

    if (
      state.gameType === "9ball"
    ) {
      const legalFirstContact =
        state.firstBallHit ===
        state.nineBallTargetAtShot;

      if (
        ninePocketed &&
        legalFirstContact &&
        !scratch
      ) {
        winGame(shooter);
        return;
      }

      if (
        ninePocketed &&
        !legalFirstContact
      ) {
        respotNine();
      }

      if (scratch) {
        scratchCue();
        audioPlay("foul");

        announce(
          "Foul. Cue ball scratch."
        );

        state.shotResolving = false;

        switchPlayer();

        return;
      }

      if (
        state.firstBallHit !== null &&
        !legalFirstContact
      ) {
        audioPlay("foul");

        announce(
          "Foul. Wrong ball first."
        );

        state.shotResolving = false;

        switchPlayer();

        return;
      }

      if (
        pocketed.length > 0 &&
        !ninePocketed
      ) {
        state.shotResolving = false;

        queueNextShot();

        return;
      }

      state.shotResolving = false;

      switchPlayer();

      return;
    }

    /*
     ========================================================
     PRACTICE
     ========================================================
     */

    if (
      state.gameType === "practice"
    ) {
      if (scratch) {
        scratchCue();
      }

      if (
        state.balls.filter(b =>
          b.number !== 0 &&
          !b.pocketed
        ).length === 0
      ) {
        announce(
          "Practice rack cleared."
        );

        createRack();
      }

      state.shotResolving = false;

      if (pocketed.length > 0) {
        queueNextShot();
      } else {
        switchPlayer();
      }

      return;
    }

    state.shotResolving = false;

    switchPlayer();
  }

  /* ========================================================
     NEXT TURN
     ======================================================== */

  function queueNextShot() {
    /*
     Shooter earned another shot.
     */

    state.shotResolving = false;

    state.ballsPocketedThisTurn = [];
    state.foulThisTurn = false;
    state.firstBallHit = null;

    state.eightBallPocketedThisShot =
      false;

    state.nineBallPocketedThisShot =
      false;

    state.nineBallTargetAtShot =
      null;

    state.lockedTarget = null;
    state.lockOn = false;

    startTimer();

    updateUI();

    if (isAIPlayer()) {
      scheduleAI(
        CONFIG.aiDelay
      );
    } else {
      announceTurn();
    }
  }

  function switchPlayer() {
    cancelAI();

    state.currentPlayer =
      1 -
      state.currentPlayer;

    state.shotResolving = false;

    state.ballsPocketedThisTurn = [];
    state.foulThisTurn = false;
    state.firstBallHit = null;

    state.eightBallPocketedThisShot =
      false;

    state.nineBallPocketedThisShot =
      false;

    state.nineBallTargetAtShot =
      null;

    state.lockedTarget = null;
    state.lockOn = false;

    startTimer();

    audioPlay("turn");

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
    if (state.timerInterval) {
      clearInterval(
        state.timerInterval
      );

      state.timerInterval = null;
    }
  }

  function startTimer() {
    stopTimer();

    state.timerSeconds =
      state.challengeMode
        ? CONFIG.challengeTime
        : CONFIG.playerTime;

    state.timerInterval =
      setInterval(() => {
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
          state.timerSeconds <= 0
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
      }, 1000);

    updateTimers();
  }

  function updateTimers() {
    const value =
      formatTime(
        state.timerSeconds
      );

    if (state.currentPlayer === 0) {
      if (timer0) {
        timer0.textContent = value;
      }
    } else {
      if (timer1) {
        timer1.textContent = value;
      }
    }
  }

  /* ========================================================
     PAUSE
     ======================================================== */

  function togglePause() {
    if (state.gameOver) {
      return;
    }

    state.paused =
      !state.paused;

    if (state.paused) {
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

      announce("Game paused.");
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

      announce("Game resumed.");

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
     LOCK-ON
     ======================================================== */

  function lockOn() {
    if (
      state.shooting ||
      state.paused ||
      state.gameOver
    ) {
      return;
    }

    const targets =
      getAITargets(
        state.currentPlayer
      );

    if (!targets.length) {
      state.lockOn = false;
      state.lockedTarget = null;
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

    if (state.lockOn) {
      const target =
        state.lockedTarget;

      setAimAngle(
        angleBetween(
          state.cueBall,
          target
        )
      );

      audioPlay("select");
    }

    renderAim();
  }

  /* ========================================================
     GAME RESET
     ======================================================== */

  function resetGame() {
    cancelAI();
    stopTimer();

    if (
      "speechSynthesis" in window
    ) {
      try {
        window.speechSynthesis.cancel();
      } catch (_) {}
    }

    state.currentPlayer = 0;

    state.shooting = false;
    state.aiming = false;

    state.breakShot = true;

    state.gameOver = false;
    state.paused = false;

    state.challengeScore = 0;

    state.shotCount = 0;

    state.shotResolving = false;

    state.lockOn = false;
    state.lockedTarget = null;

    state.aiThinking = false;

    state.ballsPocketedThisTurn = [];
    state.foulThisTurn = false;
    state.firstBallHit = null;

    state.eightBallPocketedThisShot =
      false;

    state.nineBallPocketedThisShot =
      false;

    state.nineBallTargetAtShot =
      null;

    state.players = [];

    initializePlayers();
    createRack();

    startTimer();

    updatePowerUI();
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

  function setMode(mode) {
    state.mode =
      mode || "pvp";

    state.challengeMode =
      state.mode === "challenge";

    resetGame();
  }

  function setGameType(type) {
    state.gameType =
      type || "8ball";

    resetGame();
  }

  function setAILevel(level) {
    state.aiLevel =
      clamp(
        Number(level) || 1,
        1,
        5
      );

    resetGame();
  }

  /* ========================================================
     EM-GAMING TABLE ART
     ======================================================== */

  function removeEMGSkin() {
    if (
      state.emgSkinElement &&
      state.emgSkinElement.parentNode
    ) {
      state.emgSkinElement.parentNode.removeChild(
        state.emgSkinElement
      );
    }

    state.emgSkinElement = null;

    if (tableSurface) {
      tableSurface.style.backgroundImage =
        "";
    }
  }

  function applyEMGSkin(themeId) {
    removeEMGSkin();

    if (
      themeId !== "emg" ||
      !tableSurface
    ) {
      return;
    }

    /*
     Arcade-style original EM-Gaming
     table artwork.

     This is created entirely by the
     engine, so pool.css does not need
     to be changed.
     */

    tableSurface.style.backgroundImage =
      `
      radial-gradient(
        circle at 18% 30%,
        rgba(0,220,255,.20),
        transparent 18%
      ),
      radial-gradient(
        circle at 82% 70%,
        rgba(255,220,0,.16),
        transparent 20%
      ),
      linear-gradient(
        135deg,
        rgba(0,0,0,.12),
        rgba(0,220,255,.08),
        rgba(0,0,0,.18)
      )
      `;

    const art =
      document.createElement("div");

    art.className =
      "pool-emg-art";

    art.textContent =
      "EM-GAMING";

    art.style.position =
      "absolute";

    art.style.left = "50%";
    art.style.top = "50%";

    art.style.transform =
      "translate(-50%, -50%) rotate(-8deg)";

    art.style.pointerEvents =
      "none";

    art.style.userSelect =
      "none";

    art.style.fontWeight =
      "900";

    art.style.fontSize =
      "clamp(28px, 6vw, 72px)";

    art.style.letterSpacing =
      "0.12em";

    art.style.opacity =
      "0.10";

    art.style.color =
      "#ffffff";

    art.style.textShadow =
      `
      0 0 10px rgba(0,220,255,.8),
      0 0 30px rgba(0,220,255,.4)
      `;

    art.style.zIndex =
      "1";

    tableSurface.appendChild(art);

    state.emgSkinElement =
      art;
  }

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
    } catch (err) {
      console.warn(
        "Theme engine:",
        err
      );
    }

    applyEMGSkin(themeId);
  }

  /* ========================================================
     FULLSCREEN
     ======================================================== */

  async function toggleFullscreen() {
    try {
      if (!document.fullscreenElement) {
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
    } catch (err) {
      console.warn(
        "Fullscreen:",
        err
      );
    }
  }

  function updateFullscreenButton() {
    if (!fullscreenBtn) return;

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
          state.players[0]?.score || 0
        );
    }

    if (score1) {
      score1.textContent =
        String(
          state.players[1]?.score || 0
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
        String(state.shotCount);
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

    if (turnStatus) {
      turnStatus.textContent =
        `${state.players[
          state.currentPlayer
        ]?.name || "Player"}'s turn`;
    }

    if (aiStatus) {
      if (state.aiThinking) {
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
        state.currentPlayer === 0
          ? "● TURN"
          : "";
    }

    if (player2Status) {
      player2Status.textContent =
        state.currentPlayer === 1
          ? "● TURN"
          : "";
    }

    /*
     IMPORTANT:
     Disable shooting while balls move.
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
     MAIN LOOP
     ======================================================== */

  function gameLoop(now) {
    const frameSeconds =
      Math.min(
        0.05,
        (now -
          state.lastFrame) /
          1000
      );

    state.lastFrame = now;

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
        if (state.shooting) {
          physicsStep(
            CONFIG.fixedStep
          );
        }

        state.accumulator -=
          CONFIG.fixedStep;
      }

      render();

      /*
       Shot ends only when EVERYTHING
       has stopped.
       */

      if (
        state.shooting &&
        allBallsStopped()
      ) {
        state.shooting = false;

        /*
         Small settle delay gives the final
         collision/pocket event time to finish.
         */

        setTimeout(() => {
          if (
            !state.gameOver
          ) {
            finishShot();
          }
        }, 120);
      }
    }

    updateUI();

    state.animationFrame =
      requestAnimationFrame(
        gameLoop
      );
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
          -CONFIG.aimStep *
          Math.PI /
          180
        );
      }
    );

    aimRight?.addEventListener(
      "click",
      () => {
        aimBy(
          CONFIG.aimStep *
          Math.PI /
          180
        );
      }
    );

    /*
     SHOOT
     */

    shootBtn?.addEventListener(
      "click",
      e => {
        e.preventDefault();

        shoot();
      }
    );

    /*
     POWER
     */

    powerDown?.addEventListener(
      "click",
      e => {
        e.preventDefault();

        changePower(-0.05);
      }
    );

    powerUp?.addEventListener(
      "click",
      e => {
        e.preventDefault();

        changePower(0.05);
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
     GAME CONTROLS
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
     LOCK ON
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
     KEYBOARD
     */

    document.addEventListener(
      "keydown",
      e => {
        if (
          e.code === "Space"
        ) {
          e.preventDefault();

          if (!state.shooting) {
            shoot();
          }
        }

        if (
          e.key === "ArrowLeft"
        ) {
          e.preventDefault();

          aimBy(
            -CONFIG.aimStep *
            Math.PI /
            180
          );
        }

        if (
          e.key === "ArrowRight"
        ) {
          e.preventDefault();

          aimBy(
            CONFIG.aimStep *
            Math.PI /
            180
          );
        }

        if (
          e.key === "Escape" &&
          state.paused === false &&
          document.fullscreenElement
        ) {
          document.exitFullscreen();
        }
      }
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
        -CONFIG.aimStep *
        Math.PI /
        180
      );
    },

    aimRight() {
      aimBy(
        CONFIG.aimStep *
        Math.PI /
        180
      );
    },

    lockOn,

    setPower,

    setMode,

    setGameType,

    setAILevel,

    startAI() {
      if (isAIPlayer()) {
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
        state.players[0]?.score || 0,
        state.players[1]?.score || 0
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

    applyTheme
  };

  /* ========================================================
     INITIALIZATION
     ======================================================== */

  function initialize() {
    setupAudio();

    setupTouchAim();

    bindEvents();

    /*
     Make sure touch browsers don't interpret
     the table as scrolling/zooming.
     */

    if (tableSurface) {
      tableSurface.style.touchAction =
        "none";
    }

    /*
     Load existing theme.
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
    } catch (err) {
      console.warn(
        "Theme load:",
        err
      );
    }

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
      state.mode === "challenge";

    initializePlayers();

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
      "RO'Lyfe Pool Engine V3.4.3 loaded."
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
