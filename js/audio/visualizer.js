(function() {
  class MusicVisualizer {
    constructor() {
      this.canvasFull = document.getElementById('visualizer-full');
      this.canvasBox = document.getElementById('visualizer-box');
      this.canvasLandscape = document.getElementById('visualizer-landscape');
      this.ctxFull = this.canvasFull ? this.canvasFull.getContext('2d') : null;
      this.ctxBox = this.canvasBox ? this.canvasBox.getContext('2d') : null;
      this.ctxLandscape = this.canvasLandscape ? this.canvasLandscape.getContext('2d') : null;

      this.mode = "full";
      this.boxSize = "medium";
      this.barCount = 65;
      this.hueOffset = 0;
      this.lastTime = performance.now();
      this.lastFrameTime = 0;
      this.frameInterval = 33;

      this.fullPeaks = [];
      this.boxPeaks = [];
      this.landscapePeaks = [];
      this.fullVariations = [];
      this.boxVariations = [];
      this.landscapeVariations = [];
      this.currentTrackId = "default";
      this.trackSeed = 1337;

      window.addEventListener('resize', () => this.resize());
      this.loadSettings();
      this.resize();
      this.start();
    }

    loadSettings() {
      if (window.storage) {
        const s = window.storage.getMusicSettings();
        this.barCount = s.visualizerBarCount || 65;
        this.boxSize = s.visualizerBoxSize || "medium";
        this.mode = s.visualizerMode || "full";
        document.body.setAttribute('data-visualizer-mode', this.mode);
        document.body.setAttribute('data-box-size', this.boxSize);
      }
    }

    setBarCount(count) {
      this.barCount = Math.max(20, Math.min(120, count || 65));
      this.resetBuffers();
    }

    setBoxSize(size) {
      this.boxSize = size || "medium";
      document.body.setAttribute('data-box-size', this.boxSize);
      this.resize();
    }

    setMode(mode) {
      this.mode = mode || "full";
      document.body.setAttribute('data-visualizer-mode', this.mode);
      this.resize();
      if (this.mode === "off") {
        this.stop();
      } else {
        this.start();
      }
    }

    setTrackSeed(seedStr) {
      if (!seedStr) return;
      this.currentTrackId = seedStr;
      let hash = 0;
      for (let i = 0; i < seedStr.length; i++) hash = ((hash << 5) - hash) + seedStr.charCodeAt(i);
      this.trackSeed = Math.abs(hash) || 1337;
      this.resetBuffers();
    }

    resetBuffers() {
      this.fullPeaks = [];
      this.boxPeaks = [];
      this.landscapePeaks = [];
      this.fullVariations = [];
      this.boxVariations = [];
      this.landscapeVariations = [];
    }

    generateVariations(count, seed = 1337) {
      const arr = new Float32Array(count);
      let s = Math.abs(seed) || 1337;
      const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
      rnd(); rnd();
      for (let i = 0; i < count; i++) {
        const frac = i / Math.max(1, count - 1);
        const wave = Math.sin(frac * Math.PI * 4.6) * 0.05 + Math.cos(frac * Math.PI * 9.2) * 0.04;
        const alt = (i % 2 === 0 ? 0.035 : -0.035);
        arr[i] = Math.max(0.88, Math.min(1.15, 1.0 + wave + alt + (rnd() - 0.5) * 0.12));
      }
      return arr;
    }

    resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2.0);
      if (this.canvasFull && this.ctxFull) {
        const r = this.canvasFull.getBoundingClientRect();
        const w = r.width > 0 ? r.width : window.innerWidth;
        const h = r.height > 0 ? r.height : 160;
        this.canvasFull.width = Math.round(w * dpr);
        this.canvasFull.height = Math.round(h * dpr);
        this.ctxFull.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      if (this.canvasBox && this.ctxBox) {
        let baseW = 148, baseH = 70;
        if (this.boxSize === "small") { baseW = 112; baseH = 52; }
        else if (this.boxSize === "large") { baseW = 184; baseH = 86; }
        this.canvasBox.width = Math.round(baseW * dpr);
        this.canvasBox.height = Math.round(baseH * dpr);
        this.ctxBox.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      if (this.canvasLandscape && this.ctxLandscape) {
        const r = this.canvasLandscape.getBoundingClientRect();
        const w = r.width > 0 ? r.width : 300;
        const h = r.height > 0 ? r.height : 185;
        this.canvasLandscape.width = Math.round(w * dpr);
        this.canvasLandscape.height = Math.round(h * dpr);
        this.ctxLandscape.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      this.resetBuffers();
    }

    start() {
      if (!this.animationFrameId && this.mode !== "off") {
        this.lastTime = performance.now();
        this.lastFrameTime = this.lastTime;
        this.loop();
      }
    }

    stop() {
      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
      }
      this.clearAll();
    }

    clearAll() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2.0);
      if (this.ctxFull && this.canvasFull) this.ctxFull.clearRect(0, 0, this.canvasFull.width / dpr, this.canvasFull.height / dpr);
      if (this.ctxBox && this.canvasBox) this.ctxBox.clearRect(0, 0, this.canvasBox.width / dpr, this.canvasBox.height / dpr);
      if (this.ctxLandscape && this.canvasLandscape) this.ctxLandscape.clearRect(0, 0, this.canvasLandscape.width / dpr, this.canvasLandscape.height / dpr);
      this.resetBuffers();
    }

    drawBar(ctx, x, y, width, height) {
      if (height <= 1 || width <= 0) return;
      const r = Math.max(0, Math.min(width * 0.5, height * 0.5, 4));
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        try {
          ctx.roundRect(x, y, width, height, [r, r, 0, 0]);
        } catch (e) {
          ctx.rect(x, y, width, height);
        }
      } else {
        ctx.rect(x, y, width, height);
      }
      ctx.fill();
    }

    getBars(count, variations) {
      const isPlaying = window.musicEngine && window.musicEngine.isPlaying;
      const audioTime = (window.musicEngine && window.musicEngine.audio) ? window.musicEngine.audio.currentTime : 0;
      const trackId = (window.musicEngine && window.musicEngine.getCurrentTrack())
        ? window.musicEngine.getCurrentTrack().id
        : this.currentTrackId;

      if (!window.PrecompiledVisualizer) return new Float32Array(count);

      if (isPlaying && audioTime > 0) {
        return window.PrecompiledVisualizer.getBars(trackId, audioTime, count, variations, 1.0);
      }

      const idleSec = (performance.now() / 1000) * 0.65;
      return window.PrecompiledVisualizer.getBars(trackId, idleSec, count, variations, 0.42);
    }

    renderSpectrum(ctx, canvas, count, dpr, dt, maxHeight, bottomOffset, peakBuffer, variationBuffer) {
      const w = canvas.width / dpr, h = canvas.height / dpr;
      if (w <= 0 || h <= 0) return;
      ctx.clearRect(0, 0, w, h);
      const slot = w / count, barWidth = Math.max(2, slot * 0.58), gap = slot - barWidth;

      const bars = this.getBars(count, variationBuffer);

      const grad = ctx.createLinearGradient(0, h - bottomOffset - maxHeight, 0, h - bottomOffset);
      grad.addColorStop(0, `hsla(${this.hueOffset}, 75%, 62%, 0.95)`);
      grad.addColorStop(0.5, `hsla(${(this.hueOffset + 25) % 360}, 65%, 54%, 0.85)`);
      grad.addColorStop(1, `hsla(${(this.hueOffset + 50) % 360}, 55%, 46%, 0.60)`);
      ctx.fillStyle = grad;

      for (let i = 0; i < count; i++) {
        const targetHeight = Math.max(6, Math.min(maxHeight, bars[i] * maxHeight));
        if (!peakBuffer[i] || targetHeight > peakBuffer[i]) {
          peakBuffer[i] = targetHeight;
        } else {
          peakBuffer[i] = Math.max(targetHeight, peakBuffer[i] - (h * 2.2 * dt));
        }
        const barHeight = peakBuffer[i];
        const x = i * slot + (gap / 2);
        const y = h - bottomOffset - barHeight;
        this.drawBar(ctx, x, y, barWidth, barHeight);
      }
    }

    loop() {
      if (this.mode === "off") {
        this.stop();
        return;
      }
      this.animationFrameId = requestAnimationFrame(() => this.loop());

      const now = performance.now();
      if (now - this.lastFrameTime < this.frameInterval) return;
      this.lastFrameTime = now;

      const dt = Math.min((now - this.lastTime) / 1000, 0.08);
      this.lastTime = now;
      this.hueOffset = (this.hueOffset + dt * 26) % 360;
      const dpr = Math.min(window.devicePixelRatio || 1, 2.0);

      if (this.ctxLandscape && this.canvasLandscape && this.canvasLandscape.getBoundingClientRect().width > 0) {
        const count = Math.max(20, Math.min(60, Math.round((this.barCount || 65) * 0.6)));
        if (this.landscapePeaks.length !== count) this.landscapePeaks = new Float32Array(count);
        if (this.landscapeVariations.length !== count) this.landscapeVariations = this.generateVariations(count, this.trackSeed);
        this.renderSpectrum(this.ctxLandscape, this.canvasLandscape, count, dpr, dt, (this.canvasLandscape.height / dpr) - 8, 2, this.landscapePeaks, this.landscapeVariations);
      }

      if (this.mode === "full" && this.ctxFull && this.canvasFull && this.canvasFull.getBoundingClientRect().width > 0) {
        const count = this.barCount || 65;
        if (this.fullPeaks.length !== count) this.fullPeaks = new Float32Array(count);
        if (this.fullVariations.length !== count) this.fullVariations = this.generateVariations(count, this.trackSeed);
        this.renderSpectrum(this.ctxFull, this.canvasFull, count, dpr, dt, (this.canvasFull.height / dpr) - 6, 0, this.fullPeaks, this.fullVariations);
      } else if (this.mode === "box" && this.ctxBox && this.canvasBox && this.canvasBox.getBoundingClientRect().width > 0) {
        const ratio = this.boxSize === "small" ? 0.32 : this.boxSize === "large" ? 0.44 : 0.38;
        const count = Math.max(14, Math.min(48, Math.round((this.barCount || 65) * ratio)));
        if (this.boxPeaks.length !== count) this.boxPeaks = new Float32Array(count);
        if (this.boxVariations.length !== count) this.boxVariations = this.generateVariations(count, this.trackSeed);
        this.renderSpectrum(this.ctxBox, this.canvasBox, count, dpr, dt, (this.canvasBox.height / dpr) - 8, 4, this.boxPeaks, this.boxVariations);
      }
    }
  }

  window.MusicVisualizer = MusicVisualizer;
})();