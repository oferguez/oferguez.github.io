import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { RectMaze } from '../utils/rectMaze.js';
import '../styles/Maze.css';

const DEFAULT_ROWS = 8;
const DEFAULT_COLS = 8;
const MIN_DIM = 4;
const MAX_DIM = 40;
const QUESTION_BANK = createQuestionBank();
const DEFAULT_CHALLENGE_INTERVAL = 4;


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
  challengeInterval = DEFAULT_CHALLENGE_INTERVAL,
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
  const [stepCount, setStepCount] = useState(0);
  const [activeQuestion, setActiveQuestion] = useState(null);
  const [questionCursor, setQuestionCursor] = useState(0);
  const [pendingMove, setPendingMove] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [questionError, setQuestionError] = useState('');
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
      setStepCount(0);
      setActiveQuestion(null);
      setPendingMove(null);
      setSelectedAnswer('');
      setQuestionError('');
      setQuestionCursor(0);
      setError('');
    } catch (err) {
      setMazeGrid([]);
      setVisitedCells(new Set());
      setHasWon(false);
      setShowConfetti(false);
      setStepCount(0);
      setActiveQuestion(null);
      setPendingMove(null);
      setSelectedAnswer('');
      setQuestionError('');
      setQuestionCursor(0);
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

  const completeMove = (row, column) => {
    moveToCell(row, column);
    setStepCount((prev) => prev + 1);
  };

  const tryMove = (direction) => {
    if (mazeGrid.length === 0 || activeQuestion) {
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
      const nextStep = stepCount + 1;
      if (challengeInterval > 0 && nextStep % challengeInterval === 0) {
        const question = QUESTION_BANK[questionCursor % QUESTION_BANK.length];
        setActiveQuestion(question);
        setQuestionCursor((prev) => prev + 1);
        setPendingMove({ row: targetRow, column: targetColumn });
        setSelectedAnswer('');
        setQuestionError('');
        return;
      }
      completeMove(targetRow, targetColumn);
    }
  };

  const handleKeyDown = (event) => {
    const directions = new Set(['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft']);
    if (activeQuestion || !directions.has(event.key)) {
      return;
    }
    event.preventDefault();
    tryMove(event.key);
  };

  const handleCellClick = (row, column) => {
    if (mazeGrid.length === 0 || activeQuestion) {
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

  const handleAnswerSubmit = () => {
    if (!activeQuestion || !pendingMove) {
      return;
    }
    if (selectedAnswer === '') {
      setQuestionError('Choose an answer to continue.');
      return;
    }
    const numericAnswer = Number(selectedAnswer);
    if (numericAnswer !== activeQuestion.answer) {
      setQuestionError('Not quite. Try again!');
      return;
    }
    setQuestionError('');
    const { row, column } = pendingMove;
    setActiveQuestion(null);
    setPendingMove(null);
    setSelectedAnswer('');
    completeMove(row, column);
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
            {activeQuestion && (
              <div className="maze-question-panel" aria-live="polite">
                <h3>Checkpoint challenge</h3>
                <p className="question-prompt">{activeQuestion.prompt}</p>
                <div className="question-options">
                  {activeQuestion.choices.map((choice) => (
                    <label
                      key={`${activeQuestion.id}-${choice}`}
                      className={`question-option ${
                        selectedAnswer === String(choice) ? 'is-selected' : ''
                      }`}
                    >
                      <input
                        type="radio"
                        name="maze-question"
                        value={choice}
                        checked={selectedAnswer === String(choice)}
                        onChange={(event) => setSelectedAnswer(event.target.value)}
                      />
                      <span>{choice}</span>
                    </label>
                  ))}
                </div>
                <button type="button" className="question-submit" onClick={handleAnswerSubmit}>
                  Submit answer
                </button>
                {questionError && <p className="question-error">{questionError}</p>}
              </div>
            )}
          </section>
        </section>
      </div>
    </div>
  );
}

export default Maze;

function createQuestionBank() {
  const additions = [];
  for (let a = 0; a <= 20; a += 1) {
    for (let b = 0; b <= 20; b += 1) {
      if (a + b <= 20) {
        additions.push({ a, b, op: '+' });
      }
    }
  }

  const subtractions = [];
  for (let a = 0; a <= 20; a += 1) {
    for (let b = 0; b <= a; b += 1) {
      const result = a - b;
      if (result >= 0 && result <= 20) {
        subtractions.push({ a, b, op: '-' });
      }
    }
  }

  const additionSet = shuffle(additions).slice(0, 20);
  const subtractionSet = shuffle(subtractions).slice(0, 20);
  return [...additionSet, ...subtractionSet].map((item, index) => createQuestion(item, index));
}

function createQuestion({ a, b, op }, index) {
  const answer = op === '+' ? a + b : a - b;
  const operatorSymbol = op === '+' ? '+' : '−';
  const prompt = `${a} ${operatorSymbol} ${b} = ?`;
  const distractors = new Set();
  while (distractors.size < 3) {
    const candidate = Math.floor(Math.random() * 21);
    if (candidate !== answer) {
      distractors.add(candidate);
    }
  }
  const choices = shuffle([answer, ...distractors]);
  return {
    id: `q-${index}`,
    prompt,
    answer,
    choices,
  };
}

function shuffle(list) {
  const array = [...list];
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
