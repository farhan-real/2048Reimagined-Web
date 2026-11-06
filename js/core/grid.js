(function() {
  class Grid {
    constructor(size = 4) {
      this.size = size;
      this.cells = Array(size).fill(null).map(() => Array(size).fill(null));
    }

    clear() {
      for (let r = 0; r < this.size; r++) {
        for (let c = 0; c < this.size; c++) {
          this.cells[r][c] = null;
        }
      }
    }

    get(r, c) {
      if (r >= 0 && r < this.size && c >= 0 && c < this.size) {
        return this.cells[r][c];
      }
      return null;
    }

    set(r, c, tile) {
      if (r >= 0 && r < this.size && c >= 0 && c < this.size) {
        this.cells[r][c] = tile;
      }
    }

    vacantCells() {
      const vacant = [];
      for (let r = 0; r < this.size; r++) {
        for (let c = 0; c < this.size; c++) {
          if (this.cells[r][c] === null) {
            vacant.push({ r, c });
          }
        }
      }
      return vacant;
    }

    forEach(callback) {
      for (let r = 0; r < this.size; r++) {
        for (let c = 0; c < this.size; c++) {
          callback(this.cells[r][c], r, c);
        }
      }
    }

    getDirectionVector(direction) {
      const map = {
        up:    { x: 0,  y: -1 },
        down:  { x: 0,  y: 1  },
        left:  { x: -1, y: 0  },
        right: { x: 1,  y: 0  }
      };
      return map[direction] || { x: 0, y: 0 };
    }

    buildTraversals(vector) {
      const rows = [];
      const cols = [];
      for (let i = 0; i < this.size; i++) {
        rows.push(i);
        cols.push(i);
      }
      if (vector.x === 1) cols.reverse();
      if (vector.y === 1) rows.reverse();
      return { rows, cols };
    }

    findFarthestPosition(cell, vector) {
      let previous;
      let current = { r: cell.r, c: cell.c };
      do {
        previous = current;
        current = { r: previous.r + vector.y, c: previous.c + vector.x };
      } while (
        current.r >= 0 && current.r < this.size &&
        current.c >= 0 && current.c < this.size &&
        this.cells[current.r][current.c] === null
      );

      const nextTile = (current.r >= 0 && current.r < this.size && current.c >= 0 && current.c < this.size)
        ? this.cells[current.r][current.c]
        : null;

      return {
        farthest: previous,
        next: nextTile
      };
    }

    hasMovesAvailable() {
      if (this.vacantCells().length > 0) return true;
      for (let r = 0; r < this.size; r++) {
        for (let c = 0; c < this.size; c++) {
          const tile = this.cells[r][c];
          if (!tile) continue;
          if (r < this.size - 1 && this.cells[r + 1][c] && this.cells[r + 1][c].value === tile.value) return true;
          if (c < this.size - 1 && this.cells[r][c + 1] && this.cells[r][c + 1].value === tile.value) return true;
        }
      }
      return false;
    }

    serialize() {
      return this.cells.map(row => row.map(tile => (tile ? tile.value : null)));
    }
  }

  window.Grid = Grid;
})();