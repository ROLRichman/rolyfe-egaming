/* =========================================================
   RO'LYFE POOL™ — V3.2 CLEAN ACTIVE BASELINE
   ---------------------------------------------------------
   • 8-Ball
   • 9-Ball
   • Practice
   • PvP
   • PvAI
   • AI vs AI
   • Challenge Mode
   • 5 AI Levels
   • Aim / Power / Shoot
   • Ball / Rail / Ball-to-ball collisions
   • Pockets
   • Scratch handling
   • Timers
   • Pause / Reset / New Rack
   • Rules / Game Over
   • Fullscreen / Sound Toggle
   • Mobile + Keyboard Controls

   NOTE:
   This file is intentionally self-contained for Pool gameplay.
   Protected V3.1 backups are not modified.
========================================================= */

(() => {
    "use strict";

    /* =====================================================
       CONFIGURATION
    ===================================================== */

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
        shotSettleDelay: 250,

        playerTime: 600,
        challengeTime: 120,

        aimStep: 2.5,
        aimLineLength: 240,

        aiMaxThinkTime: 1800,
        maxVelocity: 38,

        maxBalls: 16
    };

    /* =====================================================
       DOM
    ===================================================== */

    const $ = (id) => document.getElementById(id);

    const poolApp = $("poolApp");
    const poolTable = $("poolTable");
    const ballLayer = $("ballLayer");
    const aimLine = $("aimLine");

    const poolGame = $("poolGame");
    const poolMode = $("poolMode");
    const poolAILevel = $("poolAILevel");
    const poolTheme = $("poolTheme");

    const player1 = $("player1");
    const player2 = $("player2");
    const turnStatus = $("turnStatus");
    const aiStatus = $("aiStatus");

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

    const soundBtn = $("soundBtn");
    const fullscreenBtn = $("fullscreenBtn");

    /* =====================================================
       STATE
    ===================================================== */

    const state = {
        running: false,
        paused: false,
        gameOver: false,

        gameType: "8ball",
        mode: "pvp",
        aiLevel: 1,

        currentPlayer: 1,

        power: 50,
        aimAngle: -Math.PI / 2,

        balls: [],

        cueBall: null,

        shotInProgress: false,
        shotNumber: 0,

        ballsPocketedThisShot: [],
        scratchThisShot: false,

        challenge: false,
        challengePoints: 0,

        player1Time: CONFIG.playerTime,
        player2Time: CONFIG.playerTime,
        challengeTime: CONFIG.challengeTime,

        soundEnabled: true,

        lastFrame: 0,
        animationFrame: null,

        timerInterval: null,
        aiTimeout: null,

        turnMessage: "PLAYER 1 TURN",

        playerGroups: {
            1: null,
            2: null
        }
    };

    /* =====================================================
       UTILITIES
    ===================================================== */

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function distance(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    }

    function normalize(x, y) {
        const length = Math.sqrt(x * x + y * y);

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

    function random(min, max) {
        return Math.random() * (max - min) + min;
    }

    function formatTime(seconds) {
        seconds = Math.max(0, Math.floor(seconds));

        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;

        return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    }

    function isMoving() {
        return state.balls.some(ball => {
            if (ball.pocketed) return false;

            return Math.abs(ball.vx) > CONFIG.stopVelocity ||
                   Math.abs(ball.vy) > CONFIG.stopVelocity;
        });
    }

    /* =====================================================
       BALL DATA
    ===================================================== */

    const BALL_COLORS = {
        0: "#f7f7f7",
        1: "#f4c542",
        2: "#3155d9",
        3: "#d33c32",
        4: "#7d3fc5",
        5: "#ef7f32",
        6: "#23834a",
        7: "#8b2025",
        8: "#111111",
        9: "#f4c542",
        10: "#3155d9",
        11: "#d33c32",
        12: "#7d3fc5",
        13: "#ef7f32",
        14: "#23834a",
        15: "#8b2025"
    };

    const BALL_NAMES = {
        0: "CUE",
        1: "1",
        2: "2",
        3: "3",
        4: "4",
        5: "5",
        6: "6",
        7: "7",
        8: "8",
        9: "9",
        10: "10",
        11: "11",
        12: "12",
        13: "13",
        14: "14",
        15: "15"
    };

    /* =====================================================
       CREATE BALL
    ===================================================== */

    function createBall(number, x, y) {
        return {
            id: number === 0 ? "cue" : `ball-${number}`,

            number,

            x,
            y,

            vx: 0,
            vy: 0,

            radius: CONFIG.ballRadius,

            pocketed: false,

            element: null,

            group: number === 0
                ? "cue"
                : number === 8
                    ? "eight"
                    : number <= 7
                        ? "solid"
                        : "stripe"
        };
    }

    /* =====================================================
       TABLE GEOMETRY
    ===================================================== */

    function getTableBounds() {
        const padding = CONFIG.ballRadius + 5;

        return {
            left: padding,
            right: CONFIG.tableWidth - padding,
            top: padding,
            bottom: CONFIG.tableHeight - padding
        };
    }

    function getPockets() {
        return [
            { x: 0, y: 0 },
            { x: CONFIG.tableWidth / 2, y: 0 },
            { x: CONFIG.tableWidth, y: 0 },

            { x: 0, y: CONFIG.tableHeight },
            { x: CONFIG.tableWidth / 2, y: CONFIG.tableHeight },
            { x: CONFIG.tableWidth, y: CONFIG.tableHeight }
        ];
    }

    /* =====================================================
       RACK
    ===================================================== */

    function createRack() {
        state.balls = [];
        state.cueBall = null;

        const cue = createBall(
            0,
            CONFIG.tableWidth * 0.25,
            CONFIG.tableHeight / 2
        );

        state.balls.push(cue);
        state.cueBall = cue;

        if (state.gameType === "practice") {
            createPracticeBalls();
        } else if (state.gameType === "9ball") {
            create9BallRack();
        } else {
            create8BallRack();
        }

        renderBalls();
        updateAimLine();
    }

    function create8BallRack() {
        const startX = CONFIG.tableWidth * 0.73;
        const startY = CONFIG.tableHeight / 2;

        const spacing = CONFIG.ballRadius * 2.05;

        const rack = [
            [1, 0],
            [9, -1],
            [2, 1],
            [3, -2],
            [8, 0],
            [10, 2],
            [4, -3],
            [11, -1],
            [5, 1],
            [12, 3],
            [6, -4],
            [13, -2],
            [7, 0],
            [14, 2],
            [15, 4]
        ];

        rack.forEach(([number, row]) => {
            const column = rack.filter(item => item[1] === row).length;

            let x = startX;

            if (row !== 0) {
                x += Math.abs(row) * spacing * 0.82;
            }

            const y = startY + row * spacing;

            state.balls.push(
                createBall(number, x, y)
            );
        });

        ensureRackSpacing();
    }

    function create9BallRack() {
        const startX = CONFIG.tableWidth * 0.73;
        const startY = CONFIG.tableHeight / 2;

        const spacing = CONFIG.ballRadius * 2.05;

        const rack = [
            [1, 0],
            [2, -1],
            [3, 1],
            [4, -2],
            [9, 0],
            [5, 2],
            [6, -3],
            [7, -1],
            [8, 1]
        ];

        rack.forEach(([number, row]) => {
            const x = startX + Math.abs(row) * spacing * 0.82;
            const y = startY + row * spacing;

            state.balls.push(
                createBall(number, x, y)
            );
        });

        ensureRackSpacing();
    }

    function createPracticeBalls() {
        const positions = [
            [0.55, 0.28, 1],
            [0.62, 0.42, 2],
            [0.68, 0.60, 3],
            [0.58, 0.72, 4],
            [0.76, 0.35, 5],
            [0.80, 0.55, 6]
        ];

        positions.forEach(([px, py, number]) => {
            state.balls.push(
                createBall(
                    number,
                    CONFIG.tableWidth * px,
                    CONFIG.tableHeight * py
                )
            );
        });
    }

    function ensureRackSpacing() {
        const balls = state.balls.filter(ball => ball.number !== 0);

        for (let i = 0; i < balls.length; i++) {
            for (let j = i + 1; j < balls.length; j++) {
                const a = balls[i];
                const b = balls[j];

                const minDistance = a.radius + b.radius + 0.5;

                const dx = b.x - a.x;
                const dy = b.y - a.y;

                const d = Math.sqrt(dx * dx + dy * dy);

                if (d < minDistance) {
                    const direction = normalize(dx, dy);

                    const correction = (minDistance - d) / 2;

                    a.x -= direction.x * correction;
                    a.y -= direction.y * correction;

                    b.x += direction.x * correction;
                    b.y += direction.y * correction;
                }
            }
        }
    }

    /* =====================================================
       RENDER BALLS
    ===================================================== */

    function renderBalls() {
        if (!ballLayer) return;

        state.balls.forEach(ball => {
            if (!ball.element) {
                ball.element = document.createElement("div");

                ball.element.className = "ball";

                ball.element.dataset.number = BALL_NAMES[ball.number];

                ballLayer.appendChild(ball.element);
            }

            const element = ball.element;

            if (ball.pocketed) {
                element.style.display = "none";
                return;
            }

            element.style.display = "flex";

            element.style.left = `${(ball.x / CONFIG.tableWidth) * 100}%`;
            element.style.top = `${(ball.y / CONFIG.tableHeight) * 100}%`;

            element.style.width = `${(ball.radius * 2 / CONFIG.tableWidth) * 100}%`;
            element.style.height = `${(ball.radius * 2 / CONFIG.tableHeight) * 100}%`;

            element.style.background = getBallBackground(ball.number);

            element.textContent = ball.number === 0
                ? ""
                : String(ball.number);

            element.classList.toggle(
                "ball-eight",
                ball.number === 8
            );

            element.classList.toggle(
                "ball-stripe",
                ball.number >= 9 && ball.number <= 15
            );
        });
    }

    function getBallBackground(number) {
        if (number === 0) {
            return "#f5f5f5";
        }

        if (number === 8) {
            return "#111";
        }

        const base = BALL_COLORS[number] || "#fff";

        if (number >= 9) {
            return `linear-gradient(
                to bottom,
                #f7f7f7 0%,
                #f7f7f7 27%,
                ${base} 28%,
                ${base} 72%,
                #f7f7f7 73%,
                #f7f7f7 100%
            )`;
        }

        return base;
    }

    /* =====================================================
       AIM
    ===================================================== */

    function updateAimLine() {
        if (!aimLine || !state.cueBall) return;

        if (
            state.cueBall.pocketed ||
            state.shotInProgress ||
            state.paused ||
            state.gameOver
        ) {
            aimLine.style.display = "none";
            return;
        }

        aimLine.style.display = "block";

        const x = (state.cueBall.x / CONFIG.tableWidth) * 100;
        const y = (state.cueBall.y / CONFIG.tableHeight) * 100;

        const dx = Math.cos(state.aimAngle);
        const dy = Math.sin(state.aimAngle);

        const lengthX =
            (dx * CONFIG.aimLineLength / CONFIG.tableWidth) * 100;

        const lengthY =
            (dy * CONFIG.aimLineLength / CONFIG.tableHeight) * 100;

        aimLine.style.left = `${x}%`;
        aimLine.style.top = `${y}%`;

        aimLine.style.width =
            `${Math.sqrt(lengthX * lengthX + lengthY * lengthY)}%`;

        aimLine.style.transform =
            `rotate(${state.aimAngle}rad)`;

        aimLine.style.transformOrigin = "0 50%";
    }

    function changeAim(direction) {
        if (state.shotInProgress || state.paused || state.gameOver) {
            return;
        }

        const radians =
            CONFIG.aimStep * Math.PI / 180;

        state.aimAngle += direction * radians;

        updateAimLine();
    }

    /* =====================================================
       POWER
    ===================================================== */

    function setPower(value) {
        state.power = clamp(value, 1, 100);

        if (powerFill) {
            powerFill.style.width = `${state.power}%`;
        }

        if (powerValue) {
            powerValue.textContent =
                `${Math.round(state.power)}%`;
        }
    }

    function adjustPower(amount) {
        if (state.shotInProgress || state.paused || state.gameOver) {
            return;
        }

        setPower(state.power + amount);
    }

    /* =====================================================
       SHOOT
    ===================================================== */

    function shoot() {
        if (
            state.shotInProgress ||
            state.paused ||
            state.gameOver ||
            !state.cueBall ||
            state.cueBall.pocketed
        ) {
            return;
        }

        if (state.currentPlayer !== 1 && state.mode === "pvai") {
            return;
        }

        if (state.currentPlayer !== 1 && state.mode === "aivai") {
            return;
        }

        const powerRatio = state.power / 100;

        let velocity =
            CONFIG.minPower +
            powerRatio * CONFIG.maxPower;

        if (
            state.shotNumber === 0 &&
            state.gameType === "8ball"
        ) {
            velocity *= CONFIG.breakPowerMultiplier;
        }

        velocity = clamp(
            velocity,
            CONFIG.minPower,
            CONFIG.maxPower * CONFIG.breakPowerMultiplier
        );

        state.cueBall.vx =
            Math.cos(state.aimAngle) * velocity;

        state.cueBall.vy =
            Math.sin(state.aimAngle) * velocity;

        state.shotInProgress = true;
        state.ballsPocketedThisShot = [];
        state.scratchThisShot = false;

        state.shotNumber++;

        updateShotCount();

        setAIStatus("SHOT IN PROGRESS");

        updateAimLine();

        playSound("shoot");
    }

    /* =====================================================
       PHYSICS UPDATE
    ===================================================== */

    function updatePhysics(delta) {
        if (!state.shotInProgress || state.paused) {
            return;
        }

        const dt = clamp(delta / 16.6667, 0.25, 2);

        state.balls.forEach(ball => {
            if (ball.pocketed) return;

            ball.x += ball.vx * dt;
            ball.y += ball.vy * dt;

            applyFriction(ball, dt);

            limitVelocity(ball);

            checkPocket(ball);
        });

        resolveRailCollisions();

        resolveBallCollisions();

        if (!isMoving()) {
            finishShot();
        }
    }

    function applyFriction(ball, dt) {
        const friction =
            Math.pow(CONFIG.friction, dt);

        ball.vx *= friction;
        ball.vy *= friction;

        const speed =
            Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);

        if (speed < CONFIG.stopVelocity) {
            ball.vx = 0;
            ball.vy = 0;
        }

        if (speed > 0) {
            const resistance =
                CONFIG.rollingResistance * dt;

            ball.vx -=
                (ball.vx / speed) * resistance;

            ball.vy -=
                (ball.vy / speed) * resistance;
        }
    }

    function limitVelocity(ball) {
        const speed =
            Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);

        if (speed > CONFIG.maxVelocity) {
            const factor =
                CONFIG.maxVelocity / speed;

            ball.vx *= factor;
            ball.vy *= factor;
        }
    }

    /* =====================================================
       RAIL COLLISIONS
    ===================================================== */

    function resolveRailCollisions() {
        const bounds = getTableBounds();

        state.balls.forEach(ball => {
            if (ball.pocketed) return;

            if (ball.x - ball.radius < bounds.left) {
                ball.x = bounds.left + ball.radius;

                if (ball.vx < 0) {
                    ball.vx *= -CONFIG.railRestitution;
                }
            }

            if (ball.x + ball.radius > bounds.right) {
                ball.x = bounds.right - ball.radius;

                if (ball.vx > 0) {
                    ball.vx *= -CONFIG.railRestitution;
                }
            }

            if (ball.y - ball.radius < bounds.top) {
                ball.y = bounds.top + ball.radius;

                if (ball.vy < 0) {
                    ball.vy *= -CONFIG.railRestitution;
                }
            }

            if (ball.y + ball.radius > bounds.bottom) {
                ball.y = bounds.bottom - ball.radius;

                if (ball.vy > 0) {
                    ball.vy *= -CONFIG.railRestitution;
                }
            }
        });
    }

    /* =====================================================
       BALL COLLISIONS
    ===================================================== */

    function resolveBallCollisions() {
        const activeBalls =
            state.balls.filter(ball => !ball.pocketed);

        for (let i = 0; i < activeBalls.length; i++) {
            for (let j = i + 1; j < activeBalls.length; j++) {
                const a = activeBalls[i];
                const b = activeBalls[j];

                const dx = b.x - a.x;
                const dy = b.y - a.y;

                const minDistance =
                    a.radius + b.radius;

                const distanceSquared =
                    dx * dx + dy * dy;

                if (
                    distanceSquared === 0 ||
                    distanceSquared >= minDistance * minDistance
                ) {
                    continue;
                }

                const d = Math.sqrt(distanceSquared);

                const nx = dx / d;
                const ny = dy / d;

                const overlap =
                    minDistance - d;

                a.x -= nx * overlap / 2;
                a.y -= ny * overlap / 2;

                b.x += nx * overlap / 2;
                b.y += ny * overlap / 2;

                const rvx = b.vx - a.vx;
                const rvy = b.vy - a.vy;

                const relativeVelocity =
                    rvx * nx + rvy * ny;

                if (relativeVelocity > 0) {
                    continue;
                }

                const impulse =
                    -(1 + CONFIG.collisionRestitution) *
                    relativeVelocity /
                    2;

                const impulseX = impulse * nx;
                const impulseY = impulse * ny;

                a.vx -= impulseX;
                a.vy -= impulseY;

                b.vx += impulseX;
                b.vy += impulseY;

                playSound("collision");
            }
        }
    }

    /* =====================================================
       POCKETS
    ===================================================== */

    function checkPocket(ball) {
        const pockets = getPockets();

        for (const pocket of pockets) {
            const d =
                distance(
                    ball.x,
                    ball.y,
                    pocket.x,
                    pocket.y
                );

            if (
                d <=
                CONFIG.pocketCaptureRadius
            ) {
                pocketBall(ball);
                return;
            }
        }
    }

    function pocketBall(ball) {
        if (ball.pocketed) return;

        ball.pocketed = true;

        ball.vx = 0;
        ball.vy = 0;

        state.ballsPocketedThisShot.push(
            ball.number
        );

        if (ball.number === 0) {
            state.scratchThisShot = true;
            playSound("scratch");
        } else {
            playSound("pocket");

            if (state.challenge) {
                state.challengePoints +=
                    ball.number === 8
                        ? 100
                        : 10;

                updateChallengeScore();
            }
        }
    }

    /* =====================================================
       SHOT END
    ===================================================== */

    function finishShot() {
        if (!state.shotInProgress) return;

        state.shotInProgress = false;

        renderBalls();

        const pocketed =
            [...state.ballsPocketedThisShot];

        const scratch =
            state.scratchThisShot;

        const eightPocketed =
            pocketed.includes(8);

        const remainingObjectBalls =
            state.balls.filter(ball =>
                ball.number !== 0 &&
                ball.number !== 8 &&
                !ball.pocketed
            );

        if (state.gameType === "practice") {
            finishPracticeShot();
            return;
        }

        if (state.gameType === "9ball") {
            finish9BallShot();
            return;
        }

        finish8BallShot(
            pocketed,
            scratch,
            eightPocketed,
            remainingObjectBalls
        );
    }

    function finishPracticeShot() {
        setAIStatus("READY");

        switchTurnIfNeeded(true);

        updateAimLine();

        scheduleAIIfNeeded();
    }

    function finish9BallShot() {
        const ninePocketed =
            state.balls.some(ball =>
                ball.number === 9 &&
                ball.pocketed
            );

        if (ninePocketed) {
            endGame(
                `PLAYER ${state.currentPlayer} WINS`
            );
            return;
        }

        if (state.scratchThisShot) {
            respawnCueBall();
        }

        switchTurnIfNeeded(
            state.ballsPocketedThisShot.length > 0 &&
            !state.scratchThisShot
        );

        setAIStatus("READY");

        updateAimLine();

        scheduleAIIfNeeded();
    }

    function finish8BallShot(
        pocketed,
        scratch,
        eightPocketed,
        remainingObjectBalls
    ) {
        if (eightPocketed) {
            const player = state.currentPlayer;

            const legal =
                !scratch &&
                playerHasFinishedGroup(player);

            if (legal) {
                endGame(
                    `PLAYER ${player} WINS`
                );
            } else {
                endGame(
                    `PLAYER ${player === 1 ? 2 : 1} WINS`
                );
            }

            return;
        }

        if (scratch) {
            respawnCueBall();

            switchTurnIfNeeded(false);
        } else if (pocketed.length === 0) {
            switchTurnIfNeeded(false);
        } else {
            assignPlayerGroupIfNeeded();
        }

        setAIStatus("READY");

        updateAimLine();

        scheduleAIIfNeeded();
    }

    /* =====================================================
       GROUPS
    ===================================================== */

    function assignPlayerGroupIfNeeded() {
        if (state.gameType !== "8ball") {
            return;
        }

        if (
            state.playerGroups[1] ||
            state.playerGroups[2]
        ) {
            return;
        }

        const objectPocketed =
            state.ballsPocketedThisShot.filter(
                number =>
                    number >= 1 &&
                    number <= 15 &&
                    number !== 8
            );

        if (!objectPocketed.length) {
            return;
        }

        const firstBall =
            objectPocketed[0];

        const group =
            firstBall <= 7
                ? "solid"
                : "stripe";

        state.playerGroups[state.currentPlayer] =
            group;

        state.playerGroups[
            state.currentPlayer === 1 ? 2 : 1
        ] =
            group === "solid"
                ? "stripe"
                : "solid";

        updatePlayerLabels();
    }

    function playerHasFinishedGroup(player) {
        const group =
            state.playerGroups[player];

        if (!group) {
            return false;
        }

        return state.balls.every(ball => {
            if (ball.number === 0) return true;
            if (ball.number === 8) return true;
            if (ball.pocketed) return true;

            if (group === "solid") {
                return ball.number >= 9;
            }

            if (group === "stripe") {
                return ball.number <= 7;
            }

            return true;
        });
    }

    function updatePlayerLabels() {
        const group1 =
            state.playerGroups[1];

        const group2 =
            state.playerGroups[2];

        const p1Status =
            player1?.querySelector(".player-status");

        const p2Status =
            player2?.querySelector(".player-status");

        if (p1Status) {
            p1Status.textContent =
                group1
                    ? group1.toUpperCase()
                    : "READY";
        }

        if (p2Status) {
            p2Status.textContent =
                group2
                    ? group2.toUpperCase()
                    : "WAITING";
        }
    }

    /* =====================================================
       CUE BALL
    ===================================================== */

    function respawnCueBall() {
        if (!state.cueBall) return;

        const bounds = getTableBounds();

        state.cueBall.pocketed = false;

        state.cueBall.x =
            CONFIG.tableWidth * 0.25;

        state.cueBall.y =
            CONFIG.tableHeight / 2;

        state.cueBall.vx = 0;
        state.cueBall.vy = 0;

        for (let i = 0; i < 50; i++) {
            const occupied =
                state.balls.some(ball => {
                    if (
                        ball === state.cueBall ||
                        ball.pocketed
                    ) {
                        return false;
                    }

                    return distance(
                        state.cueBall.x,
                        state.cueBall.y,
                        ball.x,
                        ball.y
                    ) <
                    state.cueBall.radius +
                    ball.radius +
                    4;
                });

            if (!occupied) break;

            state.cueBall.y =
                random(
                    bounds.top + 20,
                    bounds.bottom - 20
                );
        }
    }

    /* =====================================================
       TURN MANAGEMENT
    ===================================================== */

    function switchTurnIfNeeded(keepTurn) {
        if (keepTurn) {
            updateTurnUI();
            return;
        }

        state.currentPlayer =
            state.currentPlayer === 1
                ? 2
                : 1;

        updateTurnUI();
    }

    function updateTurnUI() {
        state.turnMessage =
            `PLAYER ${state.currentPlayer} TURN`;

        if (turnStatus) {
            turnStatus.textContent =
                state.turnMessage;
        }

        if (player1) {
            player1.classList.toggle(
                "active",
                state.currentPlayer === 1
            );
        }

        if (player2) {
            player2.classList.toggle(
                "active",
                state.currentPlayer === 2
            );
        }
    }

    /* =====================================================
       AI
    ===================================================== */

    function isAITurn() {
        if (state.mode === "pvp") {
            return false;
        }

        if (state.mode === "pvai") {
            return state.currentPlayer === 2;
        }

        if (state.mode === "aivai") {
            return true;
        }

        if (state.mode === "challenge") {
            return false;
        }

        return false;
    }

    function scheduleAIIfNeeded() {
        if (
            state.gameOver ||
            state.paused ||
            state.shotInProgress
        ) {
            return;
        }

        if (!isAITurn()) {
            return;
        }

        clearTimeout(state.aiTimeout);

        setAIStatus("AI THINKING");

        const level =
            clamp(
                Number(state.aiLevel) || 1,
                1,
                5
            );

        const delay =
            CONFIG.aiDelay +
            level * 150;

        state.aiTimeout =
            setTimeout(
                makeAIShot,
                delay
            );
    }

    function makeAIShot() {
        if (
            state.gameOver ||
            state.paused ||
            state.shotInProgress
        ) {
            return;
        }

        if (!isAITurn()) {
            return;
        }

        if (
            !state.cueBall ||
            state.cueBall.pocketed
        ) {
            respawnCueBall();
        }

        const target =
            chooseAITarget();

        if (!target) {
            changeAimAI(
                random(
                    -Math.PI,
                    Math.PI
                )
            );

            setPower(
                random(35, 65)
            );

            shoot();
            return;
        }

        const dx =
            target.x -
            state.cueBall.x;

        const dy =
            target.y -
            state.cueBall.y;

        let angle =
            Math.atan2(dy, dx);

        const level =
            clamp(
                Number(state.aiLevel) || 1,
                1,
                5
            );

        const accuracy =
            Math.max(
                0.015,
                0.18 - level * 0.03
            );

        angle +=
            random(
                -accuracy,
                accuracy
            );

        changeAimAI(angle);

        const distanceToTarget =
            Math.sqrt(
                dx * dx +
                dy * dy
            );

        const basePower =
            clamp(
                35 +
                distanceToTarget / 8,
                30,
                90
            );

        setPower(
            clamp(
                basePower +
                random(-8, 8),
                20,
                100
            )
        );

        shoot();
    }

    function chooseAITarget() {
        const available =
            state.balls.filter(ball => {
                if (ball.pocketed) return false;
                if (ball.number === 0) return false;

                if (state.gameType === "9ball") {
                    return true;
                }

                if (state.gameType === "practice") {
                    return true;
                }

                if (ball.number === 8) {
                    return true;
                }

                const group =
                    state.playerGroups[state.currentPlayer];

                if (!group) {
                    return true;
                }

                return ball.group === group;
            });

        if (!available.length) {
            return null;
        }

        if (state.gameType === "9ball") {
            return available.sort(
                (a, b) => a.number - b.number
            )[0];
        }

        const cue = state.cueBall;

        available.sort((a, b) => {
            const da =
                distance(
                    cue.x,
                    cue.y,
                    a.x,
                    a.y
                );

            const db =
                distance(
                    cue.x,
                    cue.y,
                    b.x,
                    b.y
                );

            return da - db;
        });

        return available[0];
    }

    function changeAimAI(angle) {
        state.aimAngle = angle;

        updateAimLine();
    }

    function setAIStatus(message) {
        if (aiStatus) {
            aiStatus.textContent = message;
        }
    }

    /* =====================================================
       UI STATS
    ===================================================== */

    function updateStats() {
        if (statGame) {
            statGame.textContent =
                String(state.gameType)
                    .toUpperCase()
                    .replace("8BALL", "8-BALL")
                    .replace("9BALL", "9-BALL");
        }

        if (statMode) {
            statMode.textContent =
                String(state.mode)
                    .toUpperCase()
                    .replace("PVP", "PVP")
                    .replace("PVAI", "PVAI")
                    .replace("AIVAI", "AI VS AI")
                    .replace("CHALLENGE", "CHALLENGE");
        }

        if (statAI) {
            const names = {
                1: "START-UP",
                2: "BEGINNER",
                3: "INVESTOR",
                4: "ADVANCED",
                5: "7FIGURES"
            };

            statAI.textContent =
                names[state.aiLevel] ||
                "START-UP";
        }

        updateShotCount();
    }

    function updateShotCount() {
        if (shotCount) {
            shotCount.textContent =
                String(state.shotNumber);
        }
    }

    function updateChallengeScore() {
        if (challengeScore) {
            challengeScore.textContent =
                String(state.challengePoints);
        }
    }

    /* =====================================================
       GAME INITIALIZATION
    ===================================================== */

    function startGame() {
        clearTimeout(state.aiTimeout);

        state.running = true;
        state.paused = false;
        state.gameOver = false;

        state.currentPlayer = 1;

        state.power = 50;
        state.aimAngle = -Math.PI / 2;

        state.shotInProgress = false;
        state.shotNumber = 0;

        state.ballsPocketedThisShot = [];
        state.scratchThisShot = false;

        state.playerGroups = {
            1: null,
            2: null
        };

        state.player1Time =
            CONFIG.playerTime;

        state.player2Time =
            CONFIG.playerTime;

        state.challenge =
            state.mode === "challenge";

        state.challengePoints = 0;

        state.challengeTime =
            CONFIG.challengeTime;

        if (poolGame) {
            state.gameType =
                poolGame.value;
        }

        if (poolMode) {
            state.mode =
                poolMode.value;
        }

        if (poolAILevel) {
            state.aiLevel =
                Number(poolAILevel.value) || 1;
        }

        createRack();

        setPower(50);

        updateTurnUI();
        updateStats();
        updatePlayerLabels();
        updateChallengeUI();

        setAIStatus("READY");

        hideModal(gameOverModal);

        if (pauseBtn) {
            pauseBtn.textContent = "PAUSE";
        }

        startTimer();

        updateAimLine();

        scheduleAIIfNeeded();
    }

    /* =====================================================
       CHALLENGE UI
    ===================================================== */

    function updateChallengeUI() {
        if (!challengePanel) return;

        challengePanel.classList.toggle(
            "hidden",
            !state.challenge
        );

        updateChallengeScore();
    }

    /* =====================================================
       TIMER
    ===================================================== */

    function startTimer() {
        stopTimer();

        state.timerInterval =
            setInterval(
                updateTimer,
                1000
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

    function updateTimer() {
        if (
            !state.running ||
            state.paused ||
            state.gameOver
        ) {
            return;
        }

        if (state.challenge) {
            state.challengeTime--;

            if (state.challengeTime <= 0) {
                endChallenge();

                return;
            }

            return;
        }

        if (state.currentPlayer === 1) {
            state.player1Time--;

            if (state.player1Time <= 0) {
                endGame(
                    "PLAYER 2 WINS — TIME"
                );
            }
        } else {
            state.player2Time--;

            if (state.player2Time <= 0) {
                endGame(
                    "PLAYER 1 WINS — TIME"
                );
            }
        }

        updateTimerDisplay();
    }

    function updateTimerDisplay() {
        const timer1 =
            player1?.querySelector(
                ".player-timer span"
            );

        const timer2 =
            player2?.querySelector(
                ".player-timer span"
            );

        if (timer1) {
            timer1.textContent =
                formatTime(
                    state.player1Time
                );
        }

        if (timer2) {
            timer2.textContent =
                formatTime(
                    state.player2Time
                );
        }
    }

    /* =====================================================
       PAUSE
    ===================================================== */

    function togglePause() {
        if (state.gameOver) return;

        state.paused =
            !state.paused;

        if (pauseBtn) {
            pauseBtn.textContent =
                state.paused
                    ? "RESUME"
                    : "PAUSE";
        }

        if (state.paused) {
            setAIStatus("PAUSED");
            updateAimLine();
        } else {
            setAIStatus("READY");
            updateAimLine();
            scheduleAIIfNeeded();
        }
    }

    /* =====================================================
       RESET / NEW RACK
    ===================================================== */

    function resetGame() {
        startGame();
    }

    function newRack() {
        if (state.gameOver) {
            startGame();
            return;
        }

        clearTimeout(state.aiTimeout);

        state.shotInProgress = false;
        state.ballsPocketedThisShot = [];
        state.scratchThisShot = false;

        createRack();

        setPower(50);

        setAIStatus("READY");

        updateAimLine();

        scheduleAIIfNeeded();
    }

    /* =====================================================
       GAME OVER
    ===================================================== */

    function endGame(message) {
        state.gameOver = true;
        state.running = false;
        state.shotInProgress = false;

        stopTimer();
        clearTimeout(state.aiTimeout);

        setAIStatus("GAME OVER");

        if (finalScore) {
            finalScore.textContent =
                message;
        }

        showModal(gameOverModal);

        updateAimLine();
    }

    function endChallenge() {
        state.gameOver = true;
        state.running = false;

        stopTimer();
        clearTimeout(state.aiTimeout);

        setAIStatus("CHALLENGE COMPLETE");

        if (finalScore) {
            finalScore.textContent =
                `SCORE: ${state.challengePoints}`;
        }

        showModal(gameOverModal);

        updateAimLine();
    }

    /* =====================================================
       MODALS
    ===================================================== */

    function showModal(modal) {
        if (!modal) return;

        modal.classList.remove("hidden");
    }

    function hideModal(modal) {
        if (!modal) return;

        modal.classList.add("hidden");
    }

    function showRules() {
        showModal(rulesModal);
    }

    function hideRules() {
        hideModal(rulesModal);
    }

    /* =====================================================
       SOUND
    ===================================================== */

    function playSound(type) {
        if (!state.soundEnabled) {
            return;
        }

        try {
            if (
                window.ROLyfeAudio &&
                typeof window.ROLyfeAudio.play === "function"
            ) {
                window.ROLyfeAudio.play(type);
                return;
            }

            if (
                window.AudioEngine &&
                typeof window.AudioEngine.play === "function"
            ) {
                window.AudioEngine.play(type);
            }
        } catch (error) {
            /* Audio is optional. */
        }
    }

    function toggleSound() {
        state.soundEnabled =
            !state.soundEnabled;

        if (soundBtn) {
            soundBtn.textContent =
                state.soundEnabled
                    ? "🔊"
                    : "🔇";
        }
    }

    /* =====================================================
       FULLSCREEN
    ===================================================== */

    async function toggleFullscreen() {
        try {
            if (!document.fullscreenElement) {
                if (
                    poolApp &&
                    poolApp.requestFullscreen
                ) {
                    await poolApp.requestFullscreen();
                }
            } else {
                await document.exitFullscreen();
            }
        } catch (error) {
            /* Fullscreen may be unavailable. */
        }
    }

    /* =====================================================
       GAME LOOP
    ===================================================== */

    function gameLoop(timestamp) {
        if (!state.lastFrame) {
            state.lastFrame = timestamp;
        }

        const delta =
            timestamp -
            state.lastFrame;

        state.lastFrame =
            timestamp;

        if (
            state.running &&
            !state.paused &&
            !state.gameOver
        ) {
            updatePhysics(delta);

            renderBalls();

            updateAimLine();
        }

        state.animationFrame =
            requestAnimationFrame(
                gameLoop
            );
    }

    /* =====================================================
       SETTINGS CHANGE
    ===================================================== */

    function handleGameSettingChange() {
        if (poolGame) {
            state.gameType =
                poolGame.value;
        }

        startGame();
    }

    function handleModeChange() {
        if (poolMode) {
            state.mode =
                poolMode.value;
        }

        startGame();
    }

    function handleAILevelChange() {
        if (poolAILevel) {
            state.aiLevel =
                Number(poolAILevel.value) || 1;
        }

        updateStats();

        scheduleAIIfNeeded();
    }

    function handleThemeChange() {
        if (!poolTheme) return;

        const theme =
            poolTheme.value;

        try {
            if (
                window.ROLYFE_POOL_THEME &&
                typeof window.ROLYFE_POOL_THEME.apply === "function"
            ) {
                window.ROLYFE_POOL_THEME.apply(theme);
                return;
            }

            if (
                window.ROLYFE_POOL_THEMES &&
                typeof window.ROLYFE_POOL_THEMES.applyTheme === "function"
            ) {
                window.ROLYFE_POOL_THEMES.applyTheme(theme);
            }
        } catch (error) {
            /* Theme system is optional. */
        }
    }

    /* =====================================================
       KEYBOARD
    ===================================================== */

    function handleKeyDown(event) {
        if (event.repeat) return;

        switch (event.key) {
            case "ArrowLeft":
                event.preventDefault();
                changeAim(-1);
                break;

            case "ArrowRight":
                event.preventDefault();
                changeAim(1);
                break;

            case "ArrowUp":
                event.preventDefault();
                adjustPower(5);
                break;

            case "ArrowDown":
                event.preventDefault();
                adjustPower(-5);
                break;

            case " ":
            case "Enter":
                event.preventDefault();
                shoot();
                break;

            case "p":
            case "P":
                togglePause();
                break;

            case "r":
            case "R":
                resetGame();
                break;

            case "n":
            case "N":
                newRack();
                break;

            case "Escape":
                hideRules();
                hideModal(gameOverModal);
                break;
        }
    }

    /* =====================================================
       TOUCH / BUTTON CONTROLS
    ===================================================== */

    function bindEvents() {
        powerDown?.addEventListener(
            "click",
            () => adjustPower(-5)
        );

        powerUp?.addEventListener(
            "click",
            () => adjustPower(5)
        );

        aimLeft?.addEventListener(
            "click",
            () => changeAim(-1)
        );

        aimRight?.addEventListener(
            "click",
            () => changeAim(1)
        );

        shootBtn?.addEventListener(
            "click",
            shoot
        );

        resetPool?.addEventListener(
            "click",
            resetGame
        );

        newRackBtn?.addEventListener(
            "click",
            newRack
        );

        pauseBtn?.addEventListener(
            "click",
            togglePause
        );

        rulesBtn?.addEventListener(
            "click",
            showRules
        );

        closeRulesBtn?.addEventListener(
            "click",
            hideRules
        );

        playAgainBtn?.addEventListener(
            "click",
            startGame
        );

        soundBtn?.addEventListener(
            "click",
            toggleSound
        );

        fullscreenBtn?.addEventListener(
            "click",
            toggleFullscreen
        );

        poolGame?.addEventListener(
            "change",
            handleGameSettingChange
        );

        poolMode?.addEventListener(
            "change",
            handleModeChange
        );

        poolAILevel?.addEventListener(
            "change",
            handleAILevelChange
        );

        poolTheme?.addEventListener(
            "change",
            handleThemeChange
        );

        document.addEventListener(
            "keydown",
            handleKeyDown
        );

        rulesModal?.addEventListener(
            "click",
            event => {
                if (
                    event.target ===
                    rulesModal
                ) {
                    hideRules();
                }
            }
        );

        gameOverModal?.addEventListener(
            "click",
            event => {
                if (
                    event.target ===
                    gameOverModal
                ) {
                    hideModal(
                        gameOverModal
                    );
                }
            }
        );
    }

    /* =====================================================
       RESPONSIVE TABLE SCALE
    ===================================================== */

    function updateTableScale() {
        if (!poolTable) return;

        poolTable.style.aspectRatio =
            `${CONFIG.tableWidth} / ${CONFIG.tableHeight}`;
    }

    window.addEventListener(
        "resize",
        updateTableScale
    );

    /* =====================================================
       PUBLIC API
    ===================================================== */

    window.ROLYFE_POOL = {
        version: "3.2",
        start: startGame,
        reset: resetGame,
        newRack,
        shoot,
        pause: togglePause,
        setPower,
        changeAim,
        getState: () => ({
            ...state,
            balls: undefined,
            cueBall: undefined
        })
    };

    /* =====================================================
       INIT
    ===================================================== */

    bindEvents();

    updateTableScale();

    if (poolGame) {
        state.gameType =
            poolGame.value;
    }

    if (poolMode) {
        state.mode =
            poolMode.value;
    }

    if (poolAILevel) {
        state.aiLevel =
            Number(poolAILevel.value) || 1;
    }

    if (poolTheme) {
        handleThemeChange();
    }

    setPower(50);

    startGame();

    state.lastFrame = 0;

    state.animationFrame =
        requestAnimationFrame(
            gameLoop
        );

})();
