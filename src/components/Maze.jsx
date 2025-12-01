import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { RectMaze } from '../utils/rectMaze.js';
import '../styles/Maze.css';

const DEFAULT_ROWS = 4;
const DEFAULT_COLS = 4;
const MIN_DIM = 4;
const MAX_DIM = 40;


const clampDimension = (value, fallback) => {
  let parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    parsed = MAX_DIM;
  }
  return Math.max(MIN_DIM, Math.min(parsed, MAX_DIM)); 
};

function Maze({
  initialRows = DEFAULT_ROWS,
  initialCols = DEFAULT_COLS,
  initialSeed = '',
}) {
  const [rowsInput, setRowsInput] = useState(String(initialRows));
  const [colsInput, setColsInput] = useState(String(initialCols));
  const [seedInput, setSeedInput] = useState(initialSeed);
  const [mazeGrid, setMazeGrid] = useState([]);
  const [error, setError] = useState('');
  const [controlsOpen, setControlsOpen] = useState(false);
  const [currentCell, setCurrentCell] = useState({ row: 0, column: 0 });
  const [visitedCells, setVisitedCells] = useState(() => new Set(['0-0']));
  const [hasWon, setHasWon] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [confettiPieces, setConfettiPieces] = useState([]);
  const confettiTimeoutRef = useRef(null);

  const dimensions = useMemo(() => {
    return {
      rows: clampDimension(rowsInput, initialRows),
      cols: clampDimension(colsInput, initialCols),
    };
  }, [rowsInput, colsInput, initialRows, initialCols]);

  const handleGenerate = () => {
    try {
      const maze = new RectMaze(dimensions.rows, dimensions.cols);
      const seed = seedInput.trim();
      maze.generate(seed === '' ? null : seed);
      const grid = maze.toCellGrid();
      setMazeGrid(grid);
      setCurrentCell({ row: 0, column: 0 });
      setVisitedCells(new Set(['0-0']));
      setHasWon(false);
      setShowConfetti(false);
      setError('');
    } catch (err) {
      setMazeGrid([]);
      setVisitedCells(new Set());
      setHasWon(false);
      setShowConfetti(false);
      setError(err.message || 'Failed to generate maze');
    }
  };

  useEffect(() => {
    handleGenerate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const controlsPanelClassName = `maze-controls-panel ${controlsOpen ? 'is-open' : ''}`;

  const getCellKey = (row, column) => `${row}-${column}`;

  const createConfettiPieces = () => {
    const total = 100;
    return Array.from({ length: total }, (_, index) => ({
      id: index,
      left: Math.random() * 100,
      delay: Math.random() * 0.3,
      duration: 2 + Math.random() * 1.5,
      hue: Math.floor(Math.random() * 360),
    }));
  };

  const triggerConfetti = () => {
    setShowConfetti(true);
    setConfettiPieces(createConfettiPieces());
    if (confettiTimeoutRef.current) {
      clearTimeout(confettiTimeoutRef.current);
    }
    confettiTimeoutRef.current = setTimeout(() => {
      setShowConfetti(false);
    }, 3200);
  };

  useEffect(() => {
    return () => {
      if (confettiTimeoutRef.current) {
        clearTimeout(confettiTimeoutRef.current);
      }
    };
  }, []);

  const markVisited = (row, column) => {
    setVisitedCells((prev) => {
      const next = new Set(prev);
      next.add(getCellKey(row, column));
      return next;
    });
  };

  const moveToCell = (row, column) => {
    setCurrentCell({ row, column });
    markVisited(row, column);
    if (
      row === dimensions.rows - 1 &&
      column === dimensions.cols - 1 &&
      !hasWon
    ) {
      //setHasWon(true); // let user win how many times they like to
      triggerConfetti();
    }
  };

  const tryMove = (direction) => {
    if (mazeGrid.length === 0) {
      return;
    }
    const { row, column } = currentCell;
    const cell = mazeGrid[row]?.[column];
    if (!cell) {
      return;
    }

    let targetRow = row;
    let targetColumn = column;

    switch (direction) {
      case 'ArrowUp':
        if (!cell.walls.top && row > 0) {
          targetRow -= 1;
        }
        break;
      case 'ArrowDown':
        if (!cell.walls.bottom && row < mazeGrid.length - 1) {
          targetRow += 1;
        }
        break;
      case 'ArrowLeft':
        if (!cell.walls.left && column > 0) {
          targetColumn -= 1;
        }
        break;
      case 'ArrowRight':
        if (!cell.walls.right && column < mazeGrid[0].length - 1) {
          targetColumn += 1;
        }
        break;
      default:
        break;
    }

    if (targetRow !== row || targetColumn !== column) {
      moveToCell(targetRow, targetColumn);
    }
  };

  const handleKeyDown = (event) => {
    const directions = new Set(['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft']);
    if (!directions.has(event.key)) {
      return;
    }
    event.preventDefault();
    tryMove(event.key);
  };

  const handleCellClick = (row, column) => {
    if (mazeGrid.length === 0) {
      return;
    }
    const rowDiff = row - currentCell.row;
    const colDiff = column - currentCell.column;
    if (Math.abs(rowDiff) + Math.abs(colDiff) !== 1) {
      return;
    }

    if (rowDiff === -1) {
      tryMove('ArrowUp');
    } else if (rowDiff === 1) {
      tryMove('ArrowDown');
    } else if (colDiff === -1) {
      tryMove('ArrowLeft');
    } else if (colDiff === 1) {
      tryMove('ArrowRight');
    }
  };

  const handleToggleControls = () => {
    setControlsOpen((prev) => !prev);
  };

  return (
    <div className="maze-page">
      {showConfetti && (
        <div className="confetti-overlay" aria-hidden="true">
          {confettiPieces.map((piece) => (
            <span
              key={`confetti-${piece.id}`}
              className="confetti-piece"
              style={{
                left: `${piece.left}%`,
                animationDelay: `${piece.delay}s`,
                animationDuration: `${piece.duration}s`,
                backgroundColor: `hsl(${piece.hue}deg 80% 60%)`,
              }}
            />
          ))}
        </div>
      )}

      <div className="maze-container container">
        <div className="header-nav">
          <Link to="/" className="home-link">
            ← Back to landing
          </Link>
        </div>

        <header className="maze-header">
          <div className="maze-header-row">
            <div className="maze-controls-anchor">
              <div className="maze-controls-trigger">
                <button
                  type="button"
                  className={`maze-controls-toggle ${controlsOpen ? 'is-active' : ''}`}
                  onClick={handleToggleControls}
                  aria-controls="maze-controls-panel"
                  aria-expanded={controlsOpen}
                >
                  <span className="hamburger" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </span>
                  <span className="toggle-label">Controls</span>
                </button>
                <div className={controlsPanelClassName} id="maze-controls-panel">
                  <section className="maze-controls">
                    <label>
                      Rows
                      <input
                        type="number"
                        min="2"
                        max="100"
                        value={rowsInput}
                        onChange={(event) => setRowsInput(event.target.value)}
                      />
                    </label>
                    <label>
                      Columns
                      <input
                        type="number"
                        min="2"
                        max="100"
                        value={colsInput}
                        onChange={(event) => setColsInput(event.target.value)}
                      />
                    </label>
                    <label>
                      Seed (optional)
                      <input
                        type="text"
                        value={seedInput}
                        onChange={(event) => setSeedInput(event.target.value)}
                        placeholder="Random each time"
                      />
                    </label>
                    <button type="button" onClick={handleGenerate}>
                      Generate Maze
                    </button>
                  </section>
                  {error && <p className="maze-error">{error}</p>}
                </div>
              </div>
            </div>
            <h1>Maze Generator</h1>
          </div>
        </header>

        <section className="maze-content">
          <section className="maze-output">
            <div className="maze-meta">
              <p>
                Size: {dimensions.rows} × {dimensions.cols}
              </p>
              <p>
                Seed:{' '}
                {seedInput.trim() === ''
                  ? 'Random'
                  : `"${seedInput.trim()}"`}
              </p>
            </div>
            <div
              className="maze-grid-wrapper"
              tabIndex={0}
              role="application"
              aria-label="Interactive maze grid"
              onKeyDown={handleKeyDown}
            >
              {mazeGrid.length > 0 ? (
                <table className="maze-grid">
                  <tbody>
                    {mazeGrid.map((row, rowIndex) => (
                      <tr key={`maze-row-${rowIndex}`}>
                        {row.map((cell) => (
                          <td
                            key={`maze-cell-${cell.row}-${cell.column}`}
                            className={`maze-cell${visitedCells.has(getCellKey(cell.row, cell.column)) ? ' is-visited' : ''}${
                              currentCell.row === cell.row && currentCell.column === cell.column
                                ? ' is-current'
                                : ''
                            }`}
                            style={{
                              '--wall-top': cell.walls.top ? 'var(--maze-wall)' : 'transparent',
                              '--wall-right': cell.walls.right ? 'var(--maze-wall)' : 'transparent',
                              '--wall-bottom': cell.walls.bottom ? 'var(--maze-wall)' : 'transparent',
                              '--wall-left': cell.walls.left ? 'var(--maze-wall)' : 'transparent',
                            }}
                            onClick={() => handleCellClick(cell.row, cell.column)}
                          />
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="maze-placeholder">Generate a maze to view it here.</p>
              )}
            </div>
          </section>
        </section>
      </div>
    </div>
  );
}

export default Maze;
