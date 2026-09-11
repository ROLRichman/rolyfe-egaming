/* =========================================================
   RO’LYFE CHESS
   games/chess/chess.js
   V1.2 — ENGINE + CONTROLS + AI + THEME FIX
   ========================================================= */

(() => {
  "use strict";

  /* =========================================================
     CONFIG
     ========================================================= */

  const CONFIG = {
    version: "1.2",
    startingTime: 600,
    aiThinkDelay: 450,
    maxHistory: 500,
    storageKey: "rolyfe-chess-stats-v12"
  };

  /* =========================================================
     AI PROFILES
     ========================================================= */

  const AI_PROFILES = {
    startup: {
      name: "Start-Up",
      depth: 1,
      randomness: 0.35
    },

    credit: {
      name: "Credit",
      depth: 1,
      randomness: 0.20
    },

    line: {
      name: "Line",
      depth: 2,
      randomness: 0.12
    },

    investor: {
      name: "Investor",
      depth: 2,
      randomness: 0.07
    },

    sevenfigures: {
      name: "7 Figures",
      depth: 2,
      randomness: 0.03
    },

    ace: {
      name: "ACE",
      depth: 2,
      randomness: 0.01
    },

    emg: {
      name: "EMG",
      depth: 2,
      randomness: 0.00
    }
  };

  /* =========================================================
     PIECES
     ========================================================= */

  const PIECES = {
    p: "♟",
    r: "♜",
    n: "♞",
    b: "♝",
    q: "♛",
    k: "♚",

    P: "♙",
    R: "♖",
    N: "♘",
    B: "♗",
    Q: "♕",
    K: "♔"
  };

  const PIECE_NAMES = {
    p: "Pawn",
    r: "Rook",
    n: "Knight",
    b: "Bishop",
    q: "Queen",
    k: "King"
  };

  const PIECE_VALUES = {
    p: 100,
    n: 320,
    b: 330,
    r: 500,
    q: 900,
    k: 20000
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

    stats: {
      played: 0,
      wins: 0,
      rating: 1200
    }
  };

  let initialized = false;

  /* =========================================================
     DOM
     ========================================================= */

  let boardEl;
  let gameStatusEl;
  let turnStatusEl;
  let modeStatusEl;
  let gameModeEl;
  let aiProfileEl;
  let difficultyEl;
  let aiSpeedEl;

  let whitePlayerNameEl;
  let blackPlayerNameEl;
  let whitePlayerLevelEl;
  let blackPlayerLevelEl;

  let whiteClockEl;
  let blackClockEl;

  let checkStatusEl;
  let moveStatusEl;
  let moveNumberEl;

  let whiteCapturedEl;
  let blackCapturedEl;
  let moveHistoryEl;

  let commanderRatingEl;
  let gamesPlayedEl;
  let gamesWonEl;
  let winRateEl;

  let gameOverlayEl;
  let overlayIconEl;
  let overlayTitleEl;
  let overlayMessageEl;

  let startGameButton;
  let aiStartButton;
  let pauseGameButton;
  let resignButton;
  let resetGameButton;
  let themeButton;

  let overlayRestartButton;
  let overlayCloseButton;
  let clearHistoryButton;

  /* =========================================================
     DOM CACHE
     ========================================================= */

  function cacheDOM() {
    boardEl = document.getElementById("chessBoard");

    gameStatusEl = document.getElementById("gameStatus");
    turnStatusEl = document.getElementById("turnStatus");
    modeStatusEl = document.getElementById("modeStatus");

    gameModeEl = document.getElementById("gameMode");
    aiProfileEl = document.getElementById("aiProfile");
    difficultyEl = document.getElementById("difficultyLevel");
    aiSpeedEl = document.getElementById("aiSpeed");

    whitePlayerNameEl = document.getElementById("whitePlayerName");
    blackPlayerNameEl = document.getElementById("blackPlayerName");

    whitePlayerLevelEl = document.getElementById("whitePlayerLevel");
    blackPlayerLevelEl = document.getElementById("blackPlayerLevel");

    whiteClockEl = document.getElementById("whiteClock");
    blackClockEl = document.getElementById("blackClock");

    checkStatusEl = document.getElementById("checkStatus");
    moveStatusEl = document.getElementById("moveStatus");
    moveNumberEl = document.getElementById("moveNumber");

    whiteCapturedEl = document.getElementById("whiteCaptured");
    blackCapturedEl = document.getElementById("blackCaptured");

    moveHistoryEl = document.getElementById("moveHistory");

    commanderRatingEl = document.getElementById("commanderRating");
    gamesPlayedEl = document.getElementById("gamesPlayed");
    gamesWonEl = document.getElementById("gamesWon");
    winRateEl = document.getElementById("winRate");

    gameOverlayEl = document.getElementById("gameOverlay");
    overlayIconEl = document.getElementById("overlayIcon");
    overlayTitleEl = document.getElementById("overlayTitle");
    overlayMessageEl = document.getElementById("overlayMessage");

    startGameButton = document.getElementById("startGameButton");
    aiStartButton = document.getElementById("aiStartButton");
    pauseGameButton = document.getElementById("pauseGameButton");
    resignButton = document.getElementById("resignButton");
    resetGameButton = document.getElementById("resetGameButton");
    themeButton = document.getElementById("themeButton");

    overlayRestartButton = document.getElementById("overlayRestartButton");
    overlayCloseButton = document.getElementById("overlayCloseButton");
    clearHistoryButton = document.getElementById("clearHistoryButton");
  }

  /* =========================================================
     BOARD
     ========================================================= */

  function createInitialBoard() {
    return [
      [
        { type: "r", color: "b" },
        { type: "n", color: "b" },
        { type: "b", color: "b" },
        { type: "q", color: "b" },
        { type: "k", color: "b" },
        { type: "b", color: "b" },
        { type: "n", color: "b" },
        { type: "r", color: "b" }
      ],

      [
        { type: "p", color: "b" },
        { type: "p", color: "b" },
        { type: "p", color: "b" },
        { type: "p", color: "b" },
        { type: "p", color: "b" },
        { type: "p", color: "b" },
        { type: "p", color: "b" },
        { type: "p", color: "b" }
      ],

      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],

      [
        { type: "p", color: "w" },
        { type: "p", color: "w" },
        { type: "p", color: "w" },
        { type: "p", color: "w" },
        { type: "p", color: "w" },
        { type: "p", color: "w" },
        { type: "p", color: "w" },
        { type: "p", color: "w" }
      ],

      [
        { type: "r", color: "w" },
        { type: "n", color: "w" },
        { type: "b", color: "w" },
        { type: "q", color: "w" },
        { type: "k", color: "w" },
        { type: "b", color: "w" },
        { type: "n", color: "w" },
        { type: "r", color: "w" }
      ]
    ];
  }

  function cloneBoard(board) {
    return board.map(row =>
      row.map(piece =>
        piece ? { type: piece.type, color: piece.color } : null
      )
    );
  }

  function cloneCastling() {
    return {
      wK: state.castling.wK,
      wQ: state.castling.wQ,
      bK: state.castling.bK,
      bQ: state.castling.bQ
    };
  }

  function opposite(color) {
    return color === "w" ? "b" : "w";
  }

  function squareName(row, col) {
    return String.fromCharCode(97 + col) + (8 - row);
  }

  function inBounds(row, col) {
    return row >= 0 && row < 8 && col >= 0 && col < 8;
  }

  /* =========================================================
     MOVE GENERATION
     ========================================================= */

  function generatePseudoMoves(board, row, col, context) {
    const piece = board[row][col];

    if (!piece) return [];

    const moves = [];

    const add = (toRow, toCol, extra) => {
      if (!inBounds(toRow, toCol)) return;

      const target = board[toRow][toCol];

      if (target && target.color === piece.color) return;

      moves.push({
        fromRow: row,
        fromCol: col,
        toRow,
        toCol,
        ...(extra || {})
      });
    };

    if (piece.type === "p") {
      const direction = piece.color === "w" ? -1 : 1;
      const startRow = piece.color === "w" ? 6 : 1;

      const oneRow = row + direction;

      if (
        inBounds(oneRow, col) &&
        !board[oneRow][col]
      ) {
        add(oneRow, col);

        const twoRow = row + direction * 2;

        if (
          row === startRow &&
          !board[twoRow][col]
        ) {
          add(twoRow, col, {
            doublePawn: true
          });
        }
      }

      for (const dc of [-1, 1]) {
        const nr = row + direction;
        const nc = col + dc;

        if (!inBounds(nr, nc)) continue;

        const target = board[nr][nc];

        if (target && target.color !== piece.color) {
          add(nr, nc);
        }

        if (
          context &&
          context.enPassant &&
          context.enPassant.row === nr &&
          context.enPassant.col === nc
        ) {
          add(nr, nc, {
            enPassant: true
          });
        }
      }
    }

    if (piece.type === "n") {
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

      jumps.forEach(([dr, dc]) => {
        add(row + dr, col + dc);
      });
    }

    if (
      piece.type === "b" ||
      piece.type === "r" ||
      piece.type === "q"
    ) {
      const directions = [];

      if (piece.type === "b" || piece.type === "q") {
        directions.push(
          [-1, -1],
          [-1, 1],
          [1, -1],
          [1, 1]
        );
      }

      if (piece.type === "r" || piece.type === "q") {
        directions.push(
          [-1, 0],
          [1, 0],
          [0, -1],
          [0, 1]
        );
      }

      directions.forEach(([dr, dc]) => {
        let nr = row + dr;
        let nc = col + dc;

        while (inBounds(nr, nc)) {
          const target = board[nr][nc];

          if (!target) {
            add(nr, nc);
          } else {
            if (target.color !== piece.color) {
              add(nr, nc);
            }
            break;
          }

          nr += dr;
          nc += dc;
        }
      });
    }

    if (piece.type === "k") {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          add(row + dr, col + dc);
        }
      }

      addCastlingMoves(
        board,
        row,
        col,
        piece.color,
        context,
        moves
      );
    }

    return moves;
  }

  function addCastlingMoves(
    board,
    row,
    col,
    color,
    context,
    moves
  ) {
    if (!context || !context.castling) return;

    const enemy = opposite(color);

    if (isSquareAttacked(board, row, col, enemy)) {
      return;
    }

    if (color === "w" && row === 7 && col === 4) {
      if (
        context.castling.wK &&
        board[7][5] === null &&
        board[7][6] === null &&
        board[7][7] &&
        board[7][7].type === "r" &&
        board[7][7].color === "w" &&
        !isSquareAttacked(board, 7, 5, enemy) &&
        !isSquareAttacked(board, 7, 6, enemy)
      ) {
        moves.push({
          fromRow: 7,
          fromCol: 4,
          toRow: 7,
          toCol: 6,
          castle: "K"
        });
      }

      if (
        context.castling.wQ &&
        board[7][1] === null &&
        board[7][2] === null &&
        board[7][3] === null &&
        board[7][0] &&
        board[7][0].type === "r" &&
        board[7][0].color === "w" &&
        !isSquareAttacked(board, 7, 3, enemy) &&
        !isSquareAttacked(board, 7, 2, enemy)
      ) {
        moves.push({
          fromRow: 7,
          fromCol: 4,
          toRow: 7,
          toCol: 2,
          castle: "Q"
        });
      }
    }

    if (color === "b" && row === 0 && col === 4) {
      if (
        context.castling.bK &&
        board[0][5] === null &&
        board[0][6] === null &&
        board[0][7] &&
        board[0][7].type === "r" &&
        board[0][7].color === "b" &&
        !isSquareAttacked(board, 0, 5, enemy) &&
        !isSquareAttacked(board, 0, 6, enemy)
      ) {
        moves.push({
          fromRow: 0,
          fromCol: 4,
          toRow: 0,
          toCol: 6,
          castle: "K"
        });
      }

      if (
        context.castling.bQ &&
        board[0][1] === null &&
        board[0][2] === null &&
        board[0][3] === null &&
        board[0][0] &&
        board[0][0].type === "r" &&
        board[0][0].color === "b" &&
        !isSquareAttacked(board, 0, 3, enemy) &&
        !isSquareAttacked(board, 0, 2, enemy)
      ) {
        moves.push({
          fromRow: 0,
          fromCol: 4,
          toRow: 0,
          toCol: 2,
          castle: "Q"
        });
      }
    }
  }

  function generateAllPseudoMoves(board, color, context) {
    const result = [];

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col];

        if (!piece || piece.color !== color) continue;

        result.push(
          ...generatePseudoMoves(
            board,
            row,
            col,
            context
          )
        );
      }
    }

    return result;
  }

  /* =========================================================
     ATTACK / CHECK
     ========================================================= */

  function isSquareAttacked(board, row, col, byColor) {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];

        if (!piece || piece.color !== byColor) continue;

        const attacks = generateAttackMoves(
          board,
          r,
          c,
          piece
        );

        if (
          attacks.some(
            move =>
              move.toRow === row &&
              move.toCol === col
          )
        ) {
          return true;
        }
      }
    }

    return false;
  }

  function generateAttackMoves(board, row, col, piece) {
    const moves = [];

    if (piece.type === "p") {
      const direction = piece.color === "w" ? -1 : 1;

      for (const dc of [-1, 1]) {
        const nr = row + direction;
        const nc = col + dc;

        if (inBounds(nr, nc)) {
          moves.push({
            toRow: nr,
            toCol: nc
          });
        }
      }

      return moves;
    }

    if (piece.type === "n") {
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

      jumps.forEach(([dr, dc]) => {
        const nr = row + dr;
        const nc = col + dc;

        if (inBounds(nr, nc)) {
          moves.push({
            toRow: nr,
            toCol: nc
          });
        }
      });

      return moves;
    }

    if (piece.type === "k") {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (!dr && !dc) continue;

          const nr = row + dr;
          const nc = col + dc;

          if (inBounds(nr, nc)) {
            moves.push({
              toRow: nr,
              toCol: nc
            });
          }
        }
      }

      return moves;
    }

    const directions = [];

    if (piece.type === "b" || piece.type === "q") {
      directions.push(
        [-1, -1],
        [-1, 1],
        [1, -1],
        [1, 1]
      );
    }

    if (piece.type === "r" || piece.type === "q") {
      directions.push(
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1]
      );
    }

    directions.forEach(([dr, dc]) => {
      let nr = row + dr;
      let nc = col + dc;

      while (inBounds(nr, nc)) {
        moves.push({
          toRow: nr,
          toCol: nc
        });

        if (board[nr][nc]) break;

        nr += dr;
        nc += dc;
      }
    });

    return moves;
  }

  function findKing(board, color) {
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col];

        if (
          piece &&
          piece.color === color &&
          piece.type === "k"
        ) {
          return {
            row,
            col
          };
        }
      }
    }

    return null;
  }

  function isInCheck(board, color) {
    const king = findKing(board, color);

    if (!king) return true;

    return isSquareAttacked(
      board,
      king.row,
      king.col,
      opposite(color)
    );
  }

  /* =========================================================
     SIMULATION
     ========================================================= */

  function applyMoveToBoard(
    board,
    move,
    context
  ) {
    const next = cloneBoard(board);

    const movingPiece =
      next[move.fromRow][move.fromCol];

    if (!movingPiece) {
      return next;
    }

    next[move.toRow][move.toCol] = {
      ...movingPiece
    };

    next[move.fromRow][move.fromCol] = null;

    if (move.enPassant) {
      const capturedRow =
        movingPiece.color === "w"
          ? move.toRow + 1
          : move.toRow - 1;

      next[capturedRow][move.toCol] = null;
    }

    if (move.castle === "K") {
      const row = move.fromRow;

      next[row][5] = next[row][7];
      next[row][7] = null;
    }

    if (move.castle === "Q") {
      const row = move.fromRow;

      next[row][3] = next[row][0];
      next[row][0] = null;
    }

    if (
      movingPiece.type === "p" &&
      (move.toRow === 0 || move.toRow === 7)
    ) {
      next[move.toRow][move.toCol] = {
        type: "q",
        color: movingPiece.color
      };
    }

    return next;
  }

  function moveLeavesKingSafe(
    board,
    move,
    color,
    context
  ) {
    const next = applyMoveToBoard(
      board,
      move,
      context
    );

    return !isInCheck(next, color);
  }

  function getLegalMovesForBoard(
    board,
    color,
    context
  ) {
    const pseudo =
      generateAllPseudoMoves(
        board,
        color,
        context
      );

    return pseudo.filter(move =>
      moveLeavesKingSafe(
        board,
        move,
        color,
        context
      )
    );
  }

  function getLegalMovesFromSquare(
    row,
    col
  ) {
    const piece = state.board[row][col];

    if (!piece) return [];

    const context = {
      castling: state.castling,
      enPassant: state.enPassant
    };

    return generatePseudoMoves(
      state.board,
      row,
      col,
      context
    ).filter(move =>
      moveLeavesKingSafe(
        state.board,
        move,
        piece.color,
        context
      )
    );
  }

  /* =========================================================
     SAN
     ========================================================= */

  function getSAN(
    board,
    move,
    piece,
    captured,
    context
  ) {
    if (move.castle === "K") return "O-O";
    if (move.castle === "Q") return "O-O-O";

    let notation = "";

    if (piece.type !== "p") {
      notation += piece.type.toUpperCase();
    }

    if (captured) {
      if (piece.type === "p") {
        notation += String.fromCharCode(
          97 + move.fromCol
        );
      }

      notation += "x";
    }

    notation += squareName(
      move.toRow,
      move.toCol
    );

    if (
      piece.type === "p" &&
      (move.toRow === 0 || move.toRow === 7)
    ) {
      notation += "=Q";
    }

    const simulated =
      applyMoveToBoard(
        board,
        move,
        context
      );

    const enemy = opposite(piece.color);

    if (isInCheck(simulated, enemy)) {
      const enemyMoves =
        getLegalMovesForBoard(
          simulated,
          enemy,
          {
            castling: context.castling,
            enPassant: null
          }
        );

      notation +=
        enemyMoves.length === 0
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
      !state.started ||
      state.aiThinking
    ) {
      return false;
    }

    const movingPiece =
      state.board[move.fromRow][move.fromCol];

    if (!movingPiece) return false;

    const capturedPiece =
      state.board[move.toRow][move.toCol];

    const context = {
      castling: cloneCastling(),
      enPassant: state.enPassant
    };

    const notation =
      getSAN(
        state.board,
        move,
        movingPiece,
        capturedPiece || move.enPassant,
        context
      );

    state.board =
      applyMoveToBoard(
        state.board,
        move,
        context
      );

    if (capturedPiece) {
      state.captured[movingPiece.color].push(
        capturedPiece
      );
    }

    if (move.enPassant) {
      const capturedRow =
        movingPiece.color === "w"
          ? move.toRow + 1
          : move.toRow - 1;

      const epPiece =
        state.board[capturedRow][move.toCol];

      if (epPiece) {
        state.captured[movingPiece.color].push(
          epPiece
        );
        state.board[capturedRow][move.toCol] = null;
      }
    }

    updateCastlingRights(
      movingPiece,
      move,
      capturedPiece
    );

    if (
      movingPiece.type === "p" &&
      Math.abs(
        move.toRow - move.fromRow
      ) === 2
    ) {
      state.enPassant = {
        row:
          (move.fromRow + move.toRow) / 2,
        col: move.fromCol
      };
    } else {
      state.enPassant = null;
    }

    if (
      movingPiece.type === "p" ||
      capturedPiece
    ) {
      state.halfmove = 0;
    } else {
      state.halfmove++;
    }

    const moveNumber = state.fullmove;

    if (movingPiece.color === "b") {
      state.fullmove++;
    }

    state.moveHistory.push({
      number: moveNumber,
      color: movingPiece.color,
      notation,
      move: {
        ...move,
        piece: {
          ...movingPiece
        },
        captured: capturedPiece
          ? { ...capturedPiece }
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
      ...move,
      notation
    };

    state.turn =
      opposite(state.turn);

    state.selected = null;
    state.legalMoves = [];

    render();

    const result =
      checkGameState();

    if (!result && isAIColor(state.turn)) {
      scheduleAI();
    }

    return true;
  }

  /* =========================================================
     CASTLING RIGHTS
     ========================================================= */

  function updateCastlingRights(
    piece,
    move,
    captured
  ) {
    if (piece.type === "k") {
      if (piece.color === "w") {
        state.castling.wK = false;
        state.castling.wQ = false;
      } else {
        state.castling.bK = false;
        state.castling.bQ = false;
      }
    }

    if (piece.type === "r") {
      if (piece.color === "w") {
        if (move.fromRow === 7 && move.fromCol === 0) {
          state.castling.wQ = false;
        }

        if (move.fromRow === 7 && move.fromCol === 7) {
          state.castling.wK = false;
        }
      } else {
        if (move.fromRow === 0 && move.fromCol === 0) {
          state.castling.bQ = false;
        }

        if (move.fromRow === 0 && move.fromCol === 7) {
          state.castling.bK = false;
        }
      }
    }

    if (captured && captured.type === "r") {
      if (move.toRow === 7 && move.toCol === 0) {
        state.castling.wQ = false;
      }

      if (move.toRow === 7 && move.toCol === 7) {
        state.castling.wK = false;
      }

      if (move.toRow === 0 && move.toCol === 0) {
        state.castling.bQ = false;
      }

      if (move.toRow === 0 && move.toCol === 7) {
        state.castling.bK = false;
      }
    }
  }

  /* =========================================================
     GAME STATE
     ========================================================= */

  function checkGameState() {
    if (state.gameOver) return state.result;

    const color = state.turn;

    const context = {
      castling: state.castling,
      enPassant: state.enPassant
    };

    const legalMoves =
      getLegalMovesForBoard(
        state.board,
        color,
        context
      );

    const inCheck =
      isInCheck(
        state.board,
        color
      );

    updateCheckStatus(inCheck);

    if (legalMoves.length === 0) {
      if (inCheck) {
        const winner =
          opposite(color);

        finishGame(
          "checkmate",
          winner
        );

        return state.result;
      }

      finishGame(
        "stalemate",
        null
      );

      return state.result;
    }

    if (state.halfmove >= 100) {
      finishGame(
        "50move",
        null
      );

      return state.result;
    }

    if (isInsufficientMaterial(state.board)) {
      finishGame(
        "insufficient",
        null
      );

      return state.result;
    }

    updateBoardStatus();

    return null;
  }

  function finishGame(
    type,
    winner
  ) {
    if (state.gameOver) return;

    state.gameOver = true;
    state.started = false;
    state.paused = false;
    state.aiThinking = false;

    stopClock();
    cancelAI();

    state.result = {
      type,
      winner
    };

    updateStats(type, winner);
    render();

    let icon = "♟";
    let title = "GAME OVER";
    let message = "";

    if (type === "checkmate") {
      icon = "♔";
      title = "CHECKMATE!";

      const winnerName =
        winner === "w"
          ? getWhitePlayerName()
          : getBlackPlayerName();

      const loserName =
        winner === "w"
          ? getBlackPlayerName()
          : getWhitePlayerName();

      message =
        "<strong>" +
        winnerName +
        " Wins</strong><br>" +
        loserName +
        " has been checkmated.";

    } else if (type === "stalemate") {
      icon = "½";
      title = "STALEMATE";
      message =
        "The game ends in a draw.";
    } else if (type === "50move") {
      icon = "½";
      title = "50-MOVE DRAW";
      message =
        "The game ends by the 50-move rule.";
    } else if (type === "insufficient") {
      icon = "½";
      title = "DRAW";
      message =
        "Insufficient material to checkmate.";
    } else if (type === "resignation") {
      icon = "🏳";
      title = "RESIGNATION";

      const winnerName =
        winner === "w"
          ? getWhitePlayerName()
          : getBlackPlayerName();

      message =
        "<strong>" +
        winnerName +
        " Wins</strong><br>" +
        "The opponent resigned.";
    } else if (type === "timeout") {
      icon = "⏱";
      title = "TIMEOUT";

      const winnerName =
        winner === "w"
          ? getWhitePlayerName()
          : getBlackPlayerName();

      message =
        "<strong>" +
        winnerName +
        " Wins</strong><br>" +
        "The opponent ran out of time.";
    }

    const last =
      state.moveHistory[
        state.moveHistory.length - 1
      ];

    if (last) {
      message +=
        "<br><br><small>" +
        last.number +
        ". " +
        (last.color === "w"
          ? "White "
          : "Black ") +
        PIECE_NAMES[last.move.piece.type] +
        " " +
        last.notation +
        "</small>";
    }

    showOverlay(
      icon,
      title,
      message
    );

    updateBoardStatus();
  }

  /* =========================================================
     DRAW DETECTION
     ========================================================= */

  function isInsufficientMaterial(board) {
    const pieces = [];

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col];

        if (piece && piece.type !== "k") {
          pieces.push({
            ...piece,
            row,
            col
          });
        }
      }
    }

    if (pieces.length === 0) {
      return true;
    }

    if (pieces.length === 1) {
      return (
        pieces[0].type === "b" ||
        pieces[0].type === "n"
      );
    }

    if (
      pieces.length === 2 &&
      pieces.every(
        piece => piece.type === "b"
      )
    ) {
      const squareColors =
        pieces.map(
          piece =>
            (piece.row + piece.col) % 2
        );

      return (
        squareColors[0] ===
        squareColors[1]
      );
    }

    return false;
  }

  /* =========================================================
     PLAYER / MODE
     ========================================================= */

  function modeLabel(mode) {
    if (mode === "pvp") {
      return "Player vs Player";
    }

    if (mode === "pve") {
      return "Player vs AI";
    }

    if (mode === "eve") {
      return "AI vs AI";
    }

    if (mode === "battle") {
      return "ACE vs EMG";
    }

    return mode;
  }

  function isAIColor(color) {
    if (state.gameMode === "eve") {
      return true;
    }

    if (state.gameMode === "battle") {
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

  function getHumanColor() {
    if (state.gameMode === "pve") {
      return "w";
    }

    if (state.gameMode === "pvp") {
      return "w";
    }

    return null;
  }

  function getAIProfileForColor(color) {
    if (state.gameMode === "battle") {
      return color === "w"
        ? "ace"
        : "emg";
    }

    if (state.gameMode === "eve") {
      return color === "w"
        ? "ace"
        : "emg";
    }

    return state.aiProfile;
  }

  function getWhitePlayerName() {
    if (
      state.gameMode === "pve"
    ) {
      return "Commander";
    }

    if (
      state.gameMode === "eve" ||
      state.gameMode === "battle"
    ) {
      return "ACE";
    }

    return (
      whitePlayerNameEl &&
      whitePlayerNameEl.value
    ) || "White";
  }

  function getBlackPlayerName() {
    if (
      state.gameMode === "pve"
    ) {
      return (
        AI_PROFILES[
          state.aiProfile
        ] || AI_PROFILES.ace
      ).name;
    }

    if (
      state.gameMode === "eve"
    ) {
      return "EMG";
    }

    if (
      state.gameMode === "battle"
    ) {
      return "EMG";
    }

    return (
      blackPlayerNameEl &&
      blackPlayerNameEl.value
    ) || "Black";
  }

  /* =========================================================
     AI
     ========================================================= */

  function scheduleAI() {
    if (
      state.gameOver ||
      !state.started ||
      state.paused ||
      !isAIColor(state.turn)
    ) {
      return;
    }

    cancelAI();

    state.aiThinking = true;

    let delay =
      CONFIG.aiThinkDelay;

    if (state.aiSpeed === "fast") {
      delay = 180;
    }

    if (state.aiSpeed === "slow") {
      delay = 900;
    }

    state.aiTimer = setTimeout(() => {
      state.aiTimer = null;

      if (
        state.gameOver ||
        state.paused ||
        !state.started
      ) {
        state.aiThinking = false;
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
    }, delay);
  }

  function cancelAI() {
    if (state.aiTimer) {
      clearTimeout(state.aiTimer);
      state.aiTimer = null;
    }

    state.aiThinking = false;
  }

  function chooseAIMove(color) {
    const profileId =
      getAIProfileForColor(color);

    const profile =
      AI_PROFILES[profileId] ||
      AI_PROFILES.startup;

    const context = {
      castling: state.castling,
      enPassant: state.enPassant
    };

    const legalMoves =
      getLegalMovesForBoard(
        state.board,
        color,
        context
      );

    if (!legalMoves.length) {
      return null;
    }

    /*
      Small tactical safety layer:
      Prefer checkmate.
    */

    for (const move of legalMoves) {
      const next =
        applyMoveToBoard(
          state.board,
          move,
          context
        );

      if (
        isInCheck(
          next,
          opposite(color)
        )
      ) {
        const replies =
          getLegalMovesForBoard(
            next,
            opposite(color),
            {
              castling: context.castling,
              enPassant: null
            }
          );

        if (
          replies.length === 0
        ) {
          return move;
        }
      }
    }

    if (profile.depth <= 1) {
      return chooseOnePlyMove(
        legalMoves,
        color,
        profile
      );
    }

    let bestScore =
      color === "w"
        ? -Infinity
        : Infinity;

    let bestMoves = [];

    for (const move of legalMoves) {
      const next =
        applyMoveToBoard(
          state.board,
          move,
          context
        );

      const score =
        minimax(
          next,
          opposite(color),
          Math.max(
            0,
            profile.depth - 1
          ),
          -Infinity,
          Infinity,
          {
            castling: context.castling,
            enPassant: null
          }
        );

      if (color === "w") {
        if (score > bestScore) {
          bestScore = score;
          bestMoves = [move];
        } else if (
          score === bestScore
        ) {
          bestMoves.push(move);
        }
      } else {
        if (score < bestScore) {
          bestScore = score;
          bestMoves = [move];
        } else if (
          score === bestScore
        ) {
          bestMoves.push(move);
        }
      }
    }

    if (!bestMoves.length) {
      return legalMoves[0];
    }

    if (
      Math.random() <
      profile.randomness
    ) {
      return legalMoves[
        Math.floor(
          Math.random() *
          legalMoves.length
        )
      ];
    }

    return bestMoves[
      Math.floor(
        Math.random() *
        bestMoves.length
      )
    ];
  }

  function chooseOnePlyMove(
    moves,
    color,
    profile
  ) {
    let bestScore =
      color === "w"
        ? -Infinity
        : Infinity;

    let candidates = [];

    const context = {
      castling: state.castling,
      enPassant: state.enPassant
    };

    moves.forEach(move => {
      const next =
        applyMoveToBoard(
          state.board,
          move,
          context
        );

      const score =
        evaluateBoard(next);

      if (color === "w") {
        if (score > bestScore) {
          bestScore = score;
          candidates = [move];
        } else if (
          score === bestScore
        ) {
          candidates.push(move);
        }
      } else {
        if (score < bestScore) {
          bestScore = score;
          candidates = [move];
        } else if (
          score === bestScore
        ) {
          candidates.push(move);
        }
      }
    });

    if (
      Math.random() <
      profile.randomness
    ) {
      return moves[
        Math.floor(
          Math.random() *
          moves.length
        )
      ];
    }

    return candidates[
      Math.floor(
        Math.random() *
        candidates.length
      )
    ];
  }

  function minimax(
    board,
    color,
    depth,
    alpha,
    beta,
    context
  ) {
    if (depth <= 0) {
      return evaluateBoard(board);
    }

    const moves =
      getLegalMovesForBoard(
        board,
        color,
        context
      );

    if (!moves.length) {
      if (isInCheck(board, color)) {
        return color === "w"
          ? -999999
          : 999999;
      }

      return 0;
    }

    if (color === "w") {
      let best = -Infinity;

      for (const move of moves) {
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
              castling: context.castling,
              enPassant: null
            }
          );

        best = Math.max(
          best,
          score
        );

        alpha = Math.max(
          alpha,
          best
        );

        if (beta <= alpha) {
          break;
        }
      }

      return best;
    }

    let best = Infinity;

    for (const move of moves) {
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
            castling: context.castling,
            enPassant: null
          }
        );

      best = Math.min(
        best,
        score
      );

      beta = Math.min(
        beta,
        best
      );

      if (beta <= alpha) {
        break;
      }
    }

    return best;
  }

  function evaluateBoard(board) {
    let score = 0;

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col];

        if (!piece) continue;

        let value =
          PIECE_VALUES[piece.type];

        /*
          Small positional bonus.
        */

        if (piece.type === "p") {
          const advancement =
            piece.color === "w"
              ? 6 - row
              : row - 1;

          value +=
            Math.max(
              0,
              advancement * 4
            );
        }

        if (
          piece.type === "n" ||
          piece.type === "b"
        ) {
          if (
            row >= 2 &&
            row <= 5 &&
            col >= 2 &&
            col <= 5
          ) {
            value += 12;
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

        if (state.turn === "w") {
          state.whiteTime--;
        } else {
          state.blackTime--;
        }

        if (state.whiteTime <= 0) {
          state.whiteTime = 0;

          finishGame(
            "timeout",
            "b"
          );

          return;
        }

        if (state.blackTime <= 0) {
          state.blackTime = 0;

          finishGame(
            "timeout",
            "w"
          );

          return;
        }

        renderClocks();
      }, 1000);
  }

  function stopClock() {
    if (state.clockTimer) {
      clearInterval(
        state.clockTimer
      );

      state.clockTimer = null;
    }
  }

  function formatTime(seconds) {
    seconds = Math.max(
      0,
      seconds
    );

    const minutes =
      Math.floor(
        seconds / 60
      );

    const secs =
      seconds % 60;

    return (
      String(minutes).padStart(2, "0") +
      ":" +
      String(secs).padStart(2, "0")
    );
  }

  /* =========================================================
     GAME CONTROLS
     ========================================================= */

  function startGame() {
    if (state.gameOver) {
      resetGame(false);
    }

    state.started = true;
    state.paused = false;
    state.gameOver = false;
    state.result = null;

    hideOverlay();

    startClock();
    render();

    if (isAIColor(state.turn)) {
      scheduleAI();
    }
  }

  function startAIvsAI() {
    setGameMode("eve");

    resetGame(false);

    state.gameMode = "eve";

    updateModeUI();

    startGame();
  }

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
      cancelAI();
    } else if (
      isAIColor(state.turn)
    ) {
      scheduleAI();
    }

    render();
  }

  function resignGame() {
    if (
      !state.started ||
      state.gameOver
    ) {
      return;
    }

    const winner =
      opposite(state.turn);

    finishGame(
      "resignation",
      winner
    );
  }

  function resetGame(closeOverlay) {
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

    if (closeOverlay !== false) {
      hideOverlay();
    }

    render();
  }

  function setGameMode(mode) {
    if (
      mode !== "pvp" &&
      mode !== "pve" &&
      mode !== "eve" &&
      mode !== "battle"
    ) {
      mode = "pvp";
    }

    state.gameMode = mode;

    if (gameModeEl) {
      gameModeEl.value = mode;
    }

    cancelAI();

    if (mode === "eve" || mode === "battle") {
      state.started = false;
    }

    updateModeUI();
    render();
  }

  function cycleTheme() {
    if (
      window.ROLyfeChessThemes &&
      typeof
        window.ROLyfeChessThemes.next ===
          "function"
    ) {
      const next =
        window.ROLyfeChessThemes.next();

      updateThemeButton(next);
      return;
    }

    if (
      window.ROlyfeChessThemes &&
      typeof
        window.ROlyfeChessThemes.next ===
          "function"
    ) {
      const next =
        window.ROlyfeChessThemes.next();

      updateThemeButton(next);
    }
  }

  function updateThemeButton(themeId) {
    if (!themeButton) return;

    const names = {
      rolyfe: "RO’Lyfe",
      investor: "Investor",
      midnight: "Midnight",
      classic: "Classic",
      neon: "Neon"
    };

    themeButton.title =
      "Theme: " +
      (names[themeId] || themeId);
  }

  /* =========================================================
     BOARD CLICK
     ========================================================= */

  function handleBoardClick(event) {
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

    const square =
      event.target.closest(
        "[data-row][data-col]"
      );

    if (!square) return;

    const row =
      Number(
        square.dataset.row
      );

    const col =
      Number(
        square.dataset.col
      );

    if (!inBounds(row, col)) return;

    const piece =
      state.board[row][col];

    if (state.selected) {
      const move =
        state.legalMoves.find(
          candidate =>
            candidate.toRow === row &&
            candidate.toCol === col
        );

      if (move) {
        makeMove(move);
        return;
      }

      if (
        piece &&
        piece.color === state.turn
      ) {
        selectSquare(row, col);
        return;
      }

      state.selected = null;
      state.legalMoves = [];

      renderBoard();
      return;
    }

    if (
      piece &&
      piece.color === state.turn
    ) {
      selectSquare(row, col);
    }
  }

  function selectSquare(row, col) {
    const piece =
      state.board[row][col];

    if (
      !piece ||
      piece.color !== state.turn
    ) {
      return;
    }

    state.selected = {
      row,
      col
    };

    state.legalMoves =
      getLegalMovesFromSquare(
        row,
        col
      );

    renderBoard();
  }

  /* =========================================================
     RENDER BOARD
     ========================================================= */

  function renderBoard() {
    if (!boardEl) return;

    boardEl.innerHTML = "";

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const square =
          document.createElement("div");

        square.className =
          "chess-square " +
          (
            (row + col) % 2 === 0
              ? "light"
              : "dark"
          );

        square.dataset.row = row;
        square.dataset.col = col;

        if (
          state.selected &&
          state.selected.row === row &&
          state.selected.col === col
        ) {
          square.classList.add(
            "selected"
          );
        }

        if (
          state.lastMove &&
          (
            (
              state.lastMove.fromRow === row &&
              state.lastMove.fromCol === col
            ) ||
            (
              state.lastMove.toRow === row &&
              state.lastMove.toCol === col
            )
          )
        ) {
          square.classList.add(
            "last-move"
          );
        }

        const legal =
          state.legalMoves.some(
            move =>
              move.toRow === row &&
              move.toCol === col
          );

        if (legal) {
          square.classList.add(
            "legal-move"
          );

          if (
            state.board[row][col]
          ) {
            square.classList.add(
              "capture-move"
            );
          }
        }

        const piece =
          state.board[row][col];

        if (piece) {
          const pieceEl =
            document.createElement("span");

          pieceEl.className =
            "chess-piece " +
            (
              piece.color === "w"
                ? "white-piece"
                : "black-piece"
            );

          pieceEl.textContent =
            PIECES[
              piece.color === "w"
                ? piece.type.toUpperCase()
                : piece.type
            ];

          square.appendChild(
            pieceEl
          );
        }

        boardEl.appendChild(
          square
        );
      }
    }
  }

  /* =========================================================
     RENDER HISTORY
     ========================================================= */

  function renderHistory() {
    if (!moveHistoryEl) return;

    moveHistoryEl.innerHTML = "";

    if (
      state.moveHistory.length === 0
    ) {
      moveHistoryEl.innerHTML =
        '<div class="empty-history">No moves yet.</div>';

      return;
    }

    state.moveHistory.forEach(
      entry => {
        const row =
          document.createElement("div");

        row.className =
          "history-entry";

        const color =
          entry.color === "w"
            ? "White"
            : "Black";

        const pieceName =
          PIECE_NAMES[
            entry.move.piece.type
          ];

        row.innerHTML =
          "<span>" +
          entry.number +
          ".</span> " +
          "<strong>" +
          color +
          " " +
          pieceName +
          "</strong> " +
          entry.notation;

        moveHistoryEl.appendChild(
          row
        );
      }
    );

    moveHistoryEl.scrollTop =
      moveHistoryEl.scrollHeight;
  }

  /* =========================================================
     CAPTURED
     ========================================================= */

  function renderCaptured() {
    if (whiteCapturedEl) {
      whiteCapturedEl.textContent =
        state.captured.w
          .map(
            piece =>
              PIECES[
                piece.type
              ]
          )
          .join(" ");
    }

    if (blackCapturedEl) {
      blackCapturedEl.textContent =
        state.captured.b
          .map(
            piece =>
              PIECES[
                piece.type.toLowerCase()
              ]
          )
          .join(" ");
    }
  }

  /* =========================================================
     STATUS
     ========================================================= */

  function updateBoardStatus() {
    if (gameStatusEl) {
      if (state.gameOver) {
        if (
          state.result &&
          state.result.type ===
            "checkmate"
        ) {
          gameStatusEl.textContent =
            "Checkmate";
        } else if (
          state.result &&
          state.result.type ===
            "stalemate"
        ) {
          gameStatusEl.textContent =
            "Stalemate";
        } else if (
          state.result
        ) {
          gameStatusEl.textContent =
            "Game Over";
        } else {
          gameStatusEl.textContent =
            "Game Over";
        }
      } else if (state.paused) {
        gameStatusEl.textContent =
          "Paused";
      } else if (state.started) {
        gameStatusEl.textContent =
          "Live";
      } else {
        gameStatusEl.textContent =
          "Ready";
      }
    }

    if (turnStatusEl) {
      if (
        state.gameOver &&
        state.result &&
        state.result.winner
      ) {
        turnStatusEl.textContent =
          state.result.winner === "w"
            ? "White Wins"
            : "Black Wins";
      } else {
        turnStatusEl.textContent =
          state.turn === "w"
            ? "White"
            : "Black";
      }
    }

    if (modeStatusEl) {
      modeStatusEl.textContent =
        modeLabel(
          state.gameMode
        );
    }

    if (moveStatusEl) {
      moveStatusEl.textContent =
        state.lastMove
          ? state.lastMove.notation
          : "—";
    }

    if (moveNumberEl) {
      moveNumberEl.textContent =
        state.fullmove;
    }
  }

  function updateCheckStatus(inCheck) {
    if (!checkStatusEl) return;

    if (inCheck) {
      checkStatusEl.textContent =
        (
          state.turn === "w"
            ? "White"
            : "Black"
        ) +
        " is in check";
    } else {
      checkStatusEl.textContent =
        "No check";
    }
  }

  function updateModeUI() {
    if (modeStatusEl) {
      modeStatusEl.textContent =
        modeLabel(
          state.gameMode
        );
    }

    if (whitePlayerNameEl) {
      whitePlayerNameEl.value =
        getWhitePlayerName();
    }

    if (blackPlayerNameEl) {
      blackPlayerNameEl.value =
        getBlackPlayerName();
    }

    if (whitePlayerLevelEl) {
      whitePlayerLevelEl.textContent =
        state.gameMode === "pve"
          ? "Commander"
          : state.gameMode === "eve" ||
            state.gameMode === "battle"
          ? "ACE"
          : "Player";
    }

    if (blackPlayerLevelEl) {
      blackPlayerLevelEl.textContent =
        state.gameMode === "pve"
          ? (
              AI_PROFILES[
                state.aiProfile
              ] ||
              AI_PROFILES.startup
            ).name
          : state.gameMode === "eve" ||
            state.gameMode === "battle"
          ? "EMG"
          : "Player";
    }
  }

  /* =========================================================
     CLOCK RENDER
     ========================================================= */

  function renderClocks() {
    if (whiteClockEl) {
      whiteClockEl.textContent =
        formatTime(
          state.whiteTime
        );
    }

    if (blackClockEl) {
      blackClockEl.textContent =
        formatTime(
          state.blackTime
        );
    }
  }

  /* =========================================================
     STATS
     ========================================================= */

  function loadStats() {
    try {
      const raw =
        localStorage.getItem(
          CONFIG.storageKey
        );

      if (!raw) return;

      const saved =
        JSON.parse(raw);

      state.stats = {
        played:
          Number(saved.played) || 0,

        wins:
          Number(saved.wins) || 0,

        rating:
          Number(saved.rating) || 1200
      };
    } catch (error) {
      console.warn(
        "RO’Lyfe Chess stats load failed:",
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
        "RO’Lyfe Chess stats save failed:",
        error
      );
    }
  }

  function updateStats(
    type,
    winner
  ) {
    const humanColor =
      getHumanColor();

    /*
      AI-vs-AI does not count as
      Commander wins/losses.
    */

    if (
      state.gameMode === "eve" ||
      state.gameMode === "battle"
    ) {
      return;
    }

    state.stats.played++;

    if (
      winner &&
      humanColor &&
      winner === humanColor
    ) {
      state.stats.wins++;
      state.stats.rating += 20;
    } else if (
      winner &&
      humanColor
    ) {
      state.stats.rating =
        Math.max(
          800,
          state.stats.rating - 15
        );
    }

    saveStats();
    renderStats();
  }

  function renderStats() {
    if (commanderRatingEl) {
      commanderRatingEl.textContent =
        state.stats.rating;
    }

    if (gamesPlayedEl) {
      gamesPlayedEl.textContent =
        state.stats.played;
    }

    if (gamesWonEl) {
      gamesWonEl.textContent =
        state.stats.wins;
    }

    if (winRateEl) {
      const rate =
        state.stats.played
          ? (
              state.stats.wins /
              state.stats.played *
              100
            ).toFixed(0)
          : 0;

      winRateEl.textContent =
        rate + "%";
    }
  }

  function clearStats() {
    state.stats = {
      played: 0,
      wins: 0,
      rating: 1200
    };

    saveStats();
    renderStats();
  }

  /* =========================================================
     OVERLAY
     ========================================================= */

  function showOverlay(
    icon,
    title,
    message
  ) {
    if (!gameOverlayEl) return;

    if (overlayIconEl) {
      overlayIconEl.textContent =
        icon;
    }

    if (overlayTitleEl) {
      overlayTitleEl.textContent =
        title;
    }

    if (overlayMessageEl) {
      overlayMessageEl.innerHTML =
        message;
    }

    gameOverlayEl.classList.add(
      "active"
    );

    gameOverlayEl.removeAttribute(
      "hidden"
    );
  }

  function hideOverlay() {
    if (!gameOverlayEl) return;

    gameOverlayEl.classList.remove(
      "active"
    );

    gameOverlayEl.setAttribute(
      "hidden",
      ""
    );
  }

  /* =========================================================
     FULL RENDER
     ========================================================= */

  function render() {
    renderBoard();
    renderHistory();
    renderCaptured();
    renderClocks();
    renderStats();
    updateModeUI();
    updateBoardStatus();

    const inCheck =
      isInCheck(
        state.board,
        state.turn
      );

    updateCheckStatus(
      inCheck
    );
  }

  /* =========================================================
     EVENTS
     ========================================================= */

  function bindEvents() {
    if (initialized) return;

    initialized = true;

    if (boardEl) {
      boardEl.addEventListener(
        "click",
        handleBoardClick
      );
    }

    if (startGameButton) {
      startGameButton.addEventListener(
        "click",
        startGame
      );
    }

    if (aiStartButton) {
      aiStartButton.addEventListener(
        "click",
        startAIvsAI
      );
    }

    if (pauseGameButton) {
      pauseGameButton.addEventListener(
        "click",
        togglePause
      );
    }

    if (resignButton) {
      resignButton.addEventListener(
        "click",
        resignGame
      );
    }

    if (resetGameButton) {
      resetGameButton.addEventListener(
        "click",
        () => resetGame(false)
      );
    }

    if (themeButton) {
      themeButton.addEventListener(
        "click",
        cycleTheme
      );
    }

    if (overlayRestartButton) {
      overlayRestartButton.addEventListener(
        "click",
        () => {
          resetGame(true);
          startGame();
        }
      );
    }

    if (overlayCloseButton) {
      overlayCloseButton.addEventListener(
        "click",
        hideOverlay
      );
    }

    if (clearHistoryButton) {
      clearHistoryButton.addEventListener(
        "click",
        () => {
          state.moveHistory = [];
          renderHistory();
        }
      );
    }

    if (gameModeEl) {
      gameModeEl.addEventListener(
        "change",
        () => {
          setGameMode(
            gameModeEl.value
          );
        }
      );
    }

    if (aiProfileEl) {
      aiProfileEl.addEventListener(
        "change",
        () => {
          state.aiProfile =
            aiProfileEl.value;

          updateModeUI();
        }
      );
    }

    if (difficultyEl) {
      difficultyEl.addEventListener(
        "change",
        () => {
          const value =
            difficultyEl.value;

          if (
            AI_PROFILES[value]
          ) {
            state.aiProfile =
              value;
          }
        }
      );
    }

    if (aiSpeedEl) {
      aiSpeedEl.addEventListener(
        "change",
        () => {
          state.aiSpeed =
            aiSpeedEl.value ||
            "normal";
        }
      );
    }

    /*
      Safety:
      If the browser tab is hidden,
      pause active gameplay rather
      than allowing the clock to run
      unexpectedly.
    */

    document.addEventListener(
      "visibilitychange",
      () => {
        if (
          document.hidden &&
          state.started &&
          !state.gameOver
        ) {
          state.paused = true;
          cancelAI();
          render();
        }
      }
    );
  }

  /* =========================================================
     INITIALIZATION
     ========================================================= */

  function init() {
    cacheDOM();

    loadStats();

    state.board =
      createInitialBoard();

    if (gameModeEl) {
      state.gameMode =
        gameModeEl.value ||
        "pvp";
    }

    if (aiProfileEl) {
      state.aiProfile =
        aiProfileEl.value ||
        "startup";
    }

    if (aiSpeedEl) {
      state.aiSpeed =
        aiSpeedEl.value ||
        "normal";
    }

    bindEvents();

    /*
      Theme engine is a separate file.
      Do not replace or recreate it here.
    */

    if (
      window.ROLyfeChessThemes
    ) {
      const current =
        window.ROLyfeChessThemes.get();

      window.ROLyfeChessThemes.apply(
        current
      );

      updateThemeButton(
        current
      );
    } else if (
      window.ROlyfeChessThemes
    ) {
      const current =
        window.ROlyfeChessThemes.get();

      window.ROlyfeChessThemes.apply(
        current
      );

      updateThemeButton(
        current
      );
    }

    render();
  }

  /* =========================================================
     PUBLIC API
     ========================================================= */

  window.ROLyfeChess = {
    version: CONFIG.version,

    state,

    start: startGame,
    startAIvsAI,

    pause: togglePause,
    resign: resignGame,
    reset: resetGame,

    setMode: setGameMode,

    nextTheme: cycleTheme,

    getLegalMoves:
      getLegalMovesFromSquare,

    makeMove,

    getBoard: () =>
      cloneBoard(state.board),

    getStats: () => ({
      ...state.stats
    })
  };

  /*
    Compatibility alias.
  */

  window.ROlyfeChess =
    window.ROLyfeChess;

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
