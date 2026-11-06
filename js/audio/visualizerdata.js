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
      const snare = isSnareBeat ? Math.exp(-beatPos * 3.3) : 0;

      const sixteenthSec = beatSec / 4;
      const sixteenthPos = (t % sixteenthSec) / sixteenthSec;
      const tick = Math.exp(-sixteenthPos * 4.4);

      const arpPhase = t * (info.bpm / 5.6);
      const measurePhase = (t % 16.0) / 16.0;
      const intensity = (0.84 + 0.16 * Math.sin(measurePhase * Math.PI * 2)) * intensityMult;

      for (let i = 0; i < count; i++) {
        const fraction = i / Math.max(1, count - 1);

        // Targeted harmonic frequency envelopes with natural peak focus
        const bassWeight = Math.exp(-Math.pow(fraction / 0.24, 2));
        const kickContrib = kick * 0.65 * bassWeight;
        const bassDrive = Math.max(0, Math.sin(t * 22.0 + fraction * 8.0)) * 0.22 * bassWeight;

        const midWeight = Math.exp(-Math.pow((fraction - 0.44) / 0.25, 2));
        const arpWave = Math.sin(arpPhase + fraction * 13.0);
        const leadSynth = Math.max(0, arpWave) * 0.44 * midWeight;

        const snareWeight = 0.55 * Math.exp(-Math.pow((fraction - 0.32) / 0.18, 2)) +
                            0.45 * Math.exp(-Math.pow((fraction - 0.60) / 0.20, 2));
        const snareContrib = snare * 0.38 * snareWeight;

        const trebleWeight = Math.pow(fraction, 1.22);
        const trebleGroove = Math.sin(t * 36.0 + fraction * 18.0) * 0.17;
        const trebleContrib = (tick * 0.46 + Math.max(0, trebleGroove)) * trebleWeight;

        // Comb modulation gives individual bins character and prevents flat grouping
        const combRipple = Math.sin(fraction * 36.0 + t * 6.5) * 0.07 +
                           Math.cos(fraction * 58.0 + t * 4.5) * 0.05;

        const baseFloor = 0.20 + 0.10 * (1.0 - fraction * 0.5);
        const macroRipple = Math.sin(t * 4.5 - fraction * 5.5) * 0.06 * Math.sin(fraction * Math.PI);

        const rawEnergy = (baseFloor + kickContrib + bassDrive + leadSynth + snareContrib + trebleContrib + combRipple + macroRipple) * intensity;
        const variation = (variations && variations[i]) ? variations[i] : 1.0;

        // Monotonic hyperbolic tangent compression scales peaks with power while avoiding hard clipping
        const compressed = Math.tanh(rawEnergy * 1.08) * variation;
        const edgeSoftener = 0.88 + 0.12 * Math.sin(fraction * Math.PI);

        out[i] = Math.max(0.12 * intensityMult, Math.min(0.95, compressed * edgeSoftener));
      }

      return out;
    }
  }

  window.PrecompiledVisualizer = new PrecompiledVisualizer();
})();