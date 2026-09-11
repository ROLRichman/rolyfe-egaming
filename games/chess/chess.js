/* =========================================================
   RO’LYFE CHESS
   games/chess/chess.js
   V1.2 — GAME RESULT / CHECKMATE SYSTEM
   ========================================================= */

(() => {
  "use strict";

  /* =========================================================
     CONFIG
     ========================================================= */

  const CONFIG = {
    startingTime: 600,
    storageKey: "rolyfe-chess-stats"
  };

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

  const AI_PROFILES = {
    startup: {
      id: "startup",
      name: "Start-Up",
      level: 1,
      depth: 1
    },

    credit: {
      id: "credit",
      name: "Credit",
      level: 2,
      depth: 1
    },

    line: {
      id: "line",
      name: "Line of Credit",
      level: 3,
      depth: 2
    },

    investor: {
      id: "investor",
      name: "Investor",
      level: 4,
      depth: 2
    },

    sevenfigures: {
      id: "sevenfigures",
      name: "7Figures",
      level: 5,
      depth: 3
    },

    ace: {
      id: "ace",
      name: "ACE",
      level: 5,
      depth: 3
    },

    emg: {
      id: "emg",
      name: "EMG",
      level: 5,
      depth: 3
    }
  };

  /* =========================================================
     STATE
     ========================================================= */

  const state = {
    board: [],
    turn: "w",

    gameMode: "pve",
    aiProfile: "ace",
    difficulty: "5",
    aiSpeed: "normal",

    selected: null,
    legalTargets: [],

    moveHistory: [],
    capturedWhite: [],
    capturedBlack: [],

    halfmove: 0,
    fullmove: 1,

    castling: {
      wK: true,
      wQ: true,
      bK: true,
      bQ: true
    },

    enPassant: null,

    whiteTime: CONFIG.startingTime,
    blackTime: CONFIG.startingTime,

    timerInterval: null,
    aiTimer: null,

    gameStarted: false,
    gameOver: false,
    paused: false,

    result: null,
    winner: null,
    loser: null,

    stats: {
      games: 0,
      wins: 0,
      rating: 1200
    }
  };

  /* =========================================================
     DOM
     ========================================================= */

  const $ = id => document.getElementById(id);

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
     BOARD CREATION
     ========================================================= */

  function createInitialBoard() {
    return [
      [
        { type: "R", color: "b" },
        { type: "N", color: "b" },
        { type: "B", color: "b" },
        { type: "Q", color: "b" },
        { type: "K", color: "b" },
        { type: "B", color: "b" },
        { type: "N", color: "b" },
        { type: "R", color: "b" }
      ],
      [
        { type: "P", color: "b" },
        { type: "P", color: "b" },
        { type: "P", color: "b" },
        { type: "P", color: "b" },
        { type: "P", color: "b" },
        { type: "P", color: "b" },
        { type: "P", color: "b" },
        { type: "P", color: "b" }
      ],
      Array(8).fill(null),
      Array(8).fill(null),
      Array(8).fill(null),
      Array(8).fill(null),
      [
        { type: "P", color: "w" },
        { type: "P", color: "w" },
        { type: "P", color: "w" },
        { type: "P", color: "w" },
        { type: "P", color: "w" },
        { type: "P", color: "w" },
        { type: "P", color: "w" },
        { type: "P", color: "w" }
      ],
      [
        { type: "R", color: "w" },
        { type: "N", color: "w" },
        { type: "B", color: "w" },
        { type: "Q", color: "w" },
        { type: "K", color: "w" },
        { type: "B", color: "w" },
        { type: "N", color: "w" },
        { type: "R", color: "w" }
      ]
    ];
  }

  /* =========================================================
     UTILITIES
     ========================================================= */

  function cloneBoard(board) {
    return board.map(row =>
      row.map(piece =>
        piece ? { ...piece } : null
      )
    );
  }

  function inside(r, c) {
    return r >= 0 && r < 8 && c >= 0 && c < 8;
  }

  function opposite(color) {
    return color === "w" ? "b" : "w";
  }

  function squareName(r, c) {
    return "abcdefgh"[c] + (8 - r);
  }

  function pieceName(piece) {
    if (!piece) return "Unknown Piece";

    const color =
      piece.color === "w"
        ? "White"
        : "Black";

    return `${color} ${PIECE_NAMES[piece.type] || "Piece"}`;
  }

  function formatTime(seconds) {
    seconds = Math.max(0, Math.floor(seconds));

    const minutes =
      String(Math.floor(seconds / 60)).padStart(2, "0");

    const secs =
      String(seconds % 60).padStart(2, "0");

    return `${minutes}:${secs}`;
  }

  function isHumanTurn() {
    if (state.gameMode === "pvp") return true;
    if (state.gameMode === "pve") return state.turn === "w";

    return false;
  }

  function isAITurn() {
    return (
      state.gameMode === "pve" &&
      state.turn === "b"
    );
  }

  /* =========================================================
     MOVE GENERATION
     ========================================================= */

  function generatePseudoMoves(board, r, c, options = {}) {
    const piece = board[r]?.[c];

    if (!piece) return [];

    const moves = [];

    const add = (toR, toC, extra = {}) => {
      if (!inside(toR, toC)) return;

      const target = board[toR][toC];

      if (
        target &&
        target.color === piece.color
      ) {
        return;
      }

      if (
        target &&
        target.type === "K"
      ) {
        return;
      }

      moves.push({
        from: { r, c },
        to: { r: toR, c: toC },
        piece: { ...piece },
        capture: !!target,
        captured: target ? { ...target } : null,
        ...extra
      });
    };

    /* -------------------------
       PAWN
       ------------------------- */

    if (piece.type === "P") {
      const direction =
        piece.color === "w" ? -1 : 1;

      const startRow =
        piece.color === "w" ? 6 : 1;

      const promotionRow =
        piece.color === "w" ? 0 : 7;

      const oneR = r + direction;

      if (
        inside(oneR, c) &&
        !board[oneR][c]
      ) {
        add(oneR, c, {
          promotion:
            oneR === promotionRow
              ? "Q"
              : null
        });

        const twoR =
          r + direction * 2;

        if (
          r === startRow &&
          !board[twoR][c]
        ) {
          add(twoR, c, {
            pawnDouble: true
          });
        }
      }

      for (const dc of [-1, 1]) {
        const tr = r + direction;
        const tc = c + dc;

        if (!inside(tr, tc)) continue;

        const target =
          board[tr][tc];

        if (
          target &&
          target.color !== piece.color &&
          target.type !== "K"
        ) {
          add(tr, tc, {
            promotion:
              tr === promotionRow
                ? "Q"
                : null
          });
        }

        if (
          state.enPassant &&
          state.enPassant.r === tr &&
          state.enPassant.c === tc
        ) {
          add(tr, tc, {
            enPassant: true,
            capture: true,
            captured: {
              type: "P",
              color: opposite(piece.color)
            }
          });
        }
      }

      return moves;
    }

    /* -------------------------
       KNIGHT
       ------------------------- */

    if (piece.type === "N") {
      const offsets = [
        [-2, -1],
        [-2, 1],
        [-1, -2],
        [-1, 2],
        [1, -2],
        [1, 2],
        [2, -1],
        [2, 1]
      ];

      offsets.forEach(([dr, dc]) =>
        add(r + dr, c + dc)
      );

      return moves;
    }

    /* -------------------------
       BISHOP / ROOK / QUEEN
       ------------------------- */

    if (
      piece.type === "B" ||
      piece.type === "R" ||
      piece.type === "Q"
    ) {
      const directions = [];

      if (
        piece.type === "B" ||
        piece.type === "Q"
      ) {
        directions.push(
          [-1, -1],
          [-1, 1],
          [1, -1],
          [1, 1]
        );
      }

      if (
        piece.type === "R" ||
        piece.type === "Q"
      ) {
        directions.push(
          [-1, 0],
          [1, 0],
          [0, -1],
          [0, 1]
        );
      }

      directions.forEach(([dr, dc]) => {
        let tr = r + dr;
        let tc = c + dc;

        while (inside(tr, tc)) {
          const target = board[tr][tc];

          if (!target) {
            add(tr, tc);
          } else {
            if (
              target.color !== piece.color &&
              target.type !== "K"
            ) {
              add(tr, tc);
            }

            break;
          }

          tr += dr;
          tc += dc;
        }
      });

      return moves;
    }

    /* -------------------------
       KING
       ------------------------- */

    if (piece.type === "K") {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          add(r + dr, c + dc);
        }
      }

      if (!options.skipCastling) {
        addCastlingMoves(
          board,
          r,
          c,
          piece.color,
          moves
        );
      }

      return moves;
    }

    return moves;
  }

  /* =========================================================
     ATTACK DETECTION
     ========================================================= */

  function isSquareAttacked(board, r, c, byColor) {
    for (let pr = 0; pr < 8; pr++) {
      for (let pc = 0; pc < 8; pc++) {
        const piece = board[pr][pc];

        if (
          !piece ||
          piece.color !== byColor
        ) {
          continue;
        }

        if (piece.type === "P") {
          const direction =
            piece.color === "w" ? -1 : 1;

          if (
            pr + direction === r &&
            Math.abs(pc - c) === 1
          ) {
            return true;
          }

          continue;
        }

        if (piece.type === "K") {
          if (
            Math.max(
              Math.abs(pr - r),
              Math.abs(pc - c)
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
            { skipCastling: true }
          );

        if (
          moves.some(
            move =>
              move.to.r === r &&
              move.to.c === c
          )
        ) {
          return true;
        }
      }
    }

    return false;
  }

  function findKing(board, color) {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];

        if (
          piece &&
          piece.color === color &&
          piece.type === "K"
        ) {
          return { r, c };
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
      king.r,
      king.c,
      opposite(color)
    );
  }

  /* =========================================================
     CASTLING
     ========================================================= */

  function addCastlingMoves(
    board,
    r,
    c,
    color,
    moves
  ) {
    if (state.gameOver) return;

    const homeRow =
      color === "w" ? 7 : 0;

    if (r !== homeRow || c !== 4) {
      return;
    }

    if (
      isInCheck(board, color)
    ) {
      return;
    }

    const enemy = opposite(color);

    /* KING SIDE */

    const kingSideRight =
      color === "w"
        ? state.castling.wK
        : state.castling.bK;

    if (
      kingSideRight &&
      board[homeRow][7]?.type === "R" &&
      board[homeRow][7]?.color === color &&
      !board[homeRow][5] &&
      !board[homeRow][6] &&
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
      moves.push({
        from: { r, c },
        to: {
          r: homeRow,
          c: 6
        },
        piece: { ...board[r][c] },
        castle: "K"
      });
    }

    /* QUEEN SIDE */

    const queenSideRight =
      color === "w"
        ? state.castling.wQ
        : state.castling.bQ;

    if (
      queenSideRight &&
      board[homeRow][0]?.type === "R" &&
      board[homeRow][0]?.color === color &&
      !board[homeRow][1] &&
      !board[homeRow][2] &&
      !board[homeRow][3] &&
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
      moves.push({
        from: { r, c },
        to: {
          r: homeRow,
          c: 2
        },
        piece: { ...board[r][c] },
        castle: "Q"
      });
    }
  }

  /* =========================================================
     APPLY MOVE TO BOARD
     ========================================================= */

  function applyMoveToBoard(
    board,
    move
  ) {
    const next = cloneBoard(board);

    const piece =
      next[move.from.r][move.from.c];

    next[move.from.r][move.from.c] = null;

    if (move.enPassant) {
      const captureRow =
        move.from.r;

      next[captureRow][move.to.c] = null;
    }

    if (move.castle === "K") {
      const row = move.from.r;

      next[row][6] = piece;

      next[row][5] =
        next[row][7];

      next[row][7] = null;
    } else if (move.castle === "Q") {
      const row = move.from.r;

      next[row][2] = piece;

      next[row][3] =
        next[row][0];

      next[row][0] = null;
    } else {
      next[move.to.r][move.to.c] = {
        ...piece,
        type:
          move.promotion || piece.type
      };
    }

    return next;
  }

  /* =========================================================
     LEGAL MOVES
     ========================================================= */

  function getLegalMovesFromBoard(
    board,
    r,
    c,
    color
  ) {
    const piece = board[r]?.[c];

    if (
      !piece ||
      piece.color !== color
    ) {
      return [];
    }

    const pseudo =
      generatePseudoMoves(
        board,
        r,
        c
      );

    const legal = [];

    for (const move of pseudo) {
      const testBoard =
        applyMoveToBoard(
          board,
          move
        );

      if (
        !isInCheck(
          testBoard,
          color
        )
      ) {
        legal.push(move);
      }
    }

    return legal;
  }

  function getAllLegalMoves(
    board,
    color
  ) {
    const moves = [];

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];

        if (
          piece &&
          piece.color === color
        ) {
          moves.push(
            ...getLegalMovesFromBoard(
              board,
              r,
              c,
              color
            )
          );
        }
      }
    }

    return moves;
  }

  /* =========================================================
     CHECK / MATE / DRAW
     ========================================================= */

  function isCheckmate(
    board,
    color
  ) {
    return (
      isInCheck(board, color) &&
      getAllLegalMoves(
        board,
        color
      ).length === 0
    );
  }

  function isStalemate(
    board,
    color
  ) {
    return (
      !isInCheck(board, color) &&
      getAllLegalMoves(
        board,
        color
      ).length === 0
    );
  }

  function insufficientMaterial(
    board
  ) {
    const pieces = [];

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];

        if (
          piece &&
          piece.type !== "K"
        ) {
          pieces.push(piece);
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
        piece => piece.type === "B"
      )
    ) {
      return true;
    }

    return false;
  }

  /* =========================================================
     SAN NOTATION
     ========================================================= */

  function makeNotation(
    move,
    beforeBoard,
    afterBoard,
    moverColor
  ) {
    const piece =
      beforeBoard[
        move.from.r
      ][move.from.c];

    if (move.castle === "K") {
      return "O-O";
    }

    if (move.castle === "Q") {
      return "O-O-O";
    }

    let notation = "";

    if (piece.type !== "P") {
      notation += piece.type;
    }

    const isCapture =
      move.capture ||
      move.enPassant;

    if (piece.type === "P" && isCapture) {
      notation +=
        "abcdefgh"[move.from.c];
    }

    if (isCapture) {
      notation += "x";
    }

    notation += squareName(
      move.to.r,
      move.to.c
    );

    if (move.promotion) {
      notation += `=${move.promotion}`;
    }

    const enemy =
      opposite(moverColor);

    if (
      isCheckmate(
        afterBoard,
        enemy
      )
    ) {
      notation += "#";
    } else if (
      isInCheck(
        afterBoard,
        enemy
      )
    ) {
      notation += "+";
    }

    return notation;
  }

  /* =========================================================
     HISTORY
     ========================================================= */

  function renderHistory() {
    if (!els.moveHistory) return;

    if (
      state.moveHistory.length === 0
    ) {
      els.moveHistory.innerHTML =
        `<div class="history-empty">No moves yet.</div>`;
      return;
    }

    els.moveHistory.innerHTML = "";

    let pairNumber = 0;

    for (
      let index = 0;
      index < state.moveHistory.length;
      index += 2
    ) {
      pairNumber++;

      const white =
        state.moveHistory[index];

      const black =
        state.moveHistory[index + 1];

      if (white) {
        const whiteEl =
          document.createElement("div");

        whiteEl.className =
          "history-move";

        const whitePiece =
          pieceName(
            white.move?.piece
          );

        whiteEl.innerHTML = `
          <span class="history-number">
            ${pairNumber}.
          </span>
          <span class="history-piece-name">
            ${whitePiece}
          </span>
          <span class="history-notation">
            ${white.notation}
          </span>
        `;

        els.moveHistory.appendChild(
          whiteEl
        );
      }

      if (black) {
        const blackEl =
          document.createElement("div");

        blackEl.className =
          "history-move";

        const blackPiece =
          pieceName(
            black.move?.piece
          );

        blackEl.innerHTML = `
          <span class="history-number">
            …
          </span>
          <span class="history-piece-name">
            ${blackPiece}
          </span>
          <span class="history-notation">
            ${black.notation}
          </span>
        `;

        els.moveHistory.appendChild(
          blackEl
        );
      }
    }

    els.moveHistory.scrollTop =
      els.moveHistory.scrollHeight;
  }

  /* =========================================================
     CAPTURE DISPLAY
     ========================================================= */

  function renderCaptured() {
    if (els.whiteCaptured) {
      els.whiteCaptured.textContent =
        state.capturedWhite
          .map(
            piece =>
              PIECES.w[piece.type]
          )
          .join(" ");
    }

    if (els.blackCaptured) {
      els.blackCaptured.textContent =
        state.capturedBlack
          .map(
            piece =>
              PIECES.b[piece.type]
          )
          .join(" ");
    }
  }

  /* =========================================================
     BOARD RENDER
     ========================================================= */

  function renderBoard() {
    if (!els.board) return;

    els.board.innerHTML = "";

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const square =
          document.createElement("button");

        square.type = "button";

        square.className =
          "chess-square " +
          ((r + c) % 2 === 0
            ? "light"
            : "dark");

        square.dataset.row = r;
        square.dataset.col = c;

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
          state.legalTargets.some(
            target =>
              target.r === r &&
              target.c === c
          )
        ) {
          square.classList.add(
            "legal"
          );
        }

        const piece =
          state.board[r][c];

        if (piece) {
          const pieceEl =
            document.createElement("span");

          pieceEl.className =
            `chess-piece ${
              piece.color === "w"
                ? "white-piece"
                : "black-piece"
            }`;

          pieceEl.textContent =
            PIECES[piece.color][
              piece.type
            ];

          square.appendChild(
            pieceEl
          );
        }

        square.addEventListener(
          "click",
          () =>
            handleSquareClick(r, c)
        );

        els.board.appendChild(
          square
        );
      }
    }
  }

  /* =========================================================
     PLAYER LABELS
     ========================================================= */

  function updatePlayerLabels() {
    let whiteName = "Player";
    let blackName = "ACE";

    if (state.gameMode === "pvp") {
      blackName = "Player 2";
    }

    if (state.gameMode === "eve") {
      whiteName = "ACE";
      blackName = "EMG";
    }

    if (state.gameMode === "battle") {
      whiteName = "ACE";
      blackName = "EMG";
    }

    if (els.whitePlayerName) {
      els.whitePlayerName.textContent =
        whiteName;
    }

    if (els.blackPlayerName) {
      els.blackPlayerName.textContent =
        blackName;
    }

    if (els.whitePlayerLevel) {
      els.whitePlayerLevel.textContent =
        state.gameMode === "pvp"
          ? "PLAYER"
          : "ACE";
    }

    if (els.blackPlayerLevel) {
      els.blackPlayerLevel.textContent =
        state.gameMode === "pvp"
          ? "PLAYER"
          : "AI";
    }
  }

  /* =========================================================
     STATUS
     ========================================================= */

  function updateStatus() {
    if (els.modeStatus) {
      const modeText = {
        pvp: "Player vs Player",
        pve: "Player vs ACE",
        eve: "ACE vs EMG",
        battle: "Battle"
      };

      els.modeStatus.textContent =
        modeText[state.gameMode] ||
        "Player vs ACE";
    }

    if (els.moveNumber) {
      els.moveNumber.textContent =
        state.fullmove;
    }

    if (els.moveStatus) {
      els.moveStatus.textContent =
        state.moveHistory.length;
    }

    if (state.gameOver) {
      return;
    }

    if (els.gameStatus) {
      els.gameStatus.textContent =
        state.gameStarted
          ? state.paused
            ? "Paused"
            : "Live"
          : "Ready";
    }

    if (els.turnStatus) {
      els.turnStatus.textContent =
        state.turn === "w"
          ? "White"
          : "Black";
    }

    const inCheck =
      isInCheck(
        state.board,
        state.turn
      );

    if (els.checkStatus) {
      els.checkStatus.textContent =
        inCheck
          ? "CHECK"
          : "Clear";

      els.checkStatus.classList.toggle(
        "check-active",
        inCheck
      );
    }
  }

  /* =========================================================
     CLOCKS
     ========================================================= */

  function renderClocks() {
    if (els.whiteClock) {
      els.whiteClock.textContent =
        formatTime(
          state.whiteTime
        );
    }

    if (els.blackClock) {
      els.blackClock.textContent =
        formatTime(
          state.blackTime
        );
    }
  }

  function stopClock() {
    if (
      state.timerInterval
    ) {
      clearInterval(
        state.timerInterval
      );

      state.timerInterval = null;
    }
  }

  function startClock() {
    stopClock();

    if (
      !state.gameStarted ||
      state.gameOver ||
      state.paused
    ) {
      return;
    }

    state.timerInterval =
      setInterval(() => {
        if (
          state.paused ||
          state.gameOver
        ) {
          return;
        }

        if (state.turn === "w") {
          state.whiteTime--;

          if (
            state.whiteTime <= 0
          ) {
            state.whiteTime = 0;

            finishGame({
              winner: "b",
              reason: "time"
            });

            return;
          }
        } else {
          state.blackTime--;

          if (
            state.blackTime <= 0
          ) {
            state.blackTime = 0;

            finishGame({
              winner: "w",
              reason: "time"
            });

            return;
          }
        }

        renderClocks();
      }, 1000);
  }

  /* =========================================================
     STATS
     ========================================================= */

  function loadStats() {
    try {
      const saved =
        JSON.parse(
          localStorage.getItem(
            CONFIG.storageKey
          ) || "null"
        );

      if (saved) {
        state.stats = {
          games:
            Number(saved.games) || 0,

          wins:
            Number(saved.wins) || 0,

          rating:
            Number(saved.rating) || 1200
        };
      }
    } catch (error) {
      state.stats = {
        games: 0,
        wins: 0,
        rating: 1200
      };
    }

    renderStats();
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
        "Unable to save chess stats.",
        error
      );
    }
  }

  function renderStats() {
    if (els.commanderRating) {
      els.commanderRating.textContent =
        state.stats.rating;
    }

    if (els.gamesPlayed) {
      els.gamesPlayed.textContent =
        state.stats.games;
    }

    if (els.gamesWon) {
      els.gamesWon.textContent =
        state.stats.wins;
    }

    if (els.winRate) {
      const rate =
        state.stats.games > 0
          ? Math.round(
              (state.stats.wins /
                state.stats.games) *
                100
            )
          : 0;

      els.winRate.textContent =
        `${rate}%`;
    }
  }

  function updateStatsForResult(
    winner,
    reason
  ) {
    /*
      Commander stats are player-focused.

      PVE:
        White = Player
        Black = ACE

      PVP:
        Track completed game.
        A White win counts as a Player win.

      AI-vs-AI:
        Games still register,
        but no human win is recorded.
    */

    if (
      state.gameMode === "eve" ||
      state.gameMode === "battle"
    ) {
      return;
    }

    state.stats.games++;

    if (
      state.gameMode === "pve" &&
      winner === "w"
    ) {
      state.stats.wins++;
      state.stats.rating +=
        reason === "checkmate"
          ? 25
          : 10;
    } else if (
      state.gameMode === "pvp" &&
      winner === "w"
    ) {
      state.stats.wins++;
      state.stats.rating +=
        reason === "checkmate"
          ? 15
          : 5;
    }

    saveStats();
    renderStats();
  }

  /* =========================================================
     RESULT OVERLAY
     ========================================================= */

  function showResultOverlay(
    title,
    message,
    icon = "♔"
  ) {
    if (!els.gameOverlay) {
      return;
    }

    if (els.overlayIcon) {
      els.overlayIcon.textContent =
        icon;
    }

    if (els.overlayTitle) {
      els.overlayTitle.textContent =
        title;
    }

    if (els.overlayMessage) {
      els.overlayMessage.textContent =
        message;
    }

    els.gameOverlay.classList.add(
      "active",
      "show"
    );

    els.gameOverlay.hidden = false;
  }

  function hideResultOverlay() {
    if (!els.gameOverlay) {
      return;
    }

    els.gameOverlay.classList.remove(
      "active",
      "show"
    );

    els.gameOverlay.hidden = true;
  }

  /* =========================================================
     GAME RESULT
     ========================================================= */

  function finishGame({
    winner = null,
    reason = "unknown"
  } = {}) {
    if (state.gameOver) {
      return;
    }

    state.gameOver = true;
    state.gameStarted = false;
    state.paused = false;

    state.winner = winner;
    state.loser =
      winner
        ? opposite(winner)
        : null;

    state.result = reason;

    stopClock();

    if (state.aiTimer) {
      clearTimeout(
        state.aiTimer
      );

      state.aiTimer = null;
    }

    let title = "GAME OVER";
    let message = "";
    let icon = "♟";

    if (reason === "checkmate") {
      icon =
        winner === "w"
          ? "♔"
          : "♚";

      title = "CHECKMATE!";

      const winnerName =
        getPlayerName(winner);

      const loserName =
        getPlayerName(
          opposite(winner)
        );

      message =
        `${winnerName} wins. ${loserName} has been checkmated.`;
    }

    else if (
      reason === "stalemate"
    ) {
      icon = "½";
      title = "STALEMATE";
      message =
        "The game ends in a draw by stalemate.";
    }

    else if (
      reason === "insufficient"
    ) {
      icon = "½";
      title = "DRAW";
      message =
        "The game ends in a draw by insufficient material.";
    }

    else if (
      reason === "fifty-move"
    ) {
      icon = "½";
      title = "DRAW";
      message =
        "The game ends in a draw by the 50-move rule.";
    }

    else if (
      reason === "time"
    ) {
      icon =
        winner === "w"
          ? "♔"
          : "♚";

      title = "TIME EXPIRED";

      message =
        `${getPlayerName(winner)} wins on time.`;
    }

    else if (
      reason === "resignation"
    ) {
      icon =
        winner === "w"
          ? "♔"
          : "♚";

      title = "RESIGNATION";

      message =
        `${getPlayerName(winner)} wins by resignation.`;
    }

    else {
      title = "GAME OVER";

      message =
        winner
          ? `${getPlayerName(winner)} wins.`
          : "The game has ended.";
    }

    updateStatsForResult(
      winner,
      reason
    );

    if (els.gameStatus) {
      els.gameStatus.textContent =
        reason === "checkmate"
          ? "Checkmate"
          : title;
    }

    if (els.turnStatus) {
      els.turnStatus.textContent =
        winner
          ? `${getPlayerName(winner)} Wins`
          : "Draw";
    }

    if (els.checkStatus) {
      els.checkStatus.textContent =
        reason === "checkmate"
          ? "CHECKMATE"
          : reason === "stalemate"
            ? "STALEMATE"
            : reason === "time"
              ? "TIME"
              : "GAME OVER";

      els.checkStatus.classList.toggle(
        "check-active",
        reason === "checkmate"
      );
    }

    showResultOverlay(
      title,
      message,
      icon
    );

    renderBoard();
    renderClocks();
    renderHistory();
    renderCaptured();
    renderStats();
  }

  function getPlayerName(
    color
  ) {
    if (
      color === "w"
    ) {
      return (
        els.whitePlayerName
          ?.textContent
          ?.trim() ||
        "White"
      );
    }

    return (
      els.blackPlayerName
        ?.textContent
        ?.trim() ||
      "Black"
    );
  }

  /* =========================================================
     TERMINAL POSITION CHECK
     ========================================================= */

  function evaluatePosition() {
    const sideToMove =
      state.turn;

    if (
      isCheckmate(
        state.board,
        sideToMove
      )
    ) {
      finishGame({
        winner:
          opposite(sideToMove),
        reason: "checkmate"
      });

      return true;
    }

    if (
      isStalemate(
        state.board,
        sideToMove
      )
    ) {
      finishGame({
        winner: null,
        reason: "stalemate"
      });

      return true;
    }

    if (
      state.halfmove >= 100
    ) {
      finishGame({
        winner: null,
        reason: "fifty-move"
      });

      return true;
    }

    if (
      insufficientMaterial(
        state.board
      )
    ) {
      finishGame({
        winner: null,
        reason: "insufficient"
      });

      return true;
    }

    return false;
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

    const movingColor =
      state.turn;

    const beforeBoard =
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

    const captured =
      move.enPassant
        ? {
            type: "P",
            color:
              opposite(
                movingColor
              )
          }
        : state.board[
            move.to.r
          ][move.to.c];

    const nextBoard =
      applyMoveToBoard(
        state.board,
        move
      );

    const notation =
      makeNotation(
        move,
        beforeBoard,
        nextBoard,
        movingColor
      );

    state.board =
      nextBoard;

    /* CAPTURE */

    if (captured) {
      if (
        captured.color === "w"
      ) {
        state.capturedWhite.push(
          captured
        );
      } else {
        state.capturedBlack.push(
          captured
        );
      }
    }

    /* CASTLING RIGHTS */

    if (
      movingPiece.type === "K"
    ) {
      if (
        movingColor === "w"
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
      movingPiece.type === "R"
    ) {
      if (
        movingColor === "w"
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
      } else {
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
    }

    /* CAPTURED ROOK */

    if (captured?.type === "R") {
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

    /* EN PASSANT */

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
          (move.from.r +
            move.to.r) /
          2,

        c:
          move.from.c
      };
    }

    /* 50-MOVE COUNTER */

    if (
      movingPiece.type === "P" ||
      captured
    ) {
      state.halfmove = 0;
    } else {
      state.halfmove++;
    }

    /* HISTORY */

    state.moveHistory.push({
      number: state.fullmove,
      color: movingColor,
      notation,
      move: {
        ...move,
        piece: {
          ...movingPiece
        }
      }
    });

    /* TURN */

    if (
      movingColor === "b"
    ) {
      state.fullmove++;
    }

    state.turn =
      opposite(
        movingColor
      );

    state.selected = null;
    state.legalTargets = [];

    renderBoard();
    renderCaptured();
    renderHistory();
    renderClocks();
    updateStatus();

    /* IMPORTANT:
       Evaluate BEFORE starting the next AI turn.
    */

    if (
      evaluatePosition()
    ) {
      return true;
    }

    updateStatus();

    if (
      isAITurn() &&
      !state.gameOver
    ) {
      scheduleAI();
    }

    return true;
  }

  /* =========================================================
     PLAYER INPUT
     ========================================================= */

  function handleSquareClick(
    r,
    c
  ) {
    if (
      !state.gameStarted ||
      state.gameOver ||
      state.paused
    ) {
      return;
    }

    if (
      state.gameMode === "pve" &&
      state.turn === "b"
    ) {
      return;
    }

    if (
      state.gameMode === "eve" ||
      state.gameMode === "battle"
    ) {
      return;
    }

    const piece =
      state.board[r][c];

    /* SELECT PIECE */

    if (!state.selected) {
      if (
        piece &&
        piece.color ===
          state.turn
      ) {
        state.selected = {
          r,
          c
        };

        state.legalTargets =
          getLegalMovesFromBoard(
            state.board,
            r,
            c,
            state.turn
          );

        renderBoard();
      }

      return;
    }

    /* CLICK SAME SQUARE */

    if (
      state.selected.r === r &&
      state.selected.c === c
    ) {
      state.selected = null;
      state.legalTargets = [];

      renderBoard();

      return;
    }

    /* CLICK ANOTHER FRIENDLY PIECE */

    if (
      piece &&
      piece.color ===
        state.turn
    ) {
      state.selected = {
        r,
        c
      };

      state.legalTargets =
        getLegalMovesFromBoard(
          state.board,
          r,
          c,
          state.turn
        );

      renderBoard();

      return;
    }

    /* MAKE MOVE */

    const move =
      state.legalTargets.find(
        target =>
          target.to.r === r &&
          target.to.c === c
      );

    if (move) {
      makeMove(move);
    }
  }

  /* =========================================================
     AI
     ========================================================= */

  function evaluateBoard(
    board,
    color
  ) {
    const values = {
      P: 100,
      N: 320,
      B: 330,
      R: 500,
      Q: 900,
      K: 20000
    };

    let score = 0;

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece =
          board[r][c];

        if (!piece) continue;

        const value =
          values[piece.type];

        score +=
          piece.color === color
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
    maximizingColor
  ) {
    if (depth <= 0) {
      return evaluateBoard(
        board,
        maximizingColor
      );
    }

    const moves =
      getAllLegalMoves(
        board,
        color
      );

    if (moves.length === 0) {
      if (
        isInCheck(
          board,
          color
        )
      ) {
        return color ===
          maximizingColor
          ? -999999
          : 999999;
      }

      return 0;
    }

    const maximizing =
      color === maximizingColor;

    let best =
      maximizing
        ? -Infinity
        : Infinity;

    for (const move of moves) {
      const next =
        applyMoveToBoard(
          board,
          move
        );

      const value =
        minimax(
          next,
          opposite(color),
          depth - 1,
          maximizingColor
        );

      if (maximizing) {
        best =
          Math.max(
            best,
            value
          );
      } else {
        best =
          Math.min(
            best,
            value
          );
      }
    }

    return best;
  }

  function chooseAIMove() {
    const color =
      state.turn;

    const moves =
      getAllLegalMoves(
        state.board,
        color
      );

    if (!moves.length) {
      return null;
    }

    const profile =
      AI_PROFILES[
        state.aiProfile
      ] ||
      AI_PROFILES.ace;

    const depth =
      Math.max(
        1,
        Math.min(
          3,
          Number(
            profile.depth
          ) || 1
        )
      );

    let bestMoves = [];
    let bestScore =
      -Infinity;

    for (const move of moves) {
      const next =
        applyMoveToBoard(
          state.board,
          move
        );

      const score =
        minimax(
          next,
          opposite(color),
          depth - 1,
          color
        );

      if (score > bestScore) {
        bestScore = score;
        bestMoves = [move];
      } else if (
        score === bestScore
      ) {
        bestMoves.push(move);
      }
    }

    if (
      !bestMoves.length
    ) {
      return moves[
        Math.floor(
          Math.random() *
            moves.length
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

  function getAISpeedDelay() {
    const speeds = {
      fast: 250,
      normal: 700,
      slow: 1300
    };

    return (
      speeds[
        state.aiSpeed
      ] || 700
    );
  }

  function scheduleAI() {
    if (
      state.gameOver ||
      state.paused ||
      !isAITurn()
    ) {
      return;
    }

    if (state.aiTimer) {
      clearTimeout(
        state.aiTimer
      );
    }

    state.aiTimer =
      setTimeout(() => {
        state.aiTimer = null;

        if (
          state.gameOver ||
          state.paused ||
          !isAITurn()
        ) {
          return;
        }

        const move =
          chooseAIMove();

        if (move) {
          makeMove(move);
        }
      }, getAISpeedDelay());
  }

  /* =========================================================
     START / RESET
     ========================================================= */

  function resetState() {
    stopClock();

    if (state.aiTimer) {
      clearTimeout(
        state.aiTimer
      );

      state.aiTimer = null;
    }

    state.board =
      createInitialBoard();

    state.turn = "w";

    state.selected = null;
    state.legalTargets = [];

    state.moveHistory = [];

    state.capturedWhite = [];
    state.capturedBlack = [];

    state.halfmove = 0;
    state.fullmove = 1;

    state.castling = {
      wK: true,
      wQ: true,
      bK: true,
      bQ: true
    };

    state.enPassant = null;

    state.whiteTime =
      CONFIG.startingTime;

    state.blackTime =
      CONFIG.startingTime;

    state.gameStarted = false;
    state.gameOver = false;
    state.paused = false;

    state.result = null;
    state.winner = null;
    state.loser = null;

    hideResultOverlay();

    renderBoard();
    renderCaptured();
    renderHistory();
    renderClocks();

    updatePlayerLabels();
    updateStatus();
  }

  function startGame() {
    resetState();

    state.gameStarted = true;

    state.gameOver = false;

    if (els.gameOverlay) {
      els.gameOverlay.hidden =
        true;
    }

    startClock();
    updateStatus();
    renderBoard();

    if (
      state.gameMode === "eve" ||
      state.gameMode === "battle"
    ) {
      scheduleAI();
    }
  }

  /* =========================================================
     PAUSE
     ========================================================= */

  function togglePause() {
    if (
      !state.gameStarted ||
      state.gameOver
    ) {
      return;
    }

    state.paused =
      !state.paused;

    if (state.paused) {
      stopClock();

      if (state.aiTimer) {
        clearTimeout(
          state.aiTimer
        );

        state.aiTimer = null;
      }
    } else {
      startClock();

      if (isAITurn()) {
        scheduleAI();
      }
    }

    updateStatus();
  }

  /* =========================================================
     RESIGN
     ========================================================= */

  function resignGame() {
    if (
      !state.gameStarted ||
      state.gameOver
    ) {
      return;
    }

    finishGame({
      winner:
        opposite(state.turn),
      reason: "resignation"
    });
  }

  /* =========================================================
     CLEAR HISTORY
     ========================================================= */

  function clearHistory() {
    try {
      localStorage.removeItem(
        "rolyfe-chess-history"
      );
    } catch (error) {}

    if (els.moveHistory) {
      els.moveHistory.innerHTML =
        `<div class="history-empty">No moves yet.</div>`;
    }
  }

  /* =========================================================
     SETTINGS
     ========================================================= */

  function readSettings() {
    if (els.gameMode) {
      state.gameMode =
        els.gameMode.value ||
        "pve";
    }

    if (els.aiProfile) {
      state.aiProfile =
        els.aiProfile.value ||
        "ace";
    }

    if (els.difficultyLevel) {
      state.difficulty =
        els.difficultyLevel.value ||
        "5";
    }

    if (els.aiSpeed) {
      state.aiSpeed =
        els.aiSpeed.value ||
        "normal";
    }
  }

  /* =========================================================
     THEME
     ========================================================= */

  function cycleTheme() {
    if (
      window.ROLyfeChessThemes
    ) {
      window.ROLyfeChessThemes.next();
    }
  }

  /* =========================================================
     KEYBOARD
     ========================================================= */

  function handleKeydown(
    event
  ) {
    if (
      event.key === "Escape"
    ) {
      state.selected = null;
      state.legalTargets = [];

      renderBoard();
    }
  }

  /* =========================================================
     VISIBILITY SAFETY
     ========================================================= */

  function handleVisibility() {
    if (
      document.hidden &&
      state.gameStarted &&
      !state.gameOver &&
      !state.paused
    ) {
      state.paused = true;

      stopClock();

      if (state.aiTimer) {
        clearTimeout(
          state.aiTimer
        );

        state.aiTimer = null;
      }

      updateStatus();
    }
  }

  /* =========================================================
     EVENTS
     ========================================================= */

  function bindEvents() {
    els.startGameButton?.addEventListener(
      "click",
      () => {
        readSettings();
        startGame();
      }
    );

    els.aiStartButton?.addEventListener(
      "click",
      () => {
        readSettings();

        if (
          state.gameMode === "pvp"
        ) {
          state.gameMode =
            "pve";
        }

        startGame();
      }
    );

    els.pauseGameButton?.addEventListener(
      "click",
      togglePause
    );

    els.resignButton?.addEventListener(
      "click",
      resignGame
    );

    els.resetGameButton?.addEventListener(
      "click",
      startGame
    );

    els.themeButton?.addEventListener(
      "click",
      cycleTheme
    );

    els.overlayRestartButton?.addEventListener(
      "click",
      startGame
    );

    els.overlayCloseButton?.addEventListener(
      "click",
      hideResultOverlay
    );

    els.clearHistoryButton?.addEventListener(
      "click",
      clearHistory
    );

    els.gameMode?.addEventListener(
      "change",
      () => {
        readSettings();
        updatePlayerLabels();
        updateStatus();
      }
    );

    els.aiProfile?.addEventListener(
      "change",
      readSettings
    );

    els.difficultyLevel?.addEventListener(
      "change",
      readSettings
    );

    els.aiSpeed?.addEventListener(
      "change",
      readSettings
    );

    document.addEventListener(
      "keydown",
      handleKeydown
    );

    document.addEventListener(
      "visibilitychange",
      handleVisibility
    );
  }

  /* =========================================================
     PUBLIC API
     ========================================================= */

  window.ROLyfeChess = {
    version: "1.2",

    state,

    start: startGame,
    reset: startGame,
    pause: togglePause,
    resign: resignGame,

    getBoard: () =>
      cloneBoard(
        state.board
      ),

    getLegalMoves: (
      r,
      c
    ) =>
      getLegalMovesFromBoard(
        state.board,
        r,
        c,
        state.board[r]?.[c]
          ?.color
      ),

    getHistory: () =>
      [...state.moveHistory],

    getStats: () =>
      ({ ...state.stats }),

    isCheck: color =>
      isInCheck(
        state.board,
        color
      ),

    isCheckmate: color =>
      isCheckmate(
        state.board,
        color
      ),

    getResult: () =>
      ({
        gameOver:
          state.gameOver,

        result:
          state.result,

        winner:
          state.winner,

        loser:
          state.loser
      })
  };

  window.ROlyfeChess =
    window.ROLyfeChess;

  /* =========================================================
     INIT
     ========================================================= */

  function init() {
    loadStats();

    readSettings();

    resetState();

    bindEvents();

    updatePlayerLabels();
    updateStatus();

    console.log(
      "♟️ RO’Lyfe Chess v1.2 loaded — Checkmate Result System Active"
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
