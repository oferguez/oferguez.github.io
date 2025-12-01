import test from 'node:test';
import assert from 'node:assert/strict';

import { MGDefaults, RectCell, RectRange, RectMaze } from './rectMaze.js';

const pathToCoords = (path) => path.map((cell) => `${cell.row},${cell.column}`);

const assertValidPath = (maze, path, rows, columns) => {
  assert.ok(Array.isArray(path) && path.length > 0, 'path must contain cells');
  assert.ok(path.length > rows + columns - 2, 'path should cover more than the Manhattan distance');
  assert.ok(path.length <= rows * columns, 'path should not exceed cell count');

  const first = path[0];
  const last = path[path.length - 1];
  assert.strictEqual(first.row, 0);
  assert.strictEqual(first.column, 0);
  assert.strictEqual(last.row, rows - 1);
  assert.strictEqual(last.column, columns - 1);

  for (let i = 1; i < path.length; i += 1) {
    assert.ok(
      maze.areNeighbours(path[i - 1], path[i]),
      `cells ${path[i - 1].key()} and ${path[i].key()} should be neighbours`
    );
  }
};

test('RectMaze generates deterministic output when seeded (3x3 baseline)', () => {
  const maze = new RectMaze(3, 3);
  maze.generate(12345);

  const solutionPath = pathToCoords(maze.solve());

  assert.deepStrictEqual(solutionPath, [
    '0,0',
    '1,0',
    '1,1',
    '1,2',
    '2,2',
  ]);

  const expectedDisplay = [
    '+-+-+-+',
    '| |   |',
    '+ +-+ +',
    '|     |',
    '+ + + +',
    '| | | |',
    '+-+-+-+',
  ].join('\n');

  assert.strictEqual(maze.display(), expectedDisplay);
});

test('RectMaze GenerateToFile scenarios mirror C# tests', () => {
  const cases = [
    { rows: 15, columns: 31, seed: 31415 },
    { rows: 15, columns: 31, seed: 2102018 },
  ];

  for (const { rows, columns, seed } of cases) {
    const maze = new RectMaze(rows, columns);
    maze.generate(seed);
    const path = maze.solve();
    assertValidPath(maze, path, rows, columns);

    path[0].payload = 'S';
    path[path.length - 1].payload = 'F';
    const labelledDisplay = maze.display();
    assert.ok(labelledDisplay.includes('S'));
    assert.ok(labelledDisplay.includes('F'));

    for (const cell of path) {
      cell.payload = '*';
    }
    const solvedDisplay = maze.display();
    const starCount = (solvedDisplay.match(/\*/g) ?? []).length;
    assert.strictEqual(starCount, path.length);
  }
});

test('RectMaze randomized generation produces valid paths for assorted seeds', () => {
  const cases = [
    { rows: 4, columns: 4 },
    { rows: 4, columns: 4, seed: 100 },
    { rows: 4, columns: 4, seed: 200 },
    { rows: 21, columns: 31, seed: 31415 },
    { rows: 21, columns: 31, seed: 2102018 },
    { rows: 30, columns: 60, seed: 300 },
  ];

  for (const { rows, columns, seed } of cases) {
    const maze = new RectMaze(rows, columns);
    maze.generate(seed);
    const path = maze.solve();
    assertValidPath(maze, path, rows, columns);
    assert.ok(maze.display().split('\n').length > 0, 'display should return ASCII map');
  }
});

test('RectMaze seeded randomness yields identical mazes for same seed', () => {
  const dims = [
    { rows: 1, columns: 2 },
    { rows: 2, columns: 1 },
    { rows: 2, columns: 2 },
    { rows: 5, columns: 10 },
    { rows: 10, columns: 5 },
    { rows: 10, columns: 10 },
    { rows: 20, columns: 20 },
  ];

  let seed = 31415;
  for (const { rows, columns } of dims) {
    const first = new RectMaze(rows, columns);
    first.generate(seed);
    const second = new RectMaze(rows, columns);
    second.generate(seed);

    assert.strictEqual(
      first.display(),
      second.display(),
      `seed ${seed} should produce identical layouts for ${rows}x${columns}`
    );
    seed <<= 1;
  }
});

test('RectMaze simple generation success and failure cases', () => {
  const successCases = [
    { rows: 3, columns: 4 },
    { rows: 10, columns: 10 },
    { rows: 3, columns: 10 },
    { rows: 10, columns: 3 },
    { rows: 1, columns: 2 },
    { rows: 2, columns: 1 },
  ];

  for (const { rows, columns } of successCases) {
    const maze = new RectMaze(rows, columns);
    maze.generate();
    const path = maze.solve();
    assertValidPath(maze, path, rows, columns);
  }

  const failureCases = [
    {
      rows: 1,
      columns: 1,
      stage: 'generate',
      message: /Maze dimension too small 1x1/,
    },
    {
      rows: 1,
      columns: 0,
      stage: 'constructor',
      message: /columns must be a positive integer/,
    },
  ];

  for (const { rows, columns, stage, message } of failureCases) {
    if (stage === 'constructor') {
      assert.throws(() => new RectMaze(rows, columns), message);
    } else {
      const maze = new RectMaze(rows, columns);
      assert.throws(() => maze.generate(), message);
    }
  }
});

test('RectMaze rejects generating a 1x1 maze', () => {
  const maze = new RectMaze(1, 1);
  assert.throws(() => maze.generate(), /Maze dimension too small 1x1/);
});

test('RectCell validations mirror MGDefaults bounds', () => {
  assert.throws(() => new RectCell(-1, 0), /row is out of range/);
  assert.throws(() => new RectCell(0, -1), /column is out of range/);
  assert.throws(
    () => new RectCell(MGDefaults.MAX_CELL + 1, 0),
    /row is out of range/
  );
  assert.throws(
    () => new RectCell(0, MGDefaults.MAX_CELL + 1),
    /column is out of range/
  );
});

const assertHorizontalSplit = (rectRange, ratio, left, right) => {
  assert.strictEqual(left.rows, rectRange.rows);
  assert.strictEqual(right.rows, rectRange.rows);
  assert.strictEqual(left.topLeft.row, rectRange.topLeft.row);
  assert.strictEqual(left.topLeft.column, rectRange.topLeft.column);
  assert.strictEqual(right.topLeft.row, rectRange.topLeft.row);
  assert.strictEqual(
    right.topLeft.column,
    rectRange.topLeft.column + left.columns
  );
  assert.strictEqual(left.columns + right.columns, rectRange.columns);
  const ratioFound = left.columns / rectRange.columns;
  const precision = 1 / rectRange.columns;
  assert.ok(
    Math.abs(ratioFound - ratio) <= precision,
    `ratio ${ratioFound} should be close to ${ratio} within ${precision}`
  );
};

const assertVerticalSplit = (rectRange, ratio, top, bottom) => {
  assert.strictEqual(top.columns, rectRange.columns);
  assert.strictEqual(bottom.columns, rectRange.columns);
  assert.strictEqual(top.topLeft.column, rectRange.topLeft.column);
  assert.strictEqual(bottom.topLeft.column, rectRange.topLeft.column);
  assert.strictEqual(top.topLeft.row, rectRange.topLeft.row);
  assert.strictEqual(
    bottom.topLeft.row,
    rectRange.topLeft.row + top.rows
  );
  assert.strictEqual(top.rows + bottom.rows, rectRange.rows);
  const ratioFound = top.rows / rectRange.rows;
  const precision = 1 / rectRange.rows;
  assert.ok(
    Math.abs(ratioFound - ratio) <= precision,
    `ratio ${ratioFound} should be close to ${ratio} within ${precision}`
  );
};

test('RectRange horizontal splits stay consistent with ratio and bounds', () => {
  const rectRange = new RectRange(new RectCell(0, 0), 10, 20);
  const ratios = [0.001, 0.5, 0.1, 0.11, 0.12345, 0.9, 0.9999];

  for (const ratio of ratios) {
    const { left, right } = rectRange.hSplit(ratio);
    assertHorizontalSplit(rectRange, ratio, left, right);
  }

  for (const invalid of [-0.1, 0.0, 1.0, 1.5]) {
    assert.throws(() => rectRange.hSplit(invalid), /ratio must be > 0 and < 1/);
  }

  const thinRange = new RectRange(new RectCell(0, 0), 2, 1);
  assert.throws(
    () => thinRange.hSplit(0.5),
    /Cannot horizontally split a range with < 2 columns/
  );
});

test('RectRange vertical splits stay consistent with ratio and bounds', () => {
  const rectRange = new RectRange(new RectCell(0, 0), 10, 20);
  const ratios = [0.001, 0.5, 0.1, 0.11, 0.12345, 0.9, 0.9999];

  for (const ratio of ratios) {
    const { top, bottom } = rectRange.vSplit(ratio);
    assertVerticalSplit(rectRange, ratio, top, bottom);
  }

  for (const invalid of [-0.1, 0.0, 1.0, 1.5]) {
    assert.throws(
      () => rectRange.vSplit(invalid),
      /ratio must be > 0 and < 1/
    );
  }

  const flatRange = new RectRange(new RectCell(0, 0), 1, 2);
  assert.throws(
    () => flatRange.vSplit(0.5),
    /Cannot vertically split a range with < 2 rows/
  );
});

test('RectMaze cell containment boundaries', () => {
  const maze = new RectMaze(20, 30);
  assert.ok(maze.contains(new RectCell(0, 0)));
  assert.ok(maze.contains(new RectCell(0, 29)));
  assert.ok(maze.contains(new RectCell(19, 0)));
  assert.ok(!maze.contains(new RectCell(20, 0)));
  assert.ok(!maze.contains(new RectCell(0, 30)));
  assert.ok(!maze.contains(new RectCell(20, 30)));
});

test('RectMaze range containment boundaries', () => {
  const maze = new RectMaze(20, 30);
  const range1 = new RectRange(new RectCell(5, 5), 10, 10);
  const range2 = new RectRange(new RectCell(5, 5), 15, 25);
  const range3 = new RectRange(new RectCell(5, 5), 16, 25);
  const range4 = new RectRange(new RectCell(5, 5), 15, 26);
  const range5 = new RectRange(new RectCell(5, 5), 0, 26);
  const range6 = new RectRange(new RectCell(5, 5), 15, 0);

  assert.ok(maze.containsRange(range1));
  assert.ok(maze.containsRange(range2));
  assert.ok(!maze.containsRange(range3));
  assert.ok(!maze.containsRange(range4));
  assert.ok(!maze.containsRange(range5));
  assert.ok(!maze.containsRange(range6));
});
