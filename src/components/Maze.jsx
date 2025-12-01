import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { RectMaze } from '../utils/rectMaze.js';
import '../styles/Maze.css';

const DEFAULT_ROWS = 10;
const DEFAULT_COLS = 10;
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
      setMazeGrid(maze.toCellGrid());
      setError('');
    } catch (err) {
      setMazeGrid([]);
      setError(err.message || 'Failed to generate maze');
    }
  };

  useEffect(() => {
    handleGenerate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const controlsPanelClassName = `maze-controls-panel ${controlsOpen ? 'is-open' : ''}`;

  const handleToggleControls = () => {
    setControlsOpen((prev) => !prev);
  };

  return (
    <div className="maze-page">
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
            <div className="maze-grid-wrapper" aria-live="polite">
              {mazeGrid.length > 0 ? (
                <table className="maze-grid">
                  <tbody>
                    {mazeGrid.map((row, rowIndex) => (
                      <tr key={`maze-row-${rowIndex}`}>
                        {row.map((cell) => (
                          <td
                            key={`maze-cell-${cell.row}-${cell.column}`}
                            className="maze-cell"
                            style={{
                              '--wall-top': cell.walls.top ? 'var(--maze-wall)' : 'transparent',
                              '--wall-right': cell.walls.right ? 'var(--maze-wall)' : 'transparent',
                              '--wall-bottom': cell.walls.bottom ? 'var(--maze-wall)' : 'transparent',
                              '--wall-left': cell.walls.left ? 'var(--maze-wall)' : 'transparent',
                            }}
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
