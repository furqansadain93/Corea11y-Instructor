// Motion files: one sign or performance as bone rotations + face expressions.
// Bone rotations are for VRM normalized bones, so a motion recorded with one
// avatar plays on any other VRM avatar.

import * as THREE from 'three';

export const MOTION_FORMAT = 'corea11y-motion';
export const MOTION_VERSION = 1;

export class MotionRecorder {
  constructor(meta = {}) {
    this.meta = meta;
    this.frames = [];
  }
  // gaze: { yaw, pitch } in degrees or null. raw: encodeRaw(tracking) or null.
  add(t, bones, expressions, gaze = null, raw = null) {
    const e = {};
    for (const [k, v] of Object.entries(expressions || {})) if (v > 0.005) e[k] = Math.round(v * 1000) / 1000;
    const f = { t: Math.round(t * 1000) / 1000, b: bones, e };
    if (gaze) f.g = [Math.round(gaze.yaw * 100) / 100, Math.round(gaze.pitch * 100) / 100];
    if (raw) f.raw = raw;
    this.frames.push(f);
  }
  clear() { this.frames = []; }
  get duration() { return this.frames.length ? this.frames[this.frames.length - 1].t : 0; }
  toJSON() {
    const names = new Set();
    for (const f of this.frames) for (const k of Object.keys(f.b)) names.add(k);
    const bones = [...names];
    return {
      format: MOTION_FORMAT,
      version: MOTION_VERSION,
      created: new Date().toISOString(),
      ...this.meta,
      duration: this.duration,
      bones,
      frames: this.frames.map((f) => {
        const out = { t: f.t, q: bones.map((n) => f.b[n] || [0, 0, 0, 1]), e: f.e };
        if (f.g) out.g = f.g;
        if (f.raw) out.raw = f.raw;
        return out;
      }),
    };
  }
}

export function validateMotion(data) {
  if (!data || data.format !== MOTION_FORMAT) throw new Error('Not a Corea11y motion file.');
  if (data.version !== MOTION_VERSION) throw new Error(`Unsupported motion file version ${data.version}.`);
  if (!Array.isArray(data.bones) || !Array.isArray(data.frames) || data.frames.length === 0) throw new Error('Motion file has no frames.');
  for (const f of data.frames) {
    if (typeof f.t !== 'number' || !Array.isArray(f.q) || f.q.length !== data.bones.length) throw new Error('Motion file is damaged.');
  }
  return data;
}

// ---- Raw tracking data (so recordings can be re-processed later) ----

const r4 = (v) => Math.round(v * 10000) / 10000;

// faceIdx: which face mesh points to keep (the ones the lab uses).
export function encodeRaw(r, faceIdx) {
  if (!r) return null;
  const hand = (h) => (h ? { w: h.world.map((p) => [r4(p.x), r4(p.y), r4(p.z)]), i: h.img.map((p) => [r4(p.x), r4(p.y)]) } : null);
  const bs = {};
  if (r.blendshapes) for (const [k, v] of Object.entries(r.blendshapes)) if (v > 0.003) bs[k] = r4(v);
  return {
    w: r.width,
    h: r.height,
    p: r.pose ? r.pose.map((q) => [r4(q.x), r4(q.y), r4(q.z), r4(q.visibility ?? 1)]) : null,
    pi: r.poseImg ? r.poseImg.map((q) => [r4(q.x), r4(q.y), r4(q.visibility ?? 1)]) : null,
    hl: hand(r.hands?.left),
    hr: hand(r.hands?.right),
    f: r.face ? { i: faceIdx, p: faceIdx.map((k) => { const q = r.face.landmarks[k]; return [r4(q.x), r4(q.y), r4(q.z)]; }) } : null,
    bs: r.blendshapes ? bs : null,
  };
}

export function decodeRaw(e) {
  if (!e) return null;
  const pt3 = (a) => ({ x: a[0], y: a[1], z: a[2] });
  const hand = (h) => (h ? { world: h.w.map(pt3), img: h.i.map((a) => ({ x: a[0], y: a[1], z: 0 })) } : null);
  let face = null;
  if (e.f) {
    const lm = [];
    e.f.i.forEach((k, j) => { lm[k] = pt3(e.f.p[j]); });
    face = { landmarks: lm, width: e.w, height: e.h };
  }
  return {
    width: e.w,
    height: e.h,
    pose: e.p ? e.p.map((a) => ({ x: a[0], y: a[1], z: a[2], visibility: a[3] })) : null,
    poseImg: e.pi ? e.pi.map((a) => ({ x: a[0], y: a[1], z: 0, visibility: a[2] })) : null,
    hands: { left: hand(e.hl), right: hand(e.hr) },
    face,
    blendshapes: e.bs,
  };
}

const _a = new THREE.Quaternion();
const _b = new THREE.Quaternion();

// Returns { bones: {name: [x,y,z,w]}, expressions: {name: v} } at time t, interpolated.
export function sampleMotion(data, t) {
  const fr = data.frames;
  let i = 0;
  if (t <= fr[0].t) i = 0;
  else if (t >= fr[fr.length - 1].t) i = fr.length - 1;
  else {
    let lo = 0;
    let hi = fr.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (fr[mid].t <= t) lo = mid; else hi = mid;
    }
    i = lo;
  }
  const f0 = fr[i];
  const f1 = fr[Math.min(i + 1, fr.length - 1)];
  const span = f1.t - f0.t;
  const k = span > 0 ? Math.min(1, Math.max(0, (t - f0.t) / span)) : 0;
  const bones = {};
  data.bones.forEach((name, j) => {
    _a.fromArray(f0.q[j]);
    _b.fromArray(f1.q[j]);
    _a.slerp(_b, k);
    bones[name] = [_a.x, _a.y, _a.z, _a.w];
  });
  const expressions = {};
  const keys = new Set([...Object.keys(f0.e || {}), ...Object.keys(f1.e || {})]);
  for (const key of keys) expressions[key] = (f0.e?.[key] ?? 0) * (1 - k) + (f1.e?.[key] ?? 0) * k;
  let gaze = null;
  if (f0.g || f1.g) {
    const g0 = f0.g || [0, 0];
    const g1 = f1.g || [0, 0];
    gaze = { yaw: g0[0] * (1 - k) + g1[0] * k, pitch: g0[1] * (1 - k) + g1[1] * k };
  }
  return { bones, expressions, gaze };
}
