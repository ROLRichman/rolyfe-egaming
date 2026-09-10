/* =========================================================
   RO’LYFE CHESS
   games/chess/chess.js
   V1.0 — REAL CHESS ENGINE
   ========================================================= */

(() => {
  "use strict";

  /* =======================================================
     CONFIG
     ======================================================= */

  const CONFIG = {
    game: "chess",

    boardSize: 8,

    startingTime: 600,

    aiProfiles: {
      startup: {
        name: "START-UP",
        level: 1,
        depth: 1,
        thinkTime: 450
      },

      credit: {
        name: "CREDIT+",
        level: 2,
        depth: 2,
        thinkTime: 650
      },

      line: {
        name: "LINE OF CREDIT",
        level: 3,
        depth: 2,
        thinkTime: 850
      },

      investor: {
        name: "INVESTOR",
        level: 4,
        depth: 3,
        thinkTime: 1100
      },

      sevenfigures: {
        name: "7FIGURES",
        level: 5,
        depth: 3,
        thinkTime: 1450
      },

      ace: {
        name: "ACE",
        level: 5,
        depth: 3,
        thinkTime: 1450
      },

      emg: {
        name: "EMGaming",
        level: 5,
        depth: 3,
        thinkTime: 1450
      }
    },

    speedMultipliers: {
      slow: 1.75,
      normal: 1,
      fast: 0.55,
      blitz: 0.25
    }
  };


  /* =======================================================
     PIECES
     ======================================================= */

  const PIECES = {
    wK: "♔",
    wQ: "♕",
    wR: "♖",
    wB: "♗",
    wN: "♘",
    wP: "♙",

    bK: "♚",
    bQ: "♛",
    bR: "♜",
    bB: "♝",
    bN: "♞",
    bP: "♟"
  };


  const PIECE_VALUES = {
    P: 100,
    N: 320,
    B: 330,
    R: 500,
    Q: 900,
    K: 20000
  };


  /* =======================================================
     DOM
     ======================================================= */

  const $ = (id) => document.getElementById(id);

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

  const gameOverlayEl = $("gameOverlay");
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


  /* =======================================================
     GAME STATE
     ======================================================= */

  let state = {
    board: [],

    turn: "w",

    gameStarted: false,
    gameOver: false,
    paused: false,

    selectedSquare: null,
    legalMoves: [],

    lastMove: null,

    castling: {
      wK: true,
      wQ: true,
      bK: true,
      bQ: true
    },

    enPassant: null,

    halfmove: 0,
    fullmove: 1,

    moveHistory: [],

    captured: {
      w: [],
      b: []
    },

    clocks: {
      w: CONFIG.startingTime,
      b: CONFIG.startingTime
    },

    mode: "pvp",

    aiProfile: "startup",

    aiSide: "b",

    aiThinking: false,

    aiTimer: null,

    clockTimer: null,

    aiSequenceTimer: null,

    result: null
  };


  /* =======================================================
     INITIAL BOARD
     ======================================================= */

  function createInitialBoard() {
    const board = Array.from(
      { length: 8 },
      () => Array(8).fill(null)
    );

    const backRank = [
      "R",
      "N",
      "B",
      "Q",
      "K",
      "B",
      "N",
      "R"
    ];

    for (let col = 0; col < 8; col++) {
      board[0][col] = {
        color: "b",
        type: backRank[col]
      };

      board[1][col] = {
        color: "b",
        type: "P"
      };

      board[6][col] = {
        color: "w",
        type: "P"
      };

      board[7][col] = {
        color: "w",
        type: backRank[col]
      };
    }

    return board;
  }


  /* =======================================================
     UTILITIES
     ======================================================= */

  function cloneBoard(board) {
    return board.map(row =>
      row.map(piece =>
        piece
          ? {
              color: piece.color,
              type: piece.type
            }
          : null
      )
    );
  }


  function cloneCastling(castling) {
    return {
      wK: !!castling.wK,
      wQ: !!castling.wQ,
      bK: !!castling.bK,
      bQ: !!castling.bQ
    };
  }


  function inside(row, col) {
    return (
      row >= 0 &&
      row < 8 &&
      col >= 0 &&
      col < 8
    );
  }


  function opposite(color) {
    return color === "w" ? "b" : "w";
  }


  function squareName(row, col) {
    return (
      String.fromCharCode(97 + col) +
      String(8 - row)
    );
  }


  function parseSquare(square) {
    return {
      row: 8 - Number(square[1]),
      col: square.charCodeAt(0) - 97
    };
  }


  function sameSquare(a, b) {
    return (
      !!a &&
      !!b &&
      a.row === b.row &&
      a.col === b.col
    );
  }


  function moveKey(move) {
    return (
      `${move.from.row},${move.from.col}-` +
      `${move.to.row},${move.to.col}`
    );
  }


  function pieceCode(piece) {
    if (!piece) return "";

    return `${piece.color}${piece.type}`;
  }


  /* =======================================================
     FIND KING
     ======================================================= */

  function findKing(board, color) {
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col];

        if (
          piece &&
          piece.color === color &&
          piece.type === "K"
        ) {
          return { row, col };
        }
      }
    }

    return null;
  }


  /* =======================================================
     ATTACK DETECTION
     ======================================================= */

  function isSquareAttacked(board, row, col, byColor) {

    /* -----------------------------------------------------
       PAWNS
       ----------------------------------------------------- */

    const pawnRow =
      byColor === "w"
        ? row + 1
        : row - 1;

    for (const pawnCol of [col - 1, col + 1]) {
      if (!inside(pawnRow, pawnCol)) continue;

      const piece = board[pawnRow][pawnCol];

      if (
        piece &&
        piece.color === byColor &&
        piece.type === "P"
      ) {
        return true;
      }
    }


    /* -----------------------------------------------------
       KNIGHTS
       ----------------------------------------------------- */

    const knightOffsets = [
      [-2, -1],
      [-2, 1],
      [-1, -2],
      [-1, 2],
      [1, -2],
      [1, 2],
      [2, -1],
      [2, 1]
    ];

    for (const [dr, dc] of knightOffsets) {
      const r = row + dr;
      const c = col + dc;

      if (!inside(r, c)) continue;

      const piece = board[r][c];

      if (
        piece &&
        piece.color === byColor &&
        piece.type === "N"
      ) {
        return true;
      }
    }


    /* -----------------------------------------------------
       KING
       ----------------------------------------------------- */

    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;

        const r = row + dr;
        const c = col + dc;

        if (!inside(r, c)) continue;

        const piece = board[r][c];

        if (
          piece &&
          piece.color === byColor &&
          piece.type === "K"
        ) {
          return true;
        }
      }
    }


    /* -----------------------------------------------------
       ROOK / QUEEN
       ----------------------------------------------------- */

    const straightDirections = [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1]
    ];

    for (const [dr, dc] of straightDirections) {
      let r = row + dr;
      let c = col + dc;

      while (inside(r, c)) {
        const piece = board[r][c];

        if (piece) {
          if (
            piece.color === byColor &&
            (
              piece.type === "R" ||
              piece.type === "Q"
            )
          ) {
            return true;
          }

          break;
        }

        r += dr;
        c += dc;
      }
    }


    /* -----------------------------------------------------
       BISHOP / QUEEN
       ----------------------------------------------------- */

    const diagonalDirections = [
      [-1, -1],
      [-1, 1],
      [1, -1],
      [1, 1]
    ];

    for (const [dr, dc] of diagonalDirections) {
      let r = row + dr;
      let c = col + dc;

      while (inside(r, c)) {
        const piece = board[r][c];

        if (piece) {
          if (
            piece.color === byColor &&
            (
              piece.type === "B" ||
              piece.type === "Q"
            )
          ) {
            return true;
          }

          break;
        }

        r += dr;
        c += dc;
      }
    }

    return false;
  }


  /* =======================================================
     CHECK
     ======================================================= */

  function isInCheck(board, color) {
    const king = findKing(board, color);

    if (!king) {
      return true;
    }

    return isSquareAttacked(
      board,
      king.row,
      king.col,
      opposite(color)
    );
  }


  /* =======================================================
     PSEUDO LEGAL MOVES
     ======================================================= */

  function generatePseudoMoves(
    board,
    row,
    col,
    options = {}
  ) {
    const piece = board[row][col];

    if (!piece) {
      return [];
    }

    const moves = [];

    const addMove = (
      toRow,
      toCol,
      extra = {}
    ) => {
      if (!inside(toRow, toCol)) {
        return;
      }

      const target = board[toRow][toCol];

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
        from: { row, col },
        to: {
          row: toRow,
          col: toCol
        },
        piece: {
          color: piece.color,
          type: piece.type
        },
        captured: target
          ? {
              color: target.color,
              type: target.type
            }
          : null,
        ...extra
      });
    };


    /* -----------------------------------------------------
       PAWN
       ----------------------------------------------------- */

    if (piece.type === "P") {

      const direction =
        piece.color === "w"
          ? -1
          : 1;

      const startRow =
        piece.color === "w"
          ? 6
          : 1;

      const promotionRow =
        piece.color === "w"
          ? 0
          : 7;

      const oneRow = row + direction;

      if (
        inside(oneRow, col) &&
        !board[oneRow][col]
      ) {

        addMove(
          oneRow,
          col,
          oneRow === promotionRow
            ? { promotion: "Q" }
            : {}
        );

        const twoRow =
          row + direction * 2;

        if (
          row === startRow &&
          !board[twoRow][col]
        ) {
          addMove(
            twoRow,
            col,
            { pawnDouble: true }
          );
        }
      }


      for (const dc of [-1, 1]) {

        const captureCol = col + dc;

        if (
          !inside(oneRow, captureCol)
        ) {
          continue;
        }

        const target =
          board[oneRow][captureCol];

        if (
          target &&
          target.color !== piece.color &&
          target.type !== "K"
        ) {

          addMove(
            oneRow,
            captureCol,
            oneRow === promotionRow
              ? { promotion: "Q" }
              : {}
          );
        }


        /* EN PASSANT */

        if (
          options.enPassant &&
          options.enPassant.row === oneRow &&
          options.enPassant.col === captureCol
        ) {

          const adjacent =
            board[row][captureCol];

          if (
            adjacent &&
            adjacent.color !== piece.color &&
            adjacent.type === "P"
          ) {

            addMove(
              oneRow,
              captureCol,
              {
                enPassant: true,
                captured: {
                  color: adjacent.color,
                  type: adjacent.type
                }
              }
            );
          }
        }
      }

      return moves;
    }


    /* -----------------------------------------------------
       KNIGHT
       ----------------------------------------------------- */

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

      for (const [dr, dc] of offsets) {
        addMove(
          row + dr,
          col + dc
        );
      }

      return moves;
    }


    /* -----------------------------------------------------
       BISHOP
       ----------------------------------------------------- */

    if (
      piece.type === "B" ||
      piece.type === "Q"
    ) {

      const directions = [
        [-1, -1],
        [-1, 1],
        [1, -1],
        [1, 1]
      ];

      for (const [dr, dc] of directions) {

        let r = row + dr;
        let c = col + dc;

        while (inside(r, c)) {

          const target = board[r][c];

          if (!target) {
            addMove(r, c);
          } else {

            if (
              target.color !== piece.color &&
              target.type !== "K"
            ) {
              addMove(r, c);
            }

            break;
          }

          r += dr;
          c += dc;
        }
      }

      if (piece.type === "B") {
        return moves;
      }
    }


    /* -----------------------------------------------------
       ROOK
       ----------------------------------------------------- */

    if (
      piece.type === "R" ||
      piece.type === "Q"
    ) {

      const directions = [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1]
      ];

      for (const [dr, dc] of directions) {

        let r = row + dr;
        let c = col + dc;

        while (inside(r, c)) {

          const target = board[r][c];

          if (!target) {
            addMove(r, c);
          } else {

            if (
              target.color !== piece.color &&
              target.type !== "K"
            ) {
              addMove(r, c);
            }

            break;
          }

          r += dr;
          c += dc;
        }
      }

      if (piece.type === "R") {
        return moves;
      }
    }


    /* -----------------------------------------------------
       KING
       ----------------------------------------------------- */

    if (piece.type === "K") {

      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {

          if (
            dr === 0 &&
            dc === 0
          ) {
            continue;
          }

          addMove(
            row + dr,
            col + dc
          );
        }
      }


      /* CASTLING */

      if (!options.skipCastling) {

        const enemy =
          opposite(piece.color);

        const homeRow =
          piece.color === "w"
            ? 7
            : 0;

        if (
          row === homeRow &&
          col === 4 &&
          !isInCheck(
            board,
            piece.color
          )
        ) {

          const kingSide =
            piece.color === "w"
              ? state.castling.wK
              : state.castling.bK;

          const queenSide =
            piece.color === "w"
              ? state.castling.wQ
              : state.castling.bQ;


          /* KING SIDE */

          if (
            kingSide &&
            !board[homeRow][5] &&
            !board[homeRow][6]
          ) {

            const rook =
              board[homeRow][7];

            if (
              rook &&
              rook.color === piece.color &&
              rook.type === "R" &&
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
                from: { row, col },
                to: {
                  row: homeRow,
                  col: 6
                },
                piece: {
                  color: piece.color,
                  type: "K"
                },
                captured: null,
                castle: "K"
              });
            }
          }


          /* QUEEN SIDE */

          if (
            queenSide &&
            !board[homeRow][1] &&
            !board[homeRow][2] &&
            !board[homeRow][3]
          ) {

            const rook =
              board[homeRow][0];

            if (
              rook &&
              rook.color === piece.color &&
              rook.type === "R" &&
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
                from: { row, col },
                to: {
                  row: homeRow,
                  col: 2
                },
                piece: {
                  color: piece.color,
                  type: "K"
                },
                captured: null,
                castle: "Q"
              });
            }
          }
        }
      }

      return moves;
    }


    return moves;
  }


  /* =======================================================
     APPLY MOVE TO BOARD
     ======================================================= */

  function applyMoveToBoard(
    board,
    move,
    castling = state.castling,
    enPassant = state.enPassant
  ) {

    const nextBoard =
      cloneBoard(board);

    const nextCastling =
      cloneCastling(castling);

    let nextEnPassant = null;

    const piece =
      nextBoard[
        move.from.row
      ][
        move.from.col
      ];

    if (!piece) {
      return {
        board: nextBoard,
        castling: nextCastling,
        enPassant: null
      };
    }


    /* EN PASSANT CAPTURE */

    if (move.enPassant) {

      const capturedRow =
        move.from.row;

      const capturedCol =
        move.to.col;

      nextBoard[
        capturedRow
      ][
        capturedCol
      ] = null;
    }


    nextBoard[
      move.to.row
    ][
      move.to.col
    ] = {
      color: piece.color,
      type: move.promotion || piece.type
    };

    nextBoard[
      move.from.row
    ][
      move.from.col
    ] = null;


    /* CASTLING ROOK */

    if (move.castle === "K") {

      const row = move.from.row;

      nextBoard[row][5] =
        nextBoard[row][7];

      nextBoard[row][7] = null;
    }

    if (move.castle === "Q") {

      const row = move.from.row;

      nextBoard[row][3] =
        nextBoard[row][0];

      nextBoard[row][0] = null;
    }


    /* CASTLING RIGHTS */

    if (piece.type === "K") {

      if (piece.color === "w") {
        nextCastling.wK = false;
        nextCastling.wQ = false;
      } else {
        nextCastling.bK = false;
        nextCastling.bQ = false;
      }
    }


    if (
      piece.type === "R" &&
      move.from.row === 7 &&
      move.from.col === 0
    ) {
      nextCastling.wQ = false;
    }

    if (
      piece.type === "R" &&
      move.from.row === 7 &&
      move.from.col === 7
    ) {
      nextCastling.wK = false;
    }

    if (
      piece.type === "R" &&
      move.from.row === 0 &&
      move.from.col === 0
    ) {
      nextCastling.bQ = false;
    }

    if (
      piece.type === "R" &&
      move.from.row === 0 &&
      move.from.col === 7
    ) {
      nextCastling.bK = false;
    }


    /* ROOK CAPTURE */

    if (
      move.captured &&
      move.captured.type === "R"
    ) {

      if (
        move.to.row === 7 &&
        move.to.col === 0
      ) {
        nextCastling.wQ = false;
      }

      if (
        move.to.row === 7 &&
        move.to.col === 7
      ) {
        nextCastling.wK = false;
      }

      if (
        move.to.row === 0 &&
        move.to.col === 0
      ) {
        nextCastling.bQ = false;
      }

      if (
        move.to.row === 0 &&
        move.to.col === 7
      ) {
        nextCastling.bK = false;
      }
    }


    /* EN PASSANT TARGET */

    if (
      piece.type === "P" &&
      Math.abs(
        move.to.row -
        move.from.row
      ) === 2
    ) {

      nextEnPassant = {
        row:
          (
            move.from.row +
            move.to.row
          ) / 2,

        col: move.from.col
      };
    }

    return {
      board: nextBoard,
      castling: nextCastling,
      enPassant: nextEnPassant
    };
  }


  /* =======================================================
     LEGAL MOVE TEST
     ======================================================= */

  function isMoveLegal(
    board,
    move,
    color,
    castling,
    enPassant
  ) {

    const result =
      applyMoveToBoard(
        board,
        move,
        castling,
        enPassant
      );

    return !isInCheck(
      result.board,
      color
    );
  }


  /* =======================================================
     GENERATE LEGAL MOVES
     ======================================================= */

  function generateLegalMoves(
    board,
    color,
    castling = state.castling,
    enPassant = state.enPassant
  ) {

    const legalMoves = [];

    for (let row = 0; row < 8; row++) {

      for (let col = 0; col < 8; col++) {

        const piece =
          board[row][col];

        if (
          !piece ||
          piece.color !== color
        ) {
          continue;
        }

        const pseudo =
          generatePseudoMoves(
            board,
            row,
            col,
            {
              enPassant
            }
          );

        for (const move of pseudo) {

          if (
            isMoveLegal(
              board,
              move,
              color,
              castling,
              enPassant
            )
          ) {
            legalMoves.push(move);
          }
        }
      }
    }

    return legalMoves;
  }


  /* =======================================================
     SAN NOTATION
     ======================================================= */

  function moveNotation(
    board,
    move,
    legalMovesBefore
  ) {

    const piece =
      board[
        move.from.row
      ][
        move.from.col
      ];

    if (!piece) {
      return "";
    }

    if (move.castle === "K") {
      return "O-O";
    }

    if (move.castle === "Q") {
      return "O-O-O";
    }

    const capture =
      !!move.captured ||
      !!move.enPassant;

    let notation = "";

    if (piece.type !== "P") {
      notation += piece.type;
    }

    /* DISAMBIGUATION */

    if (piece.type !== "P") {

      const alternatives =
        legalMovesBefore.filter(
          candidate =>
            candidate.to.row === move.to.row &&
            candidate.to.col === move.to.col &&
            candidate.from.row !== move.from.row &&
            candidate.from.col !== move.from.col &&
            candidate.piece.type === piece.type
        );

      if (alternatives.length) {

        const sameFile =
          alternatives.some(
            candidate =>
              candidate.from.col === move.from.col
          );

        const sameRank =
          alternatives.some(
            candidate =>
              candidate.from.row === move.from.row
          );

        if (!sameFile) {
          notation += String.fromCharCode(
            97 + move.from.col
          );
        } else if (!sameRank) {
          notation += String(
            8 - move.from.row
          );
        } else {
          notation +=
            String.fromCharCode(
              97 + move.from.col
            ) +
            String(
              8 - move.from.row
            );
        }
      }
    }

    if (
      piece.type === "P" &&
      capture
    ) {
      notation += String.fromCharCode(
        97 + move.from.col
      );
    }

    if (capture) {
      notation += "x";
    }

    notation += squareName(
      move.to.row,
      move.to.col
    );

    if (move.promotion) {
      notation += `=${move.promotion}`;
    }

    const result =
      applyMoveToBoard(
        board,
        move,
        state.castling,
        state.enPassant
      );

    const enemy =
      opposite(piece.color);

    if (isInCheck(
      result.board,
      enemy
    )) {

      const replies =
        generateLegalMoves(
          result.board,
          enemy,
          result.castling,
          result.enPassant
        );

      notation +=
        replies.length === 0
          ? "#"
          : "+";
    }

    return notation;
  }


  /* =======================================================
     MAKE MOVE
     ======================================================= */

  function makeMove(move, source = "player") {

    if (
      state.gameOver ||
      state.paused ||
      !state.gameStarted
    ) {
      return false;
    }

    if (
      state.aiThinking &&
      source === "player"
    ) {
      return false;
    }

    const legalMoves =
      generateLegalMoves(
        state.board,
        state.turn
      );

    const actualMove =
      legalMoves.find(
        candidate =>
          moveKey(candidate) ===
          moveKey(move)
      );

    if (!actualMove) {
      return false;
    }

    const notation =
      moveNotation(
        state.board,
        actualMove,
        legalMoves
      );

    const movingColor =
      state.turn;

    const capturedPiece =
      actualMove.enPassant
        ? state.board[
            actualMove.from.row
          ][
            actualMove.to.col
          ]
        : state.board[
            actualMove.to.row
          ][
            actualMove.to.col
          ];

    const result =
      applyMoveToBoard(
        state.board,
        actualMove,
        state.castling,
        state.enPassant
      );

    state.board =
      result.board;

    state.castling =
      result.castling;

    state.enPassant =
      result.enPassant;

    state.lastMove =
      actualMove;

    state.selectedSquare =
      null;

    state.legalMoves =
      [];

    state.moveHistory.push({
      number:
        state.fullmove,
      color:
        movingColor,
      notation,
      move:
        actualMove
    });

    if (capturedPiece) {

      state.captured[
        movingColor
      ].push({
        color:
          capturedPiece.color,
        type:
          capturedPiece.type
      });
    }


    if (
      actualMove.piece.type === "P" ||
      capturedPiece
    ) {
      state.halfmove = 0;
    } else {
      state.halfmove++;
    }

    if (movingColor === "b") {
      state.fullmove++;
    }

    state.turn =
      opposite(state.turn);

    renderBoard();
    updateUI();

    checkGameState();

    if (
      !state.gameOver &&
      state.gameStarted &&
      !state.paused
    ) {
      maybeStartAI();
    }

    return true;
  }


  /* =======================================================
     SELECT SQUARE
     ======================================================= */

  function selectSquare(row, col) {

    if (
      !state.gameStarted ||
      state.gameOver ||
      state.paused ||
      state.aiThinking
    ) {
      return;
    }

    const piece =
      state.board[row][col];


    /* SELECT OWN PIECE */

    if (
      piece &&
      piece.color === state.turn
    ) {

      const allLegal =
        generateLegalMoves(
          state.board,
          state.turn
        );

      state.selectedSquare = {
        row,
        col
      };

      state.legalMoves =
        allLegal.filter(
          move =>
            move.from.row === row &&
            move.from.col === col
        );

      renderBoard();

      moveStatusEl.textContent =
        `${piece.type === "P"
          ? "PAWN"
          : piece.type} selected — choose a legal square.`;

      return;
    }


    /* MOVE TO DESTINATION */

    if (state.selectedSquare) {

      const move =
        state.legalMoves.find(
          candidate =>
            candidate.to.row === row &&
            candidate.to.col === col
        );

      if (move) {
        makeMove(move);
        return;
      }
    }

    state.selectedSquare = null;
    state.legalMoves = [];

    renderBoard();

    moveStatusEl.textContent =
      "Select a piece to begin.";
  }


  /* =======================================================
     RENDER BOARD
     ======================================================= */

  function renderBoard() {

    if (!boardEl) return;

    boardEl.innerHTML = "";

    for (let row = 0; row < 8; row++) {

      for (let col = 0; col < 8; col++) {

        const square =
          document.createElement("button");

        square.type = "button";

        square.className =
          "chess-square " +
          (
            (row + col) % 2 === 0
              ? "light"
              : "dark"
          );

        square.dataset.row = row;
        square.dataset.col = col;

        const piece =
          state.board[row][col];

        if (
          state.selectedSquare &&
          sameSquare(
            state.selectedSquare,
            { row, col }
          )
        ) {
          square.classList.add(
            "selected"
          );
        }


        if (
          state.lastMove &&
          (
            sameSquare(
              state.lastMove.from,
              { row, col }
            ) ||
            sameSquare(
              state.lastMove.to,
              { row, col }
            )
          )
        ) {
          square.classList.add(
            "last-move"
          );
        }


        const legal =
          state.legalMoves.find(
            move =>
              move.to.row === row &&
              move.to.col === col
          );

        if (legal) {

          if (legal.captured) {
            square.classList.add(
              "legal-capture"
            );
          } else {
            square.classList.add(
              "legal-move"
            );
          }
        }


        if (
          piece &&
          piece.color === state.turn
        ) {
          square.classList.add(
            "movable"
          );
        }


        const king =
          state.board[row][col];

        if (
          king &&
          king.type === "K" &&
          king.color === state.turn &&
          isInCheck(
            state.board,
            state.turn
          )
        ) {
          square.classList.add(
            "in-check"
          );
        }


        if (piece) {

          const pieceEl =
            document.createElement("span");

          pieceEl.className =
            `chess-piece ${
              piece.color === "w"
                ? "white"
                : "black"
            }`;

          pieceEl.textContent =
            PIECES[
              pieceCode(piece)
            ];

          square.appendChild(
            pieceEl
          );
        }


        square.addEventListener(
          "click",
          () => selectSquare(row, col)
        );

        boardEl.appendChild(square);
      }
    }
  }


  /* =======================================================
     CHECK / MATE / STALEMATE
     ======================================================= */

  function checkGameState() {

    const color =
      state.turn;

    const inCheck =
      isInCheck(
        state.board,
        color
      );

    const legalMoves =
      generateLegalMoves(
        state.board,
        color
      );

    if (
      legalMoves.length === 0
    ) {

      if (inCheck) {

        const winner =
          opposite(color);

        endGame(
          winner,
          "checkmate"
        );

      } else {

        endGame(
          null,
          "stalemate"
        );
      }

      return;
    }


    if (inCheck) {

      checkStatusEl.textContent =
        `${color === "w"
          ? "WHITE"
          : "BLACK"} IN CHECK`;

      checkStatusEl.classList.add(
        "check"
      );

    } else {

      checkStatusEl.textContent =
        "POSITION CLEAR";

      checkStatusEl.classList.remove(
        "check"
      );
    }
  }


  /* =======================================================
     DRAW CONDITIONS
     ======================================================= */

  function insufficientMaterial() {

    const pieces = [];

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {

        const piece =
          state.board[row][col];

        if (
          piece &&
          piece.type !== "K"
        ) {
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
        pieces[0].type === "B" ||
        pieces[0].type === "N"
      );
    }

    if (
      pieces.length === 2 &&
      pieces.every(
        piece =>
          piece.type === "B"
      )
    ) {

      const firstColor =
        (
          pieces[0].row +
          pieces[0].col
        ) % 2;

      const secondColor =
        (
          pieces[1].row +
          pieces[1].col
        ) % 2;

      return firstColor === secondColor;
    }

    return false;
  }


  function checkDrawConditions() {

    if (state.halfmove >= 100) {
      endGame(
        null,
        "fifty-move"
      );

      return true;
    }

    if (insufficientMaterial()) {
      endGame(
        null,
        "insufficient-material"
      );

      return true;
    }

    return false;
  }


  /* =======================================================
     END GAME
     ======================================================= */

  function endGame(
    winner,
    reason
  ) {

    if (state.gameOver) {
      return;
    }

    state.gameOver = true;
    state.gameStarted = false;
    state.aiThinking = false;

    clearAITimers();
    stopClock();

    state.result = {
      winner,
      reason
    };

    let title = "GAME OVER";
    let message = "";
    let icon = "♟";

    if (reason === "checkmate") {

      title = "CHECKMATE";

      message =
        `${winner === "w"
          ? "WHITE"
          : "BLACK"} wins the match.`;

      icon =
        winner === "w"
          ? "♔"
          : "♚";

      recordResult(winner);
    }

    else if (reason === "stalemate") {

      title = "STALEMATE";

      message =
        "The game ends in a draw.";

      icon = "½";
    }

    else if (reason === "fifty-move") {

      title = "DRAW";

      message =
        "Draw by the fifty-move rule.";

      icon = "½";
    }

    else if (
      reason ===
      "insufficient-material"
    ) {

      title = "DRAW";

      message =
        "Draw by insufficient material.";

      icon = "½";
    }

    else if (reason === "resignation") {

      title = "RESIGNATION";

      message =
        `${winner === "w"
          ? "WHITE"
          : "BLACK"} wins by resignation.`;

      icon =
        winner === "w"
          ? "♔"
          : "♚";

      recordResult(winner);
    }

    else if (reason === "time") {

      title = "TIME EXPIRED";

      message =
        `${winner === "w"
          ? "WHITE"
          : "BLACK"} wins on time.`;

      icon =
        winner === "w"
          ? "♔"
          : "♚";

      recordResult(winner);
    }

    showOverlay(
      title,
      message,
      icon
    );

    updateUI();
  }


  /* =======================================================
     AI ENGINE
     ======================================================= */

  function isAIColor(color) {

    if (state.mode === "pvp") {
      return false;
    }

    if (state.mode === "pve") {
      return color === state.aiSide;
    }

    if (
      state.mode === "eve" ||
      state.mode === "battle"
    ) {
      return true;
    }

    return false;
  }


  function getAIProfile() {

    return (
      CONFIG.aiProfiles[
        state.aiProfile
      ] ||
      CONFIG.aiProfiles.startup
    );
  }


  function maybeStartAI() {

    if (
      state.gameOver ||
      state.paused ||
      !state.gameStarted ||
      !isAIColor(state.turn)
    ) {
      return;
    }

    if (state.aiThinking) {
      return;
    }

    startAITurn();
  }


  function startAITurn() {

    if (
      state.aiThinking ||
      state.gameOver ||
      state.paused
    ) {
      return;
    }

    state.aiThinking = true;

    updateUI();

    const profile =
      getAIProfile();

    const speed =
      CONFIG.speedMultipliers[
        aiSpeedEl.value
      ] ||
      1;

    const delay =
      Math.max(
        120,
        profile.thinkTime *
        speed
      );

    state.aiTimer =
      setTimeout(
        () => {

          state.aiTimer = null;

          if (
            state.gameOver ||
            state.paused
          ) {
            state.aiThinking = false;
            updateUI();
            return;
          }

          const move =
            chooseAIMove(
              state.turn,
              profile
            );

          state.aiThinking = false;

          if (move) {
            makeMove(
              move,
              "ai"
            );
          } else {
            checkGameState();
            updateUI();
          }

        },
        delay
      );
  }


  function chooseAIMove(
    color,
    profile
  ) {

    const moves =
      generateLegalMoves(
        state.board,
        color
      );

    if (!moves.length) {
      return null;
    }

    const scored =
      moves.map(
        move => {

          const result =
            applyMoveToBoard(
              state.board,
              move,
              state.castling,
              state.enPassant
            );

          const score =
            evaluatePosition(
              result.board,
              color
            );

          return {
            move,
            score
          };
        }
      );

    scored.sort(
      (a, b) =>
        b.score - a.score
    );


    /* -----------------------------------------------------
       PERSONALITY BEHAVIOR
       ----------------------------------------------------- */

    if (
      state.aiProfile === "ace"
    ) {

      return minimaxRoot(
        color,
        Math.max(
          2,
          profile.depth
        )
      );
    }


    if (
      state.aiProfile === "emg"
    ) {

      const tactical =
        scored.filter(
          item =>
            item.move.captured ||
            item.move.promotion ||
            item.move.castle
        );

      if (tactical.length) {

        return tactical[
          Math.floor(
            Math.random() *
            Math.min(
              tactical.length,
              3
            )
          )
        ].move;
      }
    }


    if (
      profile.level <= 1
    ) {

      const top =
        scored.slice(
          0,
          Math.min(
            4,
            scored.length
          )
        );

      return top[
        Math.floor(
          Math.random() *
          top.length
        )
      ].move;
    }


    if (
      profile.level === 2
    ) {

      return scored[
        Math.floor(
          Math.random() *
          Math.min(
            3,
            scored.length
          )
        )
      ].move;
    }


    if (
      profile.level === 3
    ) {

      return minimaxRoot(
        color,
        Math.min(
          2,
          profile.depth
        )
      );
    }


    return minimaxRoot(
      color,
      profile.depth
    );
  }


  /* =======================================================
     MINIMAX
     ======================================================= */

  function minimaxRoot(
    color,
    depth
  ) {

    const moves =
      generateLegalMoves(
        state.board,
        color
      );

    if (!moves.length) {
      return null;
    }

    let bestScore =
      -Infinity;

    let bestMoves = [];

    for (const move of moves) {

      const result =
        applyMoveToBoard(
          state.board,
          move,
          state.castling,
          state.enPassant
        );

      const score =
        minimax(
          result.board,
          opposite(color),
          depth - 1,
          -Infinity,
          Infinity,
          color,
          result.castling,
          result.enPassant
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

    return bestMoves[
      Math.floor(
        Math.random() *
        bestMoves.length
      )
    ];
  }


  function minimax(
    board,
    color,
    depth,
    alpha,
    beta,
    maximizingColor,
    castling,
    enPassant
  ) {

    const moves =
      generateLegalMoves(
        board,
        color,
        castling,
        enPassant
      );

    if (depth <= 0) {

      return evaluatePosition(
        board,
        maximizingColor
      );
    }


    if (!moves.length) {

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


    if (maximizing) {

      let value = -Infinity;

      for (const move of moves) {

        const result =
          applyMoveToBoard(
            board,
            move,
            castling,
            enPassant
          );

        value =
          Math.max(
            value,
            minimax(
              result.board,
              opposite(color),
              depth - 1,
              alpha,
              beta,
              maximizingColor,
              result.castling,
              result.enPassant
            )
          );

        alpha =
          Math.max(
            alpha,
            value
          );

        if (beta <= alpha) {
          break;
        }
      }

      return value;
    }


    let value = Infinity;

    for (const move of moves) {

      const result =
        applyMoveToBoard(
          board,
          move,
          castling,
          enPassant
        );

      value =
        Math.min(
          value,
          minimax(
            result.board,
            opposite(color),
            depth - 1,
            alpha,
            beta,
            maximizingColor,
            result.castling,
            result.enPassant
          )
        );

      beta =
        Math.min(
          beta,
          value
        );

      if (beta <= alpha) {
        break;
      }
    }

    return value;
  }


  /* =======================================================
     POSITION EVALUATION
     ======================================================= */

  function evaluatePosition(
    board,
    perspective
  ) {

    let score = 0;

    for (let row = 0; row < 8; row++) {

      for (let col = 0; col < 8; col++) {

        const piece =
          board[row][col];

        if (!piece) {
          continue;
        }

        let value =
          PIECE_VALUES[
            piece.type
          ];


        /* CENTER CONTROL */

        const centerDistance =
          Math.abs(
            3.5 - col
          ) +
          Math.abs(
            3.5 - row
          );

        const centerBonus =
          Math.max(
            0,
            4 - centerDistance
          ) * 5;


        /* PAWN ADVANCEMENT */

        let advancement = 0;

        if (piece.type === "P") {

          advancement =
            piece.color === "w"
              ? (6 - row) * 8
              : (row - 1) * 8;
        }


        value +=
          centerBonus +
          advancement;


        if (
          piece.color === perspective
        ) {
          score += value;
        } else {
          score -= value;
        }
      }
    }


    /* CHECK BONUS */

    if (
      isInCheck(
        board,
        opposite(perspective)
      )
    ) {
      score += 35;
    }

    if (
      isInCheck(
        board,
        perspective
      )
    ) {
      score -= 35;
    }

    return score;
  }


  /* =======================================================
     GAME MODE
     ======================================================= */

  function configureMode() {

    state.mode =
      gameModeEl.value;

    state.aiProfile =
      aiProfileEl.value;

    if (
      state.mode === "pve"
    ) {
      state.aiSide = "b";
    }

    if (
      state.mode === "eve" ||
      state.mode === "battle"
    ) {
      state.aiSide = "both";
    }

    updatePlayerLabels();
    updateUI();
  }


  function updatePlayerLabels() {

    const mode =
      state.mode;

    const profile =
      getAIProfile();


    if (mode === "pvp") {

      whitePlayerNameEl.textContent =
        "PLAYER 1";

      blackPlayerNameEl.textContent =
        "PLAYER 2";

      whitePlayerLevelEl.textContent =
        "HUMAN";

      blackPlayerLevelEl.textContent =
        "HUMAN";

      return;
    }


    if (mode === "pve") {

      whitePlayerNameEl.textContent =
        "PLAYER 1";

      blackPlayerNameEl.textContent =
        profile.name;

      whitePlayerLevelEl.textContent =
        "HUMAN";

      blackPlayerLevelEl.textContent =
        `AI • LEVEL ${profile.level}`;

      return;
    }


    if (
      mode === "eve"
    ) {

      whitePlayerNameEl.textContent =
        "ACE";

      blackPlayerNameEl.textContent =
        "EMGaming";

      whitePlayerLevelEl.textContent =
        "AI";

      blackPlayerLevelEl.textContent =
        "AI";

      return;
    }


    if (
      mode === "battle"
    ) {

      whitePlayerNameEl.textContent =
        "RO’LYFE PLAYER";

      blackPlayerNameEl.textContent =
        profile.name;

      whitePlayerLevelEl.textContent =
        "BATTLE";

      blackPlayerLevelEl.textContent =
        "AI • BATTLE";
    }
  }


  /* =======================================================
     START / RESET
     ======================================================= */

  function startGame() {

    resetState();

    configureMode();

    state.gameStarted = true;
    state.gameOver = false;
    state.paused = false;

    hideOverlay();

    startClock();

    renderBoard();
    updateUI();
    checkGameState();

    maybeStartAI();
  }


  function resetState() {

    clearAITimers();
    stopClock();

    state = {
      board:
        createInitialBoard(),

      turn: "w",

      gameStarted: false,
      gameOver: false,
      paused: false,

      selectedSquare: null,
      legalMoves: [],

      lastMove: null,

      castling: {
        wK: true,
        wQ: true,
        bK: true,
        bQ: true
      },

      enPassant: null,

      halfmove: 0,
      fullmove: 1,

      moveHistory: [],

      captured: {
        w: [],
        b: []
      },

      clocks: {
        w: CONFIG.startingTime,
        b: CONFIG.startingTime
      },

      mode:
        gameModeEl.value,

      aiProfile:
        aiProfileEl.value,

      aiSide: "b",

      aiThinking: false,

      aiTimer: null,

      clockTimer: null,

      aiSequenceTimer: null,

      result: null
    };

    hideOverlay();

    renderBoard();
    updateUI();

    checkStatusEl.textContent =
      "READY";

    checkStatusEl.classList.remove(
      "check"
    );

    moveStatusEl.textContent =
      "Select a piece to begin.";
  }


  /* =======================================================
     PAUSE
     ======================================================= */

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
      clearAITimers();

      pauseGameButton.textContent =
        "RESUME";

    } else {

      pauseGameButton.textContent =
        "PAUSE";

      startClock();
      maybeStartAI();
    }

    updateUI();
  }


  /* =======================================================
     CLOCK
     ======================================================= */

  function startClock() {

    stopClock();

    if (
      !state.gameStarted ||
      state.gameOver ||
      state.paused
    ) {
      return;
    }

    state.clockTimer =
      setInterval(
        () => {

          if (
            state.paused ||
            state.gameOver ||
            !state.gameStarted
          ) {
            return;
          }

          state.clocks[
            state.turn
          ] -= 1;

          if (
            state.clocks[
              state.turn
            ] <= 0
          ) {

            state.clocks[
              state.turn
            ] = 0;

            endGame(
              opposite(
                state.turn
              ),
              "time"
            );

            return;
          }

          updateClockDisplay();

        },
        1000
      );
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


  function updateClockDisplay() {

    setClockText(
      whiteClockEl,
      state.clocks.w
    );

    setClockText(
      blackClockEl,
      state.clocks.b
    );

    const whiteCard =
      document.querySelector(
        ".chess-player-card.player-white"
      );

    const blackCard =
      document.querySelector(
        ".chess-player-card.player-black"
      );

    if (whiteCard) {
      setClockClasses(
        whiteCard,
        state.clocks.w
      );
    }

    if (blackCard) {
      setClockClasses(
        blackCard,
        state.clocks.b
      );
    }
  }


  function setClockText(
    element,
    seconds
  ) {

    if (!element) return;

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

    element.textContent =
      `${String(minutes).padStart(2, "0")}:` +
      `${String(secs).padStart(2, "0")}`;
  }


  function setClockClasses(
    card,
    seconds
  ) {

    card.classList.remove(
      "low-time",
      "critical-time"
    );

    if (seconds <= 10) {

      card.classList.add(
        "critical-time"
      );

    } else if (seconds <= 60) {

      card.classList.add(
        "low-time"
      );
    }

    if (
      state.turn ===
      card.dataset.player?.charAt(0)
    ) {
      card.classList.add(
        "active"
      );
    } else {
      card.classList.remove(
        "active"
      );
    }
  }


  /* =======================================================
     CLEAR AI
     ======================================================= */

  function clearAITimers() {

    if (state.aiTimer) {

      clearTimeout(
        state.aiTimer
      );

      state.aiTimer = null;
    }

    if (
      state.aiSequenceTimer
    ) {

      clearTimeout(
        state.aiSequenceTimer
      );

      state.aiSequenceTimer = null;
    }

    state.aiThinking = false;
  }


  /* =======================================================
     RESIGN
     ======================================================= */

  function resignGame() {

    if (
      !state.gameStarted ||
      state.gameOver
    ) {
      return;
    }

    endGame(
      opposite(
        state.turn
      ),
      "resignation"
    );
  }


  /* =======================================================
     UI
     ======================================================= */

  function updateUI() {

    if (!gameStatusEl) {
      return;
    }


    if (state.gameOver) {

      gameStatusEl.textContent =
        "GAME OVER";

    } else if (state.paused) {

      gameStatusEl.textContent =
        "PAUSED";

    } else if (!state.gameStarted) {

      gameStatusEl.textContent =
        "READY";

    } else if (state.aiThinking) {

      gameStatusEl.textContent =
        "AI THINKING";

    } else {

      gameStatusEl.textContent =
        "PLAYING";
    }


    turnStatusEl.textContent =
      state.turn === "w"
        ? "WHITE"
        : "BLACK";


    modeStatusEl.textContent =
      modeLabel(
        state.mode
      );


    moveNumberEl.textContent =
      String(
        state.fullmove
      );


    renderHistory();
    renderCaptured();
    updateClockDisplay();
    updatePlayerLabels();


    if (
      state.gameStarted &&
      !state.gameOver
    ) {

      moveStatusEl.textContent =
        state.aiThinking
          ? `${state.turn === "w"
              ? "WHITE"
              : "BLACK"} AI is calculating...`
          : "Select a piece to begin.";
    }
  }


  function modeLabel(mode) {

    const labels = {
      pvp:
        "PLAYER VS PLAYER",

      pve:
        "PLAYER VS AI",

      eve:
        "AI VS AI",

      battle:
        "BATTLE MODE"
    };

    return (
      labels[mode] ||
      "PLAYER VS PLAYER"
    );
  }


  /* =======================================================
     MOVE HISTORY
     ======================================================= */

  function renderHistory() {

    if (!moveHistoryEl) {
      return;
    }

    if (
      state.moveHistory.length === 0
    ) {

      moveHistoryEl.innerHTML =
        `<div class="history-empty">
          No moves yet.
        </div>`;

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
        state.moveHistory[index + 1];

      const whiteEl =
        document.createElement(
          "div"
        );

      whiteEl.className =
        "history-move";

      whiteEl.innerHTML =
        `<span class="history-number">
          ${pairNumber}.
        </span>
        <span>
          ${white
            ? white.notation
            : ""}
        </span>`;

      moveHistoryEl.appendChild(
        whiteEl
      );


      if (black) {

        const blackEl =
          document.createElement(
            "div"
          );

        blackEl.className =
          "history-move";

        blackEl.innerHTML =
          `<span class="history-number">
            …
          </span>
          <span>
            ${black.notation}
          </span>`;

        moveHistoryEl.appendChild(
          blackEl
        );
      }
    }

    moveHistoryEl.scrollTop =
      moveHistoryEl.scrollHeight;
  }


  /* =======================================================
     CAPTURED PIECES
     ======================================================= */

  function renderCaptured() {

    if (
      whiteCapturedEl
    ) {

      whiteCapturedEl.textContent =
        state.captured.w
          .map(
            piece =>
              PIECES[
                pieceCode(piece)
              ]
          )
          .join("");
    }

    if (
      blackCapturedEl
    ) {

      blackCapturedEl.textContent =
        state.captured.b
          .map(
            piece =>
              PIECES[
                pieceCode(piece)
              ]
          )
          .join("");
    }
  }


  /* =======================================================
     OVERLAY
     ======================================================= */

  function showOverlay(
    title,
    message,
    icon
  ) {

    if (!gameOverlayEl) {
      return;
    }

    overlayTitleEl.textContent =
      title;

    overlayMessageEl.textContent =
      message;

    overlayIconEl.textContent =
      icon;

    gameOverlayEl.hidden =
      false;
  }


  function hideOverlay() {

    if (!gameOverlayEl) {
      return;
    }

    gameOverlayEl.hidden =
      true;
  }


  /* =======================================================
     PLAYER STATS
     ======================================================= */

  function getStats() {

    return {
      games:
        Number(
          localStorage.getItem(
            "ro_games"
          ) || 0
        ),

      wins:
        Number(
          localStorage.getItem(
            "ro_wins"
          ) || 0
        ),

      elo:
        Number(
          localStorage.getItem(
            "ro_elo"
          ) || 1200
        )
    };
  }


  function saveStats(stats) {

    localStorage.setItem(
      "ro_games",
      String(stats.games)
    );

    localStorage.setItem(
      "ro_wins",
      String(stats.wins)
    );

    localStorage.setItem(
      "ro_elo",
      String(stats.elo)
    );
  }


  function recordResult(
    winner
  ) {

    const stats =
      getStats();

    stats.games++;

    /*
      In Player vs AI / PvP, White is treated
      as the player's side for the profile.
    */

    const playerWon =
      state.mode === "pvp"
        ? winner === "w"
        : winner === "w";

    if (playerWon) {

      stats.wins++;

      stats.elo += 20;

    } else {

      stats.elo =
        Math.max(
          100,
          stats.elo - 10
        );
    }

    saveStats(stats);

    updateStatsUI();
  }


  function updateStatsUI() {

    const stats =
      getStats();

    const rate =
      stats.games > 0
        ? Math.round(
            (
              stats.wins /
              stats.games
            ) * 100
          )
        : 0;

    if (
      commanderRatingEl
    ) {
      commanderRatingEl.textContent =
        stats.elo;
    }

    if (
      gamesPlayedEl
    ) {
      gamesPlayedEl.textContent =
        stats.games;
    }

    if (
      gamesWonEl
    ) {
      gamesWonEl.textContent =
        stats.wins;
    }

    if (
      winRateEl
    ) {
      winRateEl.textContent =
        `${rate}%`;
    }
  }


  /* =======================================================
     THEME
     ======================================================= */

  function changeTheme() {

    if (
      window.ROLyfeThemes &&
      typeof
        window.ROLyfeThemes.list ===
        "function"
    ) {

      const themes =
        window.ROLyfeThemes.list();

      if (!themes.length) {
        return;
      }

      const current =
        typeof
          window.ROLyfeThemes.getCurrent ===
          "function"
          ? window.ROLyfeThemes.getCurrent()
          : null;

      const index =
        themes.findIndex(
          theme =>
            theme.id === current
        );

      const next =
        themes[
          (index + 1) %
          themes.length
        ];

      if (
        next &&
        typeof
          window.ROLyfeThemes.set ===
          "function"
      ) {

        window.ROLyfeThemes.set(
          next.id
        );
      }

      return;
    }

    document.body.classList.toggle(
      "chess-alt-theme"
    );
  }


  /* =======================================================
     CLEAR HISTORY
     ======================================================= */

  function clearHistory() {

    state.moveHistory = [];

    renderHistory();
  }


  /* =======================================================
     EVENT LISTENERS
     ======================================================= */

  if (startGameButton) {

    startGameButton.addEventListener(
      "click",
      startGame
    );
  }


  if (aiStartButton) {

    aiStartButton.addEventListener(
      "click",
      () => {

        if (
          !state.gameStarted
        ) {
          startGame();
        }

        if (
          isAIColor(
            state.turn
          )
        ) {
          maybeStartAI();
        }
      }
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
      startGame
    );
  }


  if (themeButton) {

    themeButton.addEventListener(
      "click",
      changeTheme
    );
  }


  if (overlayRestartButton) {

    overlayRestartButton.addEventListener(
      "click",
      startGame
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
      clearHistory
    );
  }


  if (gameModeEl) {

    gameModeEl.addEventListener(
      "change",
      () => {

        configureMode();

        if (
          state.gameStarted
        ) {
          startGame();
        }
      }
    );
  }


  if (aiProfileEl) {

    aiProfileEl.addEventListener(
      "change",
      () => {

        state.aiProfile =
          aiProfileEl.value;

        updatePlayerLabels();

        if (
          state.gameStarted &&
          isAIColor(
            state.turn
          )
        ) {
          clearAITimers();
          maybeStartAI();
        }
      }
    );
  }


  if (difficultyEl) {

    difficultyEl.addEventListener(
      "change",
      () => {

        const mapping = {
          "1": "startup",
          "2": "credit",
          "3": "line",
          "4": "investor",
          "5": "sevenfigures"
        };

        const profile =
          mapping[
            difficultyEl.value
          ];

        if (
          profile &&
          aiProfileEl
        ) {

          aiProfileEl.value =
            profile;

          state.aiProfile =
            profile;

          updatePlayerLabels();
        }
      }
    );
  }


  /* =======================================================
     KEYBOARD SUPPORT
     ======================================================= */

  if (boardEl) {

    boardEl.addEventListener(
      "keydown",
      event => {

        if (
          event.key === "Escape"
        ) {

          state.selectedSquare =
            null;

          state.legalMoves =
            [];

          renderBoard();

          moveStatusEl.textContent =
            "Selection cleared.";
        }
      }
    );
  }


  /* =======================================================
     VISIBILITY SAFETY
     ======================================================= */

  document.addEventListener(
    "visibilitychange",
    () => {

      if (
        document.hidden &&
        state.gameStarted &&
        !state.gameOver
      ) {

        if (!state.paused) {
          togglePause();
        }
      }
    }
  );


  /* =======================================================
     INITIALIZE
     ======================================================= */

  function init() {

    resetState();

    configureMode();

    updateStatsUI();

    renderBoard();

    updateUI();

    console.log(
      "♟️ RO’Lyfe Chess Engine V1.0 loaded."
    );
  }


  /* =======================================================
     PUBLIC API
     ======================================================= */

  window.ROLyfeChess = {
    version: "1.0",

    start: startGame,

    reset: startGame,

    pause: togglePause,

    resign: resignGame,

    getState: () => ({
      ...state,
      board:
        cloneBoard(state.board)
    }),

    getLegalMoves: () =>
      generateLegalMoves(
        state.board,
        state.turn
      ),

    getBoard: () =>
      cloneBoard(
        state.board
      ),

    isInCheck: color =>
      isInCheck(
        state.board,
        color
      ),

    getCurrentTurn: () =>
      state.turn,

    makeMove,

    selectSquare
  };


  /* Compatibility alias */

  window.ROlyfeChess =
    window.ROLyfeChess;


  init();

})();
