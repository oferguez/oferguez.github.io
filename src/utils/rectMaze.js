/**
 * JavaScript port of the RectMaze algorithm from MazeGenerator.cs.
 * Exposes RectCell, RectRange, and RectMaze so React components can
 * construct a maze grid and call generate(randomSeed) to carve paths.
 */
import seedrandom from "seedrandom";

const MGDefaults = {
  MAX_CELL: 10000,
};

class RectCell {
  constructor(row, column) {
    if (!Number.isInteger(row) || row < 0 || row > MGDefaults.MAX_CELL) {
      throw new RangeError("row is out of range");
    }
    if (!Number.isInteger(column) || column < 0 || column > MGDefaults.MAX_CELL) {
      throw new RangeError("column is out of range");
    }
    this.row = row;
    this.column = column;
    this.cameFrom = null;
    this.payload = " ";
  }

  key() {
    return `${this.row},${this.column}`;
  }
}

class RectRange {
  constructor(topLeft, rows, columns) {
    this.topLeft = topLeft;
    this.rows = rows;
    this.columns = columns;
  }

  get isEmpty() {
    return this.rows <= 0 || this.columns <= 0;
  }

  vSplit(ratio) {
    if (ratio <= 0 || ratio >= 1) {
      throw new RangeError("ratio must be > 0 and < 1");
    }
    if (this.rows < 2) {
      throw new Error("Cannot vertically split a range with < 2 rows");
    }

    const rowsOfFirstPart = Math.max(1, Math.floor(ratio * this.rows));
    const top = new RectRange(this.topLeft, rowsOfFirstPart, this.columns);
    const bottomTopLeft = new RectCell(
      this.topLeft.row + rowsOfFirstPart,
      this.topLeft.column
    );
    const bottom = new RectRange(
      bottomTopLeft,
      this.rows - rowsOfFirstPart,
      this.columns
    );
    return { top, bottom };
  }

  hSplit(ratio) {
    if (ratio <= 0 || ratio >= 1) {
      throw new RangeError("ratio must be > 0 and < 1");
    }
    if (this.columns < 2) {
      throw new Error("Cannot horizontally split a range with < 2 columns");
    }

    const colsOfFirstPart = Math.max(1, Math.floor(ratio * this.columns));
    const left = new RectRange(this.topLeft, this.rows, colsOfFirstPart);
    const topLeftRight = new RectCell(
      this.topLeft.row,
      this.topLeft.column + colsOfFirstPart
    );
    const right = new RectRange(
      topLeftRight,
      this.rows,
      this.columns - colsOfFirstPart
    );
    return { left, right };
  }
}

class SeededRandom {
  constructor(seed = null) {
    this._rng = seed ? seedrandom(String(seed)) : seedrandom();
  }

  nextDouble() {
    return this._rng();
  }

  nextInt(minInclusive, maxExclusive) {
    const span = maxExclusive - minInclusive;
    if (span <= 0) {
      throw new RangeError("maxExclusive must be greater than minInclusive");
    }
    return minInclusive + Math.floor(this.nextDouble() * span);
  }
}

class RectMaze {
  constructor(rows, columns) {
    if (!Number.isInteger(rows) || rows <= 0) {
      throw new RangeError("rows must be a positive integer");
    }
    if (!Number.isInteger(columns) || columns <= 0) {
      throw new RangeError("columns must be a positive integer");
    }

    this._rows = rows;
    this._columns = columns;
    this._cells = Array.from({ length: rows + 1 }, (_, r) =>
      Array.from({ length: columns + 1 }, (_, c) => new RectCell(r, c))
    );
    this._connected = new Map();
    this._randomiser = null;
  }

  _key(cell1, cell2) {
    return `${cell1.key()}|${cell2.key()}`;
  }

  connect(cell1, cell2) {
    if (!this.contains(cell1) || !this.contains(cell2) || cell1 === cell2) {
      throw new Error(`Cannot connect ${cell1} and ${cell2}`);
    }
    this._connected.set(this._key(cell1, cell2), true);
    this._connected.set(this._key(cell2, cell1), true);
  }

  disconnect(cell1, cell2) {
    if (!this.contains(cell1) || !this.contains(cell2)) {
      return false;
    }
    if (cell1 === cell2) {
      return false;
    }
    this._connected.delete(this._key(cell1, cell2));
    this._connected.delete(this._key(cell2, cell1));
    return true;
  }

  contains(cell) {
    if (!(cell instanceof RectCell)) {
      return false;
    }
    return (
      cell.row >= 0 &&
      cell.row < this._rows &&
      cell.column >= 0 &&
      cell.column < this._columns
    );
  }

  containsRange(rectRange) {
    if (!this.contains(rectRange.topLeft)) {
      return false;
    }
    return (
      rectRange.rows > 0 &&
      rectRange.columns > 0 &&
      rectRange.topLeft.row + rectRange.rows <= this._rows &&
      rectRange.topLeft.column + rectRange.columns <= this._columns
    );
  }

  areNeighbours(cell1, cell2) {
    if (!this.contains(cell1) || !this.contains(cell2)) {
      return false;
    }
    const sameRow =
      cell1.row === cell2.row && Math.abs(cell1.column - cell2.column) === 1;
    const sameCol =
      cell1.column === cell2.column && Math.abs(cell1.row - cell2.row) === 1;
    return sameRow || sameCol;
  }

  areConnected(cell1, cell2) {
    if (!this.areNeighbours(cell1, cell2)) {
      return false;
    }
    return this._connected.get(this._key(cell1, cell2)) || false;
  }

  _nextDoubleInRange(min, max) {
    const value =
      this._randomiser === null
        ? Math.random()
        : this._randomiser.nextDouble();
    return min + value * (max - min);
  }

  _recursiveGenerate(rectRange) {
    if (rectRange.columns <= 1 && rectRange.rows <= 1) {
      return;
    }

    if (rectRange.rows > rectRange.columns) {
      const splitFactor =
        this._randomiser === null
          ? 0.5
          : this._nextDoubleInRange(
              1 / rectRange.rows,
              1 - 1 / rectRange.rows
            );
      const { top, bottom } = rectRange.vSplit(splitFactor);
      const bridgeColumn =
        this._randomiser === null
          ? Math.floor(rectRange.columns / 2)
          : this._randomiser.nextInt(0, rectRange.columns);

      const cell1 = new RectCell(
        top.topLeft.row + top.rows - 1,
        top.topLeft.column + bridgeColumn
      );
      const cell2 = new RectCell(
        bottom.topLeft.row,
        bottom.topLeft.column + bridgeColumn
      );
      this.connect(cell1, cell2);
      this._recursiveGenerate(top);
      this._recursiveGenerate(bottom);
    } else {
      const splitFactor =
        this._randomiser === null
          ? 0.5
          : this._nextDoubleInRange(
              1 / rectRange.columns,
              1 - 1 / rectRange.columns
            );
      const { left, right } = rectRange.hSplit(splitFactor);
      const bridgeRow =
        this._randomiser === null
          ? Math.floor(rectRange.rows / 2)
          : this._randomiser.nextInt(0, rectRange.rows);
      const cell1 = new RectCell(
        left.topLeft.row + bridgeRow,
        left.topLeft.column + left.columns - 1
      );
      const cell2 = new RectCell(
        right.topLeft.row + bridgeRow,
        right.topLeft.column
      );
      this.connect(cell1, cell2);
      this._recursiveGenerate(left);
      this._recursiveGenerate(right);
    }
  }

  generate(randomSeed = null) {
    if (this._rows <= 1 && this._columns <= 1) {
      throw new Error(`Maze dimension too small ${this._rows}x${this._columns}`);
    }

    this._connected.clear();
    this._randomiser =
      randomSeed === null || randomSeed === undefined
        ? new SeededRandom()
        : new SeededRandom(randomSeed);

    for (let r = 0; r < this._cells.length; r += 1) {
      for (let c = 0; c < this._cells[r].length; c += 1) {
        this._cells[r][c].cameFrom = null;
      }
    }

    this._recursiveGenerate(new RectRange(new RectCell(0, 0), this._rows, this._columns));
  }

  solve() {
    const result = [];
    const start = this._cells[0][0];
    const finish = this._cells[this._rows - 1][this._columns - 1];
    const visited = new Set();
    const queue = [start];

    while (queue.length > 0) {
      const visiting = queue.shift();
      if (!visiting || visited.has(visiting.key())) {
        continue;
      }
      visited.add(visiting.key());
      if (visiting === finish) {
        break;
      }

      const right = this._cells[visiting.row][visiting.column + 1];
      const down = this._cells[visiting.row + 1][visiting.column];
      const left =
        visiting.column > 0
          ? this._cells[visiting.row][visiting.column - 1]
          : null;
      const up =
        visiting.row > 0
          ? this._cells[visiting.row - 1][visiting.column]
          : null;

      if (right && this.areConnected(visiting, right) && !visited.has(right.key())) {
        right.cameFrom = visiting;
        queue.push(right);
      }
      if (down && this.areConnected(visiting, down) && !visited.has(down.key())) {
        down.cameFrom = visiting;
        queue.push(down);
      }
      if (left && this.areConnected(visiting, left) && !visited.has(left.key())) {
        left.cameFrom = visiting;
        queue.push(left);
      }
      if (up && this.areConnected(visiting, up) && !visited.has(up.key())) {
        up.cameFrom = visiting;
        queue.push(up);
      }
    }

    for (let c = finish; c != null; c = c.cameFrom) {
      result.unshift(c);
    }
    return result;
  }

  display() {
    const mazeMap = Array.from({ length: 2 * this._rows + 1 }, () =>
      Array.from({ length: 2 * this._columns + 1 }, () => " ")
    );

    for (let r = 0; r < this._rows; r += 1) {
      for (let c = 0; c < this._columns; c += 1) {
        const rIdx = 2 * r + 1;
        const cIdx = 2 * c + 1;
        mazeMap[rIdx][cIdx] = " ";
        mazeMap[rIdx][cIdx + 1] = "|";
        mazeMap[rIdx + 1][cIdx] = "-";
        mazeMap[rIdx + 1][cIdx + 1] = "+";
      }
    }

    for (let c = 0; c < this._columns; c += 1) {
      mazeMap[0][2 * c + 1] = "-";
      mazeMap[0][2 * c + 2] = "+";
      mazeMap[2 * this._rows][2 * c + 1] = "-";
      mazeMap[2 * this._rows][2 * c + 2] = "+";
    }

    for (let r = 0; r < this._rows; r += 1) {
      mazeMap[2 * r + 1][0] = "|";
      mazeMap[2 * r + 2][0] = "+";
      mazeMap[2 * r + 1][2 * this._columns] = "|";
      mazeMap[2 * r + 2][2 * this._columns] = "+";
    }

    mazeMap[0][0] = "+";
    mazeMap[2 * this._rows][0] = "+";
    mazeMap[0][2 * this._columns] = "+";
    mazeMap[2 * this._rows][2 * this._columns] = "+";

    for (let r = 0; r < this._rows; r += 1) {
      for (let c = 0; c < this._columns; c += 1) {
        const cell = this._cells[r][c];
        const connectedRight =
          c < this._columns - 1 && this.areConnected(cell, this._cells[r][c + 1]);
        const connectedDown =
          r < this._rows - 1 && this.areConnected(cell, this._cells[r + 1][c]);

        mazeMap[2 * r + 1][2 * c + 1] = cell.payload;
        if (connectedRight) {
          mazeMap[2 * r + 1][2 * c + 2] = " ";
        }
        if (connectedDown) {
          mazeMap[2 * r + 2][2 * c + 1] = " ";
        }
      }
    }

    return mazeMap.map((row) => row.join("")).join("\n");
  }
  
  toCellGrid() {
    return Array.from({ length: this._rows }, (_, r) =>
      Array.from({ length: this._columns }, (_, c) => {
        const cell = this._cells[r][c];
        const topCell = r > 0 ? this._cells[r - 1][c] : null;
        const rightCell = c < this._columns - 1 ? this._cells[r][c + 1] : null;
        const bottomCell = r < this._rows - 1 ? this._cells[r + 1][c] : null;
        const leftCell = c > 0 ? this._cells[r][c - 1] : null;
        return {
          row: cell.row,
          column: cell.column,
          payload: cell.payload,
          walls: {
            top: topCell === null || !this.areConnected(cell, topCell),
            right: rightCell === null || !this.areConnected(cell, rightCell),
            bottom: bottomCell === null || !this.areConnected(cell, bottomCell),
            left: leftCell === null || !this.areConnected(cell, leftCell),
          },
        };
      })
    );
  }

}

export { MGDefaults, RectCell, RectRange, RectMaze };
