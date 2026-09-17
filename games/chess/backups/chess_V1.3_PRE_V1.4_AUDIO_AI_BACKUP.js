/* =========================================================
   RO’LYFE CHESS™
   games/chess/chess.js
   V1.3 — STABLE ENGINE + RESULT SYSTEM + STATS LOGIC
   ========================================================= */

(() => {
  "use strict";

  if (window.__ROLYFE_CHESS_V13__) return;
  window.__ROLYFE_CHESS_V13__ = true;

  /* =========================================================
     CONFIG
     ========================================================= */

  const CONFIG = {
    version: "1.3",
    startingTime: 600,
    aiThinkDelay: 350,
    maxHistory: 500,
    storageKey: "rolyfe-chess-stats",
    themeKey: "rolyfe-chess-theme"
  };

  /* =========================================================
     AI PROFILES
     ========================================================= */

  const AI_PROFILES = {
    startup: {
      name: "START-UP",
      depth: 1,
      randomness: 0.35
    },

    credit: {
      name: "CREDIT",
      depth: 1,
      randomness: 0.20
    },

    line: {
      name: "LINE",
      depth: 2,
      randomness: 0.12
    },

    investor: {
      name: "INVESTOR",
      depth: 2,
      randomness: 0.08
    },

    sevenfigures: {
      name: "7FIGURES",
      depth: 2,
      randomness: 0.04
    },

    ace: {
      name: "ACE",
      depth: 2,
      randomness: 0.02
    },

    emg: {
      name: "EMG",
      depth: 2,
      randomness: 0.02
    }
  };

  /* =========================================================
     CHESS PIECES
     ========================================================= */

  const PIECES = {
    w: {
      k: "♔",
      q: "♕",
      r: "♖",
      b: "♗",
      n: "♘",
      p: "♙"
    },

    b: {
      k: "♚",
      q: "♛",
      r: "♜",
      b: "♝",
      n: "♞",
      p: "♟"
    }
  };

  const PIECE_NAMES = {
    k: "King",
    q: "Queen",
    r: "Rook",
    b: "Bishop",
    n: "Knight",
    p: "Pawn"
  };

  const PIECE_VALUES = {
    p: 100,
    n: 320,
    b: 330,
    r: 500,
    q: 900,
    k: 20000
  };

  const FILES = [
    "a",
    "b",
    "c",
    "d",
    "e",
    "f",
    "g",
    "h"
  ];

  /* =========================================================
     DOM
     ========================================================= */

  const $ = id =>
    document.getElementById(id);

  const els = {
    board: $("chessBoard"),

    gameStatus: $("gameStatus"),
    turnStatus: $("turnStatus"),
    modeStatus: $("modeStatus"),
    gameMode: $("gameMode"),

    aiProfile: $("aiProfile"),
    difficultyLevel: $("difficultyLevel"),
    aiSpeed: $("aiSpeed"),

    whitePlayerName: $("whitePlayerName"),
    blackPlayerName: $("blackPlayerName"),
    whitePlayerLevel: $("whitePlayerLevel"),
    blackPlayerLevel: $("blackPlayerLevel"),

    whiteClock: $("whiteClock"),
    blackClock: $("blackClock"),

    checkStatus: $("checkStatus"),
    moveStatus: $("moveStatus"),
    moveNumber: $("moveNumber"),

    whiteCaptured: $("whiteCaptured"),
    blackCaptured: $("blackCaptured"),

    moveHistory: $("moveHistory"),

    commanderRating: $("commanderRating"),
    gamesPlayed: $("gamesPlayed"),
    gamesWon: $("gamesWon"),
    winRate: $("winRate"),

    gameOverlay: $("gameOverlay"),
    overlayIcon: $("overlayIcon"),
    overlayTitle: $("overlayTitle"),
    overlayMessage: $("overlayMessage"),

    startGameButton: $("startGameButton"),
    aiStartButton: $("aiStartButton"),
    pauseGameButton: $("pauseGameButton"),
    resignButton: $("resignButton"),
    resetGameButton: $("resetGameButton"),

    themeButton: $("themeButton"),

    overlayRestartButton: $("overlayRestartButton"),
    overlayCloseButton: $("overlayCloseButton"),

    clearHistoryButton: $("clearHistoryButton")
  };

  /* =========================================================
     STATE
     ========================================================= */

  const state = {
    board: [],
    turn: "w",

    gameMode: "pvp",
    aiProfile: "startup",
    aiSpeed: "normal",

    selected: null,
    legalMoves: [],

    started: false,
    paused: false,
    gameOver: false,

    whiteTime: CONFIG.startingTime,
    blackTime: CONFIG.startingTime,

    lastMove: null,
    moveHistory: [],

    captured: {
      w: [],
      b: []
    },

    halfmove: 0,
    fullmove: 1,

    castling: {
      wK: true,
      wQ: true,
      bK: true,
      bQ: true
    },

    enPassant: null,

    aiThinking: false,
    aiTimer: null,
    clockTimer: null,

    result: null,

    /*
     * Result guard.
     *
     * A game can end from checkmate, timeout,
     * resignation, stalemate, 50-move rule, or
     * insufficient material.
     *
     * This prevents the same game from being
     * counted more than once.
     */
    resultRecorded: false,

    stats: {
      played: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      rating: 1200
    }
  };

  /* =========================================================
     HELPERS
     ========================================================= */

  function clonePiece(piece) {
    return piece
      ? {
          color: piece.color,
          type: piece.type
        }
      : null;
  }

  function cloneBoard(board) {
    return board.map(row =>
      row.map(clonePiece)
    );
  }

  function inside(r, c) {
    return (
      r >= 0 &&
      r < 8 &&
      c >= 0 &&
      c < 8
    );
  }

  function opposite(color) {
    return color === "w"
      ? "b"
      : "w";
  }

  function squareName(r, c) {
    return (
      FILES[c] +
      (8 - r)
    );
  }

  function parseSquare(square) {
    return {
      r:
        8 -
        Number(square[1]),
      c:
        FILES.indexOf(
          square[0]
        )
    };
  }

  function formatTime(seconds) {
    seconds = Math.max(
      0,
      Math.floor(seconds)
    );

    const m =
      Math.floor(
        seconds / 60
      );

    const s =
      seconds % 60;

    return (
      String(m).padStart(2, "0") +
      ":" +
      String(s).padStart(2, "0")
    );
  }

  function pieceName(piece) {
    if (!piece) return "";

    return (
      PIECE_NAMES[
        piece.type
      ] || ""
    );
  }

  function modeLabel(mode) {
    const labels = {
      pvp: "Player vs Player",
      pve: "Player vs AI",
      eve: "AI vs AI",
      battle: "AI Battle"
    };

    return (
      labels[mode] ||
      mode
    );
  }

  function aiName(profile) {
    return AI_PROFILES[profile]
      ? AI_PROFILES[profile].name
      : "AI";
  }

  /*
   * Commander represents the human player.
   *
   * PVP:
   * Commander = White / Player 1
   *
   * PVE:
   * Commander = White / Player 1
   *
   * EVE:
   * No Commander
   *
   * Battle:
   * No Commander
   */
  function getHumanColor() {
    if (
      state.gameMode === "pve"
    ) {
      return "w";
    }

    if (
      state.gameMode === "pvp"
    ) {
      return "w";
    }

    return null;
  }

  function isAIColor(color) {
    if (
      state.gameMode === "eve"
    ) {
      return true;
    }

    if (
      state.gameMode === "battle"
    ) {
      return true;
    }

    if (
      state.gameMode === "pve" &&
      color === "b"
    ) {
      return true;
    }

    return false;
  }

  function getAIProfileForColor(color) {
    if (
      state.gameMode === "eve"
    ) {
      return color === "w"
        ? "ace"
        : "emg";
    }

    if (
      state.gameMode === "battle"
    ) {
      return color === "w"
        ? "ace"
        : "sevenfigures";
    }

    return state.aiProfile;
  }

  /* =========================================================
     BOARD SETUP
     ========================================================= */

  function createStartingBoard() {
    const board =
      Array.from(
        {
          length: 8
        },
        () =>
          Array(8).fill(null)
      );

    const back = [
      "r",
      "n",
      "b",
      "q",
      "k",
      "b",
      "n",
      "r"
    ];

    for (
      let c = 0;
      c < 8;
      c++
    ) {
      board[0][c] = {
        color: "b",
        type: back[c]
      };

      board[1][c] = {
        color: "b",
        type: "p"
      };

      board[6][c] = {
        color: "w",
        type: "p"
      };

      board[7][c] = {
        color: "w",
        type: back[c]
      };
    }

    return board;
  }

  function resetPosition() {
    state.board =
      createStartingBoard();

    state.turn = "w";

    state.selected = null;
    state.legalMoves = [];

    state.started = false;
    state.paused = false;
    state.gameOver = false;

    state.whiteTime =
      CONFIG.startingTime;

    state.blackTime =
      CONFIG.startingTime;

    state.lastMove = null;
    state.moveHistory = [];

    state.captured = {
      w: [],
      b: []
    };

    state.halfmove = 0;
    state.fullmove = 1;

    state.castling = {
      wK: true,
      wQ: true,
      bK: true,
      bQ: true
    };

    state.enPassant = null;

    state.aiThinking = false;
    state.aiTimer = null;
    state.clockTimer = null;

    state.result = null;
    state.resultRecorded = false;

    clearAITimer();
    stopClock();
  }

  /* =========================================================
     MOVE GENERATION
     ========================================================= */

  function generatePseudoMoves(
    board,
    r,
    c,
    context
  ) {
    const piece =
      board[r][c];

    if (!piece) {
      return [];
    }

    const moves = [];

    const add = (
      toR,
      toC,
      extra
    ) => {
      if (
        !inside(
          toR,
          toC
        )
      ) {
        return;
      }

      const target =
        board[toR][toC];

      if (
        target &&
        target.color ===
          piece.color
      ) {
        return;
      }

      moves.push({
        fromR: r,
        fromC: c,
        toR,
        toC,
        ...(extra || {})
      });
    };

    if (
      piece.type === "p"
    ) {
      const direction =
        piece.color === "w"
          ? -1
          : 1;

      const startRow =
        piece.color === "w"
          ? 6
          : 1;

      const one =
        r + direction;

      if (
        inside(one, c) &&
        !board[one][c]
      ) {
        add(
          one,
          c,
          {
            promotion:
              one === 0 ||
              one === 7
                ? "q"
                : null
          }
        );

        const two =
          r +
          direction *
            2;

        if (
          r === startRow &&
          !board[two][c]
        ) {
          add(
            two,
            c,
            {
              doublePawn: true
            }
          );
        }
      }

      for (
        const dc of [-1, 1]
      ) {
        const tr =
          r + direction;

        const tc =
          c + dc;

        if (
          !inside(
            tr,
            tc
          )
        ) {
          continue;
        }

        const target =
          board[tr][tc];

        if (
          target &&
          target.color !==
            piece.color
        ) {
          add(
            tr,
            tc,
            {
              promotion:
                tr === 0 ||
                tr === 7
                  ? "q"
                  : null
            }
          );
        }

        if (
          context &&
          context.enPassant &&
          context.enPassant.r ===
            tr &&
          context.enPassant.c ===
            tc
        ) {
          add(
            tr,
            tc,
            {
              enPassant: true
            }
          );
        }
      }

      return moves;
    }

    if (
      piece.type === "n"
    ) {
      const jumps = [
        [-2, -1],
        [-2, 1],
        [-1, -2],
        [-1, 2],
        [1, -2],
        [1, 2],
        [2, -1],
        [2, 1]
      ];

      jumps.forEach(
        ([dr, dc]) =>
          add(
            r + dr,
            c + dc
          )
      );

      return moves;
    }

    const slide =
      directions => {
        directions.forEach(
          ([dr, dc]) => {
            let tr =
              r + dr;

            let tc =
              c + dc;

            while (
              inside(
                tr,
                tc
              )
            ) {
              const target =
                board[tr][tc];

              if (!target) {
                add(
                  tr,
                  tc
                );
              } else {
                if (
                  target.color !==
                    piece.color
                ) {
                  add(
                    tr,
                    tc
                  );
                }

                break;
              }

              tr += dr;
              tc += dc;
            }
          }
        );
      };

    if (
      piece.type === "b"
    ) {
      slide([
        [-1, -1],
        [-1, 1],
        [1, -1],
        [1, 1]
      ]);

      return moves;
    }

    if (
      piece.type === "r"
    ) {
      slide([
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1]
      ]);

      return moves;
    }

    if (
      piece.type === "q"
    ) {
      slide([
        [-1, -1],
        [-1, 1],
        [1, -1],
        [1, 1],
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1]
      ]);

      return moves;
    }

    if (
      piece.type === "k"
    ) {
      for (
        let dr = -1;
        dr <= 1;
        dr++
      ) {
        for (
          let dc = -1;
          dc <= 1;
          dc++
        ) {
          if (
            dr === 0 &&
            dc === 0
          ) {
            continue;
          }

          add(
            r + dr,
            c + dc
          );
        }
      }

      const castling =
        context &&
        context.castling;

      if (castling) {
        if (
          piece.color === "w" &&
          r === 7 &&
          c === 4
        ) {
          if (
            castling.wK &&
            !board[7][5] &&
            !board[7][6] &&
            board[7][7] &&
            board[7][7].type ===
              "r" &&
            board[7][7].color ===
              "w"
          ) {
            moves.push({
              fromR: 7,
              fromC: 4,
              toR: 7,
              toC: 6,
              castle: "K"
            });
          }

          if (
            castling.wQ &&
            !board[7][3] &&
            !board[7][2] &&
            !board[7][1] &&
            board[7][0] &&
            board[7][0].type ===
              "r" &&
            board[7][0].color ===
              "w"
          ) {
            moves.push({
              fromR: 7,
              fromC: 4,
              toR: 7,
              toC: 2,
              castle: "Q"
            });
          }
        }

        if (
          piece.color === "b" &&
          r === 0 &&
          c === 4
        ) {
          if (
            castling.bK &&
            !board[0][5] &&
            !board[0][6] &&
            board[0][7] &&
            board[0][7].type ===
              "r" &&
            board[0][7].color ===
              "b"
          ) {
            moves.push({
              fromR: 0,
              fromC: 4,
              toR: 0,
              toC: 6,
              castle: "K"
            });
          }

          if (
            castling.bQ &&
            !board[0][3] &&
            !board[0][2] &&
            !board[0][1] &&
            board[0][0] &&
            board[0][0].type ===
              "r" &&
            board[0][0].color ===
              "b"
          ) {
            moves.push({
              fromR: 0,
              fromC: 4,
              toR: 0,
              toC: 2,
              castle: "Q"
            });
          }
        }
      }

      return moves;
    }

    return moves;
  }

  function isSquareAttacked(
    board,
    r,
    c,
    byColor
  ) {
    for (
      let pr = 0;
      pr < 8;
      pr++
    ) {
      for (
        let pc = 0;
        pc < 8;
        pc++
      ) {
        const piece =
          board[pr][pc];

        if (
          !piece ||
          piece.color !==
            byColor
        ) {
          continue;
        }

        if (
          piece.type === "p"
        ) {
          const dir =
            byColor === "w"
              ? -1
              : 1;

          if (
            pr + dir === r &&
            Math.abs(
              pc - c
            ) === 1
          ) {
            return true;
          }

          continue;
        }

        if (
          piece.type === "k"
        ) {
          if (
            Math.max(
              Math.abs(
                pr - r
              ),
              Math.abs(
                pc - c
              )
            ) === 1
          ) {
            return true;
          }

          continue;
        }

        const moves =
          generatePseudoMoves(
            board,
            pr,
            pc,
            {
              castling: null,
              enPassant: null
            }
          );

        if (
          moves.some(
            m =>
              m.toR === r &&
              m.toC === c
          )
        ) {
          return true;
        }
      }
    }

    return false;
  }

  function findKing(
    board,
    color
  ) {
    for (
      let r = 0;
      r < 8;
      r++
    ) {
      for (
        let c = 0;
        c < 8;
        c++
      ) {
        const piece =
          board[r][c];

        if (
          piece &&
          piece.color ===
            color &&
          piece.type === "k"
        ) {
          return {
            r,
            c
          };
        }
      }
    }

    return null;
  }

  function isInCheck(
    board,
    color
  ) {
    const king =
      findKing(
        board,
        color
      );

    if (!king) {
      return true;
    }

    return isSquareAttacked(
      board,
      king.r,
      king.c,
      opposite(color)
    );
  }

  /* =========================================================
     APPLY MOVE TO SIMULATION
     ========================================================= */

  function applyMoveToBoard(
    board,
    move,
    context
  ) {
    const next =
      cloneBoard(board);

    const piece =
      next[
        move.fromR
      ][move.fromC];

    if (!piece) {
      return next;
    }

    next[
      move.fromR
    ][move.fromC] = null;

    if (move.enPassant) {
      const capturedR =
        piece.color === "w"
          ? move.toR + 1
          : move.toR - 1;

      next[capturedR][
        move.toC
      ] = null;
    }

    next[
      move.toR
    ][move.toC] = {
      color: piece.color,
      type:
        move.promotion ||
        piece.type
    };

    if (move.castle) {
      if (
        move.toC === 6
      ) {
        next[
          move.toR
        ][5] =
          next[
            move.toR
          ][7];

        next[
          move.toR
        ][7] = null;
      }

      if (
        move.toC === 2
      ) {
        next[
          move.toR
        ][3] =
          next[
            move.toR
          ][0];

        next[
          move.toR
        ][0] = null;
      }
    }

    return next;
  }

  function getLegalMovesFromBoard(
    board,
    color,
    context
  ) {
    const legal = [];

    for (
      let r = 0;
      r < 8;
      r++
    ) {
      for (
        let c = 0;
        c < 8;
        c++
      ) {
        const piece =
          board[r][c];

        if (
          !piece ||
          piece.color !==
            color
        ) {
          continue;
        }

        const pseudo =
          generatePseudoMoves(
            board,
            r,
            c,
            context
          );

        for (
          const move of pseudo
        ) {
          if (move.castle) {
            const enemy =
              opposite(color);

            if (
              isInCheck(
                board,
                color
              )
            ) {
              continue;
            }

            const stepC =
              move.toC === 6
                ? 5
                : 3;

            if (
              isSquareAttacked(
                board,
                r,
                stepC,
                enemy
              )
            ) {
              continue;
            }
          }

          const testBoard =
            applyMoveToBoard(
              board,
              move,
              context
            );

          if (
            !isInCheck(
              testBoard,
              color
            )
          ) {
            legal.push(
              move
            );
          }
        }
      }
    }

    return legal;
  }

  function getLegalMoves(
    color
  ) {
    return getLegalMovesFromBoard(
      state.board,
      color,
      {
        castling:
          state.castling,
        enPassant:
          state.enPassant
      }
    );
  }

  /* =========================================================
     SAN
     ========================================================= */

  function getSAN(
    move,
    boardBefore,
    color
  ) {
    const piece =
      boardBefore[
        move.fromR
      ][move.fromC];

    if (!piece) {
      return "";
    }

    if (
      move.castle === "K"
    ) {
      return "O-O";
    }

    if (
      move.castle === "Q"
    ) {
      return "O-O-O";
    }

    const target =
      boardBefore[
        move.toR
      ][move.toC];

    let notation = "";

    if (
      piece.type !== "p"
    ) {
      notation +=
        piece.type.toUpperCase();
    }

    const capture =
      !!target ||
      !!move.enPassant;

    if (
      piece.type === "p" &&
      capture
    ) {
      notation +=
        FILES[
          move.fromC
        ];
    }

    if (capture) {
      notation += "x";
    }

    notation += squareName(
      move.toR,
      move.toC
    );

    if (move.promotion) {
      notation +=
        "=" +
        move.promotion.toUpperCase();
    }

    const after =
      applyMoveToBoard(
        boardBefore,
        move,
        {
          castling:
            state.castling,
          enPassant:
            state.enPassant
        }
      );

    const enemy =
      opposite(color);

    if (
      isInCheck(
        after,
        enemy
      )
    ) {
      const replies =
        getLegalMovesFromBoard(
          after,
          enemy,
          {
            castling:
              state.castling,
            enPassant: null
          }
        );

      notation +=
        replies.length
          ? "+"
          : "#";
    }

    return notation;
  }

  /* =========================================================
     CASTLING RIGHTS
     ========================================================= */

  function updateCastlingRights(
    piece,
    move,
    captured
  ) {
    if (
      piece.type === "k"
    ) {
      if (
        piece.color === "w"
      ) {
        state.castling.wK =
          false;

        state.castling.wQ =
          false;
      } else {
        state.castling.bK =
          false;

        state.castling.bQ =
          false;
      }
    }

    if (
      piece.type === "r"
    ) {
      if (
        piece.color === "w" &&
        move.fromR === 7 &&
        move.fromC === 0
      ) {
        state.castling.wQ =
          false;
      }

      if (
        piece.color === "w" &&
        move.fromR === 7 &&
        move.fromC === 7
      ) {
        state.castling.wK =
          false;
      }

      if (
        piece.color === "b" &&
        move.fromR === 0 &&
        move.fromC === 0
      ) {
        state.castling.bQ =
          false;
      }

      if (
        piece.color === "b" &&
        move.fromR === 0 &&
        move.fromC === 7
      ) {
        state.castling.bK =
          false;
      }
    }

    if (
      captured &&
      captured.type === "r"
    ) {
      if (
        captured.color === "w" &&
        move.toR === 7 &&
        move.toC === 0
      ) {
        state.castling.wQ =
          false;
      }

      if (
        captured.color === "w" &&
        move.toR === 7 &&
        move.toC === 7
      ) {
        state.castling.wK =
          false;
      }

      if (
        captured.color === "b" &&
        move.toR === 0 &&
        move.toC === 0
      ) {
        state.castling.bQ =
          false;
      }

      if (
        captured.color === "b" &&
        move.toR === 0 &&
        move.toC === 7
      ) {
        state.castling.bK =
          false;
      }
    }
  }

  /* =========================================================
     MAKE MOVE
     ========================================================= */

  function makeMove(move) {
    if (
      state.gameOver ||
      state.paused
    ) {
      return false;
    }

    const piece =
      state.board[
        move.fromR
      ][move.fromC];

    if (!piece) {
      return false;
    }

    const movingColor =
      piece.color;

    const captured =
      move.enPassant
        ? state.board[
            piece.color === "w"
              ? move.toR + 1
              : move.toR - 1
          ]
        : state.board[
            move.toR
          ][move.toC];

    const notation =
      getSAN(
        move,
        state.board,
        movingColor
      );

    updateCastlingRights(
      piece,
      move,
      captured
    );

    state.board =
      applyMoveToBoard(
        state.board,
        move,
        {
          castling:
            state.castling,
          enPassant:
            state.enPassant
        }
      );

    if (captured) {
      state.captured[
        movingColor
      ].push(
        clonePiece(
          captured
        )
      );
    }

    if (
      piece.type === "p" &&
      Math.abs(
        move.toR -
          move.fromR
      ) === 2
    ) {
      state.enPassant = {
        r:
          (
            move.fromR +
            move.toR
          ) / 2,
        c: move.fromC
      };
    } else {
      state.enPassant =
        null;
    }

    if (
      piece.type === "p" ||
      captured
    ) {
      state.halfmove = 0;
    } else {
      state.halfmove++;
    }

    const historyNumber =
      state.fullmove;

    state.moveHistory.push({
      number:
        historyNumber,

      color:
        movingColor,

      notation,

      move: {
        ...move,

        piece:
          clonePiece(
            piece
          ),

        captured:
          captured
            ? clonePiece(
                captured
              )
            : null
      }
    });

    if (
      state.moveHistory
        .length >
      CONFIG.maxHistory
    ) {
      state.moveHistory.shift();
    }

    if (
      movingColor === "b"
    ) {
      state.fullmove++;
    }

    state.turn =
      opposite(
        state.turn
      );

    state.lastMove = {
      ...move,
      notation
    };

    state.selected = null;
    state.legalMoves = [];

    renderAll();

    checkGameState();

    if (
      !state.gameOver &&
      state.started &&
      isAIColor(
        state.turn
      )
    ) {
      scheduleAI();
    }

    return true;
  }

  /* =========================================================
     DRAW DETECTION
     ========================================================= */

  function insufficientMaterial() {
    const pieces = [];

    for (
      let r = 0;
      r < 8;
      r++
    ) {
      for (
        let c = 0;
        c < 8;
        c++
      ) {
        const piece =
          state.board[r][c];

        if (
          piece &&
          piece.type !== "k"
        ) {
          pieces.push({
            ...piece,
            r,
            c
          });
        }
      }
    }

    if (
      pieces.length === 0
    ) {
      return true;
    }

    if (
      pieces.length === 1
    ) {
      return (
        pieces[0].type === "b" ||
        pieces[0].type === "n"
      );
    }

    if (
      pieces.length === 2 &&
      pieces.every(
        p =>
          p.type === "b"
      )
    ) {
      const squareColors =
        pieces.map(
          p =>
            (
              p.r + p.c
            ) % 2
        );

      return (
        squareColors[0] ===
        squareColors[1]
      );
    }

    return false;
  }

  function checkGameState() {
    if (
      state.gameOver
    ) {
      return;
    }

    const color =
      state.turn;

    const inCheck =
      isInCheck(
        state.board,
        color
      );

    const legal =
      getLegalMoves(
        color
      );

    if (
      legal.length === 0
    ) {
      if (inCheck) {
        finishGame(
          opposite(color),
          "checkmate",
          color
        );
      } else {
        finishDraw(
          "stalemate"
        );
      }

      return;
    }

    if (
      state.halfmove >=
      100
    ) {
      finishDraw(
        "50-move rule"
      );

      return;
    }

    if (
      insufficientMaterial()
    ) {
      finishDraw(
        "insufficient material"
      );

      return;
    }

    updateCheckDisplay(
      inCheck
    );

    updateBoardStatus();
  }

  /* =========================================================
     RESULT / STATS SYSTEM V1.3
     ========================================================= */

  function recordResult(
    resultType,
    winner,
    loser,
    reason
  ) {
    /*
     * HARD SAFETY:
     * Never record the same game twice.
     */
    if (
      state.resultRecorded
    ) {
      return;
    }

    state.resultRecorded =
      true;

    const human =
      getHumanColor();

    /*
     * Every completed game counts
     * toward Games Played.
     */
    state.stats.played++;

    /*
     * Draw.
     */
    if (
      resultType === "draw"
    ) {
      state.stats.draws++;

      saveStats();
      renderStats();

      return;
    }

    /*
     * AI vs AI / Battle:
     *
     * There is no Commander.
     * Therefore neither side can
     * create a Commander win/loss.
     *
     * The game still counts as played.
     */
    if (!human) {
      saveStats();
      renderStats();

      return;
    }

    /*
     * Commander WIN.
     */
    if (
      winner === human
    ) {
      state.stats.wins++;

      state.stats.rating +=
        20;

      saveStats();
      renderStats();

      return;
    }

    /*
     * Commander LOSS.
     *
     * Applies to:
     * - checkmate
     * - timeout
     * - resignation
     */
    if (
      loser === human
    ) {
      state.stats.losses++;

      state.stats.rating =
        Math.max(
          1000,
          state.stats.rating -
            10
        );

      saveStats();
      renderStats();

      return;
    }

    /*
     * Defensive fallback.
     *
     * The game was completed but
     * no human winner/loss relation
     * could be established.
     */
    saveStats();
    renderStats();
  }

  function finishGame(
    winner,
    reason,
    loser
  ) {
    if (
      state.gameOver
    ) {
      return;
    }

    state.gameOver = true;
    state.started = false;
    state.paused = false;

    clearAITimer();
    stopClock();

    state.result = {
      type:
        reason ===
        "checkmate"
          ? "checkmate"
          : "win",

      winner,
      loser,
      reason
    };

    /*
     * Record the result exactly once.
     */
    recordResult(
      "win",
      winner,
      loser,
      reason
    );

    const winnerName =
      winner === "w"
        ? "White"
        : "Black";

    const loserName =
      loser === "w"
        ? "White"
        : "Black";

    const last =
      state.moveHistory[
        state.moveHistory
          .length - 1
      ];

    const finalMove =
      last
        ? last.number +
          ". " +
          last.notation
        : "";

    let title =
      "CHECKMATE!";

    let icon = "♛";

    if (
      reason ===
      "timeout"
    ) {
      title = "TIME";
      icon = "⏱";
    }

    if (
      reason ===
      "resignation"
    ) {
      title =
        "RESIGNATION";
      icon = "🏳";
    }

    showOverlay(
      icon,
      title,
      winnerName +
        " Wins" +
        (
          finalMove
            ? " • " +
              finalMove
            : ""
        )
    );

    updateCheckDisplay(
      true
    );

    updateBoardStatus();

    if (
      els.checkStatus
    ) {
      if (
        reason ===
        "checkmate"
      ) {
        els.checkStatus.textContent =
          loserName +
          " is checkmated";
      } else if (
        reason ===
        "timeout"
      ) {
        els.checkStatus.textContent =
          loserName +
          " ran out of time";
      } else if (
        reason ===
        "resignation"
      ) {
        els.checkStatus.textContent =
          loserName +
          " resigned";
      }
    }
  }

  function finishDraw(
    reason
  ) {
    if (
      state.gameOver
    ) {
      return;
    }

    state.gameOver = true;
    state.started = false;
    state.paused = false;

    clearAITimer();
    stopClock();

    state.result = {
      type: "draw",
      reason
    };

    /*
     * Record draw exactly once.
     */
    recordResult(
      "draw",
      null,
      null,
      reason
    );

    showOverlay(
      "½",
      "DRAW",
      reason
    );

    updateBoardStatus();

    if (
      els.checkStatus
    ) {
      els.checkStatus.textContent =
        "Draw • " +
        reason;
    }
  }

  /* =========================================================
     OVERLAY
     ========================================================= */

  function showOverlay(
    icon,
    title,
    message
  ) {
    if (
      els.overlayIcon
    ) {
      els.overlayIcon.textContent =
        icon;
    }

    if (
      els.overlayTitle
    ) {
      els.overlayTitle.textContent =
        title;
    }

    if (
      els.overlayMessage
    ) {
      els.overlayMessage.textContent =
        message;
    }

    if (
      els.gameOverlay
    ) {
      els.gameOverlay.classList.remove(
        "hidden"
      );

      els.gameOverlay.style.display =
        "flex";
    }
  }

  function closeOverlay() {
    if (
      !els.gameOverlay
    ) {
      return;
    }

    els.gameOverlay.classList.add(
      "hidden"
    );

    els.gameOverlay.style.display =
      "none";
  }

  /* =========================================================
     BOARD RENDER
     ========================================================= */

  function renderBoard() {
    if (!els.board) {
      return;
    }

    els.board.innerHTML =
      "";

    for (
      let r = 0;
      r < 8;
      r++
    ) {
      for (
        let c = 0;
        c < 8;
        c++
      ) {
        const square =
          document.createElement(
            "button"
          );

        square.type =
          "button";

        square.className =
          "chess-square " +
          (
            (r + c) % 2 ===
            0
              ? "light"
              : "dark"
          );

        square.dataset.row =
          r;

        square.dataset.col =
          c;

        const piece =
          state.board[r][c];

        if (
          state.selected &&
          state.selected.r === r &&
          state.selected.c === c
        ) {
          square.classList.add(
            "selected"
          );
        }

        if (
          state.lastMove &&
          (
            (
              state.lastMove
                .fromR === r &&
              state.lastMove
                .fromC === c
            ) ||
            (
              state.lastMove
                .toR === r &&
              state.lastMove
                .toC === c
            )
          )
        ) {
          square.classList.add(
            "last-move"
          );
        }

        if (
          state.legalMoves.some(
            m =>
              m.toR === r &&
              m.toC === c
          )
        ) {
          square.classList.add(
            "legal-move"
          );
        }

        if (piece) {
          const span =
            document.createElement(
              "span"
            );

          span.className =
            "chess-piece " +
            (
              piece.color ===
              "w"
                ? "white-piece"
                : "black-piece"
            );

          span.textContent =
            PIECES[
              piece.color
            ][
              piece.type
            ];

          square.appendChild(
            span
          );
        }

        square.addEventListener(
          "click",
          () =>
            handleSquareClick(
              r,
              c
            )
        );

        els.board.appendChild(
          square
        );
      }
    }
  }

  /* =========================================================
     CLICK / PLAYER MOVE
     ========================================================= */

  function handleSquareClick(
    r,
    c
  ) {
    if (
      state.gameOver ||
      state.paused ||
      !state.started ||
      state.aiThinking
    ) {
      return;
    }

    if (
      isAIColor(
        state.turn
      )
    ) {
      return;
    }

    const piece =
      state.board[r][c];

    if (
      state.selected
    ) {
      const move =
        state.legalMoves.find(
          m =>
            m.toR === r &&
            m.toC === c
        );

      if (move) {
        makeMove(move);
        return;
      }

      if (
        piece &&
        piece.color ===
          state.turn
      ) {
        selectSquare(
          r,
          c
        );

        return;
      }

      state.selected = null;
      state.legalMoves = [];

      renderBoard();

      return;
    }

    if (
      piece &&
      piece.color ===
        state.turn
    ) {
      selectSquare(
        r,
        c
      );
    }
  }

  function selectSquare(
    r,
    c
  ) {
    const piece =
      state.board[r][c];

    if (
      !piece ||
      piece.color !==
        state.turn
    ) {
      return;
    }

    const legal =
      getLegalMoves(
        state.turn
      ).filter(
        m =>
          m.fromR === r &&
          m.fromC === c
      );

    state.selected = {
      r,
      c
    };

    state.legalMoves =
      legal;

    renderBoard();
  }

  /* =========================================================
     MOVE HISTORY
     ========================================================= */

  function renderHistory() {
    if (
      !els.moveHistory
    ) {
      return;
    }

    els.moveHistory.innerHTML =
      "";

    if (
      !state.moveHistory
        .length
    ) {
      els.moveHistory.textContent =
        "No moves yet.";

      return;
    }

    state.moveHistory.forEach(
      entry => {
        const row =
          document.createElement(
            "div"
          );

        row.className =
          "history-row";

        const color =
          entry.color === "w"
            ? "White"
            : "Black";

        const number =
          entry.color === "w"
            ? entry.number + "."
            : entry.number +
              ". …";

        const name =
          pieceName(
            entry.move
              .piece
          );

        row.textContent =
          number +
          " " +
          color +
          " " +
          name +
          " " +
          entry.notation;

        els.moveHistory.appendChild(
          row
        );
      }
    );
  }

  /* =========================================================
     CAPTURE DISPLAY
     ========================================================= */

  function renderCaptured() {
    if (
      els.whiteCaptured
    ) {
      els.whiteCaptured.textContent =
        state.captured.w
          .map(
            p =>
              PIECES[
                p.color
              ][
                p.type
              ]
          )
          .join(" ");
    }

    if (
      els.blackCaptured
    ) {
      els.blackCaptured.textContent =
        state.captured.b
          .map(
            p =>
              PIECES[
                p.color
              ][
                p.type
              ]
          )
          .join(" ");
    }
  }

  /* =========================================================
     CHECK DISPLAY
     ========================================================= */

  function updateCheckDisplay(
    inCheck
  ) {
    if (
      !els.checkStatus
    ) {
      return;
    }

    if (
      state.gameOver
    ) {
      if (
        state.result &&
        state.result.type ===
          "checkmate"
      ) {
        els.checkStatus.textContent =
          (
            state.result
              .loser === "w"
              ? "White"
              : "Black"
          ) +
          " is checkmated";
      }

      return;
    }

    if (inCheck) {
      els.checkStatus.textContent =
        (
          state.turn ===
          "w"
            ? "White"
            : "Black"
        ) +
        " is in check";
    } else {
      els.checkStatus.textContent =
        "Position clear";
    }
  }

  /* =========================================================
     STATUS
     ========================================================= */

  function updateBoardStatus() {
    if (
      els.gameStatus
    ) {
      if (
        state.gameOver
      ) {
        els.gameStatus.textContent =
          state.result &&
          (
            state.result
              .type ===
            "checkmate"
          )
            ? "Checkmate"
            : state.result &&
              state.result
                .type ===
                "draw"
              ? "Draw"
              : "Game Over";
      } else if (
        state.paused
      ) {
        els.gameStatus.textContent =
          "Paused";
      } else if (
        state.started
      ) {
        els.gameStatus.textContent =
          "Live";
      } else {
        els.gameStatus.textContent =
          "Ready";
      }
    }

    if (
      els.turnStatus
    ) {
      if (
        state.gameOver &&
        state.result &&
        (
          state.result
            .type ===
          "checkmate" ||
          state.result
            .type ===
          "win"
        )
      ) {
        els.turnStatus.textContent =
          state.result
            .winner === "w"
            ? "White Wins"
            : "Black Wins";
      } else if (
        state.gameOver &&
        state.result &&
        state.result
          .type ===
          "draw"
      ) {
        els.turnStatus.textContent =
          "Draw";
      } else {
        els.turnStatus.textContent =
          state.turn ===
          "w"
            ? "White"
            : "Black";
      }
    }

    if (
      els.modeStatus
    ) {
      els.modeStatus.textContent =
        modeLabel(
          state.gameMode
        );
    }

    if (
      els.moveStatus
    ) {
      els.moveStatus.textContent =
        state.lastMove
          ? state.lastMove
              .notation
          : "—";
    }

    if (
      els.moveNumber
    ) {
      els.moveNumber.textContent =
        String(
          Math.max(
            1,
            state.fullmove
          )
        );
    }

    updatePlayerCards();
  }

  function updatePlayerCards() {
    if (
      els.whitePlayerName
    ) {
      els.whitePlayerName.textContent =
        "PLAYER 1";
    }

    if (
      els.blackPlayerName
    ) {
      els.blackPlayerName.textContent =
        "PLAYER 2";
    }

    if (
      els.whitePlayerLevel
    ) {
      els.whitePlayerLevel.textContent =
        state.gameMode ===
          "eve" ||
        state.gameMode ===
          "battle"
          ? aiName(
              getAIProfileForColor(
                "w"
              )
            )
          : "PLAYER";
    }

    if (
      els.blackPlayerLevel
    ) {
      els.blackPlayerLevel.textContent =
        state.gameMode ===
        "pvp"
          ? "PLAYER"
          : aiName(
              getAIProfileForColor(
                "b"
              )
            );
    }
  }

  /* =========================================================
     CLOCK
     ========================================================= */

  function startClock() {
    stopClock();

    state.clockTimer =
      setInterval(() => {
        if (
          !state.started ||
          state.paused ||
          state.gameOver
        ) {
          return;
        }

        if (
          state.turn === "w"
        ) {
          state.whiteTime--;
        } else {
          state.blackTime--;
        }

        updateClocks();

        if (
          state.whiteTime <=
          0
        ) {
          finishTimeout(
            "w"
          );
        }

        if (
          state.blackTime <=
          0
        ) {
          finishTimeout(
            "b"
          );
        }
      }, 1000);
  }

  function stopClock() {
    if (
      state.clockTimer
    ) {
      clearInterval(
        state.clockTimer
      );

      state.clockTimer =
        null;
    }
  }

  function updateClocks() {
    if (
      els.whiteClock
    ) {
      els.whiteClock.textContent =
        formatTime(
          state.whiteTime
        );
    }

    if (
      els.blackClock
    ) {
      els.blackClock.textContent =
        formatTime(
          state.blackTime
        );
    }
  }

  function finishTimeout(
    loser
  ) {
    if (
      state.gameOver
    ) {
      return;
    }

    finishGame(
      opposite(loser),
      "timeout",
      loser
    );
  }

  /* =========================================================
     AI
     ========================================================= */

  function evaluateBoard(
    board
  ) {
    let score = 0;

    for (
      let r = 0;
      r < 8;
      r++
    ) {
      for (
        let c = 0;
        c < 8;
        c++
      ) {
        const piece =
          board[r][c];

        if (!piece) {
          continue;
        }

        let value =
          PIECE_VALUES[
            piece.type
          ];

        if (
          piece.type === "p"
        ) {
          const advancement =
            piece.color === "w"
              ? 6 - r
              : r - 1;

          value +=
            advancement * 8;
        }

        if (
          piece.type === "n" ||
          piece.type === "b"
        ) {
          if (
            r >= 2 &&
            r <= 5 &&
            c >= 2 &&
            c <= 5
          ) {
            value += 15;
          }
        }

        score +=
          piece.color === "w"
            ? value
            : -value;
      }
    }

    return score;
  }

  function minimax(
    board,
    color,
    depth,
    alpha,
    beta,
    context
  ) {
    const legal =
      getLegalMovesFromBoard(
        board,
        color,
        context
      );

    if (
      depth <= 0
    ) {
      return evaluateBoard(
        board
      );
    }

    if (
      !legal.length
    ) {
      if (
        isInCheck(
          board,
          color
        )
      ) {
        return color ===
          "w"
          ? -999999
          : 999999;
      }

      return 0;
    }

    if (
      color === "w"
    ) {
      let best =
        -Infinity;

      for (
        const move of legal
      ) {
        const next =
          applyMoveToBoard(
            board,
            move,
            context
          );

        const score =
          minimax(
            next,
            "b",
            depth - 1,
            alpha,
            beta,
            {
              castling:
                context.castling,
              enPassant:
                null
            }
          );

        best =
          Math.max(
            best,
            score
          );

        alpha =
          Math.max(
            alpha,
            best
          );

        if (
          beta <= alpha
        ) {
          break;
        }
      }

      return best;
    }

    let best =
      Infinity;

    for (
      const move of legal
    ) {
      const next =
        applyMoveToBoard(
          board,
          move,
          context
        );

      const score =
        minimax(
          next,
          "w",
          depth - 1,
          alpha,
          beta,
          {
            castling:
              context.castling,
            enPassant:
              null
          }
        );

      best =
        Math.min(
          best,
          score
        );

      beta =
        Math.min(
          beta,
          best
        );

      if (
        beta <= alpha
      ) {
        break;
      }
    }

    return best;
  }

  function chooseAIMove(
    color
  ) {
    const profileName =
      getAIProfileForColor(
        color
      );

    const profile =
      AI_PROFILES[
        profileName
      ] ||
      AI_PROFILES.startup;

    const legal =
      getLegalMoves(
        color
      );

    if (
      !legal.length
    ) {
      return null;
    }

    const scored =
      legal.map(
        move => {
          const next =
            applyMoveToBoard(
              state.board,
              move,
              {
                castling:
                  state.castling,
                enPassant:
                  state.enPassant
              }
            );

          let score =
            minimax(
              next,
              opposite(color),
              Math.max(
                0,
                profile.depth -
                  1
              ),
              -Infinity,
              Infinity,
              {
                castling:
                  state.castling,
                enPassant:
                  null
              }
            );

          if (
            color === "b"
          ) {
            score = -score;
          }

          const captured =
            state.board[
              move.toR
            ][move.toC];

          if (captured) {
            score +=
              PIECE_VALUES[
                captured.type
              ] *
              0.2;
          }

          return {
            move,
            score:
              score +
              (
                Math.random() -
                0.5
              ) *
              profile.randomness *
              1000
          };
        }
      );

    scored.sort(
      (a, b) =>
        b.score -
        a.score
    );

    return scored[0]
      .move;
  }

  function scheduleAI() {
    clearAITimer();

    if (
      state.gameOver ||
      state.paused ||
      !state.started ||
      !isAIColor(
        state.turn
      )
    ) {
      return;
    }

    state.aiThinking =
      true;

    let delay =
      CONFIG.aiThinkDelay;

    if (
      state.aiSpeed ===
      "blitz"
    ) {
      delay = 150;
    }

    if (
      state.aiSpeed ===
      "slow"
    ) {
      delay = 900;
    }

    state.aiTimer =
      setTimeout(() => {
        state.aiTimer =
          null;

        if (
          state.gameOver ||
          state.paused ||
          !state.started
        ) {
          state.aiThinking =
            false;

          return;
        }

        const move =
          chooseAIMove(
            state.turn
          );

        state.aiThinking =
          false;

        if (move) {
          makeMove(move);
        }
      }, delay);
  }

  function clearAITimer() {
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

  /* =========================================================
     START / RESET
     ========================================================= */

  function startGame() {
    if (
      state.gameOver
    ) {
      resetGame(false);
    }

    state.started = true;
    state.paused = false;
    state.gameOver = false;

    closeOverlay();

    startClock();
    renderAll();

    if (
      isAIColor(
        state.turn
      )
    ) {
      scheduleAI();
    }
  }

  function startAIvsAI() {
    setGameMode("eve");

    resetGame(false);

    state.started = true;
    state.paused = false;

    closeOverlay();

    startClock();
    renderAll();

    scheduleAI();
  }

  function resetGame(
    preserveMode
  ) {
    const currentMode =
      state.gameMode;

    resetPosition();

    if (
      preserveMode &&
      currentMode
    ) {
      state.gameMode =
        currentMode;
    }

    closeOverlay();

    renderAll();
  }

  /* =========================================================
     PAUSE
     ========================================================= */

  function togglePause() {
    if (
      state.gameOver ||
      !state.started
    ) {
      return;
    }

    state.paused =
      !state.paused;

    if (
      state.paused
    ) {
      clearAITimer();
    } else if (
      isAIColor(
        state.turn
      )
    ) {
      scheduleAI();
    }

    if (
      els.pauseGameButton
    ) {
      els.pauseGameButton.textContent =
        state.paused
          ? "RESUME"
          : "PAUSE";
    }

    updateBoardStatus();
    renderBoard();
  }

  /* =========================================================
     RESIGN
     ========================================================= */

  function resignGame() {
    if (
      state.gameOver ||
      !state.started
    ) {
      return;
    }

    const loser =
      state.turn;

    finishGame(
      opposite(loser),
      "resignation",
      loser
    );
  }

  /* =========================================================
     GAME MODE
     ========================================================= */

  function setGameMode(
    mode
  ) {
    if (
      ![
        "pvp",
        "pve",
        "eve",
        "battle"
      ].includes(mode)
    ) {
      mode = "pvp";
    }

    state.gameMode =
      mode;

    if (
      els.gameMode
    ) {
      els.gameMode.value =
        mode;
    }

    resetPosition();

    renderAll();
  }

  /* =========================================================
     STATS STORAGE
     ========================================================= */

  function loadStats() {
    try {
      const raw =
        localStorage.getItem(
          CONFIG.storageKey
        );

      if (!raw) {
        return;
      }

      const saved =
        JSON.parse(raw);

      if (
        saved &&
        typeof saved ===
          "object"
      ) {
        state.stats = {
          played:
            Number(
              saved.played
            ) || 0,

          wins:
            Number(
              saved.wins
            ) || 0,

          losses:
            Number(
              saved.losses
            ) || 0,

          draws:
            Number(
              saved.draws
            ) || 0,

          rating:
            Number(
              saved.rating
            ) || 1200
        };
      }
    } catch (error) {
      /*
       * Safe fallback.
       *
       * Older V1.2 stats that only contain
       * played/wins/rating remain compatible.
       */
    }
  }

  function saveStats() {
    try {
      localStorage.setItem(
        CONFIG.storageKey,
        JSON.stringify(
          state.stats
        )
      );
    } catch (error) {
      /*
       * Safe fallback.
       */
    }
  }

  function renderStats() {
    if (
      els.commanderRating
    ) {
      els.commanderRating.textContent =
        String(
          state.stats.rating
        );
    }

    if (
      els.gamesPlayed
    ) {
      els.gamesPlayed.textContent =
        String(
          state.stats.played
        );
    }

    if (
      els.gamesWon
    ) {
      els.gamesWon.textContent =
        String(
          state.stats.wins
        );
    }

    if (
      els.winRate
    ) {
      const rate =
        state.stats.played
          ? Math.round(
              (
                state.stats.wins /
                state.stats.played
              ) *
                100
            )
          : 0;

      els.winRate.textContent =
        rate + "%";
    }
  }

  function clearHistory() {
    state.moveHistory = [];
    state.lastMove = null;

    renderHistory();
    renderBoard();
    updateBoardStatus();
  }

  /* =========================================================
     CHESS THEME SYSTEM
     ========================================================= */

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

  function getSavedTheme() {
    try {
      const saved =
        localStorage.getItem(
          CONFIG.themeKey
        );

      if (
        saved &&
        CHESS_THEMES[
          saved
        ]
      ) {
        return saved;
      }
    } catch (error) {
      /* fallback */
    }

    return "rolyfe";
  }

  function applyChessTheme(
    themeName
  ) {
    if (
      !CHESS_THEMES[
        themeName
      ]
    ) {
      themeName =
        "rolyfe";
    }

    const theme =
      CHESS_THEMES[
        themeName
      ];

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

    try {
      localStorage.setItem(
        CONFIG.themeKey,
        themeName
      );
    } catch (error) {
      /* Safe fallback */
    }

    if (
      window.ROLyfeChessThemes &&
      typeof
        window.ROLyfeChessThemes
          .apply ===
          "function"
    ) {
      try {
        window.ROLyfeChessThemes.apply(
          themeName
        );
      } catch (error) {
        /* Local theme remains active. */
      }
    }

    if (
      window.ROlyfeChessThemes &&
      typeof
        window.ROlyfeChessThemes
          .apply ===
          "function"
    ) {
      try {
        window.ROlyfeChessThemes.apply(
          themeName
        );
      } catch (error) {
        /* Local theme remains active. */
      }
    }

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

  function cycleTheme() {
    const names =
      Object.keys(
        CHESS_THEMES
      );

    const current =
      getSavedTheme();

    let index =
      names.indexOf(
        current
      );

    index =
      (
        index + 1
      ) %
      names.length;

    applyChessTheme(
      names[index]
    );

    if (
      els.themeButton
    ) {
      const original =
        els.themeButton
          .textContent;

      els.themeButton.textContent =
        CHESS_THEMES[
          names[index]
        ].name.toUpperCase();

      setTimeout(() => {
        if (
          els.themeButton
        ) {
          els.themeButton.textContent =
            original ||
            "THEME";
        }
      }, 700);
    }
  }

  /* =========================================================
     RENDER ALL
     ========================================================= */

  function renderAll() {
    renderBoard();
    renderHistory();
    renderCaptured();
    updateClocks();
    renderStats();
    updateBoardStatus();

    const inCheck =
      isInCheck(
        state.board,
        state.turn
      );

    updateCheckDisplay(
      inCheck
    );
  }

  /* =========================================================
     EVENT BINDING
     ========================================================= */

  function bindEvents() {
    if (
      els.startGameButton
    ) {
      els.startGameButton.onclick =
        startGame;
    }

    if (
      els.aiStartButton
    ) {
      els.aiStartButton.onclick =
        startAIvsAI;
    }

    if (
      els.pauseGameButton
    ) {
      els.pauseGameButton.onclick =
        togglePause;
    }

    if (
      els.resignButton
    ) {
      els.resignButton.onclick =
        resignGame;
    }

    if (
      els.resetGameButton
    ) {
      els.resetGameButton.onclick =
        () =>
          resetGame(false);
    }

    if (
      els.themeButton
    ) {
      els.themeButton.onclick =
        cycleTheme;
    }

    if (
      els.overlayRestartButton
    ) {
      els.overlayRestartButton.onclick =
        () => {
          resetGame(false);
          startGame();
        };
    }

    if (
      els.overlayCloseButton
    ) {
      els.overlayCloseButton.onclick =
        closeOverlay;
    }

    if (
      els.clearHistoryButton
    ) {
      els.clearHistoryButton.onclick =
        clearHistory;
    }

    if (
      els.gameMode
    ) {
      els.gameMode.onchange =
        event =>
          setGameMode(
            event.target.value
          );
    }

    if (
      els.aiProfile
    ) {
      els.aiProfile.onchange =
        event => {
          state.aiProfile =
            event.target.value;

          updatePlayerCards();
        };
    }

    if (
      els.aiSpeed
    ) {
      els.aiSpeed.onchange =
        event => {
          state.aiSpeed =
            event.target.value;
        };
    }

    document.addEventListener(
      "visibilitychange",
      () => {
        if (
          document.hidden &&
          state.started &&
          !state.gameOver &&
          !state.paused
        ) {
          state.paused =
            true;

          clearAITimer();

          if (
            els.pauseGameButton
          ) {
            els.pauseGameButton.textContent =
              "RESUME";
          }

          updateBoardStatus();
        }
      }
    );
  }

  /* =========================================================
     INITIALIZE
     ========================================================= */

  function init() {
    loadStats();

    state.aiProfile =
      els.aiProfile &&
      els.aiProfile.value
        ? els.aiProfile.value
        : "startup";

    state.aiSpeed =
      els.aiSpeed &&
      els.aiSpeed.value
        ? els.aiSpeed.value
        : "normal";

    state.gameMode =
      els.gameMode &&
      els.gameMode.value
        ? els.gameMode.value
        : "pvp";

    resetPosition();

    bindEvents();

    applyChessTheme(
      getSavedTheme()
    );

    renderAll();
  }

  /* =========================================================
     PUBLIC API
     ========================================================= */

  window.ROlyfeChess = {
    version:
      CONFIG.version,

    state,

    start:
      startGame,

    startAI:
      startAIvsAI,

    reset:
      resetGame,

    pause:
      togglePause,

    resign:
      resignGame,

    setMode:
      setGameMode,

    theme: {
      list: () =>
        Object.entries(
          CHESS_THEMES
        ).map(
          ([id, theme]) => ({
            id,
            name:
              theme.name
          })
        ),

      get:
        getSavedTheme,

      set:
        applyChessTheme,

      next:
        cycleTheme
    },

    move:
      makeMove,

    getLegalMoves,

    closeOverlay
  };

  /* =========================================================
     BOOT
     ========================================================= */

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      init,
      {
        once: true
      }
    );
  } else {
    init();
  }

})();
