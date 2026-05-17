// Jungle Chess (斗兽棋) AI and game logic
// 7x9 board, 8 animals per side, rat beats elephant

export const COLS = 7;
export const ROWS = 9;

// Animal ranks: 1-8 (1=rat, 8=elephant)
export const ANIMALS = {
  rat: 1,
  cat: 2,
  dog: 3,
  wolf: 4,
  leopard: 5,
  tiger: 6,
  lion: 7,
  elephant: 8,
} as const;

export type AnimalType = keyof typeof ANIMALS;

export interface Piece {
  type: AnimalType;
  rank: number;
  player: 1 | 2; // 1=Andy(gold), 2=AI(blue)
}

export type CellState = Piece | null;

// Water squares (2x3 in middle)
export function isWater(r: number, c: number): boolean {
  return (r >= 3 && r <= 5) && ((c >= 1 && c <= 2) || (c >= 4 && c <= 5));
}

// Traps: player 1's traps near top-right den, player 2's near bottom-left
export function isTrap(r: number, c: number, player: 1 | 2): boolean {
  if (player === 2) {
    // AI traps near top-left (AI is at top)
    return (r === 0 && c === 2) || (r === 0 && c === 4) || (r === 1 && c === 3);
  }
  // Player traps near bottom-right
  return (r === 8 && c === 2) || (r === 8 && c === 4) || (r === 7 && c === 3);
}

// Dens
export function isDen(r: number, c: number, player: 1 | 2): boolean {
  if (player === 2) return r === 0 && c === 3; // AI den top-center
  return r === 8 && c === 3; // Player den bottom-center
}

// Can piece at (fr,fc) capture piece at (tr,tc)?
export function canCapture(attacker: Piece, defender: Piece, defR: number, defC: number): boolean {
  // Rat in water can't capture elephant on land, and land elephant can't capture rat in water
  if (attacker.rank === 1 && defender.rank === 8) {
    // Rat can capture elephant unless rat is in water and elephant is on land
    if (isWater(defR, defC)) return false; // elephant in water? shouldn't happen but safety
    return true;
  }
  if (attacker.rank === 8 && defender.rank === 1) return false; // Elephant can never capture rat

  // In trap, any piece can capture
  if (isTrap(defR, defC, defender.player)) return true;

  // Higher or equal rank captures
  return attacker.rank >= defender.rank;
}

// Get valid moves for a piece at (r,c)
export function getValidMoves(r: number, c: number, board: CellState[][]): [number, number][] {
  const piece = board[r][c];
  if (!piece) return [];

  const moves: [number, number][] = [];
  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];

  for (const [dr, dc] of dirs) {
    const nr = r + dr;
    const nc = c + dc;

    // Lion and Tiger can jump over water
    if ((piece.type === 'lion' || piece.type === 'tiger') && isWater(nr, nc)) {
      // Jump over water
      let jr = nr;
      let jc = nc;
      let blocked = false;
      while (isWater(jr, jc)) {
        // Rat in water blocks the jump
        if (board[jr][jc]?.type === 'rat') {
          blocked = true;
          break;
        }
        jr += dr;
        jc += dc;
      }
      if (!blocked && jr >= 0 && jr < ROWS && jc >= 0 && jc < COLS) {
        const target = board[jr][jc];
        if (!target || (target.player !== piece.player && canCapture(piece, target, jr, jc))) {
          moves.push([jr, jc]);
        }
      }
      continue;
    }

    if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) continue;

    // Can't enter own den
    if (isDen(nr, nc, piece.player)) continue;

    // Rat is only piece that can enter water
    if (isWater(nr, nc) && piece.type !== 'rat') continue;

    const target = board[nr][nc];
    if (!target) {
      moves.push([nr, nc]);
    } else if (target.player !== piece.player) {
      if (canCapture(piece, target, nr, nc)) {
        moves.push([nr, nc]);
      }
    }
  }

  return moves;
}

// Check if player has won (entered opponent's den)
export function checkWin(board: CellState[][]): 0 | 1 | 2 {
  // Check if any piece is in opponent's den
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const p = board[r][c];
      if (p && isDen(r, c, p.player === 1 ? 2 : 1)) {
        return p.player;
      }
    }
  }

  // Check if a player has no pieces left
  let p1Pieces = 0;
  let p2Pieces = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c]?.player === 1) p1Pieces++;
      if (board[r][c]?.player === 2) p2Pieces++;
    }
  }
  if (p1Pieces === 0) return 2;
  if (p2Pieces === 0) return 1;

  return 0;
}

// AI: simple greedy - find best capture, else random move
// randomRate controls how often AI makes a random move (easy=0.4, medium=0.2, hard=0.1)
export function findAIMove(board: CellState[][], randomRate: number = 0.3): { from: [number, number]; to: [number, number] } | null {
  const aiMoves: { from: [number, number]; to: [number, number]; score: number }[] = [];

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const p = board[r][c];
      if (!p || p.player !== 2) continue;

      const moves = getValidMoves(r, c, board);
      for (const [mr, mc] of moves) {
        let score = 0;
        const target = board[mr][mc];

        // Capturing is good
        if (target) score += 10 + target.rank;

        // Moving toward player's den (bottom-center)
        const denR = 8;
        const denC = 3;
        const oldDist = Math.abs(r - denR) + Math.abs(c - denC);
        const newDist = Math.abs(mr - denR) + Math.abs(mc - denC);
        score += (oldDist - newDist) * 2;

        // Entering den is instant win
        if (isDen(mr, mc, 1)) score += 1000;

        // Avoid moving high-rank pieces into danger
        if (target && target.rank < p.rank) score -= 5;

        // Slight randomness
        score += Math.random() * 2;

        aiMoves.push({ from: [r, c], to: [mr, mc], score });
      }
    }
  }

  if (aiMoves.length === 0) return null;

  // Random move based on difficulty
  if (Math.random() < randomRate) {
    const idx = Math.floor(Math.random() * aiMoves.length);
    return aiMoves[idx];
  }

  aiMoves.sort((a, b) => b.score - a.score);
  return aiMoves[0];
}

// Initial board setup
export function createInitialBoard(): CellState[][] {
  const board: CellState[][] = Array.from({ length: ROWS }, () =>
    Array(COLS).fill(null) as CellState[]
  );

  // Player 2 (AI) - top side
  board[0][0] = { type: 'lion', rank: 7, player: 2 };
  board[0][6] = { type: 'tiger', rank: 6, player: 2 };
  board[1][1] = { type: 'dog', rank: 3, player: 2 };
  board[1][5] = { type: 'cat', rank: 2, player: 2 };
  board[2][0] = { type: 'rat', rank: 1, player: 2 };
  board[2][2] = { type: 'leopard', rank: 5, player: 2 };
  board[2][4] = { type: 'wolf', rank: 4, player: 2 };
  board[2][6] = { type: 'elephant', rank: 8, player: 2 };

  // Player 1 (Andy) - bottom side (mirrored)
  board[6][0] = { type: 'elephant', rank: 8, player: 1 };
  board[6][2] = { type: 'wolf', rank: 4, player: 1 };
  board[6][4] = { type: 'leopard', rank: 5, player: 1 };
  board[6][6] = { type: 'rat', rank: 1, player: 1 };
  board[7][1] = { type: 'cat', rank: 2, player: 1 };
  board[7][5] = { type: 'dog', rank: 3, player: 1 };
  board[8][0] = { type: 'tiger', rank: 6, player: 1 };
  board[8][6] = { type: 'lion', rank: 7, player: 1 };

  return board;
}

export const ANIMAL_EMOJI: Record<AnimalType, string> = {
  rat: '🐀',
  cat: '🐱',
  dog: '🐶',
  wolf: '🐺',
  leopard: '🐆',
  tiger: '🐯',
  lion: '🦁',
  elephant: '🐘',
};
