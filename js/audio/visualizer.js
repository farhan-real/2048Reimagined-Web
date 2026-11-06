(function() {
  class MusicVisualizer {
    constructor() {
      this.canvasFull = document.getElementById('visualizer-full');
      this.canvasBox = document.getElementById('visualizer-box');
      this.canvasEdgeLeft = document.getElementById('visualizer-edge-left');
      this.canvasEdgeRight = document.getElementById('visualizer-edge-right');

      this.ctxFull = this.canvasFull ? this.canvasFull.getContext('2d') : null;
      this.ctxBox = this.canvasBox ? this.canvasBox.getContext('2d') : null;
      this.ctxEdgeLeft = this.canvasEdgeLeft ? this.canvasEdgeLeft.getContext('2d') : null;
      this.ctxEdgeRight = this.canvasEdgeRight ? this.canvasEdgeRight.getContext('2d') : null;

      this.mode = "full";
      this.boxSize = "medium";
      this.barCount = 65;
      this.hueOffset = 0;
      this.lastTime = performance.now();
      this.lastFrameTime = 0;
      this.frameInterval = 33;

      this.fullPeaks = [];
      this.boxPeaks = [];
      this.edgeLeftPeaks = [];
      this.edgeRightPeaks = [];

      this.fullVariations = [];
      this.boxVariations = [];
      this.edgeLeftVariations = [];
      this.edgeRightVariations = [];

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
      this.edgeLeftPeaks = [];
      this.edgeRightPeaks = [];
      this.fullVariations = [];
      this.boxVariations = [];
      this.edgeLeftVariations = [];
      this.edgeRightVariations = [];
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
      const resizeFixed = (canvas, ctx, defW, defH) => {
        if (!canvas || !ctx) return;
        const r = canvas.getBoundingClientRect();
        const w = (r.width && r.width > 0) ? r.width : defW;
        const h = (r.height && r.height > 0) ? r.height : defH;
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      };

      if (this.canvasFull && this.ctxFull) {
        const w = window.innerWidth || 800;
        this.canvasFull.width = Math.round(w * dpr);
        this.canvasFull.height = Math.round(160 * dpr);
        this.ctxFull.setTransform(dpr, 0, 0, dpr, 0, 0);
      }

      let baseW = 148, baseH = 70;
      if (this.boxSize === "small") { baseW = 112; baseH = 52; }
      else if (this.boxSize === "large") { baseW = 184; baseH = 86; }
      resizeFixed(this.canvasBox, this.ctxBox, baseW, baseH);

      const edgeW = Math.max(115, Math.min(200, Math.round(window.innerWidth * 0.11)));
      const edgeH = Math.max(200, (window.innerHeight || 800) - 105);
      resizeFixed(this.canvasEdgeLeft, this.ctxEdgeLeft, edgeW, edgeH);
      resizeFixed(this.canvasEdgeRight, this.ctxEdgeRight, edgeW, edgeH);
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
      const clr = (ctx, canvas) => { if (ctx && canvas) ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr); };
      clr(this.ctxFull, this.canvasFull);
      clr(this.ctxBox, this.canvasBox);
      clr(this.ctxEdgeLeft, this.canvasEdgeLeft);
      clr(this.ctxEdgeRight, this.canvasEdgeRight);
      this.resetBuffers();
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

    renderEdgeSpectrum(ctx, canvas, count, dpr, dt, peakBuffer, variationBuffer, isLeftEdge) {
      const w = canvas.width / dpr, h = canvas.height / dpr;
      if (w <= 0 || h <= 0) return;
      ctx.clearRect(0, 0, w, h);
      const slot = h / count, barHeight = Math.max(3, slot * 0.62), gap = slot - barHeight;
      const bars = this.getBars(count, variationBuffer);
      const maxBarWidth = (w - 12) * 0.78;

      const grad = isLeftEdge
        ? ctx.createLinearGradient(0, 0, maxBarWidth, 0)
        : ctx.createLinearGradient(w, 0, w - maxBarWidth, 0);

      grad.addColorStop(0, `hsla(${this.hueOffset}, 75%, 52%, 0.65)`);
      grad.addColorStop(0.5, `hsla(${(this.hueOffset + 25) % 360}, 70%, 58%, 0.85)`);
      grad.addColorStop(1, `hsla(${(this.hueOffset + 50) % 360}, 65%, 64%, 0.95)`);
      ctx.fillStyle = grad;

      for (let i = 0; i < count; i++) {
        const rawVal = bars[count - 1 - i];
        const shapedVal = Math.pow(Math.max(0, Math.min(1.0, rawVal)), 1.12);
        const targetWidth = Math.max(6, shapedVal * maxBarWidth);

        if (!peakBuffer[i] || targetWidth > peakBuffer[i]) {
          peakBuffer[i] = targetWidth;
        } else {
          peakBuffer[i] = Math.max(targetWidth, peakBuffer[i] - (w * 2.5 * dt));
        }

        const barWidth = peakBuffer[i];
        const y = i * slot + (gap / 2);
        const x = isLeftEdge ? 0 : (w - barWidth);
        const r = Math.max(0, Math.min(barWidth * 0.5, barHeight * 0.5, 3));

        ctx.beginPath();
        const radii = isLeftEdge ? [0, r, r, 0] : [r, 0, 0, r];
        try {
          if (typeof ctx.roundRect === 'function') {
            ctx.roundRect(x, y, barWidth, barHeight, radii);
          } else {
            ctx.rect(x, y, barWidth, barHeight);
          }
        } catch (e) {
          ctx.rect(x, y, barWidth, barHeight);
        }
        ctx.fill();
      }
    }

    renderSpectrum(ctx, canvas, count, dpr, dt, maxHeight, bottomOffset, peakBuffer, variationBuffer) {
      const w = canvas.width / dpr, h = canvas.height / dpr;
      if (w <= 0 || h <= 0) return;
      ctx.clearRect(0, 0, w, h);
      const slot = w / count, barWidth = Math.max(2, slot * 0.65), gap = slot - barWidth;
      const bars = this.getBars(count, variationBuffer);

      const grad = ctx.createLinearGradient(0, h - bottomOffset - maxHeight, 0, h - bottomOffset);
      grad.addColorStop(0, `hsla(${this.hueOffset}, 80%, 65%, 0.95)`);
      grad.addColorStop(0.5, `hsla(${(this.hueOffset + 25) % 360}, 70%, 55%, 0.85)`);
      grad.addColorStop(1, `hsla(${(this.hueOffset + 50) % 360}, 60%, 45%, 0.60)`);
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
        const r = Math.max(0, Math.min(barWidth * 0.5, barHeight * 0.5, 3));
        ctx.beginPath();
        try {
          if (typeof ctx.roundRect === 'function') {
            ctx.roundRect(x, y, barWidth, barHeight, [r, r, 0, 0]);
          } else {
            ctx.rect(x, y, barWidth, barHeight);
          }
        } catch (e) {
          ctx.rect(x, y, barWidth, barHeight);
        }
        ctx.fill();
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

      if (this.mode !== "off") {
        const edgeCount = Math.max(28, Math.min(46, Math.round((this.barCount || 65) * 0.60)));

        if (this.ctxEdgeLeft && this.canvasEdgeLeft && this.canvasEdgeLeft.offsetWidth > 0) {
          const expectedW = Math.round(this.canvasEdgeLeft.offsetWidth * dpr);
          const expectedH = Math.round(this.canvasEdgeLeft.offsetHeight * dpr);
          if (this.canvasEdgeLeft.width !== expectedW || this.canvasEdgeLeft.height !== expectedH) {
            this.canvasEdgeLeft.width = expectedW;
            this.canvasEdgeLeft.height = expectedH;
            this.ctxEdgeLeft.setTransform(dpr, 0, 0, dpr, 0, 0);
          }
          if (this.edgeLeftPeaks.length !== edgeCount) this.edgeLeftPeaks = new Float32Array(edgeCount);
          if (this.edgeLeftVariations.length !== edgeCount) this.edgeLeftVariations = this.generateVariations(edgeCount, this.trackSeed + 1);
          this.renderEdgeSpectrum(this.ctxEdgeLeft, this.canvasEdgeLeft, edgeCount, dpr, dt, this.edgeLeftPeaks, this.edgeLeftVariations, true);
        }

        if (this.ctxEdgeRight && this.canvasEdgeRight && this.canvasEdgeRight.offsetWidth > 0) {
          const expectedW = Math.round(this.canvasEdgeRight.offsetWidth * dpr);
          const expectedH = Math.round(this.canvasEdgeRight.offsetHeight * dpr);
          if (this.canvasEdgeRight.width !== expectedW || this.canvasEdgeRight.height !== expectedH) {
            this.canvasEdgeRight.width = expectedW;
            this.canvasEdgeRight.height = expectedH;
            this.ctxEdgeRight.setTransform(dpr, 0, 0, dpr, 0, 0);
          }
          if (this.edgeRightPeaks.length !== edgeCount) this.edgeRightPeaks = new Float32Array(edgeCount);
          if (this.edgeRightVariations.length !== edgeCount) this.edgeRightVariations = this.generateVariations(edgeCount, this.trackSeed + 2);
          this.renderEdgeSpectrum(this.ctxEdgeRight, this.canvasEdgeRight, edgeCount, dpr, dt, this.edgeRightPeaks, this.edgeRightVariations, false);
        }
      }

      if (this.mode === "full" && this.ctxFull && this.canvasFull && this.canvasFull.offsetHeight > 0) {
        const count = this.barCount || 65;
        if (this.fullPeaks.length !== count) this.fullPeaks = new Float32Array(count);
        if (this.fullVariations.length !== count) this.fullVariations = this.generateVariations(count, this.trackSeed);
        this.renderSpectrum(this.ctxFull, this.canvasFull, count, dpr, dt, (this.canvasFull.height / dpr) - 6, 0, this.fullPeaks, this.fullVariations);
      } else if (this.mode === "box" && this.ctxBox && this.canvasBox && this.canvasBox.offsetHeight > 0) {
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