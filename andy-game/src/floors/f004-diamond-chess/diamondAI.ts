import type { CellOwner } from './index';

export type Pos = [number, number];

export const BOARD_SIZE = 5;

/**
 * All valid diamond/rhombus shapes on a 5x5 board.
 * Each shape is a set of 4 positions forming a ◆ pattern:
 *     .
 *    . .
 *     .
 */
export const DIAMOND_SHAPES: Pos[][] = (() => {
  const shapes: Pos[][] = [];
  for (let r = 0; r <= BOARD_SIZE - 3; r++) {
    for (let c = 1; c <= BOARD_SIZE - 2; c++) {
      shapes.push([
        [r, c],
        [r + 1, c - 1],
        [r + 1, c + 1],
        [r + 2, c],
      ]);
    }
  }
  return shapes;
})();

/** Check if a player's pieces form any diamond shape */
export function checkDiamondWin(pieces: Pos[]): Pos[] | null {
  const pieceSet = new Set(pieces.map(([r, c]) => `${r},${c}`));
  for (const shape of DIAMOND_SHAPES) {
    if (shape.every(([r, c]) => pieceSet.has(`${r},${c}`))) {
      return shape;
    }
  }
  return null;
}

/** Get all valid moves for a piece at (r,c): adjacent empty cells in 8 directions */
export function getValidMoves(
  r: number,
  c: number,
  board: CellOwner[][]
): Pos[] {
  const moves: Pos[] = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nr >= BOARD_SIZE || nc < 0 || nc >= BOARD_SIZE) continue;
      if (board[nr][nc] === 0) {
        moves.push([nr, nc]);
      }
    }
  }
  return moves;
}

/** Get all pieces for a player */
export function getPlayerPieces(board: CellOwner[][], player: CellOwner): Pos[] {
  const pieces: Pos[] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] === player) pieces.push([r, c]);
    }
  }
  return pieces;
}

/**
 * AI move selection for player 2.
 * Strategy:
 * 1. Win if possible
 * 2. Block opponent's win
 * 3. Move toward forming a diamond shape
 * 4. With randomRate chance, make a random move (kid-friendly)
 */
export function findAIMove(board: CellOwner[][], randomRate: number = 0.25): { from: Pos; to: Pos } | null {
  const aiPieces = getPlayerPieces(board, 2);
  const playerPieces = getPlayerPieces(board, 1);

  // Collect all possible moves for AI
  const allMoves: { from: Pos; to: Pos; score: number }[] = [];

  for (const [pr, pc] of aiPieces) {
    const moves = getValidMoves(pr, pc, board);
    for (const [mr, mc] of moves) {
      // Simulate move
      const simBoard = board.map((row) => [...row]);
      simBoard[pr][pc] = 0;
      simBoard[mr][mc] = 2;

      const newAiPieces = aiPieces
        .map(([r, c]): Pos => (r === pr && c === pc ? [mr, mc] : [r, c]));

      // 1. Can AI win?
      if (checkDiamondWin(newAiPieces)) {
        return { from: [pr, pc], to: [mr, mc] };
      }

      // Score this move
      let score = 0;

      // 2. Check if opponent would win after this move (need to block)
      // Simulate each opponent move and see if they win
      for (const [opr, opc] of playerPieces) {
        const oppMoves = getValidMoves(opr, opc, simBoard);
        for (const [omr, omc] of oppMoves) {
          const simBoard2 = simBoard.map((row) => [...row]);
          simBoard2[opr][opc] = 0;
          simBoard2[omr][omc] = 1;
          const newPlayerPieces = playerPieces
            .map(([r, c]): Pos => (r === opr && c === opc ? [omr, omc] : [r, c]));
          if (checkDiamondWin(newPlayerPieces)) {
            score -= 50; // Opponent can still win, bad
          }
        }
      }

      // 3. How close is AI to forming a diamond?
      score += diamondCloseness(newAiPieces);

      // 4. Slight preference for center
      score += (2 - Math.abs(mr - 2)) * 0.5 + (2 - Math.abs(mc - 2)) * 0.5;

      allMoves.push({ from: [pr, pc], to: [mr, mc], score });
    }
  }

  if (allMoves.length === 0) return null;

  // randomRate random move (kid-friendly)
  if (Math.random() < randomRate) {
    const idx = Math.floor(Math.random() * allMoves.length);
    return { from: allMoves[idx].from, to: allMoves[idx].to };
  }

  // Pick best scoring move
  allMoves.sort((a, b) => b.score - a.score);
  // Pick from top 3 to add variety
  const topN = Math.min(3, allMoves.length);
  const pick = allMoves[Math.floor(Math.random() * topN)];
  return { from: pick.from, to: pick.to };
}

/** Score how close a set of pieces is to forming any diamond shape */
function diamondCloseness(pieces: Pos[]): number {
  let bestScore = 0;
  const pieceSet = new Set(pieces.map(([r, c]) => `${r},${c}`));

  for (const shape of DIAMOND_SHAPES) {
    let matches = 0;
    for (const [r, c] of shape) {
      if (pieceSet.has(`${r},${c}`)) matches++;
    }
    // Exponential reward for more matches
    if (matches === 3) bestScore = Math.max(bestScore, 80);
    else if (matches === 2) bestScore = Math.max(bestScore, 20);
    else if (matches === 1) bestScore = Math.max(bestScore, 3);
  }
  return bestScore;
}

/** Check if any opponent move would win (for hint/blocking) */
export function wouldOpponentWin(board: CellOwner[][], opponent: CellOwner): Pos | null {
  const pieces = getPlayerPieces(board, opponent);
  for (const [pr, pc] of pieces) {
    const moves = getValidMoves(pr, pc, board);
    for (const [mr, mc] of moves) {
      const newPieces = pieces.map(([r, c]): Pos => (r === pr && c === pc ? [mr, mc] : [r, c]));
      if (checkDiamondWin(newPieces)) {
        return [mr, mc]; // This is where opponent would move to win
      }
    }
  }
  return null;
}
