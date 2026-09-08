/* =========================================================
   RO'LYFE GAMING™ — POOL ENGINE V3.2
   Replacement for: games/pool/pool.js

   V3.2 STABILIZATION
   ---------------------------------------------------------
   • AI vs AI auto-start
   • AI turn safety timer
   • Proper 9-Ball rack
   • Proper 9-Ball lowest-ball-first rule
   • 9-Ball victory handling
   • 8-Ball victory handling preserved
   • AI turn cancellation/reset protection
   • Mobile touch/scroll stabilization
   • Existing Pool UI preserved
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
    aiTurnTime: 5000,
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
    aiTimerId: null,
    aiThinkStarted: 0,
    aiThinkRemaining: 0,

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

  const rx = x =>
    x * sx();

  const ry = y =>
    y * sy();

  const player = () =>
    state.players[state.currentPlayer];

  const formatTime = seconds =>
    `${String(
      Math.floor(Math.max(0, seconds) / 60)
    ).padStart(2, "0")}:${String(
      Math.max(0, seconds) % 60
    ).padStart(2, "0")}`;


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


  function pocketed(ballObject) {
    if (ballObject.pocketed) return false;

    return pockets().some(p =>
      Math.hypot(
        ballObject.x - p.x,
        ballObject.y - p.y
      ) <= CONFIG.pocketCaptureRadius
    );
  }


  /* =========================================================
     BALL
     ========================================================= */

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

    const aiName = () => ({
      1: "RO'Lyfe AI — START-UP",
      2: "RO'Lyfe AI — START-UP+",
      3: "RO'Lyfe AI — INVESTOR",
      4: "RO'Lyfe AI — INVESTOR+",
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

      return;
    }


    if (state.mode === "aivai") {

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

      return;
    }


    if (state.mode === "challenge") {

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


  /* =========================================================
     8-BALL RACK
     ========================================================= */

  function create8BallRack() {

    const cue = createBall(
      0,
      210,
      250
    );

    state.cueBall = cue;
    state.balls = [cue];

    const spacing =
      CONFIG.ballRadius * 2.04;

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
            rackY +
              (col - row / 2) *
              spacing
          )
        );

        number++;
      }
    }
  }


  /* =========================================================
     PROPER 9-BALL RACK
     
     Triangle:
     
                  1
                /   \
              2       3
             /   9     \
           4      5      6
          /   7     8     \
     
     The exact outside-ball order is randomized,
     but:
       • 1-ball is at the apex
       • 9-ball is in the center
     ========================================================= */

  function create9BallRack() {

    const cue = createBall(
      0,
      210,
      250
    );

    state.cueBall = cue;
    state.balls = [cue];

    const spacing =
      CONFIG.ballRadius * 2.04;

    const rackX = 720;
    const rackY = 250;

    const numbers = [
      1, 2, 3, 4, 5, 6, 7, 8
    ];

    /*
      Shuffle the 2-8 balls.

      1 remains apex.
      9 remains center.
    */
    for (let i = numbers.length - 1; i > 0; i--) {

      const j =
        Math.floor(
          Math.random() * (i + 1)
        );

      [
        numbers[i],
        numbers[j]
      ] = [
        numbers[j],
        numbers[i]
      ];
    }

    const positions = [];

    for (let row = 0; row < 5; row++) {

      for (let col = 0; col <= row; col++) {

        positions.push({
          row,
          col
        });
      }
    }

    /*
      Position 0 = apex.
      Position 4 = center of triangle.
    */

    positions.forEach((pos, index) => {

      const x =
        rackX +
        pos.row *
        spacing *
        0.866;

      const y =
        rackY +
        (pos.col - pos.row / 2) *
        spacing;

      let number;

      if (index === 0) {

        number = 1;

      } else if (index === 4) {

        number = 9;

      } else {

        number =
          numbers.shift();
      }

      state.balls.push(
        createBall(
          number,
          x,
          y
        )
      );
    });
  }


  /* =========================================================
     RACK SELECTOR
     ========================================================= */

  function createRack() {

    if (state.gameType === "9ball") {

      create9BallRack();

      return;
    }

    create8BallRack();
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

          if (state.gameType === "9ball") {

            b.element.dataset.group =
              "nine-ball";

          } else {

            b.element.dataset.group =
              b.number <= 7
                ? "solid"
                : b.number === 8
                  ? "eight"
                  : "stripe";
          }
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
  }


  /* =========================================================
     POWER
     ========================================================= */

  function power(value) {

    state.power =
      clamp(+value, 0, 1);

    if (powerFill) {

      powerFill.style.width =
        `${state.power * 100}%`;
    }

    document
      .querySelectorAll(".power-value")
      .forEach(element => {

        element.textContent =
          `${Math.round(
            state.power * 100
          )}%`;
      });
  }


  /* =========================================================
     PLAYER TIMER
     ========================================================= */

  function updateTimer() {

    const seconds =
      Math.max(
        0,
        Math.floor(
          state.timerSeconds
        )
      );

    if (timerEl) {

      timerEl.textContent =
        formatTime(seconds);
    }

    const activeTimer =
      document.getElementById(
        `timer${state.currentPlayer}`
      );

    if (activeTimer) {

      activeTimer.textContent =
        formatTime(seconds);
    }
  }


  function startTimer() {

    stopTimer();

    if (state.paused || state.gameOver)
      return;

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
     AI TURN TIMER
     ========================================================= */

  function clearAITimer() {

    if (state.aiTimerId) {

      clearTimeout(
        state.aiTimerId
      );

      state.aiTimerId = null;
    }

    state.aiThinkStarted = 0;
    state.aiThinkRemaining = 0;
  }


  function startAITurnTimer() {

    clearAITimer();

    state.aiThinkStarted =
      performance.now();

    state.aiThinkRemaining =
      CONFIG.aiTurnTime;


    state.aiTimerId =
      setTimeout(() => {

        state.aiTimerId = null;

        if (
          state.gameOver ||
          state.paused ||
          player()?.type !== "ai"
        ) {
          state.aiThinking = false;
          updateUI();
          return;
        }

        /*
          Safety fallback.

          If AI somehow fails to complete
          its normal thinking cycle, fire
          a safe shot instead of becoming
          permanently stuck.
        */

        state.aiThinking = false;

        const targetBall =
          target();

        if (targetBall) {

          const angle =
            Math.atan2(
              targetBall.y -
                state.cueBall.y,
              targetBall.x -
                state.cueBall.x
            );

          const fallbackPower =
            state.breakShot
              ? 0.95
              : 0.55;

          updateUI();

          fire(
            angle,
            fallbackPower
          );

        } else {

          updateUI();

          switchPlayer();
        }

      }, CONFIG.aiTurnTime);
  }


  /* =========================================================
     UI
     ========================================================= */

  function updateUI() {

    const current =
      player();

    if (!current) return;


    if (turnEl) {

      turnEl.textContent =
        state.gameOver
          ? "GAME OVER"
          : current.name;
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

    timers.forEach(
      (element, index) => {

        element.textContent =
          index === state.currentPlayer
            ? formatTime(
                state.timerSeconds
              )
            : "10:00";
      }
    );


    const statuses = [
      document.getElementById(
        "player1Status"
      ),

      document.getElementById(
        "player2Status"
      )
    ];


    statuses.forEach(
      (element, index) => {

        if (!element) return;

        if (
          index ===
          state.currentPlayer
        ) {

          element.textContent =
            current.type === "ai"
              ? "THINKING"
              : "READY";

        } else {

          element.textContent =
            "WAITING";
        }
      }
    );


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
        (
          [
            "",
            "START-UP",
            "START-UP+",
            "INVESTOR",
            "INVESTOR+",
            "7FIGURES"
          ][state.aiLevel]
        ) ||
        "START-UP";
    }


    if (shotCount) {

      shotCount.textContent =
        String(
          state.shotCount
        );
    }


    if (aiStatus) {

      const isAI =
        current.type === "ai";

      aiStatus.classList.toggle(
        "hidden",
        !isAI
      );


      if (isAI) {

        if (state.aiThinking) {

          const elapsed =
            performance.now() -
            state.aiThinkStarted;

          const remaining =
            Math.max(
              0,
              CONFIG.aiTurnTime -
                elapsed
            );

          state.aiThinkRemaining =
            remaining;

          aiStatus.textContent =
            `AI THINKING… ${(
              remaining / 1000
            ).toFixed(1)}s`;

        } else {

          aiStatus.textContent =
            "AI READY";
        }
      }
    }


    updateTimer();
  }


  /* =========================================================
     RESET GAME
     ========================================================= */

  function resetGame() {

    stopTimer();

    clearAITimer();

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

    updateUI();

    hideModal(gameOverModal);

    msg(
      "PLAYER 1 TURN — BREAK THE RACK!"
    );

    state.lastFrame =
      performance.now();


    if (!state.animationFrame) {

      state.animationFrame =
        requestAnimationFrame(loop);
    }


    /*
      IMPORTANT:

      AI vs AI must begin automatically.

      Previously resetGame() always stopped
      after displaying PLAYER 1 TURN.

      Now an AI first player immediately
      enters its AI turn.
    */

    if (
      player() &&
      player().type === "ai"
    ) {

      beginAITurn();
    } else {

      startTimer();
    }
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
  }


  function rotate(angle) {

    if (
      state.gameOver ||
      state.shooting ||
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
        document.createElement(
          "div"
        );

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
  }


  /* =========================================================
     LEGAL TARGETS
     ========================================================= */

  function getLowest9Ball() {

    return state.balls
      .filter(
        b =>
          b.number !== 0 &&
          !b.pocketed
      )
      .sort(
        (a, b) =>
          a.number - b.number
      )[0] || null;
  }


  function legalTargets() {

    const available =
      state.balls.filter(
        b =>
          b.number !== 0 &&
          !b.pocketed
      );


    if (
      state.gameType === "9ball"
    ) {

      const lowest =
        getLowest9Ball();

      return lowest
        ? [lowest]
        : [];
    }


    return available.filter(
      b =>
        b.number !== 8
    );
  }


  function target() {

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


  /* =========================================================
     LOCK ON
     ========================================================= */

  function lock() {

    if (
      state.gameOver ||
      state.shooting ||
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


    const targetBall =
      target();


    if (!targetBall) {

      msg(
        "No available target.",
        "warning"
      );

      return;
    }


    state.lockedTarget =
      targetBall;

    state.lockOn = true;


    setAim(
      Math.atan2(
        targetBall.y -
          state.cueBall.y,

        targetBall.x -
          state.cueBall.x
      )
    );


    msg(
      `LOCKED ON — Ball ${targetBall.number}`
    );
  }


  /* =========================================================
     POINTER / TOUCH
     ========================================================= */

  function pointer(event) {

    const rect =
      interactionSurface
        .getBoundingClientRect();

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


  function startAim(event) {

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
      pointer(event);


    /*
      Only begin manual aiming when
      the user starts near the cue ball.
    */

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

    moveAim(event);

    if (event.cancelable) {

      event.preventDefault();
    }
  }


  function moveAim(event) {

    if (!state.aiming) return;

    const p =
      pointer(event);


    setAim(
      Math.atan2(
        p.y -
          state.cueBall.y,

        p.x -
          state.cueBall.x
      )
    );


    if (event.cancelable) {

      event.preventDefault();
    }
  }


  function endAim(event) {

    if (!state.aiming) return;

    moveAim(event);

    state.aiming = false;

    shoot();

    if (event.cancelable) {

      event.preventDefault();
    }
  }


  /* =========================================================
     SHOOT
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


    /*
      If this is an AI turn,
      end its thinking timer immediately.
    */

    clearAITimer();

    state.aiThinking = false;


    let speed =
      Math.max(
        CONFIG.minPower,
        powerValue
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
  }


  /* =========================================================
     RAILS
     ========================================================= */

  function rails(ballObject) {

    const r =
      ballObject.radius;


    if (
      ballObject.x - r < 0
    ) {

      ballObject.x = r;

      ballObject.vx =
        Math.abs(
          ballObject.vx
        ) *
        CONFIG.railRestitution;
    }


    if (
      ballObject.x + r >
      CONFIG.tableWidth
    ) {

      ballObject.x =
        CONFIG.tableWidth - r;

      ballObject.vx =
        -Math.abs(
          ballObject.vx
        ) *
        CONFIG.railRestitution;
    }


    if (
      ballObject.y - r < 0
    ) {

      ballObject.y = r;

      ballObject.vy =
        Math.abs(
          ballObject.vy
        ) *
        CONFIG.railRestitution;
    }


    if (
      ballObject.y + r >
      CONFIG.tableHeight
    ) {

      ballObject.y =
        CONFIG.tableHeight - r;

      ballObject.vy =
        -Math.abs(
          ballObject.vy
        ) *
        CONFIG.railRestitution;
    }
  }


  /* =========================================================
     COLLISIONS
     ========================================================= */

  function collisions() {

    const balls =
      state.balls.filter(
        b =>
          !b.pocketed
      );


    for (
      let i = 0;
      i < balls.length;
      i++
    ) {

      for (
        let j = i + 1;
        j < balls.length;
        j++
      ) {

        const A =
          balls[i];

        const B =
          balls[j];


        const dx =
          B.x - A.x;

        const dy =
          B.y - A.y;


        let distance =
          Math.hypot(
            dx,
            dy
          );


        const minimum =
          A.radius +
          B.radius;


        if (
          distance >=
          minimum
        ) {
          continue;
        }


        if (!distance) {

          distance =
            0.0001;
        }


        const nx =
          dx / distance;

        const ny =
          dy / distance;


        const overlap =
          minimum -
          distance;


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
          (B.vx - A.vx) *
            nx +

          (B.vy - A.vy) *
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
          First ball hit by the cue ball.

          This is critical for 9-Ball.
        */

        if (
          state.firstBallHit ===
          null
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
      }
    }
  }


  /* =========================================================
     POCKET
     ========================================================= */

  function pocket(ballObject) {

    if (
      ballObject.pocketed
    ) {
      return;
    }


    ballObject.pocketed =
      true;

    ballObject.vx = 0;
    ballObject.vy = 0;


    state.ballsPocketedThisTurn
      .push(
        ballObject.number
      );


    /*
      Cue ball scratch.
    */

    if (
      ballObject.number === 0
    ) {

      state.foulThisTurn = true;

      msg(
        "SCRATCH! Cue ball pocketed.",
        "warning"
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
      ballObject.number === 9
    ) {

      msg(
        "9-BALL POCKETED!",
        "success"
      );

    } else if (
      ballObject.number === 8
    ) {

      msg(
        "8-BALL POCKETED!",
        "success"
      );

    } else {

      msg(
        `Ball ${ballObject.number} pocketed!`,
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

  function physics(delta) {

    const frameScale =
      clamp(
        delta / 16.6667,
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
     RESPOT CUE BALL
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
            CONFIG.ballRadius *
            2.2
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


    cue.x = x;
    cue.y = y;


    setAim(
      state.aimAngle
    );

    render();
  }


  /* =========================================================
     9-BALL RULE VALIDATION
     ========================================================= */

  function validate9BallShot() {

    if (
      state.gameType !== "9ball"
    ) {
      return true;
    }


    const legalBall =
      getLowest9Ball();


    /*
      If there was no ball available
      before the shot, something unusual
      happened. Do not create a false foul.
    */

    if (!legalBall) {
      return true;
    }


    /*
      The cue must hit the lowest
      numbered ball first.
    */

    if (
      state.firstBallHit !==
      legalBall.number
    ) {

      state.foulThisTurn = true;

      msg(
        `FOUL — Ball ${legalBall.number} must be hit first.`,
        "warning"
      );

      return false;
    }


    return true;
  }


  /* =========================================================
     FINISH SHOT
     ========================================================= */

  function finishShot() {

    if (!state.shooting)
      return;


    state.shooting = false;


    /*
      9-Ball foul validation.
    */

    if (
      state.gameType ===
      "9ball"
    ) {

      validate9BallShot();
    }


    /*
      Scratch or illegal 9-Ball
      contact.
    */

    if (
      state.foulThisTurn
    ) {

      player().fouls++;

      respot();

      switchPlayer();

      return;
    }


    const objectsPocketed =
      state.ballsPocketedThisTurn
        .some(
          number =>
            number !== 0
        );


    /* =======================================================
       8-BALL WIN
       ======================================================= */

    if (
      state.gameType ===
      "8ball" &&

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
       9-BALL WIN

       The 9-ball is the game-winning
       ball. It does NOT require the
       8-ball to be hit first.

       The player must legally contact
       the lowest ball first.
       ======================================================= */

    if (
      state.gameType ===
      "9ball" &&

      state.balls.some(
        b =>
          b.number === 9 &&
          b.pocketed
      )
    ) {

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
        objectsPocketed
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
      objectsPocketed
    ) {

      resetTimer();

      msg(
        `${player().name} continues — nice shot!`,
        "success"
      );

      /*
        AI continues automatically
        when it legally keeps the turn.
      */

      if (
        player().type === "ai"
      ) {

        beginAITurn();
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


    clearAITimer();

    state.aiThinking = false;


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


    if (
      player().type === "ai"
    ) {

      beginAITurn();

    } else {

      startTimer();

      msg(
        `${player().name} — YOUR TURN`,
        "success"
      );
    }
  }


  /* =========================================================
     AI TURN START
     ========================================================= */

  function beginAITurn() {

    if (
      state.gameOver ||
      state.paused ||
      player()?.type !== "ai"
    ) {
      return;
    }


    clearAITimer();

    stopTimer();


    state.aiThinking = true;

    state.aiThinkStarted =
      performance.now();

    state.aiThinkRemaining =
      CONFIG.aiTurnTime;


    updateUI();


    msg(
      `${player().name} is thinking...`
    );


    /*
      Start the safety timer FIRST.
    */

    startAITurnTimer();


    /*
      Then schedule the actual AI decision.
    */

    const delay =
      Math.min(
        CONFIG.aiDelay,
        CONFIG.aiTurnTime - 250
      );


    setTimeout(
      runAI,
      Math.max(
        100,
        delay
      )
    );
  }


  /* =========================================================
     END GAME
     ========================================================= */

  function endGame(winner) {

    clearAITimer();

    stopTimer();


    state.gameOver = true;

    state.shooting = false;

    state.aiThinking = false;


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
        `${winnerName} wins • ` +
        `Player 1 ${
          state.players[0]?.score ||
          0
        } — ` +
        `Player 2 ${
          state.players[1]?.score ||
          0
        }`;
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
      return;
    }


    state.aiThinking = true;

    updateUI();


    const targetBall =
      target();


    if (!targetBall) {

      state.aiThinking = false;

      clearAITimer();

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
      AI accuracy improves with level.
    */

    const accuracy =
      0.80 +
      level * 0.035;


    const error =
      (
        1 -
        accuracy
      ) *
      (
        Math.random() -
        0.5
      ) *
      0.30;


    let angle =
      Math.atan2(
        targetBall.y -
          state.cueBall.y,

        targetBall.x -
          state.cueBall.x
      );


    angle += error;


    /*
      AI power.

      Break = strong.

      Normal shots scale with
      distance and level.
    */

    const shotPower =
      state.breakShot
        ? 0.95
        : clamp(
            0.38 +
            dist(
              state.cueBall,
              targetBall
            ) / 1000 +
            level * 0.045,

            0.28,
            0.88
          );


    const thinkDelay =
      Math.min(
        300 +
        (6 - level) *
          120 +
        Math.random() *
          250,

        CONFIG.aiMaxThinkTime
      );


    /*
      Do not allow thinking to exceed
      the AI turn timer.
    */

    const safeDelay =
      Math.min(
        thinkDelay,
        CONFIG.aiTurnTime -
          300
      );


    setTimeout(() => {

      if (
        state.gameOver ||
        state.paused ||
        player()?.type !== "ai"
      ) {

        state.aiThinking = false;

        clearAITimer();

        updateUI();

        return;
      }


      state.aiThinking = false;

      updateUI();


      fire(
        angle,
        shotPower
      );

    }, Math.max(150, safeDelay));
  }


  /* =========================================================
     LOOP
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

  function showModal(element) {

    if (element) {

      element.classList.remove(
        "hidden"
      );
    }
  }


  function hideModal(element) {

    if (element) {

      element.classList.add(
        "hidden"
      );
    }
  }


  /* =========================================================
     NEW RACK
     ========================================================= */

  function newRack() {

    clearAITimer();

    stopTimer();


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

    updateUI();


    msg(
      "PLAYER 1 TURN — BREAK THE RACK!"
    );


    /*
      AI vs AI new rack must also
      automatically begin.
    */

    if (
      player()?.type === "ai"
    ) {

      beginAITurn();

    } else {

      startTimer();
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

      stopTimer();

      clearAITimer();

      state.aiThinking = false;

      msg(
        "GAME PAUSED",
        "warning"
      );


      if (pauseButton) {

        pauseButton.textContent =
          "RESUME";
      }

    } else {

      updateUI();


      if (
        player()?.type === "ai"
      ) {

        beginAITurn();

      } else {

        startTimer();

        msg(
          `${player().name} — YOUR TURN`,
          "success"
        );
      }


      if (pauseButton) {

        pauseButton.textContent =
          "PAUSE";
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
     MOBILE SCREEN STABILITY
     ========================================================= */

  if (document.documentElement) {

    document.documentElement.style.overscrollBehavior =
      "none";
  }


  if (document.body) {

    document.body.style.overscrollBehavior =
      "none";
  }


  if (interactionSurface) {

    interactionSurface.style.touchAction =
      "none";

    interactionSurface.style.userSelect =
      "none";

    interactionSurface.style.webkitUserSelect =
      "none";
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
        () =>
          power(
            state.power + 0.05
          )
      );
    });


  document
    .querySelectorAll(
      "[data-power='decrease'],.power-minus,#powerMinus,#powerDown"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () =>
          power(
            state.power - 0.05
          )
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


  /*
    Sound button remains compatible
    with the existing UI.

    We are NOT changing the shared
    audio system in this Pool pass.
  */

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
     TABLE POINTER EVENTS
     ========================================================= */

  if (interactionSurface) {

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
      event => {

        if (
          state.aiming
        ) {

          moveAim(event);
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
  }


  /* =========================================================
     KEYBOARD
     ========================================================= */

  document.addEventListener(
    "keydown",
    event => {

      if (
        event.code === "Space"
      ) {

        event.preventDefault();

        shoot();
      }


      if (
        event.key === "ArrowLeft"
      ) {

        event.preventDefault();

        rotate(
          -CONFIG.aimStep *
          Math.PI /
          180
        );
      }


      if (
        event.key === "ArrowRight"
      ) {

        event.preventDefault();

        rotate(
          CONFIG.aimStep *
          Math.PI /
          180
        );
      }


      if (
        event.key.toLowerCase() === "r"
      ) {

        resetGame();
      }


      if (
        event.key.toLowerCase() === "l"
      ) {

        lock();
      }


      if (
        event.key.toLowerCase() === "p"
      ) {

        togglePause();
      }
    }
  );


  /* =========================================================
     FULLSCREEN CHANGE
     ========================================================= */

  document.addEventListener(
    "fullscreenchange",
    () => {

      if (fullscreenButton) {

        fullscreenButton.textContent =
          "⛶";
      }


      setTimeout(() => {

        render();

        aimLine();

      }, 100);
    }
  );


  /* =========================================================
     PUBLIC POOL API
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

    setPower: value =>
      power(
        clamp(
          +value,
          0,
          1
        )
      ),

    setMode: mode => {

      state.mode = mode;

      resetGame();
    },

    setGameType: type => {

      state.gameType = type;

      resetGame();
    },

    setAILevel: level => {

      state.aiLevel =
        +level;

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


  console.log(
    "🎱 RO'Lyfe Pool Engine V3.2 loaded — AI vs AI + 9-Ball rules stabilized."
  );

})();
