// One-Euro filter (Casiez et al. 2012): smooths jitter when still,
// stays responsive when moving fast (important for fingerspelling).

class LowPass {
  constructor() { this.y = null; }
  filter(x, alpha) {
    this.y = this.y === null ? x : alpha * x + (1 - alpha) * this.y;
    return this.y;
  }
}

function alphaFor(cutoff, dt) {
  const tau = 1 / (2 * Math.PI * cutoff);
  return 1 / (1 + tau / dt);
}

export class OneEuro {
  constructor({ minCutoff = 1.0, beta = 0.0, dCutoff = 1.0 } = {}) {
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.dCutoff = dCutoff;
    this.x = new LowPass();
    this.dx = new LowPass();
    this.lastT = null;
    this.lastRaw = null;
  }
  filter(value, t) {
    if (this.lastT === null || t <= this.lastT) {
      this.lastT = t;
      this.lastRaw = value;
      this.dx.filter(0, 1);
      return this.x.filter(value, 1);
    }
    const dt = t - this.lastT;
    this.lastT = t;
    const d = (value - this.lastRaw) / dt;
    this.lastRaw = value;
    const edx = this.dx.filter(d, alphaFor(this.dCutoff, dt));
    const cutoff = this.minCutoff + this.beta * Math.abs(edx);
    return this.x.filter(value, alphaFor(cutoff, dt));
  }
}

// Smooths arrays of landmarks ({x,y,z}) per index and axis.
export class LandmarkSmoother {
  constructor(params) {
    this.params = params;
    this.filters = new Map();
  }
  setParams(params) {
    this.params = params;
    this.filters.clear();
  }
  smooth(key, landmarks, tSeconds) {
    if (!landmarks) return null;
    let set = this.filters.get(key);
    if (!set || set.length !== landmarks.length) {
      set = landmarks.map(() => [new OneEuro(this.params), new OneEuro(this.params), new OneEuro(this.params)]);
      this.filters.set(key, set);
    }
    return landmarks.map((p, i) => ({
      x: set[i][0].filter(p.x, tSeconds),
      y: set[i][1].filter(p.y, tSeconds),
      z: set[i][2].filter(p.z, tSeconds),
      visibility: p.visibility,
    }));
  }
  reset(key) {
    if (key) this.filters.delete(key); else this.filters.clear();
  }
}

export const SMOOTHING_PRESETS = {
  off: null,
  low: { minCutoff: 3.0, beta: 0.5, dCutoff: 1.0 },
  medium: { minCutoff: 1.5, beta: 0.3, dCutoff: 1.0 },
  high: { minCutoff: 0.8, beta: 0.15, dCutoff: 1.0 },
};
