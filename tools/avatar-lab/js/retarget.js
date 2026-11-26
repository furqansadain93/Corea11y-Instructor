// Turns MediaPipe landmarks into rotations of a VRM avatar's normalized
// humanoid bones (three-vrm). Works for any VRM 0.x or 1.0 avatar, because
// normalized bones all start from the same T-pose with no rotation.
//
// Coordinates: MediaPipe world landmarks use x = image right, y = down,
// z = away from the camera. The signer faces the camera, so the avatar faces
// the viewer and keeps the signer's handedness (the signer's left hand drives
// the avatar's left hand). No mirroring.

import * as THREE from 'three';

export const POSE = {
  nose: 0,
  leftEye: 2, rightEye: 5,
  leftIndex: 19, rightIndex: 20,
  leftShoulder: 11, rightShoulder: 12,
  leftElbow: 13, rightElbow: 14,
  leftWrist: 15, rightWrist: 16,
  leftHip: 23, rightHip: 24,
};

// Hand landmark chains (MediaPipe hand indices) and the VRM bones they drive.
export const FINGERS = [
  { name: 'Thumb', bones: ['ThumbMetacarpal', 'ThumbProximal', 'ThumbDistal'], idx: [1, 2, 3, 4] },
  { name: 'Index', bones: ['IndexProximal', 'IndexIntermediate', 'IndexDistal'], idx: [5, 6, 7, 8] },
  { name: 'Middle', bones: ['MiddleProximal', 'MiddleIntermediate', 'MiddleDistal'], idx: [9, 10, 11, 12] },
  { name: 'Ring', bones: ['RingProximal', 'RingIntermediate', 'RingDistal'], idx: [13, 14, 15, 16] },
  { name: 'Little', bones: ['LittleProximal', 'LittleIntermediate', 'LittleDistal'], idx: [17, 18, 19, 20] },
];

// Face mesh landmarks used for head orientation.
export const FACE = { forehead: 10, chin: 152, rightEyeOuter: 33, leftEyeOuter: 263 };

const SIDES = ['left', 'right'];

export const BONES = (() => {
  const list = ['spine', 'chest', 'upperChest', 'neck', 'head'];
  for (const side of SIDES) {
    list.push(`${side}Shoulder`, `${side}UpperArm`, `${side}LowerArm`, `${side}Hand`);
    for (const f of FINGERS) for (const b of f.bones) list.push(`${side}${b}`);
  }
  return list;
})();

const DEG = Math.PI / 180;
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _qa = new THREE.Quaternion();
const _qb = new THREE.Quaternion();
const _v = new THREE.Vector3();
const IDENTITY = new THREE.Quaternion();

function smoothstep(a, b, x) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

// Rotation whose x axis is `primary` and whose xy plane contains `secondary`.
export function basisQuat(primary, secondary, out = new THREE.Quaternion()) {
  const x = primary.clone().normalize();
  const z = new THREE.Vector3().crossVectors(x, secondary);
  if (z.lengthSq() < 1e-10) return null;
  z.normalize();
  const y = new THREE.Vector3().crossVectors(z, x);
  _m.makeBasis(x, y, z);
  return out.setFromRotationMatrix(_m);
}

// Rotation that turns the rest frame (rP, rS) into the target frame (tP, tS).
export function frameRotation(tP, tS, rP, rS) {
  const qt = basisQuat(tP, tS);
  const qr = basisQuat(rP, rS);
  if (!qt || !qr) return null;
  return qt.multiply(qr.invert());
}

export class Retargeter {
  constructor(vrm) {
    this.vrm = vrm;
    this.h = vrm.humanoid;
    this.nodes = {};
    for (const name of BONES) {
      const n = this.h.getNormalizedBoneNode(name);
      if (n) this.nodes[name] = n;
    }
    this.h.resetNormalizedPose();
    vrm.scene.updateMatrixWorld(true);
    this._computeRest();
    this.headBias = new THREE.Quaternion();
    this.resetTracking();
  }

  // Forget per-signer measurements (arm length, eye distance). Call per video.
  resetTracking() {
    this.signerArm = { left: null, right: null };
    this.signerEyeDist = null;
  }

  resetNeutral() {
    this.headBias.identity();
  }

  // Position of a bone in rig space (relative to vrm.scene).
  rigPos(node, out = new THREE.Vector3()) {
    node.getWorldPosition(out);
    return this.vrm.scene.worldToLocal(out);
  }

  // Orientation of a node in rig space.
  rigQuat(node, out = new THREE.Quaternion()) {
    node.getWorldQuaternion(out);
    this.vrm.scene.getWorldQuaternion(_qa);
    return out.premultiply(_qa.invert());
  }

  _computeRest() {
    const n = this.nodes;
    const lua = this.rigPos(n.leftUpperArm);
    const rua = this.rigPos(n.rightUpperArm);
    this.restLeft = lua.clone().sub(rua).normalize();
    // +1 when the avatar's left side is +x in rig space (VRM 1.0), -1 for VRM 0.x.
    this.s = this.restLeft.x >= 0 ? 1 : -1;
    this.restUp = new THREE.Vector3(0, 1, 0);
    const lul = this.rigPos(this.h.getNormalizedBoneNode('leftUpperLeg'));
    const rul = this.rigPos(this.h.getNormalizedBoneNode('rightUpperLeg'));
    this.restTorsoUp = lua.clone().add(rua).sub(lul).sub(rul).normalize();
    this.forward = new THREE.Vector3(0, 0, this.s);
    this.rest = {};
    for (const side of SIDES) {
      const r = {};
      r.upper = n[`${side}LowerArm`].position.clone().normalize();
      r.fore = n[`${side}Hand`].position.clone().normalize();
      const mid = n[`${side}MiddleProximal`];
      r.handDir = mid ? mid.position.clone().normalize() : r.fore.clone();
      const ip = n[`${side}IndexProximal`];
      const lp = n[`${side}LittleProximal`];
      r.palm = ip && lp
        ? new THREE.Vector3().crossVectors(ip.position, lp.position).normalize()
        : new THREE.Vector3(0, -1, 0);
      r.finger = {};
      for (const f of FINGERS) {
        for (let i = 0; i < 3; i++) {
          const bone = n[`${side}${f.bones[i]}`];
          if (!bone) continue;
          const child = i < 2 ? n[`${side}${f.bones[i + 1]}`] : null;
          const dir = (child ? child.position : bone.position).clone();
          r.finger[f.bones[i]] = dir.lengthSq() > 1e-12 ? dir.normalize() : r.handDir.clone();
        }
      }
      r.upperLen = n[`${side}LowerArm`].position.length();
      r.foreLen = n[`${side}Hand`].position.length();
      // Index knuckle relative to the wrist (rest pose, rig space).
      r.knuckle = ip ? ip.position.clone() : r.fore.clone().multiplyScalar(0.08);
      this.rest[side] = r;
    }

    // Face anchor: middle of the eyes, on the face surface. Used to keep hand
    // contact with the face when the avatar's head size differs from the signer's.
    const head = this.rigPos(n.head);
    const le = this.h.getNormalizedBoneNode('leftEye');
    const re = this.h.getNormalizedBoneNode('rightEye');
    let eyesMid;
    if (le && re) {
      const a = this.rigPos(le);
      const b = this.rigPos(re);
      this.avatarEyeDist = a.distanceTo(b);
      eyesMid = a.add(b).multiplyScalar(0.5);
    } else {
      this.avatarEyeDist = lua.distanceTo(rua) * 0.17;
      eyesMid = head.clone().addScaledVector(this.restUp, this.avatarEyeDist).addScaledVector(this.forward, this.avatarEyeDist);
    }
    // Eye bones sit at the eyeball centre; landmarks are on the surface.
    eyesMid.addScaledVector(this.forward, this.avatarEyeDist * 0.2);
    this.eyeLocal = eyesMid.sub(head);
  }

  // Avatar eye points (rig space) for the current head pose.
  avatarEyes() {
    const q = this.rigQuat(this.nodes.head, new THREE.Quaternion());
    const mid = this.rigPos(this.nodes.head).add(this.eyeLocal.clone().applyQuaternion(q));
    const lat = this.restLeft.clone().applyQuaternion(q).multiplyScalar(this.avatarEyeDist / 2);
    return { mid, left: mid.clone().add(lat), right: mid.clone().sub(lat) };
  }

  // MediaPipe point (x right, y down, z away) -> rig space vector.
  toRig(p, out = new THREE.Vector3()) {
    return out.set(p.x * this.s, -p.y, -p.z * this.s);
  }

  // Inverse of toRig (used by tests to make synthetic landmarks).
  fromRig(v) {
    return { x: v.x * this.s, y: -v.y, z: -v.z * this.s, visibility: 1 };
  }

  setRig(node, rigRotation) {
    if (!node) return;
    const parentRig = this.rigQuat(node.parent, _qb);
    node.quaternion.copy(parentRig.invert().multiply(rigRotation));
    node.updateMatrixWorld(true);
  }

  // Rotate `node` so that its rest direction points along `targetRig`,
  // keeping twist relative to the parent.
  swingTo(node, restLocalDir, targetRig) {
    if (!node || targetRig.lengthSq() < 1e-12) return;
    const parentRig = this.rigQuat(node.parent, _qb);
    const local = targetRig.clone().applyQuaternion(parentRig.invert()).normalize();
    node.quaternion.setFromUnitVectors(restLocalDir, local);
    node.updateMatrixWorld(true);
  }

  // Natural standing pose: arms down along the body.
  restPose() {
    this.h.resetNormalizedPose();
    this.vrm.scene.updateMatrixWorld(true);
    for (const side of SIDES) {
      const r = this.rest[side];
      const down = new THREE.Vector3(r.upper.x * 0.25, -1, 0.05 * this.s).normalize();
      this.swingTo(this.nodes[`${side}UpperArm`], r.upper, down);
      const fore = new THREE.Vector3(r.upper.x * 0.1, -1, 0.15 * this.s).normalize();
      this.swingTo(this.nodes[`${side}LowerArm`], r.fore, fore);
    }
  }

  /**
   * frame = {
   *   pose: 33 world landmarks or null,
   *   hands: { left: {world: 21 landmarks} | null, right: ... },
   *   face: { landmarks: 478 normalized landmarks, width, height } | null,
   * }
   * opts = {
   *   torso: 0..1,
   *   head: true,
   *   contact: true,     keep hand-to-face/body positions across body proportions
   *   calibrate: false,  treat this frame's head as the signer's neutral head
   * }
   */
  apply(frame, opts = {}) {
    const torsoAmount = opts.torso ?? 1;
    const n = this.nodes;
    const P = frame.pose ? frame.pose.map((p) => this.toRig(p)) : null;

    // Torso
    if (P) {
      const lat = P[POSE.leftShoulder].clone().sub(P[POSE.rightShoulder]);
      let up = this.restTorsoUp.clone();
      const pose = frame.pose;
      const hipsVisible = (pose[POSE.leftHip].visibility ?? 1) > 0.5 && (pose[POSE.rightHip].visibility ?? 1) > 0.5;
      if (hipsVisible) {
        const sh = P[POSE.leftShoulder].clone().add(P[POSE.rightShoulder]).multiplyScalar(0.5);
        const hip = P[POSE.leftHip].clone().add(P[POSE.rightHip]).multiplyScalar(0.5);
        up = sh.sub(hip);
      }
      // Shoulder line first (most reliable), lean from the hips second.
      let R = frameRotation(lat, up, this.restLeft, this.restTorsoUp);
      if (R) {
        R = IDENTITY.clone().slerp(R, torsoAmount);
        this.setRig(n.spine, IDENTITY.clone().slerp(R, 0.5));
        this.setRig(n.chest || n.upperChest, R);
        if (n.chest && n.upperChest) this.setRig(n.upperChest, R);
      }
    }

    // Head (from face mesh)
    if (frame.face && opts.head !== false) {
      const { landmarks: F, width = 1, height = 1 } = frame.face;
      const pt = (i) => this.toRig({ x: F[i].x * width, y: F[i].y * height, z: F[i].z * width });
      const up = pt(FACE.forehead).sub(pt(FACE.chin));
      const lat = pt(FACE.leftEyeOuter).sub(pt(FACE.rightEyeOuter));
      let R = frameRotation(up, lat, this.restUp, this.restLeft);
      if (R) {
        // Neutral calibration: R_measured = R_true * bias, and at neutral the
        // head follows the chest.
        if (opts.calibrate) {
          const chest = this.rigQuat(n.neck ? n.neck.parent : n.head.parent, new THREE.Quaternion());
          this.headBias.copy(chest.invert().multiply(R));
        }
        R = R.multiply(this.headBias.clone().invert());
        if (n.neck) {
          const parentRig = this.rigQuat(n.neck.parent, new THREE.Quaternion());
          this.setRig(n.neck, parentRig.slerp(R, 0.5));
        }
        this.setRig(n.head, R);
      }
    }

    // Arms, hands, fingers
    for (const side of SIDES) {
      const r = this.rest[side];
      const hand = frame.hands ? frame.hands[side] : null;
      const H = hand && hand.world ? hand.world.map((p) => this.toRig(p)) : null;
      const palm = H ? new THREE.Vector3().crossVectors(H[5].clone().sub(H[0]), H[17].clone().sub(H[0])) : null;
      const handR = H ? frameRotation(H[9].clone().sub(H[0]), palm, r.handDir, r.palm) : null;

      if (P) {
        const sh = P[POSE[`${side}Shoulder`]];
        const el = P[POSE[`${side}Elbow`]];
        const wr = P[POSE[`${side}Wrist`]];
        let upper = el.clone().sub(sh);
        let fore = wr.clone().sub(el);
        if (opts.contact !== false) {
          const ik = this._contactArm(side, P, frame.pose, handR);
          if (ik) { upper = ik.upper; fore = ik.fore; }
        }

        // Upper arm: direction, plus twist from the elbow bend when it is bent.
        const swing = new THREE.Quaternion().setFromUnitVectors(r.upper, upper.clone().normalize());
        const bend = upper.angleTo(fore);
        const basis = frameRotation(upper, fore, r.upper, this.forward);
        const w = basis ? smoothstep(10 * DEG, 30 * DEG, bend) : 0;
        this.setRig(n[`${side}UpperArm`], basis ? swing.slerp(basis, w) : swing);

        // Lower arm: direction, plus forearm twist from the palm when visible.
        const foreR = palm ? frameRotation(fore, palm, r.fore, r.palm) : null;
        if (foreR) this.setRig(n[`${side}LowerArm`], foreR);
        else this.swingTo(n[`${side}LowerArm`], r.fore, fore);
      }

      if (H) {
        if (handR) this.setRig(n[`${side}Hand`], handR);
        for (const f of FINGERS) {
          for (let i = 0; i < 3; i++) {
            const bone = n[`${side}${f.bones[i]}`];
            if (!bone) continue;
            const a = H[f.idx[i]];
            const b = H[f.idx[i + 1]];
            this.swingTo(bone, r.finger[f.bones[i]], b.clone().sub(a));
          }
        }
      }
    }
  }

  /**
   * Where should the avatar's hand go? Angles alone put the hand in the wrong
   * place when the avatar's arms or head differ in size from the signer's
   * (a cartoon head is bigger, arms shorter). So the index knuckle is placed:
   *  - near the face: relative to the eyes, scaled by eye distance;
   *  - elsewhere: relative to the shoulder, scaled by arm length;
   * blended by how close the hand is to the face. The arm then reaches it
   * with two-bone IK, keeping the signer's elbow direction.
   */
  _contactArm(side, P, pose, handR) {
    const r = this.rest[side];
    const n = this.nodes;
    const vis = (i) => pose[i].visibility ?? 1;
    const S_s = P[POSE[`${side}Shoulder`]];
    const E_s = P[POSE[`${side}Elbow`]];
    const W_s = P[POSE[`${side}Wrist`]];
    const K_s = P[POSE[`${side}Index`]];
    if (vis(POSE[`${side}Index`]) < 0.3) return null;

    const ema = (prev, v, k) => (prev === null ? v : prev + (v - prev) * k);
    const armLen = E_s.distanceTo(S_s) + W_s.distanceTo(E_s);
    if (armLen < 1e-6) return null;
    this.signerArm[side] = ema(this.signerArm[side], armLen, 0.05);
    const a = r.upperLen;
    const b = r.foreLen;
    const S_a = this.rigPos(n[`${side}UpperArm`]);

    const target = S_a.clone().addScaledVector(K_s.clone().sub(S_s), (a + b) / this.signerArm[side]);

    if (vis(POSE.leftEye) > 0.5 && vis(POSE.rightEye) > 0.5) {
      const eyes = P[POSE.leftEye].clone().add(P[POSE.rightEye]).multiplyScalar(0.5);
      const ed = P[POSE.leftEye].distanceTo(P[POSE.rightEye]);
      if (ed > 1e-6) {
        this.signerEyeDist = ema(this.signerEyeDist, ed, 0.05);
        const dist = K_s.distanceTo(eyes) / this.signerEyeDist;
        const w = 1 - smoothstep(2.5, 5, dist);
        if (w > 0) {
          const faceT = this.avatarEyes().mid.addScaledVector(K_s.clone().sub(eyes), this.avatarEyeDist / this.signerEyeDist);
          target.lerp(faceT, w);
        }
      }
    }

    const knuckle = handR
      ? r.knuckle.clone().applyQuaternion(handR)
      : K_s.clone().sub(W_s).normalize().multiplyScalar(r.knuckle.length());
    const T = target.sub(knuckle);

    // Two-bone IK in the plane of the signer's elbow.
    const ST = T.clone().sub(S_a);
    let d = ST.length();
    if (d < 1e-6) return null;
    const u = ST.divideScalar(d);
    d = Math.min(Math.max(d, Math.abs(a - b) + 1e-4), (a + b) * (1 - 1e-6));
    const cosA = (a * a + d * d - b * b) / (2 * a * d);
    const sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));
    const sw = W_s.clone().sub(S_s).normalize();
    let pole = E_s.clone().sub(S_s);
    pole.addScaledVector(sw, -pole.dot(sw));
    pole.addScaledVector(u, -pole.dot(u));
    if (pole.lengthSq() < 1e-10) {
      pole = new THREE.Vector3(0, -1, 0).addScaledVector(u, u.y);
    }
    pole.normalize();
    const E_a = S_a.clone().addScaledVector(u, a * cosA).addScaledVector(pole, a * sinA);
    const T_a = S_a.clone().addScaledVector(u, d);
    return { upper: E_a.clone().sub(S_a), fore: T_a.sub(E_a) };
  }

  getBoneQuats(precision = 5) {
    const out = {};
    const k = 10 ** precision;
    for (const [name, node] of Object.entries(this.nodes)) {
      const q = node.quaternion;
      out[name] = [q.x, q.y, q.z, q.w].map((v) => Math.round(v * k) / k);
    }
    return out;
  }

  setBoneQuats(quats) {
    for (const [name, q] of Object.entries(quats)) {
      const node = this.nodes[name];
      if (node) node.quaternion.set(q[0], q[1], q[2], q[3]);
    }
  }
}

// Match detected hands to the signer's left/right using the pose wrists.
// (MediaPipe's own handedness label assumes a mirrored selfie image.)
export function assignHands(poseImg, handResult) {
  const out = { left: null, right: null };
  if (!handResult || !handResult.landmarks) return out;
  const hands = handResult.landmarks.map((img, i) => ({ img, world: handResult.worldLandmarks[i], label: handResult.handedness?.[i]?.[0]?.categoryName }));
  if (poseImg) {
    const lw = poseImg[POSE.leftWrist];
    const rw = poseImg[POSE.rightWrist];
    const d = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    if (hands.length === 1) {
      const h = hands[0];
      out[d(h.img[0], lw) <= d(h.img[0], rw) ? 'left' : 'right'] = h;
    } else if (hands.length >= 2) {
      const [a, b] = hands;
      const straight = d(a.img[0], lw) + d(b.img[0], rw);
      const swapped = d(a.img[0], rw) + d(b.img[0], lw);
      if (straight <= swapped) { out.left = a; out.right = b; } else { out.left = b; out.right = a; }
    }
  } else {
    // Non-mirrored video: MediaPipe's "Left" is the signer's right hand.
    for (const h of hands) {
      const side = h.label === 'Left' ? 'right' : 'left';
      if (!out[side]) out[side] = h;
    }
  }
  return out;
}

// ---- Face expressions ----

const clamp01 = (x) => Math.min(1, Math.max(0, x));

/**
 * bs: { blendshapeName: score } from MediaPipe (ARKit names).
 * names: expression names the avatar has.
 * Returns { expressionName: value }.
 * If the avatar has ARKit "perfect sync" expressions (e.g. jawOpen), they are
 * driven directly. Otherwise the standard VRM presets are approximated.
 */
function sideGetter(bs, swapSides, base) {
  return (k) => {
    let key = k;
    if (swapSides) key = k.includes('Left') ? k.replace('Left', 'Right') : k.includes('Right') ? k.replace('Right', 'Left') : k;
    const v = bs[key] ?? 0;
    const b = base?.[key] ?? 0;
    // Neutral calibration: the signer's resting face counts as zero.
    return b > 0 && b < 0.95 ? Math.max(0, (v - b) / (1 - b)) : v;
  };
}

/**
 * Eye gaze from MediaPipe blendshapes. Returns degrees:
 * yaw > 0 = looking to the signer's own left, pitch > 0 = looking up.
 */
export function gazeFromBlendshapes(bs, { swapSides = false, maxYaw = 30, maxPitch = 25 } = {}) {
  if (!bs) return null;
  const get = sideGetter(bs, swapSides, null);
  const yaw = ((get('eyeLookOutLeft') - get('eyeLookInLeft')) + (get('eyeLookInRight') - get('eyeLookOutRight'))) / 2;
  const pitch = (get('eyeLookUpLeft') + get('eyeLookUpRight') - get('eyeLookDownLeft') - get('eyeLookDownRight')) / 2;
  return { yaw: yaw * maxYaw, pitch: pitch * maxPitch };
}

export function mapBlendshapes(bs, names, { gain = 1, swapSides = false, base = null } = {}) {
  const out = {};
  if (!bs) return out;
  const lower = new Map(names.map((n) => [n.toLowerCase(), n]));
  const get = sideGetter(bs, swapSides, base);
  const set = (name, v) => {
    const real = lower.get(name.toLowerCase());
    if (real) out[real] = clamp01(v * gain);
  };

  if (lower.has('jawopen') && lower.has('browinnerup')) {
    for (const k of Object.keys(bs)) if (k !== '_neutral') set(k, get(k));
    return out;
  }

  const avg = (a, b) => (get(a) + get(b)) / 2;
  if (lower.has('blinkleft') && lower.has('blinkright')) {
    set('blinkLeft', get('eyeBlinkLeft'));
    set('blinkRight', get('eyeBlinkRight'));
  } else {
    set('blink', avg('eyeBlinkLeft', 'eyeBlinkRight'));
  }
  set('aa', get('jawOpen') * 1.2);
  set('oh', get('mouthFunnel'));
  set('ou', get('mouthPucker'));
  set('ee', avg('mouthStretchLeft', 'mouthStretchRight') * 1.5);
  set('happy', avg('mouthSmileLeft', 'mouthSmileRight'));
  set('angry', avg('browDownLeft', 'browDownRight'));
  set('sad', avg('mouthFrownLeft', 'mouthFrownRight'));
  set('surprised', Math.max(get('browInnerUp'), avg('browOuterUpLeft', 'browOuterUpRight')) * 0.8 + avg('eyeWideLeft', 'eyeWideRight') * 0.4);
  return out;
}
