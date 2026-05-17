import type { CellOwner } from './index';
import type { Pos } from './diamondAI';
import styles from './index.module.css';

interface DiamondBoardProps {
  board: CellOwner[][];
  selectedPiece: Pos | null;
  validMoves: Pos[];
  winningCells: Pos[];
  lastMove: { from: Pos; to: Pos } | null;
  onCellClick: (r: number, c: number) => void;
  disabled: boolean;
  helpHint?: { from: Pos; to: Pos } | null;
  showGuide?: boolean;
}

const BOARD_SIZE = 5;

export default function DiamondBoard({
  board,
  selectedPiece,
  validMoves,
  winningCells,
  lastMove,
  onCellClick,
  disabled,
  helpHint,
  showGuide = true,
}: DiamondBoardProps) {
  const cellSize = Math.min((Math.min(window.innerWidth - 32, 500) - 60) / BOARD_SIZE, 72);
  const padding = 12;

  const isValidMove = (r: number, c: number) =>
    validMoves.some(([mr, mc]) => mr === r && mc === c);

  const isSelected = (r: number, c: number) =>
    selectedPiece?.[0] === r && selectedPiece?.[1] === c;

  const isWinning = (r: number, c: number) =>
    winningCells.some(([wr, wc]) => wr === r && wc === c);

  const isLastFrom = (r: number, c: number) =>
    lastMove?.from[0] === r && lastMove?.from[1] === c;
  const isLastTo = (r: number, c: number) =>
    lastMove?.to[0] === r && lastMove?.to[1] === c;

  const boardW = cellSize * BOARD_SIZE + padding * 2;
  const boardH = cellSize * BOARD_SIZE + padding * 2;

  return (
    <div className={styles.boardWrapper}>
      <svg width={boardW} height={boardH} className={styles.board}>
        {/* Background */}
        <rect
          x={0} y={0} width={boardW} height={boardH}
          rx={12}
          fill="#1e1e3a"
          stroke="#4a4a6a"
          strokeWidth={2}
        />

        {/* Cells */}
        {board.map((row, r) =>
          row.map((cell, c) => {
            const cx = padding + c * cellSize + cellSize / 2;
            const cy = padding + r * cellSize + cellSize / 2;
            const x = padding + c * cellSize;
            const y = padding + r * cellSize;

            return (
              <g key={`${r}-${c}`}>
                {/* Cell background */}
                <rect
                  x={x + 2} y={y + 2}
                  width={cellSize - 4} height={cellSize - 4}
                  rx={6}
                  fill={isSelected(r, c) ? 'rgba(255,217,61,0.2)' : 'rgba(255,255,255,0.04)'}
                  stroke={isSelected(r, c) ? 'rgba(255,217,61,0.5)' : 'rgba(255,255,255,0.08)'}
                  strokeWidth={1}
                  cursor={disabled ? 'default' : 'pointer'}
                  onClick={() => !disabled && onCellClick(r, c)}
                />

                {/* Valid move indicator */}
                {isValidMove(r, c) && cell === 0 && (
                  <circle
                    cx={cx} cy={cy}
                    r={cellSize * 0.15}
                    fill="rgba(107,203,119,0.5)"
                    cursor="pointer"
                    onClick={() => !disabled && onCellClick(r, c)}
                  />
                )}

                {/* Gold diamond (player 1) */}
                {cell === 1 && (
                  <g>
                    <polygon
                      points={diamondPoints(cx, cy, cellSize * 0.32)}
                      fill="url(#goldGradient)"
                      stroke="#ffd93d"
                      strokeWidth={2}
                      cursor={disabled ? 'default' : 'pointer'}
                      onClick={() => !disabled && onCellClick(r, c)}
                    />
                    {/* Selection ring */}
                    {isSelected(r, c) && (
                      <circle
                        cx={cx} cy={cy}
                        r={cellSize * 0.38}
                        fill="none"
                        stroke="#ffd93d"
                        strokeWidth={2}
                        strokeDasharray="4 4"
                        className={styles.spinRing}
                      />
                    )}
                    {/* Winning glow */}
                    {isWinning(r, c) && (
                      <circle
                        cx={cx} cy={cy}
                        r={cellSize * 0.4}
                        fill="none"
                        stroke="#ffd93d"
                        strokeWidth={3}
                        className={styles.winningGlow}
                      />
                    )}
                    {/* Last move from indicator */}
                    {isLastFrom(r, c) && (
                      <circle
                        cx={cx} cy={cy}
                        r={cellSize * 0.12}
                        fill="rgba(255,217,61,0.3)"
                      />
                    )}
                  </g>
                )}

                {/* Blue diamond (player 2 / AI) */}
                {cell === 2 && (
                  <g>
                    <polygon
                      points={diamondPoints(cx, cy, cellSize * 0.32)}
                      fill="url(#blueGradient)"
                      stroke="#4d96ff"
                      strokeWidth={2}
                    />
                    {isWinning(r, c) && (
                      <circle
                        cx={cx} cy={cy}
                        r={cellSize * 0.4}
                        fill="none"
                        stroke="#4d96ff"
                        strokeWidth={3}
                        className={styles.winningGlow}
                      />
                    )}
                    {isLastTo(r, c) && (
                      <circle
                        cx={cx} cy={cy}
                        r={cellSize * 0.38}
                        fill="none"
                        stroke="#4d96ff"
                        strokeWidth={2}
                        opacity={0.5}
                      />
                    )}
                  </g>
                )}
              </g>
            );
          })
        )}

        {/* Help hint */}
        {helpHint && (
          <g>
            {/* Highlight from piece */}
            {board[helpHint.from[0]][helpHint.from[1]] === 1 && (
              <circle
                cx={padding + helpHint.from[1] * cellSize + cellSize / 2}
                cy={padding + helpHint.from[0] * cellSize + cellSize / 2}
                r={cellSize * 0.42}
                fill="none"
                stroke="var(--color-sky)"
                strokeWidth={3}
                opacity={0.8}
                className={styles.winningGlow}
              />
            )}
            {/* Highlight to position */}
            <circle
              cx={padding + helpHint.to[1] * cellSize + cellSize / 2}
              cy={padding + helpHint.to[0] * cellSize + cellSize / 2}
              r={cellSize * 0.18}
              fill="var(--color-sky)"
              opacity={0.6}
              className={styles.winningGlow}
            />
            {/* Arrow from -> to */}
            <line
              x1={padding + helpHint.from[1] * cellSize + cellSize / 2}
              y1={padding + helpHint.from[0] * cellSize + cellSize / 2}
              x2={padding + helpHint.to[1] * cellSize + cellSize / 2}
              y2={padding + helpHint.to[0] * cellSize + cellSize / 2}
              stroke="var(--color-sky)"
              strokeWidth={2}
              strokeDasharray="6 3"
              opacity={0.6}
            />
          </g>
        )}

        {/* Dashed diamond guide outline showing target shape */}
        {showGuide && winningCells.length === 0 && (
          <g opacity={0.3}>
            {/* Example diamond at center: (1,2)(2,1)(2,3)(3,2) */}
            <polygon
              points={[
                `${padding + 2 * cellSize + cellSize / 2},${padding + 1 * cellSize + cellSize / 2 - cellSize * 0.32}`,
                `${padding + 3 * cellSize + cellSize / 2 + cellSize * 0.32},${padding + 2 * cellSize + cellSize / 2}`,
                `${padding + 2 * cellSize + cellSize / 2},${padding + 3 * cellSize + cellSize / 2 + cellSize * 0.32}`,
                `${padding + 1 * cellSize + cellSize / 2 - cellSize * 0.32},${padding + 2 * cellSize + cellSize / 2}`,
              ].join(' ')}
              fill="none"
              stroke="#ffd93d"
              strokeWidth={2}
              strokeDasharray="6 4"
            />
          </g>
        )}

        {/* Tutorial arrow for first moves */}
        {showGuide && !lastMove && !selectedPiece && winningCells.length === 0 && (
          <g>
            <line
              x1={padding + 0 * cellSize + cellSize / 2}
              y1={padding + 0 * cellSize + cellSize / 2}
              x2={padding + 1 * cellSize + cellSize / 2}
              y2={padding + 1 * cellSize + cellSize / 2}
              stroke="#ffd93d"
              strokeWidth={2}
              markerEnd="url(#arrowhead)"
              opacity={0.7}
            />
            <text
              x={padding + 0.5 * cellSize + cellSize / 2}
              y={padding + 0 * cellSize + cellSize * 0.2}
              textAnchor="middle"
              fill="#ffd93d"
              fontSize={11}
              fontWeight="bold"
              opacity={0.8}
            >
              把这颗移到这里！
            </text>
          </g>
        )}

        {/* Gradient definitions */}
        <defs>
          <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="#ffd93d" opacity={0.7} />
          </marker>
          <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffd93d" />
            <stop offset="100%" stopColor="#ffb347" />
          </linearGradient>
          <linearGradient id="blueGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4d96ff" />
            <stop offset="100%" stopColor="#9b72cf" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

/** Generate diamond polygon points centered at (cx, cy) */
function diamondPoints(cx: number, cy: number, size: number): string {
  return [
    `${cx},${cy - size}`,
    `${cx + size},${cy}`,
    `${cx},${cy + size}`,
    `${cx - size},${cy}`,
  ].join(' ');
}
