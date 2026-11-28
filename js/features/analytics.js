(function() {
  const GTM_ID = 'GTM-5CVS6CNS';

  const DEFAULT_SETTINGS = {
    slideSpeed: "130",
    partLife: "450",
    partDensity: "20",
    visualizerBarCount: 65,
    visualizerBoxSize: "medium",
    visualizerMode: "full",
    particlesEnabled: true,
    soundEnabled: true,
    sfxVolume: 80,
    musicVolume: 75,
    autoplayMusicEnabled: true,
    deterministicEnabled: false,
    confirmExitEnabled: true,
    showTimerEnabled: true,
    orientationMode: "auto",
    slideHaptic: 8,
    mergeHaptic: 18
  };

  class AnalyticsTracker {
    isEnabled() {
      if (window['ga-disable-' + GTM_ID] === true) return false;
      if (window.localStorage && window.localStorage.getItem('ga_opt_out') === 'true') return false;
      if (window.storage && window.storage.getSettings().disableAnalytics) return false;
      return typeof window.gtag === 'function';
    }

    getModifiedSettings() {
      if (!window.storage) return {};
      const s = window.storage.getSettings();
      const m = window.storage.getMusicSettings();
      const modified = {};

      if (String(s.slideSpeed) !== DEFAULT_SETTINGS.slideSpeed) modified.slideSpeed = Number(s.slideSpeed);
      if (String(s.partLife) !== DEFAULT_SETTINGS.partLife) modified.partLife = Number(s.partLife);
      if (String(s.partDensity) !== DEFAULT_SETTINGS.partDensity) modified.partDensity = Number(s.partDensity);
      if (Number(s.visualizerBarCount) !== DEFAULT_SETTINGS.visualizerBarCount) {
        modified.visualizerBarCount = Number(s.visualizerBarCount);
      }
      if (s.visualizerBoxSize !== DEFAULT_SETTINGS.visualizerBoxSize) {
        modified.visualizerBoxSize = s.visualizerBoxSize;
      }
      const visMode = m.visualizerMode || "full";
      if (visMode !== DEFAULT_SETTINGS.visualizerMode) modified.visualizerMode = visMode;
      if (s.particlesEnabled !== DEFAULT_SETTINGS.particlesEnabled) modified.particlesEnabled = s.particlesEnabled;
      if (s.soundEnabled !== DEFAULT_SETTINGS.soundEnabled) modified.soundEnabled = s.soundEnabled;
      if (Number(s.sfxVolume) !== DEFAULT_SETTINGS.sfxVolume) modified.sfxVolume = Number(s.sfxVolume);

      const effectiveMusicVol = m.volume !== undefined ? Math.round(m.volume * 100) : Number(s.musicVolume);
      if (effectiveMusicVol !== DEFAULT_SETTINGS.musicVolume) modified.musicVolume = effectiveMusicVol;

      if (s.autoplayMusicEnabled !== DEFAULT_SETTINGS.autoplayMusicEnabled) {
        modified.autoplayMusicEnabled = s.autoplayMusicEnabled;
      }
      if (s.deterministicEnabled !== DEFAULT_SETTINGS.deterministicEnabled) {
        modified.deterministicEnabled = s.deterministicEnabled;
      }
      if (s.confirmExitEnabled !== DEFAULT_SETTINGS.confirmExitEnabled) {
        modified.confirmExitEnabled = s.confirmExitEnabled;
      }
      if (s.showTimerEnabled !== DEFAULT_SETTINGS.showTimerEnabled) {
        modified.showTimerEnabled = s.showTimerEnabled;
      }
      if (s.orientationMode !== DEFAULT_SETTINGS.orientationMode) modified.orientationMode = s.orientationMode;
      if (Number(s.slideHaptic) !== DEFAULT_SETTINGS.slideHaptic) modified.slideHaptic = Number(s.slideHaptic);
      if (Number(s.mergeHaptic) !== DEFAULT_SETTINGS.mergeHaptic) modified.mergeHaptic = Number(s.mergeHaptic);

      const availableTracks = window.MusicData ? window.MusicData.getAvailableTracks() : [];
      if (Array.isArray(m.enabledTrackIds) && m.enabledTrackIds.length > 0 && availableTracks.length > 0) {
        const availableSet = new Set(availableTracks.map(t => t.id));
        const validEnabled = Array.from(new Set(m.enabledTrackIds.filter(id => availableSet.has(id))));
        if (validEnabled.length > 0 && validEnabled.length < availableSet.size) {
          modified.enabledTrackIds = validEnabled.join(',');
        }
      }

      return modified;
    }

    trackInitialize(themeUsed) {
      if (!this.isEnabled()) return;
      const modified = this.getModifiedSettings();
      const count = Object.keys(modified).length;
      window.gtag('event', 'initialize', {
        theme: themeUsed || 'neondark',
        modified_settings: count > 0 ? JSON.stringify(modified) : 'default',
        modified_count: count,
        ...modified
      });
    }

    trackGameCompleted(payload) {
      if (!this.isEnabled() || !payload) return;
      window.gtag('event', 'game_completed', {
        score: Number(payload.score) || 0,
        undo_count: Number(payload.undoCount) || 0,
        moves: Number(payload.moves) || 0,
        highscore: Number(payload.highscore) || 0,
        highest_tile: Number(payload.highestTile) || 0,
        time_taken: Number(payload.timeTaken) || 0
      });
    }
  }

  window.analytics = new AnalyticsTracker();
})();
