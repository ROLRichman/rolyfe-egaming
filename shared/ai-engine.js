/* =========================================================
   RO’LYFE GAMING™
   SHARED AI ENGINE — V1.0
   File: shared/ai-engine.js

   PURPOSE
   ---------------------------------------------------------
   Shared AI framework for the RO’Lyfe Gaming™ platform.

   GAMES
   ---------------------------------------------------------
   • Chess
   • Checkers
   • Connect Four
   • Tic-Tac-Toe
   • Monopoly
   • Pool

   ARCHITECTURE
   ---------------------------------------------------------
   This file provides reusable AI infrastructure.

   Individual games remain responsible for:
   • Game rules
   • Legal moves
   • Board/state representation
   • Game-specific evaluation
   • Game-specific decision logic

   The shared AI engine provides:
   • AI player profiles
   • Difficulty levels
   • Thinking state
   • Decision requests
   • Strategy registration
   • Move selection framework
   • AI timing/delay
   • Cancellation
   • Random choice utilities
   • Event callbacks
   • State management

   DEPENDS ON
   ---------------------------------------------------------
   • No external libraries

   OPTIONAL INTEGRATION
   ---------------------------------------------------------
   • shared/player-system.js
   • shared/game-ui.js
   • shared/timer.js

   PUBLIC API
   ---------------------------------------------------------
   window.ROLyfeAI
   window.ROlyfeAI

   ========================================================= */

(function (global) {
  "use strict";


  /* =======================================================
     1. CONFIGURATION
     ======================================================= */

  const CONFIG = {

    defaultLevel: 1,

    levels: {
      1: {
        id: 1,
        name: "START-UP",
        skill: 0.20,
        randomness: 0.70,
        thinkTime: 450
      },

      2: {
        id: 2,
        name: "START-UP+",
        skill: 0.35,
        randomness: 0.50,
        thinkTime: 650
      },

      3: {
        id: 3,
        name: "INVESTOR",
        skill: 0.55,
        randomness: 0.30,
        thinkTime: 850
      },

      4: {
        id: 4,
        name: "INVESTOR+",
        skill: 0.75,
        randomness: 0.15,
        thinkTime: 1100
      },

      5: {
        id: 5,
        name: "7FIGURES",
        skill: 0.92,
        randomness: 0.05,
        thinkTime: 1450
      }
    },

    minThinkTime: 0,

    maxThinkTime: 5000,

    defaultStrategy: "random",

    autoDelay: true
  };


  /* =======================================================
     2. UTILITIES
     ======================================================= */

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }


  function random() {
    return Math.random();
  }


  function randomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);

    return Math.floor(
      Math.random() * (max - min + 1)
    ) + min;
  }


  function randomItem(items) {
    if (!Array.isArray(items) || items.length === 0) {
      return null;
    }

    return items[
      randomInt(0, items.length - 1)
    ];
  }


  function shuffle(items) {
    if (!Array.isArray(items)) {
      return [];
    }

    const result = items.slice();

    for (let i = result.length - 1; i > 0; i--) {
      const j = randomInt(0, i);

      const temp = result[i];
      result[i] = result[j];
      result[j] = temp;
    }

    return result;
  }


  function weightedRandom(items) {
    if (!Array.isArray(items) || items.length === 0) {
      return null;
    }

    const valid = items.filter(function (item) {
      return item &&
        Number.isFinite(Number(item.weight)) &&
        Number(item.weight) > 0;
    });

    if (valid.length === 0) {
      return randomItem(items);
    }

    const total = valid.reduce(function (sum, item) {
      return sum + Number(item.weight);
    }, 0);

    let target = Math.random() * total;

    for (let i = 0; i < valid.length; i++) {
      target -= Number(valid[i].weight);

      if (target <= 0) {
        return valid[i].value;
      }
    }

    return valid[valid.length - 1].value;
  }


  function now() {
    return Date.now();
  }


  function safeClone(value) {
    if (value === undefined) {
      return undefined;
    }

    try {
      return JSON.parse(JSON.stringify(value));
    } catch (error) {
      return value;
    }
  }


  /* =======================================================
     3. AI PLAYER
     ======================================================= */

  class AIPlayer {

    constructor(options) {

      options = options || {};

      this.id =
        options.id ||
        ("ai-" + now() + "-" + randomInt(1000, 9999));

      this.name =
        options.name ||
        "RO’Lyfe AI";

      this.level =
        clamp(
          Number(options.level) || CONFIG.defaultLevel,
          1,
          5
        );

      this.type = "ai";

      this.game =
        options.game ||
        null;

      this.strategy =
        options.strategy ||
        CONFIG.defaultStrategy;

      this.thinking = false;

      this.enabled = true;

      this.moveCount = 0;

      this.lastMove = null;

      this.lastThinkTime = 0;

      this.startedAt = null;

      this.cancelled = false;

      this.metadata =
        options.metadata || {};
    }


    getLevel() {
      return CONFIG.levels[this.level] ||
        CONFIG.levels[CONFIG.defaultLevel];
    }


    setLevel(level) {

      const numericLevel =
        clamp(
          Number(level) || CONFIG.defaultLevel,
          1,
          5
        );

      this.level = numericLevel;

      return this.getLevel();
    }


    getLevelName() {
      return this.getLevel().name;
    }


    getSkill() {
      return this.getLevel().skill;
    }


    getRandomness() {
      return this.getLevel().randomness;
    }


    getThinkTime() {
      return this.getLevel().thinkTime;
    }


    setStrategy(strategy) {

      if (
        typeof strategy !== "string" &&
        typeof strategy !== "function"
      ) {
        return false;
      }

      this.strategy = strategy;

      return true;
    }


    setGame(game) {
      this.game = game || null;
      return this.game;
    }


    startThinking() {

      if (!this.enabled) {
        return false;
      }

      this.thinking = true;
      this.cancelled = false;
      this.startedAt = now();

      return true;
    }


    stopThinking() {

      this.thinking = false;
      this.cancelled = true;

      return true;
    }


    finishThinking(move) {

      this.thinking = false;

      this.lastMove = move;

      this.lastThinkTime =
        this.startedAt
          ? now() - this.startedAt
          : 0;

      this.startedAt = null;

      if (move !== null && move !== undefined) {
        this.moveCount++;
      }

      return move;
    }


    reset() {

      this.thinking = false;
      this.cancelled = false;
      this.moveCount = 0;
      this.lastMove = null;
      this.lastThinkTime = 0;
      this.startedAt = null;

      return this;
    }


    getState() {

      return {
        id: this.id,
        name: this.name,
        level: this.level,
        levelName: this.getLevelName(),
        type: this.type,
        strategy:
          typeof this.strategy === "function"
            ? "function"
            : this.strategy,
        thinking: this.thinking,
        enabled: this.enabled,
        moveCount: this.moveCount,
        lastMove: safeClone(this.lastMove),
        lastThinkTime: this.lastThinkTime,
        metadata: safeClone(this.metadata)
      };
    }
  }


  /* =======================================================
     4. AI ENGINE
     ======================================================= */

  class AIEngine {

    constructor(options) {

      options = options || {};

      this.version = "1.0";

      this.game =
        options.game ||
        null;

      this.ai =
        options.ai instanceof AIPlayer
          ? options.ai
          : new AIPlayer(options);

      this.strategies = {};

      this.events = {};

      this.pendingRequest = null;

      this.requestId = 0;

      this.initialized = false;

      this.registerDefaultStrategies();

      if (options.strategies) {
        this.registerStrategies(options.strategies);
      }

      this.initialized = true;
    }


    /* =====================================================
       4.1 EVENTS
       ===================================================== */

    on(eventName, callback) {

      if (
        typeof eventName !== "string" ||
        typeof callback !== "function"
      ) {
        return function () {};
      }

      if (!this.events[eventName]) {
        this.events[eventName] = [];
      }

      this.events[eventName].push(callback);

      const self = this;

      return function unsubscribe() {
        self.off(eventName, callback);
      };
    }


    off(eventName, callback) {

      if (!this.events[eventName]) {
        return false;
      }

      if (!callback) {
        this.events[eventName] = [];
        return true;
      }

      this.events[eventName] =
        this.events[eventName].filter(function (item) {
          return item !== callback;
        });

      return true;
    }


    emit(eventName, data) {

      const listeners =
        this.events[eventName];

      if (!listeners) {
        return;
      }

      listeners.slice().forEach(function (callback) {

        try {
          callback(data);
        } catch (error) {
          console.error(
            "RO’Lyfe AI event error:",
            error
          );
        }

      });
    }


    /* =====================================================
       4.2 STRATEGIES
       ===================================================== */

    registerStrategy(name, strategy) {

      if (
        typeof name !== "string" ||
        !name.trim() ||
        typeof strategy !== "function"
      ) {
        return false;
      }

      this.strategies[name.trim()] = strategy;

      return true;
    }


    registerStrategies(strategies) {

      if (!strategies || typeof strategies !== "object") {
        return false;
      }

      const self = this;

      Object.keys(strategies).forEach(function (name) {

        if (typeof strategies[name] === "function") {
          self.registerStrategy(
            name,
            strategies[name]
          );
        }

      });

      return true;
    }


    removeStrategy(name) {

      if (
        !name ||
        !this.strategies[name]
      ) {
        return false;
      }

      if (
        name === "random"
      ) {
        return false;
      }

      delete this.strategies[name];

      return true;
    }


    getStrategy(name) {
      return this.strategies[name] || null;
    }


    listStrategies() {
      return Object.keys(this.strategies);
    }


    registerDefaultStrategies() {

      this.registerStrategy(
        "random",
        function (context) {

          const moves =
            context && Array.isArray(context.moves)
              ? context.moves
              : [];

          return randomItem(moves);
        }
      );


      this.registerStrategy(
        "first",
        function (context) {

          const moves =
            context && Array.isArray(context.moves)
              ? context.moves
              : [];

          return moves.length
            ? moves[0]
            : null;
        }
      );


      this.registerStrategy(
        "best",
        function (context) {

          const moves =
            context && Array.isArray(context.moves)
              ? context.moves
              : [];

          if (!moves.length) {
            return null;
          }

          const scored =
            moves.map(function (move, index) {

              let score = 0;

              if (
                move &&
                Number.isFinite(
                  Number(move.score)
                )
              ) {
                score = Number(move.score);
              }

              return {
                move: move,
                score: score,
                index: index
              };
            });

          scored.sort(function (a, b) {
            return b.score - a.score;
          });

          return scored[0].move;
        }
      );


      this.registerStrategy(
        "weighted",
        function (context) {

          const moves =
            context && Array.isArray(context.moves)
              ? context.moves
              : [];

          if (!moves.length) {
            return null;
          }

          return weightedRandom(
            moves.map(function (move) {

              return {
                value: move,
                weight:
                  move &&
                  Number.isFinite(
                    Number(move.weight)
                  )
                    ? Math.max(
                        0,
                        Number(move.weight)
                      )
                    : 1
              };

            })
          );
        }
      );
    }


    /* =====================================================
       4.3 GAME / AI CONFIGURATION
       ===================================================== */

    setGame(game) {

      this.game = game || null;

      this.ai.setGame(this.game);

      return this.game;
    }


    getGame() {
      return this.game;
    }


    setLevel(level) {
      return this.ai.setLevel(level);
    }


    getLevel() {
      return this.ai.level;
    }


    getLevelInfo() {
      return this.ai.getLevel();
    }


    setStrategy(strategy) {
      return this.ai.setStrategy(strategy);
    }


    getAI() {
      return this.ai;
    }


    isThinking() {
      return this.ai.thinking;
    }


    /* =====================================================
       4.4 MOVE PREPARATION
       ===================================================== */

    normalizeMoves(moves) {

      if (!Array.isArray(moves)) {
        return [];
      }

      return moves.filter(function (move) {
        return move !== null &&
          move !== undefined;
      });
    }


    applySkillFilter(moves) {

      const validMoves =
        this.normalizeMoves(moves);

      if (!validMoves.length) {
        return [];
      }

      const skill =
        this.ai.getSkill();

      /*
       * Level 1 allows more randomness.
       * Higher levels retain more candidate quality.
       *
       * The actual game can provide scores and
       * additional filtering if desired.
       */

      if (validMoves.length === 1) {
        return validMoves;
      }

      const scored =
        validMoves.map(function (move, index) {

          let score = 0;

          if (
            move &&
            Number.isFinite(
              Number(move.score)
            )
          ) {
            score = Number(move.score);
          }

          return {
            move: move,
            score: score,
            index: index
          };
        });


      scored.sort(function (a, b) {
        return b.score - a.score;
      });


      const keepCount =
        Math.max(
          1,
          Math.ceil(
            validMoves.length *
            (0.25 + skill * 0.75)
          )
        );


      return scored
        .slice(0, keepCount)
        .map(function (item) {
          return item.move;
        });
    }


    chooseStrategy() {

      const configured =
        this.ai.strategy;

      if (
        typeof configured === "function"
      ) {
        return configured;
      }

      if (
        typeof configured === "string" &&
        this.strategies[configured]
      ) {
        return this.strategies[configured];
      }

      return this.strategies.random;
    }


    /* =====================================================
       4.5 MOVE SELECTION
       ===================================================== */

    selectMove(context) {

      context = context || {};

      const moves =
        this.normalizeMoves(
          context.moves
        );

      if (!moves.length) {
        return null;
      }

      const candidates =
        this.applySkillFilter(moves);

      if (!candidates.length) {
        return null;
      }

      const strategy =
        this.chooseStrategy();

      const strategyContext =
        Object.assign(
          {},
          context,
          {
            moves: candidates,
            allMoves: moves,
            ai: this.ai.getState(),
            level: this.ai.getLevel()
          }
        );


      let selected = null;

      try {

        selected =
          strategy(strategyContext);

      } catch (error) {

        console.error(
          "RO’Lyfe AI strategy error:",
          error
        );

        selected =
          randomItem(candidates);
      }


      /*
       * A strategy may return an object containing
       * a move property. Support both formats.
       */

      if (
        selected &&
        selected.move !== undefined
      ) {
        selected = selected.move;
      }


      /*
       * If a strategy returns nothing useful,
       * fall back safely.
       */

      if (
        selected === null ||
        selected === undefined
      ) {
        selected =
          randomItem(candidates);
      }


      return selected;
    }


    /* =====================================================
       4.6 THINK
       ===================================================== */

    think(context, options) {

      context = context || {};
      options = options || {};

      this.cancel();

      if (!this.ai.enabled) {
        return Promise.resolve(null);
      }

      const moves =
        this.normalizeMoves(
          context.moves
        );

      if (!moves.length) {
        this.emit(
          "no-moves",
          {
            context: context
          }
        );

        return Promise.resolve(null);
      }


      const requestId =
        ++this.requestId;

      this.ai.startThinking();

      this.emit(
        "thinking-start",
        {
          requestId: requestId,
          ai: this.ai.getState(),
          context: context
        }
      );


      let delay =
        Number.isFinite(
          Number(options.delay)
        )
          ? Number(options.delay)
          : this.ai.getThinkTime();


      delay =
        clamp(
          delay,
          CONFIG.minThinkTime,
          CONFIG.maxThinkTime
        );


      if (options.immediate === true) {
        delay = 0;
      }


      const self = this;


      return new Promise(function (resolve) {

        const timer =
          setTimeout(function () {

            if (
              requestId !== self.requestId ||
              self.ai.cancelled
            ) {

              self.ai.stopThinking();

              self.emit(
                "thinking-cancelled",
                {
                  requestId: requestId
                }
              );

              resolve(null);

              return;
            }


            const move =
              self.selectMove(context);


            self.ai.finishThinking(move);


            self.pendingRequest = null;


            self.emit(
              "thinking-complete",
              {
                requestId: requestId,
                move: move,
                thinkTime:
                  self.ai.lastThinkTime,
                ai: self.ai.getState()
              }
            );


            resolve(move);

          }, delay);


        self.pendingRequest = {
          requestId: requestId,
          timer: timer,
          resolve: resolve
        };

      });
    }


    /* =====================================================
       4.7 CANCEL
       ===================================================== */

    cancel() {

      this.requestId++;

      if (this.pendingRequest) {

        clearTimeout(
          this.pendingRequest.timer
        );

        this.pendingRequest = null;
      }

      if (this.ai.thinking) {
        this.ai.stopThinking();
      }

      return true;
    }


    /* =====================================================
       4.8 ENABLE / DISABLE
       ===================================================== */

    enable() {
      this.ai.enabled = true;
      return true;
    }


    disable() {

      this.cancel();

      this.ai.enabled = false;

      return true;
    }


    /* =====================================================
       4.9 RESET
       ===================================================== */

    reset() {

      this.cancel();

      this.ai.reset();

      return this;
    }


    /* =====================================================
       4.10 STATE
       ===================================================== */

    getState() {

      return {
        version: this.version,
        game: this.game,
        initialized: this.initialized,
        strategies: this.listStrategies(),
        ai: this.ai.getState(),
        thinking: this.isThinking()
      };
    }


    /* =====================================================
       4.11 DESTROY
       ===================================================== */

    destroy() {

      this.cancel();

      this.events = {};

      this.strategies = {};

      this.game = null;

      this.ai.reset();

      return true;
    }
  }


  /* =======================================================
     5. FACTORY
     ======================================================= */

  function create(options) {
    return new AIEngine(options);
  }


  /* =======================================================
     6. DEFAULT ENGINE
     ======================================================= */

  const defaultEngine =
    new AIEngine();


  /* =======================================================
     7. PUBLIC API
     ======================================================= */

  const API = {

    version: "1.0",

    CONFIG: CONFIG,

    AIPlayer: AIPlayer,

    AIEngine: AIEngine,

    create: create,

    engine: defaultEngine,

    random: random,

    randomInt: randomInt,

    randomItem: randomItem,

    shuffle: shuffle,

    weightedRandom: weightedRandom,

    clamp: clamp
  };


  /* =======================================================
     8. GLOBAL EXPORTS
     ======================================================= */

  global.ROLyfeAI = API;

  /*
   * Compatibility alias.
   */

  global.ROlyfeAI = API;


  /* =======================================================
     9. READY EVENT
     ======================================================= */

  if (
    typeof document !== "undefined"
  ) {

    if (
      document.readyState === "loading"
    ) {

      document.addEventListener(
        "DOMContentLoaded",
        function () {

          document.dispatchEvent(
            new CustomEvent(
              "rolyfe:ai-ready",
              {
                detail: {
                  version: "1.0"
                }
              }
            )
          );

        }
      );

    } else {

      document.dispatchEvent(
        new CustomEvent(
          "rolyfe:ai-ready",
          {
            detail: {
              version: "1.0"
            }
          }
        )
      );

    }
  }


  /* =======================================================
     10. CONSOLE CONFIRMATION
     ======================================================= */

  if (
    typeof console !== "undefined" &&
    typeof console.log === "function"
  ) {

    console.log(
      "🤖 RO’Lyfe AI Engine v1.0 loaded."
    );

  }

})(window);


/* =========================================================
   END OF RO’LYFE GAMING™
   SHARED AI ENGINE V1.0
   ========================================================= */
