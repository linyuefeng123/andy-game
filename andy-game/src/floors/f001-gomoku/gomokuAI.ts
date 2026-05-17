import type { CellState } from './index';

/**
 * Check if placing at (row, col) by `player` results in a win.
 * Returns the winning cells or null.
 */
export function checkWin(
  board: CellState[][],
  row: number,
  col: number,
  player: CellState,
  winLength: number
): [number, number][] | null {
  const directions = [
    [0, 1], // horizontal
    [1, 0], // vertical
    [1, 1], // diagonal
    [1, -1], // anti-diagonal
  ];

  for (const [dr, dc] of directions) {
    const cells: [number, number][] = [[row, col]];

    // Count in positive direction
    for (let i = 1; i < winLength; i++) {
      const r = row + dr * i;
      const c = col + dc * i;
      if (r < 0 || r >= board.length || c < 0 || c >= board[0].length) break;
      if (board[r][c] !== player) break;
      cells.push([r, c]);
    }

    // Count in negative direction
    for (let i = 1; i < winLength; i++) {
      const r = row - dr * i;
      const c = col - dc * i;
      if (r < 0 || r >= board.length || c < 0 || c >= board[0].length) break;
      if (board[r][c] !== player) break;
      cells.push([r, c]);
    }

    if (cells.length >= winLength) return cells;
  }

  return null;
}

/**
 * Easy AI: finds the best move for player 2 (white).
 * Strategy:
 * 1. Win if possible
 * 2. Block opponent's win
 * 3. Score-based evaluation with deliberate mistakes for kid-friendliness
 *
 * @param randomRate Probability of making a random move (0 = always best, 1 = always random).
 *   Easy: 0.4, Medium: 0.2, Hard: 0.1
 */
export function findBestMove(
  board: CellState[][],
  size: number,
  winLength: number,
  randomRate: number = 0.3
): [number, number] | null {
  const empty: [number, number][] = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (board[r][c] === 0) empty.push([r, c]);
    }
  }

  if (empty.length === 0) return null;

  // 1. Can AI win?
  for (const [r, c] of empty) {
    board[r][c] = 2;
    if (checkWin(board, r, c, 2, winLength)) {
      board[r][c] = 0;
      return [r, c];
    }
    board[r][c] = 0;
  }

  // 2. Must block opponent's win?
  for (const [r, c] of empty) {
    board[r][c] = 1;
    if (checkWin(board, r, c, 1, winLength)) {
      board[r][c] = 0;
      return [r, c];
    }
    board[r][c] = 0;
  }

  // 3. Score-based move with randomness (easy mode)
  // randomRate chance of making a random move (keeps it fun for kids)
  if (Math.random() < randomRate) {
    const nearEmpty = empty.filter(([r, c]) => hasNeighbor(board, r, c, size));
    if (nearEmpty.length > 0) {
      return nearEmpty[Math.floor(Math.random() * nearEmpty.length)];
    }
    return empty[Math.floor(Math.random() * empty.length)];
  }

  // Score each empty cell
  let bestScore = -1;
  let bestMoves: [number, number][] = [];

  for (const [r, c] of empty) {
    if (!hasNeighbor(board, r, c, size)) continue;

    const score = evaluateCell(board, r, c, size);
    if (score > bestScore) {
      bestScore = score;
      bestMoves = [[r, c]];
    } else if (score === bestScore) {
      bestMoves.push([r, c]);
    }
  }

  if (bestMoves.length === 0) {
    // Center is a good default
    const center = Math.floor(size / 2);
    if (board[center][center] === 0) return [center, center];
    return empty[0];
  }

  return bestMoves[Math.floor(Math.random() * bestMoves.length)];
}

function hasNeighbor(board: CellState[][], r: number, c: number, size: number): boolean {
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < size && nc >= 0 && nc < size && board[nr][nc] !== 0) {
        return true;
      }
    }
  }
  return false;
}

function evaluateCell(board: CellState[][], r: number, c: number, size: number): number {
  let score = 0;
  const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];

  for (const [dr, dc] of directions) {
    // Count AI's potential in this direction
    score += evaluateDirection(board, r, c, dr, dc, 2, size);
    // Count blocking opponent's potential
    score += evaluateDirection(board, r, c, dr, dc, 1, size) * 0.9;
  }

  // Slight preference for center
  const center = size / 2;
  const distToCenter = Math.abs(r - center) + Math.abs(c - center);
  score += (size - distToCenter) * 0.1;

  return score;
}

function evaluateDirection(
  board: CellState[][],
  r: number,
  c: number,
  dr: number,
  dc: number,
  player: CellState,
  size: number
): number {
  let count = 0;
  let openEnds = 0;

  // Positive direction
  let blocked = false;
  for (let i = 1; i <= 4; i++) {
    const nr = r + dr * i;
    const nc = c + dc * i;
    if (nr < 0 || nr >= size || nc < 0 || nc >= size) { blocked = true; break; }
    if (board[nr][nc] === player) count++;
    else { if (board[nr][nc] === 0) openEnds++; break; }
  }
  if (!blocked && openEnds === 0) openEnds++;

  // Negative direction
  blocked = false;
  for (let i = 1; i <= 4; i++) {
    const nr = r - dr * i;
    const nc = c - dc * i;
    if (nr < 0 || nr >= size || nc < 0 || nc >= size) { blocked = true; break; }
    if (board[nr][nc] === player) count++;
    else { if (board[nr][nc] === 0) openEnds++; break; }
  }

  // Scoring: more stones in a row = exponentially better
  if (count >= 4) return 1000;
  if (count === 3 && openEnds >= 2) return 100;
  if (count === 3 && openEnds === 1) return 50;
  if (count === 2 && openEnds >= 2) return 20;
  if (count === 2 && openEnds === 1) return 5;
  if (count === 1 && openEnds >= 2) return 3;
  if (count === 1 && openEnds === 1) return 1;
  return 0;
}
