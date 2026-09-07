/* =========================================================
   RO'LYFE GAMING™ — POOL ENGINE V3.2
   Shared Systems Integration Build
   Replacement for: games/pool/pool.js

   Uses:
   - shared/physics-engine.js
   - shared/audio.js
   - shared/timer.js
   - shared/player-system.js
   - shared/theme-engine.js
   - shared/game-ui.js
   - shared/ai-engine.js

   Pool remains responsible for Pool rules/gameplay.
   ========================================================= */
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

    pocketRadius: 34,
    pocketCaptureRadius: 29,

    aiDelay: 850,
    playerTime: 600,
    challengeTime: 120,
    aimStep: 2.5,
    aimLineLength: 240,
    aiMaxThinkTime: 1800,

    maxVelocity: 38
  };

  /* =========================================================
     DOM
     ========================================================= */

  const $ = (id, selector) =>
    document.getElementById(id) ||
    (selector ? document.querySelector(selector) : null);

  const table = $("poolTable", ".pool-table");
  const layer = $("ballLayer", ".ball-layer");
  const powerFill = $("powerFill", ".power-fill");
  const messageEl = $("poolMessage", ".pool-message");
  const turnEl = $("turnValue", ".turn-value");
  const timerEl = $("poolTimer", ".pool-timer");

  const modeSelect = $("modeSelect", "#poolMode");
  const gameSelect = $("gameType", "#poolGame");
  const aiSelect = $("aiLevel", "#poolAILevel");

  const shootButton = $("shootBtn", "[data-action='shoot']");
  const resetButton = $("resetBtn", "#resetPool");
  const leftButton = $("aimLeft", "[data-action='aim-left']");
  const rightButton = $("aimRight", "[data-action='aim-right']");
  const lockButton = $("lockAim", "[data-action='lock-on']");

  const interactionSurface =
    table || document.querySelector(".table-surface");

  const newRackButton = $("newRackBtn");
  const pauseButton = $("pauseBtn");
  const rulesButton = $("rulesBtn");
  const closeRulesButton = $("closeRulesBtn");
  const rulesModal = $("rulesModal");
  const gameOverModal = $("gameOverModal");
  const playAgainButton = $("playAgainBtn");
  const finalScore = $("finalScore");
  const fullscreenButton = $("fullscreenBtn");
  const soundButton = $("soundBtn");
  const themeSelect = $("poolTheme");
  const aiStatus = $("aiStatus");

  /* =========================================================
     SHARED SYSTEM REFERENCES
     ========================================================= */

  const Audio =
    window.ROLyfeAudio ||
    window.ROlyfeAudio ||
    null;

  const Timer =
    window.ROLyfeTimer ||
    window.ROlyfeTimer ||
    null;

  const Players =
    window.ROLyfePlayers ||
    window.ROlyfePlayers ||
    null;

  const AI =
    window.ROLyfeAI ||
    window.ROlyfeAI ||
    null;

  const GameUI =
    window.ROLyfeGameUI ||
    window.ROlyfeGameUI ||
    null;

  const Themes =
    window.ROLyfeThemes ||
    window.ROlyfeThemes ||
    null;

  /* =========================================================
     STATE
     ========================================================= */

  const state = {
    gameType: "8ball",
    mode: "pvp",
    aiLevel: 1,

    balls: [],
    currentPlayer: 0,
    players: [],

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

    gameOver: false,
    challengeMode: false,
    challengeScore: 0,

    timerSeconds: CONFIG.playerTime,
    timerInterval: null,

    animationFrame: null,
    lastFrame: performance.now(),

    aiThinking: false,
    aiTimer: null,

    paused: false,

    lockOn: false,
    lockedTarget: null,

    shotCount: 0,

    pointerId: null
  };

  /* =========================================================
     UTILITIES
     ========================================================= */

  const clamp = (v, min, max) =>
    Math.max(min, Math.min(max, v));

  const dist = (a, b) =>
    Math.hypot(b.x - a.x, b.y - a.y);

  const size = () => ({
    width: table?.clientWidth || CONFIG.tableWidth,
    height: table?.clientHeight || CONFIG.tableHeight
  });

  const sx = () =>
    size().width / CONFIG.tableWidth;

  const sy = () =>
    size().height / CONFIG.tableHeight;

  const rx = x => x * sx();
  const ry = y => y * sy();

  const player = () =>
    state.players[state.currentPlayer];

  const formatTime = seconds =>
    `${String(Math.floor(Math.max(0, seconds) / 60)).padStart(2, "0")}:${String(Math.max(0, seconds) % 60).padStart(2, "0")}`;

  /* =========================================================
     AUDIO
     ========================================================= */

  function audio(method, ...args) {
    if (!Audio || typeof Audio[method] !== "function") return;

    try {
      Audio[method](...args);
    } catch (_) {}
  }

  function unlockAudio() {
    try {
      Audio?.unlock?.();
    } catch (_) {}
  }

  /* =========================================================
     MESSAGE
     ========================================================= */

  function msg(text, type = "") {
    if (!messageEl) return;

    messageEl.textContent = text;
    messageEl.className =
      "pool-message" +
      (type ? ` ${type}` : "");
  }

  /* =========================================================
     POCKETS / BALLS
     ========================================================= */

  function pockets() {
    const w = CONFIG.tableWidth;
    const h = CONFIG.tableHeight;

    return [
      { x: 0, y: 0 },
      { x: w / 2, y: 0 },
      { x: w, y: 0 },
      { x: 0, y: h },
      { x: w / 2, y: h },
      { x: w, y: h }
    ];
  }

  function pocketed(ballObject) {
    if (ballObject.pocketed) return false;

    return pockets().some(
      p =>
        Math.hypot(
          ballObject.x - p.x,
          ballObject.y - p.y
        ) <= CONFIG.pocketCaptureRadius
    );
  }

  function createBall(number, x, y) {
    return {
      number,
      x,
      y,
      vx: 0,
      vy: 0,
      radius: CONFIG.ballRadius,
      pocketed: false,
      element: null
    };
  }

  /* =========================================================
     PLAYERS
     ========================================================= */

  function configurePlayers() {
    const aiNames = {
      1: "RO'Lyfe AI — START-UP",
      2: "RO'Lyfe AI — START-UP+",
      3: "RO'Lyfe AI — INVESTOR",
      4: "RO'Lyfe AI — INVESTOR+",
      5: "RO'Lyfe AI — 7FIGURES"
    };

    if (state.mode === "pvai") {
      state.players = [
        {
          name: "Player 1",
          type: "human",
          score: 0,
          group: null,
          fouls: 0
        },
        {
          name: aiNames[+state.aiLevel] || "RO'Lyfe AI",
          type: "ai",
          score: 0,
          group: null,
          fouls: 0
        }
      ];
    } else if (state.mode === "aivai") {
      state.players = [
        {
          name: "RO'Lyfe AI Alpha",
          type: "ai",
          score: 0,
          group: null,
          fouls: 0
        },
        {
          name: "RO'Lyfe AI Beta",
          type: "ai",
          score: 0,
          group: null,
          fouls: 0
        }
      ];
    } else if (state.mode === "challenge") {
      state.players = [
        {
          name: "Challenge Player",
          type: "human",
          score: 0,
          group: null,
          fouls: 0
        },
        {
          name: "Challenge",
          type: "system",
          score: 0,
          group: null,
          fouls: 0
        }
      ];
    } else {
      state.players = [
        {
          name: "Player 1",
          type: "human",
          score: 0,
          group: null,
          fouls: 0
        },
        {
          name: "Player 2",
          type: "human",
          score: 0,
          group: null,
          fouls: 0
        }
      ];
    }

    /* Connect to shared Player System when available. */
    try {
      if (Players?.reset) Players.reset();

      state.players.forEach((p, index) => {
        if (typeof Players?.add === "function") {
          Players.add({
            id: `pool-player-${index + 1}`,
            name: p.name,
            type: p.type,
            level: p.type === "ai" ? state.aiLevel : 0
          });
        }
      });

      Players?.setCurrent?.(state.currentPlayer);
    } catch (_) {}
  }

  /* =========================================================
     RACK
     ========================================================= */

  function createRack() {
    state.balls = [];

    const cue = createBall(0, 210, 250);

    state.cueBall = cue;
    state.balls.push(cue);

    const spacing = CONFIG.ballRadius * 2.04;
    const rackX = 720;
    const rackY = 250;

    let number = 1;

    for (let row = 0; row < 5; row++) {
      for (let col = 0; col <= row; col++) {
        if (number > 15) break;

        state.balls.push(
          createBall(
            number,
            rackX + row * spacing * 0.866,
            rackY + (col - row / 2) * spacing
          )
        );

        number++;
      }
    }

    if (state.gameType === "9ball") {
      state.balls = state.balls.filter(
        b => b.number <= 9
      );
    }
  }

  /* =========================================================
     RENDER
     ========================================================= */

  function render() {
    if (!layer) return;

    for (const b of state.balls) {
      if (!b.element) {
        b.element = document.createElement("div");

        b.element.className = "ball";
        b.element.dataset.ball = b.number;

        if (b.number === 0) {
          b.element.classList.add("white", "cue");
        } else {
          b.element.classList.add(`ball-${b.number}`);

          b.element.textContent = b.number;

          b.element.dataset.group =
            b.number <= 7
              ? "solid"
              : b.number === 8
                ? "eight"
                : "stripe";
        }

        layer.appendChild(b.element);
      }

      b.element.style.display =
        b.pocketed ? "none" : "flex";

      if (!b.pocketed) {
        b.element.style.left = `${rx(b.x)}px`;
        b.element.style.top = `${ry(b.y)}px`;
        b.element.style.transform =
          "translate(-50%,-50%)";
      }
    }
  }

  /* =========================================================
     POWER
     ========================================================= */

  function power(value) {
    state.power = clamp(+value, 0, 1);

    if (powerFill) {
      powerFill.style.width =
        `${state.power * 100}%`;
    }

    document
      .querySelectorAll(".power-value")
      .forEach(el => {
        el.textContent =
          `${Math.round(state.power * 100)}%`;
      });
  }

  /* =========================================================
     TIMER
     ========================================================= */

  function updateTimer() {
    const seconds =
      Math.max(0, Math.floor(state.timerSeconds));

    const formatted = formatTime(seconds);

    if (timerEl) {
      timerEl.textContent = formatted;
    }

    const active =
      document.getElementById(
        `timer${state.currentPlayer}`
      );

    if (active) {
      active.textContent = formatted;
    }
  }

  function stopTimer() {
    if (state.timerInterval) {
      clearInterval(state.timerInterval);
      state.timerInterval = null;
    }

    try {
      Timer?.stop?.("pool-turn");
    } catch (_) {}
  }

  function resetTimer() {
    state.timerSeconds =
      state.challengeMode
        ? CONFIG.challengeTime
        : CONFIG.playerTime;

    updateTimer();

    try {
      Timer?.reset?.("pool-turn", state.timerSeconds);
    } catch (_) {}
  }

  function startTimer() {
    stopTimer();

    if (state.paused || state.gameOver) return;

    state.timerInterval = setInterval(() => {
      if (
        state.gameOver ||
        state.shooting ||
        state.aiThinking ||
        state.paused
      ) {
        return;
      }

      state.timerSeconds--;

      if (state.timerSeconds <= 0) {
        state.timerSeconds = 0;
        updateTimer();

        audio("countdown");

        const current = player();

        msg(
          `${current?.name || "Player"} ran out of time.`,
          "warning"
        );

        switchPlayer();
      } else {
        updateTimer();

        if (state.timerSeconds <= 10) {
          audio("countdown");
        }
      }
    }, 1000);

    try {
      Timer?.start?.("pool-turn");
    } catch (_) {}
  }

  /* =========================================================
     SHARED GAME UI
     ========================================================= */

  function updateSharedUI() {
    try {
      GameUI?.setGame?.("pool");
      GameUI?.setStatus?.(
        state.gameOver
          ? "GAME OVER"
          : state.paused
            ? "PAUSED"
            : "PLAYING"
      );

      GameUI?.setTurn?.(
        state.currentPlayer
      );

      GameUI?.setPlayers?.(
        state.players.map((p, index) => ({
          ...p,
          current: index === state.currentPlayer
        }))
      );

      GameUI?.setScores?.(
        state.players.map(p => p.score)
      );
    } catch (_) {}
  }

  /* =========================================================
     POOL UI
     ========================================================= */

  function updateUI() {
    const current = player();

    if (turnEl) {
      turnEl.textContent =
        state.gameOver
          ? "GAME OVER"
          : current?.name || "PLAYER";
    }

    document
      .querySelectorAll(".player-card")
      .forEach((element, index) => {
        element.classList.toggle(
          "active",
          index === state.currentPlayer
        );
      });

    document
      .querySelectorAll(".player-name")
      .forEach((element, index) => {
        if (state.players[index]) {
          element.textContent =
            state.players[index].name;
        }
      });

    document
      .querySelectorAll(".player-score")
      .forEach((element, index) => {
        if (state.players[index]) {
          element.textContent =
            state.players[index].score;
        }
      });

    const timers =
      document.querySelectorAll(
        ".player-timer span"
      );

    timers.forEach((element, index) => {
      element.textContent =
        index === state.currentPlayer
          ? formatTime(state.timerSeconds)
          : "10:00";
    });

    const statuses = [
      document.getElementById("player1Status"),
      document.getElementById("player2Status")
    ];

    statuses.forEach((element, index) => {
      if (!element) return;

      element.textContent =
        index === state.currentPlayer
          ? current?.type === "ai"
            ? "THINKING"
            : "READY"
          : "WAITING";
    });

    const statGame =
      document.getElementById("statGame");

    const statMode =
      document.getElementById("statMode");

    const statAI =
      document.getElementById("statAI");

    const shotCount =
      document.getElementById("shotCount");

    if (statGame) {
      statGame.textContent =
        state.gameType === "9ball"
          ? "9-Ball"
          : state.gameType === "practice"
            ? "Practice"
            : "8-Ball";
    }

    if (statMode) {
      statMode.textContent =
        {
          pvp: "Player vs Player",
          pvai: "Player vs AI",
          aivai: "AI vs AI",
          challenge: "Challenge"
        }[state.mode] || state.mode;
    }

    if (statAI) {
      statAI.textContent =
        {
          1: "START-UP",
          2: "START-UP+",
          3: "INVESTOR",
          4: "INVESTOR+",
          5: "7FIGURES"
        }[state.aiLevel] || "START-UP";
    }

    if (shotCount) {
      shotCount.textContent =
        String(state.shotCount);
    }

    if (aiStatus) {
      const isAI =
        current?.type === "ai";

      aiStatus.classList.toggle(
        "hidden",
        !isAI
      );

      aiStatus.textContent =
        state.aiThinking
          ? "AI THINKING…"
          : "AI READY";
    }

    if (pauseButton) {
      pauseButton.textContent =
        state.paused
          ? "RESUME"
          : "PAUSE";
    }

    updateTimer();
    updateSharedUI();
  }

  /* =========================================================
     AIM
     ========================================================= */

  function setAim(angle) {
    state.aimAngle = angle;

    const cue = state.cueBall;

    if (!cue) return;

    state.aimX =
      cue.x +
      Math.cos(angle) *
        CONFIG.aimLineLength;

    state.aimY =
      cue.y +
      Math.sin(angle) *
        CONFIG.aimLineLength;

    aimLine();
  }

  function rotate(angle) {
    if (
      state.gameOver ||
      state.shooting ||
      state.aiThinking ||
      state.paused ||
      player()?.type !== "human"
    ) {
      return;
    }

    setAim(state.aimAngle + angle);

    audio("move");
  }

  function aimLine() {
    if (
      !layer ||
      !state.cueBall
    ) {
      return;
    }

    let line =
      document.getElementById(
        "poolAimLine"
      );

    if (!line) {
      line =
        document.createElement("div");

      line.id = "poolAimLine";
      line.className = "aim-line";

      layer.appendChild(line);
    }

    line.style.cssText = `
      position:absolute;
      left:${rx(state.cueBall.x)}px;
      top:${ry(state.cueBall.y)}px;
      width:${CONFIG.aimLineLength * sx()}px;
      height:2px;
      transform-origin:0 50%;
      transform:rotate(${state.aimAngle * 180 / Math.PI}deg);
      pointer-events:none;
      display:block;
    `;

    line.classList.toggle(
      "locked",
      state.lockOn
    );
  }

  function hideAim() {
    const line =
      document.getElementById(
        "poolAimLine"
      );

    if (line) {
      line.style.display = "none";
    }
  }

  /* =========================================================
     TARGETING
     ========================================================= */

  function legalTargets() {
    let available =
      state.balls.filter(
        b =>
          b.number !== 0 &&
          !b.pocketed
      );

    if (state.gameType === "9ball") {
      const lowest =
        available.reduce(
          (lowestBall, b) =>
            !lowestBall ||
            b.number < lowestBall.number
              ? b
              : lowestBall,
          null
        );

      return lowest
        ? [lowest]
        : [];
    }

    return available.filter(
      b => b.number !== 8
    );
  }

  function target() {
    const available =
      legalTargets();

    if (!available.length) {
      return null;
    }

    available.sort(
      (a, b) =>
        dist(state.cueBall, a) -
        dist(state.cueBall, b)
    );

    return available[0];
  }

  function lock() {
    if (
      state.gameOver ||
      state.shooting ||
      state.paused ||
      player()?.type !== "human"
    ) {
      return;
    }

    unlockAudio();

    if (state.lockOn) {
      state.lockOn = false;
      state.lockedTarget = null;

      hideAim();

      msg("LOCK-ON OFF");

      audio("click");

      return;
    }

    const t = target();

    if (!t) {
      msg(
        "No available target.",
        "warning"
      );

      audio("notify");

      return;
    }

    state.lockedTarget = t;
    state.lockOn = true;

    setAim(
      Math.atan2(
        t.y - state.cueBall.y,
        t.x - state.cueBall.x
      )
    );

    msg(
      `LOCKED ON — Ball ${t.number}`
    );

    audio("select");
  }

  /* =========================================================
     POINTER AIMING
     =========================================================
     IMPORTANT:
     Aim from anywhere on the table instead of requiring
     the user to start directly on the cue ball.
     This fixes the touch/mobile aiming problem.
     ========================================================= */

  function pointerPosition(event) {
    if (!interactionSurface) {
      return {
        x: CONFIG.tableWidth / 2,
        y: CONFIG.tableHeight / 2
      };
    }

    const rect =
      interactionSurface.getBoundingClientRect();

    return {
      x: clamp(
        ((event.clientX - rect.left) /
          rect.width) *
          CONFIG.tableWidth,
        0,
        CONFIG.tableWidth
      ),

      y: clamp(
        ((event.clientY - rect.top) /
          rect.height) *
          CONFIG.tableHeight,
        0,
        CONFIG.tableHeight
      )
    };
  }

  function startAim(event) {
    if (
      state.gameOver ||
      state.shooting ||
      state.aiThinking ||
      state.paused ||
      player()?.type !== "human" ||
      !state.cueBall ||
      state.cueBall.pocketed
    ) {
      return;
    }

    unlockAudio();

    /* Ignore controls/buttons sitting above the table. */
    if (
      event.target.closest?.(
        "button,select,input,a"
      )
    ) {
      return;
    }

    state.pointerId =
      event.pointerId;

    state.aiming = true;

    try {
      interactionSurface.setPointerCapture?.(
        event.pointerId
      );
    } catch (_) {}

    moveAim(event);

    event.preventDefault?.();

    audio("select");
  }

  function moveAim(event) {
    if (
      !state.aiming ||
      state.shooting ||
      !state.cueBall
    ) {
      return;
    }

    if (
      state.pointerId !== null &&
      event.pointerId !== undefined &&
      event.pointerId !== state.pointerId
    ) {
      return;
    }

    const p =
      pointerPosition(event);

    setAim(
      Math.atan2(
        p.y - state.cueBall.y,
        p.x - state.cueBall.x
      )
    );

    event.preventDefault?.();
  }

  function endAim(event) {
    if (!state.aiming) return;

    moveAim(event);

    state.aiming = false;
    state.pointerId = null;

    try {
      interactionSurface.releasePointerCapture?.(
        event.pointerId
      );
    } catch (_) {}

    event.preventDefault?.();

    shoot();
  }

  /* =========================================================
     SHOOT
     ========================================================= */

  function shoot() {
    if (
      state.gameOver ||
      state.shooting ||
      state.aiThinking ||
      state.paused ||
      player()?.type !== "human"
    ) {
      return;
    }

    unlockAudio();

    if (
      state.lockOn &&
      state.lockedTarget &&
      !state.lockedTarget.pocketed
    ) {
      setAim(
        Math.atan2(
          state.lockedTarget.y -
            state.cueBall.y,
          state.lockedTarget.x -
            state.cueBall.x
        )
      );
    }

    fire(
      state.aimAngle,
      state.power
    );
  }

  function fire(angle, powerValue) {
    if (
      state.paused ||
      state.gameOver ||
      state.shooting
    ) {
      return;
    }

    const cue =
      state.cueBall;

    if (
      !cue ||
      cue.pocketed
    ) {
      return;
    }

    let shotPower =
      Math.max(
        CONFIG.minPower,
        powerValue
      );

    if (state.breakShot) {
      shotPower =
        Math.max(
          shotPower,
          0.78
        ) *
        CONFIG.breakPowerMultiplier;
    }

    const velocity =
      clamp(
        CONFIG.maxPower *
          shotPower,
        0,
        CONFIG.maxVelocity
      );

    cue.vx =
      Math.cos(angle) *
      velocity;

    cue.vy =
      Math.sin(angle) *
      velocity;

    state.lockOn = false;
    state.lockedTarget = null;

    power(0);

    hideAim();

    state.shooting = true;

    state.shotCount++;

    state.ballsPocketedThisTurn = [];
    state.foulThisTurn = false;
    state.firstBallHit = null;

    stopTimer();

    msg(
      `${player()?.name || "Player"} is shooting...`
    );

    audio("strike");

    updateUI();
  }

  /* =========================================================
     RAILS
     ========================================================= */

  function rails(b) {
    const r = b.radius;

    if (b.x - r < 0) {
      b.x = r;
      b.vx =
        Math.abs(b.vx) *
        CONFIG.railRestitution;

      audio("rail");
    }

    if (
      b.x + r >
      CONFIG.tableWidth
    ) {
      b.x =
        CONFIG.tableWidth - r;

      b.vx =
        -Math.abs(b.vx) *
        CONFIG.railRestitution;

      audio("rail");
    }

    if (b.y - r < 0) {
      b.y = r;
      b.vy =
        Math.abs(b.vy) *
        CONFIG.railRestitution;

      audio("rail");
    }

    if (
      b.y + r >
      CONFIG.tableHeight
    ) {
      b.y =
        CONFIG.tableHeight - r;

      b.vy =
        -Math.abs(b.vy) *
        CONFIG.railRestitution;

      audio("rail");
    }
  }

  /* =========================================================
     BALL COLLISIONS
     ========================================================= */

  function collisions() {
    const active =
      state.balls.filter(
        b => !b.pocketed
      );

    for (
      let i = 0;
      i < active.length;
      i++
    ) {
      for (
        let j = i + 1;
        j < active.length;
        j++
      ) {
        const A = active[i];
        const B = active[j];

        const dx =
          B.x - A.x;

        const dy =
          B.y - A.y;

        let distance =
          Math.hypot(dx, dy);

        const minimum =
          A.radius +
          B.radius;

        if (
          distance >= minimum
        ) {
          continue;
        }

        if (!distance) {
          distance = 0.0001;
        }

        const nx =
          dx / distance;

        const ny =
          dy / distance;

        const overlap =
          minimum - distance;

        A.x -=
          nx *
          overlap *
          0.5;

        A.y -=
          ny *
          overlap *
          0.5;

        B.x +=
          nx *
          overlap *
          0.5;

        B.y +=
          ny *
          overlap *
          0.5;

        const relativeVelocity =
          (B.vx - A.vx) * nx +
          (B.vy - A.vy) * ny;

        if (
          relativeVelocity > 0
        ) {
          continue;
        }

        const impulse =
          -relativeVelocity *
          CONFIG.collisionRestitution;

        A.vx -=
          impulse * nx;

        A.vy -=
          impulse * ny;

        B.vx +=
          impulse * nx;

        B.vy +=
          impulse * ny;

        if (
          state.firstBallHit === null
        ) {
          if (A.number === 0) {
            state.firstBallHit =
              B.number;
          } else if (
            B.number === 0
          ) {
            state.firstBallHit =
              A.number;
          }
        }

        audio("collision");
      }
    }
  }

  /* =========================================================
     POCKET
     ========================================================= */

  function pocket(b) {
    if (b.pocketed) return;

    b.pocketed = true;
    b.vx = 0;
    b.vy = 0;

    state.ballsPocketedThisTurn.push(
      b.number
    );

    if (b.number === 0) {
      state.foulThisTurn = true;

      msg(
        "SCRATCH! Cue ball pocketed.",
        "warning"
      );

      audio("foul");

      return;
    }

    const current =
      player();

    if (current) {
      current.score++;
    }

    if (state.challengeMode) {
      state.challengeScore++;
    }

    msg(
      b.number === 8
        ? "8-BALL POCKETED!"
        : b.number === 9
          ? "9-BALL POCKETED!"
          : `Ball ${b.number} pocketed!`,
      "success"
    );

    audio("pocket");

    try {
      Players?.recordScore?.(
        current?.id,
        1
      );
    } catch (_) {}

    updateUI();
  }

  /* =========================================================
     MOVEMENT
     ========================================================= */

  function moving() {
    return state.balls.some(
      b =>
        !b.pocketed &&
        (
          Math.abs(b.vx) >
            CONFIG.stopVelocity ||
          Math.abs(b.vy) >
            CONFIG.stopVelocity
        )
    );
  }

  /* =========================================================
     PHYSICS
     ========================================================= */

  function physics(dt) {
    const frameScale =
      clamp(
        dt / 16.6667,
        0.35,
        2.5
      );

    for (const b of state.balls) {
      if (b.pocketed) continue;

      b.x +=
        b.vx *
        frameScale;

      b.y +=
        b.vy *
        frameScale;

      const friction =
        Math.pow(
          CONFIG.friction,
          frameScale
        );

      b.vx *= friction;
      b.vy *= friction;

      const speed =
        Math.hypot(
          b.vx,
          b.vy
        );

      if (speed) {
        const resistance =
          CONFIG.rollingResistance *
          frameScale;

        b.vx -=
          (b.vx / speed) *
          resistance;

        b.vy -=
          (b.vy / speed) *
          resistance;
      }

      if (
        Math.abs(b.vx) <
        CONFIG.stopVelocity
      ) {
        b.vx = 0;
      }

      if (
        Math.abs(b.vy) <
        CONFIG.stopVelocity
      ) {
        b.vy = 0;
      }

      rails(b);

      if (pocketed(b)) {
        pocket(b);
      }
    }

    collisions();

    if (!moving()) {
      finishShot();
    }
  }

  /* =========================================================
     CUE BALL RESPOT
     ========================================================= */

  function respot() {
    const cue =
      state.cueBall;

    if (!cue) return;

    cue.pocketed = false;
    cue.vx = 0;
    cue.vy = 0;

    let x = 210;
    let y = 250;
    let attempts = 0;

    while (
      state.balls.some(
        b =>
          b !== cue &&
          !b.pocketed &&
          Math.hypot(
            b.x - x,
            b.y - y
          ) <
            CONFIG.ballRadius * 2.2
      ) &&
      attempts++ < 100
    ) {
      x =
        120 +
        Math.random() * 180;

      y =
        60 +
        Math.random() * 380;
    }

    cue.x = x;
    cue.y = y;

    setAim(
      state.aimAngle
    );

    render();
  }

  /* =========================================================
     FINISH SHOT
     ========================================================= */

  function finishShot() {
    if (!state.shooting) return;

    state.shooting = false;

    if (state.foulThisTurn) {
      player().fouls++;

      audio("foul");

      respot();

      switchPlayer();

      return;
    }

    const objectBallPocketed =
      state.ballsPocketedThisTurn.some(
        number => number !== 0
      );

    if (
      state.gameType === "8ball" &&
      state.balls.some(
        b =>
          b.number === 8 &&
          b.pocketed
      )
    ) {
      endGame(player());
      return;
    }

    if (
      state.gameType === "9ball" &&
      state.balls.some(
        b =>
          b.number === 9 &&
          b.pocketed
      )
    ) {
      endGame(player());
      return;
    }

    if (state.breakShot) {
      state.breakShot = false;

      if (objectBallPocketed) {
        resetTimer();

        msg(
          `${player().name} made the break — continue!`,
          "success"
        );

        startTimer();
      } else {
        switchPlayer();
      }

      return;
    }

    if (objectBallPocketed) {
      resetTimer();
      startTimer();

      msg(
        `${player().name} continues — nice shot!`,
        "success"
      );
    } else {
      switchPlayer();
    }

    updateUI();
  }

  /* =========================================================
     PLAYER SWITCH
     ========================================================= */

  function switchPlayer() {
    if (state.gameOver) return;

    state.currentPlayer =
      state.currentPlayer
        ? 0
        : 1;

    state.ballsPocketedThisTurn = [];
    state.foulThisTurn = false;
    state.firstBallHit = null;

    state.breakShot = false;

    state.lockOn = false;
    state.lockedTarget = null;

    resetTimer();
    updateUI();
    startTimer();

    try {
      Players?.setCurrent?.(
        state.currentPlayer
      );
    } catch (_) {}

    audio("turn");

    const current =
      player();

    if (
      current?.type === "ai"
    ) {
      state.aiThinking = true;

      updateUI();

      msg(
        `${current.name} is thinking...`
      );

      scheduleAI();
    } else {
      state.aiThinking = false;

      updateUI();

      msg(
        `${current?.name || "PLAYER"} — YOUR TURN`,
        "success"
      );
    }
  }

  /* =========================================================
     AI
     ========================================================= */

  function scheduleAI() {
    clearAI();

    state.aiThinking = true;
    updateUI();

    state.aiTimer =
      setTimeout(
        runAI,
        CONFIG.aiDelay
      );
  }

  function clearAI() {
    if (state.aiTimer) {
      clearTimeout(
        state.aiTimer
      );

      state.aiTimer = null;
    }
  }

  function chooseAIShot() {
    const t = target();

    if (!t) return null;

    const level =
      clamp(
        +state.aiLevel,
        1,
        5
      );

    /*
      Higher levels produce less angular error.
      This remains Pool-specific decision logic.
    */

    const accuracy =
      {
        1: 0.22,
        2: 0.16,
        3: 0.10,
        4: 0.055,
        5: 0.025
      }[level] || 0.10;

    const error =
      (Math.random() - 0.5) *
      accuracy;

    const angle =
      Math.atan2(
        t.y - state.cueBall.y,
        t.x - state.cueBall.x
      ) + error;

    const distance =
      dist(
        state.cueBall,
        t
      );

    let shotPower =
      state.breakShot
        ? 0.95
        : 0.38 +
          distance / 1000 +
          level * 0.045;

    shotPower =
      clamp(
        shotPower,
        0.28,
        0.88
      );

    return {
      angle,
      power: shotPower,
      target: t
    };
  }

  function runAI() {
    state.aiTimer = null;

    if (
      state.gameOver ||
      state.shooting ||
      state.paused ||
      player()?.type !== "ai"
    ) {
      state.aiThinking = false;
      updateUI();
      return;
    }

    state.aiThinking = true;
    updateUI();

    let decision = null;

    /*
      Use shared AI engine when available.
      Pool still supplies the legal shot decision.
    */

    try {
      if (
        AI &&
        typeof AI.think === "function"
      ) {
        AI.setGame?.("pool");
        AI.setLevel?.(
          state.aiLevel
        );

        AI.think(
          {
            balls: state.balls,
            currentPlayer:
              state.currentPlayer,
            gameType:
              state.gameType
          },
          {
            legalMoves: () => {
              const shot =
                chooseAIShot();

              return shot
                ? [shot]
                : [];
            }
          }
        );
      }
    } catch (_) {}

    decision =
      chooseAIShot();

    if (!decision) {
      state.aiThinking = false;
      updateUI();
      switchPlayer();
      return;
    }

    const level =
      clamp(
        +state.aiLevel,
        1,
        5
      );

    const thinkDelay =
      Math.min(
        300 +
          (6 - level) * 120 +
          Math.random() * 250,
        CONFIG.aiMaxThinkTime
      );

    state.aiTimer =
      setTimeout(
        () => {
          state.aiTimer = null;

          if (
            state.gameOver ||
            state.paused ||
            player()?.type !== "ai"
          ) {
            state.aiThinking = false;
            updateUI();
            return;
          }

          state.aiThinking = false;

          updateUI();

          if (
            decision.target &&
            !decision.target.pocketed
          ) {
            msg(
              `${player().name} — Ball ${decision.target.number}`
            );
          }

          fire(
            decision.angle,
            decision.power
          );
        },
        thinkDelay
      );
  }

  /* =========================================================
     GAME OVER
     ========================================================= */

  function endGame(winner) {
    state.gameOver = true;
    state.shooting = false;
    state.aiThinking = false;

    clearAI();
    stopTimer();

    hideAim();

    const winnerName =
      winner?.name ||
      "Winner";

    msg(
      `🏆 ${winnerName} WINS!`,
      "success"
    );

    audio("win");

    if (finalScore) {
      finalScore.textContent =
        `${winnerName} wins • Player 1 ${state.players[0]?.score || 0} — Player 2 ${state.players[1]?.score || 0}`;
    }

    try {
      Players?.recordResult?.(
        state.currentPlayer,
        "win"
      );
    } catch (_) {}

    try {
      GameUI?.setStatus?.(
        "GAME OVER"
      );
    } catch (_) {}

    showModal(
      gameOverModal
    );

    updateUI();
  }

  /* =========================================================
     MAIN LOOP
     ========================================================= */

  function loop(timestamp) {
    const delta =
      clamp(
        timestamp -
          state.lastFrame,
        0,
        50
      );

    state.lastFrame =
      timestamp;

    if (
      state.shooting &&
      !state.paused
    ) {
      physics(delta);
    }

    render();

    if (
      state.aiming ||
      state.lockOn
    ) {
      aimLine();
    }

    state.animationFrame =
      requestAnimationFrame(
        loop
      );
  }

  /* =========================================================
     MODALS
     ========================================================= */

  function showModal(element) {
    if (!element) return;

    element.classList.remove(
      "hidden"
    );
  }

  function hideModal(element) {
    if (!element) return;

    element.classList.add(
      "hidden"
    );
  }

  /* =========================================================
     RESET / NEW RACK
     ========================================================= */

  function resetGame() {
    stopTimer();
    clearAI();

    state.gameOver = false;
    state.shooting = false;
    state.aiming = false;
    state.aiThinking = false;

    state.currentPlayer = 0;

    state.breakShot = true;

    state.ballsPocketedThisTurn = [];
    state.foulThisTurn = false;
    state.firstBallHit = null;

    state.lockOn = false;
    state.lockedTarget = null;

    state.shotCount = 0;
    state.challengeScore = 0;

    state.challengeMode =
      state.mode === "challenge";

    state.paused = false;

    state.pointerId = null;

    document.body.classList.remove(
      "game-paused"
    );

    state.power = 0.55;

    configurePlayers();

    if (layer) {
      layer.innerHTML = "";
    }

    createRack();
    render();

    setAim(0);
    power(0.55);

    resetTimer();
    startTimer();

    updateUI();

    hideModal(
      gameOverModal
    );

    msg(
      "PLAYER 1 TURN — BREAK THE RACK!"
    );

    state.lastFrame =
      performance.now();

    if (!state.animationFrame) {
      state.animationFrame =
        requestAnimationFrame(
          loop
        );
    }

    audio("notify");
  }

  function newRack() {
    resetGame();
  }

  /* =========================================================
     PAUSE
     ========================================================= */

  function togglePause() {
    if (state.gameOver) return;

    state.paused =
      !state.paused;

    document.body.classList.toggle(
      "game-paused",
      state.paused
    );

    if (state.paused) {
      stopTimer();

      state.aiming = false;

      msg(
        "GAME PAUSED",
        "warning"
      );

      audio("click");
    } else {
      startTimer();

      updateUI();

      msg(
        `${player().name} — YOUR TURN`,
        "success"
      );

      audio("click");
    }

    updateUI();
  }

  /* =========================================================
     FULLSCREEN
     ========================================================= */

  function toggleFullscreen() {
    const target =
      document.getElementById(
        "poolApp"
      ) ||
      document.documentElement;

    if (!document.fullscreenElement) {
      target
        .requestFullscreen?.()
        .catch(() => {});
    } else {
      document
        .exitFullscreen?.();
    }
  }

  /* =========================================================
     SOUND BUTTON
     ========================================================= */

  function updateSoundButton() {
    if (!soundButton) return;

    let muted = false;

    try {
      muted =
        Audio?.isMuted?.() === true;
    } catch (_) {}

    soundButton.textContent =
      muted
        ? "🔇"
        : "🔊";
  }

  function toggleSound() {
    unlockAudio();

    try {
      if (
        typeof Audio?.toggleMute ===
        "function"
      ) {
        Audio.toggleMute();
      } else if (
        typeof Audio?.mute ===
        "function"
      ) {
        Audio.mute();
      }
    } catch (_) {}

    updateSoundButton();
  }

  /* =========================================================
     THEME
     ========================================================= */

  function changeTheme(value) {
    if (!value) return;

    try {
      if (
        Themes &&
        typeof Themes.set ===
        "function"
      ) {
        Themes.set(value);
      }

      Themes?.setGame?.("pool");
    } catch (_) {}

    try {
      window.ROLYFE_POOL_THEME?.change?.(
        value
      );
    } catch (_) {}

    if (themeSelect) {
      themeSelect.value = value;
    }
  }

  /* =========================================================
     POWER BUTTONS
     ========================================================= */

  document
    .querySelectorAll(
      "[data-power='increase'],.power-plus,#powerPlus,#powerUp"
    )
    .forEach(button => {
      button.addEventListener(
        "click",
        () => {
          unlockAudio();

          power(
            state.power + 0.05
          );

          audio("click");
        }
      );
    });

  document
    .querySelectorAll(
      "[data-power='decrease'],.power-minus,#powerMinus,#powerDown"
    )
    .forEach(button => {
      button.addEventListener(
        "click",
        () => {
          unlockAudio();

          power(
            state.power - 0.05
          );

          audio("click");
        }
      );
    });

  /* =========================================================
     BUTTON EVENTS
     ========================================================= */

  leftButton?.addEventListener(
    "click",
    () => {
      unlockAudio();

      rotate(
        -CONFIG.aimStep *
        Math.PI /
        180
      );
    }
  );

  rightButton?.addEventListener(
    "click",
    () => {
      unlockAudio();

      rotate(
        CONFIG.aimStep *
        Math.PI /
        180
      );
    }
  );

  lockButton?.addEventListener(
    "click",
    lock
  );

  shootButton?.addEventListener(
    "click",
    () => {
      unlockAudio();
      shoot();
    }
  );

  resetButton?.addEventListener(
    "click",
    () => {
      unlockAudio();
      resetGame();
    }
  );

  newRackButton?.addEventListener(
    "click",
    () => {
      unlockAudio();
      newRack();
    }
  );

  pauseButton?.addEventListener(
    "click",
    () => {
      unlockAudio();
      togglePause();
    }
  );

  rulesButton?.addEventListener(
    "click",
    () => {
      unlockAudio();
      showModal(rulesModal);
      audio("select");
    }
  );

  closeRulesButton?.addEventListener(
    "click",
    () => {
      hideModal(rulesModal);
      audio("click");
    }
  );

  playAgainButton?.addEventListener(
    "click",
    () => {
      hideModal(gameOverModal);
      resetGame();
    }
  );

  fullscreenButton?.addEventListener(
    "click",
    toggleFullscreen
  );

  soundButton?.addEventListener(
    "click",
    toggleSound
  );

  themeSelect?.addEventListener(
    "change",
    event => {
      changeTheme(
        event.target.value
      );
    }
  );

  /* =========================================================
     MODE / GAME / AI SELECTS
     ========================================================= */

  modeSelect?.addEventListener(
    "change",
    event => {
      state.mode =
        event.target.value ||
        "pvp";

      resetGame();
    }
  );

  gameSelect?.addEventListener(
    "change",
    event => {
      state.gameType =
        event.target.value ||
        "8ball";

      resetGame();
    }
  );

  aiSelect?.addEventListener(
    "change",
    event => {
      state.aiLevel =
        clamp(
          +event.target.value || 1,
          1,
          5
        );

      resetGame();
    }
  );

  /* =========================================================
     POINTER EVENTS
     =========================================================
     Pointer Events replace separate mouse/touch handlers.
     This provides one reliable input path for:
     - mouse
     - touch
     - stylus
     ========================================================= */

  if (interactionSurface) {
    interactionSurface.style.touchAction =
      "none";

    interactionSurface.style.userSelect =
      "none";

    interactionSurface.addEventListener(
      "pointerdown",
      startAim,
      { passive: false }
    );

    interactionSurface.addEventListener(
      "pointermove",
      moveAim,
      { passive: false }
    );

    interactionSurface.addEventListener(
      "pointerup",
      endAim,
      { passive: false }
    );

    interactionSurface.addEventListener(
      "pointercancel",
      event => {
        state.aiming = false;
        state.pointerId = null;

        try {
          interactionSurface.releasePointerCapture?.(
            event.pointerId
          );
        } catch (_) {}
      },
      { passive: false }
    );
  }

  /* =========================================================
     KEYBOARD
     ========================================================= */

  document.addEventListener(
    "keydown",
    event => {
      if (
        event.target.matches?.(
          "input,select,textarea"
        )
      ) {
        return;
      }

      if (
        event.code === "Space"
      ) {
        event.preventDefault();

        unlockAudio();
        shoot();
      }

      if (
        event.key ===
        "ArrowLeft"
      ) {
        event.preventDefault();

        unlockAudio();

        rotate(
          -CONFIG.aimStep *
          Math.PI /
          180
        );
      }

      if (
        event.key ===
        "ArrowRight"
      ) {
        event.preventDefault();

        unlockAudio();

        rotate(
          CONFIG.aimStep *
          Math.PI /
          180
        );
      }

      if (
        event.key.toLowerCase() ===
        "r"
      ) {
        resetGame();
      }

      if (
        event.key.toLowerCase() ===
        "l"
      ) {
        lock();
      }

      if (
        event.key.toLowerCase() ===
        "p"
      ) {
        togglePause();
      }
    }
  );

  /* =========================================================
     FULLSCREEN
     ========================================================= */

  document.addEventListener(
    "fullscreenchange",
    () => {
      setTimeout(
        () => {
          render();
          aimLine();
        },
        100
      );
    }
  );

  /* =========================================================
     PUBLIC POOL API
     ========================================================= */

  window.ROLYFE_POOL = {
    state,

    resetGame,
    newRack,

    shoot,

    aimLeft: () =>
      rotate(
        -CONFIG.aimStep *
        Math.PI /
        180
      ),

    aimRight: () =>
      rotate(
        CONFIG.aimStep *
        Math.PI /
        180
      ),

    lockOn: lock,

    setPower: value =>
      power(
        clamp(
          +value,
          0,
          1
        )
      ),

    setMode: mode => {
      state.mode =
        mode || "pvp";

      resetGame();
    },

    setGameType: type => {
      state.gameType =
        type || "8ball";

      resetGame();
    },

    setAILevel: level => {
      state.aiLevel =
        clamp(
          +level || 1,
          1,
          5
        );

      resetGame();
    },

    getScore: () =>
      state.players.map(
        p => ({
          name: p.name,
          score: p.score
        })
      ),

    getState: () =>
      state
  };

  /* =========================================================
     INITIAL SETTINGS
     ========================================================= */

  if (modeSelect) {
    state.mode =
      modeSelect.value ||
      "pvp";
  }

  if (gameSelect) {
    state.gameType =
      gameSelect.value ||
      "8ball";
  }

  if (aiSelect) {
    state.aiLevel =
      clamp(
        +aiSelect.value || 1,
        1,
        5
      );
  }

  /* =========================================================
     SHARED SYSTEM INITIALIZATION
     ========================================================= */

  try {
    Themes?.setGame?.("pool");
  } catch (_) {}

  try {
    GameUI?.setGame?.("pool");
  } catch (_) {}

  updateSoundButton();

  /* =========================================================
     START
     ========================================================= */

  resetGame();

  console.log(
    "🎱 RO’Lyfe Pool Engine V3.2 — Shared Systems Connected"
  );
})();
