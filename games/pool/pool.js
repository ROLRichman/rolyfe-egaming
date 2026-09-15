/* =========================================================
   RO'LYFE GAMING™ — POOL ENGINE V3.4
   Physics + Break Repair
   Replacement for: games/pool/pool.js

   V3.4 FIXES
   - Anti-tunneling ball collision physics
   - Reliable direct cue-ball/object-ball contact
   - Proper rack separation
   - Opening break is consumed exactly once
   - No shooting while balls are moving
   - Better ball separation after collisions
   - AI-vs-AI supported
   - Mobile pointer aiming uses table surface
   - Existing sound/audio system untouched
   - Existing HTML/CSS/themes untouched
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
    breakPowerMultiplier: 1.42,
    maxVelocity: 38,

    collisionRestitution: 0.94,
    railRestitution: 0.88,

    pocketRadius: 34,
    pocketCaptureRadius: 30,

    /*
     * This is the main anti-tunneling fix.
     * Instead of moving the balls once per frame,
     * each frame is divided into multiple physics steps.
     */
    physicsSubsteps: 6,

    maxFrameMs: 50,

    aiDelay: 850,
    playerTime: 600,
    challengeTime: 120,

    aimStep: 2.5,
    aimLineLength: 240,
    aiMaxThinkTime: 1800,

    rackX: 735,
    rackY: 250,
    rackSpacing: 29.5,

    cueStartX: 210,
    cueStartY: 250
  };

  const $ = (id, selector) =>
    document.getElementById(id) ||
    document.querySelector(selector);

  const table =
    $("poolTable", ".pool-table");

  /*
   * IMPORTANT:
   * Aim interaction is attached to the table surface,
   * NOT the ball layer.
   *
   * Your CSS intentionally makes .ball-layer
   * pointer-events:none.
   */
  const surface =
    document.querySelector(".table-surface") ||
    document.getElementById("poolTable");

  const layer =
    $("ballLayer", ".ball-layer");

  const powerFill =
    $("powerFill", ".power-fill");

  const messageEl =
    $("poolMessage", ".pool-message");

  const turnEl =
    $("turnValue", ".turn-value");

  const timerEl =
    $("poolTimer", ".pool-timer");

  const modeSelect =
    $("poolMode", "#poolMode");

  const gameSelect =
    $("poolGame", "#poolGame");

  const aiSelect =
    $("poolAILevel", "#poolAILevel");

  const shootButton =
    $("shootBtn", "[data-action='shoot']");

  const resetButton =
    $("resetPool", "#resetPool");

  const newRackButton =
    $("newRackBtn", "#newRackBtn");

  const leftButton =
    $("aimLeft", "[data-action='aim-left']");

  const rightButton =
    $("aimRight", "[data-action='aim-right']");

  const lockButton =
    $("lockAim", "[data-action='lock-on']");

  const scoreEls = [
    $("score0", "#score0"),
    $("score1", "#score1")
  ];

  const groupEls = [
    $("group0", "#group0"),
    $("group1", "#group1")
  ];

  const playerCards = [
    $("player1", "#player1"),
    $("player2", "#player2")
  ];

  const playerStatusEls = [
    $("player1Status", "#player1Status"),
    $("player2Status", "#player2Status")
  ];

  const aimLineEl =
    $("aimLine", "#aimLine") ||
    document.querySelector(".aim-line");

  const state = {
    version: "3.4",

    gameType: "8ball",
    mode: "pvp",
    aiLevel: 1,

    balls: [],
    cueBall: null,

    currentPlayer: 0,
    players: [],

    shooting: false,
    aiming: false,
    aiThinking: false,

    aimAngle: 0,
    aimX: 0,
    aimY: 0,

    power: 0.55,

    breakShot: true,
    breakComplete: false,

    shotCount: 0,

    ballsPocketedThisTurn: [],

    foulThisTurn: false,
    foulReason: "",

    firstBallHit: null,
    objectBallHit: false,

    gameOver: false,

    challengeMode: false,
    challengeScore: 0,

    timerSeconds: CONFIG.playerTime,
    timerInterval: null,

    animationFrame: null,
    lastFrame: performance.now(),

    lockOn: false,
    lockedTarget: null,

    pointerId: null,

    shotTarget: null,
    lowestBallAtShotStart: null,

    lastShotResult: ""
  };

  const clamp = (v, min, max) =>
    Math.max(min, Math.min(max, v));

  const dist = (a, b) =>
    Math.hypot(
      b.x - a.x,
      b.y - a.y
    );

  const norm = (x, y) => {
    const d = Math.hypot(x, y) || 1;

    return {
      x: x / d,
      y: y / d
    };
  };

  function player() {
    return state.players[
      state.currentPlayer
    ];
  }

  function tableSize() {
    return {
      width:
        table?.clientWidth ||
        CONFIG.tableWidth,

      height:
        table?.clientHeight ||
        CONFIG.tableHeight
    };
  }

  function sx() {
    return (
      tableSize().width /
      CONFIG.tableWidth
    );
  }

  function sy() {
    return (
      tableSize().height /
      CONFIG.tableHeight
    );
  }

  function rx(x) {
    return x * sx();
  }

  function ry(y) {
    return y * sy();
  }

  function msg(text, type = "") {
    if (!messageEl) return;

    messageEl.textContent = text;

    messageEl.className =
      "pool-message" +
      (type ? ` ${type}` : "");
  }

  function pockets() {
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

  function makeBall(number, x, y) {
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

  function groupForNumber(number) {
    if (
      number >= 1 &&
      number <= 7
    ) {
      return "solid";
    }

    if (
      number >= 9 &&
      number <= 15
    ) {
      return "stripe";
    }

    return "eight";
  }

  function groupLabel(group) {
    if (group === "solid") {
      return "SOLIDS";
    }

    if (group === "stripe") {
      return "STRIPES";
    }

    if (group === "eight") {
      return "8-BALL";
    }

    return "OPEN";
  }

  function remainingObjectBalls() {
    return state.balls.filter(
      ball =>
        ball.number !== 0 &&
        !ball.pocketed
    );
  }

  function remainingGroupBalls(group) {
    return remainingObjectBalls().filter(
      ball =>
        groupForNumber(ball.number) ===
        group
    );
  }

  function groupIsCleared(group) {
    return (
      remainingGroupBalls(group)
        .length === 0
    );
  }

  function aiName() {
    return {
      1: "RO'Lyfe AI — START-UP",
      2: "RO'Lyfe AI — INVESTOR",
      3: "RO'Lyfe AI — EMG",
      4: "RO'Lyfe AI — ACE",
      5: "RO'Lyfe AI — 7FIGURES"
    }[+state.aiLevel] ||
      "RO'Lyfe AI";
  }

  function configurePlayers() {
    if (
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
          name: aiName(),
          type: "ai",
          score: 0,
          group: null,
          fouls: 0
        }
      ];

      return;
    }

    if (
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

      return;
    }

    if (
      state.mode === "challenge"
    ) {
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
          name: "Challenge",
          type: "system",
          score: 0,
          group: null,
          fouls: 0
        }
      ];

      return;
    }

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

  /*
   * ---------------------------------------------------------
   * 8-BALL RACK
   * ---------------------------------------------------------
   */

  function create8BallRack() {
    const numbers = [
      1, 9, 2,
      10, 8, 3,
      11, 4, 12,
      5, 13, 6,
      14, 7, 15
    ];

    let index = 0;

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
        const x =
          CONFIG.rackX +
          row *
            CONFIG.rackSpacing *
            0.8660254;

        const y =
          CONFIG.rackY +
          (
            col -
            row / 2
          ) *
            CONFIG.rackSpacing;

        state.balls.push(
          makeBall(
            numbers[index++],
            x,
            y
          )
        );
      }
    }
  }

  /*
   * ---------------------------------------------------------
   * 9-BALL DIAMOND
   * ---------------------------------------------------------
   */

  function create9BallRack() {
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
      1, 2, 3,
      4, 9, 5,
      6, 7, 8
    ];

    positions.forEach(
      (position, index) => {
        const row =
          position[0];

        const offset =
          position[1];

        state.balls.push(
          makeBall(
            numbers[index],

            CONFIG.rackX +
              row *
                CONFIG.rackSpacing *
                0.8660254,

            CONFIG.rackY +
              offset *
                CONFIG.rackSpacing
          )
        );
      }
    );
  }

  function createPracticeRack() {
    const spots = [
      [690, 205, 1],
      [735, 205, 2],
      [780, 205, 3],

      [712, 250, 4],
      [758, 250, 5],

      [690, 295, 6],
      [735, 295, 7],
      [780, 295, 8]
    ];

    spots.forEach(
      ([x, y, number]) => {
        state.balls.push(
          makeBall(
            number,
            x,
            y
          )
        );
      }
    );
  }

  function createRack() {
    state.balls = [];

    const cue =
      makeBall(
        0,
        CONFIG.cueStartX,
        CONFIG.cueStartY
      );

    state.cueBall = cue;

    state.balls.push(cue);

    if (
      state.gameType === "9ball"
    ) {
      create9BallRack();
    } else if (
      state.gameType === "practice"
    ) {
      createPracticeRack();
    } else {
      create8BallRack();
    }
  }

  /*
   * ---------------------------------------------------------
   * BALL DOM
   * ---------------------------------------------------------
   */

  function createBallElement(ball) {
    const element =
      document.createElement(
        "div"
      );

    element.className = "ball";

    element.dataset.ball =
      ball.number;

    if (ball.number === 0) {
      element.classList.add(
        "white",
        "cue"
      );
    } else {
      element.classList.add(
        `ball-${ball.number}`
      );

      element.textContent =
        ball.number;

      element.dataset.group =
        groupForNumber(
          ball.number
        );
    }

    if (layer) {
      layer.appendChild(
        element
      );
    }

    ball.element = element;

    return element;
  }

  function render() {
    if (!layer) return;

    for (
      const ball of state.balls
    ) {
      if (!ball.element) {
        createBallElement(
          ball
        );
      }

      if (ball.pocketed) {
        ball.element.style.display =
          "none";

        continue;
      }

      ball.element.style.display =
        "flex";

      ball.element.style.left =
        `${rx(ball.x)}px`;

      ball.element.style.top =
        `${ry(ball.y)}px`;

      ball.element.style.transform =
        "translate(-50%, -50%)";
    }
  }

  /*
   * ---------------------------------------------------------
   * POWER
   * ---------------------------------------------------------
   */

  function updatePowerUI() {
    if (powerFill) {
      powerFill.style.width =
        `${state.power * 100}%`;
    }

    document
      .querySelectorAll(
        ".power-value"
      )
      .forEach(element => {
        element.textContent =
          `${Math.round(
            state.power * 100
          )}%`;
      });

    const value =
      $("powerValue", "#powerValue");

    if (value) {
      value.textContent =
        `${Math.round(
          state.power * 100
        )}%`;
    }
  }

  function setPower(value) {
    state.power =
      clamp(
        +value || 0,
        0,
        1
      );

    updatePowerUI();
  }

  /*
   * ---------------------------------------------------------
   * TIMER
   * ---------------------------------------------------------
   */

  function updateTimer() {
    if (!timerEl) return;

    const seconds =
      Math.max(
        0,
        Math.floor(
          state.timerSeconds
        )
      );

    timerEl.textContent =
      `${String(
        Math.floor(
          seconds / 60
        )
      ).padStart(2, "0")}:${String(
        seconds % 60
      ).padStart(2, "0")}`;

    timerEl.classList.toggle(
      "warning",
      seconds <= 30
    );

    timerEl.classList.toggle(
      "danger",
      seconds <= 10
    );
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

          if (
            state.timerSeconds <=
            0
          ) {
            state.timerSeconds =
              0;

            updateTimer();

            msg(
              `${player().name} ran out of time.`,
              "warning"
            );

            switchPlayer();
          } else {
            updateTimer();
          }
        },
        1000
      );
  }

  function resetTimer() {
    state.timerSeconds =
      state.challengeMode
        ? CONFIG.challengeTime
        : CONFIG.playerTime;

    updateTimer();
  }

  /*
   * ---------------------------------------------------------
   * UI
   * ---------------------------------------------------------
   */

  function updateUI() {
    if (turnEl) {
      turnEl.textContent =
        `${player().name} — YOUR TURN`;
    }

    state.players.forEach(
      (p, index) => {
        if (scoreEls[index]) {
          scoreEls[index]
            .textContent =
            p.score;
        }

        if (groupEls[index]) {
          groupEls[index]
            .textContent =
            groupLabel(
              p.group
            );
        }

        if (
          playerCards[index]
        ) {
          playerCards[index]
            .classList.toggle(
              "active",
              index ===
                state.currentPlayer
            );
        }

        if (
          playerStatusEls[index]
        ) {
          if (
            p.type === "ai"
          ) {
            playerStatusEls[index]
              .textContent =
              index ===
              state.currentPlayer
                ? "AI TURN"
                : "AI";
          } else {
            playerStatusEls[index]
              .textContent =
              index ===
              state.currentPlayer
                ? "YOUR TURN"
                : "WAITING";
          }
        }
      }
    );

    updateTimer();
  }

  /*
   * ---------------------------------------------------------
   * RESET / NEW RACK
   * ---------------------------------------------------------
   */

  function resetGame() {
    stopTimer();

    state.gameOver = false;
    state.shooting = false;
    state.aiming = false;
    state.aiThinking = false;

    state.currentPlayer = 0;

    state.breakShot =
      state.gameType !==
      "practice";

    state.breakComplete =
      false;

    state.shotCount = 0;

    state.ballsPocketedThisTurn =
      [];

    state.foulThisTurn =
      false;

    state.foulReason =
      "";

    state.firstBallHit =
      null;

    state.objectBallHit =
      false;

    state.challengeScore =
      0;

    state.challengeMode =
      state.mode ===
      "challenge";

    state.power =
      0.55;

    state.lockOn =
      false;

    state.lockedTarget =
      null;

    state.shotTarget =
      null;

    state.lowestBallAtShotStart =
      null;

    state.lastShotResult =
      "";

    configurePlayers();

    if (layer) {
      layer.innerHTML =
        "";
    }

    createRack();

    render();

    setAim(0);

    setPower(
      0.55
    );

    resetTimer();

    startTimer();

    updateUI();

    if (
      state.breakShot
    ) {
      msg(
        "PLAYER 1 TURN — BREAK THE RACK!"
      );
    } else {
      msg(
        "PLAYER 1 TURN — PRACTICE MODE"
      );
    }

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

    maybeStartAI();
  }

  /*
   * ---------------------------------------------------------
   * AIM
   * ---------------------------------------------------------
   */

  function setAim(angle) {
    state.aimAngle =
      angle;

    const cue =
      state.cueBall;

    if (
      !cue ||
      cue.pocketed
    ) {
      return;
    }

    state.aimX =
      cue.x +
      Math.cos(angle) *
        CONFIG.aimLineLength;

    state.aimY =
      cue.y +
      Math.sin(angle) *
        CONFIG.aimLineLength;

    drawAimLine();
  }

  function rotate(amount) {
    if (
      state.gameOver ||
      state.shooting ||
      state.aiThinking ||
      player().type !==
        "human"
    ) {
      return;
    }

    setAim(
      state.aimAngle +
        amount
    );
  }

  function drawAimLine() {
    const element =
      aimLineEl ||
      document.getElementById(
        "poolAimLine"
      );

    if (
      !element ||
      !state.cueBall
    ) {
      return;
    }

    element.style.display =
      "block";

    element.style.left =
      `${rx(
        state.cueBall.x
      )}px`;

    element.style.top =
      `${ry(
        state.cueBall.y
      )}px`;

    element.style.width =
      `${CONFIG.aimLineLength *
        sx()}px`;

    element.style.height =
      "2px";

    element.style.transformOrigin =
      "0 50%";

    element.style.transform =
      `rotate(${
        state.aimAngle *
        180 /
        Math.PI
      }deg)`;

    element.style.pointerEvents =
      "none";

    element.classList.toggle(
      "locked",
      state.lockOn
    );
  }

  function hideAim() {
    const element =
      aimLineEl ||
      document.getElementById(
        "poolAimLine"
      );

    if (element) {
      element.style.display =
        "none";
    }
  }

  /*
   * ---------------------------------------------------------
   * LEGAL TARGETS
   * ---------------------------------------------------------
   */

  function legalTargets() {
    const objects =
      remainingObjectBalls();

    if (
      state.gameType ===
      "9ball"
    ) {
      const lowest =
        objects.reduce(
          (best, ball) =>
            !best ||
            ball.number <
              best.number
              ? ball
              : best,
          null
        );

      return lowest
        ? [lowest]
        : [];
    }

    if (
      state.gameType ===
      "practice"
    ) {
      return objects;
    }

    const current =
      player();

    if (!current.group) {
      return objects.filter(
        ball =>
          ball.number !==
          8
      );
    }

    if (
      groupIsCleared(
        current.group
      )
    ) {
      return objects.filter(
        ball =>
          ball.number ===
          8
      );
    }

    return objects.filter(
      ball =>
        groupForNumber(
          ball.number
        ) ===
        current.group
    );
  }

  function nearestLegalTarget() {
    const targets =
      legalTargets();

    return (
      targets.sort(
        (a, b) =>
          dist(
            state.cueBall,
            a
          ) -
          dist(
            state.cueBall,
            b
          )
      )[0] ||
      null
    );
  }

  function lock() {
    if (
      state.gameOver ||
      state.shooting ||
      state.aiThinking ||
      player().type !==
        "human"
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

    const target =
      nearestLegalTarget();

    if (!target) {
      msg(
        "NO LEGAL TARGET AVAILABLE.",
        "warning"
      );

      return;
    }

    state.lockedTarget =
      target;

    state.lockOn =
      true;

    setAim(
      Math.atan2(
        target.y -
          state.cueBall.y,
        target.x -
          state.cueBall.x
      )
    );

    msg(
      `LOCKED ON — BALL ${target.number}`
    );
  }

  /*
   * ---------------------------------------------------------
   * POINTER AIM
   * ---------------------------------------------------------
   */

  function eventPoint(event) {
    const rect =
      (
        surface ||
        layer
      ).getBoundingClientRect();

    const touch =
      event.touches?.[0] ||
      event.changedTouches?.[0];

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
        clamp(
          (
            clientX -
            rect.left
          ) /
            rect.width,
          0,
          1
        ) *
        CONFIG.tableWidth,

      y:
        clamp(
          (
            clientY -
            rect.top
          ) /
            rect.height,
          0,
          1
        ) *
        CONFIG.tableHeight
    };
  }

  function startAim(event) {
    if (
      state.gameOver ||
      state.shooting ||
      state.aiThinking ||
      player().type !==
        "human" ||
      !state.cueBall ||
      state.cueBall.pocketed
    ) {
      return;
    }

    /*
     * V3.4:
     * You can begin aiming anywhere on the table.
     *
     * The old engine required the pointer to start
     * very close to the cue ball.
     */
    state.aiming =
      true;

    state.pointerId =
      event.pointerId ??
      null;

    updateAimFromPointer(
      event
    );

    if (
      event.cancelable
    ) {
      event.preventDefault();
    }
  }

  function updateAimFromPointer(
    event
  ) {
    if (
      !state.aiming
    ) {
      return;
    }

    const point =
      eventPoint(event);

    setAim(
      Math.atan2(
        point.y -
          state.cueBall.y,
        point.x -
          state.cueBall.x
      )
    );

    if (
      event.cancelable
    ) {
      event.preventDefault();
    }
  }

  function endAim(event) {
    if (
      !state.aiming
    ) {
      return;
    }

    updateAimFromPointer(
      event
    );

    state.aiming =
      false;

    state.pointerId =
      null;

    shoot();

    if (
      event.cancelable
    ) {
      event.preventDefault();
    }
  }

  /*
   * ---------------------------------------------------------
   * SHOT PREPARATION
   * ---------------------------------------------------------
   */

  function prepareShotRules() {
    state.ballsPocketedThisTurn =
      [];

    state.foulThisTurn =
      false;

    state.foulReason =
      "";

    state.firstBallHit =
      null;

    state.objectBallHit =
      false;

    if (
      state.gameType ===
      "9ball"
    ) {
      const objects =
        remainingObjectBalls();

      const lowest =
        objects.reduce(
          (best, ball) =>
            !best ||
            ball.number <
              best.number
              ? ball
              : best,
          null
        );

      state.lowestBallAtShotStart =
        lowest?.number ??
        null;
    } else {
      state.lowestBallAtShotStart =
        null;
    }

    state.shotTarget =
      nearestLegalTarget();
  }

  function shoot() {
    if (
      state.gameOver ||
      state.shooting ||
      state.aiThinking ||
      player().type !==
        "human"
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

  /*
   * ---------------------------------------------------------
   * FIRE
   * ---------------------------------------------------------
   */

  function fire(
    angle,
    powerValue
  ) {
    const cue =
      state.cueBall;

    if (
      !cue ||
      cue.pocketed ||
      state.shooting ||
      state.gameOver
    ) {
      return;
    }

    prepareShotRules();

    let powerAmount =
      Math.max(
        CONFIG.minPower,
        +powerValue || 0
      );

    /*
     * The break gets extra power ONLY on the
     * opening break.
     */
    if (
      state.breakShot
    ) {
      powerAmount =
        Math.max(
          powerAmount,
          0.78
        ) *
        CONFIG.breakPowerMultiplier;
    }

    const speed =
      clamp(
        CONFIG.maxPower *
          powerAmount,
        0,
        CONFIG.maxVelocity
      );

    cue.vx =
      Math.cos(angle) *
      speed;

    cue.vy =
      Math.sin(angle) *
      speed;

    state.lockOn =
      false;

    state.lockedTarget =
      null;

    setPower(0);

    hideAim();

    state.shooting =
      true;

    state.shotCount++;

    msg(
      state.breakShot
        ? `${player().name} BREAKING...`
        : `${player().name} IS SHOOTING...`
    );
  }

  /*
   * ---------------------------------------------------------
   * POCKETS
   * ---------------------------------------------------------
   */

  function isNearPocket(ball) {
    if (
      ball.pocketed
    ) {
      return false;
    }

    return pockets().some(
      pocket =>
        Math.hypot(
          ball.x -
            pocket.x,
          ball.y -
            pocket.y
        ) <=
        CONFIG.pocketCaptureRadius
    );
  }

  function pocket(ball) {
    if (
      ball.pocketed
    ) {
      return;
    }

    ball.pocketed =
      true;

    ball.vx =
      0;

    ball.vy =
      0;

    state.ballsPocketedThisTurn.push(
      ball.number
    );

    if (
      ball.number === 0
    ) {
      state.foulThisTurn =
        true;

      state.foulReason =
        "scratch";

      msg(
        "SCRATCH! CUE BALL POCKETED.",
        "warning"
      );

      return;
    }

    if (
      state.challengeMode
    ) {
      state.challengeScore++;
    }

    player().score++;

    updateUI();

    msg(
      ball.number === 8
        ? "8-BALL POCKETED!"
        : ball.number === 9
          ? "9-BALL POCKETED!"
          : `BALL ${ball.number} POCKETED!`,
      "success"
    );
  }

  /*
   * ---------------------------------------------------------
   * RAILS
   * ---------------------------------------------------------
   */

  function rails(ball) {
    const radius =
      ball.radius;

    if (
      ball.x -
        radius <
      0
    ) {
      ball.x =
        radius;

      ball.vx =
        Math.abs(
          ball.vx
        ) *
        CONFIG.railRestitution;
    }

    if (
      ball.x +
        radius >
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

    if (
      ball.y -
        radius <
      0
    ) {
      ball.y =
        radius;

      ball.vy =
        Math.abs(
          ball.vy
        ) *
        CONFIG.railRestitution;
    }

    if (
      ball.y +
        radius >
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

  /*
   * ---------------------------------------------------------
   * BALL COLLISION
   * ---------------------------------------------------------
   *
   * V3.4:
   * Strong positional correction + equal-mass impulse.
   *
   * The physics loop now calls this repeatedly inside
   * multiple substeps so the cue ball cannot simply
   * "skip over" a target ball.
   */

  function resolveCollision(
    A,
    B
  ) {
    if (
      A.pocketed ||
      B.pocketed
    ) {
      return;
    }

    let dx =
      B.x - A.x;

    let dy =
      B.y - A.y;

    let distance =
      Math.hypot(
        dx,
        dy
      );

    const minimumDistance =
      A.radius +
      B.radius;

    if (
      distance >=
      minimumDistance
    ) {
      return;
    }

    if (
      distance <
      0.000001
    ) {
      dx = 1;
      dy = 0;
      distance = 1;
    }

    const nx =
      dx / distance;

    const ny =
      dy / distance;

    const overlap =
      minimumDistance -
      distance;

    /*
     * Push both balls apart.
     * This prevents the rack from remaining visually fused.
     */
    A.x -=
      nx *
      overlap *
      0.51;

    A.y -=
      ny *
      overlap *
      0.51;

    B.x +=
      nx *
      overlap *
      0.51;

    B.y +=
      ny *
      overlap *
      0.51;

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

    /*
     * Negative means the balls are moving toward
     * one another.
     */
    if (
      relativeVelocity <
      0
    ) {
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
    }

    /*
     * Record the FIRST object ball touched by the cue.
     */
    if (
      A.number === 0 &&
      B.number !== 0
    ) {
      registerFirstContact(
        B
      );
    } else if (
      B.number === 0 &&
      A.number !== 0
    ) {
      registerFirstContact(
        A
      );
    }
  }

  function registerFirstContact(
    objectBall
  ) {
    if (!objectBall) {
      return;
    }

    if (
      state.firstBallHit ===
      null
    ) {
      state.firstBallHit =
        objectBall.number;

      state.objectBallHit =
        true;

      validateFirstContact(
        objectBall.number
      );
    }
  }

  function validateFirstContact(
    number
  ) {
    if (
      state.gameType ===
      "practice"
    ) {
      return;
    }

    /*
     * 9-BALL:
     * Must contact the lowest remaining ball first.
     */
    if (
      state.gameType ===
      "9ball"
    ) {
      if (
        number !==
        state.lowestBallAtShotStart
      ) {
        state.foulThisTurn =
          true;

        state.foulReason =
          `wrong first ball — ${number}`;
      }

      return;
    }

    /*
     * 8-BALL:
     * Open table allows any object ball except 8.
     */
    const current =
      player();

    if (!current.group) {
      if (
        number === 8
      ) {
        state.foulThisTurn =
          true;

        state.foulReason =
          "8-ball hit on open table";
      }

      return;
    }

    /*
     * If the player's group is cleared,
     * the 8 becomes legal.
     */
    const cleared =
      groupIsCleared(
        current.group
      );

    if (cleared) {
      if (
        number !== 8
      ) {
        state.foulThisTurn =
          true;

        state.foulReason =
          "wrong first ball";
      }

      return;
    }

    /*
     * Otherwise player must hit their own group.
     */
    if (
      groupForNumber(
        number
      ) !==
      current.group
    ) {
      state.foulThisTurn =
        true;

      state.foulReason =
        "wrong first ball";
    }
  }

  /*
   * ---------------------------------------------------------
   * PHYSICS STEP
   * ---------------------------------------------------------
   */

  function physicsStep(
    stepScale
  ) {
    /*
     * MOVE
     */
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
        stepScale;

      ball.y +=
        ball.vy *
        stepScale;

      /*
       * Pocket BEFORE rail clamp.
       * This allows balls to enter corner pockets.
       */
      if (
        isNearPocket(ball)
      ) {
        pocket(ball);
        continue;
      }

      rails(ball);

      /*
       * Friction.
       */
      const friction =
        Math.pow(
          CONFIG.friction,
          stepScale
        );

      ball.vx *=
        friction;

      ball.vy *=
        friction;

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
          stepScale;

        ball.vx -=
          (
            ball.vx /
            speed
          ) *
          resistance;

        ball.vy -=
          (
            ball.vy /
            speed
          ) *
          resistance;
      }

      if (
        Math.abs(
          ball.vx
        ) <
        CONFIG.stopVelocity
      ) {
        ball.vx = 0;
      }

      if (
        Math.abs(
          ball.vy
        ) <
        CONFIG.stopVelocity
      ) {
        ball.vy = 0;
      }
    }

    /*
     * COLLISION PASSES
     *
     * Two passes per substep makes rack separation much
     * more stable without needing a separate physics library.
     */
    const active =
      state.balls.filter(
        ball =>
          !ball.pocketed
      );

    for (
      let pass = 0;
      pass < 2;
      pass++
    ) {
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
          resolveCollision(
            active[i],
            active[j]
          );
        }
      }
    }

    /*
     * Collision can push a ball into a pocket.
     */
    for (
      const ball of active
    ) {
      if (
        !ball.pocketed &&
        isNearPocket(ball)
      ) {
        pocket(ball);
      }
    }
  }

  function moving() {
    return state.balls.some(
      ball =>
        !ball.pocketed &&
        (
          Math.abs(
            ball.vx
          ) >
            CONFIG.stopVelocity ||
          Math.abs(
            ball.vy
          ) >
            CONFIG.stopVelocity
        )
    );
  }

  /*
   * ---------------------------------------------------------
   * MAIN PHYSICS
   * ---------------------------------------------------------
   */

  function physics(dt) {
    const frameScale =
      clamp(
        dt /
          16.6667,
        0.35,
        3
      );

    /*
     * V3.4 anti-tunneling:
     * Split every animation frame into six physics steps.
     */
    const substeps =
      CONFIG.physicsSubsteps;

    const stepScale =
      frameScale /
      substeps;

    for (
      let step = 0;
      step < substeps;
      step++
    ) {
      if (
        !state.shooting
      ) {
        break;
      }

      physicsStep(
        stepScale
      );
    }

    /*
     * Only finish after ALL balls have settled.
     */
    if (
      !moving()
    ) {
      finishShot();
    }
  }

  /*
   * ---------------------------------------------------------
   * CUE BALL RESPOT
   * ---------------------------------------------------------
   */

  function respotCueBall() {
    const cue =
      state.cueBall;

    if (!cue) {
      return;
    }

    cue.pocketed =
      false;

    cue.vx = 0;
    cue.vy = 0;

    const candidates = [
      [
        CONFIG.cueStartX,
        CONFIG.cueStartY
      ],

      [150, 250],
      [120, 150],
      [120, 350],
      [180, 100],
      [180, 400]
    ];

    for (
      const [
        x,
        y
      ] of candidates
    ) {
      const occupied =
        state.balls.some(
          ball =>
            ball !== cue &&
            !ball.pocketed &&
            Math.hypot(
              ball.x - x,
              ball.y - y
            ) <
              CONFIG.ballRadius *
              2.2
        );

      if (!occupied) {
        cue.x = x;
        cue.y = y;
        break;
      }
    }

    setAim(
      state.aimAngle
    );

    render();
  }

  /*
   * ---------------------------------------------------------
   * 8-BALL GROUP ASSIGNMENT
   * ---------------------------------------------------------
   */

  function assignGroupFromPocket() {
    if (
      state.gameType !==
      "8ball"
    ) {
      return;
    }

    const current =
      player();

    if (
      current.group
    ) {
      return;
    }

    const firstGroupBall =
      state.ballsPocketedThisTurn.find(
        number =>
          number !== 0 &&
          number !== 8
      );

    if (
      !firstGroupBall
    ) {
      return;
    }

    const group =
      groupForNumber(
        firstGroupBall
      );

    current.group =
      group;

    const opponent =
      state.players[
        state.currentPlayer
          ? 0
          : 1
      ];

    if (opponent) {
      opponent.group =
        group === "solid"
          ? "stripe"
          : "solid";
    }

    updateUI();

    msg(
      `${current.name}: ${groupLabel(group)} — GROUP ASSIGNED!`,
      "success"
    );
  }

  /*
   * ---------------------------------------------------------
   * 8-BALL FINISH
   * ---------------------------------------------------------
   */

  function validate8BallFinish() {
    const eight =
      state.balls.find(
        ball =>
          ball.number === 8
      );

    if (
      !eight ||
      !eight.pocketed
    ) {
      return false;
    }

    const current =
      player();

    /*
     * 8 on an open table = loss.
     */
    if (
      !current.group
    ) {
      const opponent =
        state.players[
          state.currentPlayer
            ? 0
            : 1
        ];

      endGame(
        opponent,
        "8-ball pocketed too early"
      );

      return true;
    }

    /*
     * Player must clear their group first.
     */
    if (
      !groupIsCleared(
        current.group
      )
    ) {
      const opponent =
        state.players[
          state.currentPlayer
            ? 0
            : 1
        ];

      endGame(
        opponent,
        "8-ball pocketed too early"
      );

      return true;
    }

    /*
     * Legal 8.
     */
    endGame(
      current,
      "legal 8-ball"
    );

    return true;
  }

  /*
   * ---------------------------------------------------------
   * 9-BALL FINISH
   * ---------------------------------------------------------
   */

  function validate9BallFinish() {
    const nine =
      state.balls.find(
        ball =>
          ball.number === 9
      );

    if (
      !nine ||
      !nine.pocketed
    ) {
      return false;
    }

    /*
     * 9 pocketed illegally:
     * respot instead of winning.
     */
    if (
      state.foulThisTurn ||
      state.firstBallHit !==
        state.lowestBallAtShotStart
    ) {
      nine.pocketed =
        false;

      nine.vx = 0;
      nine.vy = 0;

      nine.x =
        CONFIG.rackX;

      nine.y =
        CONFIG.rackY;

      render();

      msg(
        "ILLEGAL 9-BALL — 9-BALL RESPOTTED.",
        "warning"
      );

      return false;
    }

    endGame(
      player(),
      "legal 9-ball"
    );

    return true;
  }

  /*
   * ---------------------------------------------------------
   * SHOT FINISH
   * ---------------------------------------------------------
   */

  function finishShot() {
    if (
      !state.shooting
    ) {
      return;
    }

    state.shooting =
      false;

    const objectsPocketed =
      state.ballsPocketedThisTurn.some(
        number =>
          number !== 0
      );

    /*
     * PRACTICE
     */
    if (
      state.gameType ===
      "practice"
    ) {
      if (
        objectsPocketed
      ) {
        resetTimer();

        msg(
          "NICE SHOT — CONTINUE!",
          "success"
        );
      } else {
        switchPlayer();
      }

      return;
    }

    /*
     * FOUL
     */
    if (
      state.foulThisTurn
    ) {
      player().fouls++;

      const reason =
        state.foulReason
          ? ` — ${state.foulReason}`
          : "";

      const eightPocketed =
        state.balls.some(
          ball =>
            ball.number === 8 &&
            ball.pocketed
        );

      if (
        state.gameType ===
          "8ball" &&
        eightPocketed
      ) {
        const opponent =
          state.players[
            state.currentPlayer
              ? 0
              : 1
          ];

        endGame(
          opponent,
          `8-ball foul${reason}`
        );

        return;
      }

      respotCueBall();

      msg(
        `FOUL${reason.toUpperCase()}. CUE BALL IN HAND.`,
        "warning"
      );

      switchPlayer();

      return;
    }

    /*
     * Assign 8-ball groups after a legal object-ball
     * pocket, not before.
     */
    assignGroupFromPocket();

    /*
     * 8-ball validation.
     */
    if (
      state.gameType ===
        "8ball" &&
      validate8BallFinish()
    ) {
      return;
    }

    /*
     * 9-ball validation.
     */
    if (
      state.gameType ===
        "9ball" &&
      validate9BallFinish()
    ) {
      return;
    }

    /*
     * -------------------------------------------------------
     * OPENING BREAK IS NOW CONSUMED.
     * This prevents repeated break shots.
     * -------------------------------------------------------
     */
    if (
      state.breakShot
    ) {
      state.breakShot =
        false;

      state.breakComplete =
        true;

      if (
        objectsPocketed
      ) {
        resetTimer();

        msg(
          `${player().name} MADE THE BREAK — CONTINUE!`,
          "success"
        );
      } else {
        msg(
          "DRY BREAK — NEXT PLAYER.",
          "warning"
        );

        switchPlayer();
      }

      updateUI();

      return;
    }

    /*
     * NORMAL SHOT
     */
    if (
      objectsPocketed
    ) {
      resetTimer();

      msg(
        `${player().name} CONTINUES — NICE SHOT!`,
        "success"
      );
    } else {
      switchPlayer();
    }

    updateUI();
  }

  /*
   * ---------------------------------------------------------
   * TURN SWITCH
   * ---------------------------------------------------------
   */

  function switchPlayer() {
    if (
      state.gameOver
    ) {
      return;
    }

    state.currentPlayer =
      state.currentPlayer
        ? 0
        : 1;

    state.ballsPocketedThisTurn =
      [];

    state.foulThisTurn =
      false;

    state.foulReason =
      "";

    state.firstBallHit =
      null;

    state.objectBallHit =
      false;

    state.lockOn =
      false;

    state.lockedTarget =
      null;

    resetTimer();

    updateUI();

    if (
      player().type ===
      "ai"
    ) {
      msg(
        `${player().name} IS THINKING...`
      );

      setTimeout(
        runAI,
        CONFIG.aiDelay
      );
    } else {
      msg(
        `${player().name} — YOUR TURN`,
        "success"
      );
    }
  }

  /*
   * ---------------------------------------------------------
   * GAME OVER
   * ---------------------------------------------------------
   */

  function endGame(
    winner,
    reason = ""
  ) {
    state.gameOver =
      true;

    state.shooting =
      false;

    state.aiThinking =
      false;

    stopTimer();

    hideAim();

    const reasonText =
      reason
        ? ` ${reason.toUpperCase()}.`
        : "";

    msg(
      `🏆 ${winner?.name || "WINNER"} WINS!${reasonText}`,
      "success"
    );

    updateUI();

    const modal =
      $("gameOverModal",
        "#gameOverModal");

    const finalScore =
      $("finalScore",
        "#finalScore");

    if (
      finalScore
    ) {
      finalScore.textContent =
        `${winner?.name || "Winner"} wins.${reason ? ` ${reason}.` : ""}`;
    }

    if (
      modal
    ) {
      modal.classList.remove(
        "hidden"
      );
    }
  }

  /*
   * ---------------------------------------------------------
   * AI
   * ---------------------------------------------------------
   */

  function chooseAIPocketTarget(
    target
  ) {
    const candidates = [
      { x: 0, y: 0 },

      {
        x:
          CONFIG.tableWidth /
          2,
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
          CONFIG.tableWidth /
          2,
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

    return candidates.sort(
      (a, b) =>
        (
          dist(
            target,
            a
          ) +
          dist(
            state.cueBall,
            a
          )
        ) -
        (
          dist(
            target,
            b
          ) +
          dist(
            state.cueBall,
            b
          )
        )
    )[0];
  }

  function ghostBallAim(
    target,
    pocket
  ) {
    const fromPocket =
      norm(
        target.x -
          pocket.x,

        target.y -
          pocket.y
      );

    const ghost = {
      x:
        target.x +
        fromPocket.x *
          CONFIG.ballRadius *
          2,

      y:
        target.y +
        fromPocket.y *
          CONFIG.ballRadius *
          2
    };

    return Math.atan2(
      ghost.y -
        state.cueBall.y,

      ghost.x -
        state.cueBall.x
    );
  }

  function runAI() {
    if (
      state.gameOver ||
      state.shooting ||
      player().type !==
        "ai"
    ) {
      return;
    }

    state.aiThinking =
      true;

    const target =
      nearestLegalTarget();

    if (!target) {
      state.aiThinking =
        false;

      switchPlayer();

      return;
    }

    const level =
      clamp(
        +state.aiLevel ||
          1,
        1,
        5
      );

    let angle =
      Math.atan2(
        target.y -
          state.cueBall.y,

        target.x -
          state.cueBall.x
      );

    /*
     * Better AI levels use ghost-ball aiming.
     */
    if (
      state.gameType !==
        "practice" &&
      level >= 3
    ) {
      const pocket =
        chooseAIPocketTarget(
          target
        );

      angle =
        ghostBallAim(
          target,
          pocket
        );
    }

    const errorScale =
      {
        1: 0.18,
        2: 0.11,
        3: 0.075,
        4: 0.045,
        5: 0.025
      }[level];

    angle +=
      (
        Math.random() -
        0.5
      ) *
      errorScale;

    let aiPower;

    if (
      state.breakShot
    ) {
      aiPower =
        0.92;
    } else {
      aiPower =
        clamp(
          0.38 +
            dist(
              state.cueBall,
              target
            ) /
              1000 +
            level *
              0.045,

          0.30,
          0.88
        );
    }

    const delay =
      Math.min(
        300 +
          (6 - level) *
            120 +
          Math.random() *
            250,

        CONFIG.aiMaxThinkTime
      );

    setTimeout(
      () => {
        if (
          state.gameOver ||
          player().type !==
            "ai"
        ) {
          state.aiThinking =
            false;

          return;
        }

        state.aiThinking =
          false;

        /*
         * AI uses fire() directly so AI-vs-AI
         * is not blocked by the human shoot gate.
         */
        fire(
          angle,
          aiPower
        );
      },
      delay
    );
  }

  function maybeStartAI() {
    if (
      !state.gameOver &&
      player().type ===
        "ai"
    ) {
      msg(
        `${player().name} IS THINKING...`
      );

      setTimeout(
        runAI,
        CONFIG.aiDelay
      );
    }
  }

  /*
   * ---------------------------------------------------------
   * GAME LOOP
   * ---------------------------------------------------------
   */

  function loop(
    timestamp
  ) {
    const dt =
      clamp(
        timestamp -
          state.lastFrame,

        0,
        CONFIG.maxFrameMs
      );

    state.lastFrame =
      timestamp;

    if (
      state.shooting
    ) {
      physics(dt);
    }

    render();

    if (
      state.aiming ||
      state.lockOn
    ) {
      drawAimLine();
    }

    state.animationFrame =
      requestAnimationFrame(
        loop
      );
  }

  /*
   * ---------------------------------------------------------
   * POWER BUTTONS
   * ---------------------------------------------------------
   */

  document
    .querySelectorAll(
      "[data-power='increase'],.power-plus,#powerPlus,#powerUp"
    )
    .forEach(
      button => {
        button.addEventListener(
          "click",
          () =>
            setPower(
              state.power +
                0.05
            )
        );
      }
    );

  document
    .querySelectorAll(
      "[data-power='decrease'],.power-minus,#powerMinus,#powerDown"
    )
    .forEach(
      button => {
        button.addEventListener(
          "click",
          () =>
            setPower(
              state.power -
                0.05
            )
        );
      }
    );

  /*
   * ---------------------------------------------------------
   * BUTTON EVENTS
   * ---------------------------------------------------------
   */

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
    resetGame
  );

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

  /*
   * ---------------------------------------------------------
   * POINTER / TOUCH AIM
   * ---------------------------------------------------------
   *
   * V3.4 attaches these listeners to .table-surface.
   * This matters because .ball-layer has pointer-events:none.
   */

  if (surface) {
    surface.addEventListener(
      "pointerdown",
      event => {
        if (
          event.pointerType ===
            "mouse" &&
          event.button !== 0
        ) {
          return;
        }

        try {
          surface.setPointerCapture?.(
            event.pointerId
          );
        } catch (_) {}

        startAim(event);
      }
    );

    surface.addEventListener(
      "pointermove",
      event => {
        if (
          state.pointerId !==
            null &&
          event.pointerId !==
            state.pointerId
        ) {
          return;
        }

        updateAimFromPointer(
          event
        );
      }
    );

    surface.addEventListener(
      "pointerup",
      event => {
        if (
          state.pointerId !==
            null &&
          event.pointerId !==
            state.pointerId
        ) {
          return;
        }

        endAim(event);

        try {
          surface.releasePointerCapture?.(
            event.pointerId
          );
        } catch (_) {}
      }
    );

    surface.addEventListener(
      "pointercancel",
      () => {
        state.aiming =
          false;

        state.pointerId =
          null;
      }
    );
  }

  /*
   * ---------------------------------------------------------
   * KEYBOARD
   * ---------------------------------------------------------
   */

  document.addEventListener(
    "keydown",
    event => {
      if (
        event.code ===
        "Space"
      ) {
        event.preventDefault();

        if (
          player().type ===
          "human"
        ) {
          shoot();
        }
      }

      if (
        event.key ===
        "ArrowLeft"
      ) {
        event.preventDefault();

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
    }
  );

  /*
   * ---------------------------------------------------------
   * PUBLIC RO'LYFE POOL API
   * ---------------------------------------------------------
   */

  window.ROLYFE_POOL = {
    version: "3.4",

    state,

    reset:
      resetGame,

    resetGame,

    shoot,

    aimLeft:
      () =>
        rotate(
          -CONFIG.aimStep *
            Math.PI /
            180
        ),

    aimRight:
      () =>
        rotate(
          CONFIG.aimStep *
            Math.PI /
            180
        ),

    lockOn:
      lock,

    setPower:
      value =>
        setPower(
          clamp(
            +value || 0,
            0,
            1
          )
        ),

    setMode:
      mode => {
        state.mode =
          mode;

        resetGame();
      },

    setGameType:
      type => {
        state.gameType =
          type;

        resetGame();
      },

    setAILevel:
      level => {
        state.aiLevel =
          clamp(
            +level || 1,
            1,
            5
          );

        resetGame();
      },

    getScore:
      () =>
        state.players.map(
          p => ({
            name:
              p.name,

            score:
              p.score,

            group:
              p.group,

            fouls:
              p.fouls
          })
        ),

    getState:
      () =>
        state
  };

  /*
   * ---------------------------------------------------------
   * INITIALIZE FROM HTML
   * ---------------------------------------------------------
   */

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

  resetGame();

})();
