/* =========================================================
   RO'LYFE GAMING™ — POOL ENGINE V3.1
   =========================================================
   PHASE 1:
   • Stronger cue-ball break
   • Improved ball impact
   • Better rolling/friction
   • Frame-rate-aware physics
   • Six-pocket detection
   • Improved aiming
   • Aim left/right controls
   • Lock-on aim assist foundation
   • Better power control
   • AI shot reliability
   • AI difficulty accuracy
   • Reliable turn transitions
   • Scratch handling
   • Mobile touch support
   • Existing RO'Lyfe Pool HTML compatibility

   Existing file:
   games/pool/pool.js
   ========================================================= */

(() => {
  "use strict";

  /* =======================================================
     CONFIGURATION
     ======================================================= */

  const CONFIG = {

    /* Virtual table dimensions */
    tableWidth: 1000,
    tableHeight: 500,

    /* Ball */
    ballRadius: 14,

    /* Physics */
    friction: 0.992,
    rollingResistance: 0.0008,
    stopVelocity: 0.045,

    /* Cue power */
    minPower: 0.12,
    maxPower: 34,
    breakPowerMultiplier: 1.35,

    /* Collision */
    collisionRestitution: 0.94,
    railRestitution: 0.88,

    /* Pockets */
    pocketRadius: 34,
    pocketCaptureRadius: 29,

    /* Timing */
    aiDelay: 850,
    shotSettleDelay: 250,

    playerTime: 600,
    challengeTime: 120,

    /* Aiming */
    aimStep: 2.5,
    aimLineLength: 240,

    /* AI */
    aiMaxThinkTime: 1800,

    /* Safety */
    maxVelocity: 38,
    maxBalls: 16

  };


  /* =======================================================
     DOM
     ======================================================= */

  const app =
    document.getElementById("poolApp") ||
    document.getElementById("pool-app") ||
    document.body;

  const table =
    document.querySelector(".pool-table") ||
    document.getElementById("poolTable");

  const ballLayer =
    document.querySelector(".ball-layer") ||
    document.getElementById("ballLayer");

  const powerFill =
    document.querySelector(".power-fill") ||
    document.getElementById("powerFill");

  const messageEl =
    document.querySelector(".pool-message") ||
    document.getElementById("poolMessage");

  const turnEl =
    document.querySelector(".turn-value") ||
    document.getElementById("turnValue");

  const timerEl =
    document.querySelector(".pool-timer") ||
    document.getElementById("poolTimer");

  const modeSelect =
    document.getElementById("poolMode") ||
    document.getElementById("modeSelect");

  const gameSelect =
    document.getElementById("poolGame") ||
    document.getElementById("gameType");

  const aiLevelSelect =
    document.getElementById("poolAILevel") ||
    document.getElementById("aiLevel");

  const shootButton =
    document.getElementById("shootBtn") ||
    document.querySelector("[data-action='shoot']");

  const resetButton =
    document.getElementById("resetPool") ||
    document.getElementById("resetBtn");

  /* Existing arrows from HTML if present */
  const aimLeftButton =
    document.getElementById("aimLeft") ||
    document.getElementById("aimLeftBtn") ||
    document.querySelector("[data-action='aim-left']");

  const aimRightButton =
    document.getElementById("aimRight") ||
    document.getElementById("aimRightBtn") ||
    document.querySelector("[data-action='aim-right']");

  const lockButton =
    document.getElementById("lockAim") ||
    document.getElementById("lockOnBtn") ||
    document.querySelector("[data-action='lock-on']");


  /* =======================================================
     STATE
     ======================================================= */

  const state = {

    gameType: "8ball",

    mode: "pvp",

    aiLevel: 1,

    balls: [],

    currentPlayer: 0,

    players: [
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
    ],

    shooting: false,

    aiming: false,

    cueBall: null,

    aimAngle: 0,

    aimX: 0,

    aimY: 0,

    power: 0.55,

    powerDirection: 1,

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

    lockOn: false,

    lockedTarget: null,

    shotCount: 0,

    initialized: false

  };


  /* =======================================================
     BALL COLORS
     ======================================================= */

  const BALL_COLORS = {

    0: "white",

    1: "ball-1",
    2: "ball-2",
    3: "ball-3",
    4: "ball-4",
    5: "ball-5",
    6: "ball-6",
    7: "ball-7",
    8: "ball-8",

    9: "ball-9",
    10: "ball-10",
    11: "ball-11",
    12: "ball-12",
    13: "ball-13",
    14: "ball-14",
    15: "ball-15"

  };


  /* =======================================================
     UTILITIES
     ======================================================= */

  function clamp(value, min, max) {

    return Math.max(
      min,
      Math.min(max, value)
    );

  }


  function distance(a, b) {

    return Math.hypot(
      b.x - a.x,
      b.y - a.y
    );

  }


  function normalize(x, y) {

    const length =
      Math.hypot(x, y);

    if (!length) {

      return {
        x: 1,
        y: 0
      };

    }

    return {
      x: x / length,
      y: y / length
    };

  }


  function setMessage(text, type = "") {

    if (!messageEl) return;

    messageEl.textContent = text;

    messageEl.className =
      "pool-message" +
      (type ? ` ${type}` : "");

  }


  /* =======================================================
     TABLE SIZE / SCALING
     ======================================================= */

  function getTableSize() {

    if (!table) {

      return {
        width: CONFIG.tableWidth,
        height: CONFIG.tableHeight
      };

    }

    return {

      width:
        table.clientWidth ||
        CONFIG.tableWidth,

      height:
        table.clientHeight ||
        CONFIG.tableHeight

    };

  }


  function scaleX() {

    return (
      getTableSize().width /
      CONFIG.tableWidth
    );

  }


  function scaleY() {

    return (
      getTableSize().height /
      CONFIG.tableHeight
    );

  }


  function renderX(x) {

    return x * scaleX();

  }


  function renderY(y) {

    return y * scaleY();

  }


  /* =======================================================
     SIX POCKETS
     ======================================================= */

  function getPockets() {

    const w =
      CONFIG.tableWidth;

    const h =
      CONFIG.tableHeight;

    return [

      {
        id: "top-left",
        x: 0,
        y: 0
      },

      {
        id: "top-middle",
        x: w / 2,
        y: 0
      },

      {
        id: "top-right",
        x: w,
        y: 0
      },

      {
        id: "bottom-left",
        x: 0,
        y: h
      },

      {
        id: "bottom-middle",
        x: w / 2,
        y: h
      },

      {
        id: "bottom-right",
        x: w,
        y: h
      }

    ];

  }


  function getNearestPocket(ball) {

    const pockets =
      getPockets();

    let best = null;

    let bestDistance =
      Infinity;

    for (const pocket of pockets) {

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

    return best;

  }


  function checkPocket(ball) {

    if (ball.pocketed) return false;

    const pockets =
      getPockets();

    for (const pocket of pockets) {

      const d =
        Math.hypot(
          ball.x - pocket.x,
          ball.y - pocket.y
        );

      if (
        d <=
        CONFIG.pocketCaptureRadius
      ) {

        return true;

      }

    }

    return false;

  }


  /* =======================================================
     BALL CREATION
     ======================================================= */

  function createBall(number, x, y) {

    return {

      number,

      x,
      y,

      vx: 0,
      vy: 0,

      radius:
        CONFIG.ballRadius,

      pocketed: false,

      element: null,

      lastCollision: 0

    };

  }


  /* =======================================================
     RACK
     ======================================================= */

  function createRack() {

    state.balls = [];

    state.cueBall = null;

    const cue =
      createBall(
        0,
        210,
        CONFIG.tableHeight / 2
      );

    state.cueBall = cue;

    state.balls.push(cue);


    const rackX = 720;

    const rackY =
      CONFIG.tableHeight / 2;

    const spacing =
      CONFIG.ballRadius * 2.04;

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

        if (number > 15) break;

        const x =
          rackX +
          row *
          spacing *
          0.866;

        const y =
          rackY +
          (
            col -
            row / 2
          ) *
          spacing;

        state.balls.push(
          createBall(
            number,
            x,
            y
          )
        );

        number++;

      }

    }


    if (
      state.gameType ===
      "9ball"
    ) {

      state.balls =
        state.balls.filter(
          ball =>
            ball.number <= 9
        );

    }

    state.cueBall =
      state.balls.find(
        ball =>
          ball.number === 0
      );

  }


  /* =======================================================
     BALL DOM
     ======================================================= */

  function createBallElement(ball) {

    const element =
      document.createElement("div");

    element.className =
      "ball";

    if (
      ball.number === 0
    ) {

      element.classList.add(
        "white",
        "cue"
      );

    } else {

      element.classList.add(
        BALL_COLORS[ball.number]
      );

      element.textContent =
        ball.number;

      /*
       * Helpful metadata for CSS
       * and future UI.
       */

      element.dataset.group =
        ball.number <= 7
          ? "solid"
          : ball.number === 8
            ? "eight"
            : "stripe";

    }

    element.dataset.ball =
      ball.number;

    if (ballLayer) {

      ballLayer.appendChild(
        element
      );

    }

    ball.element =
      element;

    return element;

  }


  /* =======================================================
     RENDER
     ======================================================= */

  function renderBalls() {

    if (!ballLayer) return;

    for (
      const ball of state.balls
    ) {

      if (!ball.element) {

        createBallElement(ball);

      }

      if (ball.pocketed) {

        ball.element.style.display =
          "none";

        continue;

      }

      ball.element.style.display =
        "flex";

      ball.element.style.left =
        `${renderX(ball.x)}px`;

      ball.element.style.top =
        `${renderY(ball.y)}px`;

      /*
       * Keep CSS transforms available
       * for future ball animation.
       */

      ball.element.style.transform =
        "translate(-50%, -50%)";

    }

  }


  /* =======================================================
     RESET
     ======================================================= */

  function resetGame() {

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

    state.challengeScore = 0;

    state.lockOn = false;

    state.lockedTarget = null;

    state.power = 0.55;

    state.challengeMode =
      state.mode === "challenge";

    state.timerSeconds =
      state.challengeMode
        ? CONFIG.challengeTime
        : CONFIG.playerTime;

    configurePlayers();

    createRack();

    if (ballLayer) {

      ballLayer.innerHTML = "";

    }

    renderBalls();

    initializeAim();

    setPower(
      state.power
    );

    startTimer();

    updateUI();

    setMessage(
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

  }


  /* =======================================================
     PLAYER CONFIGURATION
     ======================================================= */

  function configurePlayers() {

    if (
      state.mode === "pvp"
    ) {

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

    else if (
      state.mode === "pvai"
    ) {

      state.players = [

        {
          name: "Player 1",
          type: "human",
          score: 0,
          group: null,
          fouls: 0
        },

        {
          name:
            aiLevelName(),
          type: "ai",
          score: 0,
          group: null,
          fouls: 0
        }

      ];

    }

    else if (
      state.mode === "aivai"
    ) {

      state.players = [

        {
          name:
            "RO'Lyfe AI Alpha",
          type: "ai",
          score: 0,
          group: null,
          fouls: 0
        },

        {
          name:
            "RO'Lyfe AI Beta",
          type: "ai",
          score: 0,
          group: null,
          fouls: 0
        }

      ];

    }

    else {

      state.players = [

        {
          name:
            "Challenge Player",
          type: "human",
          score: 0,
          group: null,
          fouls: 0
        },

        {
          name:
            "Challenge",
          type: "system",
          score: 0,
          group: null,
          fouls: 0
        }

      ];

    }

  }


  function aiLevelName() {

    switch (
      Number(state.aiLevel)
    ) {

      case 1:
        return "RO'Lyfe AI — START-UP";

      case 2:
        return "RO'Lyfe AI — INVESTOR";

      case 3:
        return "RO'Lyfe AI — EMG";

      case 4:
        return "RO'Lyfe AI — ACE";

      case 5:
        return "RO'Lyfe AI — 7FIGURES";

      default:
        return "RO'Lyfe AI";

    }

  }


  /* =======================================================
     TIMER
     ======================================================= */

  function startTimer() {

    stopTimer();

    state.timerInterval =
      setInterval(
        () => {

          if (
            state.gameOver ||
            state.shooting ||
            state.aiThinking
          ) {

            return;

          }

          state.timerSeconds--;

          updateTimer();

          if (
            state.timerSeconds <= 0
          ) {

            handleTimeout();

          }

        },
        1000
      );

  }


  function stopTimer() {

    if (
      state.timerInterval
    ) {

      clearInterval(
        state.timerInterval
      );

      state.timerInterval = null;

    }

  }


  function resetTurnTimer() {

    state.timerSeconds =
      state.challengeMode
        ? CONFIG.challengeTime
        : CONFIG.playerTime;

    updateTimer();

  }


  function updateTimer() {

    if (!timerEl) return;

    const seconds =
      Math.max(
        0,
        Math.floor(
          state.timerSeconds
        )
      );

    const minutes =
      Math.floor(
        seconds / 60
      );

    const secs =
      seconds % 60;

    timerEl.textContent =
      `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

    timerEl.classList.toggle(
      "warning",
      seconds <= 30
    );

    timerEl.classList.toggle(
      "danger",
      seconds <= 10
    );

  }


  function handleTimeout() {

    if (state.shooting) return;

    setMessage(
      `${currentPlayer().name} ran out of time.`,
      "warning"
    );

    switchPlayer();

  }


  /* =======================================================
     CURRENT PLAYER
     ======================================================= */

  function currentPlayer() {

    return state.players[
      state.currentPlayer
    ];

  }


  function switchPlayer() {

    if (state.gameOver) return;

    state.currentPlayer =
      state.currentPlayer === 0
        ? 1
        : 0;

    state.ballsPocketedThisTurn =
      [];

    state.foulThisTurn =
      false;

    state.firstBallHit =
      null;

    state.breakShot = false;

    state.lockedTarget = null;

    state.lockOn = false;

    resetTurnTimer();

    updateUI();

    const player =
      currentPlayer();

    if (
      player.type === "ai"
    ) {

      setTimeout(
        runAI,
        CONFIG.aiDelay
      );

    } else {

      setMessage(
        `${player.name} — YOUR TURN`,
        "success"
      );

    }

  }


  /* =======================================================
     UI
     ======================================================= */

  function updateUI() {

    const player =
      currentPlayer();

    if (turnEl) {

      turnEl.textContent =
        `${player.name} — YOUR TURN`;

    }

    document
      .querySelectorAll(
        ".player-card"
      )
      .forEach(
        (card, index) => {

          card.classList.toggle(
            "active",
            index ===
            state.currentPlayer
          );

        }
      );


    document
      .querySelectorAll(
        ".player-name"
      )
      .forEach(
        (element, index) => {

          if (
            state.players[index]
          ) {

            element.textContent =
              state.players[index].name;

          }

        }
      );


    document
      .querySelectorAll(
        ".player-score"
      )
      .forEach(
        (element, index) => {

          if (
            state.players[index]
          ) {

            element.textContent =
              state.players[index].score;

          }

        }
      );


    updateTimer();

  }


  /* =======================================================
     AIM INITIALIZATION
     ======================================================= */

  function initializeAim() {

    const cue =
      state.cueBall;

    if (!cue) return;

    state.aimAngle = 0;

    state.aimX =
      cue.x + 300;

    state.aimY =
      cue.y;

    hideAimLine();

  }


  function setAimAngle(angle) {

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

    updateAimLine();

  }


  function rotateAim(amount) {

    if (
      state.gameOver ||
      state.shooting ||
      currentPlayer().type !== "human"
    ) {

      return;

    }

    state.aimAngle +=
      amount;

    setAimAngle(
      state.aimAngle
    );

  }


  /* =======================================================
     POINTER POSITION
     ======================================================= */

  function getPointerPosition(event) {

    if (!ballLayer) {

      return {
        x: 0,
        y: 0
      };

    }

    const rect =
      ballLayer.getBoundingClientRect();

    const touch =
      event.touches &&
      event.touches.length
        ? event.touches[0]
        : event.changedTouches &&
          event.changedTouches.length
          ? event.changedTouches[0]
          : null;

    const clientX =
      touch
        ? touch.clientX
        : event.clientX;

    const clientY =
      touch
        ? touch.clientY
        : event.clientY;

    return {

      x:
        ((clientX - rect.left) /
          rect.width) *
        CONFIG.tableWidth,

      y:
        ((clientY - rect.top) /
          rect.height) *
        CONFIG.tableHeight

    };

  }


  /* =======================================================
     AIMING
     ======================================================= */

  function startAim(event) {

    if (
      state.gameOver ||
      state.shooting ||
      state.aiThinking
    ) {

      return;

    }

    if (
      currentPlayer().type !==
      "human"
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

    const pointer =
      getPointerPosition(event);

    /*
     * Allow aiming from anywhere
     * reasonably close to cue ball.
     */

    if (
      distance(
        cue,
        pointer
      ) >
      CONFIG.ballRadius * 7
    ) {

      return;

    }

    state.aiming = true;

    updateAimFromPointer(
      pointer
    );

    if (
      event.cancelable
    ) {

      event.preventDefault();

    }

  }


  function moveAim(event) {

    if (!state.aiming) return;

    const pointer =
      getPointerPosition(event);

    updateAimFromPointer(
      pointer
    );

    if (
      event.cancelable
    ) {

      event.preventDefault();

    }

  }


  function endAim(event) {

    if (!state.aiming) return;

    const pointer =
      getPointerPosition(event);

    updateAimFromPointer(
      pointer
    );

    state.aiming = false;

    shootFromAim();

    if (
      event.cancelable
    ) {

      event.preventDefault();

    }

  }


  function updateAimFromPointer(pointer) {

    const cue =
      state.cueBall;

    if (!cue) return;

    const direction =
      normalize(
        pointer.x - cue.x,
        pointer.y - cue.y
      );

    state.aimAngle =
      Math.atan2(
        direction.y,
        direction.x
      );

    state.aimX =
      cue.x +
      direction.x *
      CONFIG.aimLineLength;

    state.aimY =
      cue.y +
      direction.y *
      CONFIG.aimLineLength;

    updateAimLine();

  }


  /* =======================================================
     LOCK-ON
     ======================================================= */

  function toggleLockOn() {

    if (
      state.gameOver ||
      state.shooting ||
      currentPlayer().type !== "human"
    ) {

      return;

    }

    if (state.lockOn) {

      state.lockOn = false;

      state.lockedTarget = null;

      setMessage(
        "Lock-On OFF"
      );

      return;

    }

    const target =
      chooseHumanTarget();

    if (!target) {

      setMessage(
        "No available target.",
        "warning"
      );

      return;

    }

    state.lockedTarget =
      target;

    state.lockOn = true;

    aimAtTarget(
      target
    );

    setMessage(
      `LOCKED ON — Ball ${target.number}`
    );

  }


  function chooseHumanTarget() {

    const player =
      currentPlayer();

    let available =
      getLegalTargetBalls(
        player
      );

    if (!available.length) {

      available =
        state.balls.filter(
          ball =>
            ball.number !== 0 &&
            !ball.pocketed
        );

    }

    if (!available.length) {

      return null;

    }

    available.sort(
      (a, b) =>
        distance(
          state.cueBall,
          a
        ) -
        distance(
          state.cueBall,
          b
        )
    );

    return available[0];

  }


  function aimAtTarget(target) {

    if (!target) return;

    const cue =
      state.cueBall;

    if (!cue) return;

    const direction =
      normalize(
        target.x - cue.x,
        target.y - cue.y
      );

    state.aimAngle =
      Math.atan2(
        direction.y,
        direction.x
      );

    state.aimX =
      cue.x +
      direction.x *
      CONFIG.aimLineLength;

    state.aimY =
      cue.y +
      direction.y *
      CONFIG.aimLineLength;

    updateAimLine();

  }


  /* =======================================================
     AIM LINE
     ======================================================= */

  function updateAimLine() {

    if (!ballLayer) return;

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

      ballLayer.appendChild(
        line
      );

    }

    const cue =
      state.cueBall;

    if (!cue) return;

    const angle =
      state.aimAngle *
      180 /
      Math.PI;

    line.style.position =
      "absolute";

    line.style.left =
      `${renderX(cue.x)}px`;

    line.style.top =
      `${renderY(cue.y)}px`;

    line.style.width =
      `${CONFIG.aimLineLength * scaleX()}px`;

    line.style.height =
      "2px";

    line.style.transformOrigin =
      "0 50%";

    line.style.transform =
      `rotate(${angle}deg)`;

    line.style.pointerEvents =
      "none";

    line.style.display =
      "block";

    if (
      state.lockOn
    ) {

      line.classList.add(
        "locked"
      );

    } else {

      line.classList.remove(
        "locked"
      );

    }

  }


  function hideAimLine() {

    const line =
      document.getElementById(
        "poolAimLine"
      );

    if (line) {

      line.style.display =
        "none";

    }

  }


  /* =======================================================
     POWER
     ======================================================= */

  function setPower(value) {

    state.power =
      clamp(
        value,
        0,
        1
      );

    if (powerFill) {

      powerFill.style.width =
        `${state.power * 100}%`;

    }

    /*
     * Also support text power displays.
     */

    document
      .querySelectorAll(
        ".power-value"
      )
      .forEach(
        element => {

          element.textContent =
            `${Math.round(
              state.power * 100
            )}%`;

        }
      );

  }


  function adjustPower(amount) {

    if (
      state.gameOver ||
      state.shooting ||
      currentPlayer().type !== "human"
    ) {

      return;

    }

    setPower(
      state.power + amount
    );

  }


  /* =======================================================
     SHOOT
     ======================================================= */

  function shootFromAim() {

    if (
      state.gameOver ||
      state.shooting ||
      state.aiThinking
    ) {

      return;

    }

    const player =
      currentPlayer();

    if (
      player.type !== "human"
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

    const direction =
      normalize(
        Math.cos(
          state.aimAngle
        ),
        Math.sin(
          state.aimAngle
        )
      );

    /*
     * Minimum useful shot.
     */

    let shotPower =
      Math.max(
        CONFIG.minPower,
        state.power
      );

    /*
     * Stronger break.
     */

    if (
      state.breakShot
    ) {

      shotPower =
        Math.max(
          shotPower,
          0.78
        );

      shotPower *=
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
      direction.x *
      velocity;

    cue.vy =
      direction.y *
      velocity;

    /*
     * Clear aiming state.
     */

    setPower(0);

    state.lockOn = false;

    state.lockedTarget = null;

    hideAimLine();

    beginShot();

  }


  function shootButtonHandler() {

    if (
      state.gameOver ||
      state.shooting ||
      state.aiThinking
    ) {

      return;

    }

    if (
      currentPlayer().type !==
      "human"
    ) {

      return;

    }

    /*
     * If lock-on is active,
     * aim at the selected target.
     */

    if (
      state.lockOn &&
      state.lockedTarget &&
      !state.lockedTarget.pocketed
    ) {

      aimAtTarget(
        state.lockedTarget
      );

    }

    shootFromAim();

  }


  /* =======================================================
     BEGIN SHOT
     ======================================================= */

  function beginShot() {

    state.shooting = true;

    state.shotCount++;

    state.ballsPocketedThisTurn =
      [];

    state.foulThisTurn =
      false;

    state.firstBallHit =
      null;

    setMessage(
      `${currentPlayer().name} is shooting...`
    );

  }


  /* =======================================================
     PHYSICS
     ======================================================= */

  function updatePhysics(delta) {

    /*
     * Convert milliseconds into a
     * stable physics multiplier.
     */

    const frameScale =
      clamp(
        delta / 16.6667,
        0.35,
        2.5
      );

    let moving = false;


    for (
      const ball of state.balls
    ) {

      if (
        ball.pocketed
      ) {

        continue;

      }


      /*
       * Move.
       */

      ball.x +=
        ball.vx *
        frameScale;

      ball.y +=
        ball.vy *
        frameScale;


      /*
       * Rolling friction.
       */

      const friction =
        Math.pow(
          CONFIG.friction,
          frameScale
        );

      ball.vx *=
        friction;

      ball.vy *=
        friction;


      /*
       * Small rolling resistance.
       */

      const speed =
        Math.hypot(
          ball.vx,
          ball.vy
        );

      if (
        speed > 0
      ) {

        const resistance =
          CONFIG.rollingResistance *
          frameScale;

        ball.vx -=
          (ball.vx / speed) *
          resistance;

        ball.vy -=
          (ball.vy / speed) *
          resistance;

      }


      /*
       * Stop tiny movement.
       */

      if (
        Math.abs(ball.vx) <
        CONFIG.stopVelocity
      ) {

        ball.vx = 0;

      }

      if (
        Math.abs(ball.vy) <
        CONFIG.stopVelocity
      ) {

        ball.vy = 0;

      }


      /*
       * Safety velocity cap.
       */

      const newSpeed =
        Math.hypot(
          ball.vx,
          ball.vy
        );

      if (
        newSpeed >
        CONFIG.maxVelocity
      ) {

        const scale =
          CONFIG.maxVelocity /
          newSpeed;

        ball.vx *= scale;

        ball.vy *= scale;

      }


      if (
        ball.vx !== 0 ||
        ball.vy !== 0
      ) {

        moving = true;

      }


      /*
       * Rails.
       */

      handleRailCollision(
        ball
      );


      /*
       * Pocket.
       */

      if (
        checkPocket(ball)
      ) {

        pocketBall(ball);

      }

    }


    /*
     * Ball-to-ball collisions.
     */

    resolveBallCollisions();


    /*
     * Determine whether the table
     * has completely settled.
     */

    if (
      !hasMovingBalls() &&
      state.shooting
    ) {

      finishShot();

    }

  }


  function hasMovingBalls() {

    for (
      const ball of state.balls
    ) {

      if (
        ball.pocketed
      ) {

        continue;

      }

      if (
        Math.abs(ball.vx) >
          CONFIG.stopVelocity ||
        Math.abs(ball.vy) >
          CONFIG.stopVelocity
      ) {

        return true;

      }

    }

    return false;

  }


  /* =======================================================
     RAIL COLLISION
     ======================================================= */

  function handleRailCollision(ball) {

    const radius =
      CONFIG.ballRadius;


    /*
     * Left.
     */

    if (
      ball.x - radius < 0
    ) {

      ball.x =
        radius;

      ball.vx =
        Math.abs(
          ball.vx
        ) *
        CONFIG.railRestitution;

    }


    /*
     * Right.
     */

    if (
      ball.x + radius >
      CONFIG.tableWidth
    ) {

      ball.x =
        CONFIG.tableWidth -
        radius;

      ball.vx =
        -Math.abs(
          ball.vx
        ) *
        CONFIG.railRestitution;

    }


    /*
     * Top.
     */

    if (
      ball.y - radius < 0
    ) {

      ball.y =
        radius;

      ball.vy =
        Math.abs(
          ball.vy
        ) *
        CONFIG.railRestitution;

    }


    /*
     * Bottom.
     */

    if (
      ball.y + radius >
      CONFIG.tableHeight
    ) {

      ball.y =
        CONFIG.tableHeight -
        radius;

      ball.vy =
        -Math.abs(
          ball.vy
        ) *
        CONFIG.railRestitution;

    }

  }


  /* =======================================================
     BALL COLLISIONS
     ======================================================= */

  function resolveBallCollisions() {

    const activeBalls =
      state.balls.filter(
        ball =>
          !ball.pocketed
      );


    for (
      let i = 0;
      i < activeBalls.length;
      i++
    ) {

      for (
        let j = i + 1;
        j < activeBalls.length;
        j++
      ) {

        const a =
          activeBalls[i];

        const b =
          activeBalls[j];


        const dx =
          b.x - a.x;

        const dy =
          b.y - a.y;

        let dist =
          Math.hypot(
            dx,
            dy
          );


        const minDist =
          a.radius +
          b.radius;


        if (
          dist >= minDist
        ) {

          continue;

        }


        /*
         * Protect against exact
         * center overlap.
         */

        if (
          dist === 0
        ) {

          dist =
            0.0001;

        }


        const nx =
          dx / dist;

        const ny =
          dy / dist;


        /*
         * Separate overlapping balls.
         */

        const overlap =
          minDist - dist;

        a.x -=
          nx *
          overlap *
          0.5;

        a.y -=
          ny *
          overlap *
          0.5;

        b.x +=
          nx *
          overlap *
          0.5;

        b.y +=
          ny *
          overlap *
          0.5;


        /*
         * Relative velocity.
         */

        const relativeVelocity =
          (b.vx - a.vx) *
            nx +
          (b.vy - a.vy) *
            ny;


        /*
         * Already moving apart.
         */

        if (
          relativeVelocity > 0
        ) {

          continue;

        }


        /*
         * Elastic collision impulse.
         */

        const impulse =
          -relativeVelocity *
          CONFIG.collisionRestitution;


        a.vx -=
          impulse * nx;

        a.vy -=
          impulse * ny;

        b.vx +=
          impulse * nx;

        b.vy +=
          impulse * ny;


        /*
         * First ball hit by cue.
         */

        if (
          !state.firstBallHit &&
          a.number === 0
        ) {

          state.firstBallHit =
            b.number;

        }

        if (
          !state.firstBallHit &&
          b.number === 0
        ) {

          state.firstBallHit =
            a.number;

        }

      }

    }

  }


  /* =======================================================
     POCKET BALL
     ======================================================= */

  function pocketBall(ball) {

    if (
      ball.pocketed
    ) {

      return;

    }


    ball.pocketed =
      true;

    ball.vx = 0;

    ball.vy = 0;


    state
      .ballsPocketedThisTurn
      .push(ball.number);


    if (
      ball.element
    ) {

      ball.element.style.display =
        "none";

    }


    /*
     * Cue ball scratch.
     */

    if (
      ball.number === 0
    ) {

      state.foulThisTurn =
        true;

      setMessage(
        "SCRATCH! Cue ball pocketed.",
        "warning"
      );

      return;

    }


    /*
     * Score.
     */

    currentPlayer().score++;


    if (
      state.challengeMode
    ) {

      state.challengeScore++;

    }


    /*
     * 8-ball / 9-ball feedback.
     */

    if (
      ball.number === 8
    ) {

      setMessage(
        "8-BALL POCKETED!"
      );

    }

    else if (
      ball.number === 9
    ) {

      setMessage(
        "9-BALL POCKETED!"
      );

    }

    else {

      setMessage(
        `Ball ${ball.number} pocketed!`,
        "success"
      );

    }

  }


  /* =======================================================
     FINISH SHOT
     ======================================================= */

  function finishShot() {

    if (!state.shooting) return;

    state.shooting =
      false;

    evaluateShot();

    renderBalls();

  }


  /* =======================================================
     EVALUATE SHOT
     ======================================================= */

  function evaluateShot() {

    if (
      state.gameOver
    ) {

      return;

    }


    /*
     * Scratch.
     */

    if (
      state.foulThisTurn
    ) {

      respotCueBall();

      currentPlayer().fouls++;

      switchPlayer();

      return;

    }


    /*
     * 8-ball.
     */

    if (
      state.gameType ===
      "8ball"
    ) {

      const eight =
        state.balls.find(
          ball =>
            ball.number === 8
        );


      if (
        eight &&
        eight.pocketed
      ) {

        /*
         * Basic V3.1 rule:
         * player who legally pockets
         * 8 wins.
         *
         * Full solids/stripes rules
         * arrive in V3.4.
         */

        const winner =
          state.firstBallHit === 8
            ? state.players[
                state.currentPlayer
              ]
            : state.players[
                state.currentPlayer
              ];

        endGame(
          winner
        );

        return;

      }

    }


    /*
     * 9-ball.
     */

    if (
      state.gameType ===
      "9ball"
    ) {

      const nine =
        state.balls.find(
          ball =>
            ball.number === 9
        );


      if (
        nine &&
        nine.pocketed
      ) {

        endGame(
          currentPlayer()
        );

        return;

      }

    }


    /*
     * Break shot.
     */

    if (
      state.breakShot
    ) {

      state.breakShot =
        false;

      if (
        state.ballsPocketedThisTurn
          .some(
            number =>
              number !== 0
          )
      ) {

        setMessage(
          `${currentPlayer().name} made the break — continue!`,
          "success"
        );

        resetTurnTimer();

        return;

      }

      switchPlayer();

      return;

    }


    /*
     * Normal shot:
     * pocketed ball = continue.
     */

    const pocketedObjectBall =
      state
        .ballsPocketedThisTurn
        .some(
          number =>
            number !== 0
        );


    if (
      pocketedObjectBall
    ) {

      resetTurnTimer();

      setMessage(
        `${currentPlayer().name} continues — nice shot!`,
        "success"
      );

      return;

    }


    /*
     * No ball pocketed.
     */

    switchPlayer();

  }


  /* =======================================================
     CUE BALL RESPOT
     ======================================================= */

  function respotCueBall() {

    const cue =
      state.cueBall;

    if (!cue) return;


    cue.pocketed =
      false;

    cue.x =
      210;

    cue.y =
      CONFIG.tableHeight /
      2;

    cue.vx = 0;

    cue.vy = 0;


    /*
     * Prevent cue ball from
     * spawning inside another ball.
     */

    let safe = false;

    let attempts = 0;

    while (
      !safe &&
      attempts < 20
    ) {

      safe = true;

      for (
        const ball of state.balls
      ) {

        if (
          ball === cue ||
          ball.pocketed
        ) {

          continue;

        }

        if (
          distance(
            cue,
            ball
          ) <
          CONFIG.ballRadius * 2.2
        ) {

          cue.x += 30;

          safe = false;

          break;

        }

      }

      attempts++;

    }


    if (
      cue.element
    ) {

      cue.element.style.display =
        "flex";

    }


    renderBalls();

  }


  /* =======================================================
     GAME OVER
     ======================================================= */

  function endGame(winner) {

    state.gameOver =
      true;

    state.shooting =
      false;

    state.aiThinking =
      false;

    stopTimer();

    setMessage(
      `${winner.name} WINS!`,
      "success"
    );


    const overlay =
      document.querySelector(
        ".pool-game-over"
      );


    if (overlay) {

      overlay.classList.add(
        "show"
      );


      const title =
        overlay.querySelector(
          "h2"
        );


      if (title) {

        title.textContent =
          `${winner.name} Wins!`;

      }

    }

  }


  /* =======================================================
     LEGAL TARGETS
     ======================================================= */

  function getLegalTargetBalls(player) {

    /*
     * V3.1 foundation.
     *
     * Full solids/stripes assignment
     * arrives in V3.4.
     */

    return state.balls.filter(
      ball =>
        ball.number !== 0 &&
        !ball.pocketed &&
        ball.number !== 8
    );

  }


  /* =======================================================
     AI ENGINE V3.1
     ======================================================= */

  function runAI() {

    if (
      state.gameOver ||
      state.shooting ||
      state.aiThinking
    ) {

      return;

    }


    const player =
      currentPlayer();


    if (
      player.type !== "ai"
    ) {

      return;

    }


    state.aiThinking =
      true;


    setMessage(
      `${player.name} is calculating...`
    );


    /*
     * Think delay gives the AI
     * a visible personality.
     */

    setTimeout(
      () => {

        if (
          state.gameOver ||
          currentPlayer() !== player
        ) {

          state.aiThinking =
            false;

          return;

        }


        const target =
          chooseAITarget();


        if (!target) {

          state.aiThinking =
            false;

          switchPlayer();

          return;

        }


        const cue =
          state.cueBall;


        if (
          !cue ||
          cue.pocketed
        ) {

          state.aiThinking =
            false;

          return;

        }


        /*
         * Aim toward target.
         */

        const dx =
          target.x -
          cue.x;

        const dy =
          target.y -
          cue.y;


        const direction =
          normalize(
            dx,
            dy
          );


        /*
         * Difficulty accuracy.
         */

        const error =
          getAIError();


        const adjustedX =
          direction.x +
          (
            Math.random() -
            0.5
          ) *
          error;


        const adjustedY =
          direction.y +
          (
            Math.random() -
            0.5
          ) *
          error;


        const finalDirection =
          normalize(
            adjustedX,
            adjustedY
          );


        /*
         * AI power.
         */

        let power =
          getAIPower(
            target
          );


        /*
         * Strong AI breaks harder.
         */

        if (
          state.breakShot
        ) {

          power =
            Math.max(
              power,
              getAIBreakPower()
            );

        }


        const velocity =
          clamp(
            CONFIG.maxPower *
            power,
            0,
            CONFIG.maxVelocity
          );


        cue.vx =
          finalDirection.x *
          velocity;

        cue.vy =
          finalDirection.y *
          velocity;


        state.aiThinking =
          false;


        beginShot();

      },
      getAIThinkDelay()
    );

  }


  function getAIThinkDelay() {

    switch (
      Number(state.aiLevel)
    ) {

      case 1:
        return 450;

      case 2:
        return 650;

      case 3:
        return 850;

      case 4:
        return 1050;

      case 5:
        return 1250;

      default:
        return 700;

    }

  }


  function getAIError() {

    switch (
      Number(state.aiLevel)
    ) {

      case 1:
        return 0.38;

      case 2:
        return 0.23;

      case 3:
        return 0.13;

      case 4:
        return 0.065;

      case 5:
        return 0.025;

      default:
        return 0.25;

    }

  }


  function getAIBreakPower() {

    switch (
      Number(state.aiLevel)
    ) {

      case 1:
        return 0.75;

      case 2:
        return 0.82;

      case 3:
        return 0.90;

      case 4:
        return 0.96;

      case 5:
        return 1.00;

      default:
        return 0.80;

    }

  }


  function chooseAITarget() {

    const available =
      getLegalTargetBalls(
        currentPlayer()
      );


    if (
      !available.length
    ) {

      return state.balls.find(
        ball =>
          ball.number === 8 &&
          !ball.pocketed
      );

    }


    /*
     * START-UP:
     * simple selection.
     */

    if (
      Number(state.aiLevel) === 1
    ) {

      return available[
        Math.floor(
          Math.random() *
          available.length
        )
      ];

    }


    /*
     * INVESTOR:
     * prefers closer targets.
     */

    if (
      Number(state.aiLevel) === 2
    ) {

      return [...available]
        .sort(
          (a, b) =>
            distance(
              state.cueBall,
              a
            ) -
            distance(
              state.cueBall,
              b
            )
        )[0];

    }


    /*
     * Advanced:
     * choose a ball that is
     * close to both cue and pocket.
     */

    return [...available]
      .sort(
        (a, b) =>
          getAIScore(a) -
          getAIScore(b)
      )[0];

  }


  function getAIScore(ball) {

    const cueDistance =
      distance(
        state.cueBall,
        ball
      );


    const pocketDistance =
      distanceToNearestPocket(
        ball
      );


    /*
     * Lower score is better.
     */

    return (
      cueDistance *
      0.55 +
      pocketDistance *
      0.45
    );

  }


  function distanceToNearestPocket(ball) {

    const pockets =
      getPockets();


    return Math.min(
      ...pockets.map(
        pocket =>
          Math.hypot(
            ball.x -
              pocket.x,
            ball.y -
              pocket.y
          )
      )
    );

  }


  function getAIPower(target) {

    const d =
      distance(
        state.cueBall,
        target
      );


    const normalized =
      clamp(
        d / 600,
        0.30,
        0.92
      );


    /*
     * Higher levels become more
     * controlled instead of simply
     * smashing the ball.
     */

    switch (
      Number(state.aiLevel)
    ) {

      case 1:
        return clamp(
          normalized + 0.10,
          0.35,
          0.85
        );

      case 2:
        return normalized;

      case 3:
        return clamp(
          normalized,
          0.32,
          0.88
        );

      case 4:
        return clamp(
          normalized * 0.95,
          0.30,
          0.86
        );

      case 5:
        return clamp(
          normalized * 0.90,
          0.28,
          0.82
        );

      default:
        return normalized;

    }

  }


  /* =======================================================
     GAME LOOP
     ======================================================= */

  function loop(timestamp) {

    const delta =
      timestamp -
      state.lastFrame;


    state.lastFrame =
      timestamp;


    /*
     * Prevent enormous jumps when
     * browser is backgrounded.
     */

    const safeDelta =
      clamp(
        delta,
        0,
        50
      );


    if (
      state.shooting
    ) {

      updatePhysics(
        safeDelta
      );

    }


    renderBalls();


    /*
     * Keep aim line synchronized
     * with cue ball movement.
     */

    if (
      state.aiming ||
      state.lockOn
    ) {

      updateAimLine();

    }


    state.animationFrame =
      requestAnimationFrame(
        loop
      );

  }


  /* =======================================================
     EXISTING POWER BUTTONS
     ======================================================= */

  document
    .querySelectorAll(
      "[data-power='increase'], .power-plus, #powerPlus"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () =>
            adjustPower(0.05)
        );

      }
    );


  document
    .querySelectorAll(
      "[data-power='decrease'], .power-minus, #powerMinus"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () =>
            adjustPower(-0.05)
        );

      }
    );


  /* =======================================================
     AIM BUTTONS
     ======================================================= */

  if (aimLeftButton) {

    aimLeftButton.addEventListener(
      "click",
      () =>
        rotateAim(
          -CONFIG.aimStep *
          Math.PI /
          180
        )
    );

  }


  if (aimRightButton) {

    aimRightButton.addEventListener(
      "click",
      () =>
        rotateAim(
          CONFIG.aimStep *
          Math.PI /
          180
        )
    );

  }


  if (lockButton) {

    lockButton.addEventListener(
      "click",
      toggleLockOn
    );

  }


  /* =======================================================
     GAME SELECTORS
     ======================================================= */

  if (modeSelect) {

    modeSelect.addEventListener(
      "change",
      () => {

        state.mode =
          modeSelect.value;

        resetGame();

      }
    );

  }


  if (gameSelect) {

    gameSelect.addEventListener(
      "change",
      () => {

        state.gameType =
          gameSelect.value;

        resetGame();

      }
    );

  }


  if (aiLevelSelect) {

    aiLevelSelect.addEventListener(
      "change",
      () => {

        state.aiLevel =
          Number(
            aiLevelSelect.value
          );

        if (
          state.mode === "pvai" ||
          state.mode === "aivai"
        ) {

          resetGame();

        }

      }
    );

  }


  /* =======================================================
     SHOOT BUTTON
     ======================================================= */

  if (shootButton) {

    shootButton.addEventListener(
      "click",
      shootButtonHandler
    );

  }


  /* =======================================================
     RESET BUTTON
     ======================================================= */

  if (resetButton) {

    resetButton.addEventListener(
      "click",
      resetGame
    );

  }


  /* =======================================================
     AIM TOUCH / MOUSE EVENTS
     ======================================================= */

  if (ballLayer) {

    ballLayer.addEventListener(
      "mousedown",
      startAim
    );

    ballLayer.addEventListener(
      "mousemove",
      moveAim
    );

    ballLayer.addEventListener(
      "mouseup",
      endAim
    );

    ballLayer.addEventListener(
      "mouseleave",
      event => {

        if (
          state.aiming
        ) {

          moveAim(event);

        }

      }
    );


    ballLayer.addEventListener(
      "touchstart",
      startAim,
      {
        passive: false
      }
    );


    ballLayer.addEventListener(
      "touchmove",
      moveAim,
      {
        passive: false
      }
    );


    ballLayer.addEventListener(
      "touchend",
      endAim,
      {
        passive: false
      }
    );

  }


  /* =======================================================
     KEYBOARD
     ======================================================= */

  document.addEventListener(
    "keydown",
    event => {

      if (
        event.code === "Space"
      ) {

        event.preventDefault();

        shootButtonHandler();

      }


      if (
        event.key === "ArrowLeft"
      ) {

        event.preventDefault();

        rotateAim(
          -CONFIG.aimStep *
          Math.PI /
          180
        );

      }


      if (
        event.key === "ArrowRight"
      ) {

        event.preventDefault();

        rotateAim(
          CONFIG.aimStep *
          Math.PI /
          180
        );

      }


      if (
        event.key === "r" ||
        event.key === "R"
      ) {

        resetGame();

      }


      if (
        event.key === "l" ||
        event.key === "L"
      ) {

        toggleLockOn();

      }

    }
  );


  /* =======================================================
     PUBLIC API
     ======================================================= */

  window.ROLYFE_POOL = {

    state,

    resetGame,

    shoot() {

      shootButtonHandler();

    },

    aimLeft() {

      rotateAim(
        -CONFIG.aimStep *
        Math.PI /
        180
      );

    },

    aimRight() {

      rotateAim(
        CONFIG.aimStep *
        Math.PI /
        180
      );

    },

    lockOn() {

      toggleLockOn();

    },

    setPower(value) {

      setPower(
        clamp(
          Number(value),
          0,
          1
        )
      );

    },

    setMode(mode) {

      state.mode =
        mode;

      resetGame();

    },

    setGameType(type) {

      state.gameType =
        type;

      resetGame();

    },

    setAILevel(level) {

      state.aiLevel =
        Number(level);

      resetGame();

    },

    getScore() {

      return state.players.map(
        player => ({

          name:
            player.name,

          score:
            player.score

        })
      );

    },

    getState() {

      return state;

    }

  };


  /* =======================================================
     INITIALIZE FROM HTML
     ======================================================= */

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


  if (aiLevelSelect) {

    state.aiLevel =
      Number(
        aiLevelSelect.value ||
        1
      );

  }


  /* =======================================================
     START
     ======================================================= */

  resetGame();

})();
