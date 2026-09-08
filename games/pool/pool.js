/* =========================================================
   RO'LYFE GAMING™ — POOL ENGINE V3.2
   Replacement for: games/pool/pool.js

   V3.2 FIXES:
   - AI vs AI now automatically starts
   - AI turns correctly hand off to the next AI
   - Prevents duplicate AI thinking timers
   - AI turn state is synchronized with UI
   - Human controls remain protected from AI turns
   - Preserves existing Pool gameplay structure
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

  const $ = (a, b) =>
    document.getElementById(a) ||
    document.querySelector(b);

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

  const newRackButton =
    document.getElementById("newRackBtn");

  const pauseButton =
    document.getElementById("pauseBtn");

  const rulesButton =
    document.getElementById("rulesBtn");

  const closeRulesButton =
    document.getElementById("closeRulesBtn");

  const rulesModal =
    document.getElementById("rulesModal");

  const gameOverModal =
    document.getElementById("gameOverModal");

  const playAgainButton =
    document.getElementById("playAgainBtn");

  const finalScore =
    document.getElementById("finalScore");

  const fullscreenButton =
    document.getElementById("fullscreenBtn");

  const soundButton =
    document.getElementById("soundBtn");

  const themeSelect =
    document.getElementById("poolTheme");

  const aiStatus =
    document.getElementById("aiStatus");

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
    aiTimeout: null,

    paused: false,

    lockOn: false,
    lockedTarget: null,

    shotCount: 0
  };

  /* =========================================================
     HELPERS
     ========================================================= */

  const clamp = (v, min, max) =>
    Math.max(min, Math.min(max, v));

  const dist = (a, b) =>
    Math.hypot(b.x - a.x, b.y - a.y);

  const norm = (x, y) => {
    const d = Math.hypot(x, y) || 1;
    return {
      x: x / d,
      y: y / d
    };
  };

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

  const formatTime = s =>
    `${String(Math.floor(Math.max(0, s) / 60)).padStart(2, "0")}:${String(Math.max(0, s) % 60).padStart(2, "0")}`;

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

  function pocketed(ball) {
    if (ball.pocketed) return false;

    return pockets().some(p =>
      Math.hypot(
        ball.x - p.x,
        ball.y - p.y
      ) <= CONFIG.pocketCaptureRadius
    );
  }

  function ball(number, x, y) {
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

    const aiName = () =>
      ({
        1: "RO'Lyfe AI — START-UP",
        2: "RO'Lyfe AI — INVESTOR",
        3: "RO'Lyfe AI — EMG",
        4: "RO'Lyfe AI — ACE",
        5: "RO'Lyfe AI — 7FIGURES"
      }[+state.aiLevel] || "RO'Lyfe AI");

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
          name: aiName(),
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
  }

  /* =========================================================
     RACK
     ========================================================= */

  function createRack() {

    state.balls = [];

    const cue = ball(0, 210, 250);

    state.cueBall = cue;
    state.balls.push(cue);

    const spacing =
      CONFIG.ballRadius * 2.04;

    const rackX = 720;
    const rackY = 250;

    let n = 1;

    for (let row = 0; row < 5; row++) {

      for (let col = 0; col <= row; col++) {

        if (n > 15) break;

        state.balls.push(
          ball(
            n,
            rackX + row * spacing * 0.866,
            rackY + (col - row / 2) * spacing
          )
        );

        n++;
      }
    }

    if (state.gameType === "9ball") {
      state.balls =
        state.balls.filter(
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

        b.element =
          document.createElement("div");

        b.element.className = "ball";

        b.element.dataset.ball =
          b.number;

        if (b.number === 0) {

          b.element.classList.add(
            "white",
            "cue"
          );

        } else {

          b.element.classList.add(
            `ball-${b.number}`
          );

          b.element.textContent =
            b.number;

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

        b.element.style.left =
          `${rx(b.x)}px`;

        b.element.style.top =
          `${ry(b.y)}px`;

        b.element.style.transform =
          "translate(-50%,-50%)";
      }
    }
  }

  /* =========================================================
     POWER
     ========================================================= */

  function power(v) {

    state.power =
      clamp(+v, 0, 1);

    if (powerFill) {

      powerFill.style.width =
        `${state.power * 100}%`;
    }

    document
      .querySelectorAll(".power-value")
      .forEach(e => {

        e.textContent =
          `${Math.round(state.power * 100)}%`;
      });
  }

  /* =========================================================
     TIMER
     ========================================================= */

  function updateTimer() {

    const s =
      Math.max(
        0,
        Math.floor(state.timerSeconds)
      );

    if (timerEl) {
      timerEl.textContent =
        formatTime(s);
    }

    const active =
      document.getElementById(
        `timer${state.currentPlayer}`
      );

    if (active) {
      active.textContent =
        formatTime(s);
    }
  }

  function startTimer() {

    stopTimer();

    state.timerInterval =
      setInterval(() => {

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

          msg(
            `${player().name} ran out of time.`,
            "warning"
          );

          switchPlayer();

        } else {

          updateTimer();
        }

      }, 1000);
  }

  function stopTimer() {

    if (state.timerInterval) {

      clearInterval(
        state.timerInterval
      );

      state.timerInterval = null;
    }
  }

  function resetTimer() {

    state.timerSeconds =
      state.challengeMode
        ? CONFIG.challengeTime
        : CONFIG.playerTime;

    updateTimer();
  }

  /* =========================================================
     UI
     ========================================================= */

  function updateUI() {

    if (turnEl) {

      turnEl.textContent =
        state.gameOver
          ? "GAME OVER"
          : player()?.name || "";
    }

    document
      .querySelectorAll(".player-card")
      .forEach((e, i) => {

        e.classList.toggle(
          "active",
          i === state.currentPlayer
        );
      });

    document
      .querySelectorAll(".player-name")
      .forEach((e, i) => {

        if (state.players[i]) {
          e.textContent =
            state.players[i].name;
        }
      });

    document
      .querySelectorAll(".player-score")
      .forEach((e, i) => {

        if (state.players[i]) {
          e.textContent =
            state.players[i].score;
        }
      });

    const timers =
      document.querySelectorAll(
        ".player-timer span"
      );

    timers.forEach((e, i) => {

      e.textContent =
        i === state.currentPlayer
          ? formatTime(state.timerSeconds)
          : "10:00";
    });

    const statuses = [
      document.getElementById(
        "player1Status"
      ),
      document.getElementById(
        "player2Status"
      )
    ];

    statuses.forEach((e, i) => {

      if (!e) return;

      e.textContent =
        i === state.currentPlayer
          ? (
              player()?.type === "ai"
                ? "THINKING"
                : "READY"
            )
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
        }[state.mode] ||
        state.mode;
    }

    if (statAI) {

      statAI.textContent =
        (
          [
            "",
            "START-UP",
            "BEGINNER",
            "INVESTOR",
            "ADVANCED",
            "7FIGURES"
          ][state.aiLevel]
        ) || "START-UP";
    }

    if (shotCount) {

      shotCount.textContent =
        String(state.shotCount);
    }

    if (aiStatus) {

      const isAI =
        player()?.type === "ai";

      aiStatus.classList.toggle(
        "hidden",
        !isAI
      );

      aiStatus.textContent =
        state.aiThinking
          ? "AI THINKING…"
          : "AI READY";
    }

    updateTimer();
  }

  /* =========================================================
     AIM
     ========================================================= */

  function setAim(a) {

    state.aimAngle = a;

    const c =
      state.cueBall;

    if (!c) return;

    state.aimX =
      c.x +
      Math.cos(a) *
      CONFIG.aimLineLength;

    state.aimY =
      c.y +
      Math.sin(a) *
      CONFIG.aimLineLength;

    aimLine();
  }

  function rotate(a) {

    if (
      state.gameOver ||
      state.shooting ||
      state.aiThinking ||
      player()?.type !== "human"
    ) {
      return;
    }

    setAim(
      state.aimAngle + a
    );
  }

  function aimLine() {

    if (
      !layer ||
      !state.cueBall
    ) {
      return;
    }

    let l =
      document.getElementById(
        "poolAimLine"
      );

    if (!l) {

      l =
        document.createElement("div");

      l.id =
        "poolAimLine";

      l.className =
        "aim-line";

      layer.appendChild(l);
    }

    l.style.cssText =
      `
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

    l.classList.toggle(
      "locked",
      state.lockOn
    );
  }

  function hideAim() {

    const l =
      document.getElementById(
        "poolAimLine"
      );

    if (l) {
      l.style.display = "none";
    }
  }

  /* =========================================================
     TARGETING
     ========================================================= */

  function legalTargets() {

    let a =
      state.balls.filter(
        b =>
          b.number !== 0 &&
          !b.pocketed
      );

    if (state.gameType === "9ball") {

      const n =
        a.reduce(
          (x, b) =>
            !x || b.number < x.number
              ? b
              : x,
          null
        );

      return n ? [n] : [];
    }

    return a.filter(
      b => b.number !== 8
    );
  }

  function target() {

    const a =
      legalTargets();

    return (
      a.sort(
        (x, y) =>
          dist(state.cueBall, x) -
          dist(state.cueBall, y)
      )[0] ||
      null
    );
  }

  /* =========================================================
     LOCK ON
     ========================================================= */

  function lock() {

    if (
      state.gameOver ||
      state.shooting ||
      state.aiThinking ||
      player()?.type !== "human"
    ) {
      return;
    }

    if (state.lockOn) {

      state.lockOn = false;
      state.lockedTarget = null;

      hideAim();

      msg("Lock-On OFF");

      return;
    }

    const t = target();

    if (!t) {

      msg(
        "No available target.",
        "warning"
      );

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
  }

  /* =========================================================
     POINTER AIM
     ========================================================= */

  function pointer(e) {

    const r =
      interactionSurface.getBoundingClientRect();

    const t =
      e.touches?.[0] ||
      e.changedTouches?.[0];

    return {
      x:
        (
          (t ? t.clientX : e.clientX) -
          r.left
        ) /
        r.width *
        CONFIG.tableWidth,

      y:
        (
          (t ? t.clientY : e.clientY) -
          r.top
        ) /
        r.height *
        CONFIG.tableHeight
    };
  }

  function startAim(e) {

    if (
      state.gameOver ||
      state.shooting ||
      state.aiThinking ||
      player()?.type !== "human" ||
      !state.cueBall
    ) {
      return;
    }

    const p =
      pointer(e);

    if (
      dist(
        state.cueBall,
        p
      ) >
      CONFIG.ballRadius * 7
    ) {
      return;
    }

    state.aiming = true;

    moveAim(e);

    if (e.cancelable) {
      e.preventDefault();
    }
  }

  function moveAim(e) {

    if (!state.aiming) return;

    const p =
      pointer(e);

    setAim(
      Math.atan2(
        p.y - state.cueBall.y,
        p.x - state.cueBall.x
      )
    );

    if (e.cancelable) {
      e.preventDefault();
    }
  }

  function endAim(e) {

    if (!state.aiming) return;

    moveAim(e);

    state.aiming = false;

    shoot();

    if (e.cancelable) {
      e.preventDefault();
    }
  }

  /* =========================================================
     SHOOTING
     ========================================================= */

  function shoot() {

    if (
      state.gameOver ||
      state.shooting ||
      state.aiThinking ||
      player()?.type !== "human"
    ) {
      return;
    }

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

  function fire(angle, p) {

    if (
      state.paused ||
      state.gameOver ||
      state.shooting
    ) {
      return;
    }

    const c =
      state.cueBall;

    if (!c || c.pocketed) {
      return;
    }

    let sp =
      Math.max(
        CONFIG.minPower,
        p
      );

    if (state.breakShot) {

      sp =
        Math.max(sp, 0.78) *
        CONFIG.breakPowerMultiplier;
    }

    const v =
      clamp(
        CONFIG.maxPower * sp,
        0,
        CONFIG.maxVelocity
      );

    c.vx =
      Math.cos(angle) * v;

    c.vy =
      Math.sin(angle) * v;

    state.lockOn = false;
    state.lockedTarget = null;

    power(0);

    hideAim();

    state.shooting = true;

    state.shotCount++;

    state.ballsPocketedThisTurn = [];
    state.foulThisTurn = false;
    state.firstBallHit = null;

    msg(
      `${player().name} is shooting...`
    );

    updateUI();
  }

  /* =========================================================
     RAILS
     ========================================================= */

  function rails(b) {

    const r =
      b.radius;

    if (b.x - r < 0) {

      b.x = r;

      b.vx =
        Math.abs(b.vx) *
        CONFIG.railRestitution;
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
    }

    if (b.y - r < 0) {

      b.y = r;

      b.vy =
        Math.abs(b.vy) *
        CONFIG.railRestitution;
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
    }
  }

  /* =========================================================
     COLLISIONS
     ========================================================= */

  function collisions() {

    const a =
      state.balls.filter(
        b => !b.pocketed
      );

    for (
      let i = 0;
      i < a.length;
      i++
    ) {

      for (
        let j = i + 1;
        j < a.length;
        j++
      ) {

        const A = a[i];
        const B = a[j];

        const dx =
          B.x - A.x;

        const dy =
          B.y - A.y;

        let d =
          Math.hypot(dx, dy);

        const m =
          A.radius + B.radius;

        if (d >= m) continue;

        if (!d) {
          d = 0.0001;
        }

        const nx =
          dx / d;

        const ny =
          dy / d;

        const overlap =
          m - d;

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

        const rel =
          (B.vx - A.vx) * nx +
          (B.vy - A.vy) * ny;

        if (rel > 0) continue;

        const imp =
          -rel *
          CONFIG.collisionRestitution;

        A.vx -=
          imp * nx;

        A.vy -=
          imp * ny;

        B.vx +=
          imp * nx;

        B.vy +=
          imp * ny;

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

    state.ballsPocketedThisTurn
      .push(b.number);

    if (b.number === 0) {

      state.foulThisTurn = true;

      msg(
        "SCRATCH! Cue ball pocketed.",
        "warning"
      );

      return;
    }

    player().score++;

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

    const fs =
      clamp(
        dt / 16.6667,
        0.35,
        2.5
      );

    for (const b of state.balls) {

      if (b.pocketed) continue;

      b.x +=
        b.vx * fs;

      b.y +=
        b.vy * fs;

      const f =
        Math.pow(
          CONFIG.friction,
          fs
        );

      b.vx *= f;
      b.vy *= f;

      const s =
        Math.hypot(
          b.vx,
          b.vy
        );

      if (s) {

        const r =
          CONFIG.rollingResistance *
          fs;

        b.vx -=
          (b.vx / s) * r;

        b.vy -=
          (b.vy / s) * r;
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

    const c =
      state.cueBall;

    if (!c) return;

    c.pocketed = false;

    c.vx = 0;
    c.vy = 0;

    let x = 210;
    let y = 250;

    let tries = 0;

    while (
      state.balls.some(
        b =>
          b !== c &&
          !b.pocketed &&
          Math.hypot(
            b.x - x,
            b.y - y
          ) <
          CONFIG.ballRadius * 2.2
      ) &&
      tries++ < 100
    ) {

      x =
        120 +
        Math.random() * 180;

      y =
        60 +
        Math.random() * 380;
    }

    c.x = x;
    c.y = y;

    setAim(
      state.aimAngle
    );

    render();
  }

  /* =========================================================
     FINISH SHOT
     ========================================================= */

  function finishShot() {

    if (!state.shooting) {
      return;
    }

    state.shooting = false;

    if (state.foulThisTurn) {

      player().fouls++;

      respot();

      switchPlayer();

      return;
    }

    const objects =
      state.ballsPocketedThisTurn
        .some(
          n => n !== 0
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

      if (objects) {

        resetTimer();

        msg(
          `${player().name} made the break — continue!`,
          "success"
        );

      } else {

        switchPlayer();
      }

      return;
    }

    if (objects) {

      resetTimer();

      msg(
        `${player().name} continues — nice shot!`,
        "success"
      );

      /* =====================================================
         IMPORTANT:
         If this player is AI, allow the AI to continue
         after making a legal shot.
         ===================================================== */

      if (player().type === "ai") {
        scheduleAITurn();
      }

    } else {

      switchPlayer();
    }

    updateUI();
  }

  /* =========================================================
     AI TIMER CONTROL
     ========================================================= */

  function clearAITimer() {

    if (state.aiTimeout) {

      clearTimeout(
        state.aiTimeout
      );

      state.aiTimeout = null;
    }
  }

  /* =========================================================
     AI TURN SCHEDULER
     ========================================================= */

  function scheduleAITurn() {

    clearAITimer();

    if (
      state.gameOver ||
      state.paused ||
      state.shooting ||
      player()?.type !== "ai"
    ) {
      return;
    }

    state.aiThinking = true;

    updateUI();

    msg(
      `${player().name} is thinking...`
    );

    state.aiTimeout =
      setTimeout(
        () => {

          state.aiTimeout = null;

          runAI();

        },
        CONFIG.aiDelay
      );
  }

  /* =========================================================
     SWITCH PLAYER
     ========================================================= */

  function switchPlayer() {

    if (state.gameOver) {
      return;
    }

    clearAITimer();

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

    if (
      player()?.type === "ai"
    ) {

      scheduleAITurn();

    } else {

      state.aiThinking = false;

      updateUI();

      msg(
        `${player().name} — YOUR TURN`,
        "success"
      );
    }
  }

  /* =========================================================
     END GAME
     ========================================================= */

  function endGame(winner) {

    clearAITimer();

    state.gameOver = true;
    state.shooting = false;
    state.aiThinking = false;

    stopTimer();

    hideAim();

    const winnerName =
      winner?.name ||
      "Winner";

    msg(
      `🏆 ${winnerName} WINS!`,
      "success"
    );

    if (finalScore) {

      finalScore.textContent =
        `${winnerName} wins • Player 1 ${state.players[0]?.score || 0} — Player 2 ${state.players[1]?.score || 0}`;
    }

    showModal(
      gameOverModal
    );

    updateUI();
  }

  /* =========================================================
     AI ENGINE
     ========================================================= */

  function runAI() {

    if (
      state.gameOver ||
      state.paused ||
      state.shooting ||
      player()?.type !== "ai"
    ) {

      state.aiThinking = false;

      updateUI();

      return;
    }

    state.aiThinking = true;

    updateUI();

    const t =
      target();

    if (!t) {

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

    /*
     * Higher level = smaller aiming error.
     */
    const accuracy =
      0.80 +
      level * 0.035;

    const error =
      (1 - accuracy) *
      (Math.random() - 0.5) *
      0.3;

    const angle =
      Math.atan2(
        t.y - state.cueBall.y,
        t.x - state.cueBall.x
      ) + error;

    let p;

    if (state.breakShot) {

      p = 0.95;

    } else {

      p =
        clamp(
          0.38 +
          dist(
            state.cueBall,
            t
          ) / 1000 +
          level * 0.045,
          0.28,
          0.88
        );
    }

    const thinkDelay =
      Math.min(
        300 +
        (6 - level) * 120 +
        Math.random() * 250,
        CONFIG.aiMaxThinkTime
      );

    clearAITimer();

    state.aiTimeout =
      setTimeout(
        () => {

          state.aiTimeout = null;

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

          fire(
            angle,
            p
          );

        },
        thinkDelay
      );
  }

  /* =========================================================
     GAME LOOP
     ========================================================= */

  function loop(ts) {

    const d =
      clamp(
        ts - state.lastFrame,
        0,
        50
      );

    state.lastFrame = ts;

    if (
      state.shooting &&
      !state.paused
    ) {

      physics(d);
    }

    render();

    if (
      state.aiming ||
      state.lockOn
    ) {

      aimLine();
    }

    state.animationFrame =
      requestAnimationFrame(loop);
  }

  /* =========================================================
     MODALS
     ========================================================= */

  function showModal(el) {

    if (el) {
      el.classList.remove(
        "hidden"
      );
    }
  }

  function hideModal(el) {

    if (el) {
      el.classList.add(
        "hidden"
      );
    }
  }

  /* =========================================================
     RESET GAME
     ========================================================= */

  function resetGame() {

    clearAITimer();

    stopTimer();

    state.gameOver = false;
    state.shooting = false;
    state.aiming = false;
    state.aiThinking = false;

    state.currentPlayer = 0;

    state.breakShot = true;

    state.shotCount = 0;

    state.ballsPocketedThisTurn = [];
    state.foulThisTurn = false;
    state.firstBallHit = null;

    state.lockOn = false;
    state.lockedTarget = null;

    state.challengeScore = 0;

    state.challengeMode =
      state.mode === "challenge";

    state.paused = false;

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

    /*
     * ========================================================
     * V3.2 CRITICAL FIX
     *
     * If the selected mode starts with an AI player,
     * immediately hand control to the AI.
     *
     * This fixes AI vs AI starting on:
     * AI Alpha — THINKING
     * while never actually taking a shot.
     * ========================================================
     */

    if (
      player()?.type === "ai"
    ) {

      scheduleAITurn();
    }
  }

  /* =========================================================
     NEW RACK
     ========================================================= */

  function newRack() {

    clearAITimer();

    if (state.gameOver) {
      hideModal(gameOverModal);
    }

    stopTimer();

    state.gameOver = false;
    state.shooting = false;
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

    state.paused = false;

    document.body.classList.remove(
      "game-paused"
    );

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

    msg(
      "PLAYER 1 TURN — BREAK THE RACK!"
    );

    /*
     * Also start AI automatically
     * when New Rack is used in AI vs AI.
     */
    if (
      player()?.type === "ai"
    ) {

      scheduleAITurn();
    }
  }

  /* =========================================================
     PAUSE
     ========================================================= */

  function togglePause() {

    if (state.gameOver) {
      return;
    }

    state.paused =
      !state.paused;

    document.body.classList.toggle(
      "game-paused",
      state.paused
    );

    if (state.paused) {

      stopTimer();

      /*
       * Do not destroy the AI decision.
       * Just prevent it from firing while paused.
       */
      msg(
        "GAME PAUSED",
        "warning"
      );

      if (pauseButton) {
        pauseButton.textContent =
          "RESUME";
      }

    } else {

      startTimer();

      updateUI();

      if (pauseButton) {
        pauseButton.textContent =
          "PAUSE";
      }

      if (
        player()?.type === "ai" &&
        !state.shooting
      ) {

        scheduleAITurn();

      } else {

        msg(
          `${player().name} — YOUR TURN`,
          "success"
        );
      }
    }
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

    if (
      !document.fullscreenElement
    ) {

      target
        .requestFullscreen?.()
        .catch(() => {});

    } else {

      document
        .exitFullscreen?.();
    }
  }

  /* =========================================================
     BUTTONS
     ========================================================= */

  document
    .querySelectorAll(
      "[data-power='increase'],.power-plus,#powerPlus,#powerUp"
    )
    .forEach(b =>
      b.addEventListener(
        "click",
        () =>
          power(
            state.power + 0.05
          )
      )
    );

  document
    .querySelectorAll(
      "[data-power='decrease'],.power-minus,#powerMinus,#powerDown"
    )
    .forEach(b =>
      b.addEventListener(
        "click",
        () =>
          power(
            state.power - 0.05
          )
      )
    );

  leftButton?.addEventListener(
    "click",
    () =>
      rotate(
        -CONFIG.aimStep *
        Math.PI /
        180
      )
  );

  rightButton?.addEventListener(
    "click",
    () =>
      rotate(
        CONFIG.aimStep *
        Math.PI /
        180
      )
  );

  lockButton?.addEventListener(
    "click",
    lock
  );

  shootButton?.addEventListener(
    "click",
    shoot
  );

  resetButton?.addEventListener(
    "click",
    resetGame
  );

  newRackButton?.addEventListener(
    "click",
    newRack
  );

  pauseButton?.addEventListener(
    "click",
    togglePause
  );

  rulesButton?.addEventListener(
    "click",
    () =>
      showModal(rulesModal)
  );

  closeRulesButton?.addEventListener(
    "click",
    () =>
      hideModal(rulesModal)
  );

  playAgainButton?.addEventListener(
    "click",
    () => {

      hideModal(
        gameOverModal
      );

      resetGame();
    }
  );

  fullscreenButton?.addEventListener(
    "click",
    toggleFullscreen
  );

  soundButton?.addEventListener(
    "click",
    () => {

      document.body.classList.toggle(
        "sound-muted"
      );

      soundButton.textContent =
        document.body.classList.contains(
          "sound-muted"
        )
          ? "🔇"
          : "🔊";
    }
  );

  themeSelect?.addEventListener(
    "change",
    () => {

      if (
        window.ROLYFE_POOL_THEME?.change
      ) {

        window.ROLYFE_POOL_THEME.change(
          themeSelect.value
        );
      }
    }
  );

  if (
    themeSelect &&
    window.ROLYFE_POOL_THEME?.load
  ) {

    themeSelect.value =
      window.ROLYFE_POOL_THEME.load() ||
      themeSelect.value;
  }

  /* =========================================================
     TABLE TOUCH / MOUSE
     ========================================================= */

  if (interactionSurface) {

    interactionSurface.style.touchAction =
      "none";

    interactionSurface.addEventListener(
      "mousedown",
      startAim
    );

    interactionSurface.addEventListener(
      "mousemove",
      moveAim
    );

    interactionSurface.addEventListener(
      "mouseup",
      endAim
    );

    interactionSurface.addEventListener(
      "mouseleave",
      e => {

        if (state.aiming) {
          moveAim(e);
        }
      }
    );

    interactionSurface.addEventListener(
      "touchstart",
      startAim,
      { passive: false }
    );

    interactionSurface.addEventListener(
      "touchmove",
      moveAim,
      { passive: false }
    );

    interactionSurface.addEventListener(
      "touchend",
      endAim,
      { passive: false }
    );
  }

  /* =========================================================
     KEYBOARD
     ========================================================= */

  document.addEventListener(
    "keydown",
    e => {

      if (e.code === "Space") {

        e.preventDefault();

        shoot();
      }

      if (
        e.key === "ArrowLeft"
      ) {

        e.preventDefault();

        rotate(
          -CONFIG.aimStep *
          Math.PI /
          180
        );
      }

      if (
        e.key === "ArrowRight"
      ) {

        e.preventDefault();

        rotate(
          CONFIG.aimStep *
          Math.PI /
          180
        );
      }

      if (
        e.key.toLowerCase() === "r"
      ) {

        resetGame();
      }

      if (
        e.key.toLowerCase() === "l"
      ) {

        lock();
      }

      if (
        e.key.toLowerCase() === "p"
      ) {

        togglePause();
      }
    }
  );

  /* =========================================================
     FULLSCREEN RESIZE
     ========================================================= */

  document.addEventListener(
    "fullscreenchange",
    () => {

      if (fullscreenButton) {

        fullscreenButton.textContent =
          "⛶";
      }

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
     PUBLIC API
     ========================================================= */

  window.ROLYFE_POOL = {

    state,

    resetGame,

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

    setPower: v =>
      power(
        clamp(
          +v,
          0,
          1
        )
      ),

    setMode: m => {

      state.mode = m;

      resetGame();
    },

    setGameType: t => {

      state.gameType = t;

      resetGame();
    },

    setAILevel: l => {

      state.aiLevel = +l;

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
      +aiSelect.value ||
      1;
  }

  /* =========================================================
     START
     ========================================================= */

  resetGame();

})();
