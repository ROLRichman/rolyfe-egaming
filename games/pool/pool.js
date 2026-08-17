/* =========================================================
   RO'LYFE GAMING — POOL ENGINE
   8-BALL / 9-BALL / PRACTICE / PVP / PVAI / AI-VS-AI
   ========================================================= */

(() => {
  "use strict";

  /* =======================================================
     CONFIGURATION
     ======================================================= */

  const CONFIG = {
    tableWidth: 1000,
    tableHeight: 500,

    ballRadius: 14,

    friction: 0.985,

    stopVelocity: 0.035,

    maxPower: 22,

    pocketRadius: 30,

    collisionRestitution: 0.96,

    shotDelay: 250,

    aiDelay: 800,

    playerTime: 300,

    challengeTime: 120,

    maxBalls: 16
  };

  /* =======================================================
     DOM
     ======================================================= */

  const app =
    document.getElementById("poolApp") ||
    document.querySelector("#pool-app") ||
    document.body;

  /*
   * The engine works with several possible HTML IDs so the
   * pool interface can evolve without destroying the engine.
   */

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
    document.getElementById("shootBtn");

  const resetButton =
    document.getElementById("resetPool") ||
    document.getElementById("resetBtn");

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

    aimX: 0,

    aimY: 0,

    power: 0,

    powerDirection: 1,

    ballsPocketedThisTurn: [],

    foulThisTurn: false,

    gameOver: false,

    challengeMode: false,

    challengeScore: 0,

    timerSeconds: CONFIG.playerTime,

    timerInterval: null,

    animationFrame: null,

    lastFrame: performance.now(),

    dragActive: false,

    dragX: 0,

    dragY: 0
  };

  /* =======================================================
     BALL DATA
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
    return Math.max(min, Math.min(max, value));
  }

  function distance(a, b) {
    return Math.hypot(
      b.x - a.x,
      b.y - a.y
    );
  }

  function normalize(x, y) {

    const length = Math.hypot(x, y);

    if (!length) {
      return {
        x: 0,
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
     TABLE COORDINATES
     ======================================================= */

  function getTableSize() {

    if (!table) {
      return {
        width: CONFIG.tableWidth,
        height: CONFIG.tableHeight
      };
    }

    return {
      width: table.clientWidth || CONFIG.tableWidth,
      height: table.clientHeight || CONFIG.tableHeight
    };
  }

  function scaleX() {

    const size = getTableSize();

    return size.width / CONFIG.tableWidth;
  }

  function scaleY() {

    const size = getTableSize();

    return size.height / CONFIG.tableHeight;
  }

  function renderX(x) {

    return x * scaleX();
  }

  function renderY(y) {

    return y * scaleY();
  }

  /* =======================================================
     POCKETS
     ======================================================= */

  function getPockets() {

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

  function isPocketed(ball) {

    return ball.pocketed === true;
  }

  function checkPocket(ball) {

    const pockets = getPockets();

    for (const pocket of pockets) {

      if (
        Math.hypot(
          ball.x - pocket.x,
          ball.y - pocket.y
        ) <
        CONFIG.pocketRadius
      ) {

        return true;
      }
    }

    return false;
  }

  /* =======================================================
     CREATE BALL
     ======================================================= */

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

  /* =======================================================
     RACK
     ======================================================= */

  function createRack() {

    state.balls = [];

    /*
     * Cue ball
     */

    const cue = createBall(
      0,
      220,
      CONFIG.tableHeight / 2
    );

    state.cueBall = cue;

    state.balls.push(cue);

    /*
     * Rack location
     */

    const rackX = 720;

    const rackY = CONFIG.tableHeight / 2;

    const spacing =
      CONFIG.ballRadius * 2.05;

    let number = 1;

    for (let row = 0; row < 5; row++) {

      for (let col = 0; col <= row; col++) {

        if (number > 15) break;

        const x =
          rackX +
          row * spacing * 0.866;

        const y =
          rackY +
          (col - row / 2) * spacing;

        state.balls.push(
          createBall(number, x, y)
        );

        number++;
      }
    }

    /*
     * 9-Ball only uses balls 1-9.
     */

    if (state.gameType === "9ball") {

      state.balls =
        state.balls.filter(
          ball => ball.number <= 9
        );

      state.cueBall =
        state.balls.find(
          ball => ball.number === 0
        );
    }
  }

  /* =======================================================
     DOM BALL CREATION
     ======================================================= */

  function createBallElement(ball) {

    const element =
      document.createElement("div");

    element.className = "ball";

    if (ball.number === 0) {

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
    }

    element.dataset.ball =
      ball.number;

    if (ballLayer) {

      ballLayer.appendChild(element);

    }

    ball.element = element;

    return element;
  }

  /* =======================================================
     RENDER
     ======================================================= */

  function renderBalls() {

    if (!ballLayer) return;

    for (const ball of state.balls) {

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

    state.currentPlayer = 0;

    state.ballsPocketedThisTurn = [];

    state.foulThisTurn = false;

    state.challengeScore = 0;

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

    startTimer();

    updateUI();

    setMessage(
      "Break shot ready."
    );

    requestAnimationFrame(loop);
  }

  /* =======================================================
     PLAYER CONFIGURATION
     ======================================================= */

  function configurePlayers() {

    if (state.mode === "pvp") {

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

    else if (state.mode === "pvai") {

      state.players = [
        {
          name: "You",
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

    else if (state.mode === "aivai") {

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

    }

    else {

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

    }
  }

  function aiLevelName() {

    switch (Number(state.aiLevel)) {

      case 1:
        return "RO'Lyfe AI — Beginner";

      case 2:
        return "RO'Lyfe AI — Investor";

      case 3:
        return "RO'Lyfe AI — EMG";

      case 4:
        return "RO'Lyfe AI — ACE";

      case 5:
        return "RO'Lyfe AI — 7Figures";

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
      setInterval(() => {

        if (
          state.gameOver ||
          state.shooting
        ) return;

        state.timerSeconds--;

        updateTimer();

        if (
          state.timerSeconds <= 0
        ) {

          handleTimeout();

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
        state.timerSeconds
      );

    const minutes =
      Math.floor(seconds / 60);

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

    state.currentPlayer =
      state.currentPlayer === 0
        ? 1
        : 0;

    state.ballsPocketedThisTurn = [];

    state.foulThisTurn = false;

    resetTurnTimer();

    updateUI();

    if (
      currentPlayer().type === "ai"
    ) {

      setTimeout(
        runAI,
        CONFIG.aiDelay
      );

    }
  }

  /* =======================================================
     UI
     ======================================================= */

  function updateUI() {

    if (turnEl) {

      turnEl.textContent =
        currentPlayer().name;

    }

    document
      .querySelectorAll(".player-card")
      .forEach((card, index) => {

        card.classList.toggle(
          "active",
          index === state.currentPlayer
        );

      });

    document
      .querySelectorAll(".player-name")
      .forEach((element, index) => {

        if (
          state.players[index]
        ) {

          element.textContent =
            state.players[index].name;

        }

      });

    document
      .querySelectorAll(".player-score")
      .forEach((element, index) => {

        if (
          state.players[index]
        ) {

          element.textContent =
            state.players[index].score;

        }

      });

    updateTimer();
  }

  /* =======================================================
     MOUSE / TOUCH AIMING
     ======================================================= */

  function getPointerPosition(event) {

    const rect =
      ballLayer.getBoundingClientRect();

    const clientX =
      event.touches
        ? event.touches[0].clientX
        : event.clientX;

    const clientY =
      event.touches
        ? event.touches[0].clientY
        : event.clientY;

    const x =
      ((clientX - rect.left) /
        rect.width) *
      CONFIG.tableWidth;

    const y =
      ((clientY - rect.top) /
        rect.height) *
      CONFIG.tableHeight;

    return {
      x,
      y
    };
  }

  function startAim(event) {

    if (
      state.gameOver ||
      state.shooting ||
      currentPlayer().type !== "human"
    ) return;

    if (!state.cueBall) return;

    if (state.cueBall.pocketed) return;

    const pointer =
      getPointerPosition(event);

    const cue =
      state.cueBall;

    if (
      distance(
        cue,
        pointer
      ) >
      CONFIG.ballRadius * 4
    ) {

      return;

    }

    state.aiming = true;

    state.aimX =
      pointer.x;

    state.aimY =
      pointer.y;

    updateAimLine();

    event.preventDefault();
  }

  function moveAim(event) {

    if (!state.aiming) return;

    const pointer =
      getPointerPosition(event);

    state.aimX =
      pointer.x;

    state.aimY =
      pointer.y;

    updateAimLine();

    event.preventDefault();
  }

  function endAim(event) {

    if (!state.aiming) return;

    const pointer =
      getPointerPosition(event);

    state.aimX =
      pointer.x;

    state.aimY =
      pointer.y;

    state.aiming = false;

    shootFromAim();

    event.preventDefault();
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

      ballLayer.appendChild(line);

    }

    const cue =
      state.cueBall;

    if (!cue) return;

    const direction =
      normalize(
        state.aimX - cue.x,
        state.aimY - cue.y
      );

    const length = 160;

    const angle =
      Math.atan2(
        direction.y,
        direction.x
      ) *
      180 /
      Math.PI;

    line.style.left =
      `${renderX(cue.x)}px`;

    line.style.top =
      `${renderY(cue.y)}px`;

    line.style.width =
      `${length * scaleX()}px`;

    line.style.transform =
      `rotate(${angle}deg)`;

    line.style.display =
      "block";
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
  }

  function shootFromAim() {

    if (
      state.shooting ||
      state.gameOver
    ) return;

    const cue =
      state.cueBall;

    if (!cue || cue.pocketed) return;

    const direction =
      normalize(
        state.aimX - cue.x,
        state.aimY - cue.y
      );

    /*
     * Default minimum power.
     */

    const power =
      Math.max(
        .18,
        state.power || .55
      );

    cue.vx =
      direction.x *
      CONFIG.maxPower *
      power;

    cue.vy =
      direction.y *
      CONFIG.maxPower *
      power;

    setPower(0);

    hideAimLine();

    beginShot();
  }

  /* =======================================================
     BEGIN SHOT
     ======================================================= */

  function beginShot() {

    state.shooting = true;

    state.ballsPocketedThisTurn = [];

    state.foulThisTurn = false;

    setMessage(
      `${currentPlayer().name} is shooting...`
    );
  }

  /* =======================================================
     PHYSICS
     ======================================================= */

  function updatePhysics() {

    let moving = false;

    for (const ball of state.balls) {

      if (
        ball.pocketed
      ) continue;

      ball.x += ball.vx;

      ball.y += ball.vy;

      ball.vx *=
        CONFIG.friction;

      ball.vy *=
        CONFIG.friction;

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

      if (
        ball.vx !== 0 ||
        ball.vy !== 0
      ) {

        moving = true;

      }

      handleRailCollision(ball);

      if (
        checkPocket(ball)
      ) {

        pocketBall(ball);

      }

    }

    resolveBallCollisions();

    if (!moving && state.shooting) {

      finishShot();

    }
  }

  /* =======================================================
     RAIL COLLISION
     ======================================================= */

  function handleRailCollision(ball) {

    const radius =
      CONFIG.ballRadius;

    if (
      ball.x - radius < 0
    ) {

      ball.x = radius;

      ball.vx =
        Math.abs(ball.vx) *
        CONFIG.collisionRestitution;

    }

    if (
      ball.x + radius >
      CONFIG.tableWidth
    ) {

      ball.x =
        CONFIG.tableWidth -
        radius;

      ball.vx =
        -Math.abs(ball.vx) *
        CONFIG.collisionRestitution;

    }

    if (
      ball.y - radius < 0
    ) {

      ball.y = radius;

      ball.vy =
        Math.abs(ball.vy) *
        CONFIG.collisionRestitution;

    }

    if (
      ball.y + radius >
      CONFIG.tableHeight
    ) {

      ball.y =
        CONFIG.tableHeight -
        radius;

      ball.vy =
        -Math.abs(ball.vy) *
        CONFIG.collisionRestitution;

    }
  }

  /* =======================================================
     BALL COLLISIONS
     ======================================================= */

  function resolveBallCollisions() {

    const activeBalls =
      state.balls.filter(
        ball => !ball.pocketed
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

        const dist =
          Math.hypot(
            dx,
            dy
          );

        const minDist =
          a.radius +
          b.radius;

        if (
          dist <= 0 ||
          dist >= minDist
        ) continue;

        const nx =
          dx / dist;

        const ny =
          dy / dist;

        const overlap =
          minDist - dist;

        a.x -=
          nx *
          overlap /
          2;

        a.y -=
          ny *
          overlap /
          2;

        b.x +=
          nx *
          overlap /
          2;

        b.y +=
          ny *
          overlap /
          2;

        const relativeVelocity =
          (b.vx - a.vx) * nx +
          (b.vy - a.vy) * ny;

        if (
          relativeVelocity > 0
        ) continue;

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
      }
    }
  }

  /* =======================================================
     POCKET BALL
     ======================================================= */

  function pocketBall(ball) {

    if (ball.pocketed)
      return;

    ball.pocketed = true;

    ball.vx = 0;

    ball.vy = 0;

    state.ballsPocketedThisTurn
      .push(ball.number);

    if (ball.element) {

      ball.element.style.display =
        "none";

    }

    /*
     * Cue ball scratch.
     */

    if (ball.number === 0) {

      state.foulThisTurn = true;

      setMessage(
        "Scratch! Cue ball pocketed.",
        "warning"
      );

      return;
    }

    currentPlayer().score++;

    if (
      state.challengeMode
    ) {

      state.challengeScore++;

    }
  }

  /* =======================================================
     SHOT RESULT
     ======================================================= */

  function finishShot() {

    state.shooting = false;

    evaluateShot();

    renderBalls();
  }

  /* =======================================================
     EVALUATE SHOT
     ======================================================= */

  function evaluateShot() {

    if (state.gameOver)
      return;

    /*
     * Scratch.
     */

    if (state.foulThisTurn) {

      respotCueBall();

      currentPlayer().fouls++;

      switchPlayer();

      return;
    }

    /*
     * 8-Ball win/loss.
     */

    if (
      state.gameType === "8ball"
    ) {

      const eight =
        state.balls.find(
          ball => ball.number === 8
        );

      if (
        eight &&
        eight.pocketed
      ) {

        /*
         * Simplified first-generation
         * 8-ball win condition.
         */

        if (
          state.ballsPocketedThisTurn
            .length > 0
        ) {

          endGame(
            currentPlayer()
          );

        } else {

          endGame(
            state.players[
              state.currentPlayer === 0
                ? 1
                : 0
            ]
          );

        }

        return;
      }
    }

    /*
     * 9-Ball.
     */

    if (
      state.gameType === "9ball"
    ) {

      const nine =
        state.balls.find(
          ball => ball.number === 9
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
     * If player pocketed something,
     * allow them to continue.
     */

    if (
      state.ballsPocketedThisTurn
        .some(
          number => number !== 0
        )
    ) {

      resetTurnTimer();

      setMessage(
        `${currentPlayer().name} continues.`,
        "success"
      );

      return;
    }

    switchPlayer();
  }

  /* =======================================================
     CUE BALL RESPOT
     ======================================================= */

  function respotCueBall() {

    const cue =
      state.cueBall;

    if (!cue)
      return;

    cue.pocketed = false;

    cue.x = 220;

    cue.y =
      CONFIG.tableHeight /
      2;

    cue.vx = 0;

    cue.vy = 0;

    if (cue.element) {

      cue.element.style.display =
        "flex";

    }

    renderBalls();
  }

  /* =======================================================
     END GAME
     ======================================================= */

  function endGame(winner) {

    state.gameOver = true;

    stopTimer();

    setMessage(
      `${winner.name} wins!`,
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
     AI ENGINE
     ======================================================= */

  function runAI() {

    if (
      state.gameOver ||
      state.shooting
    ) return;

    if (
      currentPlayer().type !== "ai"
    ) return;

    setMessage(
      `${currentPlayer().name} is calculating...`
    );

    setTimeout(() => {

      const target =
        chooseAITarget();

      if (!target) {

        switchPlayer();

        return;
      }

      const cue =
        state.cueBall;

      const dx =
        target.x - cue.x;

      const dy =
        target.y - cue.y;

      const direction =
        normalize(
          dx,
          dy
        );

      /*
       * AI difficulty determines accuracy.
       */

      const error =
        getAIError();

      const adjustedX =
        direction.x +
        (Math.random() - .5) *
        error;

      const adjustedY =
        direction.y +
        (Math.random() - .5) *
        error;

      const finalDirection =
        normalize(
          adjustedX,
          adjustedY
        );

      const power =
        getAIPower(target);

      cue.vx =
        finalDirection.x *
        CONFIG.maxPower *
        power;

      cue.vy =
        finalDirection.y *
        CONFIG.maxPower *
        power;

      beginShot();

    }, CONFIG.aiDelay);
  }

  function getAIError() {

    switch (
      Number(state.aiLevel)
    ) {

      case 1:
        return .45;

      case 2:
        return .25;

      case 3:
        return .14;

      case 4:
        return .07;

      case 5:
        return .025;

      default:
        return .25;
    }
  }

  function chooseAITarget() {

    const available =
      state.balls.filter(
        ball =>
          ball.number !== 0 &&
          !ball.pocketed &&
          ball.number !== 8
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
     * Higher AI levels prefer
     * balls closer to pockets.
     */

    if (
      Number(state.aiLevel) >= 3
    ) {

      return available.sort(
        (a, b) =>
          distanceToNearestPocket(a) -
          distanceToNearestPocket(b)
      )[0];

    }

    return available[
      Math.floor(
        Math.random() *
        available.length
      )
    ];
  }

  function distanceToNearestPocket(ball) {

    const pockets =
      getPockets();

    return Math.min(
      ...pockets.map(
        pocket =>
          Math.hypot(
            ball.x - pocket.x,
            ball.y - pocket.y
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
        d / 700,
        .25,
        .95
      );

    return normalized;
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
     * Prevent huge physics jumps
     * when browser tab sleeps.
     */

    if (
      delta < 100
    ) {

      if (
        state.shooting
      ) {

        updatePhysics();

      }

      renderBalls();

    }

    state.animationFrame =
      requestAnimationFrame(
        loop
      );
  }

  /* =======================================================
     * SHOOT BUTTON
     * ======================================================= */

  function shootButtonHandler() {

    if (
      state.gameOver ||
      state.shooting
    ) return;

    if (
      currentPlayer().type !==
      "human"
    ) return;

    const cue =
      state.cueBall;

    if (!cue) return;

    if (
      !state.aiming
    ) {

      /*
       * If no manual aim exists,
       * shoot toward current aim.
       */

      if (
        !state.aimX &&
        !state.aimY
      ) {

        state.aimX =
          cue.x + 250;

        state.aimY =
          cue.y;

      }

      shootFromAim();

    }
  }

  /* =======================================================
     * CONTROL EVENTS
     * ======================================================= */

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

  if (shootButton) {

    shootButton.addEventListener(
      "click",
      shootButtonHandler
    );

  }

  if (resetButton) {

    resetButton.addEventListener(
      "click",
      resetGame
    );

  }

  /* =======================================================
     AIM EVENTS
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
      "touchstart",
      startAim,
      { passive: false }
    );

    ballLayer.addEventListener(
      "touchmove",
      moveAim,
      { passive: false }
    );

    ballLayer.addEventListener(
      "touchend",
      endAim,
      { passive: false }
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
        event.key === "r" ||
        event.key === "R"
      ) {

        resetGame();

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
          name: player.name,
          score: player.score
        })
      );

    }

  };

  /* =======================================================
     INITIALIZE
     ======================================================= */

  if (
    modeSelect
  ) {

    state.mode =
      modeSelect.value ||
      "pvp";

  }

  if (
    gameSelect
  ) {

    state.gameType =
      gameSelect.value ||
      "8ball";

  }

  if (
    aiLevelSelect
  ) {

    state.aiLevel =
      Number(
        aiLevelSelect.value ||
        1
      );

  }

  resetGame();

})();
