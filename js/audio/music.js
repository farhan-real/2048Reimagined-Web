(function() {
  class MusicEngine {
    constructor() {
      this.audio = new Audio();
      this.audio.preload = "auto";

      this.availableTracks = window.MusicData ? window.MusicData.getAvailableTracks() : [];
      this.activePlaylist = [];
      this.currentIndex = 0;
      this.isPlaying = false;
      this.isSeeking = false;
      this.wasPlayingBeforeHidden = false;

      this.visualizer = new window.MusicVisualizer();
      this.loadSettings();
      this.setupAudioListeners();
      this.setupVisibilityListeners();
    }

    shuffle(array) {
      const arr = [...array];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    }

    initAudioContext() {
      // Audio playback routes directly to standard HTML5 audio pipeline
      // without WebAudio MediaElement hijacking to eliminate cross-origin restrictions.
    }

    loadSettings() {
      const s = window.storage.getMusicSettings();
      const availableIds = new Set(this.availableTracks.map(t => t.id));

      let enabled = (s.enabledTrackIds || []).filter(id => availableIds.has(id));
      if (enabled.length === 0 && this.availableTracks.length > 0) {
        enabled = this.availableTracks.map(t => t.id);
      }

      const filteredTracks = this.availableTracks.filter(t => enabled.includes(t.id));
      this.activePlaylist = this.shuffle(filteredTracks);
      this.currentIndex = 0;

      this.visualizer.setMode(s.visualizerMode || "full");
      this.visualizer.setBoxSize(s.visualizerBoxSize || "medium");
      this.visualizer.setBarCount(s.visualizerBarCount || 65);

      this.audio.volume = s.volume !== undefined ? s.volume : 0.75;
      this.syncCurrentTrack();
    }

    saveSettings() {
      const isAutoplay = window.storage.getMusicSettings().autoplayMusicEnabled !== false;
      window.storage.saveMusicSettings({
        enabledTrackIds: this.activePlaylist.map(t => t.id),
        lastTrackIndex: this.currentIndex,
        volume: this.audio.volume,
        visualizerMode: this.visualizer.mode,
        visualizerBoxSize: this.visualizer.boxSize,
        visualizerBarCount: this.visualizer.barCount,
        autoplayMusicEnabled: isAutoplay
      });
    }

    setupAudioListeners() {
      this.audio.addEventListener('play', () => {
        this.isPlaying = true;
        this.visualizer.start();
        if (window.ui && window.ui.music) window.ui.music.updatePlayState(true);
      });

      this.audio.addEventListener('pause', () => {
        this.isPlaying = false;
        if (window.ui && window.ui.music) window.ui.music.updatePlayState(false);
      });

      this.audio.addEventListener('ended', () => this.next());

      this.audio.addEventListener('timeupdate', () => {
        if (!this.isSeeking && window.ui && window.ui.music) {
          window.ui.music.updateProgress(this.audio.currentTime, this.audio.duration || 0);
        }
      });

      this.audio.addEventListener('error', () => {
        if (this.isPlaying && this.activePlaylist.length > 1) {
          setTimeout(() => this.next(), 600);
        }
      });
    }

    setupVisibilityListeners() {
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          if (this.isPlaying) {
            this.wasPlayingBeforeHidden = true;
            this.pause();
          }
        } else if (this.wasPlayingBeforeHidden) {
          this.wasPlayingBeforeHidden = false;
          this.play();
        }
      });
    }

    syncCurrentTrack() {
      if (this.activePlaylist.length === 0) {
        if (window.ui && window.ui.music) {
          window.ui.music.updateTrackInfo({
            title: "No Tracks Found",
            artistText: "Drop audio files in assets/music/"
          });
        }
        return;
      }
      const track = this.activePlaylist[this.currentIndex];
      if (track) {
        const wasPlaying = this.isPlaying;
        this.audio.src = track.path;
        if (this.visualizer && typeof this.visualizer.setTrackSeed === 'function') {
          this.visualizer.setTrackSeed(track.id || track.title);
        }
        if (window.ui && window.ui.music) {
          window.ui.music.updateTrackInfo(track);
        }
        if (wasPlaying) this.play();
      }
    }

    getCurrentTrack() {
      return this.activePlaylist[this.currentIndex] || null;
    }

    play() {
      if (!this.audio.src && this.activePlaylist.length > 0) {
        this.syncCurrentTrack();
      }

      const p = this.audio.play();
      if (p && p.catch) {
        p.catch(() => {
          this.isPlaying = false;
          if (window.ui && window.ui.music) window.ui.music.updatePlayState(false);
        });
      }
    }

    pause() {
      this.audio.pause();
    }

    togglePlay() {
      if (this.isPlaying) {
        this.wasPlayingBeforeHidden = false;
        this.pause();
      } else {
        this.play();
      }
    }

    next() {
      if (this.activePlaylist.length === 0) return;
      this.currentIndex = (this.currentIndex + 1) % this.activePlaylist.length;
      this.syncCurrentTrack();
      this.play();
      this.saveSettings();
    }

    prev() {
      if (this.activePlaylist.length === 0) return;
      if (this.audio.currentTime > 3) {
        this.audio.currentTime = 0;
        return;
      }
      this.currentIndex = (this.currentIndex - 1 + this.activePlaylist.length) % this.activePlaylist.length;
      this.syncCurrentTrack();
      this.play();
      this.saveSettings();
    }

    seek(fraction) {
      if (this.audio.duration) {
        this.audio.currentTime = fraction * this.audio.duration;
      }
    }

    setVolume(val) {
      this.audio.volume = Math.max(0, Math.min(1, val));
      this.saveSettings();
    }

    updatePlaylistSelection(selectedIds) {
      const availableMap = new Map(this.availableTracks.map(t => [t.id, t]));
      const filtered = selectedIds
        .filter(id => availableMap.has(id))
        .map(id => availableMap.get(id));

      const finalTracks = filtered.length > 0 ? filtered : [...this.availableTracks];
      this.activePlaylist = this.shuffle(finalTracks);

      this.currentIndex = 0;
      this.syncCurrentTrack();
      this.saveSettings();
    }
  }

  window.MusicEngine = MusicEngine;
})();