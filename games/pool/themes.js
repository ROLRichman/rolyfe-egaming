/* ============================================================
   RO'LYFE GAMING™ — POOL THEMES
   File: games/pool/themes.js

   Supports:
   • Classic Pool
   • RO'Lyfe
   • EMG
   • ACE / Vincible
   • Business
   • Real Estate
   • Investor
   • 7Figures
   • Midnight
   • Neon
   • Championship

   Designed for:
   • 8-Ball
   • 9-Ball
   • Practice
   • PvP
   • PvAI
   • AI vs AI
   • Challenge Mode
   ============================================================ */

const POOL_THEMES = {

  /* ==========================================================
     CLASSIC
     ========================================================== */

  classic: {
    id: "classic",
    name: "Classic Pool",
    description: "Traditional tournament pool hall",

    colors: {
      background: "#111827",
      table: "#176b3a",
      tableDark: "#0b4726",
      rail: "#5b3a29",
      railDark: "#382318",
      cushion: "#0f5132",
      pocket: "#050505",

      text: "#ffffff",
      accent: "#facc15",
      secondary: "#d1d5db",

      player1: "#2563eb",
      player2: "#dc2626",

      success: "#22c55e",
      warning: "#f59e0b",
      danger: "#ef4444"
    },

    effects: {
      glow: false,
      particles: false,
      reflections: true,
      shadows: true
    },

    tableStyle: "classic",
    ballStyle: "standard",
    uiStyle: "classic"
  },


  /* ==========================================================
     RO'LYFE
     ========================================================== */

  rolyfe: {
    id: "rolyfe",
    name: "RO'Lyfe",
    description: "Rooted in Access. Built for Growth.",

    colors: {
      background: "#07111f",
      table: "#064e3b",
      tableDark: "#022c22",
      rail: "#111827",
      railDark: "#030712",
      cushion: "#065f46",
      pocket: "#000000",

      text: "#f8fafc",
      accent: "#22c55e",
      secondary: "#94a3b8",

      player1: "#22c55e",
      player2: "#38bdf8",

      success: "#22c55e",
      warning: "#facc15",
      danger: "#ef4444"
    },

    effects: {
      glow: true,
      particles: true,
      reflections: true,
      shadows: true
    },

    tableStyle: "rolyfe",
    ballStyle: "premium",
    uiStyle: "rolyfe"
  },


  /* ==========================================================
     EMG
     ========================================================== */

  emg: {
    id: "emg",
    name: "EMG",
    description: "Elite Mode Gaming",

    colors: {
      background: "#030712",
      table: "#111827",
      tableDark: "#020617",
      rail: "#0f172a",
      railDark: "#000000",
      cushion: "#1e293b",
      pocket: "#000000",

      text: "#ffffff",
      accent: "#a855f7",
      secondary: "#64748b",

      player1: "#a855f7",
      player2: "#06b6d4",

      success: "#22c55e",
      warning: "#facc15",
      danger: "#f43f5e"
    },

    effects: {
      glow: true,
      particles: true,
      reflections: true,
      shadows: true
    },

    tableStyle: "emg",
    ballStyle: "neon",
    uiStyle: "gaming"
  },


  /* ==========================================================
     ACE / VINCIBLE
     ========================================================== */

  ace: {
    id: "ace",
    name: "ACE",
    description: "Vincible — play like you cannot be stopped",

    colors: {
      background: "#020617",
      table: "#0c4a6e",
      tableDark: "#082f49",
      rail: "#111827",
      railDark: "#020617",
      cushion: "#075985",
      pocket: "#000000",

      text: "#ffffff",
      accent: "#38bdf8",
      secondary: "#bae6fd",

      player1: "#38bdf8",
      player2: "#f97316",

      success: "#22c55e",
      warning: "#facc15",
      danger: "#ef4444"
    },

    effects: {
      glow: true,
      particles: true,
      reflections: true,
      shadows: true
    },

    tableStyle: "ace",
    ballStyle: "energy",
    uiStyle: "competitive"
  },


  /* ==========================================================
     BUSINESS
     ========================================================== */

  business: {
    id: "business",
    name: "Business",
    description: "Strategy. Execution. Capital.",

    colors: {
      background: "#0f172a",
      table: "#14532d",
      tableDark: "#052e16",
      rail: "#1e293b",
      railDark: "#020617",
      cushion: "#166534",
      pocket: "#000000",

      text: "#f8fafc",
      accent: "#f59e0b",
      secondary: "#94a3b8",

      player1: "#f59e0b",
      player2: "#3b82f6",

      success: "#22c55e",
      warning: "#f59e0b",
      danger: "#ef4444"
    },

    effects: {
      glow: true,
      particles: false,
      reflections: true,
      shadows: true
    },

    tableStyle: "executive",
    ballStyle: "premium",
    uiStyle: "executive"
  },


  /* ==========================================================
     REAL ESTATE
     ========================================================== */

  realestate: {
    id: "realestate",
    name: "Real Estate",
    description: "Acquire. Finance. Build. Exit.",

    colors: {
      background: "#111827",
      table: "#365314",
      tableDark: "#1a2e05",
      rail: "#292524",
      railDark: "#0c0a09",
      cushion: "#3f6212",
      pocket: "#000000",

      text: "#ffffff",
      accent: "#84cc16",
      secondary: "#a8a29e",

      player1: "#84cc16",
      player2: "#eab308",

      success: "#22c55e",
      warning: "#eab308",
      danger: "#ef4444"
    },

    effects: {
      glow: true,
      particles: false,
      reflections: true,
      shadows: true
    },

    tableStyle: "realestate",
    ballStyle: "premium",
    uiStyle: "financial"
  },


  /* ==========================================================
     INVESTOR
     ========================================================== */

  investor: {
    id: "investor",
    name: "Investor",
    description: "Risk. Reward. Position.",

    colors: {
      background: "#020617",
      table: "#064e3b",
      tableDark: "#022c22",
      rail: "#334155",
      railDark: "#0f172a",
      cushion: "#047857",
      pocket: "#000000",

      text: "#f8fafc",
      accent: "#10b981",
      secondary: "#94a3b8",

      player1: "#10b981",
      player2: "#f97316",

      success: "#10b981",
      warning: "#f59e0b",
      danger: "#ef4444"
    },

    effects: {
      glow: true,
      particles: true,
      reflections: true,
      shadows: true
    },

    tableStyle: "investor",
    ballStyle: "premium",
    uiStyle: "financial"
  },


  /* ==========================================================
     7FIGURES
     ========================================================== */

  sevenfigures: {
    id: "sevenfigures",
    name: "7FIGURES",
    description: "Think bigger. Play bigger.",

    colors: {
      background: "#09090b",
      table: "#312e81",
      tableDark: "#1e1b4b",
      rail: "#18181b",
      railDark: "#000000",
      cushion: "#4338ca",
      pocket: "#000000",

      text: "#ffffff",
      accent: "#facc15",
      secondary: "#a1a1aa",

      player1: "#facc15",
      player2: "#8b5cf6",

      success: "#22c55e",
      warning: "#facc15",
      danger: "#ef4444"
    },

    effects: {
      glow: true,
      particles: true,
      reflections: true,
      shadows: true
    },

    tableStyle: "luxury",
    ballStyle: "luxury",
    uiStyle: "luxury"
  },


  /* ==========================================================
     MIDNIGHT
     ========================================================== */

  midnight: {
    id: "midnight",
    name: "Midnight",
    description: "Dark table. Sharp game.",

    colors: {
      background: "#000000",
      table: "#172554",
      tableDark: "#020617",
      rail: "#111827",
      railDark: "#000000",
      cushion: "#1e3a8a",
      pocket: "#000000",

      text: "#ffffff",
      accent: "#60a5fa",
      secondary: "#64748b",

      player1: "#60a5fa",
      player2: "#f472b6",

      success: "#22c55e",
      warning: "#facc15",
      danger: "#fb7185"
    },

    effects: {
      glow: true,
      particles: true,
      reflections: true,
      shadows: true
    },

    tableStyle: "midnight",
    ballStyle: "neon",
    uiStyle: "gaming"
  },


  /* ==========================================================
     NEON
     ========================================================== */

  neon: {
    id: "neon",
    name: "Neon",
    description: "Arcade pool after dark",

    colors: {
      background: "#020617",
      table: "#172554",
      tableDark: "#020617",
      rail: "#0f172a",
      railDark: "#000000",
      cushion: "#1d4ed8",
      pocket: "#000000",

      text: "#ffffff",
      accent: "#22d3ee",
      secondary: "#c084fc",

      player1: "#22d3ee",
      player2: "#f472b6",

      success: "#4ade80",
      warning: "#fde047",
      danger: "#fb7185"
    },

    effects: {
      glow: true,
      particles: true,
      reflections: true,
      shadows: true
    },

    tableStyle: "neon",
    ballStyle: "neon",
    uiStyle: "arcade"
  },


  /* ==========================================================
     CHAMPIONSHIP
     ========================================================== */

  championship: {
    id: "championship",
    name: "Championship",
    description: "Tournament mode",

    colors: {
      background: "#18181b",
      table: "#064e3b",
      tableDark: "#022c22",
      rail: "#78350f",
      railDark: "#451a03",
      cushion: "#047857",
      pocket: "#000000",

      text: "#ffffff",
      accent: "#fbbf24",
      secondary: "#d4d4d8",

      player1: "#fbbf24",
      player2: "#f8fafc",

      success: "#22c55e",
      warning: "#f59e0b",
      danger: "#ef4444"
    },

    effects: {
      glow: true,
      particles: false,
      reflections: true,
      shadows: true
    },

    tableStyle: "tournament",
    ballStyle: "professional",
    uiStyle: "tournament"
  }

};


/* ============================================================
   DEFAULT THEME
   ============================================================ */

const DEFAULT_POOL_THEME = "rolyfe";


/* ============================================================
   GET THEME
   ============================================================ */

function getPoolTheme(themeId = DEFAULT_POOL_THEME) {

  return POOL_THEMES[themeId] || POOL_THEMES[DEFAULT_POOL_THEME];

}


/* ============================================================
   LIST THEMES
   ============================================================ */

function getPoolThemes() {

  return Object.values(POOL_THEMES);

}


/* ============================================================
   APPLY THEME
   Adds CSS variables to the document.

   Pool CSS can use:

   var(--pool-bg)
   var(--pool-table)
   var(--pool-accent)
   var(--pool-player1)
   etc.
   ============================================================ */

function applyPoolTheme(themeId = DEFAULT_POOL_THEME) {

  const theme = getPoolTheme(themeId);

  const root = document.documentElement;

  root.style.setProperty("--pool-bg", theme.colors.background);
  root.style.setProperty("--pool-table", theme.colors.table);
  root.style.setProperty("--pool-table-dark", theme.colors.tableDark);

  root.style.setProperty("--pool-rail", theme.colors.rail);
  root.style.setProperty("--pool-rail-dark", theme.colors.railDark);
  root.style.setProperty("--pool-cushion", theme.colors.cushion);
  root.style.setProperty("--pool-pocket", theme.colors.pocket);

  root.style.setProperty("--pool-text", theme.colors.text);
  root.style.setProperty("--pool-accent", theme.colors.accent);
  root.style.setProperty("--pool-secondary", theme.colors.secondary);

  root.style.setProperty("--pool-player1", theme.colors.player1);
  root.style.setProperty("--pool-player2", theme.colors.player2);

  root.style.setProperty("--pool-success", theme.colors.success);
  root.style.setProperty("--pool-warning", theme.colors.warning);
  root.style.setProperty("--pool-danger", theme.colors.danger);

  root.dataset.poolTheme = theme.id;

  return theme;

}


/* ============================================================
   SAVE THEME
   ============================================================ */

function savePoolTheme(themeId) {

  if (!POOL_THEMES[themeId]) return false;

  try {

    localStorage.setItem(
      "rolyfe-pool-theme",
      themeId
    );

    return true;

  } catch (error) {

    console.warn(
      "RO'Lyfe Pool: Could not save theme.",
      error
    );

    return false;

  }

}


/* ============================================================
   LOAD SAVED THEME
   ============================================================ */

function loadPoolTheme() {

  try {

    const saved =
      localStorage.getItem(
        "rolyfe-pool-theme"
      );

    if (saved && POOL_THEMES[saved]) {

      return saved;

    }

  } catch (error) {

    console.warn(
      "RO'Lyfe Pool: Could not load saved theme.",
      error
    );

  }

  return DEFAULT_POOL_THEME;

}


/* ============================================================
   INITIALIZE THEME
   ============================================================ */

function initializePoolTheme() {

  const themeId = loadPoolTheme();

  return applyPoolTheme(themeId);

}


/* ============================================================
   CHANGE THEME
   ============================================================ */

function changePoolTheme(themeId) {

  if (!POOL_THEMES[themeId]) {

    console.warn(
      "RO'Lyfe Pool: Unknown theme:",
      themeId
    );

    return null;

  }

  const theme = applyPoolTheme(themeId);

  savePoolTheme(themeId);

  return theme;

}


/* ============================================================
   OPTIONAL GLOBAL ACCESS
   Makes the theme system easy for pool.js to use.
   ============================================================ */

window.ROLYFE_POOL_THEMES = POOL_THEMES;

window.ROLYFE_POOL_THEME = {

  get: getPoolTheme,

  list: getPoolThemes,

  apply: applyPoolTheme,

  change: changePoolTheme,

  save: savePoolTheme,

  load: loadPoolTheme,

  initialize: initializePoolTheme

};


/* ============================================================
   AUTO INITIALIZE
   ============================================================ */

if (typeof document !== "undefined") {

  if (document.readyState === "loading") {

    document.addEventListener(
      "DOMContentLoaded",
      initializePoolTheme
    );

  } else {

    initializePoolTheme();

  }

      }
