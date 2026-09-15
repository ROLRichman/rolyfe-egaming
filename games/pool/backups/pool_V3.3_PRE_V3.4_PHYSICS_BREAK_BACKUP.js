/* =========================================================
   RO'LYFE POOL™ — V3.3 RULE + CONTROL ENGINE
   ---------------------------------------------------------
   V3.3
   • 8-Ball
   • 9-Ball
   • Practice
   • PvP
   • PvAI
   • AI vs AI
   • Challenge Mode
   • 5 AI Levels
   • Aim / Power / Shoot
   • Mouse + Touch + Keyboard
   • Ball / Rail / Ball-to-ball collisions
   • Pocket capture
   • Scratch detection
   • First-ball-hit validation
   • 8-Ball group assignment
   • 8-Ball group enforcement
   • Legal / illegal 8-Ball
   • 9-Ball lowest-ball rule
   • Fouls
   • Timers
   • Pause / Reset / New Rack
   • Rules / Game Over
   • Fullscreen / Sound
   • Theme integration
   • Mobile support
   ---------------------------------------------------------
   V3.2 remains protected:
   backups/pool_V3.2_PRE_V3.3_BACKUP.js
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
        maxVelocity: 38,

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

        maxBalls: 16,

        cueStartX: 0.25,
        rackStartX: 0.73
    };

    /* =====================================================
       DOM
    ===================================================== */

    const $ = id => document.getElementById(id);

    const poolApp = $("poolApp");
    const poolTable = $("poolTable");
    const tableSurface =
        document.querySelector(".table-surface") ||
        poolTable;

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
        version: "3.3",

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

        breakShot: true,

        ballsPocketedThisShot: [],
        scratchThisShot: false,

        firstBallHit: null,

        foulThisShot: false,
        foulReason: "",

        challenge: false,
        challengePoints: 0,
        challengeTime: CONFIG.challengeTime,

        player1Time: CONFIG.playerTime,
        player2Time: CONFIG.playerTime,

        playerGroups: {
            1: null,
            2: null
        },

        soundEnabled: true,

        lastFrame: 0,
        animationFrame: null,

        timerInterval: null,
        aiTimeout: null,

        aimingPointer: false,
        pointerId: null,

        turnMessage: "PLAYER 1 TURN"
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
            return { x: 0, y: 0 };
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

        return (
            String(minutes).padStart(2, "0") +
            ":" +
            String(secs).padStart(2, "0")
        );
    }

    function otherPlayer(player) {
        return player === 1 ? 2 : 1;
    }

    function isObjectBall(ball) {
        return ball && ball.number >= 1 && ball.number <= 15;
    }

    function isGroupBall(ball, group) {
        if (!ball || !group) return false;

        if (group === "solid") {
            return ball.number >= 1 && ball.number <= 7;
        }

        if (group === "stripe") {
            return ball.number >= 9 && ball.number <= 15;
        }

        return false;
    }

    function remainingGroupBalls(group) {
        return state.balls.filter(ball => {
            return (
                !ball.pocketed &&
                isGroupBall(ball, group)
            );
        });
    }

    function playerHasFinishedGroup(player) {
        const group = state.playerGroups[player];

        if (!group) return false;

        return remainingGroupBalls(group).length === 0;
    }

    function allObjectBallsPocketed() {
        return state.balls.every(ball => {
            if (!isObjectBall(ball)) return true;

            return ball.pocketed;
        });
    }

    function isMoving() {
        return state.balls.some(ball => {
            if (ball.pocketed) return false;

            return (
                Math.abs(ball.vx) > CONFIG.stopVelocity ||
                Math.abs(ball.vy) > CONFIG.stopVelocity
            );
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

    function createBall(number, x, y) {
        return {
            id:
                number === 0
                    ? "cue"
                    : `ball-${number}`,

            number,

            x,
            y,

            vx: 0,
            vy: 0,

            radius: CONFIG.ballRadius,

            pocketed: false,

            element: null,

            group:
                number === 0
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

    /* =====================================================
       RACK CREATION
    ===================================================== */

    function createRack() {
        state.balls = [];
        state.cueBall = null;

        const cue = createBall(
            0,
            CONFIG.tableWidth * CONFIG.cueStartX,
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
        const startX =
            CONFIG.tableWidth * CONFIG.rackStartX;

        const startY =
            CONFIG.tableHeight / 2;

        const spacing =
            CONFIG.ballRadius * 2.05;

        const rows = [
            [1],
            [9, 2],
            [3, 8, 10],
            [11, 4, 12, 5],
            [6, 13, 7, 14, 15]
        ];

        rows.forEach((row, rowIndex) => {
            const x =
                startX +
                rowIndex *
                spacing *
                0.86;

            const offset =
                -(row.length - 1) *
                spacing /
                2;

            row.forEach((number, index) => {
                const y =
                    startY +
                    offset +
                    index * spacing;

                state.balls.push(
                    createBall(number, x, y)
                );
            });
        });

        ensureRackSpacing();
    }

    function create9BallRack() {
        const startX =
            CONFIG.tableWidth * CONFIG.rackStartX;

        const startY =
            CONFIG.tableHeight / 2;

        const spacing =
            CONFIG.ballRadius * 2.05;

        const rows = [
            [1],
            [2, 3],
            [4, 9, 5],
            [6, 7],
            [8]
        ];

        rows.forEach((row, rowIndex) => {
            const x =
                startX +
                rowIndex *
                spacing *
                0.86;

            const offset =
                -(row.length - 1) *
                spacing /
                2;

            row.forEach((number, index) => {
                const y =
                    startY +
                    offset +
                    index * spacing;

                state.balls.push(
                    createBall(number, x, y)
                );
            });
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
        const balls =
            state.balls.filter(
                ball => ball.number !== 0
            );

        for (let pass = 0; pass < 4; pass++) {
            for (let i = 0; i < balls.length; i++) {
                for (let j = i + 1; j < balls.length; j++) {
                    const a = balls[i];
                    const b = balls[j];

                    const dx = b.x - a.x;
                    const dy = b.y - a.y;

                    const d =
                        Math.sqrt(
                            dx * dx +
                            dy * dy
                        );

                    const minDistance =
                        a.radius +
                        b.radius +
                        0.5;

                    if (d >= minDistance) {
                        continue;
                    }

                    const direction =
                        d > 0
                            ? normalize(dx, dy)
                            : { x: 1, y: 0 };

                    const correction =
                        (minDistance - d) / 2;

                    a.x -=
                        direction.x *
                        correction;

                    a.y -=
                        direction.y *
                        correction;

                    b.x +=
                        direction.x *
                        correction;

                    b.y +=
                        direction.y *
                        correction;
                }
            }
        }
    }

    /* =====================================================
       RENDERING
    ===================================================== */

    function renderBalls() {
        if (!ballLayer) return;

        state.balls.forEach(ball => {
            if (!ball.element) {
                ball.element =
                    document.createElement("div");

                ball.element.className =
                    "ball";

                ball.element.dataset.number =
                    BALL_NAMES[ball.number];

                ballLayer.appendChild(
                    ball.element
                );
            }

            const element = ball.element;

            if (ball.pocketed) {
                element.style.display = "none";
                return;
            }

            element.style.display = "flex";

            element.style.left =
                `${(ball.x / CONFIG.tableWidth) * 100}%`;

            element.style.top =
                `${(ball.y / CONFIG.tableHeight) * 100}%`;

            element.style.width =
                `${(ball.radius * 2 / CONFIG.tableWidth) * 100}%`;

            element.style.height =
                `${(ball.radius * 2 / CONFIG.tableHeight) * 100}%`;

            element.style.background =
                getBallBackground(
                    ball.number
                );

            element.textContent =
                ball.number === 0
                    ? ""
                    : String(ball.number);

            element.classList.toggle(
                "ball-eight",
                ball.number === 8
            );

            element.classList.toggle(
                "ball-stripe",
                ball.number >= 9 &&
                ball.number <= 15
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

        const base =
            BALL_COLORS[number] ||
            "#fff";

        if (number >= 9) {
            return `
                linear-gradient(
                    to bottom,
                    #f7f7f7 0%,
                    #f7f7f7 27%,
                    ${base} 28%,
                    ${base} 72%,
                    #f7f7f7 73%,
                    #f7f7f7 100%
                )
            `;
        }

        return base;
    }

    /* =====================================================
       AIM LINE
    ===================================================== */

    function updateAimLine() {
        if (!aimLine || !state.cueBall) {
            return;
        }

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

        const x =
            (state.cueBall.x /
                CONFIG.tableWidth) *
            100;

        const y =
            (state.cueBall.y /
                CONFIG.tableHeight) *
            100;

        const dx =
            Math.cos(state.aimAngle);

        const dy =
            Math.sin(state.aimAngle);

        const lengthX =
            (dx *
                CONFIG.aimLineLength /
                CONFIG.tableWidth) *
            100;

        const lengthY =
            (dy *
                CONFIG.aimLineLength /
                CONFIG.tableHeight) *
            100;

        const length =
            Math.sqrt(
                lengthX * lengthX +
                lengthY * lengthY
            );

        aimLine.style.left =
            `${x}%`;

        aimLine.style.top =
            `${y}%`;

        aimLine.style.width =
            `${length}%`;

        aimLine.style.transform =
            `rotate(${state.aimAngle}rad)`;

        aimLine.style.transformOrigin =
            "0 50%";
    }

    function changeAim(direction) {
        if (
            state.shotInProgress ||
            state.paused ||
            state.gameOver ||
            isAITurn()
        ) {
            return;
        }

        const radians =
            CONFIG.aimStep *
            Math.PI /
            180;

        state.aimAngle +=
            direction * radians;

        updateAimLine();
    }

    /* =====================================================
       POWER
    ===================================================== */

    function setPower(value) {
        state.power =
            clamp(value, 1, 100);

        if (powerFill) {
            powerFill.style.width =
                `${state.power}%`;
        }

        if (powerValue) {
            powerValue.textContent =
                `${Math.round(state.power)}%`;
        }
    }

    function adjustPower(amount) {
        if (
            state.shotInProgress ||
            state.paused ||
            state.gameOver ||
            isAITurn()
        ) {
            return;
        }

        setPower(
            state.power + amount
        );
    }

    /* =====================================================
       LEGAL TARGET
    ===================================================== */

    function getLowest9Ball() {
        const available =
            state.balls
                .filter(ball => {
                    return (
                        ball.number >= 1 &&
                        ball.number <= 9 &&
                        !ball.pocketed
                    );
                })
                .sort(
                    (a, b) =>
                        a.number -
                        b.number
                );

        return available[0] || null;
    }

    function getLegalTargets(player) {
        if (state.gameType === "practice") {
            return state.balls.filter(ball => {
                return (
                    isObjectBall(ball) &&
                    !ball.pocketed
                );
            });
        }

        if (state.gameType === "9ball") {
            const lowest =
                getLowest9Ball();

            return lowest
                ? [lowest]
                : [];
        }

        const group =
            state.playerGroups[player];

        if (!group) {
            return state.balls.filter(ball => {
                return (
                    isObjectBall(ball) &&
                    ball.number !== 8 &&
                    !ball.pocketed
                );
            });
        }

        const groupBalls =
            remainingGroupBalls(group);

        if (groupBalls.length) {
            return groupBalls;
        }

        const eight =
            state.balls.find(
                ball =>
                    ball.number === 8 &&
                    !ball.pocketed
            );

        return eight ? [eight] : [];
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

        if (
            state.mode === "pvai" &&
            state.currentPlayer === 2
        ) {
            return;
        }

        if (isAITurn() === false &&
            state.mode === "aivai") {
            return;
        }

        const powerRatio =
            state.power / 100;

        let velocity =
            CONFIG.minPower +
            powerRatio *
            CONFIG.maxPower;

        if (
            state.breakShot &&
            state.gameType !== "practice"
        ) {
            velocity *=
                CONFIG.breakPowerMultiplier;
        }

        velocity =
            clamp(
                velocity,
                CONFIG.minPower,
                CONFIG.maxPower *
                CONFIG.breakPowerMultiplier
            );

        state.cueBall.vx =
            Math.cos(state.aimAngle) *
            velocity;

        state.cueBall.vy =
            Math.sin(state.aimAngle) *
            velocity;

        state.shotInProgress = true;

        state.ballsPocketedThisShot = [];

        state.scratchThisShot = false;

        state.firstBallHit = null;

        state.foulThisShot = false;

        state.foulReason = "";

        state.shotNumber++;

        updateShotCount();

        setAIStatus(
            "SHOT IN PROGRESS"
        );

        updateAimLine();

        playSound("shoot");
    }

    /* =====================================================
       PHYSICS
    ===================================================== */

    function updatePhysics(delta) {
        if (
            !state.shotInProgress ||
            state.paused
        ) {
            return;
        }

        const dt =
            clamp(
                delta / 16.6667,
                0.25,
                2
            );

        state.balls.forEach(ball => {
            if (ball.pocketed) return;

            ball.x +=
                ball.vx * dt;

            ball.y +=
                ball.vy * dt;

            applyFriction(
                ball,
                dt
            );

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
            Math.pow(
                CONFIG.friction,
                dt
            );

        ball.vx *= friction;
        ball.vy *= friction;

        const speed =
            Math.sqrt(
                ball.vx * ball.vx +
                ball.vy * ball.vy
            );

        if (
            speed <
            CONFIG.stopVelocity
        ) {
            ball.vx = 0;
            ball.vy = 0;
            return;
        }

        const resistance =
            CONFIG.rollingResistance *
            dt;

        ball.vx -=
            (ball.vx / speed) *
            resistance;

        ball.vy -=
            (ball.vy / speed) *
            resistance;
    }

    function limitVelocity(ball) {
        const speed =
            Math.sqrt(
                ball.vx * ball.vx +
                ball.vy * ball.vy
            );

        if (
            speed >
            CONFIG.maxVelocity
        ) {
            const factor =
                CONFIG.maxVelocity /
                speed;

            ball.vx *= factor;
            ball.vy *= factor;
        }
    }

    /* =====================================================
       RAILS
    ===================================================== */

    function resolveRailCollisions() {
        const bounds =
            getTableBounds();

        state.balls.forEach(ball => {
            if (ball.pocketed) return;

            if (
                ball.x - ball.radius <
                bounds.left
            ) {
                ball.x =
                    bounds.left +
                    ball.radius;

                if (ball.vx < 0) {
                    ball.vx *=
                        -CONFIG.railRestitution;
                }
            }

            if (
                ball.x + ball.radius >
                bounds.right
            ) {
                ball.x =
                    bounds.right -
                    ball.radius;

                if (ball.vx > 0) {
                    ball.vx *=
                        -CONFIG.railRestitution;
                }
            }

            if (
                ball.y - ball.radius <
                bounds.top
            ) {
                ball.y =
                    bounds.top +
                    ball.radius;

                if (ball.vy < 0) {
                    ball.vy *=
                        -CONFIG.railRestitution;
                }
            }

            if (
                ball.y + ball.radius >
                bounds.bottom
            ) {
                ball.y =
                    bounds.bottom -
                    ball.radius;

                if (ball.vy > 0) {
                    ball.vy *=
                        -CONFIG.railRestitution;
                }
            }
        });
    }

    /* =====================================================
       BALL COLLISIONS
    ===================================================== */

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

                const distanceSquared =
                    dx * dx +
                    dy * dy;

                const minDistance =
                    a.radius +
                    b.radius;

                if (
                    distanceSquared >=
                    minDistance *
                    minDistance
                ) {
                    continue;
                }

                const d =
                    Math.sqrt(
                        distanceSquared
                    );

                const nx =
                    d > 0
                        ? dx / d
                        : 1;

                const ny =
                    d > 0
                        ? dy / d
                        : 0;

                const overlap =
                    minDistance - d;

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

                const rvx =
                    b.vx - a.vx;

                const rvy =
                    b.vy - a.vy;

                const relativeVelocity =
                    rvx * nx +
                    rvy * ny;

                /*
                 * Track the first object ball
                 * contacted by the cue ball.
                 */
                if (
                    relativeVelocity < 0
                ) {
                    if (
                        a.number === 0 &&
                        b.number !== 0 &&
                        state.firstBallHit === null
                    ) {
                        state.firstBallHit =
                            b.number;
                    }

                    if (
                        b.number === 0 &&
                        a.number !== 0 &&
                        state.firstBallHit === null
                    ) {
                        state.firstBallHit =
                            a.number;
                    }
                }

                if (
                    relativeVelocity > 0
                ) {
                    continue;
                }

                const impulse =
                    -(
                        1 +
                        CONFIG.collisionRestitution
                    ) *
                    relativeVelocity /
                    2;

                const impulseX =
                    impulse * nx;

                const impulseY =
                    impulse * ny;

                a.vx -= impulseX;
                a.vy -= impulseY;

                b.vx += impulseX;
                b.vy += impulseY;

                playSound(
                    "collision"
                );
            }
        }
    }

    /* =====================================================
       POCKETS
    ===================================================== */

    function checkPocket(ball) {
        const pockets =
            getPockets();

        for (
            const pocket of pockets
        ) {
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
        if (ball.pocketed) {
            return;
        }

        ball.pocketed = true;

        ball.vx = 0;
        ball.vy = 0;

        state.ballsPocketedThisShot.push(
            ball.number
        );

        if (ball.number === 0) {
            state.scratchThisShot = true;
            state.foulThisShot = true;
            state.foulReason = "SCRATCH";

            playSound("scratch");

            return;
        }

        playSound("pocket");

        if (state.challenge) {
            state.challengePoints +=
                ball.number === 8
                    ? 100
                    : 10;

            updateChallengeScore();
        }
    }

    /* =====================================================
       FOUL VALIDATION
    ===================================================== */

    function validateShot() {
        if (
            state.gameType === "practice"
        ) {
            return;
        }

        if (state.scratchThisShot) {
            state.foulThisShot = true;
            state.foulReason = "SCRATCH";

            return;
        }

        /*
         * No object-ball contact.
         */
        if (
            state.firstBallHit === null
        ) {
            state.foulThisShot = true;
            state.foulReason =
                "NO BALL CONTACT";

            return;
        }

        /*
         * 9-Ball:
         * first contact must be
         * the lowest numbered
         * remaining ball.
         */
        if (
            state.gameType === "9ball"
        ) {
            const lowest =
                getLowest9Ball();

            /*
             * If the lowest ball was
             * pocketed, the first hit
             * still must have been it.
             */
            if (
                lowest &&
                state.firstBallHit !==
                lowest.number
            ) {
                state.foulThisShot = true;
                state.foulReason =
                    "WRONG FIRST BALL";
            }

            return;
        }

        /*
         * 8-Ball:
         * once groups are assigned,
         * the first contacted object
         * must belong to the player's
         * group unless the player is
         * legally shooting the 8.
         */
        const group =
            state.playerGroups[
                state.currentPlayer
            ];

        if (!group) {
            return;
        }

        const hitBall =
            state.balls.find(
                ball =>
                    ball.number ===
                    state.firstBallHit
            );

        if (!hitBall) {
            return;
        }

        const groupFinished =
            playerHasFinishedGroup(
                state.currentPlayer
            );

        if (
            hitBall.number === 8 &&
            !groupFinished
        ) {
            state.foulThisShot = true;
            state.foulReason =
                "EARLY 8-BALL";

            return;
        }

        if (
            hitBall.number !== 8 &&
            !isGroupBall(
                hitBall,
                group
            )
        ) {
            state.foulThisShot = true;
            state.foulReason =
                "WRONG GROUP";
        }
    }

    /* =====================================================
       SHOT FINISH
    ===================================================== */

    function finishShot() {
        if (!state.shotInProgress) {
            return;
        }

        state.shotInProgress = false;

        renderBalls();

        validateShot();

        if (
            state.gameType ===
            "practice"
        ) {
            finishPracticeShot();

            return;
        }

        if (
            state.gameType ===
            "9ball"
        ) {
            finish9BallShot();

            return;
        }

        finish8BallShot();
    }

    /* =====================================================
       PRACTICE
    ===================================================== */

    function finishPracticeShot() {
        if (
            state.scratchThisShot
        ) {
            respawnCueBall();
        }

        setAIStatus("READY");

        /*
         * Practice always returns
         * control to the same player.
         */
        updateTurnUI();

        updateAimLine();

        scheduleAIIfNeeded();
    }

    /* =====================================================
       9-BALL
    ===================================================== */

    function finish9BallShot() {
        const ninePocketed =
            state.balls.some(
                ball =>
                    ball.number === 9 &&
                    ball.pocketed
            );

        /*
         * A 9-Ball win is legal only
         * if there was no foul.
         */
        if (
            ninePocketed &&
            !state.foulThisShot
        ) {
            endGame(
                `PLAYER ${state.currentPlayer} WINS`
            );

            return;
        }

        if (
            state.foulThisShot
        ) {
            showFoulMessage(
                state.foulReason
            );

            respawnCueBall();

            switchPlayer();

            return;
        }

        /*
         * Pocketing a legal ball
         * keeps the player's turn.
         */
        const legalPocket =
            state.ballsPocketedThisShot.some(
                number =>
                    number >= 1 &&
                    number <= 9
            );

        if (!legalPocket) {
            switchPlayer();
        } else {
            updateTurnUI();
        }

        setAIStatus("READY");

        updateAimLine();

        scheduleAIIfNeeded();
    }

    /* =====================================================
       8-BALL
    ===================================================== */

    function finish8BallShot() {
        const eightPocketed =
            state.ballsPocketedThisShot
                .includes(8);

        /*
         * Handle 8-Ball first.
         */
        if (eightPocketed) {
            const groupFinished =
                playerHasFinishedGroup(
                    state.currentPlayer
                );

            const legalEight =
                !state.foulThisShot &&
                !!state.playerGroups[
                    state.currentPlayer
                ] &&
                groupFinished;

            if (legalEight) {
                endGame(
                    `PLAYER ${state.currentPlayer} WINS`
                );
            } else {
                endGame(
                    `PLAYER ${otherPlayer(
                        state.currentPlayer
                    )} WINS`
                );
            }

            return;
        }

        /*
         * Fouls immediately change
         * the turn.
         */
        if (
            state.foulThisShot
        ) {
            showFoulMessage(
                state.foulReason
            );

            respawnCueBall();

            switchPlayer();

            return;
        }

        /*
         * Assign groups from the first
         * legal pocketed object ball.
         */
        assignPlayerGroupIfNeeded();

        const legalPocket =
            getLegalPocketForCurrentPlayer();

        if (!legalPocket) {
            switchPlayer();

            return;
        }

        updateTurnUI();

        setAIStatus("READY");

        updateAimLine();

        scheduleAIIfNeeded();
    }

    function getLegalPocketForCurrentPlayer() {
        const group =
            state.playerGroups[
                state.currentPlayer
            ];

        /*
         * Open table:
         * any solid/stripe pocket is legal.
         */
        if (!group) {
            return state.ballsPocketedThisShot.some(
                number =>
                    number >= 1 &&
                    number <= 15 &&
                    number !== 8
            );
        }

        /*
         * Assigned table:
         * player must have pocketed
         * at least one of their balls.
         */
        return state.ballsPocketedThisShot.some(
            number => {
                const ball =
                    state.balls.find(
                        item =>
                            item.number ===
                            number
                    );

                return (
                    ball &&
                    isGroupBall(
                        ball,
                        group
                    )
                );
            }
        );
    }

    /* =====================================================
       GROUP ASSIGNMENT
    ===================================================== */

    function assignPlayerGroupIfNeeded() {
        if (
            state.gameType !== "8ball"
        ) {
            return;
        }

        if (
            state.playerGroups[1] ||
            state.playerGroups[2]
        ) {
            return;
        }

        const objectPocketed =
            state.ballsPocketedThisShot
                .filter(number =>
                    number >= 1 &&
                    number <= 15 &&
                    number !== 8
                );

        if (
            !objectPocketed.length
        ) {
            return;
        }

        const firstBall =
            state.balls.find(
                ball =>
                    ball.number ===
                    objectPocketed[0]
            );

        if (!firstBall) return;

        const group =
            firstBall.group;

        if (
            group !== "solid" &&
            group !== "stripe"
        ) {
            return;
        }

        state.playerGroups[
            state.currentPlayer
        ] = group;

        state.playerGroups[
            otherPlayer(
                state.currentPlayer
            )
        ] =
            group === "solid"
                ? "stripe"
                : "solid";

        updatePlayerLabels();
    }

    /* =====================================================
       CUE BALL
    ===================================================== */

    function respawnCueBall() {
        if (!state.cueBall) {
            return;
        }

        const bounds =
            getTableBounds();

        state.cueBall.pocketed = false;

        state.cueBall.x =
            CONFIG.tableWidth *
            CONFIG.cueStartX;

        state.cueBall.y =
            CONFIG.tableHeight / 2;

        state.cueBall.vx = 0;
        state.cueBall.vy = 0;

        for (
            let i = 0;
            i < 100;
            i++
        ) {
            const occupied =
                state.balls.some(ball => {
                    if (
                        ball ===
                        state.cueBall ||
                        ball.pocketed
                    ) {
                        return false;
                    }

                    return (
                        distance(
                            state.cueBall.x,
                            state.cueBall.y,
                            ball.x,
                            ball.y
                        ) <
                        state.cueBall.radius +
                        ball.radius +
                        4
                    );
                });

            if (!occupied) {
                break;
            }

            state.cueBall.y =
                random(
                    bounds.top + 20,
                    bounds.bottom - 20
                );
        }

        renderBalls();
    }

    /* =====================================================
       TURN MANAGEMENT
    ===================================================== */

    function switchPlayer() {
        state.currentPlayer =
            otherPlayer(
                state.currentPlayer
            );

        state.ballsPocketedThisShot = [];
        state.scratchThisShot = false;
        state.firstBallHit = null;
        state.foulThisShot = false;
        state.foulReason = "";

        updateTurnUI();

        setAIStatus("READY");

        updateAimLine();

        scheduleAIIfNeeded();
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

        updateTimerDisplay();
    }

    /* =====================================================
       FOUL MESSAGE
    ===================================================== */

    function showFoulMessage(reason) {
        const messageMap = {
            "SCRATCH":
                "FOUL — SCRATCH",

            "NO BALL CONTACT":
                "FOUL — NO BALL CONTACT",

            "WRONG FIRST BALL":
                "FOUL — WRONG FIRST BALL",

            "WRONG GROUP":
                "FOUL — WRONG GROUP",

            "EARLY 8-BALL":
                "FOUL — EARLY 8-BALL"
        };

        const message =
            messageMap[reason] ||
            "FOUL";

        setAIStatus(message);

        if (turnStatus) {
            turnStatus.textContent =
                message;
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

        clearTimeout(
            state.aiTimeout
        );

        setAIStatus(
            "AI THINKING"
        );

        const level =
            clamp(
                Number(state.aiLevel) ||
                1,
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
            state.shotInProgress ||
            !isAITurn()
        ) {
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
            setPower(
                random(35, 65)
            );

            changeAimAI(
                random(
                    -Math.PI,
                    Math.PI
                )
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
                Number(state.aiLevel) ||
                1,
                1,
                5
            );

        /*
         * Higher level = lower
         * aim error.
         */
        const accuracy =
            Math.max(
                0.008,
                0.20 -
                level * 0.038
            );

        /*
         * Higher levels receive
         * better power control.
         */
        angle +=
            random(
                -accuracy,
                accuracy
            );

        changeAimAI(angle);

        const targetDistance =
            distance(
                state.cueBall.x,
                state.cueBall.y,
                target.x,
                target.y
            );

        let basePower =
            32 +
            targetDistance / 8;

        if (level >= 4) {
            basePower -= 4;
        }

        if (level === 5) {
            basePower -= 7;
        }

        basePower =
            clamp(
                basePower,
                25,
                88
            );

        const variation =
            level >= 4
                ? 4
                : 9;

        setPower(
            clamp(
                basePower +
                random(
                    -variation,
                    variation
                ),
                20,
                100
            )
        );

        shoot();
    }

    function chooseAITarget() {
        const targets =
            getLegalTargets(
                state.currentPlayer
            );

        if (!targets.length) {
            return null;
        }

        /*
         * 9-Ball must target
         * lowest remaining ball.
         */
        if (
            state.gameType === "9ball"
        ) {
            return targets[0];
        }

        /*
         * Higher AI levels favor
         * shorter/easier shots.
         */
        const cue =
            state.cueBall;

        const ranked =
            targets
                .map(ball => {
                    const d =
                        distance(
                            cue.x,
                            cue.y,
                            ball.x,
                            ball.y
                        );

                    const pocketBonus =
                        nearestPocketDistance(
                            ball
                        );

                    return {
                        ball,
                        score:
                            d +
                            pocketBonus *
                            0.35
                    };
                })
                .sort(
                    (a, b) =>
                        a.score -
                        b.score
                );

        return ranked[0].ball;
    }

    function nearestPocketDistance(ball) {
        const pockets =
            getPockets();

        let best = Infinity;

        pockets.forEach(pocket => {
            const d =
                distance(
                    ball.x,
                    ball.y,
                    pocket.x,
                    pocket.y
                );

            if (d < best) {
                best = d;
            }
        });

        return best;
    }

    function changeAimAI(angle) {
        state.aimAngle = angle;

        updateAimLine();
    }

    function setAIStatus(message) {
        if (aiStatus) {
            aiStatus.textContent =
                message;
        }
    }

    /* =====================================================
       PLAYER LABELS
    ===================================================== */

    function updatePlayerLabels() {
        const group1 =
            state.playerGroups[1];

        const group2 =
            state.playerGroups[2];

        updatePlayerGroupElement(
            player1,
            group1,
            "READY"
        );

        updatePlayerGroupElement(
            player2,
            group2,
            "WAITING"
        );
    }

    function updatePlayerGroupElement(
        playerElement,
        group,
        fallback
    ) {
        if (!playerElement) {
            return;
        }

        const status =
            playerElement.querySelector(
                ".player-status"
            );

        if (!status) {
            return;
        }

        status.textContent =
            group
                ? group.toUpperCase()
                : fallback;
    }

    /* =====================================================
       STATS
    ===================================================== */

    function updateStats() {
        if (statGame) {
            statGame.textContent =
                String(
                    state.gameType
                )
                    .toUpperCase()
                    .replace(
                        "8BALL",
                        "8-BALL"
                    )
                    .replace(
                        "9BALL",
                        "9-BALL"
                    );
        }

        if (statMode) {
            const names = {
                pvp: "PVP",
                pvai: "PVAI",
                aivai: "AI VS AI",
                challenge: "CHALLENGE"
            };

            statMode.textContent =
                names[
                    state.mode
                ] ||
                String(
                    state.mode
                ).toUpperCase();
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
                names[
                    state.aiLevel
                ] ||
                "START-UP";
        }

        updateShotCount();
    }

    function updateShotCount() {
        if (shotCount) {
            shotCount.textContent =
                String(
                    state.shotNumber
                );
        }
    }

    function updateChallengeScore() {
        if (challengeScore) {
            challengeScore.textContent =
                String(
                    state.challengePoints
                );
        }
    }

    /* =====================================================
       CHALLENGE
    ===================================================== */

    function updateChallengeUI() {
        if (!challengePanel) {
            return;
        }

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
        if (
            state.timerInterval
        ) {
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

            if (
                state.challengeTime <= 0
            ) {
                endChallenge();

                return;
            }

            return;
        }

        if (
            state.currentPlayer === 1
        ) {
            state.player1Time--;

            if (
                state.player1Time <= 0
            ) {
                endGame(
                    "PLAYER 2 WINS — TIME"
                );

                return;
            }
        } else {
            state.player2Time--;

            if (
                state.player2Time <= 0
            ) {
                endGame(
                    "PLAYER 1 WINS — TIME"
                );

                return;
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
       START / RESET
    ===================================================== */

    function startGame() {
        clearTimeout(
            state.aiTimeout
        );

        state.running = true;
        state.paused = false;
        state.gameOver = false;

        state.currentPlayer = 1;

        state.power = 50;
        state.aimAngle =
            -Math.PI / 2;

        state.shotInProgress = false;
        state.shotNumber = 0;

        state.breakShot = true;

        state.ballsPocketedThisShot = [];
        state.scratchThisShot = false;
        state.firstBallHit = null;

        state.foulThisShot = false;
        state.foulReason = "";

        state.playerGroups = {
            1: null,
            2: null
        };

        state.player1Time =
            CONFIG.playerTime;

        state.player2Time =
            CONFIG.playerTime;

        state.challenge =
            state.mode ===
            "challenge";

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
                Number(
                    poolAILevel.value
                ) || 1;
        }

        createRack();

        setPower(50);

        updateTurnUI();
        updateStats();
        updatePlayerLabels();
        updateChallengeUI();

        setAIStatus("READY");

        hideModal(
            gameOverModal
        );

        if (pauseBtn) {
            pauseBtn.textContent =
                "PAUSE";
        }

        startTimer();

        updateAimLine();

        scheduleAIIfNeeded();
    }

    function resetGame() {
        startGame();
    }

    function newRack() {
        if (state.gameOver) {
            startGame();
            return;
        }

        clearTimeout(
            state.aiTimeout
        );

        state.shotInProgress = false;

        state.ballsPocketedThisShot = [];
        state.scratchThisShot = false;
        state.firstBallHit = null;

        state.foulThisShot = false;
        state.foulReason = "";

        state.breakShot = true;

        createRack();

        setPower(50);

        setAIStatus("READY");

        updateAimLine();

        scheduleAIIfNeeded();
    }

    /* =====================================================
       PAUSE
    ===================================================== */

    function togglePause() {
        if (state.gameOver) {
            return;
        }

        state.paused =
            !state.paused;

        if (pauseBtn) {
            pauseBtn.textContent =
                state.paused
                    ? "RESUME"
                    : "PAUSE";
        }

        if (state.paused) {
            clearTimeout(
                state.aiTimeout
            );

            setAIStatus("PAUSED");
        } else {
            setAIStatus("READY");

            scheduleAIIfNeeded();
        }

        updateAimLine();
    }

    /* =====================================================
       GAME OVER
    ===================================================== */

    function endGame(message) {
        state.gameOver = true;
        state.running = false;
        state.shotInProgress = false;

        stopTimer();

        clearTimeout(
            state.aiTimeout
        );

        setAIStatus("GAME OVER");

        if (finalScore) {
            finalScore.textContent =
                message;
        }

        showModal(
            gameOverModal
        );

        updateAimLine();
    }

    function endChallenge() {
        state.gameOver = true;
        state.running = false;

        stopTimer();

        clearTimeout(
            state.aiTimeout
        );

        setAIStatus(
            "CHALLENGE COMPLETE"
        );

        if (finalScore) {
            finalScore.textContent =
                `SCORE: ${state.challengePoints}`;
        }

        showModal(
            gameOverModal
        );

        updateAimLine();
    }

    /* =====================================================
       MODALS
    ===================================================== */

    function showModal(modal) {
        if (!modal) return;

        modal.classList.remove(
            "hidden"
        );
    }

    function hideModal(modal) {
        if (!modal) return;

        modal.classList.add(
            "hidden"
        );
    }

    function showRules() {
        showModal(
            rulesModal
        );
    }

    function hideRules() {
        hideModal(
            rulesModal
        );
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
                typeof
                    window.ROLyfeAudio.play ===
                    "function"
            ) {
                window.ROLyfeAudio.play(
                    type
                );

                return;
            }

            if (
                window.AudioEngine &&
                typeof
                    window.AudioEngine.play ===
                    "function"
            ) {
                window.AudioEngine.play(
                    type
                );
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
            if (
                !document.fullscreenElement
            ) {
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
            /* Optional feature. */
        }
    }

    /* =====================================================
       POINTER COORDINATES
       -----------------------------------------------------
       V3.3 IMPORTANT FIX:
       Input is calculated against the actual
       .table-surface instead of the outer pool table.
    ===================================================== */

    function getPointerPosition(event) {
        if (!tableSurface) {
            return null;
        }

        const rect =
            tableSurface.getBoundingClientRect();

        let clientX;
        let clientY;

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

        const x =
            clamp(
                (
                    (clientX -
                        rect.left) /
                    rect.width
                ) *
                CONFIG.tableWidth,
                0,
                CONFIG.tableWidth
            );

        const y =
            clamp(
                (
                    (clientY -
                        rect.top) /
                    rect.height
                ) *
                CONFIG.tableHeight,
                0,
                CONFIG.tableHeight
            );

        return { x, y };
    }

    function aimAtPointer(event) {
        if (
            !state.cueBall ||
            state.shotInProgress ||
            state.paused ||
            state.gameOver ||
            isAITurn()
        ) {
            return;
        }

        const point =
            getPointerPosition(event);

        if (!point) {
            return;
        }

        state.aimAngle =
            Math.atan2(
                point.y -
                    state.cueBall.y,
                point.x -
                    state.cueBall.x
            );

        updateAimLine();
    }

    function pointerDistanceFromCue(event) {
        const point =
            getPointerPosition(event);

        if (
            !point ||
            !state.cueBall
        ) {
            return Infinity;
        }

        return distance(
            point.x,
            point.y,
            state.cueBall.x,
            state.cueBall.y
        );
    }

    function startPointerAim(event) {
        if (
            state.shotInProgress ||
            state.paused ||
            state.gameOver ||
            isAITurn()
        ) {
            return;
        }

        if (
            pointerDistanceFromCue(
                event
            ) >
            CONFIG.ballRadius * 8
        ) {
            return;
        }

        state.aimingPointer = true;

        if (
            event.pointerId !== undefined
        ) {
            state.pointerId =
                event.pointerId;

            try {
                tableSurface.setPointerCapture(
                    event.pointerId
                );
            } catch (error) {}
        }

        aimAtPointer(event);

        event.preventDefault();
    }

    function movePointerAim(event) {
        if (
            !state.aimingPointer
        ) {
            return;
        }

        aimAtPointer(event);

        event.preventDefault();
    }

    function endPointerAim(event) {
        if (
            !state.aimingPointer
        ) {
            return;
        }

        state.aimingPointer = false;

        if (
            state.pointerId !== null
        ) {
            try {
                tableSurface.releasePointerCapture(
                    state.pointerId
                );
            } catch (error) {}
        }

        state.pointerId = null;

        if (
            !state.paused &&
            !state.gameOver &&
            !state.shotInProgress
        ) {
            shoot();
        }

        if (event) {
            event.preventDefault();
        }
    }

    /* =====================================================
       KEYBOARD
    ===================================================== */

    function handleKeyDown(event) {
        if (event.repeat) {
            return;
        }

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
                hideModal(
                    gameOverModal
                );
                break;
        }
    }

    /* =====================================================
       THEME
    ===================================================== */

    function handleThemeChange() {
        if (!poolTheme) {
            return;
        }

        const theme =
            poolTheme.value;

        try {
            if (
                window.ROLYFE_POOL_THEME &&
                typeof
                    window.ROLYFE_POOL_THEME
                        .change ===
                    "function"
            ) {
                window.ROLYFE_POOL_THEME.change(
                    theme
                );

                return;
            }

            if (
                window.ROLYFE_POOL_THEME &&
                typeof
                    window.ROLYFE_POOL_THEME
                        .apply ===
                    "function"
            ) {
                window.ROLYFE_POOL_THEME.apply(
                    theme
                );

                return;
            }

            if (
                window.ROLYFE_POOL_THEMES &&
                typeof
                    window.ROLYFE_POOL_THEMES
                        .applyTheme ===
                    "function"
            ) {
                window.ROLYFE_POOL_THEMES.applyTheme(
                    theme
                );
            }
        } catch (error) {
            /* Theme system optional. */
        }
    }

    /* =====================================================
       EVENTS
    ===================================================== */

    function bindEvents() {
        powerDown?.addEventListener(
            "click",
            () =>
                adjustPower(-5)
        );

        powerUp?.addEventListener(
            "click",
            () =>
                adjustPower(5)
        );

        aimLeft?.addEventListener(
            "click",
            () =>
                changeAim(-1)
        );

        aimRight?.addEventListener(
            "click",
            () =>
                changeAim(1)
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

        /*
         * V3.3 pointer controls.
         * The listener is attached to the
         * actual cloth surface.
         */
        if (tableSurface) {
            tableSurface.addEventListener(
                "pointerdown",
                startPointerAim,
                { passive: false }
            );

            tableSurface.addEventListener(
                "pointermove",
                movePointerAim,
                { passive: false }
            );

            tableSurface.addEventListener(
                "pointerup",
                endPointerAim,
                { passive: false }
            );

            tableSurface.addEventListener(
                "pointercancel",
                endPointerAim,
                { passive: false }
            );
        }
    }

    /* =====================================================
       SETTINGS
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
                Number(
                    poolAILevel.value
                ) || 1;
        }

        updateStats();

        scheduleAIIfNeeded();
    }

    /* =====================================================
       RESPONSIVE TABLE
    ===================================================== */

    function updateTableScale() {
        if (!poolTable) {
            return;
        }

        poolTable.style.aspectRatio =
            `${CONFIG.tableWidth} / ${CONFIG.tableHeight}`;
    }

    /* =====================================================
       GAME LOOP
    ===================================================== */

    function gameLoop(timestamp) {
        if (!state.lastFrame) {
            state.lastFrame =
                timestamp;
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
       PUBLIC API
    ===================================================== */

    window.ROLYFE_POOL = {
        version: "3.3",

        start: startGame,

        reset: resetGame,

        newRack,

        shoot,

        pause: togglePause,

        setPower,

        changeAim,

        getState: () => ({
            version:
                state.version,

            running:
                state.running,

            paused:
                state.paused,

            gameOver:
                state.gameOver,

            gameType:
                state.gameType,

            mode:
                state.mode,

            aiLevel:
                state.aiLevel,

            currentPlayer:
                state.currentPlayer,

            power:
                state.power,

            aimAngle:
                state.aimAngle,

            shotNumber:
                state.shotNumber,

            breakShot:
                state.breakShot,

            firstBallHit:
                state.firstBallHit,

            foulThisShot:
                state.foulThisShot,

            foulReason:
                state.foulReason,

            playerGroups: {
                ...state.playerGroups
            },

            challengePoints:
                state.challengePoints
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
            Number(
                poolAILevel.value
            ) || 1;
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

    console.log(
        "🎱 RO'Lyfe Pool™ V3.3 Loaded"
    );

    console.log(
        "🎯 Rule + Control Engine Online"
    );

})();
