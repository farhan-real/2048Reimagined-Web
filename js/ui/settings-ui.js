(function() {
  class SettingsUI {
    constructor(parentUI) {
      this.parent = parentUI;
      this.popupColor = "#00f0ff";
      this.slideHapticVal = 8;
      this.mergeHapticVal = 18;
      this.orientationMode = "auto";

      this.initElements();
      this.setupEvents();
      this.setupVisualizerSettings();
    }

    initElements() {
      this.slideSlider = document.getElementById('slider-slide-speed');
      this.partLifeSlider = document.getElementById('slider-part-life');
      this.partDensitySlider = document.getElementById('slider-part-density');
      this.lblSlideSpeed = document.getElementById('lbl-slide-speed');
      this.lblPartLife = document.getElementById('lbl-part-life');
      this.lblPartDensity = document.getElementById('lbl-part-density');

      this.sfxVolumeSlider = document.getElementById('slider-sfx-volume');
      this.musicVolumeSlider = document.getElementById('slider-settings-music-volume');
      this.lblSfxVolume = document.getElementById('lbl-sfx-volume');
      this.lblMusicVolume = document.getElementById('lbl-settings-music-volume');

      this.particlesCheckbox = document.getElementById('toggle-particles');
      this.soundCheckbox = document.getElementById('toggle-sound');
      this.deterministicCheckbox = document.getElementById('toggle-deterministic');
      this.confirmExitCheckbox = document.getElementById('toggle-confirm-exit');
      this.showTimerCheckbox = document.getElementById('toggle-show-timer');

      this.settingsBarsSlider = document.getElementById('slider-settings-visualizer-bars');
      this.lblSettingsBars = document.getElementById('lbl-settings-visualizer-bars');
      this.settingsBoxCard = document.getElementById('card-settings-box-size');
    }

    setupEvents() {
      this.slideSlider.addEventListener('input', () => this.updateSliderLabels());
      this.partLifeSlider.addEventListener('input', () => this.updateSliderLabels());
      this.partDensitySlider.addEventListener('input', () => this.updateSliderLabels());
      this.showTimerCheckbox.addEventListener('change', () => this.applyTimerVisibility());

      if (this.sfxVolumeSlider) this.sfxVolumeSlider.addEventListener('input', () => this.updateSfxVolume());
      if (this.musicVolumeSlider) this.musicVolumeSlider.addEventListener('input', () => this.updateMusicVolume());

      this.setupOrientationTabs();
      this.setupHapticTabs();
      this.setupColorTabs();
    }

    setupVisualizerSettings() {
      const modeGroup = document.getElementById('group-settings-visualizer-mode');
      if (modeGroup) {
        modeGroup.querySelectorAll('.tab-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            const mode = btn.getAttribute('data-mode');
            modeGroup.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.getAttribute('data-mode') === mode));
            if (this.settingsBoxCard) this.settingsBoxCard.style.display = (mode === 'box') ? 'flex' : 'none';
            if (window.musicEngine) {
              window.musicEngine.visualizer.setMode(mode);
              window.musicEngine.saveSettings();
            }
            if (this.parent && this.parent.music) this.parent.music.syncVisualizerTabs(mode);
          });
        });
      }

      const boxGroup = document.getElementById('group-settings-visualizer-box-size');
      if (boxGroup) {
        boxGroup.querySelectorAll('.tab-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            const size = btn.getAttribute('data-size');
            boxGroup.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.getAttribute('data-size') === size));
            if (window.musicEngine) {
              window.musicEngine.visualizer.setBoxSize(size);
              window.musicEngine.saveSettings();
            }
            if (this.parent && this.parent.music) this.parent.music.syncBoxSizeTabs(size);
          });
        });
      }

      if (this.settingsBarsSlider) {
        this.settingsBarsSlider.addEventListener('input', () => {
          const val = parseInt(this.settingsBarsSlider.value);
          this.updateBarsLabel(val);
          if (window.musicEngine && window.musicEngine.visualizer) {
            window.musicEngine.visualizer.setBarCount(val);
            window.musicEngine.saveSettings();
          }
          const musicSlider = document.getElementById('slider-visualizer-bars');
          const musicBadge = document.getElementById('lbl-visualizer-bars');
          if (musicSlider) musicSlider.value = val;
          if (musicBadge) musicBadge.textContent = this.lblSettingsBars.textContent;
        });
      }
    }

    updateBarsLabel(barCount) {
      if (!this.lblSettingsBars) return;
      let text = '';
      if (barCount <= 35) text = `Minimal (${barCount} bars)`;
      else if (barCount <= 55) text = `Normal (${barCount} bars)`;
      else if (barCount <= 85) text = `Dense (${barCount} bars)`;
      else text = `Extreme (${barCount} bars)`;
      this.lblSettingsBars.textContent = text;
    }

    setupOrientationTabs() {
      const container = document.getElementById('group-orientation-mode');
      if (!container) return;
      container.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.orientationMode = btn.getAttribute('data-orientation') || 'auto';
          this.applyOrientation(this.orientationMode);
        });
      });
    }

    applyOrientation(mode) {
      document.body.setAttribute('data-orientation-mode', mode);
      if (window.AndroidBridge && typeof window.AndroidBridge.setOrientation === 'function') {
        window.AndroidBridge.setOrientation(mode);
      } else if (screen.orientation && typeof screen.orientation.lock === 'function') {
        if (mode === 'portrait') screen.orientation.lock('portrait').catch(() => {});
        else if (mode === 'landscape') screen.orientation.lock('landscape').catch(() => {});
        else if (screen.orientation.unlock) screen.orientation.unlock();
      }
      setTimeout(() => window.dispatchEvent(new Event('resize')), 100);
    }

    updateSfxVolume() {
      const val = parseInt(this.sfxVolumeSlider.value) || 0;
      if (this.lblSfxVolume) this.lblSfxVolume.textContent = val + '%';
      if (window.sound) window.sound.setVolume(val / 100);
    }

    updateMusicVolume() {
      const val = parseInt(this.musicVolumeSlider.value) || 0;
      if (this.lblMusicVolume) this.lblMusicVolume.textContent = val + '%';
      if (window.musicEngine) window.musicEngine.setVolume(val / 100);

      const modalVol = document.getElementById('slider-music-volume');
      const modalBadge = document.getElementById('lbl-music-modal-volume');
      if (modalVol) modalVol.value = val;
      if (modalBadge) modalBadge.textContent = val + '%';
    }

    setupHapticTabs() {
      const bindGroup = (id, cb) => {
        const container = document.getElementById(id);
        if (!container) return;
        container.querySelectorAll('.tab-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const val = parseInt(btn.getAttribute('data-val'));
            cb(val);
            this.parent.triggerHaptic(val);
          });
        });
      };
      bindGroup('group-haptic-slide', (v) => { this.slideHapticVal = v; });
      bindGroup('group-haptic-merge', (v) => { this.mergeHapticVal = v; });
    }

    setupColorTabs() {
      const container = document.getElementById('group-popup-color');
      if (!container) return;
      container.querySelectorAll('.tab-btn').forEach(btn => {
        const col = btn.getAttribute('data-color');
        btn.style.color = col;
        btn.addEventListener('click', () => {
          this.popupColor = col;
          this.syncPopupColors();
        });
      });
    }

    syncPopupColors() {
      const container = document.getElementById('group-popup-color');
      if (!container) return;
      container.querySelectorAll('.tab-btn').forEach(btn => {
        const col = btn.getAttribute('data-color');
        if (col === this.popupColor) {
          btn.classList.add('active');
          btn.style.backgroundColor = col;
          btn.style.color = '#000000';
          btn.style.boxShadow = `0 0 8px ${col}`;
        } else {
          btn.classList.remove('active');
          btn.style.backgroundColor = 'transparent';
          btn.style.color = col;
          btn.style.boxShadow = 'none';
        }
      });
    }

    updateSliderLabels() {
      const speed = parseInt(this.slideSlider.value);
      this.lblSlideSpeed.textContent = speed === 0 ? "Instant (0ms)" : speed <= 90 ? `Snappy (${speed}ms)` : speed <= 180 ? `Smooth (${speed}ms)` : `Chill (${speed}ms)`;
      document.documentElement.style.setProperty('--slide-speed', speed + 'ms');

      const life = parseInt(this.partLifeSlider.value);
      this.lblPartLife.textContent = life <= 200 ? `Burst (${life}ms)` : life <= 500 ? `Normal (${life}ms)` : `Float (${(life / 1000).toFixed(1)}s)`;

      const density = parseInt(this.partDensitySlider.value);
      this.lblPartDensity.textContent = density <= 15 ? `Minimal (${density} qty)` : density <= 30 ? `Default (${density} qty)` : `High (${density} qty)`;
    }

    applyTimerVisibility() {
      if (this.showTimerCheckbox.checked) document.body.removeAttribute('data-hide-timer');
      else document.body.setAttribute('data-hide-timer', 'true');
    }

    load() {
      const s = window.storage.getSettings();
      const m = window.storage.getMusicSettings();

      this.popupColor = s.popupColor;
      this.slideHapticVal = s.slideHaptic;
      this.mergeHapticVal = s.mergeHaptic;
      this.orientationMode = s.orientationMode || "auto";

      this.slideSlider.value = s.slideSpeed;
      this.partLifeSlider.value = s.partLife;
      this.partDensitySlider.value = s.partDensity;
      this.particlesCheckbox.checked = s.particlesEnabled;
      this.soundCheckbox.checked = s.soundEnabled;
      this.deterministicCheckbox.checked = s.deterministicEnabled;
      this.confirmExitCheckbox.checked = s.confirmExitEnabled;
      this.showTimerCheckbox.checked = s.showTimerEnabled;

      const sfxVol = s.sfxVolume !== undefined ? s.sfxVolume : 80;
      const musicVol = s.musicVolume !== undefined ? s.musicVolume : 75;

      if (this.sfxVolumeSlider) { this.sfxVolumeSlider.value = sfxVol; if (this.lblSfxVolume) this.lblSfxVolume.textContent = sfxVol + '%'; }
      if (this.musicVolumeSlider) { this.musicVolumeSlider.value = musicVol; if (this.lblMusicVolume) this.lblMusicVolume.textContent = musicVol + '%'; }

      if (this.settingsBarsSlider) {
        const bars = m.visualizerBarCount || 65;
        this.settingsBarsSlider.value = bars;
        this.updateBarsLabel(bars);
      }

      const mode = m.visualizerMode || "full";
      const modeGroup = document.getElementById('group-settings-visualizer-mode');
      if (modeGroup) {
        modeGroup.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.getAttribute('data-mode') === mode));
      }
      if (this.settingsBoxCard) this.settingsBoxCard.style.display = (mode === 'box') ? 'flex' : 'none';

      const boxSize = m.visualizerBoxSize || "medium";
      const boxGroup = document.getElementById('group-settings-visualizer-box-size');
      if (boxGroup) {
        boxGroup.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.getAttribute('data-size') === boxSize));
      }

      if (window.sound) { window.sound.enabled = s.soundEnabled; window.sound.setVolume(sfxVol / 100); }
      if (window.musicEngine) window.musicEngine.setVolume(musicVol / 100);

      this.updateSliderLabels();
      this.applyTimerVisibility();
      this.applyOrientation(this.orientationMode);

      const syncTab = (id, val, attr) => {
        const c = document.getElementById(id);
        if (!c) return;
        c.querySelectorAll('.tab-btn').forEach(btn => {
          if (btn.getAttribute(attr) === String(val)) btn.classList.add('active');
          else btn.classList.remove('active');
        });
      };
      syncTab('group-haptic-slide', this.slideHapticVal, 'data-val');
      syncTab('group-haptic-merge', this.mergeHapticVal, 'data-val');
      syncTab('group-orientation-mode', this.orientationMode, 'data-orientation');
      this.syncPopupColors();
    }

    save() {
      window.storage.saveSettings({
        slideSpeed: this.slideSlider.value,
        partLife: this.partLifeSlider.value,
        partDensity: this.partDensitySlider.value,
        particlesEnabled: this.particlesCheckbox.checked,
        soundEnabled: this.soundCheckbox.checked,
        sfxVolume: this.sfxVolumeSlider ? this.sfxVolumeSlider.value : 80,
        musicVolume: this.musicVolumeSlider ? this.musicVolumeSlider.value : 75,
        deterministicEnabled: this.deterministicCheckbox.checked,
        confirmExitEnabled: this.confirmExitCheckbox.checked,
        showTimerEnabled: this.showTimerCheckbox.checked,
        orientationMode: this.orientationMode,
        slideHaptic: this.slideHapticVal,
        mergeHaptic: this.mergeHapticVal,
        popupColor: this.popupColor
      });
      if (window.sound) window.sound.enabled = this.soundCheckbox.checked;
      this.applyTimerVisibility();
      this.applyOrientation(this.orientationMode);
      document.documentElement.style.setProperty('--slide-speed', `${this.slideSlider.value}ms`);
    }
  }

  window.SettingsUI = SettingsUI;
})();