/* =========================================================
   RO’LYFE CHESS
   games/chess/chess.js
   V1.2 — STABLE CHESS ENGINE + GAME RESULTS
   ========================================================= */

(() => {
  "use strict";

  /* =========================================================
     CONFIG
     ========================================================= */

  const CONFIG = {
    startingTime: 600,
    aiThinkDelay: 350,
    maxHistory: 500,
    storageKey: "rolyfe-chess-stats"
  };

  /* =========================================================
     AI PROFILES
     ========================================================= */

  const AI_PROFILES = {
    startup: {
      name: "Start-Up",
      level: 1,
      depth: 1,
      randomness: 0.70
    },

    credit: {
      name: "Credit",
      level: 2,
      depth: 1,
      randomness: 0.55
    },

    line: {
      name: "Line of Credit",
      level: 3,
      depth: 2,
      randomness: 0.35
    },

    investor: {
      name: "Investor",
      level: 4,
      depth: 2,
      randomness: 0.20
    },

    sevenfigures: {
      name: "7Figures",
      level: 5,
      depth: 3,
      randomness: 0.08
    },

    ace: {
      name: "ACE",
      level: 6,
      depth: 3,
      randomness: 0.04
    },

    emg: {
      name: "EMG",
      level: 7,
      depth: 3,
      randomness: 0.02
    }
  };

  /* =========================================================
     PIECES
     ========================================================= */

  const PIECES = {
    w: {
      K: "♔",
      Q: "♕",
      R: "♖",
      B: "♗",
      N: "♘",
      P: "♙"
    },

    b: {
      K: "♚",
      Q: "♛",
      R: "♜",
      B: "♝",
      N: "♞",
      P: "♟"
    }
  };

  const PIECE_NAMES = {
    K: "King",
    Q: "Queen",
    R: "Rook",
    B: "Bishop",
    N: "Knight",
    P: "Pawn"
  };

  const PIECE_VALUES = {
    P: 100,
    N: 320,
    B: 330,
    R: 500,
    Q: 900,
    K: 20000
  };

  /* =========================================================
     DOM
     ========================================================= */

  const $ = id => document.getElementById(id);

  const boardEl = $("chessBoard");
  const gameStatusEl = $("gameStatus");
  const turnStatusEl = $("turnStatus");
  const modeStatusEl = $("modeStatus");

  const gameModeEl = $("gameMode");
  const aiProfileEl = $("aiProfile");
  const difficultyEl = $("difficultyLevel");
  const aiSpeedEl = $("aiSpeed");

  const whitePlayerNameEl = $("whitePlayerName");
  const blackPlayerNameEl = $("blackPlayerName");

  const whitePlayerLevelEl = $("whitePlayerLevel");
  const blackPlayerLevelEl = $("blackPlayerLevel");

  const whiteClockEl = $("whiteClock");
  const blackClockEl = $("blackClock");

  const checkStatusEl = $("checkStatus");
  const moveStatusEl = $("moveStatus");
  const moveNumberEl = $("moveNumber");

  const whiteCapturedEl = $("whiteCaptured");
  const blackCapturedEl = $("blackCaptured");

  const moveHistoryEl = $("moveHistory");

  const commanderRatingEl = $("commanderRating");
  const gamesPlayedEl = $("gamesPlayed");
  const gamesWonEl = $("gamesWon");
  const winRateEl = $("winRate");

  const overlayEl = $("gameOverlay");
  const overlayIconEl = $("overlayIcon");
  const overlayTitleEl = $("overlayTitle");
  const overlayMessageEl = $("overlayMessage");

  const startGameButton = $("startGameButton");
  const aiStartButton = $("aiStartButton");
  const pauseGameButton = $("pauseGameButton");
  const resignButton = $("resignButton");
  const resetGameButton = $("resetGameButton");
  const themeButton = $("themeButton");

  const overlayRestartButton = $("overlayRestartButton");
  const overlayCloseButton = $("overlayCloseButton");
  const clearHistoryButton = $("clearHistoryButton");

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

    stats: {
      played: 0,
      wins: 0,
      rating: 1200
    }
  };

  /* =========================================================
     BOARD CREATION
     ========================================================= */

  function piece(color, type) {
    return {
      color,
      type
    };
  }

  function createInitialBoard() {
    return [
      [
        piece("b", "R"),
        piece("b", "N"),
        piece("b", "B"),
        piece("b", "Q"),
        piece("b", "K"),
        piece("b", "B"),
        piece("b", "N"),
        piece("b", "R")
      ],

      Array.from(
        { length: 8 },
        () => piece("b", "P")
      ),

      Array(8).fill(null),
      Array(8).fill(null),
      Array(8).fill(null),
      Array(8).fill(null),

      Array.from(
        { length: 8 },
        () => piece("w", "P")
      ),

      [
        piece("w", "R"),
        piece("w", "N"),
        piece("w", "B"),
        piece("w", "Q"),
        piece("w", "K"),
        piece("w", "B"),
        piece("w", "N"),
        piece("w", "R")
      ]
    ];
  }

  function cloneBoard(board) {
    return board.map(row =>
      row.map(p =>
        p ? { ...p } : null
      )
    );
  }

  /* =========================================================
     COORDINATES
     ========================================================= */

  function inside(r, c) {
    return (
      r >= 0 &&
      r < 8 &&
      c >= 0 &&
      c < 8
    );
  }

  function squareName(r, c) {
    return (
      String.fromCharCode(97 + c) +
      (8 - r)
    );
  }

  /* =========================================================
     BOARD RENDER
     ========================================================= */

  function renderBoard() {
    if (!boardEl) return;

    boardEl.innerHTML = "";

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const cell =
          document.createElement("button");

        cell.type = "button";

        cell.className =
          "chess-square " +
          (
            (r + c) % 2 === 0
              ? "light"
              : "dark"
          );

        cell.dataset.row = r;
        cell.dataset.col = c;
        cell.dataset.square =
          squareName(r, c);

        const currentPiece =
          state.board[r][c];

        if (
          state.selected &&
          state.selected.r === r &&
          state.selected.c === c
        ) {
          cell.classList.add("selected");
        }

        if (
          state.legalMoves.some(
            move =>
              move.to.r === r &&
              move.to.c === c
          )
        ) {
          cell.classList.add(
            currentPiece
              ? "capture-target"
              : "legal-target"
          );
        }

        if (
          state.lastMove &&
          (
            (
              state.lastMove.from.r === r &&
              state.lastMove.from.c === c
            ) ||
            (
              state.lastMove.to.r === r &&
              state.lastMove.to.c === c
            )
          )
        ) {
          cell.classList.add("last-move");
        }

        const pieceEl =
          document.createElement("span");

        pieceEl.className =
          "chess-piece";

        if (currentPiece) {
          pieceEl.textContent =
            PIECES[
              currentPiece.color
            ][currentPiece.type];

          pieceEl.classList.add(
            currentPiece.color === "w"
              ? "white-piece"
              : "black-piece"
          );

          cell.dataset.piece =
            currentPiece.type;

          cell.dataset.color =
            currentPiece.color;
        }

        cell.appendChild(pieceEl);

        cell.addEventListener(
          "click",
          () => handleSquareClick(r, c)
        );

        boardEl.appendChild(cell);
      }
    }

    updateBoardStatus();
  }

  /* =========================================================
     MOVE GENERATION
     ========================================================= */

  function generatePseudoMoves(
    board,
    r,
    c,
    options = {},
    enPassantState = state.enPassant,
    castlingState = state.castling
  ) {
    const result = [];

    const current =
      board[r][c];

    if (!current) {
      return result;
    }

    const color =
      current.color;

    const enemy =
      color === "w"
        ? "b"
        : "w";

    function addMove(
      tr,
      tc,
      extra = {}
    ) {
      if (!inside(tr, tc)) {
        return;
      }

      const target =
        board[tr][tc];

      if (
        target &&
        target.color === color
      ) {
        return;
      }

      result.push({
        from: { r, c },
        to: {
          r: tr,
          c: tc
        },
        piece: {
          color,
          type: current.type
        },
        capture: !!target,
        ...extra
      });
    }

    /* -------------------------------------------------------
       PAWN
       ------------------------------------------------------- */

    if (current.type === "P") {
      const direction =
        color === "w"
          ? -1
          : 1;

      const startRow =
        color === "w"
          ? 6
          : 1;

      const promotionRow =
        color === "w"
          ? 0
          : 7;

      const oneR =
        r + direction;

      if (
        inside(oneR, c) &&
        !board[oneR][c]
      ) {
        addMove(
          oneR,
          c,
          {
            promotion:
              oneR === promotionRow
                ? "Q"
                : null
          }
        );

        const twoR =
          r + direction * 2;

        if (
          r === startRow &&
          !board[twoR][c]
        ) {
          addMove(
            twoR,
            c,
            {
              pawnDouble: true
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

        if (!inside(tr, tc)) {
          continue;
        }

        const target =
          board[tr][tc];

        if (
          target &&
          target.color === enemy
        ) {
          addMove(
            tr,
            tc,
            {
              promotion:
                tr === promotionRow
                  ? "Q"
                  : null
            }
          );
        }

        if (
          enPassantState &&
          enPassantState.r === tr &&
          enPassantState.c === tc
        ) {
          addMove(
            tr,
            tc,
            {
              enPassant: true,
              capture: true
            }
          );
        }
      }

      return result;
    }

    /* -------------------------------------------------------
       KNIGHT
       ------------------------------------------------------- */

    if (current.type === "N") {
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
          addMove(
            r + dr,
            c + dc
          )
      );

      return result;
    }

    /* -------------------------------------------------------
       BISHOP / ROOK / QUEEN
       ------------------------------------------------------- */

    const directions = [];

    if (
      current.type === "B" ||
      current.type === "Q"
    ) {
      directions.push(
        [-1, -1],
        [-1, 1],
        [1, -1],
        [1, 1]
      );
    }

    if (
      current.type === "R" ||
      current.type === "Q"
    ) {
      directions.push(
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1]
      );
    }

    if (directions.length) {
      for (
        const [dr, dc]
        of directions
      ) {
        let tr = r + dr;
        let tc = c + dc;

        while (
          inside(tr, tc)
        ) {
          const target =
            board[tr][tc];

          if (!target) {
            addMove(tr, tc);
          } else {
            if (
              target.color !== color
            ) {
              addMove(tr, tc);
            }

            break;
          }

          tr += dr;
          tc += dc;
        }
      }

      return result;
    }

    /* -------------------------------------------------------
       KING
       ------------------------------------------------------- */

    if (current.type === "K") {
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

          addMove(
            r + dr,
            c + dc
          );
        }
      }

      if (!options.skipCastling) {
        addCastlingMoves(
          board,
          color,
          r,
          c,
          result,
          castlingState
        );
      }
    }

    return result;
  }

  /* =========================================================
     CASTLING
     ========================================================= */

  function addCastlingMoves(
    board,
    color,
    r,
    c,
    result,
    castlingState
  ) {
    const homeRow =
      color === "w"
        ? 7
        : 0;

    if (
      r !== homeRow ||
      c !== 4
    ) {
      return;
    }

    const enemy =
      color === "w"
        ? "b"
        : "w";

    if (
      isSquareAttacked(
        board,
        homeRow,
        4,
        enemy
      )
    ) {
      return;
    }

    if (
      castlingState[
        color + "K"
      ] &&
      board[homeRow][5] === null &&
      board[homeRow][6] === null &&
      board[homeRow][7] &&
      board[homeRow][7].type === "R" &&
      board[homeRow][7].color === color &&
      !isSquareAttacked(
        board,
        homeRow,
        5,
        enemy
      ) &&
      !isSquareAttacked(
        board,
        homeRow,
        6,
        enemy
      )
    ) {
      result.push({
        from: {
          r,
          c
        },

        to: {
          r: homeRow,
          c: 6
        },

        piece: {
          color,
          type: "K"
        },

        castle: "K"
      });
    }

    if (
      castlingState[
        color + "Q"
      ] &&
      board[homeRow][1] === null &&
      board[homeRow][2] === null &&
      board[homeRow][3] === null &&
      board[homeRow][0] &&
      board[homeRow][0].type === "R" &&
      board[homeRow][0].color === color &&
      !isSquareAttacked(
        board,
        homeRow,
        3,
        enemy
      ) &&
      !isSquareAttacked(
        board,
        homeRow,
        2,
        enemy
      )
    ) {
      result.push({
        from: {
          r,
          c
        },

        to: {
          r: homeRow,
          c: 2
        },

        piece: {
          color,
          type: "K"
        },

        castle: "Q"
      });
    }
  }

  /* =========================================================
     ATTACK DETECTION
     ========================================================= */

  function isSquareAttacked(
    board,
    r,
    c,
    byColor
  ) {
    for (
      let rr = 0;
      rr < 8;
      rr++
    ) {
      for (
        let cc = 0;
        cc < 8;
        cc++
      ) {
        const p =
          board[rr][cc];

        if (
          !p ||
          p.color !== byColor
        ) {
          continue;
        }

        const dr =
          r - rr;

        const dc =
          c - cc;

        /* Pawn */

        if (p.type === "P") {
          const direction =
            byColor === "w"
              ? -1
              : 1;

          if (
            r ===
              rr + direction &&
            Math.abs(dc) === 1
          ) {
            return true;
          }

          continue;
        }

        /* Knight */

        if (p.type === "N") {
          if (
            (
              Math.abs(dr) === 2 &&
              Math.abs(dc) === 1
            ) ||
            (
              Math.abs(dr) === 1 &&
              Math.abs(dc) === 2
            )
          ) {
            return true;
          }

          continue;
        }

        /* King */

        if (p.type === "K") {
          if (
            Math.max(
              Math.abs(dr),
              Math.abs(dc)
            ) === 1
          ) {
            return true;
          }

          continue;
        }

        let validDirection =
          false;

        if (p.type === "B") {
          validDirection =
            Math.abs(dr) ===
            Math.abs(dc);
        }

        if (p.type === "R") {
          validDirection =
            dr === 0 ||
            dc === 0;
        }

        if (p.type === "Q") {
          validDirection =
            dr === 0 ||
            dc === 0 ||
            Math.abs(dr) ===
            Math.abs(dc);
        }

        if (!validDirection) {
          continue;
        }

        const stepR =
          dr === 0
            ? 0
            : dr > 0
              ? 1
              : -1;

        const stepC =
          dc === 0
            ? 0
            : dc > 0
              ? 1
              : -1;

        let tr =
          rr + stepR;

        let tc =
          cc + stepC;

        let blocked = false;

        while (
          tr !== r ||
          tc !== c
        ) {
          if (
            !inside(tr, tc) ||
            board[tr][tc]
          ) {
            blocked = true;
            break;
          }

          tr += stepR;
          tc += stepC;
        }

        if (!blocked) {
          return true;
        }
      }
    }

    return false;
  }

  /* =========================================================
     KING
     ========================================================= */

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
        const p =
          board[r][c];

        if (
          p &&
          p.color === color &&
          p.type === "K"
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
      color === "w"
        ? "b"
        : "w"
    );
  }

  /* =========================================================
     APPLY MOVE
     ========================================================= */

  function applyMoveToBoard(
    board,
    move
  ) {
    const from =
      move.from;

    const to =
      move.to;

    const movingPiece =
      board[from.r][from.c];

    if (!movingPiece) {
      return;
    }

    board[to.r][to.c] = {
      ...movingPiece
    };

    board[from.r][from.c] =
      null;

    /* En passant */

    if (move.enPassant) {
      const captureRow =
        movingPiece.color === "w"
          ? to.r + 1
          : to.r - 1;

      board[captureRow][to.c] =
        null;
    }

    /* Promotion */

    if (move.promotion) {
      board[to.r][to.c] = {
        color:
          movingPiece.color,
        type:
          move.promotion
      };
    }

    /* Castling */

    if (move.castle === "K") {
      const row =
        from.r;

      board[row][5] =
        board[row][7];

      board[row][7] =
        null;
    }

    if (move.castle === "Q") {
      const row =
        from.r;

      board[row][3] =
        board[row][0];

      board[row][0] =
        null;
    }
  }

  /* =========================================================
     LEGAL MOVES
     ========================================================= */

  function getLegalMoves(
    color = state.turn
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
        const p =
          state.board[r][c];

        if (
          !p ||
          p.color !== color
        ) {
          continue;
        }

        const pseudo =
          generatePseudoMoves(
            state.board,
            r,
            c
          );

        for (
          const move of pseudo
        ) {
          const test =
            cloneBoard(
              state.board
            );

          applyMoveToBoard(
            test,
            move
          );

          if (
            !isInCheck(
              test,
              color
            )
          ) {
            legal.push(move);
          }
        }
      }
    }

    return legal;
  }

  function getLegalMovesForPiece(
    r,
    c
  ) {
    return getLegalMoves(
      state.turn
    ).filter(
      move =>
        move.from.r === r &&
        move.from.c === c
    );
  }

  /* =========================================================
     LEGAL MOVES FOR SIMULATION
     ========================================================= */

  function getLegalMovesFromBoard(
    board,
    color,
    castlingState = state.castling,
    enPassantState = state.enPassant
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
        const p =
          board[r][c];

        if (
          !p ||
          p.color !== color
        ) {
          continue;
        }

        const pseudo =
          generatePseudoMoves(
            board,
            r,
            c,
            {},
            enPassantState,
            castlingState
          );

        for (
          const move of pseudo
        ) {
          const test =
            cloneBoard(board);

          applyMoveToBoard(
            test,
            move
          );

          if (
            !isInCheck(
              test,
              color
            )
          ) {
            legal.push(move);
          }
        }
      }
    }

    return legal;
  }

  /* =========================================================
     SAN
     ========================================================= */

  function getSAN(
    move,
    boardBefore
  ) {
    const p =
      boardBefore[
        move.from.r
      ][move.from.c];

    if (!p) {
      return "";
    }

    if (move.castle === "K") {
      return "O-O";
    }

    if (move.castle === "Q") {
      return "O-O-O";
    }

    let notation = "";

    if (p.type !== "P") {
      notation += p.type;
    }

    const target =
      boardBefore[
        move.to.r
      ][move.to.c];

    const capture =
      !!target ||
      !!move.enPassant;

    if (
      p.type === "P" &&
      capture
    ) {
      notation +=
        String.fromCharCode(
          97 + move.from.c
        );
    }

    if (capture) {
      notation += "x";
    }

    notation +=
      squareName(
        move.to.r,
        move.to.c
      );

    if (move.promotion) {
      notation +=
        "=" +
        move.promotion;
    }

    const testBoard =
      cloneBoard(
        boardBefore
      );

    applyMoveToBoard(
      testBoard,
      move
    );

    const enemy =
      p.color === "w"
        ? "b"
        : "w";

    if (
      isInCheck(
        testBoard,
        enemy
      )
    ) {
      const replies =
        getLegalMovesFromBoard(
          testBoard,
          enemy
        );

      notation +=
        replies.length === 0
          ? "#"
          : "+";
    }

    return notation;
  }

  /* =========================================================
     MAKE MOVE
     ========================================================= */

  function makeMove(move) {
    if (
      state.gameOver ||
      state.paused ||
      !state.started
    ) {
      return false;
    }

    const boardBefore =
      cloneBoard(
        state.board
      );

    const movingPiece =
      state.board[
        move.from.r
      ][move.from.c];

    if (!movingPiece) {
      return false;
    }

    const capturedPiece =
      move.enPassant
        ? state.board[
            movingPiece.color === "w"
              ? move.to.r + 1
              : move.to.r - 1
          ][move.to.c]
        : state.board[
            move.to.r
          ][move.to.c];

    const notation =
      getSAN(
        move,
        boardBefore
      );

    applyMoveToBoard(
      state.board,
      move
    );

    if (capturedPiece) {
      state.captured[
        movingPiece.color
      ].push({
        ...capturedPiece
      });
    }

    updateCastlingRights(
      move,
      movingPiece,
      capturedPiece
    );

    state.enPassant = null;

    if (
      movingPiece.type === "P" &&
      Math.abs(
        move.to.r -
        move.from.r
      ) === 2
    ) {
      state.enPassant = {
        r:
          (
            move.to.r +
            move.from.r
          ) / 2,

        c:
          move.from.c
      };
    }

    if (
      movingPiece.type === "P" ||
      capturedPiece
    ) {
      state.halfmove = 0;
    } else {
      state.halfmove++;
    }

    if (
      movingPiece.color === "b"
    ) {
      state.fullmove++;
    }

    state.moveHistory.push({
      number:
        state.fullmove,

      color:
        movingPiece.color,

      notation,

      move: {
        ...move,

        piece: {
          ...movingPiece
        },

        captured:
          capturedPiece
            ? {
                ...capturedPiece
              }
            : null
      }
    });

    if (
      state.moveHistory.length >
      CONFIG.maxHistory
    ) {
      state.moveHistory.shift();
    }

    state.lastMove = {
      from: {
        ...move.from
      },

      to: {
        ...move.to
      }
    };

    state.selected = null;
    state.legalMoves = [];

    /*
     * IMPORTANT:
     * Determine the result BEFORE scheduling another turn.
     */

    state.turn =
      state.turn === "w"
        ? "b"
        : "w";

    renderBoard();
    renderHistory();
    renderCaptured();
    updateAllUI();

    checkGameState();

    if (
      !state.gameOver &&
      shouldAIPlay()
    ) {
      scheduleAI();
    }

    return true;
  }

  /* =========================================================
     CASTLING RIGHTS
     ========================================================= */

  function updateCastlingRights(
    move,
    movingPiece,
    capturedPiece
  ) {
    if (
      movingPiece.type === "K"
    ) {
      state.castling[
        movingPiece.color + "K"
      ] = false;

      state.castling[
        movingPiece.color + "Q"
      ] = false;
    }

    if (
      movingPiece.type === "R"
    ) {
      if (
        move.from.r === 7 &&
        move.from.c === 0
      ) {
        state.castling.wQ =
          false;
      }

      if (
        move.from.r === 7 &&
        move.from.c === 7
      ) {
        state.castling.wK =
          false;
      }

      if (
        move.from.r === 0 &&
        move.from.c === 0
      ) {
        state.castling.bQ =
          false;
      }

      if (
        move.from.r === 0 &&
        move.from.c === 7
      ) {
        state.castling.bK =
          false;
      }
    }

    if (
      capturedPiece &&
      capturedPiece.type === "R"
    ) {
      if (
        move.to.r === 7 &&
        move.to.c === 0
      ) {
        state.castling.wQ =
          false;
      }

      if (
        move.to.r === 7 &&
        move.to.c === 7
      ) {
        state.castling.wK =
          false;
      }

      if (
        move.to.r === 0 &&
        move.to.c === 0
      ) {
        state.castling.bQ =
          false;
      }

      if (
        move.to.r === 0 &&
        move.to.c === 7
      ) {
        state.castling.bK =
          false;
      }
    }
  }

  /* =========================================================
     CLICK HANDLER
     ========================================================= */

  function handleSquareClick(
    r,
    c
  ) {
    if (
      !state.started ||
      state.paused ||
      state.gameOver ||
      state.aiThinking
    ) {
      return;
    }

    if (
      isAIColor(state.turn)
    ) {
      return;
    }

    const clicked =
      state.board[r][c];

    if (state.selected) {
      const chosen =
        state.legalMoves.find(
          move =>
            move.to.r === r &&
            move.to.c === c
        );

      if (chosen) {
        makeMove(chosen);
        return;
      }

      if (
        clicked &&
        clicked.color ===
          state.turn
      ) {
        selectPiece(r, c);
        return;
      }

      clearSelection();
      return;
    }

    if (
      clicked &&
      clicked.color ===
        state.turn
    ) {
      selectPiece(r, c);
    }
  }

  function selectPiece(
    r,
    c
  ) {
    state.selected = {
      r,
      c
    };

    state.legalMoves =
      getLegalMovesForPiece(
        r,
        c
      );

    renderBoard();
  }

  function clearSelection() {
    state.selected = null;
    state.legalMoves = [];
    renderBoard();
  }

  /* =========================================================
     GAME STATE
     ========================================================= */

  function checkGameState() {
    if (state.gameOver) {
      return;
    }

    const legalMoves =
      getLegalMoves(
        state.turn
      );

    const inCheck =
      isInCheck(
        state.board,
        state.turn
      );

    if (
      legalMoves.length === 0
    ) {
      if (inCheck) {
        const winner =
          state.turn === "w"
            ? "b"
            : "w";

        finishGame(
          winner,
          "checkmate"
        );
      } else {
        finishGame(
          null,
          "stalemate"
        );
      }

      return;
    }

    if (
      state.halfmove >= 100
    ) {
      finishGame(
        null,
        "50-move"
      );

      return;
    }

    if (
      insufficientMaterial()
    ) {
      finishGame(
        null,
        "insufficient material"
      );

      return;
    }

    if (inCheck) {
      setText(
        checkStatusEl,
        state.turn === "w"
          ? "White is in check"
          : "Black is in check"
      );

      if (checkStatusEl) {
        checkStatusEl.classList.add(
          "check-warning"
        );
      }
    } else {
      setText(
        checkStatusEl,
        "Clear"
      );

      if (checkStatusEl) {
        checkStatusEl.classList.remove(
          "check-warning"
        );
      }
    }

    updateBoardStatus();
  }

  /* =========================================================
     INSUFFICIENT MATERIAL
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
        const p =
          state.board[r][c];

        if (
          p &&
          p.type !== "K"
        ) {
          pieces.push({
            ...p,
            r,
            c
          });
        }
      }
    }

    if (pieces.length === 0) {
      return true;
    }

    if (pieces.length === 1) {
      return (
        pieces[0].type === "B" ||
        pieces[0].type === "N"
      );
    }

    if (
      pieces.length === 2 &&
      pieces.every(
        p => p.type === "B"
      )
    ) {
      const colors =
        pieces.map(
          p =>
            (p.r + p.c) % 2
        );

      return (
        colors[0] ===
        colors[1]
      );
    }

    return false;
  }

  /* =========================================================
     HUMAN COLOR
     ========================================================= */

  function getHumanColor() {
    const mode =
      getGameMode();

    if (mode === "pve") {
      return "w";
    }

    if (mode === "pvp") {
      return null;
    }

    return null;
  }

  /* =========================================================
     FINISH GAME
     ========================================================= */

  function finishGame(
    winner,
    reason
  ) {
    if (state.gameOver) {
      return;
    }

    state.gameOver = true;
    state.started = false;
    state.paused = false;

    state.result = {
      winner,
      reason
    };

    cancelAI();
    stopClock();

    /*
     * Stats
     */

    state.stats.played++;

    const humanColor =
      getHumanColor();

    if (
      humanColor &&
      winner === humanColor
    ) {
      state.stats.wins++;
      state.stats.rating += 15;
    } else if (
      humanColor &&
      winner &&
      winner !== humanColor
    ) {
      state.stats.rating =
        Math.max(
          100,
          state.stats.rating - 10
        );
    }

    saveStats();

    /*
     * Result messaging
     */

    let icon = "½";
    let title = "Game Over";
    let message =
      "The game has ended.";

    if (
      reason === "checkmate"
    ) {
      if (winner === "w") {
        icon = "♔";
        title = "CHECKMATE!";
        message =
          "White wins by checkmate.";
      } else {
        icon = "♚";
        title = "CHECKMATE!";
        message =
          "Black wins by checkmate.";
      }
    }

    else if (
      reason === "stalemate"
    ) {
      title = "STALEMATE";
      message =
        "The game ends in a draw.";
    }

    else if (
      reason === "50-move"
    ) {
      title = "DRAW";
      message =
        "The 50-move rule has been reached.";
    }

    else if (
      reason === "insufficient material"
    ) {
      title = "DRAW";
      message =
        "There is insufficient material to checkmate.";
    }

    else if (
      reason === "resign"
    ) {
      title = "RESIGNATION";

      message =
        winner === "w"
          ? "White wins by resignation."
          : "Black wins by resignation.";
    }

    else if (
      reason === "timeout"
    ) {
      title = "TIME";

      message =
        winner === "w"
          ? "White wins on time."
          : "Black wins on time.";
    }

    const lastMove =
      state.moveHistory[
        state.moveHistory.length - 1
      ];

    if (
      lastMove &&
      reason === "checkmate"
    ) {
      message +=
        " Final move: " +
        lastMove.notation;
    }

    showOverlay(
      icon,
      title,
      message
    );

    updateAllUI();
  }

  /* =========================================================
     RESIGN
     ========================================================= */

  function resignGame() {
    if (
      !state.started ||
      state.gameOver
    ) {
      return;
    }

    const winner =
      state.turn === "w"
        ? "b"
        : "w";

    finishGame(
      winner,
      "resign"
    );
  }

  /* =========================================================
     CLOCK
     ========================================================= */

  function startClock() {
    stopClock();

    state.clockTimer =
      setInterval(
        () => {
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
            state.whiteTime <= 0
          ) {
            state.whiteTime = 0;

            finishGame(
              "b",
              "timeout"
            );

            return;
          }

          if (
            state.blackTime <= 0
          ) {
            state.blackTime = 0;

            finishGame(
              "w",
              "timeout"
            );

            return;
          }
        },
        1000
      );
  }

  function stopClock() {
    if (state.clockTimer) {
      clearInterval(
        state.clockTimer
      );

      state.clockTimer = null;
    }
  }

  function updateClocks() {
    setText(
      whiteClockEl,
      formatTime(
        state.whiteTime
      )
    );

    setText(
      blackClockEl,
      formatTime(
        state.blackTime
      )
    );

    if (whiteClockEl) {
      whiteClockEl.classList.toggle(
        "clock-warning",
        state.whiteTime <= 60
      );
    }

    if (blackClockEl) {
      blackClockEl.classList.toggle(
        "clock-warning",
        state.blackTime <= 60
      );
    }
  }

  function formatTime(
    seconds
  ) {
    const safe =
      Math.max(
        0,
        Math.floor(seconds)
      );

    const minutes =
      Math.floor(
        safe / 60
      );

    const secs =
      safe % 60;

    return (
      String(minutes)
        .padStart(2, "0") +
      ":" +
      String(secs)
        .padStart(2, "0")
    );
  }

  /* =========================================================
     AI
     ========================================================= */

  function isAIColor(color) {
    const mode =
      getGameMode();

    if (
      mode === "eve" ||
      mode === "battle"
    ) {
      return true;
    }

    if (
      mode === "pve"
    ) {
      return color === "b";
    }

    return false;
  }

  function shouldAIPlay() {
    return (
      state.started &&
      !state.gameOver &&
      !state.paused &&
      isAIColor(
        state.turn
      )
    );
  }

  function scheduleAI() {
    cancelAI();

    state.aiThinking = true;

    updateAllUI();

    const delay =
      getAISpeedDelay();

    state.aiTimer =
      setTimeout(
        () => {
          state.aiTimer = null;

          if (
            !shouldAIPlay()
          ) {
            state.aiThinking = false;
            updateAllUI();
            return;
          }

          const move =
            chooseAIMove(
              state.turn
            );

          state.aiThinking = false;

          if (move) {
            makeMove(move);
          }

          updateAllUI();
        },
        delay
      );
  }

  function cancelAI() {
    if (state.aiTimer) {
      clearTimeout(
        state.aiTimer
      );

      state.aiTimer = null;
    }

    state.aiThinking = false;
  }

  function getAISpeedDelay() {
    const speed =
      String(
        aiSpeedEl &&
        aiSpeedEl.value
          ? aiSpeedEl.value
          : state.aiSpeed
      ).toLowerCase();

    if (
      speed === "fast"
    ) {
      return 150;
    }

    if (
      speed === "slow"
    ) {
      return 850;
    }

    return CONFIG.aiThinkDelay;
  }

  function getProfileForColor(
    color
  ) {
    const mode =
      getGameMode();

    if (
      mode === "eve" ||
      mode === "battle"
    ) {
      return color === "w"
        ? (
            AI_PROFILES.ace
          )
        : (
            AI_PROFILES.emg
          );
    }

    return (
      AI_PROFILES[
        getAIProfile()
      ] ||
      AI_PROFILES.startup
    );
  }

  function chooseAIMove(
    color
  ) {
    const moves =
      getLegalMoves(
        color
      );

    if (!moves.length) {
      return null;
    }

    const profile =
      getProfileForColor(
        color
      );

    const scored =
      moves.map(
        move => ({
          move,
          score:
            evaluateMove(
              move,
              color
            )
        })
      );

    scored.sort(
      (a, b) =>
        b.score -
        a.score
    );

    /*
     * Deliberate randomness at lower AI levels.
     */

    if (
      Math.random() <
      profile.randomness
    ) {
      const pool =
        scored.slice(
          0,
          Math.min(
            4,
            scored.length
          )
        );

      return pool[
        Math.floor(
          Math.random() *
          pool.length
        )
      ].move;
    }

    let bestMove =
      scored[0].move;

    let bestScore =
      color === "w"
        ? -Infinity
        : Infinity;

    const depth =
      Math.max(
        1,
        profile.depth
      );

    if (depth === 1) {
      return bestMove;
    }

    for (
      const entry of scored
    ) {
      const next =
        cloneBoard(
          state.board
        );

      applyMoveToBoard(
        next,
        entry.move
      );

      const opponent =
        color === "w"
          ? "b"
          : "w";

      const future =
        minimax(
          next,
          opponent,
          depth - 1,
          -Infinity,
          Infinity
        );

      const total =
        color === "w"
          ? future
          : future;

      if (
        color === "w"
          ? total > bestScore
          : total < bestScore
      ) {
        bestScore =
          total;

        bestMove =
          entry.move;
      }
    }

    return bestMove;
  }

  function evaluateMove(
    move,
    color
  ) {
    let score = 0;

    const target =
      state.board[
        move.to.r
      ][move.to.c];

    if (target) {
      score +=
        PIECE_VALUES[
          target.type
        ] * 1.4;
    }

    if (move.enPassant) {
      score +=
        PIECE_VALUES.P;
    }

    if (move.promotion) {
      score +=
        PIECE_VALUES.Q;
    }

    if (move.castle) {
      score += 60;
    }

    const centerDistance =
      Math.abs(
        move.to.r - 3.5
      ) +
      Math.abs(
        move.to.c - 3.5
      );

    score +=
      (7 - centerDistance) *
      4;

    const test =
      cloneBoard(
        state.board
      );

    applyMoveToBoard(
      test,
      move
    );

    const opponent =
      color === "w"
        ? "b"
        : "w";

    if (
      isInCheck(
        test,
        opponent
      )
    ) {
      score += 80;
    }

    return score;
  }

  function minimax(
    board,
    color,
    depth,
    alpha,
    beta
  ) {
    if (
      depth <= 0
    ) {
      return evaluateBoard(
        board
      );
    }

    const moves =
      getLegalMovesFromBoard(
        board,
        color
      );

    if (!moves.length) {
      if (
        isInCheck(
          board,
          color
        )
      ) {
        return color === "w"
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
        const move of moves
      ) {
        const next =
          cloneBoard(board);

        applyMoveToBoard(
          next,
          move
        );

        const value =
          minimax(
            next,
            "b",
            depth - 1,
            alpha,
            beta
          );

        best =
          Math.max(
            best,
            value
          );

        alpha =
          Math.max(
            alpha,
            value
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
      const move of moves
    ) {
      const next =
        cloneBoard(board);

      applyMoveToBoard(
        next,
        move
      );

      const value =
        minimax(
          next,
          "w",
          depth - 1,
          alpha,
          beta
        );

      best =
        Math.min(
          best,
          value
        );

      beta =
        Math.min(
          beta,
          value
        );

      if (
        beta <= alpha
      ) {
        break;
      }
    }

    return best;
  }

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
        const p =
          board[r][c];

        if (!p) {
          continue;
        }

        const value =
          PIECE_VALUES[
            p.type
          ];

        const positional =
          p.type === "P"
            ? (
                p.color === "w"
                  ? 6 - r
                  : r - 1
              ) * 5
            : 0;

        if (
          p.color === "w"
        ) {
          score +=
            value +
            positional;
        } else {
          score -=
            value +
            positional;
        }
      }
    }

    return score;
  }

  /* =========================================================
     HISTORY
     ========================================================= */

  function pieceName(
    pieceData
  ) {
    if (!pieceData) {
      return "Unknown Piece";
    }

    const color =
      pieceData.color === "w"
        ? "White"
        : "Black";

    const name =
      PIECE_NAMES[
        pieceData.type
      ] ||
      "Piece";

    return (
      color +
      " " +
      name
    );
  }

  function renderHistory() {
    if (!moveHistoryEl) {
      return;
    }

    if (
      state.moveHistory.length === 0
    ) {
      moveHistoryEl.innerHTML =
        '<div class="history-empty">No moves yet.</div>';

      return;
    }

    moveHistoryEl.innerHTML = "";

    let pairNumber = 0;

    for (
      let index = 0;
      index <
      state.moveHistory.length;
      index += 2
    ) {
      pairNumber++;

      const white =
        state.moveHistory[index];

      const black =
        state.moveHistory[
          index + 1
        ];

      if (white) {
        appendHistoryRow(
          pairNumber + ".",
          white
        );
      }

      if (black) {
        appendHistoryRow(
          "…",
          black
        );
      }
    }

    moveHistoryEl.scrollTop =
      moveHistoryEl.scrollHeight;
  }

  function appendHistoryRow(
    numberText,
    entry
  ) {
    const row =
      document.createElement(
        "div"
      );

    row.className =
      "history-move";

    const number =
      document.createElement(
        "span"
      );

    number.className =
      "history-number";

    number.textContent =
      numberText;

    const pieceLabel =
      document.createElement(
        "span"
      );

    pieceLabel.className =
      "history-piece-name";

    pieceLabel.textContent =
      pieceName(
        entry.move &&
        entry.move.piece
      );

    const notation =
      document.createElement(
        "span"
      );

    notation.className =
      "history-notation";

    notation.textContent =
      entry.notation;

    row.appendChild(number);
    row.appendChild(pieceLabel);
    row.appendChild(notation);

    moveHistoryEl.appendChild(row);
  }

  /* =========================================================
     CAPTURED PIECES
     ========================================================= */

  function renderCaptured() {
    renderCapturedSide(
      whiteCapturedEl,
      state.captured.w
    );

    renderCapturedSide(
      blackCapturedEl,
      state.captured.b
    );
  }

  function renderCapturedSide(
    element,
    pieces
  ) {
    if (!element) {
      return;
    }

    element.innerHTML = "";

    pieces.forEach(
      p => {
        const span =
          document.createElement(
            "span"
          );

        span.className =
          "captured-piece";

        span.textContent =
          PIECES[
            p.color
          ][p.type];

        span.title =
          pieceName(p);

        element.appendChild(
          span
        );
      }
    );
  }

  /* =========================================================
     RESET / START
     ========================================================= */

  function resetGame(
    autoStart = false
  ) {
    cancelAI();
    stopClock();

    state.board =
      createInitialBoard();

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
    state.result = null;

    hideOverlay();

    renderBoard();
    renderHistory();
    renderCaptured();
    updateAllUI();

    if (pauseGameButton) {
      pauseGameButton.textContent =
        "Pause";
    }

    if (autoStart) {
      startGame();
    }
  }

  function startGame() {
    if (state.gameOver) {
      resetGame(false);
    }

    state.started = true;
    state.paused = false;
    state.gameOver = false;

    hideOverlay();

    startClock();

    updateAllUI();

    if (
      shouldAIPlay()
    ) {
      scheduleAI();
    }
  }

  function startAIvsAI() {
    state.gameMode = "eve";

    if (gameModeEl) {
      gameModeEl.value = "eve";
    }

    resetGame(false);

    updatePlayerLabels();
    updateAllUI();

    startGame();
  }

  /* =========================================================
     PAUSE
     ========================================================= */

  function togglePause() {
    if (
      !state.started ||
      state.gameOver
    ) {
      return;
    }

    state.paused =
      !state.paused;

    if (state.paused) {
      if (pauseGameButton) {
        pauseGameButton.textContent =
          "Resume";
      }

      cancelAI();

      showOverlay(
        "Ⅱ",
        "Game Paused",
        "The chess clock is paused."
      );
    } else {
      if (pauseGameButton) {
        pauseGameButton.textContent =
          "Pause";
      }

      hideOverlay();

      if (
        shouldAIPlay()
      ) {
        scheduleAI();
      }
    }

    updateAllUI();
  }

  /* =========================================================
     OVERLAY
     ========================================================= */

  function showOverlay(
    icon,
    title,
    message
  ) {
    if (overlayIconEl) {
      overlayIconEl.textContent =
        icon;
    }

    setText(
      overlayTitleEl,
      title
    );

    setText(
      overlayMessageEl,
      message
    );

    if (overlayEl) {
      overlayEl.classList.add(
        "active"
      );

      overlayEl.removeAttribute(
        "hidden"
      );
    }
  }

  function hideOverlay() {
    if (overlayEl) {
      overlayEl.classList.remove(
        "active"
      );

      overlayEl.setAttribute(
        "hidden",
        ""
      );
    }
  }

  /* =========================================================
     MODES
     ========================================================= */

  function getGameMode() {
    const value =
      gameModeEl &&
      gameModeEl.value
        ? gameModeEl.value
        : state.gameMode;

    state.gameMode =
      String(
        value || "pvp"
      ).toLowerCase();

    return state.gameMode;
  }

  function setGameMode(
    mode
  ) {
    state.gameMode =
      String(
        mode || "pvp"
      ).toLowerCase();

    if (gameModeEl) {
      gameModeEl.value =
        state.gameMode;
    }

    /*
     * If a running game changes mode,
     * stop AI and reset cleanly.
     */

    if (state.started) {
      cancelAI();
      stopClock();

      state.started = false;
      state.paused = false;
      state.gameOver = false;

      resetGame(false);
    }

    updatePlayerLabels();
    updateAllUI();
  }

  function getAIProfile() {
    const value =
      aiProfileEl &&
      aiProfileEl.value
        ? aiProfileEl.value
        : state.aiProfile;

    state.aiProfile =
      String(
        value || "startup"
      ).toLowerCase();

    return state.aiProfile;
  }

  function updatePlayerLabels() {
    const mode =
      getGameMode();

    let whiteName =
      "Player";

    let blackName =
      "Player";

    if (
      mode === "pve"
    ) {
      blackName =
        AI_PROFILES[
          getAIProfile()
        ]?.name ||
        "ACE";
    }

    if (
      mode === "eve" ||
      mode === "battle"
    ) {
      whiteName = "ACE";
      blackName = "EMG";
    }

    setText(
      whitePlayerNameEl,
      whiteName
    );

    setText(
      blackPlayerNameEl,
      blackName
    );

    setText(
      whitePlayerLevelEl,
      mode === "pvp"
        ? "PLAYER"
        : "AI"
    );

    setText(
      blackPlayerLevelEl,
      mode === "pvp"
        ? "PLAYER"
        : "AI"
    );
  }

  /* =========================================================
     UI
     ========================================================= */

  function updateAllUI() {
    updateBoardStatus();
    updateClocks();
    updateStatsUI();
    updatePlayerLabels();
    renderCaptured();
    updateMoveInfo();
  }

  function updateBoardStatus() {
    const mode =
      getGameMode();

    let gameStatus =
      "Ready";

    if (state.gameOver) {
      if (
        state.result &&
        state.result.reason ===
          "checkmate"
      ) {
        gameStatus =
          "Checkmate";
      } else {
        gameStatus =
          "Game Over";
      }
    }

    else if (state.paused) {
      gameStatus =
        "Paused";
    }

    else if (state.started) {
      gameStatus =
        "Live";
    }

    setText(
      gameStatusEl,
      gameStatus
    );

    if (state.gameOver) {
      if (
        state.result &&
        state.result.winner
      ) {
        setText(
          turnStatusEl,
          state.result.winner === "w"
            ? "White Wins"
            : "Black Wins"
        );
      } else {
        setText(
          turnStatusEl,
          "Draw"
        );
      }
    } else {
      setText(
        turnStatusEl,
        state.turn === "w"
          ? "White"
          : "Black"
      );
    }

    setText(
      modeStatusEl,
      modeLabel(mode)
    );

    setText(
      moveStatusEl,
      state.moveHistory.length
        ? state.moveHistory[
            state.moveHistory.length - 1
          ].notation
        : "—"
    );

    setText(
      moveNumberEl,
      state.fullmove
    );
  }

  function updateMoveInfo() {
    setText(
      moveNumberEl,
      state.fullmove
    );
  }

  function modeLabel(
    mode
  ) {
    const labels = {
      pvp:
        "Player vs Player",

      pve:
        "Player vs ACE",

      eve:
        "ACE vs EMG",

      battle:
        "ACE vs EMG"
    };

    return (
      labels[mode] ||
      "Player vs Player"
    );
  }

  function updateStatsUI() {
    setText(
      commanderRatingEl,
      state.stats.rating
    );

    setText(
      gamesPlayedEl,
      state.stats.played
    );

    setText(
      gamesWonEl,
      state.stats.wins
    );

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

    setText(
      winRateEl,
      rate + "%"
    );
  }

  function setText(
    element,
    value
  ) {
    if (element) {
      element.textContent =
        value;
    }
  }

  /* =========================================================
     STATS
     ========================================================= */

  function loadStats() {
    try {
      const saved =
        localStorage.getItem(
          CONFIG.storageKey
        );

      if (!saved) {
        return;
      }

      const parsed =
        JSON.parse(saved);

      if (
        parsed &&
        typeof parsed === "object"
      ) {
        state.stats = {
          ...state.stats,
          ...parsed
        };
      }
    } catch (error) {
      console.warn(
        "RO’Lyfe Chess stats could not be loaded.",
        error
      );
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
      console.warn(
        "RO’Lyfe Chess stats could not be saved.",
        error
      );
    }
  }

  /* =========================================================
     CLEAR HISTORY
     ========================================================= */

  function clearHistory() {
    state.moveHistory = [];

    renderHistory();
    updateAllUI();
  }

  /* =========================================================
     THEME
     ========================================================= */

  function cycleTheme() {
    if (
      window.ROLyfeChessThemes &&
      typeof
        window.ROLyfeChessThemes.next ===
          "function"
    ) {
      const next =
        window.ROLyfeChessThemes.next();

      notifyTheme(next);

      return;
    }

    const themes = [
      "rolyfe",
      "investor",
      "midnight",
      "classic",
      "neon"
    ];

    const current =
      document.documentElement
        .dataset
        .chessTheme ||
      "rolyfe";

    const index =
      themes.indexOf(
        current
      );

    const next =
      themes[
        (index + 1) %
        themes.length
      ];

    document.documentElement.dataset
      .chessTheme =
      next;
  }

  function notifyTheme(
    theme
  ) {
    if (
      window.ROLyfeGameUI &&
      typeof
        window.ROLyfeGameUI.notify ===
          "function"
    ) {
      window.ROLyfeGameUI.notify(
        "Theme: " + theme
      );
    }
  }

  /* =========================================================
     VISIBILITY
     ========================================================= */

  function handleVisibility() {
    if (
      document.hidden &&
      state.started &&
      !state.paused &&
      !state.gameOver
    ) {
      state.paused = true;

      cancelAI();

      if (pauseGameButton) {
        pauseGameButton.textContent =
          "Resume";
      }

      showOverlay(
        "Ⅱ",
        "Game Paused",
        "Game paused because the page became inactive."
      );

      updateAllUI();
    }
  }

  /* =========================================================
     EVENTS
     ========================================================= */

  function bindEvents() {
    startGameButton?.addEventListener(
      "click",
      startGame
    );

    aiStartButton?.addEventListener(
      "click",
      startAIvsAI
    );

    pauseGameButton?.addEventListener(
      "click",
      togglePause
    );

    resignButton?.addEventListener(
      "click",
      resignGame
    );

    resetGameButton?.addEventListener(
      "click",
      () => resetGame(false)
    );

    themeButton?.addEventListener(
      "click",
      cycleTheme
    );

    overlayRestartButton?.addEventListener(
      "click",
      () => {
        hideOverlay();
        resetGame(true);
      }
    );

    overlayCloseButton?.addEventListener(
      "click",
      () => {
        if (!state.paused) {
          hideOverlay();
        }
      }
    );

    clearHistoryButton?.addEventListener(
      "click",
      clearHistory
    );

    gameModeEl?.addEventListener(
      "change",
      () => {
        setGameMode(
          gameModeEl.value
        );
      }
    );

    aiProfileEl?.addEventListener(
      "change",
      () => {
        state.aiProfile =
          String(
            aiProfileEl.value ||
            "startup"
          ).toLowerCase();

        updatePlayerLabels();
        updateAllUI();
      }
    );

    difficultyEl?.addEventListener(
      "change",
      () => {
        state.aiProfile =
          difficultyToProfile(
            difficultyEl.value
          );

        if (aiProfileEl) {
          aiProfileEl.value =
            state.aiProfile;
        }

        updatePlayerLabels();
        updateAllUI();
      }
    );

    aiSpeedEl?.addEventListener(
      "change",
      () => {
        state.aiSpeed =
          aiSpeedEl.value;
      }
    );

    document.addEventListener(
      "keydown",
      event => {
        if (
          event.key === "Escape"
        ) {
          clearSelection();
        }
      }
    );

    document.addEventListener(
      "visibilitychange",
      handleVisibility
    );
  }

  function difficultyToProfile(
    value
  ) {
    const text =
      String(
        value || ""
      ).toLowerCase();

    if (
      text.includes("7") ||
      text.includes("expert")
    ) {
      return "sevenfigures";
    }

    if (
      text.includes("investor") ||
      text.includes("normal")
    ) {
      return "investor";
    }

    if (
      text.includes("credit")
    ) {
      return "credit";
    }

    return "startup";
  }

  /* =========================================================
     PUBLIC API
     ========================================================= */

  window.ROLyfeChess = {
    version: "1.2",

    state,

    start:
      startGame,

    reset:
      resetGame,

    pause:
      togglePause,

    resign:
      resignGame,

    getLegalMoves:
      getLegalMoves,

    makeMove:
      makeMove,

    getMode:
      getGameMode,

    setMode:
      setGameMode,

    getAIProfile:
      getAIProfile,

    chooseAI:
      chooseAIMove,

    render:
      renderBoard,

    history:
      renderHistory,

    clearHistory:
      clearHistory,

    cycleTheme:
      cycleTheme,

    getStats:
      () => ({
        ...state.stats
      }),

    getBoard:
      () =>
        cloneBoard(
          state.board
        )
  };

  window.ROlyfeChess =
    window.ROLyfeChess;

  /* =========================================================
     INITIALIZE
     ========================================================= */

  function init() {
    loadStats();

    if (
      gameModeEl &&
      gameModeEl.value
    ) {
      state.gameMode =
        String(
          gameModeEl.value
        ).toLowerCase();
    }

    if (
      aiProfileEl &&
      aiProfileEl.value
    ) {
      state.aiProfile =
        String(
          aiProfileEl.value
        ).toLowerCase();
    }

    if (
      aiSpeedEl &&
      aiSpeedEl.value
    ) {
      state.aiSpeed =
        aiSpeedEl.value;
    }

    state.board =
      createInitialBoard();

    bindEvents();

    renderBoard();
    renderHistory();
    renderCaptured();
    updateAllUI();

    if (pauseGameButton) {
      pauseGameButton.textContent =
        "Pause";
    }

    console.log(
      "♟️ RO’Lyfe Chess Engine v1.2 loaded."
    );
  }

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      init
    );
  } else {
    init();
  }

})();
