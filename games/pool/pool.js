/* =========================================================
   RO'LYFE GAMING™ — POOL ENGINE V3.4.2
   File: games/pool/pool.js

   V3.4.2 FOCUS
   ---------------------------------------------------------
   • Existing V3.4.1 physics/rules foundation preserved
   • Improved collision reliability / anti-tunneling
   • Pocket Assist
   • Bank shots remain visible
   • Touchscreen aiming fixed
   • RELEASE NEVER SHOOTS
   • SHOOT button is the firing action
   • Shared RO'Lyfe Audio Engine integration
   • AI vs AI continuous play
   • AI turn scheduler protection
   • AI levels choose different shot styles
   • Direct / bank / combination shot logic
   • 8-Ball group legality
   • 8-Ball early-8 loss
   • 9-Ball lowest-ball first contact
   • Illegal 9-ball respot
   • Legal 9-ball win
   • Break consumed once
   • Shot lockout while balls are moving
   • Pause / resume protection
   • Theme engine compatibility
   • Existing public API preserved
   ========================================================= */

(() => {
  "use strict";

  /* =========================================================
     CONFIGURATION
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
    pocketCaptureRadius: 31,

    aiDelay: 900,
    aiMinDelay: 650,
    aiMaxThinkTime: 1800,

    playerTime: 600,
    challengeTime: 120,

    aimStep: 2.5,
    aimLineLength: 240,

    maxVelocity: 38,

    /*
      More simulation steps reduce the chance of a fast
      cue ball traveling through another ball between frames.
    */
    physicsStepMs: 8,

    /*
      Pocket Assist makes the pocket capture forgiving without
      visually hiding balls that are still on the table.
    */
    pocketAssist: 1.12,

    /*
      Audio collision limiter.
    */
    collisionSoundGap: 55,
    railSoundGap: 70,
    pocketSoundGap: 90
  };


  /* =========================================================
     DOM HELPERS
     ========================================================= */

  const $ = (id, selector) => {
    return document.getElementById(id) ||
      (selector ? document.querySelector(selector) : null);
  };

  const app =
    $("poolApp", "#poolApp") ||
    document.body;

  const table =
    $("poolTable", ".pool-table");

  const surface =
    document.querySelector(".table-surface") ||
    table;

  const layer =
    $("ballLayer", ".ball-layer");

  const powerFill =
    $("powerFill", ".power-fill");

  const powerValue =
    $("powerValue", ".power-value");

  const messageEl =
    $("poolMessage", ".pool-message");

  const turnEl =
    $("turnValue", ".turn-value");

  const timerEl =
    $("poolTimer", ".pool-timer");

  const modeSelect =
    $("poolMode", "#modeSelect");

  const gameSelect =
    $("poolGame", "#gameType");

  const aiSelect =
    $("poolAILevel", "#aiLevel");

  const themeSelect =
    $("poolTheme", "#themeSelect");

  const shootButton =
    $("shootBtn", "[data-action='shoot']");

  const resetButton =
    $("resetPool", "#resetBtn");

  const newRackButton =
    $("newRackBtn", "#newRackBtn");

  const pauseButton =
    $("pauseBtn", "#pauseBtn");

  const rulesButton =
    $("rulesBtn", "#rulesBtn");

  const soundButton =
    $("soundBtn", "#soundBtn");

  const fullscreenButton =
    $("fullscreenBtn", "#fullscreenBtn");

  const leftButton =
    $("aimLeft", "[data-action='aim-left']");

  const rightButton =
    $("aimRight", "[data-action='aim-right']");

  const lockButton =
    $("lockAim", "#lockOnBtn") ||
    document.querySelector("[data-action='lock-on']");

  const powerDownButton =
    $("powerDown", "#powerDown");

  const powerUpButton =
    $("powerUp", "#powerUp");

  const rulesModal =
    $("rulesModal", "#rulesModal");

  const closeRulesButton =
    $("closeRulesBtn", "#closeRulesBtn");

  const gameOverModal =
    $("gameOverModal", "#gameOverModal");

  const finalScore =
    $("finalScore", "#finalScore");

  const playAgainButton =
    $("playAgainBtn", "#playAgainBtn");

  const challengePanel =
    $("challengePanel", "#challengePanel");

  const challengeScoreEl =
    $("challengeScore", "#challengeScore");

  const statGame =
    $("statGame", "#statGame");

  const statMode =
    $("statMode", "#statMode");

  const statAI =
    $("statAI", "#statAI");

  const shotCountEl =
    $("shotCount", "#shotCount");


  /* =========================================================
     AUDIO BRIDGE
     ========================================================= */

  function getAudio() {
    return window.ROLyfeAudio ||
      window.ROlyfeAudio ||
      null;
  }

  function audioPlay(name) {
    const audio = getAudio();

    if (!audio) {
      return false;
    }

    try {
      if (typeof audio.play === "function") {
        audio.play(name);
        return true;
      }
    } catch (error) {
      console.warn(
        "RO'Lyfe Pool Audio:",
        error
      );
    }

    return false;
  }

  function audioInit() {
    const audio = getAudio();

    if (!audio) {
      return;
    }

    try {
      if (typeof audio.init === "function") {
        audio.init();
      }
    } catch (error) {
      console.warn(
        "RO'Lyfe Pool Audio Init:",
        error
      );
    }
  }


  /* =========================================================
     STATE
     ========================================================= */

  const state = {

    gameType:
      gameSelect?.value ||
      "8ball",

    mode:
      modeSelect?.value ||
      "pvp",

    aiLevel:
      Number(aiSelect?.value || 1),

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

    powerDirection: 1,

    breakShot: true,

    breakConsumed: false,

    ballsPocketedThisTurn: [],

    foulThisTurn: false,

    firstBallHit: null,

    nineBallTargetAtShot: null,

    gameOver: false,

    challengeMode: false,

    challengeScore: 0,

    timerSeconds: CONFIG.playerTime,

    timerInterval: null,

    animationFrame: null,

    lastFrame: performance.now(),

    accumulator: 0,

    paused: false,

    aiThinking: false,

    aiTimer: null,

    aiToken: 0,

    lockOn: false,

    lockedTarget: null,

    shotCount: 0,

    initialized: false,

    lastCollisionSound: 0,

    lastRailSound: 0,

    lastPocketSound: 0,

    currentShotType: "DIRECT",

    currentShotTarget: null,

    currentShotPocket: null
  };


  /* =========================================================
     UTILITIES
     ========================================================= */

  const clamp = (value, min, max) =>
    Math.max(min, Math.min(max, value));

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

  const dot = (a, b) =>
    a.x * b.x + a.y * b.y;

  const nowMs = () =>
    performance.now();

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
    return tableSize().width /
      CONFIG.tableWidth;
  }

  function sy() {
    return tableSize().height /
      CONFIG.tableHeight;
  }

  function rx(x) {
    return x * sx();
  }

  function ry(y) {
    return y * sy();
  }

  function player() {
    return state.players[state.currentPlayer];
  }

  function isAIPlayer(index = state.currentPlayer) {
    return state.players[index]?.type === "ai";
  }


  /* =========================================================
     MESSAGE
     ========================================================= */

  function msg(text, type = "") {

    if (!messageEl) {
      return;
    }

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


  function nearestPocket(ball) {

    let best = null;
    let bestDistance = Infinity;

    for (const pocket of pockets()) {

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


  /* =========================================================
     BALL OBJECT
     ========================================================= */

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


  /* =========================================================
     PLAYERS
     ========================================================= */

  function aiName(level) {

    return {
      1: "RO'Lyfe AI — START-UP",
      2: "RO'Lyfe AI — INVESTOR",
      3: "RO'Lyfe AI — EMG",
      4: "RO'Lyfe AI — ACE",
      5: "RO'Lyfe AI — 7FIGURES"
    }[level] ||
      "RO'Lyfe AI";
  }


  function configurePlayers() {

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
          name: aiName(state.aiLevel),
          type: "ai",
          score: 0,
          group: null,
          fouls: 0
        }
      ];

    } else if (state.mode === "aivai") {

      state.players = [
        {
          name:
            `RO'Lyfe AI Alpha — ${aiName(state.aiLevel).split("—")[1]?.trim() || "AI"}`,
          type: "ai",
          score: 0,
          group: null,
          fouls: 0
        },

        {
          name:
            `RO'Lyfe AI Beta — ${aiName(Math.max(1, state.aiLevel - 1)).split("—")[1]?.trim() || "AI"}`,
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

    const cue =
      createBall(
        0,
        210,
        250
      );

    state.cueBall = cue;

    state.balls.push(cue);

    const spacing =
      CONFIG.ballRadius * 2.04;

    const rackX = 720;
    const rackY = 250;

    let number = 1;

    if (state.gameType === "9ball") {

      /*
        9-Ball diamond.

        1 = apex
        9 = center
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
        1,
        2,
        3,
        9,
        4,
        5,
        6,
        7,
        8
      ];

      for (let i = 0; i < positions.length; i++) {

        const [row, offset] =
          positions[i];

        const n =
          numbers[i];

        state.balls.push(
          createBall(
            n,
            rackX +
              row *
              spacing *
              0.866,

            rackY +
              offset *
              spacing
          )
        );
      }

      return;
    }


    /*
      8-Ball triangle.
    */

    const numbers = [
      1, 2, 3, 4, 5,
      6, 7, 8, 9, 10,
      11, 12, 13, 14, 15
    ];

    /*
      Put 8 in the center.
    */

    const triangle = [];

    let index = 0;

    for (let row = 0; row < 5; row++) {

      for (let col = 0; col <= row; col++) {

        triangle.push({
          row,
          col,
          number:
            numbers[index++]
        });
      }
    }

    const center =
      triangle.find(
        item =>
          item.row === 2 &&
          item.col === 1
      );

    if (center) {
      center.number = 8;
    }

    /*
      Avoid accidental duplicate 8.
    */

    let eightSeen = false;

    for (const item of triangle) {

      if (item.number === 8) {

        if (eightSeen) {

          const replacement =
            numbers.find(
              n =>
                n !== 8 &&
                !triangle.some(
                  t =>
                    t !== item &&
                    t.number === n
                )
            );

          item.number =
            replacement || 15;

        } else {

          eightSeen = true;
        }
      }
    }

    for (const item of triangle) {

      state.balls.push(
        createBall(
          item.number,

          rackX +
            item.row *
            spacing *
            0.866,

          rackY +
            (item.col -
              item.row / 2) *
            spacing
        )
      );
    }
  }


  /* =========================================================
     RENDERING
     ========================================================= */

  function createBallElement(ball) {

    const el =
      document.createElement("div");

    el.className = "ball";

    el.dataset.ball =
      String(ball.number);

    if (ball.number === 0) {

      el.classList.add(
        "white",
        "cue"
      );

    } else {

      el.classList.add(
        `ball-${ball.number}`
      );

      el.textContent =
        String(ball.number);

      el.dataset.group =
        ball.number <= 7
          ? "solid"
          : ball.number === 8
            ? "eight"
            : "stripe";
    }

    return el;
  }


  function render() {

    if (!layer) {
      return;
    }

    /*
      Rebuild the visual layer every frame.

      This intentionally prevents stale/ghost balls after
      banks, breaks and pocket events.
    */

    layer.innerHTML = "";

    for (const ball of state.balls) {

      if (ball.pocketed) {
        continue;
      }

      const el =
        createBallElement(ball);

      el.style.display = "flex";

      el.style.left =
        `${rx(ball.x)}px`;

      el.style.top =
        `${ry(ball.y)}px`;

      el.style.transform =
        "translate(-50%, -50%)";

      layer.appendChild(el);

      ball.element = el;
    }

    renderAimLine();
  }


  /* =========================================================
     POWER
     ========================================================= */

  function setPower(value) {

    state.power =
      clamp(
        Number(value) || 0,
        0,
        1
      );

    if (powerFill) {

      powerFill.style.width =
        `${state.power * 100}%`;
    }

    const percent =
      `${Math.round(
        state.power * 100
      )}%`;

    document
      .querySelectorAll(".power-value")
      .forEach(el => {
        el.textContent = percent;
      });

    if (powerValue) {
      powerValue.textContent =
        percent;
    }
  }


  function increasePower() {
    if (
      state.shooting ||
      state.aiThinking ||
      state.gameOver
    ) {
      return;
    }

    setPower(
      state.power + 0.05
    );

    audioPlay("click");
  }


  function decreasePower() {
    if (
      state.shooting ||
      state.aiThinking ||
      state.gameOver
    ) {
      return;
    }

    setPower(
      state.power - 0.05
    );

    audioPlay("click");
  }


  /* =========================================================
     TIMER
     ========================================================= */

  function updateTimer() {

    if (!timerEl) {
      return;
    }

    const seconds =
      Math.max(
        0,
        Math.floor(
          state.timerSeconds
        )
      );

    timerEl.textContent =
      `${String(
        Math.floor(seconds / 60)
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


  function startTimer() {

    stopTimer();

    state.timerInterval =
      setInterval(() => {

        if (
          state.gameOver ||
          state.paused ||
          state.shooting ||
          state.aiThinking
        ) {
          return;
        }

        state.timerSeconds--;

        if (
          state.timerSeconds <= 0
        ) {

          state.timerSeconds = 0;

          updateTimer();

          msg(
            `${player().name} ran out of time.`,
            "warning"
          );

          audioPlay("foul");

          switchPlayer();

        } else {

          updateTimer();

          if (
            state.timerSeconds <= 10
          ) {
            audioPlay("countdown");
          }
        }

      }, 1000);
  }


  /* =========================================================
     UI
     ========================================================= */

  function updateUI() {

    const current =
      player();

    if (turnEl && current) {

      turnEl.textContent =
        `${current.name} — YOUR TURN`;
    }

    document
      .querySelectorAll(".player-card")
      .forEach((el, index) => {

        el.classList.toggle(
          "active",
          index ===
          state.currentPlayer
        );
      });

    document
      .querySelectorAll(".player-name")
      .forEach((el, index) => {

        if (state.players[index]) {

          el.textContent =
            state.players[index].name;
        }
      });

    document
      .querySelectorAll(".player-score")
      .forEach((el, index) => {

        if (state.players[index]) {

          el.textContent =
            state.players[index].score;
        }
      });

    updateTimer();

    if (statGame) {
      statGame.textContent =
        state.gameType.toUpperCase();
    }

    if (statMode) {
      statMode.textContent =
        state.mode.toUpperCase();
    }

    if (statAI) {
      statAI.textContent =
        state.aiLevel;
    }

    if (shotCountEl) {
      shotCountEl.textContent =
        state.shotCount;
    }

    if (
      challengeScoreEl &&
      state.challengeMode
    ) {

      challengeScoreEl.textContent =
        state.challengeScore;
    }

    if (challengePanel) {

      challengePanel.style.display =
        state.challengeMode
          ? ""
          : "none";
    }
  }


  /* =========================================================
     AIMING
     ========================================================= */

  function setAim(angle) {

    state.aimAngle =
      angle;

    const cue =
      state.cueBall;

    if (!cue) {
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

    renderAimLine();
  }


  function rotateAim(degrees) {

    if (
      state.gameOver ||
      state.shooting ||
      state.aiThinking ||
      player()?.type !== "human"
    ) {
      return;
    }

    setAim(
      state.aimAngle +
      degrees *
      Math.PI /
      180
    );

    audioPlay("click");
  }


  function renderAimLine() {

    if (!layer || !state.cueBall) {
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
      display:${state.gameOver || state.shooting ? "none" : "block"};
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
     LOCK-ON
     ========================================================= */

  function lockAim() {

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

      msg("LOCK-ON OFF");

      renderAimLine();

      audioPlay("click");

      return;
    }

    const target =
      chooseHumanTarget();

    if (!target) {

      msg(
        "No available target.",
        "warning"
      );

      return;
    }

    state.lockedTarget =
      target;

    state.lockOn = true;

    setAim(
      Math.atan2(
        target.y -
          state.cueBall.y,

        target.x -
          state.cueBall.x
      )
    );

    msg(
      `LOCKED ON — Ball ${target.number}`
    );

    audioPlay("select");
  }


  /* =========================================================
     TARGETING — 8 BALL
     ========================================================= */

  function remainingGroup(group) {

    return state.balls.filter(
      ball =>
        !ball.pocketed &&
        ball.number >= 1 &&
        ball.number <= 15 &&
        (
          group === "solid"
            ? ball.number >= 1 &&
              ball.number <= 7
            : ball.number >= 9 &&
              ball.number <= 15
        )
    );
  }


  function assignGroupIfNeeded() {

    if (
      state.gameType !== "8ball"
    ) {
      return;
    }

    if (
      player().group
    ) {
      return;
    }

    const objects =
      state.ballsPocketedThisTurn
        .filter(n => n >= 1 && n <= 15);

    if (!objects.length) {
      return;
    }

    const first =
      objects[0];

    if (first === 8) {
      return;
    }

    const group =
      first <= 7
        ? "solid"
        : "stripe";

    const opponentIndex =
      state.currentPlayer
        ? 0
        : 1;

    const opponent =
      state.players[
        opponentIndex
      ];

    player().group =
      group;

    if (opponent) {

      opponent.group =
        group === "solid"
          ? "stripe"
          : "solid";
    }

    msg(
      `${player().name}: ${group.toUpperCase()}S`,
      "success"
    );
  }


  function groupCleared(group) {

    if (!group) {
      return false;
    }

    return remainingGroup(
      group
    ).length === 0;
  }


  /* =========================================================
     9 BALL TARGET
     ========================================================= */

  function lowestNineBall() {

    return state.balls
      .filter(
        ball =>
          !ball.pocketed &&
          ball.number >= 1 &&
          ball.number <= 9
      )
      .sort(
        (a, b) =>
          a.number -
          b.number
      )[0] || null;
  }


  /* =========================================================
     LEGAL TARGETS
     ========================================================= */

  function legalTargets() {

    const objects =
      state.balls.filter(
        ball =>
          !ball.pocketed &&
          ball.number !== 0
      );

    if (
      state.gameType === "9ball"
    ) {

      const lowest =
        lowestNineBall();

      return lowest
        ? [lowest]
        : [];
    }


    const current =
      player();

    if (
      current?.group
    ) {

      const own =
        remainingGroup(
          current.group
        );

      if (own.length) {
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


    return objects.filter(
      ball =>
        ball.number !== 8
    );
  }


  function chooseHumanTarget() {

    const targets =
      legalTargets();

    if (!targets.length) {
      return null;
    }

    return targets
      .slice()
      .sort(
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


  /* =========================================================
     POCKET ASSIST
     ========================================================= */

  function isNearPocket(ball) {

    if (ball.pocketed) {
      return false;
    }

    for (const pocket of pockets()) {

      const d =
        Math.hypot(
          ball.x - pocket.x,
          ball.y - pocket.y
        );

      if (
        d <=
        CONFIG.pocketCaptureRadius *
        CONFIG.pocketAssist
      ) {
        return true;
      }
    }

    return false;
  }


  function detectPocket(ball) {

    if (
      ball.pocketed
    ) {
      return false;
    }

    for (const pocket of pockets()) {

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

      /*
        Pocket Assist.

        Only activates when the ball is already moving toward
        the pocket and is close to the mouth.
      */

      if (
        d <=
        CONFIG.pocketCaptureRadius *
        CONFIG.pocketAssist
      ) {

        const toward =
          norm(
            pocket.x - ball.x,
            pocket.y - ball.y
          );

        const velocity =
          norm(
            ball.vx,
            ball.vy
          );

        const alignment =
          dot(
            toward,
            velocity
          );

        if (
          alignment > 0.62 &&
          Math.hypot(
            ball.vx,
            ball.vy
          ) > 0.12
        ) {
          return true;
        }
      }
    }

    return false;
  }


  /* =========================================================
     POCKET EVENT
     ========================================================= */

  function pocketBall(ball) {

    if (
      ball.pocketed
    ) {
      return;
    }

    ball.pocketed = true;

    ball.vx = 0;
    ball.vy = 0;

    state.ballsPocketedThisTurn
      .push(ball.number);

    audioPlay("pocket");

    if (
      ball.number === 0
    ) {

      state.foulThisTurn = true;

      msg(
        "SCRATCH! Cue ball pocketed.",
        "warning"
      );

      audioPlay("foul");

      return;
    }

    player().score++;

    if (
      state.challengeMode
    ) {
      state.challengeScore++;
    }

    if (
      ball.number === 8
    ) {

      msg(
        "8-BALL POCKETED!",
        "success"
      );

    } else if (
      ball.number === 9
    ) {

      msg(
        "9-BALL POCKETED!",
        "success"
      );

    } else {

      msg(
        `Ball ${ball.number} pocketed!`,
        "success"
      );
    }

    updateUI();
  }


  /* =========================================================
     RAILS
     ========================================================= */

  function rails(ball) {

    const r =
      ball.radius;

    let hitRail = false;

    if (
      ball.x - r < 0
    ) {

      ball.x = r;

      ball.vx =
        Math.abs(ball.vx) *
        CONFIG.railRestitution;

      hitRail = true;
    }

    if (
      ball.x + r >
      CONFIG.tableWidth
    ) {

      ball.x =
        CONFIG.tableWidth - r;

      ball.vx =
        -Math.abs(ball.vx) *
        CONFIG.railRestitution;

      hitRail = true;
    }

    if (
      ball.y - r < 0
    ) {

      ball.y = r;

      ball.vy =
        Math.abs(ball.vy) *
        CONFIG.railRestitution;

      hitRail = true;
    }

    if (
      ball.y + r >
      CONFIG.tableHeight
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
      nowMs() -
      state.lastRailSound >
      CONFIG.railSoundGap
    ) {

      state.lastRailSound =
        nowMs();

      audioPlay("rail");
    }
  }


  /* =========================================================
     COLLISION
     ========================================================= */

  function collidePair(A, B) {

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
      return false;
    }

    if (
      distance < 0.0001
    ) {
      distance = 0.0001;
    }

    const nx =
      dx / distance;

    const ny =
      dy / distance;

    const overlap =
      minimum -
      distance;

    /*
      Positional correction.
    */

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

    /*
      Relative velocity along collision normal.
    */

    const relativeVelocity =
      (B.vx - A.vx) * nx +
      (B.vy - A.vy) * ny;

    /*
      Already separating.
    */

    if (
      relativeVelocity > 0
    ) {
      return false;
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
      First contact detection.

      Cue ball = 0.
    */

    if (
      state.firstBallHit === null
    ) {

      if (
        A.number === 0 &&
        B.number !== 0
      ) {

        state.firstBallHit =
          B.number;

      } else if (
        B.number === 0 &&
        A.number !== 0
      ) {

        state.firstBallHit =
          A.number;
      }
    }

    if (
      nowMs() -
      state.lastCollisionSound >
      CONFIG.collisionSoundGap
    ) {

      state.lastCollisionSound =
        nowMs();

      audioPlay("collision");
    }

    return true;
  }


  function collisions() {

    const active =
      state.balls.filter(
        ball =>
          !ball.pocketed
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

        collidePair(
          active[i],
          active[j]
        );
      }
    }
  }


  /* =========================================================
     MOVEMENT
     ========================================================= */

  function moving() {

    return state.balls.some(
      ball =>
        !ball.pocketed &&
        (
          Math.abs(ball.vx) >
            CONFIG.stopVelocity ||
          Math.abs(ball.vy) >
            CONFIG.stopVelocity
        )
    );
  }


  function integrateBall(
    ball,
    frameUnits
  ) {

    if (
      ball.pocketed
    ) {
      return;
    }

    ball.x +=
      ball.vx *
      frameUnits;

    ball.y +=
      ball.vy *
      frameUnits;

    const friction =
      Math.pow(
        CONFIG.friction,
        frameUnits
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

    if (speed > 0) {

      const resistance =
        CONFIG.rollingResistance *
        frameUnits;

      ball.vx -=
        (ball.vx / speed) *
        resistance;

      ball.vy -=
        (ball.vy / speed) *
        resistance;
    }

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

    rails(ball);

    if (
      detectPocket(ball)
    ) {
      pocketBall(ball);
    }
  }


  /* =========================================================
     PHYSICS STEP
     ========================================================= */

  function physicsStep() {

    if (
      !state.shooting ||
      state.paused
    ) {
      return;
    }

    /*
      Move first.
    */

    for (
      const ball of state.balls
    ) {

      integrateBall(
        ball,
        8 / 16.6667
      );
    }

    /*
      Collision resolution.
    */

    collisions();

    /*
      Check pockets again after collision.
      This is important for combination shots.
    */

    for (
      const ball of state.balls
    ) {

      if (
        !ball.pocketed &&
        detectPocket(ball)
      ) {

        pocketBall(ball);
      }
    }
  }


  /* =========================================================
     ANIMATION PHYSICS
     ========================================================= */

  function physics(deltaMs) {

    state.accumulator +=
      clamp(
        deltaMs,
        0,
        50
      );

    const step =
      CONFIG.physicsStepMs;

    let iterations = 0;

    while (
      state.accumulator >= step &&
      iterations < 8
    ) {

      physicsStep();

      state.accumulator -=
        step;

      iterations++;
    }

    if (
      state.shooting &&
      !moving()
    ) {

      finishShot();
    }
  }


  /* =========================================================
     CUE STICK / SHOOT
     ========================================================= */

  function fire(
    angle,
    power
  ) {

    const cue =
      state.cueBall;

    if (
      !cue ||
      cue.pocketed
    ) {
      return false;
    }

    let speedPower =
      clamp(
        power,
        0,
        1
      );

    if (
      state.breakShot
    ) {

      speedPower =
        Math.max(
          speedPower,
          0.78
        ) *
        CONFIG.breakPowerMultiplier;
    }

    const velocity =
      clamp(
        CONFIG.maxPower *
        speedPower,
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

    setPower(0);

    hideAim();

    state.shooting = true;

    state.shotCount++;

    state.ballsPocketedThisTurn = [];

    state.foulThisTurn = false;

    state.firstBallHit = null;

    audioPlay("strike");

    msg(
      `${player().name} is shooting...`
    );

    updateUI();

    return true;
  }


  function shoot() {

    /*
      HARD LOCKOUT.

      Nothing may fire while:
      • game over
      • paused
      • another shot is moving
      • AI is thinking
      • current player is not human
    */

    if (
      state.gameOver ||
      state.paused ||
      state.shooting ||
      state.aiThinking ||
      player()?.type !== "human"
    ) {
      return false;
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

    return fire(
      state.aimAngle,
      state.power
    );
  }


  /* =========================================================
     TOUCH / MOUSE / POINTER AIMING
     ========================================================= */

  function eventPoint(event) {

    const target =
      surface ||
      table;

    if (!target) {
      return null;
    }

    const rect =
      target.getBoundingClientRect();

    let clientX;
    let clientY;

    /*
      Touch.
    */

    if (
      event.touches &&
      event.touches.length
    ) {

      clientX =
        event.touches[0].clientX;

      clientY =
        event.touches[0].clientY;

    } else if (
      event.changedTouches &&
      event.changedTouches.length
    ) {

      clientX =
        event.changedTouches[0].clientX;

      clientY =
        event.changedTouches[0].clientY;

    } else {

      clientX =
        event.clientX;

      clientY =
        event.clientY;
    }

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
      state.paused ||
      state.shooting ||
      state.aiThinking ||
      player()?.type !== "human" ||
      !state.cueBall ||
      state.cueBall.pocketed
    ) {
      return;
    }

    /*
      IMPORTANT:
      Touch/mouse aiming does NOT require touching the cue ball.
      Anywhere on the table can be used to aim.
    */

    const point =
      eventPoint(event);

    if (!point) {
      return;
    }

    state.aiming = true;

    updateAimFromPoint(
      point
    );

    if (
      event.cancelable
    ) {
      event.preventDefault();
    }
  }


  function moveAim(event) {

    if (
      !state.aiming
    ) {
      return;
    }

    const point =
      eventPoint(event);

    if (!point) {
      return;
    }

    updateAimFromPoint(
      point
    );

    if (
      event.cancelable
    ) {
      event.preventDefault();
    }
  }


  function updateAimFromPoint(point) {

    if (
      !state.cueBall
    ) {
      return;
    }

    setAim(
      Math.atan2(
        point.y -
          state.cueBall.y,

        point.x -
          state.cueBall.x
      )
    );
  }


  function endAim(event) {

    if (
      !state.aiming
    ) {
      return;
    }

    /*
      CRITICAL V3.4.2 BEHAVIOR:

      RELEASE DOES NOT SHOOT.

      The old engine fired from pointer/touch release.
      That is removed.

      The player must press SHOOT.
    */

    state.aiming = false;

    if (
      event?.cancelable
    ) {
      event.preventDefault();
    }

    renderAimLine();
  }


  /*
    Defensive mobile browser behavior.
  */

  if (surface) {

    surface.style.touchAction =
      "none";

    surface.style.userSelect =
      "none";

    surface.style.webkitUserSelect =
      "none";

    /*
      Pointer events.
    */

    surface.addEventListener(
      "pointerdown",
      startAim,
      {
        passive: false
      }
    );

    surface.addEventListener(
      "pointermove",
      moveAim,
      {
        passive: false
      }
    );

    surface.addEventListener(
      "pointerup",
      endAim,
      {
        passive: false
      }
    );

    surface.addEventListener(
      "pointercancel",
      endAim,
      {
        passive: false
      }
    );

    /*
      Touch fallback.

      Prevents mobile browsers from interpreting the
      table gesture as page scrolling.
    */

    surface.addEventListener(
      "touchstart",
      startAim,
      {
        passive: false
      }
    );

    surface.addEventListener(
      "touchmove",
      moveAim,
      {
        passive: false
      }
    );

    surface.addEventListener(
      "touchend",
      endAim,
      {
        passive: false
      }
    );

    surface.addEventListener(
      "touchcancel",
      endAim,
      {
        passive: false
      }
    );

    /*
      Mouse fallback.
    */

    surface.addEventListener(
      "mousedown",
      startAim
    );

    surface.addEventListener(
      "mousemove",
      moveAim
    );

    surface.addEventListener(
      "mouseup",
      endAim
    );

    surface.addEventListener(
      "mouseleave",
      endAim
    );
  }


  /* =========================================================
     8-BALL RULE CHECK
     ========================================================= */

  function validateEightBallShot() {

    if (
      state.gameType !== "8ball"
    ) {
      return {
        legal: true
      };
    }

    /*
      Break has its own rules.
    */

    if (
      state.breakShot
    ) {
      return {
        legal: true
      };
    }

    const current =
      player();

    if (
      state.firstBallHit === null
    ) {

      return {
        legal: false,
        reason:
          "FOUL — No object ball hit."
      };
    }

    /*
      If groups have not been assigned,
      any numbered object ball except 8 is legal.
    */

    if (
      !current.group
    ) {

      if (
        state.firstBallHit === 8
      ) {

        return {
          legal: false,
          reason:
            "FOUL — 8-ball contacted before groups were established."
        };
      }

      return {
        legal: true
      };
    }

    /*
      Player has a group.
    */

    if (
      groupCleared(
        current.group
      )
    ) {

      /*
        Once own group is cleared,
        the 8 is the legal target.
      */

      return {
        legal:
          state.firstBallHit === 8,

        reason:
          state.firstBallHit === 8
            ? ""
            : "FOUL — You must contact the 8-ball."
      };
    }

    const ownGroup =
      current.group === "solid"
        ? state.firstBallHit >= 1 &&
          state.firstBallHit <= 7
        : state.firstBallHit >= 9 &&
          state.firstBallHit <= 15;

    if (!ownGroup) {

      return {
        legal: false,
        reason:
          "FOUL — First contact was not your group."
      };
    }

    return {
      legal: true
    };
  }


  /* =========================================================
     9-BALL RULE CHECK
     ========================================================= */

  function validateNineBallShot() {

    if (
      state.gameType !== "9ball"
    ) {
      return {
        legal: true
      };
    }

    const target =
      state.nineBallTargetAtShot;

    if (
      target === null
    ) {
      return {
        legal: true
      };
    }

    if (
      state.firstBallHit === null
    ) {

      return {
        legal: false,
        reason:
          "FOUL — No ball contacted."
      };
    }

    if (
      state.firstBallHit !== target
    ) {

      return {
        legal: false,
        reason:
          `FOUL — Ball ${target} was the required first contact.`
      };
    }

    return {
      legal: true
    };
  }


  /* =========================================================
     RESPOT
     ========================================================= */

  function respotCueBall() {

    const cue =
      state.cueBall;

    if (!cue) {
      return;
    }

    cue.pocketed = false;

    cue.vx = 0;
    cue.vy = 0;

    let x = 210;
    let y = 250;

    let attempts = 0;

    while (
      attempts < 100
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
        break;
      }

      x =
        120 +
        Math.random() *
        180;

      y =
        60 +
        Math.random() *
        380;

      attempts++;
    }

    cue.x = x;
    cue.y = y;

    setAim(
      state.aimAngle
    );

    render();
  }


  function respotNineBall() {

    const nine =
      state.balls.find(
        ball =>
          ball.number === 9
      );

    if (!nine) {
      return;
    }

    nine.pocketed = false;

    nine.vx = 0;
    nine.vy = 0;

    /*
      Spot near the original rack area,
      avoiding occupied balls.
    */

    let x =
      720 +
      CONFIG.ballRadius *
      2.04 *
      4 *
      0.866;

    let y = 250;

    let attempts = 0;

    while (
      attempts < 100
    ) {

      const occupied =
        state.balls.some(
          ball =>
            ball !== nine &&
            !ball.pocketed &&
            Math.hypot(
              ball.x - x,
              ball.y - y
            ) <
            CONFIG.ballRadius *
            2.1
        );

      if (!occupied) {
        break;
      }

      x =
        600 +
        Math.random() *
        180;

      y =
        100 +
        Math.random() *
        300;

      attempts++;
    }

    nine.x = x;
    nine.y = y;

    render();
  }


  /* =========================================================
     END GAME
     ========================================================= */

  function endGame(winner) {

    if (
      state.gameOver
    ) {
      return;
    }

    state.gameOver = true;

    state.shooting = false;

    state.aiming = false;

    state.aiThinking = false;

    cancelAITurn();

    stopTimer();

    hideAim();

    msg(
      `🏆 ${winner?.name || "Winner"} WINS!`,
      "success"
    );

    audioPlay("win");

    if (
      finalScore
    ) {

      finalScore.textContent =
        state.players
          .map(
            p =>
              `${p.name}: ${p.score}`
          )
          .join(" • ");
    }

    if (
      gameOverModal
    ) {

      gameOverModal.classList.add(
        "show"
      );

      gameOverModal.style.display =
        "";
    }

    updateUI();
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

    /*
      Cancel only the old player's pending AI action.
    */

    cancelAITurn();

    state.currentPlayer =
      state.currentPlayer
        ? 0
        : 1;

    state.ballsPocketedThisTurn = [];

    state.foulThisTurn = false;

    state.firstBallHit = null;

    state.lockOn = false;

    state.lockedTarget = null;

    state.currentShotTarget =
      null;

    state.currentShotPocket =
      null;

    state.currentShotType =
      "DIRECT";

    resetTimer();

    updateUI();

    audioPlay("turn");

    if (
      player()?.type === "ai"
    ) {

      msg(
        `${player().name} is thinking...`
      );

      scheduleAI();

    } else {

      msg(
        `${player().name} — YOUR TURN`,
        "success"
      );
    }
  }


  /* =========================================================
     SHOT FINISH
     ========================================================= */

  function finishShot() {

    if (
      !state.shooting
    ) {
      return;
    }

    /*
      Stop movement state FIRST.
    */

    state.shooting = false;

    /*
      Break is consumed after the first completed shot.
      It can never become another break later.
    */

    const wasBreak =
      state.breakShot;

    if (
      wasBreak
    ) {

      state.breakShot = false;

      state.breakConsumed = true;
    }


    /*
      Scratch.
    */

    if (
      state.foulThisTurn
    ) {

      player().fouls++;

      audioPlay("foul");

      respotCueBall();

      state.ballsPocketedThisTurn =
        state.ballsPocketedThisTurn
          .filter(
            n => n !== 0
          );

      switchPlayer();

      return;
    }


    /*
      8-Ball legality.
    */

    if (
      state.gameType === "8ball"
    ) {

      const eightPocketed =
        state.balls.some(
          ball =>
            ball.number === 8 &&
            ball.pocketed
        );

      const rule =
        validateEightBallShot();

      if (
        eightPocketed
      ) {

        /*
          Early / illegal 8 = loss.
        */

        if (
          !rule.legal ||
          !player().group ||
          !groupCleared(
            player().group
          )
        ) {

          const opponentIndex =
            state.currentPlayer
              ? 0
              : 1;

          endGame(
            state.players[
              opponentIndex
            ]
          );

          return;
        }

        /*
          Legal 8 = win.
        */

        endGame(
          player()
        );

        return;
      }

      /*
        Other 8-ball foul.
      */

      if (
        !rule.legal
      ) {

        player().fouls++;

        msg(
          rule.reason,
          "warning"
        );

        audioPlay("foul");

        switchPlayer();

        return;
      }

      assignGroupIfNeeded();
    }


    /* =======================================================
       9-BALL
       ======================================================= */

    if (
      state.gameType === "9ball"
    ) {

      const ninePocketed =
        state.balls.some(
          ball =>
            ball.number === 9 &&
            ball.pocketed
        );

      const rule =
        validateNineBallShot();

      if (
        ninePocketed
      ) {

        if (
          rule.legal
        ) {

          endGame(
            player()
          );

          return;

        } else {

          /*
            Illegal 9 is respotted.
          */

          respotNineBall();

          player().fouls++;

          msg(
            "ILLEGAL 9-BALL — 9 RES POTTED.",
            "warning"
          );

          audioPlay("foul");

          switchPlayer();

          return;
        }
      }

      if (
        !rule.legal
      ) {

        player().fouls++;

        msg(
          rule.reason,
          "warning"
        );

        audioPlay("foul");

        switchPlayer();

        return;
      }
    }


    /* =======================================================
       BREAK
       ======================================================= */

    if (
      wasBreak
    ) {

      const objectsPocketed =
        state.ballsPocketedThisTurn
          .some(
            n => n !== 0
          );

      if (
        objectsPocketed
      ) {

        resetTimer();

        msg(
          `${player().name} made the break — continue!`,
          "success"
        );

        /*
          AI gets another shot automatically.
        */

        scheduleAI();

        return;

      } else {

        switchPlayer();

        return;
      }
    }


    /* =======================================================
       NORMAL TURN
       ======================================================= */

    const objectsPocketed =
      state.ballsPocketedThisTurn
        .some(
          n => n !== 0
        );

    if (
      objectsPocketed
    ) {

      resetTimer();

      msg(
        `${player().name} continues — nice shot!`,
        "success"
      );

      /*
        IMPORTANT:
        AI remains in the turn if it legally pocketed.
      */

      if (
        player()?.type === "ai"
      ) {

        scheduleAI();
      }

      return;
    }

    /*
      No object pocketed.
      Turn changes.
    */

    switchPlayer();
  }


  /* =========================================================
     AI SHOT SYSTEM
     ========================================================= */

  function aiProfile(level) {

    const profiles = {

      1: {
        name: "START-UP",
        accuracy: 0.18,
        styles: ["DIRECT"],
        powerMin: 0.38,
        powerMax: 0.62
      },

      2: {
        name: "INVESTOR",
        accuracy: 0.11,
        styles: ["DIRECT", "DIRECT"],
        powerMin: 0.34,
        powerMax: 0.68
      },

      3: {
        name: "EMG",
        accuracy: 0.075,
        styles: [
          "DIRECT",
          "DIRECT",
          "COMBO"
        ],
        powerMin: 0.38,
        powerMax: 0.74
      },

      4: {
        name: "ACE",
        accuracy: 0.045,
        styles: [
          "DIRECT",
          "BANK",
          "COMBO"
        ],
        powerMin: 0.42,
        powerMax: 0.82
      },

      5: {
        name: "7FIGURES",
        accuracy: 0.025,
        styles: [
          "DIRECT",
          "BANK",
          "COMBO",
          "DIRECT"
        ],
        powerMin: 0.44,
        powerMax: 0.88
      }
    };

    return profiles[
      clamp(
        Number(level) || 1,
        1,
        5
      )
    ];
  }


  /* =========================================================
     SHOT GEOMETRY
     ========================================================= */

  function pointBehindTarget(
    target,
    pocket
  ) {

    const direction =
      norm(
        pocket.x - target.x,
        pocket.y - target.y
      );

    return {
      x:
        target.x -
        direction.x *
        CONFIG.ballRadius *
        2.05,

      y:
        target.y -
        direction.y *
        CONFIG.ballRadius *
        2.05
    };
  }


  function directShot(
    cue,
    target,
    pocket
  ) {

    const ghost =
      pointBehindTarget(
        target,
        pocket
      );

    const dx =
      ghost.x -
      cue.x;

    const dy =
      ghost.y -
      cue.y;

    const angle =
      Math.atan2(
        dy,
        dx
      );

    const distance =
      Math.hypot(
        dx,
        dy
      );

    return {
      type: "DIRECT",
      target,
      pocket,
      angle,
      distance,
      score:
        distance +
        dist(
          target,
          pocket
        ) *
        0.65
    };
  }


  function bankShot(
    cue,
    target,
    pocket
  ) {

    /*
      Simple rail reflection.

      Pick the closest rail to the pocket and mirror the
      pocket across it. This gives the AI a real bank-shot
      direction instead of merely randomizing aim.
    */

    let reflected = {
      x: pocket.x,
      y: pocket.y
    };

    const distances = [
      {
        side: "top",
        distance: pocket.y
      },
      {
        side: "bottom",
        distance:
          CONFIG.tableHeight -
          pocket.y
      },
      {
        side: "left",
        distance: pocket.x
      },
      {
        side: "right",
        distance:
          CONFIG.tableWidth -
          pocket.x
      }
    ];

    distances.sort(
      (a, b) =>
        a.distance -
        b.distance
    );

    const rail =
      distances[0].side;

    if (rail === "top") {

      reflected.y =
        -pocket.y;

    } else if (
      rail === "bottom"
    ) {

      reflected.y =
        CONFIG.tableHeight * 2 -
        pocket.y;

    } else if (
      rail === "left"
    ) {

      reflected.x =
        -pocket.x;

    } else {

      reflected.x =
        CONFIG.tableWidth * 2 -
        pocket.x;
    }

    const ghost =
      pointBehindTarget(
        target,
        reflected
      );

    const dx =
      ghost.x -
      cue.x;

    const dy =
      ghost.y -
      cue.y;

    const angle =
      Math.atan2(
        dy,
        dx
      );

    return {
      type: "BANK",
      target,
      pocket,
      angle,
      distance:
        Math.hypot(
          dx,
          dy
        ),
      rail,
      score:
        Math.hypot(
          dx,
          dy
        ) +
        dist(
          target,
          pocket
        ) *
        0.85
    };
  }


  function comboShot(
    cue,
    firstBall,
    target,
    pocket
  ) {

    /*
      Combination concept:

      cue → first ball → target → pocket

      We aim at a point behind the first ball using the
      direction from firstBall toward target.
    */

    const direction =
      norm(
        target.x -
          firstBall.x,

        target.y -
          firstBall.y
      );

    const contact =
      {
        x:
          firstBall.x -
          direction.x *
          CONFIG.ballRadius *
          2.0,

        y:
          firstBall.y -
          direction.y *
          CONFIG.ballRadius *
          2.0
      };

    const angle =
      Math.atan2(
        contact.y -
          cue.y,

        contact.x -
          cue.x
      );

    const distance =
      Math.hypot(
        contact.x -
          cue.x,

        contact.y -
          cue.y
      );

    return {
      type: "COMBO",
      target,
      firstBall,
      pocket,
      angle,
      distance,
      score:
        distance +
        dist(
          firstBall,
          target
        ) *
        0.8 +
        dist(
          target,
          pocket
        ) *
        0.7
    };
  }


  /* =========================================================
     AI TARGET SELECTION
     ========================================================= */

  function aiCandidates() {

    const targets =
      legalTargets();

    if (!targets.length) {
      return [];
    }

    const candidates = [];

    for (
      const target of targets
    ) {

      const possiblePockets =
        pockets();

      for (
        const pocket of possiblePockets
      ) {

        const direct =
          directShot(
            state.cueBall,
            target,
            pocket
          );

        candidates.push(
          direct
        );

        if (
          state.aiLevel >= 4
        ) {

          candidates.push(
            bankShot(
              state.cueBall,
              target,
              pocket
            )
          );
        }
      }
    }


    /*
      Combination candidates.

      Only consider a few useful balls to prevent the AI
      from wasting its entire think cycle.
    */

    if (
      state.aiLevel >= 3
    ) {

      const allObjects =
        state.balls.filter(
          ball =>
            !ball.pocketed &&
            ball.number !== 0 &&
            ball.number !== 8
        );

      const firstBalls =
        allObjects
          .slice()
          .sort(
            (a, b) =>
              dist(
                state.cueBall,
                a
              ) -
              dist(
                state.cueBall,
                b
              )
          )
          .slice(0, 4);

      for (
        const first of firstBalls
      ) {

        for (
          const target of targets
        ) {

          if (
            first === target
          ) {
            continue;
          }

          for (
            const pocket of pockets()
          ) {

            candidates.push(
              comboShot(
                state.cueBall,
                first,
                target,
                pocket
              )
            );
          }
        }
      }
    }

    return candidates;
  }


  function chooseAIShot() {

    const profile =
      aiProfile(
        state.aiLevel
      );

    const candidates =
      aiCandidates();

    if (!candidates.length) {
      return null;
    }


    /*
      Filter by level-specific shot style.
    */

    let allowed =
      candidates.filter(
        shot =>
          profile.styles.includes(
            shot.type
          )
      );

    if (!allowed.length) {
      allowed =
        candidates.filter(
          shot =>
            shot.type === "DIRECT"
        );
    }

    /*
      9-ball strongly prefers the required target.
    */

    if (
      state.gameType === "9ball"
    ) {

      const lowest =
        state.nineBallTargetAtShot;

      allowed =
        allowed.filter(
          shot =>
            shot.target?.number ===
            lowest
        );

      if (!allowed.length) {
        allowed =
          candidates.filter(
            shot =>
              shot.target?.number ===
              lowest
          );
      }
    }


    /*
      Sort easiest to hardest.

      Shorter paths and simpler shot types are preferred.
    */

    allowed.sort(
      (a, b) => {

        const styleWeight =
          shot =>
            shot.type === "DIRECT"
              ? 0
              : shot.type === "BANK"
                ? 80
                : 110;

        return (
          a.score +
          styleWeight(a) -
          (
            b.score +
            styleWeight(b)
          )
        );
      }
    );


    /*
      Higher levels have permission to choose a more
      sophisticated shot when it is reasonably close
      in difficulty.
    */

    const best =
      allowed[0];

    const advanced =
      allowed
        .slice(
          0,
          Math.min(
            8,
            allowed.length
          )
        )
        .filter(
          shot =>
            shot.type !==
              "DIRECT" &&
            shot.score <=
              best.score * 1.45
        );

    if (
      advanced.length &&
      state.aiLevel >= 4
    ) {

      return advanced[
        Math.floor(
          Math.random() *
          advanced.length
        )
      ];
    }

    return best;
  }


  /* =========================================================
     AI POWER
     ========================================================= */

  function chooseAIPower(
    shot
  ) {

    const profile =
      aiProfile(
        state.aiLevel
      );

    const distance =
      shot?.distance ||
      500;

    let power =
      profile.powerMin +
      clamp(
        distance /
          1200,
        0,
        0.35
      );

    /*
      Banks need a little extra.
    */

    if (
      shot?.type === "BANK"
    ) {

      power +=
        0.08;
    }

    /*
      Combinations need slightly more.
    */

    if (
      shot?.type === "COMBO"
    ) {

      power +=
        0.07;
    }

    /*
      7FIGURES can use stronger positioning shots.
    */

    if (
      state.aiLevel >= 5 &&
      shot?.type === "DIRECT"
    ) {

      power +=
        0.03;
    }

    return clamp(
      power,
      profile.powerMin,
      profile.powerMax
    );
  }


  /* =========================================================
     AI AIM ERROR
     ========================================================= */

  function applyAIAccuracy(
    angle
  ) {

    const profile =
      aiProfile(
        state.aiLevel
      );

    const error =
      (
        Math.random() -
        0.5
      ) *
      profile.accuracy;

    return angle +
      error;
  }


  /* =========================================================
     AI SCHEDULER
     ========================================================= */

  function cancelAITurn() {

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


  function scheduleAI() {

    if (
      state.gameOver ||
      state.paused ||
      player()?.type !== "ai" ||
      state.shooting
    ) {
      return;
    }

    /*
      Cancel previous pending timer first.
    */

    if (
      state.aiTimer
    ) {

      clearTimeout(
        state.aiTimer
      );

      state.aiTimer =
        null;
    }

    const token =
      ++state.aiToken;

    state.aiThinking =
      true;

    const delay =
      CONFIG.aiMinDelay +
      Math.random() *
      (
        CONFIG.aiDelay -
        CONFIG.aiMinDelay
      );

    msg(
      `${player().name} is thinking...`
    );

    state.aiTimer =
      setTimeout(
        () => {

          state.aiTimer =
            null;

          /*
            Stale AI callback protection.
          */

          if (
            token !==
            state.aiToken
          ) {

            return;
          }

          if (
            state.gameOver ||
            state.paused ||
            state.shooting ||
            player()?.type !== "ai"
          ) {

            state.aiThinking =
              false;

            return;
          }

          executeAITurn();

        },
        delay
      );
  }


  function executeAITurn() {

    if (
      state.gameOver ||
      state.paused ||
      state.shooting ||
      player()?.type !== "ai"
    ) {

      state.aiThinking =
        false;

      return;
    }

    const shot =
      chooseAIShot();

    if (!shot) {

      state.aiThinking =
        false;

      switchPlayer();

      return;
    }

    state.currentShotType =
      shot.type;

    state.currentShotTarget =
      shot.target;

    state.currentShotPocket =
      shot.pocket;

    /*
      9-ball target is captured BEFORE the shot.
    */

    if (
      state.gameType === "9ball"
    ) {

      state.nineBallTargetAtShot =
        lowestNineBall()?.number ??
        null;
    } else {

      state.nineBallTargetAtShot =
        null;
    }

    const angle =
      applyAIAccuracy(
        shot.angle
      );

    const power =
      chooseAIPower(
        shot
      );

    const thinkingTime =
      Math.min(
        350 +
        (
          5 -
          state.aiLevel
        ) *
        90 +
        Math.random() *
        250,

        CONFIG.aiMaxThinkTime
      );

    const token =
      state.aiToken;

    msg(
      `${player().name}: ${shot.type} SHOT — Ball ${shot.target?.number ?? "?"}`
    );

    state.aiTimer =
      setTimeout(
        () => {

          state.aiTimer =
            null;

          if (
            token !==
            state.aiToken
          ) {
            return;
          }

          if (
            state.gameOver ||
            state.paused ||
            state.shooting ||
            player()?.type !== "ai"
          ) {

            state.aiThinking =
              false;

            return;
          }

          state.aiThinking =
            false;

          setPower(
            power
          );

          fire(
            angle,
            power
          );

        },
        thinkingTime
      );
  }


  /* =========================================================
     RESET
     ========================================================= */

  function resetGame() {

    cancelAITurn();

    stopTimer();

    state.gameOver = false;

    state.shooting = false;

    state.aiming = false;

    state.paused = false;

    state.aiThinking = false;

    state.currentPlayer = 0;

    state.breakShot = true;

    state.breakConsumed = false;

    state.shotCount = 0;

    state.ballsPocketedThisTurn = [];

    state.foulThisTurn = false;

    state.firstBallHit = null;

    state.nineBallTargetAtShot = null;

    state.lockOn = false;

    state.lockedTarget = null;

    state.challengeScore = 0;

    state.challengeMode =
      state.mode === "challenge";

    state.currentShotType =
      "DIRECT";

    state.currentShotTarget =
      null;

    state.currentShotPocket =
      null;

    state.accumulator = 0;

    state.power = 0.55;

    configurePlayers();

    if (layer) {
      layer.innerHTML = "";
    }

    createRack();

    setAim(0);

    setPower(0.55);

    resetTimer();

    updateUI();

    render();

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
      Auto-start AI-vs-AI.
    */

    if (
      player()?.type === "ai"
    ) {

      scheduleAI();
    }
  }


  /* =========================================================
     NEW RACK
     ========================================================= */

  function newRack() {

    audioPlay("click");

    resetGame();
  }


  /* =========================================================
     PAUSE
     ========================================================= */

  function pauseGame() {

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

      /*
        Freeze all AI timers so resume cannot duplicate them.
      */

      if (
        state.aiTimer
      ) {

        clearTimeout(
          state.aiTimer
        );

        state.aiTimer =
          null;
      }

      state.aiToken++;

      state.aiThinking =
        false;

      hideAim();

      msg(
        "GAME PAUSED"
      );

      audioPlay("click");

    } else {

      msg(
        `${player().name} RESUMING...`
      );

      audioPlay("click");

      /*
        Resume AI exactly once.
      */

      if (
        player()?.type === "ai" &&
        !state.shooting
      ) {

        scheduleAI();

      } else if (
        !state.shooting
      ) {

        renderAimLine();
      }
    }

    if (
      pauseButton
    ) {

      pauseButton.textContent =
        state.paused
          ? "▶ RESUME"
          : "⏸ PAUSE";
    }
  }


  /* =========================================================
     THEME
     ========================================================= */

  function applyCurrentTheme() {

    if (
      !themeSelect
    ) {
      return;
    }

    try {

      if (
        window.ROLYFE_POOL_THEME &&
        typeof
          window.ROLYFE_POOL_THEME.change ===
          "function"
      ) {

        window.ROLYFE_POOL_THEME.change(
          themeSelect.value
        );

        return;
      }

      if (
        typeof window.changePoolTheme ===
        "function"
      ) {

        window.changePoolTheme(
          themeSelect.value
        );
      }

    } catch (error) {

      console.warn(
        "RO'Lyfe Pool Theme:",
        error
      );
    }
  }


  /* =========================================================
     SOUND BUTTON
     ========================================================= */

  function updateSoundButton() {

    if (
      !soundButton
    ) {
      return;
    }

    const audio =
      getAudio();

    if (
      audio &&
      typeof audio.isMuted ===
        "function"
    ) {

      soundButton.textContent =
        audio.isMuted()
          ? "🔇 SOUND"
          : "🔊 SOUND";
    }
  }


  function toggleSound() {

    const audio =
      getAudio();

    if (!audio) {

      audioInit();

      msg(
        "Audio engine initializing..."
      );

      return;
    }

    try {

      if (
        typeof audio.toggleMute ===
        "function"
      ) {

        audio.toggleMute();

        updateSoundButton();

        /*
          Play click only after unmuting.
        */

        if (
          !audio.isMuted?.()
        ) {

          audioPlay("click");
        }
      }

    } catch (error) {

      console.warn(
        "RO'Lyfe Sound:",
        error
      );
    }
  }


  /* =========================================================
     FULLSCREEN
     ========================================================= */

  async function toggleFullscreen() {

    try {

      if (
        !document.fullscreenElement
      ) {

        if (
          app?.requestFullscreen
        ) {

          await app.requestFullscreen();

        } else if (
          document.documentElement
            ?.requestFullscreen
        ) {

          await document
            .documentElement
            .requestFullscreen();
        }

      } else {

        await document.exitFullscreen();
      }

    } catch (error) {

      console.warn(
        "RO'Lyfe Fullscreen:",
        error
      );
    }
  }


  /* =========================================================
     RULES MODAL
     ========================================================= */

  function openRules() {

    if (!rulesModal) {
      return;
    }

    rulesModal.classList.add(
      "show"
    );

    rulesModal.style.display =
      "";

    audioPlay("click");
  }


  function closeRules() {

    if (!rulesModal) {
      return;
    }

    rulesModal.classList.remove(
      "show"
    );

    if (
      rulesModal.style.display
    ) {

      rulesModal.style.display =
        "none";
    }
  }


  function closeGameOver() {

    if (!gameOverModal) {
      return;
    }

    gameOverModal.classList.remove(
      "show"
    );

    if (
      gameOverModal.style.display
    ) {

      gameOverModal.style.display =
        "none";
    }
  }


  /* =========================================================
     GAME SELECTORS
     ========================================================= */

  if (
    modeSelect
  ) {

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


  if (
    gameSelect
  ) {

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


  if (
    aiSelect
  ) {

    aiSelect.addEventListener(
      "change",
      () => {

        state.aiLevel =
          clamp(
            Number(
              aiSelect.value
            ) || 1,
            1,
            5
          );

        resetGame();
      }
    );
  }


  if (
    themeSelect
  ) {

    themeSelect.addEventListener(
      "change",
      () => {

        applyCurrentTheme();

        audioPlay("select");
      }
    );
  }


  /* =========================================================
     BUTTON EVENTS
     ========================================================= */

  shootButton?.addEventListener(
    "click",
    () => {

      audioInit();

      shoot();
    }
  );


  resetButton?.addEventListener(
    "click",
    () => {

      audioInit();

      resetGame();
    }
  );


  newRackButton?.addEventListener(
    "click",
    () => {

      audioInit();

      newRack();
    }
  );


  pauseButton?.addEventListener(
    "click",
    () => {

      audioInit();

      pauseGame();
    }
  );


  rulesButton?.addEventListener(
    "click",
    () => {

      audioInit();

      openRules();
    }
  );


  closeRulesButton?.addEventListener(
    "click",
    closeRules
  );


  playAgainButton?.addEventListener(
    "click",
    () => {

      closeGameOver();

      audioInit();

      resetGame();
    }
  );


  soundButton?.addEventListener(
    "click",
    () => {

      audioInit();

      toggleSound();
    }
  );


  fullscreenButton?.addEventListener(
    "click",
    () => {

      audioInit();

      toggleFullscreen();
    }
  );


  leftButton?.addEventListener(
    "click",
    () =>
      rotateAim(
        -CONFIG.aimStep
      )
  );


  rightButton?.addEventListener(
    "click",
    () =>
      rotateAim(
        CONFIG.aimStep
      )
  );


  lockButton?.addEventListener(
    "click",
    () => {

      audioInit();

      lockAim();
    }
  );


  powerDownButton?.addEventListener(
    "click",
    decreasePower
  );


  powerUpButton?.addEventListener(
    "click",
    increasePower
  );


  /* =========================================================
     POWER COMPATIBILITY SELECTORS
     ========================================================= */

  document
    .querySelectorAll(
      "[data-power='increase'], .power-plus, #powerPlus"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        increasePower
      );
    });


  document
    .querySelectorAll(
      "[data-power='decrease'], .power-minus, #powerMinus"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        decreasePower
      );
    });


  /* =========================================================
     KEYBOARD
     ========================================================= */

  document.addEventListener(
    "keydown",
    event => {

      /*
        Do not let Space fire repeatedly from key repeat.
      */

      if (
        event.code === "Space"
      ) {

        event.preventDefault();

        if (
          !event.repeat
        ) {

          audioInit();

          shoot();
        }

        return;
      }

      if (
        event.key ===
        "ArrowLeft"
      ) {

        event.preventDefault();

        rotateAim(
          -CONFIG.aimStep
        );

        return;
      }

      if (
        event.key ===
        "ArrowRight"
      ) {

        event.preventDefault();

        rotateAim(
          CONFIG.aimStep
        );

        return;
      }

      if (
        event.key.toLowerCase() ===
        "r"
      ) {

        resetGame();

        return;
      }

      if (
        event.key.toLowerCase() ===
        "l"
      ) {

        lockAim();

        return;
      }

      if (
        event.key.toLowerCase() ===
        "p"
      ) {

        pauseGame();
      }
    }
  );


  /* =========================================================
     GLOBAL AUDIO UNLOCK
     ========================================================= */

  [
    "pointerdown",
    "touchstart",
    "mousedown",
    "keydown"
  ].forEach(
    eventName => {

      document.addEventListener(
        eventName,
        () => {

          audioInit();

        },
        {
          once: true,
          passive:
            eventName !==
            "touchstart"
        }
      );
    }
  );


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
      !state.paused &&
      state.shooting
    ) {

      physics(delta);
    }

    render();

    state.animationFrame =
      requestAnimationFrame(
        loop
      );
  }


  /* =========================================================
     PUBLIC API
     ========================================================= */

  window.ROLYFE_POOL = {

    state,

    resetGame,

    newRack,

    shoot,

    pause:
      pauseGame,

    aimLeft:
      () =>
        rotateAim(
          -CONFIG.aimStep
        ),

    aimRight:
      () =>
        rotateAim(
          CONFIG.aimStep
        ),

    lockOn:
      lockAim,

    setPower:
      value =>
        setPower(
          clamp(
            Number(value) || 0,
            0,
            1
          )
        ),

    setMode:
      mode => {

        state.mode =
          mode;

        if (
          modeSelect
        ) {
          modeSelect.value =
            mode;
        }

        resetGame();
      },

    setGameType:
      type => {

        state.gameType =
          type;

        if (
          gameSelect
        ) {
          gameSelect.value =
            type;
        }

        resetGame();
      },

    setAILevel:
      level => {

        state.aiLevel =
          clamp(
            Number(level) || 1,
            1,
            5
          );

        if (
          aiSelect
        ) {
          aiSelect.value =
            String(
              state.aiLevel
            );
        }

        resetGame();
      },

    startAI:
      scheduleAI,

    stopAI:
      cancelAITurn,

    getScore:
      () =>
        state.players.map(
          p => ({
            name: p.name,
            score: p.score
          })
        ),

    getState:
      () =>
        state,

    getAIProfile:
      () =>
        aiProfile(
          state.aiLevel
        )
  };


  /* =========================================================
     INITIALIZATION
     ========================================================= */

  function initialize() {

    audioInit();

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
      aiSelect
    ) {

      state.aiLevel =
        clamp(
          Number(
            aiSelect.value
          ) || 1,
          1,
          5
        );
    }

    configurePlayers();

    applyCurrentTheme();

    updateSoundButton();

    resetGame();

    state.initialized =
      true;

    console.log(
      "🎱 RO'Lyfe Pool Engine V3.4.2 loaded."
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
