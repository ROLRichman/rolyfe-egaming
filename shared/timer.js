/* ============================================================
   RO'LYFE GAMING™ — SHARED TIMER ENGINE V1.0
   File: shared/timer.js

   PURPOSE
   ------------------------------------------------------------
   One reusable timer system for every RO'Lyfe game.

   Supports:
   • Count-up timers
   • Countdown timers
   • Per-player clocks
   • Turn timers
   • Game timers
   • Pause / resume
   • Reset
   • Start / stop
   • Time expiration
   • Warning threshold
   • Critical threshold
   • Callback events
   • Multiple independent timer instances
   • Accurate elapsed-time calculation
   • Visibility/background-tab protection

   ARCHITECTURE
   ------------------------------------------------------------
   Games create their own timer instance:

       const timer = ROLyfeTimer.create({
           duration: 600
       });

   Then:

       timer.start();
       timer.pause();
       timer.resume();
       timer.reset();

   The timer does NOT contain game rules.
   The game decides what happens when time expires.

   ============================================================ */

(function (global) {
    "use strict";


    /* --------------------------------------------------------
       CONFIGURATION
       -------------------------------------------------------- */

    const CONFIG = {
        defaultDuration: 600,
        defaultWarning: 60,
        defaultCritical: 10,

        tickInterval: 100,

        minimumDuration: 0,

        maxDelta: 1000
    };


    /* --------------------------------------------------------
       INTERNAL TIMER ID
       -------------------------------------------------------- */

    let nextTimerId = 1;


    /* --------------------------------------------------------
       UTILITY
       -------------------------------------------------------- */

    function clamp(value, min, max) {
        return Math.max(
            min,
            Math.min(max, value)
        );
    }


    function toNumber(value, fallback) {
        const number = Number(value);

        return Number.isFinite(number)
            ? number
            : fallback;
    }


    function now() {
        return performance.now();
    }


    /* --------------------------------------------------------
       TIMER CLASS
       -------------------------------------------------------- */

    class Timer {

        constructor(options) {

            options = options || {};

            this.id = nextTimerId++;

            /* ------------------------------------------------
               MODE
               ------------------------------------------------ */

            this.mode =
                options.mode === "countup"
                    ? "countup"
                    : "countdown";


            /* ------------------------------------------------
               DURATION
               ------------------------------------------------ */

            this.duration =
                Math.max(
                    CONFIG.minimumDuration,
                    toNumber(
                        options.duration,
                        CONFIG.defaultDuration
                    )
                );


            /* ------------------------------------------------
               WARNING / CRITICAL
               ------------------------------------------------ */

            this.warningThreshold =
                Math.max(
                    0,
                    toNumber(
                        options.warning,
                        CONFIG.defaultWarning
                    )
                );


            this.criticalThreshold =
                Math.max(
                    0,
                    toNumber(
                        options.critical,
                        CONFIG.defaultCritical
                    )
                );


            /* ------------------------------------------------
               STATE
               ------------------------------------------------ */

            this.state = "idle";

            this.elapsed = 0;

            this.remaining =
                this.mode === "countdown"
                    ? this.duration
                    : 0;

            this.lastTimestamp = null;

            this.frameId = null;

            this.warningTriggered = false;

            this.criticalTriggered = false;

            this.expiredTriggered = false;


            /* ------------------------------------------------
               CALLBACKS
               ------------------------------------------------ */

            this.callbacks = {
                start: [],
                tick: [],
                pause: [],
                resume: [],
                stop: [],
                reset: [],
                warning: [],
                critical: [],
                expire: [],
                complete: []
            };


            /* ------------------------------------------------
               OPTIONAL CALLBACKS FROM OPTIONS
               ------------------------------------------------ */

            if (typeof options.onStart === "function") {
                this.on("start", options.onStart);
            }

            if (typeof options.onTick === "function") {
                this.on("tick", options.onTick);
            }

            if (typeof options.onPause === "function") {
                this.on("pause", options.onPause);
            }

            if (typeof options.onResume === "function") {
                this.on("resume", options.onResume);
            }

            if (typeof options.onStop === "function") {
                this.on("stop", options.onStop);
            }

            if (typeof options.onReset === "function") {
                this.on("reset", options.onReset);
            }

            if (typeof options.onWarning === "function") {
                this.on("warning", options.onWarning);
            }

            if (typeof options.onCritical === "function") {
                this.on("critical", options.onCritical);
            }

            if (typeof options.onExpire === "function") {
                this.on("expire", options.onExpire);
            }

            if (typeof options.onComplete === "function") {
                this.on("complete", options.onComplete);
            }
        }


        /* ----------------------------------------------------
           EVENT SYSTEM
           ---------------------------------------------------- */

        on(event, callback) {

            if (
                !this.callbacks[event] ||
                typeof callback !== "function"
            ) {
                return this;
            }

            this.callbacks[event].push(callback);

            return this;
        }


        off(event, callback) {

            if (!this.callbacks[event]) {
                return this;
            }

            if (!callback) {
                this.callbacks[event] = [];
                return this;
            }

            this.callbacks[event] =
                this.callbacks[event].filter(
                    function (fn) {
                        return fn !== callback;
                    }
                );

            return this;
        }


        emit(event, data) {

            const list =
                this.callbacks[event];

            if (!list) {
                return;
            }

            list.slice().forEach(
                function (callback) {

                    try {
                        callback(
                            this.getState(),
                            data
                        );

                    } catch (error) {

                        console.error(
                            "⏱️ RO'Lyfe Timer callback error:",
                            error
                        );
                    }

                }.bind(this)
            );
        }


        /* ----------------------------------------------------
           START
           ---------------------------------------------------- */

        start() {

            if (
                this.state === "running"
            ) {
                return this;
            }


            if (
                this.state === "expired"
            ) {
                return this;
            }


            this.state = "running";

            this.lastTimestamp = now();

            this.emit("start");

            this.schedule();

            return this;
        }


        /* ----------------------------------------------------
           PAUSE
           ---------------------------------------------------- */

        pause() {

            if (
                this.state !== "running"
            ) {
                return this;
            }

            this.update();

            this.state = "paused";

            this.lastTimestamp = null;

            this.cancelFrame();

            this.emit("pause");

            return this;
        }


        /* ----------------------------------------------------
           RESUME
           ---------------------------------------------------- */

        resume() {

            if (
                this.state !== "paused"
            ) {
                return this;
            }

            this.state = "running";

            this.lastTimestamp = now();

            this.emit("resume");

            this.schedule();

            return this;
        }


        /* ----------------------------------------------------
           STOP
           ---------------------------------------------------- */

        stop() {

            if (
                this.state === "idle" ||
                this.state === "stopped"
            ) {
                return this;
            }

            if (
                this.state === "running"
            ) {
                this.update();
            }

            this.cancelFrame();

            this.state = "stopped";

            this.lastTimestamp = null;

            this.emit("stop");

            return this;
        }


        /* ----------------------------------------------------
           RESET
           ---------------------------------------------------- */

        reset(newDuration) {

            this.cancelFrame();

            if (
                newDuration !== undefined
            ) {
                this.duration =
                    Math.max(
                        CONFIG.minimumDuration,
                        toNumber(
                            newDuration,
                            this.duration
                        )
                    );
            }

            this.state = "idle";

            this.elapsed = 0;

            this.remaining =
                this.mode === "countdown"
                    ? this.duration
                    : 0;

            this.lastTimestamp = null;

            this.warningTriggered = false;

            this.criticalTriggered = false;

            this.expiredTriggered = false;

            this.emit("reset");

            return this;
        }


        /* ----------------------------------------------------
           DESTROY
           ---------------------------------------------------- */

        destroy() {

            this.cancelFrame();

            Object.keys(
                this.callbacks
            ).forEach(
                function (event) {
                    this.callbacks[event] = [];
                }.bind(this)
            );

            this.state = "destroyed";

            this.lastTimestamp = null;

            return this;
        }


        /* ----------------------------------------------------
           UPDATE
           ---------------------------------------------------- */

        update(timestamp) {

            if (
                this.state !== "running"
            ) {
                return this;
            }

            const currentTime =
                timestamp !== undefined
                    ? timestamp
                    : now();


            if (
                this.lastTimestamp === null
            ) {
                this.lastTimestamp =
                    currentTime;

                return this;
            }


            let delta =
                currentTime -
                this.lastTimestamp;


            /*
               Prevent a huge jump after the browser tab
               has been suspended or backgrounded.
            */

            delta =
                clamp(
                    delta,
                    0,
                    CONFIG.maxDelta
                );


            this.lastTimestamp =
                currentTime;


            const seconds =
                delta / 1000;


            this.elapsed += seconds;


            if (
                this.mode === "countdown"
            ) {

                this.remaining =
                    Math.max(
                        0,
                        this.duration -
                        this.elapsed
                    );

            } else {

                this.remaining = 0;
            }


            this.checkThresholds();


            this.emit("tick");


            if (
                this.mode === "countdown" &&
                this.remaining <= 0
            ) {

                this.expire();
            }


            return this;
        }


        /* ----------------------------------------------------
           THRESHOLDS
           ---------------------------------------------------- */

        checkThresholds() {

            if (
                this.mode !== "countdown"
            ) {
                return;
            }


            if (
                !this.warningTriggered &&
                this.remaining <=
                    this.warningThreshold &&
                this.remaining > 0
            ) {

                this.warningTriggered = true;

                this.emit("warning");
            }


            if (
                !this.criticalTriggered &&
                this.remaining <=
                    this.criticalThreshold &&
                this.remaining > 0
            ) {

                this.criticalTriggered = true;

                this.emit("critical");
            }
        }


        /* ----------------------------------------------------
           EXPIRE
           ---------------------------------------------------- */

        expire() {

            if (
                this.expiredTriggered
            ) {
                return this;
            }

            this.expiredTriggered = true;

            this.remaining = 0;

            this.cancelFrame();

            this.state = "expired";

            this.lastTimestamp = null;

            this.emit("expire");

            this.emit("complete");

            return this;
        }


        /* ----------------------------------------------------
           FRAME LOOP
           ---------------------------------------------------- */

        schedule() {

            this.cancelFrame();

            if (
                this.state !== "running"
            ) {
                return;
            }

            this.frameId =
                requestAnimationFrame(
                    this.loop.bind(this)
                );
        }


        loop(timestamp) {

            if (
                this.state !== "running"
            ) {
                return;
            }

            this.update(timestamp);

            if (
                this.state === "running"
            ) {
                this.schedule();
            }
        }


        cancelFrame() {

            if (
                this.frameId !== null
            ) {

                cancelAnimationFrame(
                    this.frameId
                );

                this.frameId = null;
            }
        }


        /* ----------------------------------------------------
           TIME SETTERS
           ---------------------------------------------------- */

        setDuration(seconds) {

            seconds =
                Math.max(
                    0,
                    toNumber(
                        seconds,
                        this.duration
                    )
                );

            this.duration = seconds;

            if (
                this.state === "idle" ||
                this.state === "stopped"
            ) {

                this.remaining =
                    this.mode === "countdown"
                        ? seconds
                        : 0;
            }

            return this;
        }


        addTime(seconds) {

            seconds =
                Math.max(
                    0,
                    toNumber(seconds, 0)
                );

            if (
                this.mode === "countdown"
            ) {

                this.duration += seconds;

                this.remaining += seconds;

            } else {

                this.duration += seconds;
            }

            return this;
        }


        subtractTime(seconds) {

            seconds =
                Math.max(
                    0,
                    toNumber(seconds, 0)
                );

            if (
                this.mode === "countdown"
            ) {

                this.duration =
                    Math.max(
                        0,
                        this.duration -
                        seconds
                    );

                this.remaining =
                    Math.max(
                        0,
                        this.remaining -
                        seconds
                    );

            } else {

                this.duration =
                    Math.max(
                        0,
                        this.duration -
                        seconds
                    );
            }

            return this;
        }


        /* ----------------------------------------------------
           MANUAL TIME CONTROL
           ---------------------------------------------------- */

        setRemaining(seconds) {

            if (
                this.mode !== "countdown"
            ) {
                return this;
            }

            seconds =
                Math.max(
                    0,
                    toNumber(
                        seconds,
                        this.remaining
                    )
                );

            this.remaining = seconds;

            this.elapsed =
                Math.max(
                    0,
                    this.duration -
                    this.remaining
                );

            return this;
        }


        setElapsed(seconds) {

            seconds =
                Math.max(
                    0,
                    toNumber(
                        seconds,
                        this.elapsed
                    )
                );

            this.elapsed = seconds;

            if (
                this.mode === "countdown"
            ) {

                this.remaining =
                    Math.max(
                        0,
                        this.duration -
                        this.elapsed
                    );
            }

            return this;
        }


        /* ----------------------------------------------------
           STATE
           ---------------------------------------------------- */

        isRunning() {
            return this.state === "running";
        }


        isPaused() {
            return this.state === "paused";
        }


        isExpired() {
            return this.state === "expired";
        }


        isStopped() {
            return this.state === "stopped";
        }


        isIdle() {
            return this.state === "idle";
        }


        /* ----------------------------------------------------
           GETTERS
           ---------------------------------------------------- */

        getElapsed() {
            if (
                this.state === "running"
            ) {
                this.update();
            }

            return this.elapsed;
        }


        getRemaining() {
            if (
                this.state === "running"
            ) {
                this.update();
            }

            return this.remaining;
        }


        getState() {

            return {
                id: this.id,

                mode: this.mode,

                state: this.state,

                duration: this.duration,

                elapsed: this.elapsed,

                remaining: this.remaining,

                warningThreshold:
                    this.warningThreshold,

                criticalThreshold:
                    this.criticalThreshold,

                warningTriggered:
                    this.warningTriggered,

                criticalTriggered:
                    this.criticalTriggered,

                expired:
                    this.state === "expired"
            };
        }


        /* ----------------------------------------------------
           FORMATTING
           ---------------------------------------------------- */

        format(seconds) {

            seconds =
                Math.max(
                    0,
                    Number(seconds) || 0
                );

            const totalSeconds =
                Math.ceil(seconds);

            const hours =
                Math.floor(
                    totalSeconds / 3600
                );

            const minutes =
                Math.floor(
                    (totalSeconds % 3600) / 60
                );

            const secs =
                totalSeconds % 60;


            if (hours > 0) {

                return (
                    String(hours).padStart(2, "0") +
                    ":" +
                    String(minutes).padStart(2, "0") +
                    ":" +
                    String(secs).padStart(2, "0")
                );
            }


            return (
                String(minutes).padStart(2, "0") +
                ":" +
                String(secs).padStart(2, "0")
            );
        }


        getDisplayTime() {

            return this.format(
                this.mode === "countdown"
                    ? this.getRemaining()
                    : this.getElapsed()
            );
        }
    }


    /* --------------------------------------------------------
       TIMER MANAGER
       -------------------------------------------------------- */

    const timers = new Map();


    function create(options) {

        const timer =
            new Timer(options);

        timers.set(
            timer.id,
            timer
        );

        return timer;
    }


    function get(id) {
        return timers.get(id) || null;
    }


    function remove(id) {

        const timer =
            timers.get(id);

        if (!timer) {
            return false;
        }

        timer.destroy();

        timers.delete(id);

        return true;
    }


    function stopAll() {

        timers.forEach(
            function (timer) {
                if (timer.isRunning()) {
                    timer.stop();
                }
            }
        );
    }


    function pauseAll() {

        timers.forEach(
            function (timer) {
                if (timer.isRunning()) {
                    timer.pause();
                }
            }
        );
    }


    function resumeAll() {

        timers.forEach(
            function (timer) {
                if (timer.isPaused()) {
                    timer.resume();
                }
            }
        );
    }


    function resetAll() {

        timers.forEach(
            function (timer) {
                timer.reset();
            }
        );
    }


    function destroyAll() {

        timers.forEach(
            function (timer) {
                timer.destroy();
            }
        );

        timers.clear();
    }


    function list() {

        return Array.from(
            timers.values()
        ).map(
            function (timer) {
                return timer.getState();
            }
        );
    }


    /* --------------------------------------------------------
       CONVENIENCE FACTORIES
       -------------------------------------------------------- */

    function createCountdown(
        duration,
        options
    ) {

        options =
            Object.assign(
                {},
                options || {},
                {
                    mode: "countdown",
                    duration: duration
                }
            );

        return create(options);
    }


    function createCountup(options) {

        options =
            Object.assign(
                {},
                options || {},
                {
                    mode: "countup"
                }
            );

        return create(options);
    }


    /* --------------------------------------------------------
       PUBLIC API
       -------------------------------------------------------- */

    const ROLyfeTimer = {

        create: create,

        createCountdown:
            createCountdown,

        createCountup:
            createCountup,

        get: get,

        remove: remove,

        stopAll: stopAll,

        pauseAll: pauseAll,

        resumeAll: resumeAll,

        resetAll: resetAll,

        destroyAll: destroyAll,

        list: list,

        version: "1.0",

        config: Object.assign(
            {},
            CONFIG
        )
    };


    /* --------------------------------------------------------
       GLOBAL EXPORT
       -------------------------------------------------------- */

    global.ROLyfeTimer =
        ROLyfeTimer;


    /*
       Compatibility alias.
    */

    global.ROlyfeTimer =
        ROLyfeTimer;


    /* --------------------------------------------------------
       PAGE VISIBILITY SAFETY
       --------------------------------------------------------

       If the browser backgrounds the page, the timer does not
       attempt to count the entire suspension period as one huge
       frame. The update() delta is capped by CONFIG.maxDelta.

       Games can still explicitly pause timers when needed.
       -------------------------------------------------------- */


    if (
        typeof document !== "undefined" &&
        document.addEventListener
    ) {

        document.addEventListener(
            "visibilitychange",
            function () {

                if (
                    document.hidden
                ) {
                    /*
                       Do not automatically pause the game.
                       The game remains responsible for deciding
                       whether backgrounding should pause gameplay.
                    */
                }

            }
        );
    }


    /* --------------------------------------------------------
       READY MESSAGE
       -------------------------------------------------------- */

    console.log(
        "⏱️ RO'Lyfe Timer Engine v1.0 loaded."
    );


})(window);
