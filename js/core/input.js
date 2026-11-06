(function() {
  class InputHandler {
    constructor(gameEngine, uiController) {
      this.engine = gameEngine;
      this.ui = uiController;

      this.startX = 0;
      this.startY = 0;
      this.isMouseDown = false;
      this.swipeThreshold = 35;

      this.setupListeners();
      this.setupWebNavigation();
    }

    setupListeners() {
      window.addEventListener('keydown', (e) => this.handleKeyDown(e));

      // Touch events (phones / tablets)
      document.addEventListener('touchstart', (e) => {
        if (this.isInteractiveElement(e.target)) return;
        if (e.touches.length > 1) return;
        this.startX = e.touches[0].clientX;
        this.startY = e.touches[0].clientY;
      }, { passive: true });

      document.addEventListener('touchend', (e) => {
        if (this.isInteractiveElement(e.target)) return;
        if (this.isBlocked()) return;
        const dx = e.changedTouches[0].clientX - this.startX;
        const dy = e.changedTouches[0].clientY - this.startY;
        this.evalSwipe(dx, dy);
      }, { passive: true });

      // Mouse drag gestures (desktop)
      document.addEventListener('mousedown', (e) => {
        if (this.isInteractiveElement(e.target)) return;
        this.isMouseDown = true;
        this.startX = e.clientX;
        this.startY = e.clientY;
      });

      document.addEventListener('mouseup', (e) => {
        if (!this.isMouseDown) return;
        this.isMouseDown = false;
        if (this.isInteractiveElement(e.target) || this.isBlocked()) return;
        const dx = e.clientX - this.startX;
        const dy = e.clientY - this.startY;
        this.evalSwipe(dx, dy);
      });

      document.addEventListener('gesturestart', (e) => e.preventDefault());
    }

    evalSwipe(dx, dy) {
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);
      if (Math.max(absX, absY) > this.swipeThreshold) {
        if (absX > absY) {
          if (dx > 0) this.engine.move('right');
          else this.engine.move('left');
        } else {
          if (dy > 0) this.engine.move('down');
          else this.engine.move('up');
        }
      }
    }

    isInteractiveElement(target) {
      return !!target.closest('button, select, input, .overlay, .modal-card, .theme-dropdown-list, .slider, .tab-btn, .switch');
    }

    handleKeyDown(e) {
      if (e.code === 'Escape') {
        this.handleBack();
        return;
      }

      if (this.isBlocked()) return;

      const keys = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyW", "KeyS", "KeyA", "KeyD"];
      if (keys.includes(e.code)) {
        e.preventDefault();
      }

      switch (e.code) {
        case 'ArrowLeft':  case 'KeyA': this.engine.move('left');  break;
        case 'ArrowRight': case 'KeyD': this.engine.move('right'); break;
        case 'ArrowUp':    case 'KeyW': this.engine.move('up');    break;
        case 'ArrowDown':  case 'KeyS': this.engine.move('down');  break;
        case 'KeyZ': case 'KeyU':       this.engine.undo();        break;
        case 'KeyR':                    this.engine.restart();     break;
        case 'Space':
          e.preventDefault();
          if (window.musicEngine) window.musicEngine.togglePlay();
          break;
      }
    }

    setupWebNavigation() {
      window.handleAndroidBack = () => this.handleBack();
      window.addEventListener('popstate', () => {
        this.handleBack();
      });
    }

    isBlocked() {
      return this.engine.isMoving ||
             this.ui.gameoverOverlay.classList.contains('active') ||
             this.ui.settingsModal.classList.contains('active') ||
             this.ui.changelogModal.classList.contains('active') ||
             this.ui.creditsModal.classList.contains('active') ||
             this.ui.leaderboardModal.classList.contains('active') ||
             this.ui.musicModal.classList.contains('active') ||
             this.ui.trackSelectorModal.classList.contains('active') ||
             this.ui.confirmActionModal.classList.contains('active') ||
             this.ui.exitModal.classList.contains('active');
    }

    handleBack() {
      if (this.ui.confirmActionModal && this.ui.confirmActionModal.classList.contains('active')) {
        this.ui.closeModal(this.ui.confirmActionModal);
        return true;
      }
      if (this.ui.trackSelectorModal && this.ui.trackSelectorModal.classList.contains('active')) {
        this.ui.closeModal(this.ui.trackSelectorModal);
        return true;
      }
      if (this.ui.musicModal && this.ui.musicModal.classList.contains('active')) {
        this.ui.closeModal(this.ui.musicModal);
        return true;
      }
      if (this.ui.leaderboardModal && this.ui.leaderboardModal.classList.contains('active')) {
        this.ui.closeModal(this.ui.leaderboardModal);
        return true;
      }
      if (this.ui.changelogModal && this.ui.changelogModal.classList.contains('active')) {
        this.ui.closeModal(this.ui.changelogModal);
        return true;
      }
      if (this.ui.creditsModal && this.ui.creditsModal.classList.contains('active')) {
        this.ui.closeModal(this.ui.creditsModal);
        return true;
      }
      if (this.ui.settingsModal && this.ui.settingsModal.classList.contains('active')) {
        this.ui.closeModal(this.ui.settingsModal);
        return true;
      }
      if (this.ui.exitModal && this.ui.exitModal.classList.contains('active')) {
        this.ui.closeModal(this.ui.exitModal);
        return true;
      }
      if (this.ui.theme && this.ui.theme.themeDropdownWrapper && this.ui.theme.themeDropdownWrapper.classList.contains('active')) {
        this.ui.theme.themeDropdownWrapper.classList.remove('active');
        return true;
      }
      this.ui.handleExitRequest();
      return true;
    }
  }

  window.InputHandler = InputHandler;
})();