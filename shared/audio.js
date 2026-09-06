/* ============================================================
   RO'LYFE GAMING™ — SHARED AUDIO ENGINE V1.0
   File: shared/audio.js

   PURPOSE
   ------------------------------------------------------------
   One shared audio system for every RO'Lyfe game.

   Supports:
   • UI clicks / selections
   • Board-game moves
   • Pool cue strikes
   • Ball collisions
   • Rail hits
   • Pocket sounds
   • Fouls / scratches
   • Turn changes
   • Countdown
   • Win / lose
   • Notifications
   • Mute / unmute
   • Master volume
   • Browser-safe user-gesture activation

   NO EXTERNAL AUDIO FILES REQUIRED.
   Sounds are generated with the Web Audio API.

   ARCHITECTURE
   ------------------------------------------------------------
   Games call:
       ROLyfeAudio.play("click");
       ROLyfeAudio.play("move");
       ROLyfeAudio.play("strike");
       ROLyfeAudio.play("collision");
       ROLyfeAudio.play("rail");
       ROLyfeAudio.play("pocket");
       ROLyfeAudio.play("foul");
       ROLyfeAudio.play("win");
       ROLyfeAudio.play("lose");
       ROLyfeAudio.play("turn");
       ROLyfeAudio.play("countdown");

   The audio engine itself does NOT contain game rules.
   ============================================================ */

(function (global) {
    "use strict";

    /* --------------------------------------------------------
       CONFIGURATION
       -------------------------------------------------------- */

    const CONFIG = {
        defaultVolume: 0.65,
        minVolume: 0,
        maxVolume: 1,

        masterGain: 0.75,

        enabled: true,

        attack: 0.005,
        release: 0.08,

        pool: {
            strike: 0.75,
            collision: 0.45,
            rail: 0.5,
            pocket: 0.65
        }
    };


    /* --------------------------------------------------------
       INTERNAL STATE
       -------------------------------------------------------- */

    let audioContext = null;
    let masterGainNode = null;
    let initialized = false;

    let muted = false;
    let volume = CONFIG.defaultVolume;


    /* --------------------------------------------------------
       AUDIO CONTEXT
       -------------------------------------------------------- */

    function createAudioContext() {
        if (audioContext) {
            return audioContext;
        }

        const AudioContextClass =
            global.AudioContext ||
            global.webkitAudioContext;

        if (!AudioContextClass) {
            console.warn(
                "🎧 RO'Lyfe Audio: Web Audio API unavailable."
            );
            return null;
        }

        try {
            audioContext = new AudioContextClass();

            masterGainNode = audioContext.createGain();

            masterGainNode.gain.value =
                volume * CONFIG.masterGain;

            masterGainNode.connect(audioContext.destination);

            initialized = true;

            return audioContext;

        } catch (error) {
            console.warn(
                "🎧 RO'Lyfe Audio: initialization failed.",
                error
            );

            audioContext = null;
            masterGainNode = null;
            initialized = false;

            return null;
        }
    }


    /* --------------------------------------------------------
       ACTIVATE AUDIO
       -------------------------------------------------------- */

    function ensureReady() {
        const ctx = createAudioContext();

        if (!ctx) {
            return false;
        }

        if (ctx.state === "suspended") {
            ctx.resume().catch(function () {});
        }

        return true;
    }


    /* --------------------------------------------------------
       MASTER VOLUME
       -------------------------------------------------------- */

    function applyVolume() {
        if (!masterGainNode) {
            return;
        }

        const effectiveVolume =
            muted ? 0 : volume * CONFIG.masterGain;

        masterGainNode.gain.setTargetAtTime(
            effectiveVolume,
            audioContext.currentTime,
            0.01
        );
    }


    function setVolume(value) {
        value = Number(value);

        if (!Number.isFinite(value)) {
            return volume;
        }

        volume = Math.max(
            CONFIG.minVolume,
            Math.min(CONFIG.maxVolume, value)
        );

        applyVolume();

        return volume;
    }


    function getVolume() {
        return volume;
    }


    /* --------------------------------------------------------
       MUTE
       -------------------------------------------------------- */

    function mute() {
        muted = true;
        applyVolume();
        return true;
    }


    function unmute() {
        muted = false;
        ensureReady();
        applyVolume();
        return false;
    }


    function toggleMute() {
        if (muted) {
            return unmute();
        }

        return mute();
    }


    function isMuted() {
        return muted;
    }


    /* --------------------------------------------------------
       BASIC OSCILLATOR
       -------------------------------------------------------- */

    function createOscillator(
        frequency,
        type,
        duration,
        gainAmount,
        startTime
    ) {
        if (!ensureReady()) {
            return null;
        }

        const ctx = audioContext;

        const oscillator =
            ctx.createOscillator();

        const gain =
            ctx.createGain();

        oscillator.type = type || "sine";

        oscillator.frequency.setValueAtTime(
            frequency,
            startTime
        );

        gain.gain.setValueAtTime(
            0.0001,
            startTime
        );

        gain.gain.exponentialRampToValueAtTime(
            Math.max(0.0001, gainAmount),
            startTime + CONFIG.attack
        );

        gain.gain.exponentialRampToValueAtTime(
            0.0001,
            startTime + duration
        );

        oscillator.connect(gain);
        gain.connect(masterGainNode);

        oscillator.start(startTime);

        oscillator.stop(
            startTime + duration + CONFIG.release
        );

        return oscillator;
    }


    /* --------------------------------------------------------
       NOISE BURST
       -------------------------------------------------------- */

    function createNoise(
        duration,
        gainAmount,
        startTime,
        filterFrequency
    ) {
        if (!ensureReady()) {
            return null;
        }

        const ctx = audioContext;

        const bufferSize =
            Math.max(
                1,
                Math.floor(
                    ctx.sampleRate * duration
                )
            );

        const buffer =
            ctx.createBuffer(
                1,
                bufferSize,
                ctx.sampleRate
            );

        const data =
            buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] =
                Math.random() * 2 - 1;
        }

        const source =
            ctx.createBufferSource();

        const filter =
            ctx.createBiquadFilter();

        const gain =
            ctx.createGain();

        source.buffer = buffer;

        filter.type = "lowpass";

        filter.frequency.setValueAtTime(
            filterFrequency || 2500,
            startTime
        );

        gain.gain.setValueAtTime(
            0.0001,
            startTime
        );

        gain.gain.exponentialRampToValueAtTime(
            Math.max(0.0001, gainAmount),
            startTime + CONFIG.attack
        );

        gain.gain.exponentialRampToValueAtTime(
            0.0001,
            startTime + duration
        );

        source.connect(filter);
        filter.connect(gain);
        gain.connect(masterGainNode);

        source.start(startTime);

        source.stop(
            startTime + duration + CONFIG.release
        );

        return source;
    }


    /* --------------------------------------------------------
       SOUND EFFECTS
       -------------------------------------------------------- */

    function playClick() {
        const ctx = audioContext;

        if (!ensureReady()) {
            return;
        }

        const now = ctx.currentTime;

        createOscillator(
            700,
            "square",
            0.045,
            0.08,
            now
        );
    }


    function playSelect() {
        const ctx = audioContext;

        if (!ensureReady()) {
            return;
        }

        const now = ctx.currentTime;

        createOscillator(
            520,
            "sine",
            0.06,
            0.1,
            now
        );

        createOscillator(
            780,
            "sine",
            0.08,
            0.08,
            now + 0.045
        );
    }


    function playMove() {
        const ctx = audioContext;

        if (!ensureReady()) {
            return;
        }

        const now = ctx.currentTime;

        createOscillator(
            420,
            "triangle",
            0.09,
            0.1,
            now
        );

        createOscillator(
            620,
            "triangle",
            0.11,
            0.07,
            now + 0.04
        );
    }


    function playStrike() {
        const ctx = audioContext;

        if (!ensureReady()) {
            return;
        }

        const now = ctx.currentTime;

        createNoise(
            0.055,
            CONFIG.pool.strike,
            now,
            3200
        );

        createOscillator(
            115,
            "triangle",
            0.12,
            0.22,
            now
        );
    }


    function playCollision() {
        const ctx = audioContext;

        if (!ensureReady()) {
            return;
        }

        const now = ctx.currentTime;

        createNoise(
            0.035,
            CONFIG.pool.collision,
            now,
            4200
        );

        createOscillator(
            720,
            "sine",
            0.045,
            0.08,
            now
        );
    }


    function playRail() {
        const ctx = audioContext;

        if (!ensureReady()) {
            return;
        }

        const now = ctx.currentTime;

        createNoise(
            0.055,
            CONFIG.pool.rail,
            now,
            2200
        );

        createOscillator(
            180,
            "triangle",
            0.09,
            0.12,
            now
        );
    }


    function playPocket() {
        const ctx = audioContext;

        if (!ensureReady()) {
            return;
        }

        const now = ctx.currentTime;

        createOscillator(
            260,
            "sine",
            0.15,
            CONFIG.pool.pocket,
            now
        );

        createOscillator(
            130,
            "sine",
            0.2,
            0.18,
            now + 0.04
        );

        createNoise(
            0.12,
            0.14,
            now,
            900
        );
    }


    function playFoul() {
        const ctx = audioContext;

        if (!ensureReady()) {
            return;
        }

        const now = ctx.currentTime;

        createOscillator(
            300,
            "sawtooth",
            0.16,
            0.12,
            now
        );

        createOscillator(
            210,
            "sawtooth",
            0.2,
            0.1,
            now + 0.12
        );
    }


    function playTurn() {
        const ctx = audioContext;

        if (!ensureReady()) {
            return;
        }

        const now = ctx.currentTime;

        createOscillator(
            500,
            "sine",
            0.08,
            0.09,
            now
        );

        createOscillator(
            700,
            "sine",
            0.12,
            0.08,
            now + 0.08
        );
    }


    function playCountdown() {
        const ctx = audioContext;

        if (!ensureReady()) {
            return;
        }

        const now = ctx.currentTime;

        createOscillator(
            880,
            "square",
            0.08,
            0.1,
            now
        );
    }


    function playNotify() {
        const ctx = audioContext;

        if (!ensureReady()) {
            return;
        }

        const now = ctx.currentTime;

        createOscillator(
            660,
            "sine",
            0.09,
            0.09,
            now
        );

        createOscillator(
            880,
            "sine",
            0.12,
            0.08,
            now + 0.09
        );
    }


    function playWin() {
        const ctx = audioContext;

        if (!ensureReady()) {
            return;
        }

        const now = ctx.currentTime;

        createOscillator(
            523.25,
            "sine",
            0.18,
            0.12,
            now
        );

        createOscillator(
            659.25,
            "sine",
            0.18,
            0.11,
            now + 0.14
        );

        createOscillator(
            783.99,
            "sine",
            0.28,
            0.13,
            now + 0.28
        );
    }


    function playLose() {
        const ctx = audioContext;

        if (!ensureReady()) {
            return;
        }

        const now = ctx.currentTime;

        createOscillator(
            440,
            "sine",
            0.18,
            0.1,
            now
        );

        createOscillator(
            349.23,
            "sine",
            0.2,
            0.1,
            now + 0.16
        );

        createOscillator(
            261.63,
            "sine",
            0.3,
            0.11,
            now + 0.34
        );
    }


    /* --------------------------------------------------------
       SOUND REGISTRY
       -------------------------------------------------------- */

    const sounds = {
        click: playClick,
        select: playSelect,
        move: playMove,

        strike: playStrike,
        cue: playStrike,

        collision: playCollision,
        hit: playCollision,

        rail: playRail,
        cushion: playRail,

        pocket: playPocket,
        sink: playPocket,

        foul: playFoul,
        scratch: playFoul,

        turn: playTurn,
        countdown: playCountdown,

        notify: playNotify,
        notification: playNotify,

        win: playWin,
        victory: playWin,

        lose: playLose,
        defeat: playLose
    };


    /* --------------------------------------------------------
       UNIVERSAL PLAY FUNCTION
       -------------------------------------------------------- */

    function play(name) {
        if (!CONFIG.enabled) {
            return false;
        }

        if (muted) {
            return false;
        }

        const sound =
            sounds[String(name).toLowerCase()];

        if (!sound) {
            console.warn(
                "🎧 RO'Lyfe Audio: unknown sound:",
                name
            );

            return false;
        }

        try {
            sound();
            return true;

        } catch (error) {
            console.warn(
                "🎧 RO'Lyfe Audio: playback error:",
                error
            );

            return false;
        }
    }


    /* --------------------------------------------------------
       INITIALIZATION
       -------------------------------------------------------- */

    function init() {
        ensureReady();

        return {
            initialized: initialized,
            muted: muted,
            volume: volume
        };
    }


    /* --------------------------------------------------------
       USER-GESTURE AUDIO UNLOCK
       -------------------------------------------------------- */

    function attachUnlockListeners() {
        const events = [
            "pointerdown",
            "touchstart",
            "mousedown",
            "keydown"
        ];

        const unlock = function () {
            ensureReady();

            events.forEach(function (eventName) {
                document.removeEventListener(
                    eventName,
                    unlock
                );
            });
        };

        events.forEach(function (eventName) {
            document.addEventListener(
                eventName,
                unlock,
                {
                    passive: true
                }
            );
        });
    }


    /* --------------------------------------------------------
       PUBLIC API
       -------------------------------------------------------- */

    const ROLyfeAudio = {

        init: init,

        play: play,

        setVolume: setVolume,
        getVolume: getVolume,

        mute: mute,
        unmute: unmute,
        toggleMute: toggleMute,
        isMuted: isMuted,

        isInitialized: function () {
            return initialized;
        },

        getContext: function () {
            return audioContext;
        },

        sounds: Object.keys(sounds),

        version: "1.0"
    };


    /* --------------------------------------------------------
       GLOBAL EXPORT
       -------------------------------------------------------- */

    global.ROLyfeAudio = ROLyfeAudio;

    /*
       Optional compatibility alias.
       This lets future code use either:
           ROLyfeAudio
       or:
           ROlyfeAudio
    */

    global.ROlyfeAudio = ROLyfeAudio;


    /* --------------------------------------------------------
       START USER-GESTURE UNLOCK
       -------------------------------------------------------- */

    if (
        document &&
        document.addEventListener
    ) {
        attachUnlockListeners();
    }


    /* --------------------------------------------------------
       READY MESSAGE
       -------------------------------------------------------- */

    console.log(
        "🎧 RO'Lyfe Audio Engine v1.0 loaded."
    );

})(window);
