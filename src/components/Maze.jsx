import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { RectMaze } from '../utils/rectMaze.js';
import { createQuestionBank } from '../utils/questionBank.js';
import '../styles/Maze.css';

const DEFAULT_ROWS = 10;
const DEFAULT_COLS = 10;
const MIN_DIM = 4;
const MAX_DIM = 40;
const QUESTION_BANK = createQuestionBank();
const DEFAULT_CHALLENGE_INTERVAL_MIN = 3;
const DEFAULT_CHALLENGE_INTERVAL_MAX = 5;
const SQUIRREL_IMAGES = ['/squirrel_1.webp', '/squirrel_2.webp', '/squirrel_3.webp', '/squirrel_4.webp', '/squirrel_5.webp', '/squirrel_6.webp', '/squirrel_7.webp', '/squirrel_8.webp'];
const CELEBRATION_BANNER_TEXT = 'Well Done Shira!';
const FIREWORK_COLORS = ['#f472b6', '#f97316', '#22d3ee', '#a855f7', '#84cc16'];
const STOP_TITLES = [
  'Maths pit stop',
  'Brain break (math)',
  'Maths snack break',
  'Number pit lane',
  'Maths stretch',
  'Maths breather',
  'Maths cool-down',
  'Maths refuel',
  'Maths halftime',
  'Maths pit crew',
];
const TRY_AGAIN_MESSAGES = [
  'Nice try, Shira!',
  'Almost there, Shira!',
  'Good effort, Shira!',
  'Great hustle, Shira!',
  'Keep going, Shira!',
  'Give it another go.',
  'Try once more, Shira.',
  'One more try, Shira!',
  'You’ve almost got this, Shira!',
  'Another shot, Shira!',
];


const clampDimension = (value, fallback) => {
  let parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    parsed = fallback;
  }
  return Math.max(MIN_DIM, Math.min(parsed, MAX_DIM));
};

const clampIntervalValue = (value, fallback) => {
  let parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    parsed = fallback;
  }
  return Math.max(1, parsed);
};

function Maze({
  initialRows = DEFAULT_ROWS,
  initialCols = DEFAULT_COLS,
  initialSeed = '',
}) {
  const [rowsInput, setRowsInput] = useState(String(initialRows));
  const [colsInput, setColsInput] = useState(String(initialCols));
  const [seedInput, setSeedInput] = useState(initialSeed);
  const [minIntervalInput, setMinIntervalInput] = useState(String(DEFAULT_CHALLENGE_INTERVAL_MIN));
  const [maxIntervalInput, setMaxIntervalInput] = useState(String(DEFAULT_CHALLENGE_INTERVAL_MAX));
  const [mazeGrid, setMazeGrid] = useState([]);
  const [error, setError] = useState('');
  const [controlsOpen, setControlsOpen] = useState(false);
  const [currentCell, setCurrentCell] = useState({ row: 0, column: 0 });
  const [visitedCells, setVisitedCells] = useState(() => new Set(['0-0']));
  const [hasWon, setHasWon] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [confettiPieces, setConfettiPieces] = useState([]);
  const [challengeInterval, setChallengeInterval] = useState(DEFAULT_CHALLENGE_INTERVAL_MIN);
  const [stepCount, setStepCount] = useState(0);
  const [activeQuestion, setActiveQuestion] = useState(null);
  const [questionCursor, setQuestionCursor] = useState(0);
  const [questionTitle, setQuestionTitle] = useState(STOP_TITLES[0]);
  const [pendingMove, setPendingMove] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [questionError, setQuestionError] = useState('');
  const [isShaking, setIsShaking] = useState(false);
  const [squirrelImage, setSquirrelImage] = useState(SQUIRREL_IMAGES[0] ?? '');
  const [fireworks, setFireworks] = useState([]);
  const confettiTimeoutRef = useRef(null);
  const badMoveTimeoutRef = useRef(null);
  const fireworksTimeoutRef = useRef(null);
  const controlsPanelRef = useRef(null);
  const controlsToggleRef = useRef(null);

  const dimensions = useMemo(() => {
    return {
      rows: clampDimension(rowsInput, initialRows),
      cols: clampDimension(colsInput, initialCols),
    };
  }, [rowsInput, colsInput, initialRows, initialCols]);

  const handleGenerate = () => {
    try {
      const minInterval = clampIntervalValue(minIntervalInput, DEFAULT_CHALLENGE_INTERVAL_MIN);
      const maxInterval = Math.max(minInterval, clampIntervalValue(maxIntervalInput, DEFAULT_CHALLENGE_INTERVAL_MAX));
      const intervalSpan = maxInterval - minInterval + 1;
      const nextInterval = minInterval + Math.floor(Math.random() * intervalSpan);

      const maze = new RectMaze(dimensions.rows, dimensions.cols);
      const seed = seedInput.trim();
      maze.generate(seed === '' ? null : seed);
      const grid = maze.toCellGrid();
      setMazeGrid(grid);
      setChallengeInterval(nextInterval);
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
      setChallengeInterval(DEFAULT_CHALLENGE_INTERVAL_MIN);
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

  const triggerBadMove = () => {
    if (badMoveTimeoutRef.current) {
      clearTimeout(badMoveTimeoutRef.current);
    }
    setIsShaking(true);
    badMoveTimeoutRef.current = setTimeout(() => {
      setIsShaking(false);
    }, 500);
  };

  const triggerConfetti = () => {
    if (SQUIRREL_IMAGES.length > 0) {
      const nextIndex = Math.floor(Math.random() * SQUIRREL_IMAGES.length);
      setSquirrelImage(SQUIRREL_IMAGES[nextIndex]);
    }
    setShowConfetti(true);
    setConfettiPieces(createConfettiPieces());
    if (confettiTimeoutRef.current) {
      clearTimeout(confettiTimeoutRef.current);
    }
    confettiTimeoutRef.current = setTimeout(() => {
      setShowConfetti(false);
    }, 6000);
  };

  const triggerFireworks = (onComplete) => {
    const count = 35 + Math.floor( Math.random() * 20);
    const burst = Array.from({ length: count }, (_, index) => {
      const angle = Math.random() * Math.PI * 2;
      const distance = 80 + Math.random() * 80;
      const size = 5 + Math.random() * 15;
      const delay = Math.random() * 0.2;
      const color = FIREWORK_COLORS[index % FIREWORK_COLORS.length];
      const length = 0.4 + Math.random() * 0.3
      return {
        id: `fw-${index}-${Date.now()}`,
        fx: Math.cos(angle) * distance,
        fy: Math.sin(angle) * distance,
        size,
        delay,
        color,
      };
    });
    setFireworks(burst);
    if (fireworksTimeoutRef.current) {
      clearTimeout(fireworksTimeoutRef.current);
    }
    fireworksTimeoutRef.current = setTimeout(() => {
      setFireworks([]);
      fireworksTimeoutRef.current = null;
      if (typeof onComplete === 'function') {
        onComplete();
      }
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (confettiTimeoutRef.current) {
        clearTimeout(confettiTimeoutRef.current);
      }
      if (badMoveTimeoutRef.current) {
        clearTimeout(badMoveTimeoutRef.current);
      }
      if (fireworksTimeoutRef.current) {
        clearTimeout(fireworksTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleClickAway = (event) => {
      if (!controlsOpen) {
        return;
      }
      const toggleEl = controlsToggleRef.current;
      const panelEl = controlsPanelRef.current;
      if (toggleEl?.contains(event.target) || panelEl?.contains(event.target)) {
        return;
      }
      setControlsOpen(false);
    };
    document.addEventListener('mousedown', handleClickAway);
    document.addEventListener('touchstart', handleClickAway);
    return () => {
      document.removeEventListener('mousedown', handleClickAway);
      document.removeEventListener('touchstart', handleClickAway);
    };
  }, [controlsOpen]);

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

  const tryMove = (direction, moves = 1) => {
    if (mazeGrid.length === 0 || activeQuestion) {
      return;
    }
    let { row, column } = currentCell;
    let visited = [];

    while (moves >= 1) {
      let cell = mazeGrid[row]?.[column];
      visited.push(cell);
      if (!cell) {
        triggerBadMove()
        return;
      }
      let moved = false;
      switch (direction) {
        case 'ArrowUp':
          if (!cell.walls.top && row > 0) {
            row -= 1;
            moved = true;
          }
          break;
        case 'ArrowDown':
          if (!cell.walls.bottom && row < mazeGrid.length - 1) {
            row += 1;
            moved = true;
          }
          break;
        case 'ArrowLeft':
          if (!cell.walls.left && column > 0) {
            column -= 1;
            moved = true;
          }
          break;
        case 'ArrowRight':
          if (!cell.walls.right && column < mazeGrid[0].length - 1) {
            column += 1;
            moved = true;
          }
          break;
        default:
          break;
      }
      if (!moved) {
        triggerBadMove();
        return;
      }
      moves -= 1;
    }

    for (const c of visited) {
      markVisited(c.row, c.column);
    }

    const nextStep = stepCount + 1;
    if (challengeInterval > 0 && nextStep % challengeInterval === 0) {
      const question = QUESTION_BANK[questionCursor % QUESTION_BANK.length];
      const nextTitle = STOP_TITLES[Math.floor(Math.random() * STOP_TITLES.length)];
      setQuestionTitle(nextTitle);
      setActiveQuestion(question);
      setQuestionCursor((prev) => prev + 1);
      setPendingMove({ row, column });
      setSelectedAnswer('');
      setQuestionError('');
      return;
    }
    completeMove(row, column);

  };

  const handleKeyDown = (event) => {
    console.log('handleKeyDown', event);
    const directions = new Set(['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft']);
    if (activeQuestion || !directions.has(event.key)) {
      return;
    }
    event.preventDefault();
    tryMove(event.key, 1);
  };

  const handleCellClick = (row, column) => {
    console.log('handleCellClick', row, column);
    if (mazeGrid.length === 0 || activeQuestion) {
      return;
    }
    const rowDiff = row - currentCell.row;
    const colDiff = column - currentCell.column;

    if (rowDiff === 0) {
      if (colDiff > 0) {
        tryMove('ArrowRight', colDiff);
      } else if (colDiff < 0) {
        tryMove('ArrowLeft', -colDiff)
      } else {
        triggerBadMove();
      }
    } else if (colDiff === 0) {
      if (rowDiff > 0) {
        tryMove('ArrowDown', rowDiff)
      } else if (rowDiff < 0) {
        tryMove('ArrowUp', -rowDiff)
      } else { // just for completenes but it shouldnt really get here 
        triggerBadMove();
      }
    } else {
      triggerBadMove();
    }
  };

  const handleToggleControls = () => {
    setControlsOpen((prev) => !prev);
  };

  const handleAnswerSubmit = () => {
    if (!activeQuestion || !pendingMove || fireworks.length > 0) {
      return;
    }
    if (selectedAnswer === '') {
      setQuestionError('Choose an answer to continue.');
      return;
    }
    const numericAnswer = Number(selectedAnswer);
    if (numericAnswer !== activeQuestion.answer) {
      const messageIndex = Math.floor(Math.random() * TRY_AGAIN_MESSAGES.length);
      setQuestionError(TRY_AGAIN_MESSAGES[messageIndex]);
      return;
    }
    setQuestionError('Well done, Shira!');
    const { row, column } = pendingMove;
    triggerFireworks(() => {
      setActiveQuestion(null);
      setPendingMove(null);
      setSelectedAnswer('');
      completeMove(row, column);
    });
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
          {squirrelImage && (
            <img
              src={squirrelImage}
              alt="Dancing squirrel"
              className="confetti-squirrel"
            />
          )}
          <div className="confetti-banner">
            <span>{CELEBRATION_BANNER_TEXT}</span>
          </div>
        </div>
      )}

      <div className="maze-container container">

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
                  ref={controlsToggleRef}
                >
                  <span className="hamburger" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </span>
                  <span className="toggle-label">Controls</span>
                </button>
                <div className={controlsPanelClassName} id="maze-controls-panel" ref={controlsPanelRef}>
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
                    <label className="question-rate">
                      Questions Rate
                    </label>
                    <label>
                      Min
                      <input
                        type="number"
                        min="1"
                        value={minIntervalInput}
                        onChange={(event) => setMinIntervalInput(event.target.value)}
                      />
                    </label>
                    <label>
                      Max
                      <input
                        type="number"
                        min={minIntervalInput || 1}
                        value={maxIntervalInput}
                        onChange={(event) => setMaxIntervalInput(event.target.value)}
                      />
                    </label>
                  </section>
                  {error && <p className="maze-error">{error}</p>}
                </div>
              </div>
            </div>
            <h1 className="maze-title">Shira's Mazes</h1>
            <Link to="/" className="home-link">
              <span className='home-link-label'>Back to landing</span>
              <span className='home-link-label--short'>Landing</span>
            </Link>
          </div>
        </header>

        <section className="maze-content">
          <section className={`maze-output ${isShaking ? 'is-shaking' : ''}`}>
            <div className="maze-meta">
              <p>
                Size: {dimensions.rows} × {dimensions.cols}
              </p>
              <button type="button" className="generate-button" onClick={handleGenerate}>
                Generate Maze
              </button>
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
                            className={`maze-cell${visitedCells.has(getCellKey(cell.row, cell.column)) ? ' is-visited' : ''}${currentCell.row === cell.row && currentCell.column === cell.column
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
              <div
                className="maze-question-overlay"
                role="dialog"
              aria-modal="true"
              aria-live="polite"
              aria-label="Checkpoint challenge"
            >
              <div className="maze-question-panel">
                {fireworks.length > 0 && (
                  <div className="question-fireworks" aria-hidden="true">
                    {fireworks.map((spark) => (
                      <span
                        key={spark.id}
                        className="question-firework"
                        style={{
                          '--fx': `${spark.fx}px`,
                          '--fy': `${spark.fy}px`,
                          animationDelay: `${spark.delay}s`,
                          width: `${spark.size}px`,
                          height: `${spark.size}px`,
                          backgroundColor: spark.color,
                        }}
                      />
                    ))}
                  </div>
                )}
                <h3>{questionTitle}</h3>
                <p className="question-prompt">{activeQuestion.prompt}</p>
                <div className="question-options">
                    {activeQuestion.choices.map((choice) => (
                      <label
                        key={`${activeQuestion.id}-${choice}`}
                        className={`question-option ${selectedAnswer === String(choice) ? 'is-selected' : ''
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
              </div>
            )}
          </section>
        </section>
      </div>
    </div>
  );
}

export default Maze;
