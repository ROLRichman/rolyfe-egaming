/* =========================================================
   RO’LYFE CHESS
   games/chess/themes.js
   V1.0 — CHESS THEME CONFIGURATION
   ========================================================= */

(() => {
  "use strict";

  const CHESS_THEMES = {
    rolyfe: {
      name: "RO’Lyfe",
      boardLight: "#d9c89e",
      boardDark: "#315d49",
      accent: "#d4af37",
      background: "#07110d",
      surface: "#0d1b15",
      text: "#f5f1df",
      muted: "#9ba99f"
    },

    investor: {
      name: "Investor",
      boardLight: "#e5d8b5",
      boardDark: "#3c5a4b",
      accent: "#d4af37",
      background: "#08100d",
      surface: "#101b16",
      text: "#f4eedb",
      muted: "#a8b0aa"
    },

    midnight: {
      name: "Midnight",
      boardLight: "#9ba7b2",
      boardDark: "#27313b",
      accent: "#7fc8ff",
      background: "#05080c",
      surface: "#0c1218",
      text: "#edf4fa",
      muted: "#8f9ca8"
    },

    classic: {
      name: "Classic",
      boardLight: "#f0d9b5",
      boardDark: "#b58863",
      accent: "#c49a6c",
      background: "#15110d",
      surface: "#211a14",
      text: "#f8f0e5",
      muted: "#b9aa99"
    },

    neon: {
      name: "Neon",
      boardLight: "#b8f7e0",
      boardDark: "#164c46",
      accent: "#00f0a8",
      background: "#030908",
      surface: "#071613",
      text: "#e8fff7",
      muted: "#83afa3"
    }
  };


  function applyTheme(themeName) {

    const theme =
      CHESS_THEMES[themeName] ||
      CHESS_THEMES.rolyfe;

    const root =
      document.documentElement;

    root.style.setProperty(
      "--chess-board-light",
      theme.boardLight
    );

    root.style.setProperty(
      "--chess-board-dark",
      theme.boardDark
    );

    root.style.setProperty(
      "--chess-accent",
      theme.accent
    );

    root.style.setProperty(
      "--chess-background",
      theme.background
    );

    root.style.setProperty(
      "--chess-surface",
      theme.surface
    );

    root.style.setProperty(
      "--chess-text",
      theme.text
    );

    root.style.setProperty(
      "--chess-muted",
      theme.muted
    );

    root.dataset.chessTheme =
      themeName;

    localStorage.setItem(
      "rolyfe-chess-theme",
      themeName
    );

    document.dispatchEvent(
      new CustomEvent(
        "rolyfe:chessthemechange",
        {
          detail: {
            id: themeName,
            theme
          }
        }
      )
    );
  }


  function getTheme() {

    return (
      localStorage.getItem(
        "rolyfe-chess-theme"
      ) ||
      "rolyfe"
    );
  }


  function setTheme(themeName) {

    if (
      !CHESS_THEMES[themeName]
    ) {
      themeName = "rolyfe";
    }

    applyTheme(themeName);
  }


  function nextTheme() {

    const names =
      Object.keys(
        CHESS_THEMES
      );

    const current =
      getTheme();

    const index =
      names.indexOf(current);

    const next =
      names[
        (index + 1) %
        names.length
      ];

    applyTheme(next);

    return next;
  }


  function listThemes() {

    return Object.entries(
      CHESS_THEMES
    ).map(
      ([id, theme]) => ({
        id,
        name: theme.name
      })
    );
  }


  window.ROLyfeChessThemes = {
    version: "1.0",

    themes:
      CHESS_THEMES,

    get:
      getTheme,

    set:
      setTheme,

    next:
      nextTheme,

    list:
      listThemes,

    apply:
      applyTheme
  };


  window.ROlyfeChessThemes =
    window.ROLyfeChessThemes;


  document.addEventListener(
    "DOMContentLoaded",
    () => {
      applyTheme(
        getTheme()
      );
    }
  );

})();
