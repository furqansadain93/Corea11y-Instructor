// Turns MediaPipe landmarks into rotations of a VRM avatar's normalized
// humanoid bones (three-vrm). Works for any VRM 0.x or 1.0 avatar, because
// normalized bones all start from the same T-pose with no rotation.
//
// Coordinates: MediaPipe world landmarks use x = image right, y = down,
// z = away from the camera. The signer faces the camera, so the avatar faces
// the viewer and keeps the signer's handedness (the signer's left hand drives
// the avatar's left hand). No mirroring.

import * as THREE from 'three';
import { findAvatarSpots, rigPoint, FACE_SPOTS, HAND_POINTS } from './anchors.js';

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
// Forearm twist limit relative to the upper arm (real range is about ±90°).
export const MAX_FOREARM_TWIST = 100 * DEG;
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

// Split a rotation into swing (bends `axis`) and twist (turns around `axis`):
// q = swing * twist.
export function swingTwist(q, axis) {
  const p = axis.clone().multiplyScalar(axis.dot(new THREE.Vector3(q.x, q.y, q.z)));
  const twist = new THREE.Quaternion(p.x, p.y, p.z, q.w);
  if (twist.lengthSq() < 1e-12) twist.identity(); else twist.normalize();
  const swing = q.clone().multiply(twist.clone().invert());
  return { swing, twist };
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
    this.touch = findAvatarSpots(this);
    this.lastTouch = { left: null, right: null };
    this.headBias = new THREE.Quaternion();
    this.resetTracking();
  }

  // Forget per-signer measurements (arm length, eye distance). Call per video.
  resetTracking() {
    this.signerArm = { left: null, right: null };
    this.signerEyeDist = null;
    // How present each arm and hand is (1 = tracked, 0 = gone): when a hand
    // leaves the camera, the avatar relaxes it instead of freezing it.
    this.presence = { left: { arm: 1, hand: 1 }, right: { arm: 1, hand: 1 } };
    this.prevTwist = { left: 0, right: 0 };
    this.lastT = null;
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
      r.handLen = mid ? mid.position.length() : 0.08;
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

  // Local rotations of the relaxed pose (arms down, fingers softly curled),
  // used when an arm or hand is not tracked.
  _captureRelaxed() {
    const n = this.nodes;
    this.relaxed = {};
    for (const side of SIDES) {
      const r = this.rest[side];
      for (const f of FINGERS) {
        for (const b of f.bones) {
          const node = n[`${side}${b}`];
          if (!node) continue;
          const axis = new THREE.Vector3().crossVectors(r.finger[b], r.palm);
          node.quaternion.setFromAxisAngle(axis.normalize(), (f.name === 'Thumb' ? 8 : 18) * DEG);
        }
      }
    }
    this.vrm.scene.updateMatrixWorld(true);
    for (const [name, node] of Object.entries(this.nodes)) this.relaxed[name] = node.quaternion.clone();
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
    if (!this._capturing) {
      this._capturing = true;
      this._captureRelaxed();
      this._capturing = false;
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
    if (!this.relaxed) this._captureRelaxed();
    const dt = frame.t !== undefined && this.lastT !== null ? Math.min(0.5, Math.max(0, frame.t - this.lastT)) : 1 / 30;
    if (frame.t !== undefined) this.lastT = frame.t;
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

    // Arms, hands, fingers.
    // Pass 1: hand orientation and where each hand should go.
    const arm = {};
    for (const side of SIDES) {
      const r = this.rest[side];
      const hand = frame.hands ? frame.hands[side] : null;
      const H = hand && hand.world ? hand.world.map((p) => this.toRig(p)) : null;
      const palm = H ? new THREE.Vector3().crossVectors(H[5].clone().sub(H[0]), H[17].clone().sub(H[0])) : null;
      const handR = H ? frameRotation(H[9].clone().sub(H[0]), palm, r.handDir, r.palm) : null;
      const a = { H, palm, handR, target: null };
      if (P && opts.contact !== false) a.target = this._contactTarget(side, P, frame.pose);
      arm[side] = a;
    }

    // Pass 2: hands touching each other stay touching, whatever the avatar's
    // shoulder width.
    if (P && opts.contact !== false && arm.left.target && arm.right.target) this._joinHands(P, arm);

    // Pass 3: pose hands and fingers first (their orientation doesn't depend
    // on the arm), then decide where each wrist must go: body/face mapping,
    // or a touch on a body spot detected in the camera image.
    for (const side of SIDES) {
      const a = arm[side];
      const r = this.rest[side];
      if (a.H) this._setHand(side, a.H, a.handR);
      a.wrist = null;
      this.lastTouch[side] = null;
      if (!P || opts.contact === false) continue;
      if (a.target) {
        const kn = a.handR
          ? r.knuckle.clone().applyQuaternion(a.handR)
          : P[POSE[`${side}Index`]].clone().sub(P[POSE[`${side}Wrist`]]).normalize().multiplyScalar(r.knuckle.length());
        a.wrist = a.target.clone().sub(kn);
      }
      const touch = a.H && frame.img ? this._touch(side, frame, a.H, P) : null;
      this.lastTouch[side] = touch;
      if (touch && touch.w > 0) a.wrist = a.wrist ? a.wrist.lerp(touch.wrist, touch.w) : touch.wrist;
    }

    // Pass 4: solve and set the arms; keep the hands' orientation.
    for (const side of SIDES) {
      const { palm, handR, wrist } = arm[side];
      if (!P) continue;
      let upper;
      let fore;
      const ik = wrist ? this._solveArm(side, P, wrist) : null;
      if (ik) {
        ({ upper, fore } = ik);
      } else {
        upper = P[POSE[`${side}Elbow`]].clone().sub(P[POSE[`${side}Shoulder`]]);
        fore = P[POSE[`${side}Wrist`]].clone().sub(P[POSE[`${side}Elbow`]]);
      }
      this._setArm(side, upper, fore, palm);
      if (handR) this.setRig(n[`${side}Hand`], handR);
    }

    // Pass 5: relax arms and hands that are not being tracked.
    for (const side of SIDES) {
      const pr = this.presence[side];
      const pose = frame.pose;
      const vis = (i) => (pose ? pose[i].visibility ?? 1 : 0);
      const armSeen = !!pose && Math.min(vis(POSE[`${side}Elbow`]), vis(POSE[`${side}Wrist`])) > 0.5;
      const handSeen = !!(frame.hands && frame.hands[side]);
      const rate = dt / 0.35; // about a third of a second to relax or come back
      pr.arm = armSeen ? Math.min(1, pr.arm + rate) : Math.max(0, pr.arm - rate);
      pr.hand = handSeen ? Math.min(1, pr.hand + rate * 2) : Math.max(0, pr.hand - rate);
      const armW = 1 - pr.arm;
      const handW = 1 - Math.min(pr.hand, pr.arm);
      if (armW > 0) {
        for (const b of ['UpperArm', 'LowerArm']) {
          const node = n[`${side}${b}`];
          if (node) node.quaternion.slerp(this.relaxed[`${side}${b}`], armW);
        }
      }
      if (handW > 0) {
        for (const [name, node] of Object.entries(n)) {
          if (!name.startsWith(side) || name.includes('Arm') || name.includes('Shoulder')) continue;
          node.quaternion.slerp(this.relaxed[name], handW);
        }
      }
    }
    this.vrm.scene.updateMatrixWorld(true);
  }

  _setHand(side, H, handR) {
    const r = this.rest[side];
    const n = this.nodes;
    if (handR) this.setRig(n[`${side}Hand`], handR);
    for (const f of FINGERS) {
      for (let i = 0; i < 3; i++) {
        const bone = n[`${side}${f.bones[i]}`];
        if (!bone) continue;
        this.swingTo(bone, r.finger[f.bones[i]], H[f.idx[i + 1]].clone().sub(H[f.idx[i]]));
      }
    }
  }

  // Rig-space tip of a finger (thumb, index, middle, ring, little).
  fingerTip(side, finger) {
    const f = FINGERS.find((x) => x.name.toLowerCase() === finger);
    const distal = this.nodes[`${side}${f.bones[2]}`];
    if (!distal) return this.rigPos(this.nodes[`${side}Hand`]);
    const dir = this.rest[side].finger[f.bones[2]].clone().applyQuaternion(this.rigQuat(distal));
    return this.rigPos(distal).addScaledVector(dir, Math.max(0.012, distal.position.length() * 0.8));
  }

  // Rig-space positions of the avatar's touching points (current hand pose).
  handPoints(side) {
    const n = this.nodes;
    const out = {};
    for (const name of ['thumb', 'index', 'middle', 'ring', 'little']) out[name] = this.fingerTip(side, name);
    const palm = this.rigPos(n[`${side}Hand`]);
    let k = 1;
    for (const b of ['IndexProximal', 'MiddleProximal', 'RingProximal', 'LittleProximal']) {
      if (n[`${side}${b}`]) { palm.add(this.rigPos(n[`${side}${b}`])); k++; }
    }
    out.palm = palm.divideScalar(k);
    return out;
  }

  /**
   * Touch detection. In the camera image (where MediaPipe is accurate), is a
   * fingertip or the palm on a body spot (lips, chin, ear, shoulder…)? Depth
   * from a single camera is unreliable, so it is only used to rule out a hand
   * that is clearly in front of the face. If touching, return the wrist
   * position that puts the same finger on the same spot of the avatar.
   */
  _touch(side, frame, H, P) {
    const img = frame.img;
    const hand = img.hands?.[side];
    if (!hand) return null;
    const W = img.width || 1;
    const Hh = img.height || 1;
    const px = (p) => new THREE.Vector2(p.x * W, p.y * Hh);
    const avg2 = (pts) => pts.reduce((s, p) => s.add(p), new THREE.Vector2()).divideScalar(pts.length);
    const F = img.face;
    const PI = img.pose;
    const faceW = F && F[234] && F[454] ? px(F[234]).distanceTo(px(F[454])) : null;
    const shW = PI ? px(PI[POSE.leftShoulder]).distanceTo(px(PI[POSE.rightShoulder])) : null;
    const unit = faceW || (shW ? shW * 0.45 : null);
    if (!unit) return null;

    // Signer spots and hand points in the image (pixels).
    const sSpots = {};
    if (F) for (const [name, idx] of Object.entries(FACE_SPOTS)) if (idx.every((i) => F[i])) sSpots[name] = avg2(idx.map((i) => px(F[i])));
    if (PI && shW) {
      sSpots.leftShoulder = px(PI[POSE.leftShoulder]);
      sSpots.rightShoulder = px(PI[POSE.rightShoulder]);
      sSpots.chest = sSpots.leftShoulder.clone().add(sSpots.rightShoulder).multiplyScalar(0.5).add(new THREE.Vector2(0, 0.3 * shW));
    }
    const sPts = {};
    for (const [name, idx] of Object.entries(HAND_POINTS)) sPts[name] = avg2(idx.map((i) => px(hand[i])));

    // Depth (towards the camera, metres) of each signer hand point and spot.
    // Single-camera depth is rough, so it only rules out a hand clearly in
    // front of the spot. Spot depths come from the avatar's own face/body
    // shape, scaled to the signer.
    const fwd = this.forward;
    const dep = (v) => v.dot(fwd);
    const wristS = P[POSE[`${side}Wrist`]];
    const ptDepth = {};
    for (const [name, idx] of Object.entries(HAND_POINTS)) {
      const hp = idx.reduce((s, i) => s.add(H[i]), new THREE.Vector3()).divideScalar(idx.length);
      ptDepth[name] = dep(wristS) + dep(hp) - dep(H[0]);
    }
    const sp = this.touch.spots;
    const eyeS = P[POSE.leftEye].distanceTo(P[POSE.rightEye]);
    const faceScale = eyeS > 1e-6 ? eyeS / this.avatarEyeDist : 1;
    const bodyScale = P[POSE.leftShoulder].distanceTo(P[POSE.rightShoulder]) / this.touch.shoulderWidth;
    const aNose = dep(rigPoint(this, sp.nose));
    const aShL = dep(this.rigPos(this.nodes.leftUpperArm));
    const aShR = dep(this.rigPos(this.nodes.rightUpperArm));
    const spotDepth = (name) => {
      const s = sp[name];
      const a = dep(rigPoint(this, s));
      if (s.kind === 'face') return dep(P[POSE.nose]) - (aNose - a) * faceScale;
      const sL = dep(P[POSE.leftShoulder]);
      const sR = dep(P[POSE.rightShoulder]);
      if (name === 'leftShoulder') return sL + (a - aShL) * bodyScale;
      if (name === 'rightShoulder') return sR + (a - aShR) * bodyScale;
      return (sL + sR) / 2 + (a - (aShL + aShR) / 2) * bodyScale;
    };

    const wristA = this.rigPos(this.nodes[`${side}Hand`]);
    const aPts = this.handPoints(side);
    let best = null;
    const target = new THREE.Vector3();
    let sum = 0;
    const pairs = [];
    for (const [point, spt] of Object.entries(sPts)) {
      for (const [spot, ss] of Object.entries(sSpots)) {
        const s = sp[spot];
        if (!s) continue;
        const d = spt.distanceTo(ss) / unit;
        const w2d = 1 - smoothstep(0.15, 0.4, d);
        if (w2d <= 0) continue;
        // Depth gap: > 0 the hand point is in front of the spot, < 0 behind it
        // (e.g. the thumb beside the cheek while the palm is on the ear).
        const gap = ptDepth[point] - spotDepth(spot);
        const score = w2d * (1 - smoothstep(0.04, 0.1, Math.abs(gap)));
        if (!best || score > best.score || (score === best.score && d + Math.abs(gap) < best.d + Math.abs(best.gap))) best = { point, spot, score, d, gap };
        if (score <= 0) continue;
        pairs.push({ point, spot, s, score, d, gap, spt, ss });
      }
    }
    if (!best || best.score <= 0) return best ? { w: 0, spot: best.spot, point: best.point } : null;
    // Blend candidate touches, strongly favouring the closest in image and depth.
    for (const { point, s, score, d, gap, spt, ss } of pairs) {
      const q = this.rigQuat(s.bone, new THREE.Quaternion());
      const lat = this.restLeft.clone().applyQuaternion(q);
      const upv = this.restUp.clone().applyQuaternion(q);
      const scale = s.kind === 'face' ? this.touch.faceWidth / (faceW || unit) : this.touch.shoulderWidth / (shW || unit / 0.45);
      const dpx = spt.clone().sub(ss);
      const contact = rigPoint(this, s).addScaledVector(lat, dpx.x * scale).addScaledVector(upv, -dpx.y * scale);
      const k = score ** 4 * Math.exp(-(d - best.d) / 0.03) * Math.exp(-(Math.abs(gap) - Math.abs(best.gap)) / 0.01);
      target.addScaledVector(contact.sub(aPts[point].clone().sub(wristA)), k);
      sum += k;
    }
    if (sum <= 0) return { w: 0, spot: best.spot, point: best.point };
    return { w: best.score, wrist: target.divideScalar(sum), spot: best.spot, point: best.point, gap: best.gap };
  }

  /**
   * Upper arm and forearm with elbow anatomy:
   *  - the elbow is a hinge: the forearm bends only forward from the upper arm;
   *  - when the arm is nearly straight, turning the palm comes from the
   *    shoulder (upper arm twist), not from twisting the elbow;
   *  - forearm twist (pronation/supination) is limited to ±MAX_FOREARM_TWIST.
   */
  _setArm(side, upper, fore, palm) {
    const r = this.rest[side];
    const n = this.nodes;
    const bend = upper.angleTo(fore);
    const swing = new THREE.Quaternion().setFromUnitVectors(r.upper, upper.clone().normalize());
    // Bent arm: twist from the elbow's bend plane.
    const hinge = frameRotation(upper, fore, r.upper, this.forward);
    // Straight arm: twist from the palm, so the forearm stays untwisted.
    const fromPalm = palm ? frameRotation(upper, palm, r.upper, r.palm) : null;
    let Ru = fromPalm || swing;
    if (hinge) Ru = Ru.clone().slerp(hinge, smoothstep(8 * DEG, 25 * DEG, bend));
    this.setRig(n[`${side}UpperArm`], Ru);

    let Rf = palm ? frameRotation(fore, palm, r.fore, r.palm) : null;
    if (!Rf) {
      this.swingTo(n[`${side}LowerArm`], r.fore, fore);
      return;
    }
    // Limit forearm twist relative to the upper arm.
    const local = Ru.clone().invert().multiply(Rf);
    const { swing: sw, twist } = swingTwist(local, r.fore);
    const angle = 2 * Math.atan2(new THREE.Vector3(twist.x, twist.y, twist.z).dot(r.fore), twist.w);
    const wrapped = Math.atan2(Math.sin(angle), Math.cos(angle));
    let twistOut = wrapped;
    if (Math.abs(wrapped) > MAX_FOREARM_TWIST) {
      // Beyond the human range the palm reading is ambiguous (near ±180° it
      // can flip sides between frames). Stay on the side we were on.
      const prev = this.prevTwist[side];
      const sign = Math.abs(prev) > 30 * DEG ? Math.sign(prev) : Math.sign(wrapped);
      twistOut = sign * MAX_FOREARM_TWIST;
      const limited = new THREE.Quaternion().setFromAxisAngle(r.fore, twistOut);
      Rf = Ru.clone().multiply(sw.multiply(limited));
    }
    this.prevTwist[side] = twistOut;
    this.setRig(n[`${side}LowerArm`], Rf);
  }

  /**
   * Where should the avatar's index knuckle go? Angles alone put the hand in
   * the wrong place when the avatar's arms or head differ in size from the
   * signer's (a cartoon head is bigger, arms shorter). So the knuckle is placed:
   *  - near the face: relative to the eyes, scaled by eye distance;
   *  - elsewhere: relative to the shoulder, scaled by arm length;
   * blended by how close the hand is to the face.
   */
  _contactTarget(side, P, pose) {
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
    const S_a = this.rigPos(n[`${side}UpperArm`]);
    const target = S_a.clone().addScaledVector(K_s.clone().sub(S_s), (r.upperLen + r.foreLen) / this.signerArm[side]);

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
    return target;
  }

  /**
   * When the signer's hands are close together (clap, joined hands, one hand
   * on the other), place both avatar hands around their shared midpoint with
   * the signer's hand-to-hand offset, scaled to the avatar's hand size.
   */
  _joinHands(P, arm) {
    const Kl = P[POSE.leftIndex];
    const Kr = P[POSE.rightIndex];
    const sw = P[POSE.leftShoulder].distanceTo(P[POSE.rightShoulder]);
    if (sw < 1e-6) return;
    const closeness = Kl.distanceTo(Kr) / sw;
    const w = 1 - smoothstep(0.35, 0.8, closeness);
    if (w <= 0) return;
    // Hand size: wrist to middle knuckle (hand landmarks are in metres).
    const sizes = [];
    for (const side of SIDES) {
      const H = arm[side].H;
      if (H) sizes.push({ s: H[9].distanceTo(H[0]), a: this.rest[side].handLen });
    }
    let scale;
    if (sizes.length) {
      scale = sizes.reduce((acc, x) => acc + x.a / x.s, 0) / sizes.length;
    } else {
      const la = this.rest.left;
      scale = (la.upperLen + la.foreLen) / (this.signerArm.left || 1);
    }
    const mid = arm.left.target.clone().add(arm.right.target).multiplyScalar(0.5);
    const half = Kl.clone().sub(Kr).multiplyScalar(scale / 2);
    arm.left.target.lerp(mid.clone().add(half), w);
    arm.right.target.lerp(mid.clone().sub(half), w);
  }

  // Two-bone IK: put the wrist on `T`, elbow in the signer's elbow plane.
  _solveArm(side, P, T) {
    const r = this.rest[side];
    const n = this.nodes;
    const S_s = P[POSE[`${side}Shoulder`]];
    const E_s = P[POSE[`${side}Elbow`]];
    const W_s = P[POSE[`${side}Wrist`]];
    const a = r.upperLen;
    const b = r.foreLen;
    const S_a = this.rigPos(n[`${side}UpperArm`]);
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
