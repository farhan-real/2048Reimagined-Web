(function() {
  const KEYS = {
    BEST_SCORE: '2048_best',
    ACTIVE_STATE: '2048_active_state_reimagined',
    LEADERBOARD: '2048_leaderboard',
    MUSIC_SETTINGS: '2048_music_settings',
    SLIDE_SPEED: '2048_slide_speed',
    PART_LIFE: '2048_part_life',
    PART_DENSITY: '2048_part_density',
    VISUALIZER_BAR_COUNT: '2048_visualizer_bar_count',
    VISUALIZER_BOX_SIZE: '2048_visualizer_box_size',
    PARTICLES_ENABLED: '2048_particles_enabled',
    SOUND_ENABLED: '2048_sound_enabled',
    SFX_VOLUME: '2048_sfx_volume',
    MUSIC_VOLUME: '2048_music_volume',
    AUTOPLAY_MUSIC_ENABLED: '2048_autoplay_music_enabled',
    DETERMINISTIC_ENABLED: '2048_deterministic_enabled',
    CONFIRM_EXIT_ENABLED: '2048_confirm_exit_enabled',
    SHOW_TIMER_ENABLED: '2048_show_timer_enabled',
    ORIENTATION_MODE: '2048_orientation_mode',
    SLIDE_HAPTIC: '2048_slide_haptic_val',
    MERGE_HAPTIC: '2048_merge_haptic_val',
    POPUP_COLOR: '2048_popup_color',
    SW_VERSION: '2048_sw_version'
  };

  const memStore = {};
  const safeStorage = {
    getItem(key) {
      try {
        return window.localStorage ? window.localStorage.getItem(key) : (memStore[key] || null);
      } catch (e) {
        return memStore[key] || null;
      }
    },
    setItem(key, val) {
      try {
        if (window.localStorage) window.localStorage.setItem(key, String(val));
      } catch (e) {
        memStore[key] = String(val);
      }
    },
    removeItem(key) {
      try {
        if (window.localStorage) window.localStorage.removeItem(key);
      } catch (e) {
        delete memStore[key];
      }
    }
  };

  const storage = {
    getBestScore: () => parseInt(safeStorage.getItem(KEYS.BEST_SCORE)) || 0,
    setBestScore: (val) => safeStorage.setItem(KEYS.BEST_SCORE, val.toString()),

    getSwVersion: () => safeStorage.getItem(KEYS.SW_VERSION),
    setSwVersion: (ver) => safeStorage.setItem(KEYS.SW_VERSION, String(ver)),

    getGameState: () => {
      try {
        const stored = safeStorage.getItem(KEYS.ACTIVE_STATE);
        return stored ? JSON.parse(stored) : null;
      } catch {
        return null;
      }
    },
    setGameState: (state) => {
      try {
        safeStorage.setItem(KEYS.ACTIVE_STATE, JSON.stringify(state));
      } catch (e) {}
    },

    getLeaderboard: () => {
      try {
        const stored = safeStorage.getItem(KEYS.LEADERBOARD);
        return stored ? JSON.parse(stored) : [];
      } catch {
        return [];
      }
    },
    setLeaderboard: (data) => {
      try {
        safeStorage.setItem(KEYS.LEADERBOARD, JSON.stringify(data));
      } catch (e) {}
    },

    getMusicSettings: () => {
      try {
        const stored = safeStorage.getItem(KEYS.MUSIC_SETTINGS);
        return stored ? JSON.parse(stored) : {
          enabledTrackIds: [],
          lastTrackIndex: 0,
          volume: 0.75,
          visualizerMode: "full",
          visualizerBoxSize: "medium",
          visualizerBarCount: 65,
          autoplayMusicEnabled: true
        };
      } catch {
        return {
          enabledTrackIds: [],
          lastTrackIndex: 0,
          volume: 0.75,
          visualizerMode: "full",
          visualizerBoxSize: "medium",
          visualizerBarCount: 65,
          autoplayMusicEnabled: true
        };
      }
    },
    saveMusicSettings: (settings) => {
      try {
        safeStorage.setItem(KEYS.MUSIC_SETTINGS, JSON.stringify(settings));
      } catch (e) {}
    },

    getSettings: () => {
      const music = storage.getMusicSettings();
      return {
        slideSpeed: safeStorage.getItem(KEYS.SLIDE_SPEED) || "130",
        partLife: safeStorage.getItem(KEYS.PART_LIFE) || "450",
        partDensity: safeStorage.getItem(KEYS.PART_DENSITY) || "20",
        visualizerBarCount: music.visualizerBarCount !== undefined ? music.visualizerBarCount : 65,
        visualizerBoxSize: music.visualizerBoxSize || "medium",
        particlesEnabled: safeStorage.getItem(KEYS.PARTICLES_ENABLED) !== "false",
        soundEnabled: safeStorage.getItem(KEYS.SOUND_ENABLED) !== "false",
        sfxVolume: safeStorage.getItem(KEYS.SFX_VOLUME) !== null ? parseInt(safeStorage.getItem(KEYS.SFX_VOLUME)) : 80,
        musicVolume: safeStorage.getItem(KEYS.MUSIC_VOLUME) !== null ? parseInt(safeStorage.getItem(KEYS.MUSIC_VOLUME)) : 75,
        autoplayMusicEnabled: music.autoplayMusicEnabled !== false,
        deterministicEnabled: safeStorage.getItem(KEYS.DETERMINISTIC_ENABLED) === "true",
        confirmExitEnabled: safeStorage.getItem(KEYS.CONFIRM_EXIT_ENABLED) !== "false",
        showTimerEnabled: safeStorage.getItem(KEYS.SHOW_TIMER_ENABLED) !== "false",
        orientationMode: safeStorage.getItem(KEYS.ORIENTATION_MODE) || "auto",
        slideHaptic: safeStorage.getItem(KEYS.SLIDE_HAPTIC) !== null ? parseInt(safeStorage.getItem(KEYS.SLIDE_HAPTIC)) : 8,
        mergeHaptic: safeStorage.getItem(KEYS.MERGE_HAPTIC) !== null ? parseInt(safeStorage.getItem(KEYS.MERGE_HAPTIC)) : 18,
        popupColor: safeStorage.getItem(KEYS.POPUP_COLOR) || "#00f0ff"
      };
    },

    saveSettings: (settings) => {
      safeStorage.setItem(KEYS.SLIDE_SPEED, settings.slideSpeed);
      safeStorage.setItem(KEYS.PART_LIFE, settings.partLife);
      safeStorage.setItem(KEYS.PART_DENSITY, settings.partDensity);
      safeStorage.setItem(KEYS.PARTICLES_ENABLED, settings.particlesEnabled);
      safeStorage.setItem(KEYS.SOUND_ENABLED, settings.soundEnabled);
      safeStorage.setItem(KEYS.SFX_VOLUME, settings.sfxVolume);
      safeStorage.setItem(KEYS.MUSIC_VOLUME, settings.musicVolume);
      safeStorage.setItem(KEYS.DETERMINISTIC_ENABLED, settings.deterministicEnabled);
      safeStorage.setItem(KEYS.CONFIRM_EXIT_ENABLED, settings.confirmExitEnabled);
      safeStorage.setItem(KEYS.SHOW_TIMER_ENABLED, settings.showTimerEnabled);
      safeStorage.setItem(KEYS.ORIENTATION_MODE, settings.orientationMode || "auto");
      safeStorage.setItem(KEYS.SLIDE_HAPTIC, settings.slideHaptic);
      safeStorage.setItem(KEYS.MERGE_HAPTIC, settings.mergeHaptic);
      safeStorage.setItem(KEYS.POPUP_COLOR, settings.popupColor);
    }
  };

  window.storage = storage;
})();