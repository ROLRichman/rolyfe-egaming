/* =========================================================
   RO’Lyfe Gaming™
   Shared Physics Engine
   Version 1.0

   Designed for:
   🎱 Pool
   🎱 8-Ball
   🎱 9-Ball
   🎱 Practice
   🎱 Challenge Mode
   🚀 Future physics-based games

   No external libraries required.
========================================================= */

(function (global) {

    "use strict";

    /* =====================================================
       VECTOR
    ===================================================== */

    class Vector2 {

        constructor(x = 0, y = 0) {
            this.x = x;
            this.y = y;
        }

        add(v) {
            return new Vector2(
                this.x + v.x,
                this.y + v.y
            );
        }

        subtract(v) {
            return new Vector2(
                this.x - v.x,
                this.y - v.y
            );
        }

        multiply(value) {
            return new Vector2(
                this.x * value,
                this.y * value
            );
        }

        divide(value) {
            if (value === 0) {
                return new Vector2(0, 0);
            }

            return new Vector2(
                this.x / value,
                this.y / value
            );
        }

        magnitude() {
            return Math.sqrt(
                this.x * this.x +
                this.y * this.y
            );
        }

        magnitudeSquared() {
            return (
                this.x * this.x +
                this.y * this.y
            );
        }

        normalize() {

            const magnitude = this.magnitude();

            if (magnitude === 0) {
                return new Vector2(0, 0);
            }

            return this.divide(magnitude);
        }

        dot(v) {
            return (
                this.x * v.x +
                this.y * v.y
            );
        }

        distanceTo(v) {
            return this.subtract(v).magnitude();
        }

        clone() {
            return new Vector2(
                this.x,
                this.y
            );
        }

        set(x, y) {
            this.x = x;
            this.y = y;
            return this;
        }
    }


    /* =====================================================
       BALL
    ===================================================== */

    class PoolBall {

        constructor(options = {}) {

            this.id =
                options.id ??
                0;

            this.number =
                options.number ??
                0;

            this.type =
                options.type ??
                "object";

            this.position =
                options.position instanceof Vector2
                    ? options.position.clone()
                    : new Vector2(
                        options.x ?? 0,
                        options.y ?? 0
                    );

            this.velocity =
                options.velocity instanceof Vector2
                    ? options.velocity.clone()
                    : new Vector2(0, 0);

            this.radius =
                options.radius ??
                10;

            this.mass =
                options.mass ??
                1;

            this.active =
                options.active !== false;

            this.pocketed =
                options.pocketed === true;

            this.friction =
                options.friction ??
                0.985;

            this.restitution =
                options.restitution ??
                0.96;

            this.color =
                options.color ??
                "#ffffff";

            this.group =
                options.group ??
                null;

            this.rotation =
                options.rotation ??
                0;

            this.spin =
                options.spin ??
                new Vector2(0, 0);
        }


        isMoving(threshold = 0.05) {

            return this.velocity.magnitude() > threshold;
        }


        stop() {

            this.velocity.set(0, 0);

        }


        applyImpulse(force) {

            if (!this.active || this.pocketed) {
                return;
            }

            const impulse =
                force instanceof Vector2
                    ? force
                    : new Vector2(
                        force.x || 0,
                        force.y || 0
                    );

            this.velocity =
                this.velocity.add(
                    impulse.divide(this.mass)
                );
        }


        update(dt, friction = this.friction) {

            if (!this.active || this.pocketed) {
                return;
            }

            this.position.x +=
                this.velocity.x * dt;

            this.position.y +=
                this.velocity.y * dt;

            const frictionFactor =
                Math.pow(
                    friction,
                    dt * 60
                );

            this.velocity.x *=
                frictionFactor;

            this.velocity.y *=
                frictionFactor;

            if (
                Math.abs(this.velocity.x) < 0.01
            ) {
                this.velocity.x = 0;
            }

            if (
                Math.abs(this.velocity.y) < 0.01
            ) {
                this.velocity.y = 0;
            }
        }
    }


    /* =====================================================
       TABLE
    ===================================================== */

    class PoolTable {

        constructor(options = {}) {

            this.width =
                options.width ??
                1000;

            this.height =
                options.height ??
                500;

            this.ballRadius =
                options.ballRadius ??
                12;

            this.pocketRadius =
                options.pocketRadius ??
                25;

            this.cushionRestitution =
                options.cushionRestitution ??
                0.88;

            this.pockets =
                options.pockets ??
                this.createStandardPockets();
        }


        createStandardPockets() {

            const w = this.width;
            const h = this.height;

            return [

                new Vector2(0, 0),

                new Vector2(w / 2, 0),

                new Vector2(w, 0),

                new Vector2(0, h),

                new Vector2(w / 2, h),

                new Vector2(w, h)

            ];
        }


        isInsideTable(ball) {

            return (
                ball.position.x >= ball.radius &&
                ball.position.x <=
                    this.width - ball.radius &&
                ball.position.y >= ball.radius &&
                ball.position.y <=
                    this.height - ball.radius
            );
        }
    }


    /* =====================================================
       PHYSICS ENGINE
    ===================================================== */

    class PhysicsEngine {

        constructor(options = {}) {

            this.table =
                options.table ??
                new PoolTable(options);

            this.balls = [];

            this.running = false;

            this.lastTime = null;

            this.friction =
                options.friction ??
                0.985;

            this.airResistance =
                options.airResistance ??
                0.999;

            this.subSteps =
                options.subSteps ??
                4;

            this.speedLimit =
                options.speedLimit ??
                3000;

            this.collisionRestitution =
                options.collisionRestitution ??
                0.96;

            this.onPocket =
                options.onPocket ??
                null;

            this.onCollision =
                options.onCollision ??
                null;

            this.onUpdate =
                options.onUpdate ??
                null;

            this.onStop =
                options.onStop ??
                null;
        }


        /* =================================================
           BALL MANAGEMENT
        ================================================= */

        addBall(ball) {

            if (!(ball instanceof PoolBall)) {

                ball =
                    new PoolBall(ball);

            }

            this.balls.push(ball);

            return ball;
        }


        removeBall(id) {

            this.balls =
                this.balls.filter(
                    ball => ball.id !== id
                );
        }


        getBall(id) {

            return this.balls.find(
                ball => ball.id === id
            );
        }


        clearBalls() {

            this.balls = [];

        }


        reset() {

            this.balls.forEach(ball => {

                ball.velocity.set(0, 0);

                ball.pocketed = false;

                ball.active = true;

            });

        }


        /* =================================================
           SHOOT
        ================================================= */

        shootBall(
            ball,
            angle,
            power
        ) {

            if (
                typeof ball === "number"
            ) {
                ball =
                    this.getBall(ball);
            }

            if (!ball || ball.pocketed) {
                return false;
            }

            const direction =
                new Vector2(
                    Math.cos(angle),
                    Math.sin(angle)
                );

            const strength =
                Math.max(
                    0,
                    Math.min(
                        power,
                        this.speedLimit
                    )
                );

            ball.velocity =
                direction.multiply(strength);

            return true;
        }


        shoot(
            ball,
            angle,
            power
        ) {

            return this.shootBall(
                ball,
                angle,
                power
            );
        }


        /* =================================================
           MAIN UPDATE
        ================================================= */

        update(dt) {

            if (!dt || dt <= 0) {
                return;
            }

            const step =
                dt / this.subSteps;

            for (
                let i = 0;
                i < this.subSteps;
                i++
            ) {

                this.updatePositions(step);

                this.resolveBallCollisions();

                this.resolveCushions();

                this.checkPockets();

            }

            this.applyGlobalFriction();

            this.limitSpeeds();

            if (typeof this.onUpdate === "function") {

                this.onUpdate(
                    this.balls,
                    this
                );

            }

            if (!this.areBallsMoving()) {

                if (this.running) {

                    this.running = false;

                    if (
                        typeof this.onStop ===
                        "function"
                    ) {

                        this.onStop(
                            this.balls,
                            this
                        );

                    }
                }
            }
        }


        updatePositions(dt) {

            this.balls.forEach(ball => {

                ball.update(
                    dt,
                    this.friction
                );

            });
        }


        /* =================================================
           BALL COLLISIONS
        ================================================= */

        resolveBallCollisions() {

            for (
                let i = 0;
                i < this.balls.length;
                i++
            ) {

                const a =
                    this.balls[i];

                if (
                    !a.active ||
                    a.pocketed
                ) {
                    continue;
                }

                for (
                    let j = i + 1;
                    j < this.balls.length;
                    j++
                ) {

                    const b =
                        this.balls[j];

                    if (
                        !b.active ||
                        b.pocketed
                    ) {
                        continue;
                    }

                    this.resolveCollision(
                        a,
                        b
                    );
                }
            }
        }


        resolveCollision(a, b) {

            const difference =
                b.position.subtract(
                    a.position
                );

            const distance =
                difference.magnitude();

            const minimumDistance =
                a.radius +
                b.radius;

            if (
                distance === 0 ||
                distance >= minimumDistance
            ) {
                return;
            }

            const normal =
                difference.normalize();

            const overlap =
                minimumDistance -
                distance;

            /* =============================================
               SEPARATE BALLS
            ============================================= */

            const correction =
                normal.multiply(
                    overlap / 2
                );

            a.position =
                a.position.subtract(
                    correction
                );

            b.position =
                b.position.add(
                    correction
                );


            /* =============================================
               RELATIVE VELOCITY
            ============================================= */

            const relativeVelocity =
                b.velocity.subtract(
                    a.velocity
                );

            const velocityAlongNormal =
                relativeVelocity.dot(
                    normal
                );

            if (
                velocityAlongNormal > 0
            ) {
                return;
            }


            /* =============================================
               IMPULSE
            ============================================= */

            const restitution =
                Math.min(
                    a.restitution,
                    b.restitution,
                    this.collisionRestitution
                );

            const impulseMagnitude =
                -(
                    1 + restitution
                ) *
                velocityAlongNormal /
                (
                    1 / a.mass +
                    1 / b.mass
                );

            const impulse =
                normal.multiply(
                    impulseMagnitude
                );

            a.velocity =
                a.velocity.subtract(
                    impulse.divide(a.mass)
                );

            b.velocity =
                b.velocity.add(
                    impulse.divide(b.mass)
                );


            if (
                typeof this.onCollision ===
                "function"
            ) {

                this.onCollision(
                    a,
                    b,
                    this
                );

            }
        }


        /* =================================================
           CUSHION COLLISIONS
        ================================================= */

        resolveCushions() {

            const table =
                this.table;

            this.balls.forEach(ball => {

                if (
                    !ball.active ||
                    ball.pocketed
                ) {
                    return;
                }


                /* LEFT */

                if (
                    ball.position.x -
                    ball.radius < 0
                ) {

                    ball.position.x =
                        ball.radius;

                    ball.velocity.x =
                        Math.abs(
                            ball.velocity.x
                        ) *
                        table.cushionRestitution;
                }


                /* RIGHT */

                if (
                    ball.position.x +
                    ball.radius >
                    table.width
                ) {

                    ball.position.x =
                        table.width -
                        ball.radius;

                    ball.velocity.x =
                        -Math.abs(
                            ball.velocity.x
                        ) *
                        table.cushionRestitution;
                }


                /* TOP */

                if (
                    ball.position.y -
                    ball.radius < 0
                ) {

                    ball.position.y =
                        ball.radius;

                    ball.velocity.y =
                        Math.abs(
                            ball.velocity.y
                        ) *
                        table.cushionRestitution;
                }


                /* BOTTOM */

                if (
                    ball.position.y +
                    ball.radius >
                    table.height
                ) {

                    ball.position.y =
                        table.height -
                        ball.radius;

                    ball.velocity.y =
                        -Math.abs(
                            ball.velocity.y
                        ) *
                        table.cushionRestitution;
                }

            });
        }


        /* =================================================
           POCKET DETECTION
        ================================================= */

        checkPockets() {

            this.balls.forEach(ball => {

                if (
                    !ball.active ||
                    ball.pocketed
                ) {
                    return;
                }

                for (
                    let i = 0;
                    i < this.table.pockets.length;
                    i++
                ) {

                    const pocket =
                        this.table.pockets[i];

                    const distance =
                        ball.position.distanceTo(
                            pocket
                        );

                    if (
                        distance <=
                        this.table.pocketRadius
                    ) {

                        this.pocketBall(
                            ball,
                            i
                        );

                        break;
                    }
                }
            });
        }


        pocketBall(ball, pocketIndex) {

            ball.pocketed = true;

            ball.active = false;

            ball.velocity.set(0, 0);

            if (
                typeof this.onPocket ===
                "function"
            ) {

                this.onPocket(
                    ball,
                    pocketIndex,
                    this
                );

            }
        }


        /* =================================================
           FRICTION
        ================================================= */

        applyGlobalFriction() {

            this.balls.forEach(ball => {

                if (
                    !ball.active ||
                    ball.pocketed
                ) {
                    return;
                }

                ball.velocity.x *=
                    this.airResistance;

                ball.velocity.y *=
                    this.airResistance;


                if (
                    Math.abs(
                        ball.velocity.x
                    ) < 0.02
                ) {

                    ball.velocity.x = 0;

                }


                if (
                    Math.abs(
                        ball.velocity.y
                    ) < 0.02
                ) {

                    ball.velocity.y = 0;

                }

            });
        }


        /* =================================================
           SPEED LIMIT
        ================================================= */

        limitSpeeds() {

            this.balls.forEach(ball => {

                const speed =
                    ball.velocity.magnitude();

                if (
                    speed >
                    this.speedLimit
                ) {

                    ball.velocity =
                        ball.velocity
                            .normalize()
                            .multiply(
                                this.speedLimit
                            );
                }

            });
        }


        /* =================================================
           GAME STATE
        ================================================= */

        areBallsMoving(
            threshold = 0.05
        ) {

            return this.balls.some(
                ball =>
                    ball.active &&
                    !ball.pocketed &&
                    ball.velocity.magnitude() >
                    threshold
            );
        }


        getMovingBalls() {

            return this.balls.filter(
                ball =>
                    ball.active &&
                    !ball.pocketed &&
                    ball.isMoving()
            );
        }


        allBallsStopped() {

            return !this.areBallsMoving();

        }


        start() {

            this.running = true;

            this.lastTime =
                performance.now();

            this.loop();

        }


        stop() {

            this.running = false;

        }


        loop() {

            if (!this.running) {
                return;
            }

            const now =
                performance.now();

            let dt =
                (now -
                    this.lastTime) /
                1000;

            this.lastTime = now;

            /*
             Prevent giant physics jumps if
             the browser pauses or the tab
             becomes inactive.
            */

            dt =
                Math.min(
                    dt,
                    0.05
                );

            this.update(dt);

            requestAnimationFrame(
                () => this.loop()
            );
        }
    }


    /* =====================================================
       UTILITY FUNCTIONS
    ===================================================== */

    function degreesToRadians(degrees) {

        return degrees *
            Math.PI /
            180;

    }


    function radiansToDegrees(radians) {

        return radians *
            180 /
            Math.PI;

    }


    function clamp(
        value,
        min,
        max
    ) {

        return Math.max(
            min,
            Math.min(
                max,
                value
            )
        );

    }


    function distance(
        x1,
        y1,
        x2,
        y2
    ) {

        const dx =
            x2 - x1;

        const dy =
            y2 - y1;

        return Math.sqrt(
            dx * dx +
            dy * dy
        );

    }


    /* =====================================================
       RO’LYFE PUBLIC API
    ===================================================== */

    const ROLyfePhysics = {

        Vector2,

        PoolBall,

        PoolTable,

        PhysicsEngine,

        degreesToRadians,

        radiansToDegrees,

        clamp,

        distance,

        version: "1.0.0",

        brand: "RO’Lyfe Gaming™"
    };


    /* =====================================================
       GLOBAL EXPORT
    ===================================================== */

    global.ROLyfePhysics =
        ROLyfePhysics;


    /*
       Compatibility aliases.
       These make it easier for future RO’Lyfe games
       to use the same engine.
    */

    global.PhysicsEngine =
        PhysicsEngine;

    global.PoolBall =
        PoolBall;

    global.PoolTable =
        PoolTable;

    global.Vector2 =
        Vector2;


    console.log(
        "🎱 RO’Lyfe Physics Engine v1.0 loaded."
    );

})(window);
