/* =========================================================
   RO'LYFE GAMING™ — POOL ENGINE V2
   =========================================================
   8-BALL / 9-BALL / PRACTICE
   PLAYER VS PLAYER
   PLAYER VS AI
   AI VS AI
   CHALLENGE MODE

   V2 ENGINE GOALS
   ---------------------------------------------------------
   • Central turn controller
   • Reliable AI turns
   • Reliable AI vs AI
   • Real pause/resume
   • Timer pause/resume
   • Full power control
   • Clear turn indicators
   • Mobile aiming
   • Theme/brand hooks
   • Stable physics loop
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

    stopVelocity: 0.055,

    maxPower: 34,

    minPower: 0.10,

    defaultPower: 0.65,

    breakPower: 0.95,

    pocketRadius: 32,

    collisionRestitution: 0.96,

    playerTime: 600,

    challengeTime: 120,

    aiDelay: 900,

    maxBalls: 16,

    aimLength: 180,

    maxAimDistance: 500
  };

  /* =======================================================
     DOM HELPERS
     ======================================================= */

  function find(...selectors) {
    for (const selector of selectors) {
      const element = document.querySelector(selector);

      if (element) {
        return element;
      }
    }

    return null;
  }

  const app =
    find(
      "#poolApp",
      "#pool-app",
      ".pool-app"
    ) || document.body;

  const table =
    find(
      ".pool-table",
      "#poolTable",
      ".pool-board"
    );

  const ballLayer =
    find(
      ".ball-layer",
      "#ballLayer",
      ".pool-balls"
    );

  const powerFill =
    find(
      ".power-fill",
      "#powerFill"
    );

  const powerValue =
    find(
      ".power-value",
      "#powerValue"
    );

  const messageEl =
    find(
      ".pool-message",
      "#poolMessage",
      ".game-message"
    );

  const turnEl =
    find(
      ".turn-value",
      "#turnValue",
      ".current-turn"
    );

  const timerEl =
    find(
      ".pool-timer",
      "#poolTimer",
      ".game-timer"
    );

  const modeSelect =
    find(
      "#poolMode",
      "#modeSelect"
    );

  const gameSelect =
    find(
      "#poolGame",
      "#gameType"
    );

  const aiLevelSelect =
    find(
      "#poolAILevel",
      "#aiLevel"
    );

  const boardSelect =
    find(
      "#poolBoard",
      "#boardSelect",
      "#poolTheme",
      "#themeSelect"
    );

  const shootButton =
    find(
      "#shootBtn",
      "#shootButton",
      ".shoot-btn"
    );

  const resetButton =
    find(
      "#resetPool",
      "#resetBtn",
      "#newGameBtn"
    );

  const newRackButton =
    find(
      "#newRack",
      "#newRackBtn",
      "#newRackButton"
    );

  const pauseButton =
    find(
      "#pauseBtn",
      "#pauseButton",
      "#pausePool",
      ".pause-btn"
    );

  const powerDownButton =
    find(
      "#powerDown",
      "#powerMinus",
      "#powerDecrease",
      ".power-down"
    );

  const powerUpButton =
    find(
      "#powerUp",
      "#powerPlus",
      "#powerIncrease",
      ".power-up"
    );

  /* =======================================================
     STATE
     ======================================================= */

  const state = {

    gameType: "8ball",

    mode: "pvp",

    aiLevel: 1,

    boardTheme: "rolyfe",

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

    cueBall: null,

    shooting: false,

    aiming: false,

    paused: false,

    gameOver: false,

    aiThinking: false,

    challengeMode: false,

    challengeScore: 0,

    shots: 0,

    timerSeconds: CONFIG.playerTime,

    timerInterval: null,

    animationFrame: null,

    lastFrame: performance.now(),

    power: CONFIG.defaultPower,

    aimX: 0,

    aimY: 0,

    aimDirection: {
      x: 1,
      y: 0
    },

    ballsPocketedThisTurn: [],

    foulThisTurn: false,

    firstShot: true,

    aiTimeout: null,

    pointerDown: false
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
     UTILITY
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

    if (!messageEl) {
      return;
    }

    messageEl.textContent =
      text;

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
     POCKETS
     ======================================================= */

  function getPockets() {

    const w =
      CONFIG.tableWidth;

    const h =
      CONFIG.tableHeight;

    return [

      { x: 0, y: 0 },

      {
        x: w / 2,
        y: 0
      },

      {
        x: w,
        y: 0
      },

      {
        x: 0,
        y: h
      },

      {
        x: w / 2,
        y: h
      },

      {
        x: w,
        y: h
      }

    ];

  }

  function checkPocket(ball) {

    for (const pocket of getPockets()) {

      if (
        Math.hypot(
          ball.x - pocket.x,
          ball.y - pocket.y
        ) <=
        CONFIG.pocketRadius
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

      element: null

    };

  }

  /* =======================================================
     RACK
     ======================================================= */

  function createRack() {

    state.balls = [];

    const cue =
      createBall(
        0,
        220,
        CONFIG.tableHeight / 2
      );

    state.cueBall =
      cue;

    state.balls.push(cue);

    const rackX = 720;

    const rackY =
      CONFIG.tableHeight / 2;

    const spacing =
      CONFIG.ballRadius * 2.05;

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
      state.gameType === "9ball"
    ) {

      state.balls =
        state.balls.filter(
          ball =>
            ball.number <= 9
        );

    }

  }

  /* =======================================================
     DOM BALLS
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
        BALL_COLORS[
          ball.number
        ] || "ball"
      );

      element.textContent =
        ball.number;

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

    if (!ballLayer) {
      return;
    }

    for (
      const ball of state.balls
    ) {

      if (!ball.element) {

        createBallElement(
          ball
        );

      }

      if (
        ball.pocketed
      ) {

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
     POWER SYSTEM
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

    if (powerValue) {

      powerValue.textContent =
        `${Math.round(
          state.power * 100
        )}%`;

    }

  }

  function changePower(amount) {

    if (
      state.shooting ||
      state.paused
    ) {
      return;
    }

    setPower(
      state.power + amount
    );

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
          name: aiLevelName(),
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
            `RO'Lyfe AI Alpha`,
          type: "ai",
          score: 0,
          group: null,
          fouls: 0
        },

        {
          name:
            `RO'Lyfe AI Beta`,
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
      setInterval(() => {

        if (
          state.paused ||
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

      }, 1000);

  }

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

  function resetTurnTimer() {

    state.timerSeconds =
      state.challengeMode
        ? CONFIG.challengeTime
        : CONFIG.playerTime;

    updateTimer();

  }

  function updateTimer() {

    if (!timerEl) {
      return;
    }

    const seconds =
      Math.max(
        0,
        state.timerSeconds
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

    if (
      state.gameOver ||
      state.shooting
    ) {
      return;
    }

    const player =
      currentPlayer();

    setMessage(
      `${player.name} ran out of time.`,
      "warning"
    );

    switchPlayer();

  }

  /* =======================================================
     CURRENT PLAYER
     ======================================================= */

  function currentPlayer() {

    return (
      state.players[
        state.currentPlayer
      ] ||
      state.players[0]
    );

  }

  /* =======================================================
     TURN DISPLAY
     ======================================================= */

  function updateTurnDisplay() {

    const player =
      currentPlayer();

    const isAI =
      player.type === "ai";

    if (turnEl) {

      turnEl.textContent =
        isAI
          ? `🤖 ${player.name} TURN`
          : `🎱 ${player.name} — YOUR TURN`;

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

          card.classList.toggle(
            "current-player",
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
              state.players[
                index
              ].name;

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
              state.players[
                index
              ].score;

          }

        }
      );

    updateTimer();

  }

  /* =======================================================
     CENTRAL TURN CONTROLLER
     ======================================================= */

  function startTurn() {

    if (
      state.gameOver ||
      state.paused ||
      state.shooting
    ) {
      return;
    }

    const player =
      currentPlayer();

    state.aiThinking =
      false;

    state.aiming =
      false;

    resetTurnTimer();

    updateTurnDisplay();

    hideAimLine();

    if (
      player.type === "ai"
    ) {

      setMessage(
        `🤖 ${player.name} is thinking...`
      );

      state.aiThinking =
        true;

      scheduleAI();

      return;

    }

    setMessage(
      `🎱 ${player.name} — YOUR TURN`
    );

  }

  function switchPlayer() {

    if (
      state.gameOver
    ) {
      return;
    }

    state.currentPlayer =
      state.currentPlayer === 0
        ? 1
        : 0;

    state.ballsPocketedThisTurn =
      [];

    state.foulThisTurn =
      false;

    state.firstShot =
      false;

    startTurn();

  }

  /* =======================================================
     AIM
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
        (
          (clientX - rect.left) /
          rect.width
        ) *
        CONFIG.tableWidth,

      y:
        (
          (clientY - rect.top) /
          rect.height
        ) *
        CONFIG.tableHeight

    };

  }

  function startAim(event) {

    if (
      state.gameOver ||
      state.paused ||
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
      getPointerPosition(
        event
      );

    const distanceFromCue =
      distance(
        cue,
        pointer
      );

    /*
     * Allow aiming from around
     * the cue ball.
     */

    if (
      distanceFromCue >
      CONFIG.ballRadius * 5
    ) {
      return;
    }

    state.pointerDown =
      true;

    state.aiming =
      true;

    state.aimX =
      pointer.x;

    state.aimY =
      pointer.y;

    updateAimLine();

    event.preventDefault();

  }

  function moveAim(event) {

    if (
      !state.aiming ||
      state.paused ||
      state.shooting
    ) {
      return;
    }

    const pointer =
      getPointerPosition(
        event
      );

    state.aimX =
      pointer.x;

    state.aimY =
      pointer.y;

    updateAimLine();

    event.preventDefault();

  }

  function endAim(event) {

    if (
      !state.aiming
    ) {
      return;
    }

    const pointer =
      getPointerPosition(
        event
      );

    state.aimX =
      pointer.x;

    state.aimY =
      pointer.y;

    state.aiming =
      false;

    state.pointerDown =
      false;

    hideAimLine();

    /*
     * Don't automatically shoot
     * if the pointer barely moved.
     *
     * This prevents accidental
     * shots on mobile.
     */

    const cue =
      state.cueBall;

    const dragDistance =
      distance(
        cue,
        pointer
      );

    if (
      dragDistance >
      CONFIG.ballRadius * 1.5
    ) {

      shootFromAim();

    }

    event.preventDefault();

  }

  /* =======================================================
     AIM LINE
     ======================================================= */

  function updateAimLine() {

    if (!ballLayer) {
      return;
    }

    let line =
      document.getElementById(
        "poolAimLine"
      );

    if (!line) {

      line =
        document.createElement(
          "div"
        );

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

    if (!cue) {
      return;
    }

    const direction =
      normalize(
        state.aimX - cue.x,
        state.aimY - cue.y
      );

    state.aimDirection =
      direction;

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
      `${CONFIG.aimLength * scaleX()}px`;

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
     SHOOTING
     ======================================================= */

  function shootFromAim() {

    if (
      state.gameOver ||
      state.paused ||
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

    const direction =
      state.aimDirection ||
      {
        x: 1,
        y: 0
      };

    let power =
      state.power;

    if (
      state.firstShot &&
      power < 0.70
    ) {

      /*
       * The opening break gets
       * enough force to actually
       * behave like a break.
       */

      power =
        CONFIG.breakPower;

    }

    power =
      clamp(
        power,
        CONFIG.minPower,
        1
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

    beginShot();

  }

  function shootButtonHandler() {

    if (
      state.gameOver ||
      state.paused ||
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

    if (!cue) {
      return;
    }

    /*
     * If no aim exists,
     * shoot toward the right.
     */

    if (
      !state.aimDirection
    ) {

      state.aimDirection = {
        x: 1,
        y: 0
      };

    }

    shootFromAim();

  }

  function beginShot() {

    state.shooting =
      true;

    state.aiThinking =
      false;

    state.shots++;

    state.ballsPocketedThisTurn =
      [];

    state.foulThisTurn =
      false;

    hideAimLine();

    setMessage(
      `${currentPlayer().name} is shooting...`
    );

    updateTurnDisplay();

  }

  /* =======================================================
     PHYSICS
     ======================================================= */

  function updatePhysics(deltaFactor) {

    let moving =
      false;

    for (
      const ball of state.balls
    ) {

      if (
        ball.pocketed
      ) {
        continue;
      }

      ball.x +=
        ball.vx *
        deltaFactor;

      ball.y +=
        ball.vy *
        deltaFactor;

      ball.vx *=
        Math.pow(
          CONFIG.friction,
          deltaFactor
        );

      ball.vy *=
        Math.pow(
          CONFIG.friction,
          deltaFactor
        );

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

      handleRailCollision(
        ball
      );

      if (
        checkPocket(ball)
      ) {

        pocketBall(
          ball
        );

      }

    }

    resolveBallCollisions();

    if (
      !moving &&
      state.shooting
    ) {

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

      ball.x =
        radius;

      ball.vx =
        Math.abs(
          ball.vx
        ) *
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
        -Math.abs(
          ball.vx
        ) *
        CONFIG.collisionRestitution;

    }

    if (
      ball.y - radius < 0
    ) {

      ball.y =
        radius;

      ball.vy =
        Math.abs(
          ball.vy
        ) *
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
        -Math.abs(
          ball.vy
        ) *
        CONFIG.collisionRestitution;

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
        ) {
          continue;
        }

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
          (
            b.vx -
            a.vx
          ) * nx +
          (
            b.vy -
            a.vy
          ) * ny;

        if (
          relativeVelocity > 0
        ) {
          continue;
        }

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

    if (
      ball.pocketed
    ) {
      return;
    }

    ball.pocketed =
      true;

    ball.vx = 0;
    ball.vy = 0;

    state.ballsPocketedThisTurn
      .push(
        ball.number
      );

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
        "⚠️ SCRATCH — Cue ball pocketed.",
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

    updateTurnDisplay();

  }

  /* =======================================================
     SHOT FINISH
     ======================================================= */

  function finishShot() {

    if (
      !state.shooting
    ) {
      return;
    }

    state.shooting =
      false;

    evaluateShot();

    renderBalls();

  }

  /* =======================================================
     SHOT EVALUATION
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

      setMessage(
        "⚠️ Foul. Cue ball respotted.",
        "warning"
      );

      switchPlayer();

      return;

    }

    /*
     * 8-BALL.
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

        const pocketedCount =
          state.ballsPocketedThisTurn
            .filter(
              number =>
                number !== 0
            ).length;

        if (
          pocketedCount > 0
        ) {

          endGame(
            currentPlayer()
          );

        } else {

          const opponent =
            state.players[
              state.currentPlayer === 0
                ? 1
                : 0
            ];

          endGame(
            opponent
          );

        }

        return;

      }

    }

    /*
     * 9-BALL.
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
     * Practice mode.
     */

    if (
      state.gameType ===
      "practice"
    ) {

      setMessage(
        "Practice shot complete."
      );

      resetTurnTimer();

      return;

    }

    /*
     * Pocketed a ball:
     * player continues.
     */

    const scored =
      state.ballsPocketedThisTurn
        .some(
          number =>
            number > 0 &&
            number !== 8
        );

    if (scored) {

      resetTurnTimer();

      setMessage(
        `🎯 ${currentPlayer().name} continues.`,
        "success"
      );

      /*
       * If AI, schedule another shot.
       */

      if (
        currentPlayer().type ===
        "ai"
      ) {

        startTurn();

      }

      return;

    }

    /*
     * Nothing pocketed:
     * switch player.
     */

    switchPlayer();

  }

  /* =======================================================
     CUE BALL RESPOT
     ======================================================= */

  function respotCueBall() {

    const cue =
      state.cueBall;

    if (!cue) {
      return;
    }

    cue.pocketed =
      false;

    cue.x = 220;

    cue.y =
      CONFIG.tableHeight / 2;

    cue.vx = 0;
    cue.vy = 0;

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

    if (
      state.aiTimeout
    ) {

      clearTimeout(
        state.aiTimeout
      );

      state.aiTimeout =
        null;

    }

    setMessage(
      `🏆 ${winner.name} WINS!`,
      "success"
    );

    const overlay =
      find(
        ".pool-game-over",
        "#poolGameOver",
        "#gameOver"
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

    updateTurnDisplay();

  }

  /* =======================================================
     PAUSE SYSTEM
     ======================================================= */

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

      setMessage(
        "⏸ GAME PAUSED",
        "warning"
      );

      if (pauseButton) {

        pauseButton.textContent =
          "▶ Resume";

      }

    } else {

      if (pauseButton) {

        pauseButton.textContent =
          "⏸ Pause";

      }

      setMessage(
        `${currentPlayer().name} — RESUMED`
      );

      /*
       * If an AI was supposed to
       * move, continue the turn.
       */

      if (
        currentPlayer().type ===
        "ai" &&
        !state.shooting
      ) {

        startTurn();

      }

    }

    updateTurnDisplay();

  }

  /* =======================================================
     NEW RACK
     ======================================================= */

  function newRack() {

    state.gameOver =
      false;

    state.shooting =
      false;

    state.aiThinking =
      false;

    state.currentPlayer =
      0;

    state.shots =
      0;

    state.challengeScore =
      0;

    state.firstShot =
      true;

    state.foulThisTurn =
      false;

    state.ballsPocketedThisTurn =
      [];

    state.paused =
      false;

    if (
      state.aiTimeout
    ) {

      clearTimeout(
        state.aiTimeout
      );

      state.aiTimeout =
        null;

    }

    if (pauseButton) {

      pauseButton.textContent =
        "⏸ Pause";

    }

    configurePlayers();

    createRack();

    if (ballLayer) {

      ballLayer.innerHTML =
        "";

    }

    setPower(
      CONFIG.defaultPower
    );

    resetTurnTimer();

    renderBalls();

    startTimer();

    updateTurnDisplay();

    setMessage(
      "🎱 Break shot ready."
    );

    startTurn();

  }

  /* =======================================================
     NEW GAME
     ======================================================= */

  function resetGame() {

    newRack();

  }

  /* =======================================================
     AI SYSTEM
     ======================================================= */

  function scheduleAI() {

    if (
      state.aiTimeout
    ) {

      clearTimeout(
        state.aiTimeout
      );

    }

    state.aiTimeout =
      setTimeout(
        () => {

          state.aiTimeout =
            null;

          runAI();

        },
        CONFIG.aiDelay
      );

  }

  function runAI() {

    if (
      state.gameOver ||
      state.paused ||
      state.shooting
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
      `🤖 ${player.name} is calculating the shot...`
    );

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
     * Aim directly toward target.
     *
     * This is the first-generation
     * AI targeting system.
     */

    let direction =
      normalize(
        target.x - cue.x,
        target.y - cue.y
      );

    /*
     * Difficulty affects accuracy.
     */

    const error =
      getAIError();

    direction =
      normalize(

        direction.x +
        (
          Math.random() - 0.5
        ) * error,

        direction.y +
        (
          Math.random() - 0.5
        ) * error

      );

    const power =
      getAIPower(
        target
      );

    cue.vx =
      direction.x *
      CONFIG.maxPower *
      power;

    cue.vy =
      direction.y *
      CONFIG.maxPower *
      power;

    state.aiThinking =
      false;

    beginShot();

  }

  function getAIError() {

    switch (
      Number(
        state.aiLevel
      )
    ) {

      case 1:
        return 0.42;

      case 2:
        return 0.24;

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

  function chooseAITarget() {

    const available =
      state.balls.filter(
        ball =>
          ball.number !== 0 &&
          !ball.pocketed &&
          ball.number !== 8
      );

    if (
      available.length
    ) {

      /*
       * Higher AI levels
       * choose balls closer
       * to pockets.
       */

      if (
        Number(
          state.aiLevel
        ) >= 3
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

    return state.balls.find(
      ball =>
        ball.number === 8 &&
        !ball.pocketed
    );

  }

  function distanceToNearestPocket(ball) {

    return Math.min(
      ...getPockets().map(
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

    if (
      state.firstShot
    ) {

      return CONFIG.breakPower;

    }

    const d =
      distance(
        state.cueBall,
        target
      );

    let power =
      clamp(
        d / 500,
        0.35,
        0.90
      );

    /*
     * Stronger AI gets slightly
     * more consistent power.
     */

    if (
      Number(
        state.aiLevel
      ) >= 4
    ) {

      power =
        clamp(
          power + 0.05,
          0.35,
          0.95
        );

    }

    return power;

  }

  /* =======================================================
     THEME / BRAND SYSTEM
     ======================================================= */

  function applyTheme(theme) {

    if (!theme) {
      theme = "rolyfe";
    }

    state.boardTheme =
      String(theme).toLowerCase();

    /*
     * Main hook.
     *
     * CSS can use:
     *
     * [data-pool-theme="emg"]
     *
     * [data-pool-theme="ace"]
     *
     * etc.
     */

    if (app) {

      app.dataset.poolTheme =
        state.boardTheme;

    }

    if (table) {

      table.dataset.poolTheme =
        state.boardTheme;

    }

    document.body.dataset.poolTheme =
      state.boardTheme;

    /*
     * Also support the existing
     * shared theme engine if it
     * has been exposed.
     */

    try {

      if (
        window.ROLYFE_THEME &&
        typeof
        window.ROLYFE_THEME.setTheme ===
        "function"
      ) {

        window.ROLYFE_THEME.setTheme(
          state.boardTheme
        );

      }

      else if (
        window.ROLYFE_THEME_ENGINE &&
        typeof
        window.ROLYFE_THEME_ENGINE.setTheme ===
        "function"
      ) {

        window.ROLYFE_THEME_ENGINE.setTheme(
          state.boardTheme
        );

      }

    } catch (error) {

      console.warn(
        "RO'Lyfe theme engine:",
        error
      );

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
     * Convert milliseconds into
     * approximately 60fps units.
     */

    const deltaFactor =
      clamp(
        delta / 16.6667,
        0,
        2
      );

    if (
      !state.paused &&
      state.shooting
    ) {

      updatePhysics(
        deltaFactor
      );

    }

    renderBalls();

    state.animationFrame =
      requestAnimationFrame(
        loop
      );

  }

  /* =======================================================
     UI
     ======================================================= */

  function updateUI() {

    updateTurnDisplay();

    updateTimer();

    setPower(
      state.power
    );

  }

  /* =======================================================
     CONTROL EVENTS
     ======================================================= */

  if (modeSelect) {

    modeSelect.addEventListener(
      "change",
      () => {

        state.mode =
          modeSelect.value ||
          "pvp";

        resetGame();

      }
    );

  }

  if (gameSelect) {

    gameSelect.addEventListener(
      "change",
      () => {

        state.gameType =
          gameSelect.value ||
          "8ball";

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
            aiLevelSelect.value ||
            1
          );

        resetGame();

      }
    );

  }

  if (boardSelect) {

    boardSelect.addEventListener(
      "change",
      () => {

        applyTheme(
          boardSelect.value
        );

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

  if (newRackButton) {

    newRackButton.addEventListener(
      "click",
      newRack
    );

  }

  if (pauseButton) {

    pauseButton.addEventListener(
      "click",
      togglePause
    );

  }

  if (powerDownButton) {

    powerDownButton.addEventListener(
      "click",
      () =>
        changePower(-0.10)
    );

  }

  if (powerUpButton) {

    powerUpButton.addEventListener(
      "click",
      () =>
        changePower(0.10)
    );

  }

  /* =======================================================
     POWER KEYBOARD
     ======================================================= */

  document.addEventListener(
    "keydown",
    event => {

      if (
        event.code ===
        "ArrowLeft"
      ) {

        changePower(
          -0.05
        );

      }

      if (
        event.code ===
        "ArrowRight"
      ) {

        changePower(
          0.05
        );

      }

      if (
        event.code ===
        "Space"
      ) {

        event.preventDefault();

        shootButtonHandler();

      }

      if (
        event.key === "p" ||
        event.key === "P"
      ) {

        togglePause();

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
     MOUSE AIM EVENTS
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

    /* =====================================================
       TOUCH AIM EVENTS
       ===================================================== */

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
     PUBLIC API
     ======================================================= */

  window.ROLYFE_POOL = {

    state,

    resetGame,

    newRack,

    pause() {

      if (
        !state.paused
      ) {

        togglePause();

      }

    },

    resume() {

      if (
        state.paused
      ) {

        togglePause();

      }

    },

    togglePause,

    shoot() {

      shootButtonHandler();

    },

    setPower(value) {

      setPower(
        Number(value)
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

    setTheme(theme) {

      applyTheme(
        theme
      );

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

    getCurrentPlayer() {

      return {
        index:
          state.currentPlayer,

        name:
          currentPlayer().name,

        type:
          currentPlayer().type

      };

    }

  };

  /* =======================================================
     INITIALIZATION
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

  if (boardSelect) {

    state.boardTheme =
      boardSelect.value ||
      "rolyfe";

  }

  configurePlayers();

  applyTheme(
    state.boardTheme
  );

  setPower(
    CONFIG.defaultPower
  );

  createRack();

  if (ballLayer) {

    ballLayer.innerHTML =
      "";

  }

  renderBalls();

  updateUI();

  startTimer();

  setMessage(
    "🎱 Break shot ready."
  );

  /*
   * Start the central game loop.
   */

  state.lastFrame =
    performance.now();

  state.animationFrame =
    requestAnimationFrame(
      loop
    );

  /*
   * Start the first turn.
   *
   * This is what fixes AI vs AI
   * and Player vs AI initialization.
   */

  startTurn();

})();
