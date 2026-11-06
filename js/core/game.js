(function() {
  class GameEngine {
    constructor(uiController) {
      this.ui = uiController;
      this.grid = new window.Grid(4);
      this.score = 0;
      this.bestScore = 0;
      this.moveCount = 0;
      this.gameSeed = Date.now();
      this.undoState = null;
      this.isMoving = false;
      this.gameOverLeaderboardId = null;

      this.tilesContainer = document.getElementById('tiles-container');
      this.particles = new window.ParticleEngine();
      this.prng = new window.DeterministicRNG(this.gameSeed);

      this.timer = new window.GameTimer((formatted) => {
        if (this.ui.timerEl) this.ui.timerEl.textContent = formatted;
      });

      this.setupGameEvents();
      this.loadGameState();
      this.updateUndoButtonState();
    }

    setupGameEvents() {
      this.ui.btnRestart.addEventListener('click', () => this.confirmRestart());
      this.ui.retryOverlayBtn.addEventListener('click', () => this.restart());
      this.ui.btnUndo.addEventListener('click', () => this.undo());
      this.ui.resetBestBtn.addEventListener('click', () => {
        this.ui.showConfirmDialog({
          title: "Reset High Score?",
          message: "Are you sure you want to reset your high score back to 0?",
          confirmText: "Reset Score",
          onConfirm: () => {
            this.bestScore = 0;
            window.storage.setBestScore(0);
            this.ui.bestEl.textContent = '0';
            this.saveState();
            this.ui.triggerHaptic(this.ui.getMergeHaptic());
          }
        });
      });
    }

    confirmRestart() {
      if (this.ui.gameoverOverlay.classList.contains('active') || (this.score === 0 && this.moveCount === 0)) {
        this.restart();
        return;
      }
      this.ui.showConfirmDialog({
        title: "Restart Game?",
        message: "Are you sure you want to restart? Your current score and board progress will be lost.",
        confirmText: "Restart",
        onConfirm: () => {
          this.restart();
          this.ui.triggerHaptic(this.ui.getSlideHaptic());
        }
      });
    }

    spawnTile() {
      const vacant = this.grid.vacantCells();
      if (vacant.length > 0) {
        const isDeterministic = this.ui.isDeterministic();
        const { cell, val } = this.prng.getTileSpawn(this.grid.cells, this.moveCount, isDeterministic, vacant);
        const tile = new window.Tile(cell.r, cell.c, val);
        this.grid.set(cell.r, cell.c, tile);
        this.tilesContainer.appendChild(tile.element);
        setTimeout(() => tile.element.classList.remove('tile-new'), 150);
      }
    }

    updateUndoButtonState() {
      if (this.undoState) this.ui.btnUndo.removeAttribute('disabled');
      else this.ui.btnUndo.setAttribute('disabled', 'true');
    }

    restart() {
      this.clearDOMGrid();
      this.grid.clear();
      this.score = 0;
      this.moveCount = 0;
      this.gameSeed = Date.now();
      this.prng = new window.DeterministicRNG(this.gameSeed);
      this.undoState = null;
      this.gameOverLeaderboardId = null;
      this.updateUndoButtonState();

      this.timer.reset();
      this.timer.resume();
      this.ui.gameoverOverlay.classList.remove('active');
      this.particles.clear();

      this.spawnTile();
      this.spawnTile();
      this.saveState();
      this.updateScoreUI();
    }

    clearDOMGrid() {
      this.tilesContainer.querySelectorAll('.tile').forEach(t => t.remove());
    }

    renderBoardTiles(boardMatrix) {
      this.clearDOMGrid();
      this.grid.clear();
      let count = 0;
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
          const val = boardMatrix[r] ? boardMatrix[r][c] : null;
          if (val) {
            const t = new window.Tile(r, c, val);
            t.element.classList.add('no-transition');
            this.grid.set(r, c, t);
            this.tilesContainer.appendChild(t.element);
            count++;
            setTimeout(() => t.element.classList.remove('no-transition', 'tile-new'), 50);
          }
        }
      }
      return count;
    }

    undo() {
      if (!this.undoState || this.isMoving) return;
      this.ui.triggerHaptic(this.ui.getSlideHaptic());

      if (this.gameOverLeaderboardId && window.leaderboard) {
        window.leaderboard.deleteEntry(this.gameOverLeaderboardId);
        this.gameOverLeaderboardId = null;
        if (this.ui && this.ui.leaderboard) this.ui.leaderboard.render();
      }

      this.score = this.undoState.score;
      this.moveCount = this.undoState.moveCount;
      this.gameSeed = this.undoState.gameSeed || this.gameSeed;
      this.prng = new window.DeterministicRNG(this.gameSeed);

      if (this.undoState.timeSeconds !== undefined) {
        this.timer.setTimeSeconds(this.undoState.timeSeconds);
        this.timer.resume();
      }

      this.ui.gameoverOverlay.classList.remove('active');
      this.particles.clear();
      this.renderBoardTiles(this.undoState.board);

      this.undoState = null;
      this.updateUndoButtonState();
      this.saveState();
      this.updateScoreUI();
    }

    move(direction) {
      if (this.isMoving || !this.grid.hasMovesAvailable()) return;

      const snapshot = {
        score: this.score,
        moveCount: this.moveCount,
        gameSeed: this.gameSeed,
        timeSeconds: this.timer.getElapsedSeconds(),
        board: this.grid.serialize()
      };

      const vector = this.grid.getDirectionVector(direction);
      const traversals = this.grid.buildTraversals(vector);
      let moved = false;
      let scoreGained = 0;
      const burstPoints = [];

      this.grid.forEach(tile => { if (tile) tile.mergedThisTurn = false; });

      traversals.rows.forEach(r => {
        traversals.cols.forEach(c => {
          const tile = this.grid.get(r, c);
          if (!tile) return;

          const positions = this.grid.findFarthestPosition({ r, c }, vector);
          const next = positions.next;

          if (next && next.value === tile.value && !next.mergedThisTurn) {
            this.grid.set(r, c, null);
            tile.row = next.row;
            tile.col = next.col;
            tile.element.classList.add('tile-moving');
            tile.updatePosition();

            next.mergedThisTurn = true;
            const newValue = tile.value * 2;
            scoreGained += newValue;
            burstPoints.push({ r: next.row, c: next.col, val: newValue });

            const slideSpeed = this.ui.getSlideSpeed();
            setTimeout(() => {
              tile.destroy();
              next.updateValue(newValue);
            }, slideSpeed);
            moved = true;
          } else if (positions.farthest.r !== r || positions.farthest.c !== c) {
            this.grid.set(r, c, null);
            this.grid.set(positions.farthest.r, positions.farthest.c, tile);
            tile.row = positions.farthest.r;
            tile.col = positions.farthest.c;
            tile.element.classList.add('tile-moving');
            tile.updatePosition();
            moved = true;
          }
        });
      });

      if (moved) {
        this.isMoving = true;
        this.moveCount++;
        this.undoState = snapshot;
        this.updateUndoButtonState();
        this.ui.triggerHaptic(this.ui.getSlideHaptic());
        if (window.sound) window.sound.playSlide();

        const slideSpeed = this.ui.getSlideSpeed();
        setTimeout(() => {
          if (scoreGained > 0) {
            this.score += scoreGained;
            this.updateScoreUI(scoreGained);
            this.ui.triggerHaptic(this.ui.getMergeHaptic());
            if (window.sound) window.sound.playMerge();

            const style = getComputedStyle(document.body);
            burstPoints.forEach(pt => {
              const particleColor = style.getPropertyValue(`--t${pt.val}-particle`).trim() || 'var(--accent-color)';
              this.particles.spawnMergeBurst(pt.c, pt.r, particleColor);
            });
          }

          this.spawnTile();
          this.saveState();

          if (!this.grid.hasMovesAvailable()) {
            this.timer.pause();
            this.ui.triggerHaptic(20);
            if (window.sound) window.sound.playGameOver();
            this.gameOverLeaderboardId = window.leaderboard ? window.leaderboard.addEntry(this.score, this.timer.getElapsedSeconds()) : null;
            this.ui.finalScoreEl.textContent = this.score;
            if (this.ui.finalTimeEl) {
              this.ui.finalTimeEl.textContent = this.timer.formatTime(this.timer.getElapsedSeconds());
            }
            this.ui.gameoverOverlay.classList.add('active');
          }

          this.isMoving = false;
          this.grid.forEach(t => { if (t) t.element.classList.remove('tile-moving'); });
        }, slideSpeed + 10);
      }
    }

    updateScoreUI(increment = 0) {
      this.ui.scoreEl.textContent = this.score;
      if (this.score > this.bestScore) {
        this.bestScore = this.score;
        window.storage.setBestScore(this.bestScore);
      }
      this.ui.bestEl.textContent = this.bestScore;
      this.ui.showScoreIncrement(increment);
    }

    saveState() {
      const payload = {
        score: this.score,
        moveCount: this.moveCount,
        gameSeed: this.gameSeed,
        timeSeconds: this.timer.getElapsedSeconds(),
        currentTheme: this.ui.getCurrentTheme(),
        gameOverLeaderboardId: this.gameOverLeaderboardId,
        board: this.grid.serialize(),
        undoState: this.undoState
      };
      window.storage.setGameState(payload);
    }

    loadGameState() {
      this.ui.loadSettings();
      try {
        const data = window.storage.getGameState();
        if (data && data.board && Array.isArray(data.board)) {
          this.score = data.score || 0;
          this.moveCount = data.moveCount || 0;
          this.gameSeed = data.gameSeed || Date.now();
          this.gameOverLeaderboardId = data.gameOverLeaderboardId || null;
          this.prng = new window.DeterministicRNG(this.gameSeed);
          this.bestScore = window.storage.getBestScore();

          if (data.timeSeconds !== undefined) this.timer.setTimeSeconds(data.timeSeconds);
          this.timer.resume();

          const tileCount = this.renderBoardTiles(data.board);
          this.undoState = data.undoState || null;
          this.ui.setTheme(data.currentTheme || "neondark", () => this.saveState());
          this.updateScoreUI();
          if (tileCount >= 2) return;
        }
      } catch (e) {}

      this.ui.setTheme("neondark", () => this.saveState());
      this.restart();
    }
  }

  window.GameEngine = GameEngine;
})();