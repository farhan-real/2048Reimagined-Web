(function() {
  class PrecompiledVisualizer {
    constructor() {
      this.trackSeeds = new Map();
      this.init();
    }

    init() {
      if (window.MusicData && typeof window.MusicData.getAvailableTracks === 'function') {
        const tracks = window.MusicData.getAvailableTracks();
        tracks.forEach(track => this.registerTrack(track.id));
      }
    }

    hashString(str) {
      let h = 2166136261 >>> 0;
      for (let i = 0; i < str.length; i++) {
        h = Math.imul(h ^ str.charCodeAt(i), 16777619);
        h += h << 13; h ^= h >>> 7;
      }
      return (h >>> 0);
    }

    registerTrack(trackId) {
      if (!this.trackSeeds.has(trackId)) {
        const seed = this.hashString(trackId);
        const bpm = 126 + (seed % 28);
        this.trackSeeds.set(trackId, { seed, bpm, beatSec: 60 / bpm });
      }
    }

    getBars(trackId, timeSeconds, count, variations, intensityMult = 1.0) {
      if (!this.trackSeeds.has(trackId)) {
        this.registerTrack(trackId);
      }
      const info = this.trackSeeds.get(trackId) || { seed: 1337, bpm: 132, beatSec: 60 / 132 };
      const out = new Float32Array(count);
      const t = Math.max(0, timeSeconds);
      const beatSec = info.beatSec;

      const beatPos = (t % beatSec) / beatSec;
      const kick = Math.exp(-beatPos * 3.8);

      const beatIndex = Math.floor(t / beatSec);
      const isSnareBeat = (beatIndex % 2) === 1;
      const snare = isSnareBeat ? Math.exp(-beatPos * 3.2) : 0;

      const sixteenthSec = beatSec / 4;
      const sixteenthPos = (t % sixteenthSec) / sixteenthSec;
      const tick = Math.exp(-sixteenthPos * 4.5);

      const arpPhase = t * (info.bpm / 6.0);
      const measurePhase = (t % 16.0) / 16.0;
      const intensity = (0.84 + 0.16 * Math.sin(measurePhase * Math.PI * 2)) * intensityMult;

      for (let i = 0; i < count; i++) {
        const fraction = i / Math.max(1, count - 1);

        // Continuous harmonic spectral model with smooth overlapping envelopes
        const bassWeight = Math.exp(-Math.pow(fraction / 0.28, 2));
        const kickContrib = kick * 0.62 * bassWeight;
        const bassDrive = Math.max(0, Math.sin(t * 24.0 + fraction * 7.0)) * 0.24 * bassWeight;

        const midWeight = Math.exp(-Math.pow((fraction - 0.44) / 0.28, 2));
        const arpWave = Math.sin(arpPhase + fraction * 11.0);
        const leadSynth = Math.max(0, arpWave) * 0.44 * midWeight;

        const snareWeight = 0.55 * Math.exp(-Math.pow((fraction - 0.32) / 0.20, 2)) +
                            0.45 * Math.exp(-Math.pow((fraction - 0.62) / 0.22, 2));
        const snareContrib = snare * 0.38 * snareWeight;

        const trebleWeight = Math.pow(fraction, 1.25);
        const trebleGroove = Math.sin(t * 38.0 + fraction * 16.0) * 0.18;
        const trebleContrib = (tick * 0.48 + Math.max(0, trebleGroove)) * trebleWeight;

        const baseFloor = 0.25 + 0.12 * (1.0 - fraction * 0.6);
        const ripple = Math.sin(t * 5.0 - fraction * 6.0) * 0.07 * Math.sin(fraction * Math.PI);

        const energy = baseFloor + kickContrib + bassDrive + leadSynth + snareContrib + trebleContrib + ripple;
        const boosted = Math.pow(Math.max(0.05, energy), 0.82) * 1.35 * intensity;
        const edgeSoftener = 0.86 + 0.14 * Math.sin(fraction * Math.PI);
        const variation = (variations && variations[i]) ? variations[i] : 1.0;

        out[i] = Math.max(0.14 * intensityMult, Math.min(1.0, boosted * edgeSoftener * variation));
      }

      return out;
    }
  }

  window.PrecompiledVisualizer = new PrecompiledVisualizer();
})();