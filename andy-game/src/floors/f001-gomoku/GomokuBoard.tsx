import type { CellState } from './index';
import styles from './index.module.css';

interface GomokuBoardProps {
  board: CellState[][];
  lastMove: [number, number] | null;
  winningCells: [number, number][];
  onCellClick: (row: number, col: number) => void;
  disabled: boolean;
  helpHint?: [number, number] | null;
}

const BOARD_SIZE = 9;

export default function GomokuBoard({
  board,
  lastMove,
  winningCells,
  onCellClick,
  disabled,
  helpHint,
}: GomokuBoardProps) {
  // Responsive cell size: fit within container, capped at 50px
  const maxWidth = Math.min(window.innerWidth - 32, 500);
  const cellSize = Math.min(maxWidth / BOARD_SIZE, 50);

  const isWinningCell = (r: number, c: number) =>
    winningCells.some(([wr, wc]) => wr === r && wc === c);

  return (
    <div className={styles.boardWrapper}>
      <svg
        width={cellSize * BOARD_SIZE}
        height={cellSize * BOARD_SIZE}
        className={styles.board}
      >
        {/* Grid lines */}
        {Array.from({ length: BOARD_SIZE }, (_, i) => (
          <g key={i}>
            <line
              x1={cellSize / 2}
              y1={cellSize / 2 + i * cellSize}
              x2={cellSize * BOARD_SIZE - cellSize / 2}
              y2={cellSize / 2 + i * cellSize}
              stroke="var(--color-board-line)"
              strokeWidth="1"
            />
            <line
              x1={cellSize / 2 + i * cellSize}
              y1={cellSize / 2}
              x2={cellSize / 2 + i * cellSize}
              y2={cellSize * BOARD_SIZE - cellSize / 2}
              stroke="var(--color-board-line)"
              strokeWidth="1"
            />
          </g>
        ))}

        {/* Star points */}
        {[
          [2, 2], [2, 6], [6, 2], [6, 6], [4, 4],
        ].map(([r, c]) => (
          <circle
            key={`star-${r}-${c}`}
            cx={cellSize / 2 + c * cellSize}
            cy={cellSize / 2 + r * cellSize}
            r={3}
            fill="var(--color-board-line)"
          />
        ))}

        {/* Stones */}
        {board.map((row, r) =>
          row.map((cell, c) => {
            if (cell === 0) return null;
            const cx = cellSize / 2 + c * cellSize;
            const cy = cellSize / 2 + r * cellSize;
            const isLast = lastMove?.[0] === r && lastMove?.[1] === c;
            const isWin = isWinningCell(r, c);

            return (
              <g key={`stone-${r}-${c}`}>
                <circle
                  cx={cx}
                  cy={cy}
                  r={cellSize * 0.4}
                  fill={cell === 1 ? 'var(--color-black-stone)' : 'var(--color-white-stone)'}
                  stroke={cell === 1 ? '#333' : '#ccc'}
                  strokeWidth="1"
                />
                {isLast && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={cellSize * 0.15}
                    fill={cell === 1 ? '#ff6b6b' : '#ff6b6b'}
                  />
                )}
                {isWin && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={cellSize * 0.45}
                    fill="none"
                    stroke="var(--color-primary)"
                    strokeWidth="2"
                    className={styles.winningGlow}
                  />
                )}
              </g>
            );
          })
        )}

        {/* Help hint indicator */}
        {helpHint && board[helpHint[0]][helpHint[1]] === 0 && (
          <g>
            <circle
              cx={cellSize / 2 + helpHint[1] * cellSize}
              cy={cellSize / 2 + helpHint[0] * cellSize}
              r={cellSize * 0.35}
              fill="none"
              stroke="var(--color-primary)"
              strokeWidth="3"
              opacity={0.8}
              className={styles.winningGlow}
            />
            <text
              x={cellSize / 2 + helpHint[1] * cellSize}
              y={cellSize / 2 + helpHint[0] * cellSize + cellSize * 0.12}
              textAnchor="middle"
              fill="var(--color-primary)"
              fontSize={cellSize * 0.35}
              fontWeight="bold"
            >
              💡
            </text>
          </g>
        )}

        {/* Clickable areas */}
        {board.map((row, r) =>
          row.map((cell, c) => {
            if (cell !== 0) return null;
            return (
              <rect
                key={`click-${r}-${c}`}
                x={c * cellSize}
                y={r * cellSize}
                width={cellSize}
                height={cellSize}
                fill="transparent"
                cursor={disabled ? 'default' : 'pointer'}
                onClick={() => !disabled && onCellClick(r, c)}
              />
            );
          })
        )}
      </svg>
    </div>
  );
}
