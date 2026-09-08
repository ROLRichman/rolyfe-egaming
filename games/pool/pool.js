/* =========================================================
   RO'LYFE GAMING™ — POOL ENGINE V3.2
   Replacement for: games/pool/pool.js

   V3.2 FIXES
   ---------------------------------------------------------
   • AI vs AI automatic turn cycle
   • AI Start / Stop control
   • AI turn timer handling
   • Proper 9-Ball diamond rack
   • 1-ball apex / 9-ball center
   • Selector synchronization
   • Cue-stick visual + shot animation
   • Improved mobile touch control
   • Shared audio-engine hooks
   • AI-safe timers / stale AI cancellation
   • Restart / new-rack controls
   ========================================================= */

(() => {
  "use strict";

  /* =========================================================
     CONFIG
     ========================================================= */

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
    aiMaxThinkTime: 1800,

    playerTime: 600,
    challengeTime: 120,

    aimStep: 2.5,
    aimLineLength: 240,

    maxVelocity: 38,

    cueStickLength: 285,
    cueStickWidth: 7,
    cuePullback: 45,
    cueStrikeDistance: 26,
    cueAnimationTime: 115
  };


  /* =========================================================
     DOM
     ========================================================= */

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

  const shootButton =
    $("shootBtn", "[data-action='shoot']");

  const resetButton =
    $("resetBtn", "#resetPool");

  const leftButton =
    $("aimLeft", "[data-action='aim-left']");

  const rightButton =
    $("aimRight", "[data-action='aim-right']");

  const lockButton =
    $("lockAim", "[data-action='lock-on']");

  const interactionSurface =
    table ||
    document.querySelector(".table-surface");

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
    aiEnabled: true,

    aiTimer: null,
    aiToken: 0,

    paused: false,

    lockOn: false,
    lockedTarget: null,

    shotCount: 0,

    cueStick: null,
    cueAnimation: null
  };


  /* =========================================================
     UTILITIES
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
    width:
      table?.clientWidth ||
      CONFIG.tableWidth,

    height:
      table?.clientHeight ||
      CONFIG.tableHeight
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
    `${String(
      Math.floor(Math.max(0, s) / 60)
    ).padStart(2, "0")}:${String(
      Math.max(0, s) % 60
    ).padStart(2, "0")}`;


  /* =========================================================
     AUDIO BRIDGE
     ========================================================= */

  function audio() {
    return (
      window.ROLyfeAudio ||
      window.ROlyfeAudio ||
      null
    );
  }

  function audioCall(name, ...args) {
    const a = audio();

    if (!a) return;

    try {
      if (typeof a[name] === "function") {
        a[name](...args);
      }
    } catch (err) {
      console.warn(
        "RO'Lyfe Pool audio:",
        name,
        err
      );
    }
  }

  function unlockAudio() {
    const a = audio();

    if (!a) return;

    try {
      if (typeof a.unlock === "function") {
        a.unlock();
      }

      if (
        typeof a.init === "function" &&
        !a.initialized
      ) {
        a.init();
      }
    } catch (err) {
      console.warn(
        "RO'Lyfe Audio unlock:",
        err
      );
    }
  }

  function setupAudioUnlock() {

    const unlock = () => {
      unlockAudio();

      document.removeEventListener(
        "pointerdown",
        unlock
      );

      document.removeEventListener(
        "touchstart",
        unlock
      );

      document.removeEventListener(
        "keydown",
        unlock
      );
    };

    document.addEventListener(
      "pointerdown",
      unlock,
      { once: true }
    );

    document.addEventListener(
      "touchstart",
      unlock,
      {
        once: true,
        passive: true
      }
    );

    document.addEventListener(
      "keydown",
      unlock,
      { once: true }
    );
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
     POCKETS
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


  function pocketed(ballObj) {

    if (ballObj.pocketed) return false;

    return pockets().some(p =>
      Math.hypot(
        ballObj.x - p.x,
        ballObj.y - p.y
      ) <= CONFIG.pocketCaptureRadius
    );
  }


  /* =========================================================
     BALL
     ========================================================= */

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

    const aiNames = {
      1: "RO'Lyfe AI — START-UP",
      2: "RO'Lyfe AI — START-UP+",
      3: "RO'Lyfe AI — INVESTOR",
      4: "RO'Lyfe AI — INVESTOR+",
      5: "RO'Lyfe AI — 7FIGURES"
    };

    const aiName =
      aiNames[+state.aiLevel] ||
      "RO'Lyfe AI";

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
          name: aiName,
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
     RACK CREATION
     ========================================================= */

  function createRack() {

    state.balls = [];

    /*
     * Cue ball.
     */
    const cue =
      ball(
        0,
        210,
        250
      );

    state.cueBall = cue;

    state.balls.push(cue);


    /*
     * 9-BALL
     *
     * Standard diamond:
     *
     *             1
     *           2   3
     *         4   9   5
     *           6   7
     *             8
     *
     * The exact rotation may vary in real-world racks,
     * but the important structural rules are:
     *
     * • 1-ball at the apex
     * • 9-ball in the center
     * • 9 balls total
     */
    if (state.gameType === "9ball") {

      const spacing =
        CONFIG.ballRadius * 2.04;

      const rackX = 720;
      const rackY = 250;

      const positions = [

        /*
         * Row 1
         */
        [0, 0],

        /*
         * Row 2
         */
        [1, -0.5],
        [1, 0.5],

        /*
         * Row 3
         */
        [2, -1],
        [2, 0],
        [2, 1],

        /*
         * Row 4
         */
        [3, -0.5],
        [3, 0.5],

        /*
         * Row 5
         */
        [4, 0]

      ];

      /*
       * Fixed 9-ball layout:
       * 1 = apex
       * 9 = center
       *
       * Other balls rotate between remaining spots.
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

      positions.forEach((pos, index) => {

        const row = pos[0];
        const offset = pos[1];

        const x =
          rackX +
          row * spacing * 0.866;

        const y =
          rackY +
          offset * spacing;

        state.balls.push(
          ball(
            numbers[index],
            x,
            y
          )
        );
      });

      return;
    }


    /* =======================================================
       8-BALL
       ======================================================= */

    const spacing =
      CONFIG.ballRadius * 2.04;

    const rackX = 720;
    const rackY = 250;

    /*
     * Standard triangle positions.
     */
    const positions = [];

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

        positions.push({
          row,
          col
        });
      }
    }

    /*
     * Numbers.
     *
     * 8-ball placed in the center.
     */
    const numbers = [
      1,
      2,
      3,
      4,
      8,
      5,
      6,
      7,
      9,
      10,
      11,
      12,
      13,
      14,
      15
    ];

    positions.forEach((pos, index) => {

      const x =
        rackX +
        pos.row *
        spacing *
        0.866;

      const y =
        rackY +
        (
          pos.col -
          pos.row / 2
        ) *
        spacing;

      state.balls.push(
        ball(
          numbers[index],
          x,
          y
        )
      );
    });
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

        b.element.className =
          "ball";

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

        layer.appendChild(
          b.element
        );
      }

      b.element.style.display =
        b.pocketed
          ? "none"
          : "flex";

      if (!b.pocketed) {

        b.element.style.left =
          `${rx(b.x)}px`;

        b.element.style.top =
          `${ry(b.y)}px`;

        b.element.style.transform =
          "translate(-50%,-50%)";
      }
    }

    renderCueStick();
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
          `${Math.round(
            state.power * 100
          )}%`;
      });
  }


  /* =========================================================
     CUE STICK
     ========================================================= */

  function createCueStick() {

    if (!layer) return null;

    let stick =
      document.getElementById(
        "poolCueStick"
      );

    if (!stick) {

      stick =
        document.createElement("div");

      stick.id =
        "poolCueStick";

      stick.className =
        "cue-stick";

      /*
       * Inline presentation so this feature does
       * not require another CSS file.
       */
      stick.style.position =
        "absolute";

      stick.style.height =
        `${CONFIG.cueStickWidth}px`;

      stick.style.width =
        `${CONFIG.cueStickLength}px`;

      stick.style.borderRadius =
        "999px";

      stick.style.transformOrigin =
        "0 50%";

      stick.style.pointerEvents =
        "none";

      stick.style.zIndex =
        "4";

      stick.style.background =
        "linear-gradient(90deg,#c9a66b,#f2e0ad,#fff)";

      stick.style.boxShadow =
        "0 2px 6px rgba(0,0,0,.55)";

      layer.appendChild(stick);
    }

    state.cueStick = stick;

    return stick;
  }


  function renderCueStick() {

    const cue = state.cueBall;

    if (!cue || cue.pocketed) {

      if (state.cueStick) {
        state.cueStick.style.display =
          "none";
      }

      return;
    }

    /*
     * AI does not need a visible cue stick while
     * thinking. It appears for the actual shot.
     */
    const humanTurn =
      player()?.type === "human";

    const visible =
      humanTurn &&
      !state.gameOver &&
      !state.paused &&
      !state.shooting;

    const stick =
      state.cueStick ||
      createCueStick();

    if (!stick) return;

    if (!visible) {

      stick.style.display =
        "none";

      return;
    }

    stick.style.display =
      "block";

    const angle =
      state.aimAngle + Math.PI;

    const pull =
      CONFIG.cuePullback *
      (1 - state.power * 0.25);

    const startX =
      cue.x +
      Math.cos(angle) *
      pull;

    const startY =
      cue.y +
      Math.sin(angle) *
      pull;

    stick.style.left =
      `${rx(startX)}px`;

    stick.style.top =
      `${ry(startY)}px`;

    stick.style.width =
      `${CONFIG.cueStickLength * sx()}px`;

    stick.style.transform =
      `translateY(-50%) rotate(${angle}rad)`;
  }


  function animateCueStrike(angle) {

    const stick =
      state.cueStick ||
      createCueStick();

    if (!stick || !state.cueBall) {
      return;
    }

    const cue =
      state.cueBall;

    const start =
      performance.now();

    const duration =
      CONFIG.cueAnimationTime;

    const originalAngle =
      angle + Math.PI;

    state.cueAnimation = true;

    stick.style.display =
      "block";

    const animate = now => {

      const progress =
        clamp(
          (now - start) /
          duration,
          0,
          1
        );

      /*
       * Pull back -> strike.
       */
      const eased =
        progress < 0.5
          ? progress * 2
          : 1 - (progress - 0.5) * 2;

      const distance =
        CONFIG.cueStrikeDistance *
        (1 - eased);

      const x =
        cue.x +
        Math.cos(originalAngle) *
        distance;

      const y =
        cue.y +
        Math.sin(originalAngle) *
        distance;

      stick.style.left =
        `${rx(x)}px`;

      stick.style.top =
        `${ry(y)}px`;

      stick.style.transform =
        `translateY(-50%) rotate(${originalAngle}rad)`;

      if (progress < 1) {

        requestAnimationFrame(
          animate
        );

      } else {

        state.cueAnimation =
          false;

        if (
          player()?.type !== "human" ||
          state.shooting
        ) {

          stick.style.display =
            "none";
        }
      }
    };

    requestAnimationFrame(
      animate
    );
  }


  /* =========================================================
     TIMER
     ========================================================= */

  function updateTimer() {

    const seconds =
      Math.max(
        0,
        Math.floor(
          state.timerSeconds
        )
      );

    const formatted =
      formatTime(seconds);

    if (timerEl) {
      timerEl.textContent =
        formatted;
    }

    const active =
      document.getElementById(
        `timer${state.currentPlayer}`
      );

    if (active) {
      active.textContent =
        formatted;
    }
  }


  function startTimer() {

    stopTimer();

    if (
      state.gameOver ||
      state.paused
    ) {
      return;
    }

    state.timerInterval =
      setInterval(() => {

        if (
          state.gameOver ||
          state.shooting ||
          state.paused
        ) {
          return;
        }

        /*
         * AI thinking still consumes its own turn timer.
         */
        if (--state.timerSeconds <= 0) {

          state.timerSeconds = 0;

          updateTimer();

          msg(
            `${player().name} ran out of time.`,
            "warning"
          );

          audioCall(
            "countdown"
          );

          cancelAITurn();

          switchPlayer();

        } else {

          updateTimer();

          if (
            state.timerSeconds <= 10 &&
            state.timerSeconds > 0
          ) {
            audioCall(
              "countdown"
            );
          }
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
     AI CONTROL
     ========================================================= */

  function cancelAITurn() {

    state.aiToken++;

    state.aiThinking =
      false;

    if (state.aiTimer) {

      clearTimeout(
        state.aiTimer
      );

      state.aiTimer = null;
    }

    updateUI();
  }


  function shouldRunAI() {

    return (
      !state.gameOver &&
      !state.paused &&
      !state.shooting &&
      state.aiEnabled &&
      player()?.type === "ai"
    );
  }


  function scheduleAI() {

    cancelAITurn();

    if (!shouldRunAI()) {
      return;
    }

    state.aiThinking = true;

    const token =
      state.aiToken;

    updateUI();

    msg(
      `${player().name} is thinking...`
    );

    audioCall("notify");

    state.aiTimer =
      setTimeout(() => {

        if (
          token !== state.aiToken ||
          !shouldRunAI()
        ) {
          return;
        }

        runAI(token);

      }, CONFIG.aiDelay);
  }


  function runAI(token = state.aiToken) {

    if (
      token !== state.aiToken ||
      !shouldRunAI()
    ) {
      return;
    }

    state.aiThinking =
      true;

    updateUI();

    const targetBall =
      target();

    if (!targetBall) {

      state.aiThinking =
        false;

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
     * Higher level = less aim error.
     */
    const accuracy =
      0.80 +
      level * 0.035;

    const error =
      (
        1 - accuracy
      ) *
      (
        Math.random() - 0.5
      ) *
      0.30;

    const angle =
      Math.atan2(
        targetBall.y -
          state.cueBall.y,

        targetBall.x -
          state.cueBall.x
      ) + error;

    let shotPower;

    if (state.breakShot) {

      shotPower =
        0.95;

    } else {

      shotPower =
        clamp(
          0.38 +
          dist(
            state.cueBall,
            targetBall
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

    state.aiTimer =
      setTimeout(() => {

        if (
          token !== state.aiToken ||
          !shouldRunAI()
        ) {
          return;
        }

        state.aiTimer = null;

        state.aiThinking =
          false;

        updateUI();

        /*
         * AI actually fires the shot.
         */
        fire(
          angle,
          shotPower
        );

      }, thinkDelay);
  }


  /*
   * Manual AI Start / Stop.
   */
  function toggleAI() {

    if (
      state.mode !== "aivai"
    ) {
      return;
    }

    if (state.aiThinking) {

      cancelAITurn();

      msg(
        "AI MATCH STOPPED",
        "warning"
      );

      updateAIStartButton();

      return;
    }

    if (
      state.shooting ||
      state.gameOver
    ) {
      return;
    }

    state.aiEnabled = true;

    scheduleAI();

    updateAIStartButton();
  }


  function createAIStartButton() {

    let button =
      document.getElementById(
        "aiStartBtn"
      );

    if (button) {
      return button;
    }

    /*
     * Try to place beside the existing controls.
     */
    const controls =
      document.querySelector(
        ".pool-controls"
      ) ||
      document.querySelector(
        ".game-controls"
      ) ||
      document.querySelector(
        ".control-row"
      );

    if (!controls) {

      button =
        document.createElement("button");

      button.id =
        "aiStartBtn";

      button.className =
        "pool-ai-start";

      button.type =
        "button";

      button.style.position =
        "fixed";

      button.style.right =
        "14px";

      button.style.bottom =
        "92px";

      button.style.zIndex =
        "999";

      button.style.padding =
        "10px 14px";

      button.style.borderRadius =
        "12px";

      button.style.border =
        "1px solid rgba(255,255,255,.2)";

      button.style.background =
        "rgba(5,20,12,.95)";

      button.style.color =
        "#fff";

      button.style.fontWeight =
        "800";

      button.style.boxShadow =
        "0 5px 18px rgba(0,0,0,.35)";

      document.body.appendChild(
        button
      );

    } else {

      button =
        document.createElement("button");

      button.id =
        "aiStartBtn";

      button.className =
        "pool-ai-start";

      button.type =
        "button";

      button.style.margin =
        "8px";

      controls.appendChild(
        button
      );
    }

    button.addEventListener(
      "click",
      toggleAI
    );

    return button;
  }


  function updateAIStartButton() {

    const button =
      document.getElementById(
        "aiStartBtn"
      );

    if (!button) return;

    /*
     * Only show the control in AI vs AI.
     */
    button.style.display =
      state.mode === "aivai"
        ? "inline-flex"
        : "none";

    if (
      state.mode !== "aivai"
    ) {
      return;
    }

    button.textContent =
      state.aiThinking
        ? "⏸ STOP AI"
        : "▶ START AI";
  }


  /* =========================================================
     UI
     ========================================================= */

  function updateUI() {

    const current =
      player();

    if (turnEl) {

      turnEl.textContent =
        state.gameOver
          ? "GAME OVER"
          : current?.name ||
            "PLAYER 1";
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
          ? formatTime(
              state.timerSeconds
            )
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

      if (
        i === state.currentPlayer
      ) {

        e.textContent =
          current?.type === "ai"
            ? (
                state.aiThinking
                  ? "THINKING"
                  : "READY"
              )
            : "READY";

      } else {

        e.textContent =
          "WAITING";
      }
    });


    const statGame =
      document.getElementById(
        "statGame"
      );

    const statMode =
      document.getElementById(
        "statMode"
      );

    const statAI =
      document.getElementById(
        "statAI"
      );

    const shotCount =
      document.getElementById(
        "shotCount"
      );


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
        [
          "",
          "START-UP",
          "START-UP+",
          "INVESTOR",
          "INVESTOR+",
          "7FIGURES"
        ][state.aiLevel] ||
        "START-UP";
    }


    if (shotCount) {

      shotCount.textContent =
        String(
          state.shotCount
        );
    }


    if (aiStatus) {

      aiStatus.classList.toggle(
        "hidden",
        current?.type !== "ai"
      );

      aiStatus.textContent =
        state.aiThinking
          ? "AI THINKING…"
          : "AI READY";
    }


    updateTimer();
    updateAIStartButton();
    renderCueStick();
  }


  /* =========================================================
     AIM
     ========================================================= */

  function setAim(angle) {

    state.aimAngle =
      angle;

    const cue =
      state.cueBall;

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
    renderCueStick();
  }


  function rotate(angle) {

    if (
      state.gameOver ||
      state.shooting ||
      state.aiThinking ||
      player()?.type !== "human"
    ) {
      return;
    }

    setAim(
      state.aimAngle + angle
    );
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

      line.id =
        "poolAimLine";

      line.className =
        "aim-line";

      layer.appendChild(
        line
      );
    }

    line.style.cssText =
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

      line.style.display =
        "none";
    }

    if (state.cueStick) {

      state.cueStick.style.display =
        "none";
    }
  }


  /* =========================================================
     TARGETING
     ========================================================= */

  function legalTargets() {

    const available =
      state.balls.filter(
        b =>
          b.number !== 0 &&
          !b.pocketed
      );

    /*
     * 9-Ball:
     * must contact the lowest-numbered
     * ball remaining.
     */
    if (
      state.gameType === "9ball"
    ) {

      const lowest =
        available.reduce(
          (lowestBall, b) =>
            !lowestBall ||
            b.number <
              lowestBall.number
              ? b
              : lowestBall,
          null
        );

      return lowest
        ? [lowest]
        : [];
    }

    /*
     * Practice can use every object ball.
     */
    if (
      state.gameType === "practice"
    ) {
      return available;
    }

    /*
     * 8-ball:
     * until groups are fully implemented,
     * use all object balls except 8.
     */
    return available.filter(
      b =>
        b.number !== 8
    );
  }


  function target() {

    const available =
      legalTargets();

    if (!available.length) {
      return null;
    }

    /*
     * AI chooses the closest legal target
     * for now.
     */
    return available.sort(
      (a, b) =>
        dist(
          state.cueBall,
          a
        ) -
        dist(
          state.cueBall,
          b
        )
    )[0];
  }


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

      state.lockOn =
        false;

      state.lockedTarget =
        null;

      hideAim();

      msg(
        "LOCK-ON OFF"
      );

      return;
    }

    const t =
      target();

    if (!t) {

      msg(
        "No available target.",
        "warning"
      );

      return;
    }

    state.lockedTarget =
      t;

    state.lockOn =
      true;

    setAim(
      Math.atan2(
        t.y -
          state.cueBall.y,

        t.x -
          state.cueBall.x
      )
    );

    msg(
      `LOCKED ON — Ball ${t.number}`
    );

    audioCall(
      "select"
    );
  }


  /* =========================================================
     POINTER
     ========================================================= */

  function pointer(e) {

    if (!interactionSurface) {

      return {
        x: 0,
        y: 0
      };
    }

    const rect =
      interactionSurface.getBoundingClientRect();

    const touch =
      e.touches?.[0] ||
      e.changedTouches?.[0];

    const clientX =
      touch
        ? touch.clientX
        : e.clientX;

    const clientY =
      touch
        ? touch.clientY
        : e.clientY;

    return {

      x:
        (
          clientX -
          rect.left
        ) /
        rect.width *
        CONFIG.tableWidth,

      y:
        (
          clientY -
          rect.top
        ) /
        rect.height *
        CONFIG.tableHeight
    };
  }


  function startAim(e) {

    if (
      state.gameOver ||
      state.paused ||
      state.shooting ||
      state.aiThinking ||
      player()?.type !== "human" ||
      !state.cueBall
    ) {
      return;
    }

    const p =
      pointer(e);

    /*
     * Only start drag close to cue ball.
     */
    if (
      dist(
        state.cueBall,
        p
      ) >
      CONFIG.ballRadius * 9
    ) {
      return;
    }

    state.aiming =
      true;

    moveAim(e);

    if (e.cancelable) {
      e.preventDefault();
    }
  }


  function moveAim(e) {

    if (!state.aiming) {
      return;
    }

    const p =
      pointer(e);

    setAim(
      Math.atan2(
        p.y -
          state.cueBall.y,

        p.x -
          state.cueBall.x
      )
    );

    if (e.cancelable) {
      e.preventDefault();
    }
  }


  function endAim(e) {

    if (!state.aiming) {
      return;
    }

    moveAim(e);

    state.aiming =
      false;

    shoot();

    if (e.cancelable) {
      e.preventDefault();
    }
  }


  /* =========================================================
     SHOOT
     ========================================================= */

  function shoot() {

    if (
      state.gameOver ||
      state.paused ||
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

    const cue =
      state.cueBall;

    if (
      !cue ||
      cue.pocketed
    ) {
      return;
    }

    /*
     * Ensure audio has been unlocked after
     * a user interaction.
     */
    unlockAudio();

    let speed =
      Math.max(
        CONFIG.minPower,
        p
      );

    if (state.breakShot) {

      speed =
        Math.max(
          speed,
          0.78
        ) *
        CONFIG.breakPowerMultiplier;
    }

    const velocity =
      clamp(
        CONFIG.maxPower *
          speed,

        0,
        CONFIG.maxVelocity
      );

    cue.vx =
      Math.cos(angle) *
      velocity;

    cue.vy =
      Math.sin(angle) *
      velocity;

    state.lockOn =
      false;

    state.lockedTarget =
      null;

    power(0);

    hideAim();

    state.shooting =
      true;

    state.shotCount++;

    state.ballsPocketedThisTurn =
      [];

    state.foulThisTurn =
      false;

    state.firstBallHit =
      null;

    msg(
      `${player().name} is shooting...`
    );

    audioCall(
      "strike"
    );

    audioCall(
      "cue"
    );

    animateCueStrike(
      angle
    );
  }


  /* =========================================================
     RAILS
     ========================================================= */

  function rails(b) {

    const r =
      b.radius;

    if (
      b.x - r < 0
    ) {

      b.x = r;

      b.vx =
        Math.abs(b.vx) *
        CONFIG.railRestitution;

      audioCall(
        "rail"
      );

      audioCall(
        "cushion"
      );
    }

    if (
      b.x + r >
      CONFIG.tableWidth
    ) {

      b.x =
        CONFIG.tableWidth -
        r;

      b.vx =
        -Math.abs(b.vx) *
        CONFIG.railRestitution;

      audioCall(
        "rail"
      );

      audioCall(
        "cushion"
      );
    }

    if (
      b.y - r < 0
    ) {

      b.y = r;

      b.vy =
        Math.abs(b.vy) *
        CONFIG.railRestitution;

      audioCall(
        "rail"
      );

      audioCall(
        "cushion"
      );
    }

    if (
      b.y + r >
      CONFIG.tableHeight
    ) {

      b.y =
        CONFIG.tableHeight -
        r;

      b.vy =
        -Math.abs(b.vy) *
        CONFIG.railRestitution;

      audioCall(
        "rail"
      );

      audioCall(
        "cushion"
      );
    }
  }


  /* =========================================================
     COLLISIONS
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

        const A =
          active[i];

        const B =
          active[j];

        const dx =
          B.x - A.x;

        const dy =
          B.y - A.y;

        let d =
          Math.hypot(
            dx,
            dy
          );

        const minimum =
          A.radius +
          B.radius;

        if (
          d >= minimum
        ) {
          continue;
        }

        if (!d) {
          d = 0.0001;
        }

        const nx =
          dx / d;

        const ny =
          dy / d;

        const overlap =
          minimum - d;

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
          (
            B.vx -
            A.vx
          ) *
          nx +

          (
            B.vy -
            A.vy
          ) *
          ny;

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

        /*
         * First ball hit tracking.
         */
        if (
          state.firstBallHit === null
        ) {

          if (
            A.number === 0
          ) {

            state.firstBallHit =
              B.number;

          } else if (
            B.number === 0
          ) {

            state.firstBallHit =
              A.number;
          }
        }

        audioCall(
          "collision"
        );

        audioCall(
          "hit"
        );
      }
    }
  }


  /* =========================================================
     POCKET
     ========================================================= */

  function pocket(b) {

    if (b.pocketed) {
      return;
    }

    b.pocketed =
      true;

    b.vx =
      0;

    b.vy =
      0;

    state.ballsPocketedThisTurn.push(
      b.number
    );

    audioCall(
      "pocket"
    );

    audioCall(
      "sink"
    );

    if (
      b.number === 0
    ) {

      state.foulThisTurn =
        true;

      msg(
        "SCRATCH! Cue ball pocketed.",
        "warning"
      );

      audioCall(
        "foul"
      );

      audioCall(
        "scratch"
      );

      return;
    }

    player().score++;

    if (
      state.challengeMode
    ) {
      state.challengeScore++;
    }

    if (
      b.number === 8
    ) {

      msg(
        "8-BALL POCKETED!",
        "success"
      );

    } else if (
      b.number === 9
    ) {

      msg(
        "9-BALL POCKETED!",
        "success"
      );

    } else {

      msg(
        `Ball ${b.number} pocketed!`,
        "success"
      );
    }

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

    for (
      const b of state.balls
    ) {

      if (
        b.pocketed
      ) {
        continue;
      }

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

      b.vx *=
        friction;

      b.vy *=
        friction;

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
          b.vx /
          speed *
          resistance;

        b.vy -=
          b.vy /
          speed *
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

      if (
        pocketed(b)
      ) {

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

    if (!cue) {
      return;
    }

    cue.pocketed =
      false;

    cue.vx =
      0;

    cue.vy =
      0;

    let x = 210;
    let y = 250;

    let tries = 0;

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
      tries++ < 100
    ) {

      x =
        120 +
        Math.random() *
        180;

      y =
        60 +
        Math.random() *
        380;
    }

    cue.x =
      x;

    cue.y =
      y;

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

    state.shooting =
      false;

    /*
     * Scratch.
     */
    if (
      state.foulThisTurn
    ) {

      player().fouls++;

      respot();

      audioCall(
        "turn"
      );

      switchPlayer();

      return;
    }

    const objectBallPocketed =
      state.ballsPocketedThisTurn.some(
        n => n !== 0
      );


    /* =======================================================
       8-BALL
       ======================================================= */

    if (
      state.gameType === "8ball" &&
      state.balls.some(
        b =>
          b.number === 8 &&
          b.pocketed
      )
    ) {

      endGame(
        player()
      );

      return;
    }


    /* =======================================================
       9-BALL
       ======================================================= */

    if (
      state.gameType === "9ball" &&
      state.balls.some(
        b =>
          b.number === 9 &&
          b.pocketed
      )
    ) {

      /*
       * The current implementation already restricts
       * targeting to the lowest numbered ball.
       *
       * Therefore a pocketed 9 represents the winning shot.
       */
      endGame(
        player()
      );

      return;
    }


    /* =======================================================
       BREAK
       ======================================================= */

    if (
      state.breakShot
    ) {

      state.breakShot =
        false;

      if (
        objectBallPocketed
      ) {

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


    /* =======================================================
       NORMAL TURN
       ======================================================= */

    if (
      objectBallPocketed
    ) {

      resetTimer();

      msg(
        `${player().name} continues — nice shot!`,
        "success"
      );

      /*
       * IMPORTANT:
       * If this player is AI, continue AI immediately.
       */
      if (
        player().type === "ai"
      ) {

        scheduleAI();
      }

    } else {

      switchPlayer();
    }
  }


  /* =========================================================
     SWITCH PLAYER
     ========================================================= */

  function switchPlayer() {

    if (
      state.gameOver
    ) {
      return;
    }

    cancelAITurn();

    state.currentPlayer =
      state.currentPlayer
        ? 0
        : 1;

    state.ballsPocketedThisTurn =
      [];

    state.foulThisTurn =
      false;

    state.firstBallHit =
      null;

    state.breakShot =
      false;

    state.lockOn =
      false;

    state.lockedTarget =
      null;

    resetTimer();

    updateUI();

    startTimer();

    audioCall(
      "turn"
    );

    if (
      player().type === "ai"
    ) {

      /*
       * THIS IS THE IMPORTANT AI-VS-AI FIX.
       *
       * Whenever the turn changes to an AI,
       * the AI is automatically scheduled.
       */
      if (
        state.aiEnabled
      ) {

        scheduleAI();

      } else {

        state.aiThinking =
          false;

        updateUI();

        msg(
          `${player().name} — AI STOPPED`,
          "warning"
        );
      }

    } else {

      state.aiThinking =
        false;

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

    cancelAITurn();

    state.gameOver =
      true;

    state.shooting =
      false;

    state.aiThinking =
      false;

    stopTimer();

    hideAim();

    const winnerName =
      winner?.name ||
      "Winner";

    msg(
      `🏆 ${winnerName} WINS!`,
      "success"
    );

    audioCall(
      "win"
    );

    audioCall(
      "victory"
    );

    if (finalScore) {

      finalScore.textContent =
        `${winnerName} wins • ` +
        `Player 1 ${state.players[0]?.score || 0} — ` +
        `Player 2 ${state.players[1]?.score || 0}`;
    }

    showModal(
      gameOverModal
    );

    updateUI();
  }


  /* =========================================================
     MAIN LOOP
     ========================================================= */

  function loop(ts) {

    const delta =
      clamp(
        ts -
          state.lastFrame,

        0,
        50
      );

    state.lastFrame =
      ts;

    if (
      state.shooting
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

    cancelAITurn();

    stopTimer();

    state.gameOver =
      false;

    state.shooting =
      false;

    state.aiming =
      false;

    state.aiThinking =
      false;

    state.currentPlayer =
      0;

    state.breakShot =
      true;

    state.shotCount =
      0;

    state.ballsPocketedThisTurn =
      [];

    state.foulThisTurn =
      false;

    state.firstBallHit =
      null;

    state.lockOn =
      false;

    state.lockedTarget =
      null;

    state.challengeScore =
      0;

    state.challengeMode =
      state.mode ===
      "challenge";

    state.paused =
      false;

    state.aiEnabled =
      true;

    document.body.classList.remove(
      "game-paused"
    );

    state.power =
      0.55;

    configurePlayers();

    if (layer) {

      layer.innerHTML =
        "";
    }

    state.cueStick =
      null;

    createRack();

    render();

    setAim(0);

    power(0.55);

    resetTimer();

    updateUI();

    hideModal(
      gameOverModal
    );

    msg(
      "PLAYER 1 TURN — BREAK THE RACK!"
    );

    state.lastFrame =
      performance.now();

    if (
      !state.animationFrame
    ) {

      state.animationFrame =
        requestAnimationFrame(
          loop
        );
    }

    /*
     * IMPORTANT:
     *
     * AI vs AI starts automatically.
     */
    if (
      state.mode === "aivai"
    ) {

      state.currentPlayer =
        0;

      resetTimer();

      updateUI();

      scheduleAI();
    }

    /*
     * Player vs AI begins with human,
     * so AI waits until Player 1 passes.
     */
  }


  /* =========================================================
     NEW RACK
     ========================================================= */

  function newRack() {

    cancelAITurn();

    hideModal(
      gameOverModal
    );

    stopTimer();

    state.gameOver =
      false;

    state.shooting =
      false;

    state.aiThinking =
      false;

    state.currentPlayer =
      0;

    state.breakShot =
      true;

    state.ballsPocketedThisTurn =
      [];

    state.foulThisTurn =
      false;

    state.firstBallHit =
      null;

    state.lockOn =
      false;

    state.lockedTarget =
      null;

    state.shotCount =
      0;

    state.challengeScore =
      0;

    state.paused =
      false;

    state.aiEnabled =
      true;

    document.body.classList.remove(
      "game-paused"
    );

    configurePlayers();

    if (layer) {

      layer.innerHTML =
        "";
    }

    state.cueStick =
      null;

    createRack();

    render();

    setAim(0);

    power(0.55);

    resetTimer();

    updateUI();

    msg(
      "PLAYER 1 TURN — BREAK THE RACK!"
    );

    /*
     * AI vs AI automatically starts again.
     */
    if (
      state.mode === "aivai"
    ) {

      scheduleAI();
    }
  }


  /* =========================================================
     PAUSE
     ========================================================= */

  function togglePause() {

    if (
      state.gameOver
    ) {
      return;
    }

    state.paused =
      !state.paused;

    document.body.classList.toggle(
      "game-paused",
      state.paused
    );

    if (
      state.paused
    ) {

      /*
       * Do not destroy AI state.
       */
      stopTimer();

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

      msg(
        `${player().name} — YOUR TURN`,
        "success"
      );

      if (pauseButton) {
        pauseButton.textContent =
          "PAUSE";
      }

      /*
       * Resume AI if its turn.
       */
      if (
        player()?.type === "ai" &&
        !state.shooting
      ) {

        scheduleAI();
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
     SOUND BUTTON
     ========================================================= */

  function toggleSound() {

    unlockAudio();

    const a =
      audio();

    if (a) {

      try {

        if (
          typeof a.toggleMute ===
          "function"
        ) {

          a.toggleMute();

          return;
        }

        if (
          typeof a.mute ===
          "function"
        ) {

          a.mute();

          document.body.classList.add(
            "sound-muted"
          );

          if (soundButton) {
            soundButton.textContent =
              "🔇";
          }

          return;
        }

      } catch (err) {

        console.warn(
          "Sound toggle:",
          err
        );
      }
    }

    /*
     * Visual fallback.
     */
    document.body.classList.toggle(
      "sound-muted"
    );

    if (soundButton) {

      soundButton.textContent =
        document.body.classList.contains(
          "sound-muted"
        )
          ? "🔇"
          : "🔊";
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
            state.power +
            0.05
          );

          audioCall(
            "click"
          );
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
            state.power -
            0.05
          );

          audioCall(
            "click"
          );
        }
      );
    });


  /* =========================================================
     BUTTON EVENTS
     ========================================================= */

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
    () => {

      unlockAudio();

      shoot();
    }
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
      showModal(
        rulesModal
      )
  );


  closeRulesButton?.addEventListener(
    "click",
    () =>
      hideModal(
        rulesModal
      )
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
    toggleSound
  );


  /* =========================================================
     SELECTORS
     ========================================================= */

  modeSelect?.addEventListener(
    "change",
    () => {

      state.mode =
        modeSelect.value ||
        "pvp";

      resetGame();
    }
  );


  gameSelect?.addEventListener(
    "change",
    () => {

      state.gameType =
        gameSelect.value ||
        "8ball";

      resetGame();
    }
  );


  aiSelect?.addEventListener(
    "change",
    () => {

      state.aiLevel =
        +aiSelect.value ||
        1;

      resetGame();
    }
  );


  /* =========================================================
     THEME
     ========================================================= */

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
     TOUCH / MOUSE
     ========================================================= */

  if (interactionSurface) {

    interactionSurface.style.touchAction =
      "none";

    interactionSurface.style.userSelect =
      "none";

    interactionSurface.style.webkitUserSelect =
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

        if (
          state.aiming
        ) {

          moveAim(e);
        }
      }
    );


    interactionSurface.addEventListener(
      "touchstart",
      startAim,
      {
        passive: false
      }
    );


    interactionSurface.addEventListener(
      "touchmove",
      moveAim,
      {
        passive: false
      }
    );


    interactionSurface.addEventListener(
      "touchend",
      endAim,
      {
        passive: false
      }
    );


    /*
     * Prevent the browser from trying to scroll
     * while the user is controlling the pool table.
     */
    interactionSurface.addEventListener(
      "touchcancel",
      e => {

        state.aiming =
          false;

        if (e.cancelable) {
          e.preventDefault();
        }
      },
      {
        passive: false
      }
    );
  }


  /* =========================================================
     KEYBOARD
     ========================================================= */

  document.addEventListener(
    "keydown",
    e => {

      if (
        e.code === "Space"
      ) {

        e.preventDefault();

        shoot();

        return;
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

        return;
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

        return;
      }

      if (
        e.key.toLowerCase() === "r"
      ) {

        /*
         * R only works when a text field is not active.
         */
        if (
          !(
            document.activeElement &&
            (
              document.activeElement.tagName ===
                "INPUT" ||

              document.activeElement.tagName ===
                "SELECT" ||

              document.activeElement.tagName ===
                "TEXTAREA"
            )
          )
        ) {

          resetGame();
        }

        return;
      }

      if (
        e.key.toLowerCase() === "l"
      ) {

        lock();

        return;
      }

      if (
        e.key.toLowerCase() === "p"
      ) {

        togglePause();

        return;
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

          renderCueStick();

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
        mode;

      resetGame();
    },

    setGameType: type => {

      state.gameType =
        type;

      resetGame();
    },

    setAILevel: level => {

      state.aiLevel =
        +level;

      resetGame();
    },

    startAI: () => {

      state.aiEnabled =
        true;

      scheduleAI();
    },

    stopAI: () => {

      state.aiEnabled =
        false;

      cancelAITurn();

      updateUI();
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
     INITIALIZE
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


  /*
   * Create AI control once.
   */
  createAIStartButton();

  /*
   * Prepare browser audio unlock.
   */
  setupAudioUnlock();

  /*
   * Start game.
   */
  resetGame();


  console.log(
    "🎱 RO'Lyfe Pool Engine V3.2 loaded"
  );

})();
