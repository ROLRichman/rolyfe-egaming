/* =========================================================
   RO’LYFE GAMING™
   SHARED GAME UI ENGINE — V1.0
   File: shared/game-ui.js

   PURPOSE
   ---------------------------------------------------------
   Shared user-interface controller for the RO’Lyfe Gaming™
   platform.

   PLATFORM GAMES
   ---------------------------------------------------------
   • Chess
   • Checkers
   • Connect Four
   • Tic-Tac-Toe
   • Monopoly
   • Pool

   NOT INCLUDED
   ---------------------------------------------------------
   • Trading

   ARCHITECTURE
   ---------------------------------------------------------
   Game rules remain inside each individual game.

   This shared engine handles reusable UI behavior:
   • Status messages
   • Turn indicators
   • Player panels
   • Score displays
   • Buttons
   • Pause state
   • Overlays
   • Notifications
   • UI state
   • Game identity
   • Theme-aware hooks
   • DOM event helpers

   PUBLIC GLOBAL
   ---------------------------------------------------------
   window.ROLyfeGameUI
   window.ROlyfeGameUI
   ========================================================= */

(function (global) {

  "use strict";


  /* =======================================================
     1. CONFIGURATION
     ======================================================= */

  const CONFIG = {

    version: "1.0",

    defaultGame: "gaming",

    defaultStatus: "Ready",

    selectors: {

      game: [
        "[data-rolyfe-game]",
        "[data-game]"
      ],

      status: [
        "[data-game-status]",
        "[data-rolyfe-status]"
      ],

      turn: [
        "[data-game-turn]",
        "[data-rolyfe-turn]"
      ],

      score: [
        "[data-game-score]",
        "[data-rolyfe-score]"
      ],

      player: [
        "[data-player]",
        "[data-rolyfe-player]"
      ],

      pause: [
        "[data-game-pause]",
        "[data-rolyfe-pause]"
      ],

      overlay: [
        "[data-game-overlay]",
        "[data-rolyfe-overlay]"
      ]
    }

  };


  /* =======================================================
     2. INTERNAL STATE
     ======================================================= */

  const state = {

    initialized: false,

    game: CONFIG.defaultGame,

    status: CONFIG.defaultStatus,

    turn: null,

    paused: false,

    players: {},

    scores: {},

    overlayVisible: false,

    listeners: [],

    callbacks: {

      status: [],

      turn: [],

      score: [],

      pause: [],

      resume: [],

      overlay: [],
      game: []
    }

  };


  /* =======================================================
     3. UTILITY FUNCTIONS
     ======================================================= */

  function isElement(value) {

    return value &&
      typeof value === "object" &&
      value.nodeType === 1;

  }


  function normalizeText(value, fallback) {

    if (value === null || value === undefined) {

      return fallback || "";

    }

    return String(value);

  }


  function safeCallback(list, payload) {

    if (!Array.isArray(list)) return;

    list.slice().forEach(function (callback) {

      if (typeof callback !== "function") return;

      try {

        callback(payload);

      } catch (error) {

        console.error(
          "RO’Lyfe Game UI callback error:",
          error
        );

      }

    });

  }


  function queryAll(selector) {

    if (!selector ||
        typeof document === "undefined") {

      return [];

    }

    try {

      return Array.from(
        document.querySelectorAll(selector)
      );

    } catch (error) {

      return [];

    }

  }


  function queryFirst(selectors) {

    if (!Array.isArray(selectors)) {

      selectors = [selectors];

    }

    for (let i = 0; i < selectors.length; i++) {

      const elements = queryAll(selectors[i]);

      if (elements.length) {

        return elements;

      }

    }

    return [];

  }


  function setText(elements, value) {

    const text = normalizeText(value, "");

    elements.forEach(function (element) {

      if (!isElement(element)) return;

      element.textContent = text;

    });

  }


  function toggleClass(elements, className, enabled) {

    if (!className) return;

    elements.forEach(function (element) {

      if (!isElement(element)) return;

      element.classList.toggle(
        className,
        Boolean(enabled)
      );

    });

  }


  function setAttribute(elements, name, value) {

    if (!name) return;

    elements.forEach(function (element) {

      if (!isElement(element)) return;

      if (
        value === null ||
        value === undefined
      ) {

        element.removeAttribute(name);

      } else {

        element.setAttribute(
          name,
          String(value)
        );

      }

    });

  }


  /* =======================================================
     4. GAME IDENTITY
     ======================================================= */

  function setGame(gameName) {

    const game = normalizeText(
      gameName,
      CONFIG.defaultGame
    ).trim().toLowerCase();

    state.game = game || CONFIG.defaultGame;

    if (typeof document !== "undefined") {

      document.documentElement.setAttribute(
        "data-rolyfe-game",
        state.game
      );

      document.documentElement.setAttribute(
        "data-game",
        state.game
      );

      const body = document.body;

      if (body) {

        body.setAttribute(
          "data-rolyfe-game",
          state.game
        );

        body.setAttribute(
          "data-game",
          state.game
        );

      }

    }

    safeCallback(
      state.callbacks.game,
      state.game
    );

    dispatch("rolyfe:gamechange", {

      game: state.game

    });

    return state.game;
  }


  function getGame() {

    return state.game;

  }


  /* =======================================================
     5. STATUS SYSTEM
     ======================================================= */

  function setStatus(message, type) {

    state.status = normalizeText(
      message,
      CONFIG.defaultStatus
    );

    const statusType =
      normalizeText(type, "default")
        .trim()
        .toLowerCase();

    const elements = queryFirst(
      CONFIG.selectors.status
    );

    setText(
      elements,
      state.status
    );

    setAttribute(
      elements,
      "data-status",
      statusType
    );

    elements.forEach(function (element) {

      if (!isElement(element)) return;

      element.classList.remove(
        "status-default",
        "status-success",
        "status-warning",
        "status-danger",
        "status-info"
      );

      element.classList.add(
        "status-" + statusType
      );

    });

    const payload = {

      message: state.status,

      type: statusType,

      game: state.game

    };

    safeCallback(
      state.callbacks.status,
      payload
    );

    dispatch(
      "rolyfe:gamestatus",
      payload
    );

    return state.status;
  }


  function getStatus() {

    return state.status;

  }


  /* =======================================================
     6. TURN SYSTEM
     ======================================================= */

  function setTurn(playerId, playerName) {

    state.turn = {

      id: playerId !== undefined &&
          playerId !== null
        ? String(playerId)
        : null,

      name: playerName !== undefined &&
            playerName !== null
        ? String(playerName)
        : null

    };

    const elements = queryFirst(
      CONFIG.selectors.turn
    );

    const displayName =
      state.turn.name ||
      state.turn.id ||
      "";

    setText(
      elements,
      displayName
    );

    setAttribute(
      elements,
      "data-player-id",
      state.turn.id
    );

    setAttribute(
      elements,
      "data-turn-player",
      state.turn.id
    );

    const playerElements =
      queryAll("[data-player]");

    playerElements.forEach(function (element) {

      if (!isElement(element)) return;

      const id =
        element.getAttribute("data-player");

      const active =
        state.turn.id !== null &&
        String(id) === String(state.turn.id);

      toggleClass(
        [element],
        "rolyfe-player-active",
        active
      );

      toggleClass(
        [element],
        "active",
        active
      );

      setAttribute(
        [element],
        "aria-current",
        active ? "true" : null
      );

    });

    safeCallback(
      state.callbacks.turn,
      state.turn
    );

    dispatch(
      "rolyfe:gameturn",
      {

        playerId: state.turn.id,

        playerName: state.turn.name,

        game: state.game

      }
    );

    return state.turn;
  }


  function getTurn() {

    if (!state.turn) return null;

    return {

      id: state.turn.id,

      name: state.turn.name

    };

  }


  /* =======================================================
     7. PLAYER UI
     ======================================================= */

  function setPlayer(playerId, data) {

    const id = String(playerId);

    const playerData =
      data && typeof data === "object"
        ? Object.assign({}, data)
        : {};

    playerData.id = id;

    state.players[id] = playerData;

    const elements = queryAll(
      '[data-player="' + escapeSelector(id) + '"]'
    );

    elements.forEach(function (element) {

      if (!isElement(element)) return;

      if (
        playerData.name !== undefined
      ) {

        const nameElements =
          element.querySelectorAll(
            "[data-player-name]"
          );

        setText(
          Array.from(nameElements),
          playerData.name
        );

      }

      if (
        playerData.level !== undefined
      ) {

        const levelElements =
          element.querySelectorAll(
            "[data-player-level]"
          );

        setText(
          Array.from(levelElements),
          playerData.level
        );

      }

      if (
        playerData.type !== undefined
      ) {

        setAttribute(
          [element],
          "data-player-type",
          playerData.type
        );

      }

    });

    return playerData;
  }


  function getPlayer(playerId) {

    const id = String(playerId);

    if (!state.players[id]) {

      return null;

    }

    return Object.assign(
      {},
      state.players[id]
    );
  }


  function removePlayer(playerId) {

    const id = String(playerId);

    delete state.players[id];

    return true;
  }


  function clearPlayers() {

    state.players = {};

    return true;
  }


  /* =======================================================
     8. SCORE SYSTEM
     ======================================================= */

  function setScore(playerId, score) {

    const id = String(playerId);

    state.scores[id] = score;

    const elements = queryAll(
      '[data-score-player="' +
      escapeSelector(id) +
      '"]'
    );

    setText(
      elements,
      score
    );

    setAttribute(
      elements,
      "data-score",
      score
    );

    safeCallback(
      state.callbacks.score,
      {

        playerId: id,

        score: score,

        game: state.game

      }
    );

    dispatch(
      "rolyfe:gamescore",
      {

        playerId: id,

        score: score,

        game: state.game

      }
    );

    return score;
  }


  function getScore(playerId) {

    const id = String(playerId);

    return Object.prototype.hasOwnProperty.call(
      state.scores,
      id
    )
      ? state.scores[id]
      : null;
  }


  function setScores(scores) {

    if (!scores ||
        typeof scores !== "object") {

      return state.scores;

    }

    Object.keys(scores).forEach(function (id) {

      setScore(
        id,
        scores[id]
      );

    });

    return getScores();
  }


  function getScores() {

    return Object.assign(
      {},
      state.scores
    );
  }


  function clearScores() {

    state.scores = {};

    return true;
  }


  /* =======================================================
     9. PAUSE / RESUME SYSTEM
     ======================================================= */

  function setPaused(paused) {

    const nextState = Boolean(paused);

    if (
      state.paused === nextState
    ) {

      return state.paused;

    }

    state.paused = nextState;

    applyPauseState();

    const payload = {

      paused: state.paused,

      game: state.game

    };

    if (state.paused) {

      safeCallback(
        state.callbacks.pause,
        payload
      );

      dispatch(
        "rolyfe:gamepause",
        payload
      );

    } else {

      safeCallback(
        state.callbacks.resume,
        payload
      );

      dispatch(
        "rolyfe:gameresume",
        payload
      );

    }

    return state.paused;
  }


  function pause() {

    return setPaused(true);

  }


  function resume() {

    return setPaused(false);

  }


  function togglePause() {

    return setPaused(
      !state.paused
    );

  }


  function isPaused() {

    return state.paused;

  }


  function applyPauseState() {

    if (typeof document === "undefined") {

      return;

    }

    const root =
      document.documentElement;

    const body =
      document.body;

    [root, body].forEach(function (element) {

      if (!element) return;

      element.classList.toggle(
        "game-paused",
        state.paused
      );

      element.classList.toggle(
        "game-running",
        !state.paused
      );

      element.setAttribute(
        "data-game-paused",
        state.paused
          ? "true"
          : "false"
      );

    });

    const pauseButtons =
      queryFirst(
        CONFIG.selectors.pause
      );

    pauseButtons.forEach(function (button) {

      if (!isElement(button)) return;

      button.setAttribute(
        "aria-pressed",
        state.paused
          ? "true"
          : "false"
      );

      button.setAttribute(
        "data-paused",
        state.paused
          ? "true"
          : "false"
      );

      const label =
        button.querySelector(
          "[data-pause-label]"
        );

      if (label) {

        label.textContent =
          state.paused
            ? "Resume"
            : "Pause";

      }

    });

    const overlays =
      queryFirst(
        CONFIG.selectors.overlay
      );

    overlays.forEach(function (overlay) {

      if (!isElement(overlay)) return;

      overlay.hidden =
        !state.paused;

      overlay.setAttribute(
        "aria-hidden",
        state.paused
          ? "false"
          : "true"
      );

    });

    state.overlayVisible =
      state.paused;

  }


  /* =======================================================
     10. OVERLAY SYSTEM
     ======================================================= */

  function showOverlay(content) {

    const overlays =
      queryFirst(
        CONFIG.selectors.overlay
      );

    overlays.forEach(function (overlay) {

      if (!isElement(overlay)) return;

      if (
        content !== undefined &&
        content !== null
      ) {

        const contentElement =
          overlay.querySelector(
            "[data-overlay-content]"
          );

        if (contentElement) {

          if (
            typeof content === "string"
          ) {

            contentElement.textContent =
              content;

          } else if (
            isElement(content)
          ) {

            contentElement.innerHTML = "";

            contentElement.appendChild(
              content
            );

          }

        }

      }

      overlay.hidden = false;

      overlay.setAttribute(
        "aria-hidden",
        "false"
      );

      overlay.classList.add(
        "rolyfe-overlay-visible"
      );

    });

    state.overlayVisible = true;

    safeCallback(
      state.callbacks.overlay,
      {

        visible: true,

        game: state.game

      }
    );

    dispatch(
      "rolyfe:overlay",
      {

        visible: true,

        game: state.game

      }
    );

    return true;
  }


  function hideOverlay() {

    const overlays =
      queryFirst(
        CONFIG.selectors.overlay
      );

    overlays.forEach(function (overlay) {

      if (!isElement(overlay)) return;

      overlay.hidden = true;

      overlay.setAttribute(
        "aria-hidden",
        "true"
      );

      overlay.classList.remove(
        "rolyfe-overlay-visible"
      );

    });

    state.overlayVisible = false;

    safeCallback(
      state.callbacks.overlay,
      {

        visible: false,

        game: state.game

      }
    );

    dispatch(
      "rolyfe:overlay",
      {

        visible: false,

        game: state.game

      }
    );

    return true;
  }


  function isOverlayVisible() {

    return state.overlayVisible;

  }


  /* =======================================================
     11. NOTIFICATION SYSTEM
     ======================================================= */

  function notify(message, type, duration) {

    const text =
      normalizeText(
        message,
        ""
      ).trim();

    if (!text) return false;

    const notificationType =
      normalizeText(
        type,
        "info"
      ).trim().toLowerCase();

    const lifetime =
      Number.isFinite(
        Number(duration)
      )
        ? Math.max(
            0,
            Number(duration)
          )
        : 3000;

    if (
      typeof document === "undefined"
    ) {

      return false;

    }

    let container =
      document.querySelector(
        "[data-rolyfe-notifications]"
      );

    if (!container) {

      container =
        document.createElement("div");

      container.setAttribute(
        "data-rolyfe-notifications",
        ""
      );

      container.className =
        "rolyfe-notification-container";

      container.setAttribute(
        "aria-live",
        "polite"
      );

      container.setAttribute(
        "aria-atomic",
        "true"
      );

      document.body.appendChild(
        container
      );

    }

    const notification =
      document.createElement("div");

    notification.className =
      "rolyfe-notification " +
      "rolyfe-notification-" +
      notificationType;

    notification.setAttribute(
      "role",
      "status"
    );

    notification.setAttribute(
      "data-notification-type",
      notificationType
    );

    notification.textContent =
      text;

    container.appendChild(
      notification
    );

    requestAnimationFrame(function () {

      notification.classList.add(
        "rolyfe-notification-visible"
      );

    });

    if (lifetime > 0) {

      window.setTimeout(function () {

        notification.classList.remove(
          "rolyfe-notification-visible"
        );

        window.setTimeout(function () {

          if (
            notification.parentNode
          ) {

            notification.parentNode.removeChild(
              notification
            );

          }

        }, 250);

      }, lifetime);

    }

    return notification;
  }


  /* =======================================================
     12. BUTTON STATE HELPERS
     ======================================================= */

  function setButtonEnabled(button, enabled) {

    const elements =
      isElement(button)
        ? [button]
        : queryAll(button);

    elements.forEach(function (element) {

      if (!isElement(element)) return;

      element.disabled =
        !Boolean(enabled);

      element.setAttribute(
        "aria-disabled",
        Boolean(enabled)
          ? "false"
          : "true"
      );

    });

    return true;
  }


  function setButtonLabel(button, label) {

    const elements =
      isElement(button)
        ? [button]
        : queryAll(button);

    setText(
      elements,
      label
    );

    return true;
  }


  /* =======================================================
     13. DOM EVENT HELPERS
     ======================================================= */

  function on(target, eventName, handler, options) {

    if (
      !eventName ||
      typeof handler !== "function"
    ) {

      return null;

    }

    let elements = [];

    if (isElement(target)) {

      elements = [target];

    } else if (
      typeof target === "string"
    ) {

      elements = queryAll(target);

    } else if (
      target === document ||
      target === window
    ) {

      elements = [target];

    }

    elements.forEach(function (element) {

      element.addEventListener(
        eventName,
        handler,
        options
      );

      state.listeners.push({

        element: element,

        eventName: eventName,

        handler: handler,

        options: options

      });

    });

    return handler;
  }


  function off(
    target,
    eventName,
    handler,
    options
  ) {

    let elements = [];

    if (isElement(target)) {

      elements = [target];

    } else if (
      typeof target === "string"
    ) {

      elements = queryAll(target);

    } else if (
      target === document ||
      target === window
    ) {

      elements = [target];

    }

    elements.forEach(function (element) {

      element.removeEventListener(
        eventName,
        handler,
        options
      );

    });

    state.listeners =
      state.listeners.filter(
        function (item) {

          return !(
            elements.includes(
              item.element
            ) &&
            item.eventName === eventName &&
            item.handler === handler
          );

        }
      );

    return true;
  }


  /* =======================================================
     14. INTERNAL EVENT BUS
     ======================================================= */

  function onStatus(callback) {

    return subscribe(
      "status",
      callback
    );

  }


  function onTurn(callback) {

    return subscribe(
      "turn",
      callback
    );

  }


  function onScore(callback) {

    return subscribe(
      "score",
      callback
    );

  }


  function onPause(callback) {

    return subscribe(
      "pause",
      callback
    );

  }


  function onResume(callback) {

    return subscribe(
      "resume",
      callback
    );

  }


  function onOverlay(callback) {

    return subscribe(
      "overlay",
      callback
    );

  }


  function onGame(callback) {

    return subscribe(
      "game",
      callback
    );

  }


  function subscribe(eventName, callback) {

    if (
      !state.callbacks[eventName] ||
      typeof callback !== "function"
    ) {

      return function () {};

    }

    state.callbacks[eventName].push(
      callback
    );

    return function unsubscribe() {

      const list =
        state.callbacks[eventName];

      const index =
        list.indexOf(callback);

      if (index !== -1) {

        list.splice(
          index,
          1
        );

      }

    };

  }


  /* =======================================================
     15. CUSTOM DOM EVENTS
     ======================================================= */

  function dispatch(name, detail) {

    if (
      typeof document === "undefined" ||
      typeof CustomEvent === "undefined"
    ) {

      return false;

    }

    try {

      document.dispatchEvent(
        new CustomEvent(
          name,
          {
            detail: detail
          }
        )
      );

      return true;

    } catch (error) {

      return false;

    }

  }


  /* =======================================================
     16. UI STATE
     ======================================================= */

  function getState() {

    return {

      version: CONFIG.version,

      initialized:
        state.initialized,

      game:
        state.game,

      status:
        state.status,

      turn:
        getTurn(),

      paused:
        state.paused,

      players:
        Object.assign(
          {},
          state.players
        ),

      scores:
        Object.assign(
          {},
          state.scores
        ),

      overlayVisible:
        state.overlayVisible

    };

  }


  function reset() {

    state.game =
      CONFIG.defaultGame;

    state.status =
      CONFIG.defaultStatus;

    state.turn =
      null;

    state.paused =
      false;

    state.players =
      {};

    state.scores =
      {};

    state.overlayVisible =
      false;

    if (
      typeof document !== "undefined"
    ) {

      const root =
        document.documentElement;

      const body =
        document.body;

      [root, body].forEach(
        function (element) {

          if (!element) return;

          element.classList.remove(
            "game-paused"
          );

          element.classList.add(
            "game-running"
          );

        }
      );

    }

    setGame(
      CONFIG.defaultGame
    );

    setStatus(
      CONFIG.defaultStatus
    );

    hideOverlay();

    return getState();
  }


  /* =======================================================
     17. ESCAPE CSS SELECTOR
     ======================================================= */

  function escapeSelector(value) {

    const text = String(value);

    if (
      typeof CSS !== "undefined" &&
      typeof CSS.escape === "function"
    ) {

      return CSS.escape(text);

    }

    return text.replace(
      /([!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~])/g,
      "\\$1"
    );

  }


  /* =======================================================
     18. INITIALIZATION
     ======================================================= */

  function init(options) {

    if (state.initialized) {

      return getState();

    }

    state.initialized = true;

    const settings =
      options &&
      typeof options === "object"
        ? options
        : {};

    if (settings.game) {

      setGame(
        settings.game
      );

    } else {

      setGame(
        detectGame()
      );

    }

    if (
      settings.status !== undefined
    ) {

      setStatus(
        settings.status
      );

    }

    applyPauseState();

    bindPauseButtons();

    dispatch(
      "rolyfe:gameuiready",
      getState()
    );

    return getState();
  }


  function detectGame() {

    if (
      typeof document === "undefined"
    ) {

      return CONFIG.defaultGame;

    }

    const root =
      document.documentElement;

    const body =
      document.body;

    const candidates = [

      root &&
        root.getAttribute(
          "data-rolyfe-game"
        ),

      root &&
        root.getAttribute(
          "data-game"
        ),

      body &&
        body.getAttribute(
          "data-rolyfe-game"
        ),

      body &&
        body.getAttribute(
          "data-game"
        )

    ];

    for (
      let i = 0;
      i < candidates.length;
      i++
    ) {

      if (
        candidates[i]
      ) {

        return candidates[i];

      }

    }

    return CONFIG.defaultGame;
  }


  /* =======================================================
     19. PAUSE BUTTON BINDING
     ======================================================= */

  function bindPauseButtons() {

    if (
      typeof document === "undefined"
    ) {

      return;

    }

    const buttons =
      queryFirst(
        CONFIG.selectors.pause
      );

    buttons.forEach(function (button) {

      if (
        button.dataset.rolyfeUiBound === "true"
      ) {

        return;

      }

      button.dataset.rolyfeUiBound =
        "true";

      button.addEventListener(
        "click",
        function () {

          togglePause();

        }
      );

    });

  }


  /* =======================================================
     20. DESTROY
     ======================================================= */

  function destroy() {

    state.listeners.forEach(
      function (item) {

        if (
          item.element &&
          typeof item.element.removeEventListener ===
            "function"
        ) {

          item.element.removeEventListener(
            item.eventName,
            item.handler,
            item.options
          );

        }

      }
    );

    state.listeners = [];

    Object.keys(
      state.callbacks
    ).forEach(function (key) {

      state.callbacks[key] = [];

    });

    state.initialized = false;

    return true;
  }


  /* =======================================================
     21. PUBLIC API
     ======================================================= */

  const ROLyfeGameUI = {

    version:
      CONFIG.version,

    config:
      CONFIG,

    init:
      init,

    destroy:
      destroy,

    reset:
      reset,

    getState:
      getState,

    /* Game */
    setGame:
      setGame,

    getGame:
      getGame,

    /* Status */
    setStatus:
      setStatus,

    getStatus:
      getStatus,

    /* Turn */
    setTurn:
      setTurn,

    getTurn:
      getTurn,

    /* Players */
    setPlayer:
      setPlayer,

    getPlayer:
      getPlayer,

    removePlayer:
      removePlayer,

    clearPlayers:
      clearPlayers,

    /* Scores */
    setScore:
      setScore,

    getScore:
      getScore,

    setScores:
      setScores,

    getScores:
      getScores,

    clearScores:
      clearScores,

    /* Pause */
    pause:
      pause,

    resume:
      resume,

    togglePause:
      togglePause,

    setPaused:
      setPaused,

    isPaused:
      isPaused,

    /* Overlay */
    showOverlay:
      showOverlay,

    hideOverlay:
      hideOverlay,

    isOverlayVisible:
      isOverlayVisible,

    /* Notifications */
    notify:
      notify,

    /* Buttons */
    setButtonEnabled:
      setButtonEnabled,

    setButtonLabel:
      setButtonLabel,

    /* DOM */
    on:
      on,

    off:
      off,

    dispatch:
      dispatch,

    /* Events */
    onStatus:
      onStatus,

    onTurn:
      onTurn,

    onScore:
      onScore,

    onPause:
      onPause,

    onResume:
      onResume,

    onOverlay:
      onOverlay,

    onGame:
      onGame

  };


  /* =======================================================
     22. GLOBAL EXPORTS
     ======================================================= */

  global.ROLyfeGameUI =
    ROLyfeGameUI;

  global.ROlyfeGameUI =
    ROLyfeGameUI;


  /* =======================================================
     23. AUTO INITIALIZATION
     ======================================================= */

  function boot() {

    try {

      init();

    } catch (error) {

      console.error(
        "RO’Lyfe Game UI initialization error:",
        error
      );

    }

  }


  if (
    typeof document !== "undefined"
  ) {

    if (
      document.readyState === "loading"
    ) {

      document.addEventListener(
        "DOMContentLoaded",
        boot,
        {
          once: true
        }
      );

    } else {

      boot();

    }

  }


  /* =======================================================
     24. READY MESSAGE
     ======================================================= */

  if (
    typeof console !== "undefined"
  ) {

    console.log(
      "🎮 RO’Lyfe Game UI Engine v1.0 loaded."
    );

  }


})(window);


/* =========================================================
   END OF RO’LYFE GAMING™ SHARED GAME UI ENGINE V1.0
   ========================================================= */
