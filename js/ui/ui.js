(function() {
  class UIController {
    constructor() {
      this.initDOMElements();

      // UI Submodules
      this.info = new window.InfoUI(this);
      this.theme = new window.ThemeUI(this);
      this.settings = new window.SettingsUI(this);
      this.leaderboard = new window.LeaderboardUI(this);
      this.music = new window.MusicUI(this);

      this.setupGlobalModalEvents();

      if (window.musicEngine) {
        this.music.updateTrackInfo(window.musicEngine.getCurrentTrack());
        this.music.syncAllMusicControls();
      }
    }

    initDOMElements() {
      this.scoreEl = document.getElementById('score');
      this.bestEl = document.getElementById('best-score');
      this.timerEl = document.getElementById('game-timer');
      this.scoreContainer = document.getElementById('score-card-container');
      this.finalScoreEl = document.getElementById('final-score');
      this.finalTimeEl = document.getElementById('final-time');
      this.gameoverOverlay = document.getElementById('gameover-overlay');

      this.btnUndo = document.getElementById('btn-undo');
      this.btnRestart = document.getElementById('btn-restart');
      this.btnExit = document.getElementById('btn-exit-app');
      this.btnLeaderboard = document.getElementById('btn-open-leaderboard');
      this.btnMusic = document.getElementById('btn-open-music');
      this.retryOverlayBtn = document.getElementById('btn-retry-overlay');

      // Modals
      this.settingsModal = document.getElementById('modal-settings');
      this.changelogModal = document.getElementById('modal-changelog');
      this.creditsModal = document.getElementById('modal-credits');
      this.leaderboardModal = document.getElementById('modal-leaderboard');
      this.musicModal = document.getElementById('modal-music');
      this.trackSelectorModal = document.getElementById('modal-music-selector');
      this.exitModal = document.getElementById('modal-exit');
      this.confirmActionModal = document.getElementById('modal-confirm-action');

      // Modal Triggers
      this.settingsBtn = document.getElementById('btn-open-settings');
      this.settingsCloseBtn = document.getElementById('btn-close-settings');
      this.settingsSaveBtn = document.getElementById('btn-save-settings');
      this.openChangelogBtn = document.getElementById('btn-open-changelog');
      this.closeChangelogBtn = document.getElementById('btn-close-changelog');
      this.openCreditsBtn = document.getElementById('btn-open-credits');
      this.closeCreditsBtn = document.getElementById('btn-close-credits');
      this.closeLeaderboardBtn = document.getElementById('btn-close-leaderboard');
      this.clearLeaderboardBtn = document.getElementById('btn-clear-leaderboard');
      this.closeMusicBtn = document.getElementById('btn-close-music');
      this.openTrackSelectorBtn = document.getElementById('btn-open-track-selector');
      this.closeTrackSelectorBtn = document.getElementById('btn-close-track-selector');
      this.saveTrackSelectionBtn = document.getElementById('btn-save-track-selection');
      this.cancelExitBtn = document.getElementById('btn-cancel-exit');
      this.confirmExitBtn = document.getElementById('btn-confirm-exit');
      this.resetBestBtn = document.getElementById('btn-reset-best');
    }

    setupGlobalModalEvents() {
      this.settingsBtn.addEventListener('click', () => {
        this.settings.syncPopupColors();
        this.openModal(this.settingsModal);
      });
      this.settingsCloseBtn.addEventListener('click', () => {
        this.closeModal(this.settingsModal);
        this.settings.load();
      });
      this.settingsSaveBtn.addEventListener('click', () => {
        this.settings.save();
        this.closeModal(this.settingsModal);
      });

      this.btnLeaderboard.addEventListener('click', () => {
        this.leaderboard.render();
        this.openModal(this.leaderboardModal);
      });
      this.closeLeaderboardBtn.addEventListener('click', () => this.closeModal(this.leaderboardModal));
      this.clearLeaderboardBtn.addEventListener('click', () => {
        this.showConfirmDialog({
          title: "Clear Leaderboard?",
          message: "Are you sure you want to delete all top 5 scores? This action cannot be undone.",
          confirmText: "Clear All",
          onConfirm: () => {
            if (window.leaderboard) window.leaderboard.clear();
            this.leaderboard.render();
            this.triggerHaptic(this.settings.mergeHapticVal);
          }
        });
      });

      this.btnMusic.addEventListener('click', () => {
        if (window.musicEngine) {
          this.music.updateTrackInfo(window.musicEngine.getCurrentTrack());
          this.music.syncAllMusicControls();
        }
        this.openModal(this.musicModal);
      });
      this.closeMusicBtn.addEventListener('click', () => this.closeModal(this.musicModal));

      this.openTrackSelectorBtn.addEventListener('click', () => {
        this.music.renderChecklist();
        this.openModal(this.trackSelectorModal);
      });
      this.closeTrackSelectorBtn.addEventListener('click', () => this.closeModal(this.trackSelectorModal));
      this.saveTrackSelectionBtn.addEventListener('click', () => {
        if (window.musicEngine) {
          window.musicEngine.updatePlaylistSelection(this.music.tempSelectedTrackIds);
        }
        this.closeModal(this.trackSelectorModal);
      });

      this.openChangelogBtn.addEventListener('click', () => {
        this.info.renderChangelog();
        this.openModal(this.changelogModal);
      });
      this.closeChangelogBtn.addEventListener('click', () => this.closeModal(this.changelogModal));

      this.openCreditsBtn.addEventListener('click', () => {
        this.info.renderCredits();
        this.openModal(this.creditsModal);
      });
      this.closeCreditsBtn.addEventListener('click', () => this.closeModal(this.creditsModal));

      this.btnExit.addEventListener('click', () => this.handleExitRequest());
      this.cancelExitBtn.addEventListener('click', () => this.closeModal(this.exitModal));
      this.confirmExitBtn.addEventListener('click', () => this.executeExit());
    }

    showConfirmDialog(config) {
      this.info.showConfirmDialog(config);
    }

    getCurrentTheme() {
      return this.theme.currentTheme;
    }

    setTheme(themeKey, callback) {
      this.theme.setTheme(themeKey, callback);
    }

    loadSettings() {
      this.settings.load();
    }

    getSlideSpeed() {
      return parseInt(this.settings.slideSlider.value) || 130;
    }

    isDeterministic() {
      return this.settings.deterministicCheckbox ? this.settings.deterministicCheckbox.checked : false;
    }

    getSlideHaptic() {
      return this.settings.slideHapticVal || 8;
    }

    getMergeHaptic() {
      return this.settings.mergeHapticVal || 18;
    }

    openModal(modalElement) {
      if (!modalElement) return;
      if (window.gameEngine && window.gameEngine.timer) {
        window.gameEngine.timer.setModalBlock(true);
      }
      requestAnimationFrame(() => modalElement.classList.add('active'));
    }

    closeModal(modalElement) {
      if (!modalElement) return;
      modalElement.classList.remove('active');
      const anyOpen = document.querySelector('.modal-overlay.active');
      if (!anyOpen && window.gameEngine && window.gameEngine.timer) {
        window.gameEngine.timer.setModalBlock(false);
      }
    }

    triggerHaptic(duration) {
      try {
        const ms = Number(duration);
        if (isNaN(ms) || ms <= 0) return;
        if (window.AndroidBridge && typeof window.AndroidBridge.haptic === 'function') {
          window.AndroidBridge.haptic(ms);
          return;
        }
        if (navigator.vibrate) navigator.vibrate(ms);
      } catch (e) {}
    }

    showScoreIncrement(increment) {
      if (increment <= 0) return;
      const popup = document.createElement('div');
      popup.className = 'score-popup';
      popup.textContent = `+${increment}`;
      popup.style.color = this.settings.popupColor;
      if (this.theme.currentTheme !== 'classic' && this.theme.currentTheme !== 'pastel_pink') {
        popup.style.textShadow = `0 0 10px ${this.settings.popupColor}`;
      }
      this.scoreContainer.appendChild(popup);
      setTimeout(() => popup.remove(), 500);
    }

    handleExitRequest() {
      if (this.settings.confirmExitCheckbox.checked) {
        this.openModal(this.exitModal);
      } else {
        this.executeExit();
      }
    }

    executeExit() {
      if (window.AndroidBridge && typeof window.AndroidBridge.exitApp === 'function') {
        window.AndroidBridge.exitApp();
      } else {
        const desc = document.getElementById('exit-modal-desc');
        if (desc) {
          desc.textContent = "Your progress has been auto-saved! You can safely close this browser window or tab.";
        }
        try { window.close(); } catch (e) {}
      }
    }
  }

  window.UIController = UIController;
})();