// Automatic checks for the avatar lab (open test.html, press "Run checks").
// Each check poses the avatar, makes MediaPipe-style landmarks from that
// pose, resets the avatar, and checks the retargeter rebuilds the pose.

import * as THREE from 'three';
import { Stage, SAMPLE_AVATAR_URL, listProjectAvatars, warmthLayer } from './stage.js';
import { FINGERS, POSE, FACE, mapBlendshapes, assignHands, frameRotation, gazeFromBlendshapes, swingTwist, MAX_FOREARM_TWIST } from './retarget.js';
import { MotionRecorder, validateMotion, sampleMotion } from './motion.js';
import { FACE_SPOTS, rigPoint } from './anchors.js';

const SIDES = ['left', 'right'];
const DEG = Math.PI / 180;
const results = [];

function check(name, pass, detail = '') {
  results.push({ name, pass: !!pass, detail });
}

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const between = (r, a, b) => a + (b - a) * r();
const axisAngle = (axis, deg) => new THREE.Quaternion().setFromAxisAngle(axis.clone().normalize(), deg * DEG);
const angleDeg = (a, b) => a.angleTo(b) / DEG;

// ---------- Truth poses ----------

// torso: also bend spine and chest, and split neck/head freely. The lab can
// only estimate those splits, which moves the head a few cm; with hand contact
// on, the hands follow the avatar's head, so contact checks use torso: false.
function randomPose(rt, r, { torso = true } = {}) {
  const n = rt.nodes;
  rt.h.resetNormalizedPose();
  const small = (deg) => new THREE.Quaternion().setFromEuler(new THREE.Euler(between(r, -deg, deg) * DEG, between(r, -deg, deg) * DEG, between(r, -deg, deg) * DEG));
  const ts = small(8);
  const tc = small(8);
  if (torso) {
    n.spine.quaternion.copy(ts);
    if (n.chest) n.chest.quaternion.copy(tc);
  }
  if (n.neck) n.neck.quaternion.copy(small(10));
  n.head.quaternion.copy(small(20));
  rt.vrm.scene.updateMatrixWorld(true);
  if (!torso && n.neck) {
    // Same neck/head split as the retargeter, so the head ends up in the same place.
    const headRig = rt.rigQuat(n.head);
    rt.setRig(n.neck, rt.rigQuat(n.neck.parent).slerp(headRig, 0.5));
    rt.setRig(n.head, headRig);
  }
  for (const side of SIDES) {
    const rest = rt.rest[side];
    const out = Math.sign(rest.upper.x);
    const dir = new THREE.Vector3(out * between(r, -0.3, 1), between(r, -1, 0.6), rt.s * between(r, -0.2, 1)).normalize();
    rt.swingTo(n[`${side}UpperArm`], rest.upper, dir);
    n[`${side}UpperArm`].quaternion.multiply(axisAngle(rest.upper, between(r, -60, 60)));
    const bendAxis = new THREE.Vector3().crossVectors(rest.fore, rt.forward);
    n[`${side}LowerArm`].quaternion.copy(axisAngle(bendAxis, between(r, 0, 140)).multiply(axisAngle(rest.fore, between(r, -80, 80))));
    const flexAxis = new THREE.Vector3().crossVectors(rest.handDir, rest.palm);
    n[`${side}Hand`].quaternion.copy(axisAngle(flexAxis, between(r, -60, 60)).multiply(axisAngle(rest.palm, between(r, -25, 25))));
    for (const f of FINGERS) {
      for (const b of f.bones) {
        const node = n[`${side}${b}`];
        if (!node) continue;
        const d = rest.finger[b];
        const curlAxis = new THREE.Vector3().crossVectors(d, rest.palm);
        node.quaternion.copy(axisAngle(curlAxis, f.name === 'Thumb' ? between(r, -10, 50) : between(r, 0, 90)));
      }
    }
  }
  rt.vrm.scene.updateMatrixWorld(true);
}

function snapshot(rt) {
  const q = {};
  for (const [k, node] of Object.entries(rt.nodes)) q[k] = node.quaternion.clone();
  return q;
}
function restore(rt, q) {
  for (const [k, v] of Object.entries(q)) rt.nodes[k].quaternion.copy(v);
  rt.vrm.scene.updateMatrixWorld(true);
}

// ---------- Landmarks and measurements from the current avatar pose ----------

function tipOf(rt, side, f) {
  return rt.fingerTip(side, f.name.toLowerCase());
}

// Simple camera: front view, 1000×1000 px image.
const IMG = 1000;
function project(rt, v) {
  return { x: 0.5 + v.x * rt.s * 0.5, y: 0.75 - v.y * 0.5, z: 0 };
}

function extract(rt) {
  const n = rt.nodes;
  const pos = (name) => rt.rigPos(n[name] || rt.h.getNormalizedBoneNode(name));
  const pose = Array.from({ length: 33 }, () => ({ x: 0, y: 0, z: 0, visibility: 1 }));
  for (const side of SIDES) {
    pose[POSE[`${side}Shoulder`]] = rt.fromRig(pos(`${side}UpperArm`));
    pose[POSE[`${side}Elbow`]] = rt.fromRig(pos(`${side}LowerArm`));
    pose[POSE[`${side}Wrist`]] = rt.fromRig(pos(`${side}Hand`));
    pose[POSE[`${side}Hip`]] = rt.fromRig(pos(`${side}UpperLeg`));
    pose[POSE[`${side}Index`]] = rt.fromRig(pos(`${side}IndexProximal`));
  }
  const eyes = rt.avatarEyes();
  pose[POSE.leftEye] = rt.fromRig(eyes.left);
  pose[POSE.rightEye] = rt.fromRig(eyes.right);
  pose[POSE.nose] = rt.fromRig(rigPoint(rt, rt.touch.spots.nose));
  const hands = {};
  for (const side of SIDES) {
    const world = [];
    world[0] = rt.fromRig(pos(`${side}Hand`));
    for (const f of FINGERS) {
      f.bones.forEach((b, i) => { world[f.idx[i]] = rt.fromRig(pos(`${side}${b}`)); });
      world[f.idx[3]] = rt.fromRig(tipOf(rt, side, f));
    }
    hands[side] = { world };
  }
  const qh = rt.rigQuat(n.head);
  const head = pos('head');
  const up = rt.restUp.clone().applyQuaternion(qh);
  const lat = rt.restLeft.clone().applyQuaternion(qh);
  const F = [];
  F[FACE.forehead] = rt.fromRig(head.clone().addScaledVector(up, 0.1));
  F[FACE.chin] = rt.fromRig(head.clone().addScaledVector(up, -0.05));
  F[FACE.leftEyeOuter] = rt.fromRig(head.clone().addScaledVector(lat, 0.04));
  F[FACE.rightEyeOuter] = rt.fromRig(head.clone().addScaledVector(lat, -0.04));
  // Image-space landmarks for touch detection.
  const img = { width: IMG, height: IMG, pose: pose.map((p) => project(rt, rt.toRig(p))), hands: {}, face: [] };
  for (const side of SIDES) img.hands[side] = hands[side].world.map((p) => project(rt, rt.toRig(p)));
  for (const [name, idx] of Object.entries(FACE_SPOTS)) {
    const spot = rt.touch.spots[name];
    if (spot) for (const i of idx) img.face[i] = project(rt, rigPoint(rt, spot));
  }
  return { pose, hands, face: { landmarks: F, width: 1, height: 1 }, img };
}

function measure(rt) {
  const n = rt.nodes;
  const pos = (name) => rt.rigPos(n[name] || rt.h.getNormalizedBoneNode(name));
  const m = {};
  for (const side of SIDES) {
    const hand = pos(`${side}Hand`);
    m[`${side} upper arm`] = pos(`${side}LowerArm`).sub(pos(`${side}UpperArm`));
    m[`${side} forearm`] = hand.clone().sub(pos(`${side}LowerArm`));
    m[`${side} hand`] = pos(`${side}MiddleProximal`).sub(hand);
    m[`${side} palm`] = new THREE.Vector3().crossVectors(pos(`${side}IndexProximal`).sub(hand), pos(`${side}LittleProximal`).sub(hand));
    for (const f of FINGERS) {
      for (let i = 0; i < 3; i++) {
        const a = pos(`${side}${f.bones[i]}`);
        const b = i < 2 ? pos(`${side}${f.bones[i + 1]}`) : tipOf(rt, side, f);
        m[`${side} ${f.name.toLowerCase()} ${i + 1}`] = b.sub(a);
      }
    }
  }
  const qh = rt.rigQuat(n.head);
  m['head up'] = rt.restUp.clone().applyQuaternion(qh);
  m['head sideways'] = rt.restLeft.clone().applyQuaternion(qh);
  m['shoulder line'] = pos('leftUpperArm').sub(pos('rightUpperArm'));
  return m;
}

function groupOf(key) {
  if (key.includes('upper arm') || key.includes('forearm')) return 'arms';
  if (key.endsWith(' hand') || key.includes('palm')) return 'hands';
  if (key.startsWith('head')) return 'head';
  if (key === 'shoulder line') return 'torso';
  return 'fingers';
}
const LIMITS = { arms: 0.5, hands: 0.5, fingers: 0.5, head: 0.5, torso: 0.5 };

// ---------- Checks ----------

function accuracyChecks(rt, trials = 200, contact = false) {
  const r = rng(12345);
  let skipped = 0;
  rt.resetTracking();
  const worst = { arms: 0, hands: 0, fingers: 0, head: 0, torso: 0 };
  const worstAt = {};
  for (let t = 0; t < trials; t++) {
    randomPose(rt, r, { torso: !contact });
    const frame = extract(rt);
    const truth = measure(rt);
    rt.h.resetNormalizedPose();
    rt.vrm.scene.updateMatrixWorld(true);
    rt.apply(frame, { contact });
    if (contact && SIDES.some((s) => (rt.lastTouch[s]?.w ?? 0) > 0)) { skipped++; continue; }
    const got = measure(rt);
    for (const k of Object.keys(truth)) {
      const e = angleDeg(truth[k], got[k]);
      const g = groupOf(k);
      if (e > worst[g]) { worst[g] = e; worstAt[g] = k; }
    }
  }
  for (const g of Object.keys(worst)) {
    if (contact && g === 'torso') continue;
    check(`Accuracy${contact ? ' with hand contact on (upright torso, not touching)' : ''}: ${g} (${trials - skipped} random poses)`, worst[g] < LIMITS[g], `worst ${worst[g].toFixed(3)}° at ${worstAt[g] || '-'} (limit ${LIMITS[g]}°)`);
  }
}

function continuityChecks(rt) {
  const r = rng(999);
  let worstJump = 0;
  let worstBone = '';
  let worstErr = 0;
  for (let run = 0; run < 10; run++) {
    randomPose(rt, r, { torso: false });
    const A = snapshot(rt);
    randomPose(rt, r, { torso: false });
    const B = snapshot(rt);
    const frames = [];
    const truths = [];
    const steps = 60;
    for (let i = 0; i <= steps; i++) {
      const k = i / steps;
      const mix = {};
      for (const name of Object.keys(A)) mix[name] = A[name].clone().slerp(B[name], k);
      restore(rt, mix);
      frames.push(extract(rt));
      truths.push(measure(rt));
    }
    rt.h.resetNormalizedPose();
    rt.vrm.scene.updateMatrixWorld(true);
    rt.resetTracking();
    let prev = null;
    frames.forEach((f, i) => {
      rt.apply(f);
      const now = snapshot(rt);
      if (prev) {
        for (const name of Object.keys(now)) {
          const jump = prev[name].angleTo(now[name]) / DEG;
          if (jump > worstJump) { worstJump = jump; worstBone = name; }
        }
      }
      prev = now;
      const touching = SIDES.some((s) => (rt.lastTouch[s]?.w ?? 0) > 0);
      if (i > 0 && !touching) {
        const got = measure(rt);
        for (const k of Object.keys(got)) {
          if (groupOf(k) === 'torso') continue;
          worstErr = Math.max(worstErr, angleDeg(truths[i][k], got[k]));
        }
      }
    });
  }
  check('Smooth motion (hand contact on): no sudden flips (10 moves × 60 frames)', worstJump < 15, `largest change between frames ${worstJump.toFixed(2)}° (${worstBone}); limit 15°`);
  check('Smooth motion: accuracy while moving (when not touching)', worstErr < 0.5, `worst ${worstErr.toFixed(3)}°`);
}

function handAssignChecks() {
  const wrist = (x) => [{ x, y: 0.5, z: 0 }];
  const poseImg = Array.from({ length: 33 }, () => ({ x: 0, y: 0, z: 0 }));
  poseImg[POSE.leftWrist] = { x: 0.7, y: 0.5, z: 0 };
  poseImg[POSE.rightWrist] = { x: 0.3, y: 0.5, z: 0 };
  const two = { landmarks: [wrist(0.31), wrist(0.69)], worldLandmarks: ['A', 'B'], handedness: [] };
  const a = assignHands(poseImg, two);
  check('Hands: two hands matched to the right arms', a.left?.world === 'B' && a.right?.world === 'A');
  const one = { landmarks: [wrist(0.68)], worldLandmarks: ['C'], handedness: [] };
  const b = assignHands(poseImg, one);
  check('Hands: one hand matched to the nearest arm', b.left?.world === 'C' && !b.right);
  const nopose = { landmarks: [wrist(0.5)], worldLandmarks: ['D'], handedness: [[{ categoryName: 'Left' }]] };
  const c = assignHands(null, nopose);
  check('Hands: without body, MediaPipe "Left" means signer\'s right', c.right?.world === 'D');
}

function faceChecks(names) {
  const basic = mapBlendshapes({ jawOpen: 1, mouthSmileLeft: 1, mouthSmileRight: 1, eyeBlinkLeft: 1, eyeBlinkRight: 0 }, names);
  check('Face: mouth open → "aa"', basic.aa === 1, JSON.stringify(basic));
  check('Face: smile → "happy"', basic.happy === 1);
  check('Face: one-eye blink kept separate', basic.blinkLeft === 1 && (basic.blinkRight ?? 0) === 0);
  const swapped = mapBlendshapes({ eyeBlinkLeft: 1 }, names, { swapSides: true });
  check('Face: swap left/right works', swapped.blinkRight === 1 && !swapped.blinkLeft);
  const ps = mapBlendshapes({ jawOpen: 0.4, browInnerUp: 0.7, eyeBlinkLeft: 0.2 }, ['jawOpen', 'browInnerUp', 'eyeBlinkLeft', 'aa']);
  check('Face: 52-shape avatars driven directly', ps.jawOpen === 0.4 && ps.browInnerUp === 0.7 && ps.aa === undefined, JSON.stringify(ps));
}

function warmthChecks(names) {
  const has = names.includes('sweet') ? 'sweet' : names.includes('relaxed') ? 'relaxed' : null;
  check('Resting face: avatar has a sweet expression', !!has, has === 'sweet' ? 'sweet' : has ? 'using "relaxed" instead' : 'none');
  if (!has) return;
  const full = has === 'sweet' ? 0.6 : 0.3;
  const calm = warmthLayer({}, names, 0.6)[has];
  const question = warmthLayer({ surprised: 0.8 }, names, 0.6)[has];
  const frown = warmthLayer({ angry: 0.8 }, names, 0.6)[has];
  const talk = warmthLayer({ aa: 1 }, names, 0.6)[has];
  check('Resting face: sweet when the face is calm', Math.abs(calm - full) < 1e-9, `${calm.toFixed(2)}`);
  check('Resting face: steps aside for raised or lowered brows (grammar)', question === 0 && frown === 0, `raised ${question}, lowered ${frown}`);
  check('Resting face: softens during mouth shapes', talk > 0 && talk < calm, `${talk.toFixed(2)}`);
}

function motionChecks(rt) {
  const r = rng(7);
  randomPose(rt, r);
  const q1 = rt.getBoneQuats();
  randomPose(rt, r);
  const q2 = rt.getBoneQuats();
  const rec = new MotionRecorder({ source: { name: 'test' } });
  rec.add(0, q1, { happy: 0 }, { yaw: 0, pitch: 0 });
  rec.add(1, q2, { happy: 1 }, { yaw: 20, pitch: -10 });
  let data;
  try { data = validateMotion(JSON.parse(JSON.stringify(rec.toJSON()))); } catch (e) { data = null; }
  check('Motion file: save and load round trip', !!data && data.frames.length === 2);
  if (!data) return;
  const mid = sampleMotion(data, 0.5);
  check('Motion file: blends between frames', Math.abs(mid.expressions.happy - 0.5) < 1e-6);
  check('Motion file: keeps eye gaze', mid.gaze && Math.abs(mid.gaze.yaw - 10) < 1e-6 && Math.abs(mid.gaze.pitch + 5) < 1e-6);
  rt.setBoneQuats(sampleMotion(data, 1).bones);
  const back = rt.getBoneQuats();
  const same = Object.keys(q2).every((k) => q2[k].every((v, i) => Math.abs(v - back[k][i]) < 1e-4));
  check('Motion file: replays the exact pose', same);
  let rejected = false;
  try { validateMotion({ format: 'other' }); } catch { rejected = true; }
  check('Motion file: rejects wrong files', rejected);
}



// Shared helpers for building arm poses.
function solveElbow(S0, T0, A, B, poleHint) {
  const u = T0.clone().sub(S0); const d = u.length(); u.normalize();
  const c = (A * A + d * d - B * B) / (2 * A * d); const s = Math.sqrt(Math.max(0, 1 - c * c));
  const p = poleHint.clone().sub(S0); p.addScaledVector(u, -p.dot(u)); p.normalize();
  return S0.clone().addScaledVector(u, A * c).addScaledVector(p, A * s);
}

// Pose one arm so its index knuckle is at `spot`, keeping the hand's current orientation.
function reachKnuckle(rt, side, spot) {
  const n = rt.nodes;
  const rest = rt.rest[side];
  const handQ = rt.rigQuat(n[`${side}Hand`]);
  const wristT = spot.clone().sub(rest.knuckle.clone().applyQuaternion(handQ));
  const S = rt.rigPos(n[`${side}UpperArm`]);
  const dist = wristT.distanceTo(S);
  if (dist > (rest.upperLen + rest.foreLen) * 0.97 || dist < Math.abs(rest.upperLen - rest.foreLen) + 0.05) return false;
  const E = solveElbow(S, wristT, rest.upperLen, rest.foreLen, rt.rigPos(n[`${side}LowerArm`]).add(new THREE.Vector3(0, -0.05, 0)));
  rt.setRig(n[`${side}UpperArm`], frameRotation(E.clone().sub(S), wristT.clone().sub(E), rest.upper, rt.forward)
    || new THREE.Quaternion().setFromUnitVectors(rest.upper, E.clone().sub(S).normalize()));
  rt.swingTo(n[`${side}LowerArm`], rest.fore, wristT.clone().sub(E));
  rt.setRig(n[`${side}Hand`], handQ);
  rt.vrm.scene.updateMatrixWorld(true);
  return rt.rigPos(n[`${side}IndexProximal`]).distanceTo(spot) < 0.005;
}

// Make the signer's arm on `side` k times longer, keeping the knuckle where it is.
function longerSignerArm(rt, frame, side, k) {
  const rest = rt.rest[side];
  const S = rt.toRig(frame.pose[POSE[`${side}Shoulder`]]);
  const K = rt.toRig(frame.pose[POSE[`${side}Index`]]);
  const W = rt.toRig(frame.pose[POSE[`${side}Wrist`]]);
  const Ws = K.clone().sub(K.clone().sub(W).multiplyScalar(k));
  if (Ws.distanceTo(S) > (rest.upperLen + rest.foreLen) * k * 0.97) return false;
  const Es = solveElbow(S, Ws, rest.upperLen * k, rest.foreLen * k, rt.toRig(frame.pose[POSE[`${side}Elbow`]]));
  frame.pose[POSE[`${side}Elbow`]] = rt.fromRig(Es);
  frame.pose[POSE[`${side}Wrist`]] = rt.fromRig(Ws);
  return true;
}

// Both hands meeting in front of the chest; the signer has longer arms.
function joinedHandsChecks(rt) {
  const r = rng(2024);
  let worstOn = 0;
  let worstOff = 0;
  let tested = 0;
  for (let trial = 0; trial < 600 && tested < 40; trial++) {
    randomPose(rt, r, { torso: false });
    const n = rt.nodes;
    const chest = rt.rigPos(n.leftUpperArm).add(rt.rigPos(n.rightUpperArm)).multiplyScalar(0.5);
    const M = chest.clone()
      .addScaledVector(rt.forward, between(r, 0.3, 0.4))
      .addScaledVector(rt.restUp, between(r, -0.3, 0.05))
      .addScaledVector(rt.restLeft, between(r, -0.05, 0.05));
    const gap = between(r, 0.02, 0.05);
    const spotL = M.clone().addScaledVector(rt.restLeft, gap / 2);
    const spotR = M.clone().addScaledVector(rt.restLeft, -gap / 2);
    if (!reachKnuckle(rt, 'left', spotL) || !reachKnuckle(rt, 'right', spotR)) continue;
    const truthGap = rt.rigPos(n.leftIndexProximal).sub(rt.rigPos(n.rightIndexProximal));
    const frame = extract(rt);
    if (!longerSignerArm(rt, frame, 'left', 1.25) || !longerSignerArm(rt, frame, 'right', 1.25)) continue;
    for (const contact of [true, false]) {
      rt.h.resetNormalizedPose();
      rt.vrm.scene.updateMatrixWorld(true);
      rt.resetTracking();
      rt.apply(frame, { contact });
      rt.apply(frame, { contact });
      const got = rt.rigPos(n.leftIndexProximal).sub(rt.rigPos(n.rightIndexProximal));
      const miss = got.distanceTo(truthGap);
      if (contact) worstOn = Math.max(worstOn, miss); else worstOff = Math.max(worstOff, miss);
    }
    tested++;
  }
  check(`Joined hands: hands stay together when signer's arms are 25% longer (${tested} poses)`, tested >= 20 && worstOn < 0.01,
    `worst gap error ${(worstOn * 100).toFixed(2)} cm with contact on (limit 1 cm); ${(worstOff * 100).toFixed(1)} cm with contact off`);
}

function forearmTwistOf(rt, side) {
  const local = rt.nodes[`${side}LowerArm`].quaternion;
  const { twist } = swingTwist(local, rt.rest[side].fore);
  const a = 2 * Math.atan2(new THREE.Vector3(twist.x, twist.y, twist.z).dot(rt.rest[side].fore), twist.w);
  return Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) / DEG;
}

function elbowChecks(rt) {
  const r = rng(555);
  // Straight arm, palm turned: the twist should come from the shoulder.
  let worstTwist = 0;
  let worstPalm = 0;
  for (let i = 0; i < 40; i++) {
    randomPose(rt, r, { torso: false });
    for (const side of SIDES) {
      const rest = rt.rest[side];
      rt.nodes[`${side}LowerArm`].quaternion.copy(axisAngle(rest.fore, between(r, -90, 90)));
    }
    rt.vrm.scene.updateMatrixWorld(true);
    const frame = extract(rt);
    const truth = measure(rt);
    rt.h.resetNormalizedPose();
    rt.resetTracking();
    rt.apply(frame);
    const got = measure(rt);
    for (const side of SIDES) {
      worstTwist = Math.max(worstTwist, forearmTwistOf(rt, side));
      worstPalm = Math.max(worstPalm, angleDeg(truth[`${side} palm`], got[`${side} palm`]), angleDeg(truth[`${side} forearm`], got[`${side} forearm`]));
    }
  }
  check('Elbow: straight arm, turned palm → turn comes from the shoulder (40 poses)', worstTwist < 5 && worstPalm < 0.5,
    `largest forearm twist ${worstTwist.toFixed(1)}° (limit 5°); palm/forearm error ${worstPalm.toFixed(3)}°`);
  // Any pose: forearm twist stays within the anatomical limit.
  let worstAny = 0;
  for (let i = 0; i < 200; i++) {
    randomPose(rt, r);
    const frame = extract(rt);
    rt.h.resetNormalizedPose();
    rt.resetTracking();
    rt.apply(frame);
    for (const side of SIDES) worstAny = Math.max(worstAny, forearmTwistOf(rt, side));
  }
  const limit = MAX_FOREARM_TWIST / DEG;
  check('Elbow: forearm twist never beyond the human range (200 poses)', worstAny <= limit + 0.01, `largest ${worstAny.toFixed(1)}° (limit ${limit}°)`);
}


// Pose one arm so that a hand point (index, thumb, palm…) is at `spot`.
function reachPoint(rt, side, point, spot) {
  const n = rt.nodes;
  const rest = rt.rest[side];
  const handQ = rt.rigQuat(n[`${side}Hand`]);
  const offset = rt.handPoints(side)[point].sub(rt.rigPos(n[`${side}Hand`]));
  const wristT = spot.clone().sub(offset);
  const S = rt.rigPos(n[`${side}UpperArm`]);
  const dist = wristT.distanceTo(S);
  if (dist > (rest.upperLen + rest.foreLen) * 0.97 || dist < Math.abs(rest.upperLen - rest.foreLen) + 0.05) return false;
  const E = solveElbow(S, wristT, rest.upperLen, rest.foreLen, rt.rigPos(n[`${side}LowerArm`]).add(new THREE.Vector3(0, -0.1, 0)));
  rt.setRig(n[`${side}UpperArm`], frameRotation(E.clone().sub(S), wristT.clone().sub(E), rest.upper, rt.forward)
    || new THREE.Quaternion().setFromUnitVectors(rest.upper, E.clone().sub(S).normalize()));
  rt.swingTo(n[`${side}LowerArm`], rest.fore, wristT.clone().sub(E));
  rt.setRig(n[`${side}Hand`], handQ);
  rt.vrm.scene.updateMatrixWorld(true);
  return rt.handPoints(side)[point].distanceTo(spot) < 0.005;
}

const TOUCH_SPOTS = ['lips', 'chin', 'nose', 'leftCheek', 'rightCheek', 'leftEar', 'rightEar', 'forehead', 'leftShoulder', 'rightShoulder', 'chest'];
const TOUCH_POINTS = ['index', 'middle', 'thumb', 'palm'];

// A finger or palm on a body spot; the signer's arms are 25% longer than the avatar's.
function touchChecks(rt) {
  const r = rng(8080);
  const per = {};
  let worstOn = 0;
  let worstOff = 0;
  let tested = 0;
  let worstCase = '';
  for (let trial = 0; trial < 3000 && tested < 120; trial++) {
    randomPose(rt, r, { torso: false });
    const side = r() < 0.5 ? 'left' : 'right';
    const spotName = TOUCH_SPOTS[Math.floor(r() * TOUCH_SPOTS.length)];
    const point = TOUCH_POINTS[Math.floor(r() * TOUCH_POINTS.length)];
    const spot = rt.touch.spots[spotName];
    if (!spot) continue;
    const goal = rigPoint(rt, spot);
    if (!reachPoint(rt, side, point, goal)) continue;
    // Keep the other hand away from the body.
    const other = side === 'left' ? 'right' : 'left';
    rt.swingTo(rt.nodes[`${other}UpperArm`], rt.rest[other].upper, new THREE.Vector3(rt.rest[other].upper.x, -1, 0).normalize());
    rt.vrm.scene.updateMatrixWorld(true);
    const frame = extract(rt);
    if (!longerSignerArm(rt, frame, side, 1.25)) continue;
    let missOn = 0;
    for (const contact of [true, false]) {
      rt.h.resetNormalizedPose();
      rt.vrm.scene.updateMatrixWorld(true);
      rt.resetTracking();
      rt.apply(frame, { contact });
      rt.apply(frame, { contact });
      const miss = rt.handPoints(side)[point].distanceTo(rigPoint(rt, spot));
      if (contact) {
        if (miss > worstOn) worstCase = `${side} ${point}→${spotName}, detected ${rt.lastTouch[side]?.point}→${rt.lastTouch[side]?.spot} w=${(rt.lastTouch[side]?.w ?? 0).toFixed(2)}`;
        worstOn = Math.max(worstOn, miss); missOn = miss;
      } else worstOff = Math.max(worstOff, miss);
    }
    per[spotName] = Math.max(per[spotName] ?? 0, missOn);
    tested++;
  }
  const bySpot = Object.entries(per).map(([k, v]) => `${k} ${(v * 100).toFixed(1)}`).join(', ');
  check(`Touch: finger or palm lands on lips, chin, nose, cheeks, ears, forehead, shoulders, chest; signer's arms 25% longer (${tested} touches)`,
    tested >= 60 && worstOn < 0.01,
    `worst miss ${(worstOn * 100).toFixed(2)} cm with contact on (limit 1 cm); ${(worstOff * 100).toFixed(1)} cm with contact off. Per spot (cm): ${bySpot}. Worst: ${worstCase}`);
}

// A hand in front of the face (signing space, not touching) must not snap onto the face.
function noFalseTouchChecks(rt) {
  const r = rng(9090);
  let snapped = 0;
  let lastSnap = '';
  let tested = 0;
  for (let trial = 0; trial < 2000 && tested < 40; trial++) {
    randomPose(rt, r, { torso: false });
    const side = r() < 0.5 ? 'left' : 'right';
    const spotName = ['lips', 'chin', 'nose', 'forehead'][Math.floor(r() * 4)];
    const surface = rigPoint(rt, rt.touch.spots[spotName]);
    const goal = surface.clone().addScaledVector(rt.forward, between(r, 0.22, 0.32));
    if (!reachPoint(rt, side, 'index', goal)) continue;
    // The whole hand (every fingertip and the palm) at least 15 cm in front of the face.
    const nearest = Math.min(...Object.values(rt.handPoints(side)).map((p) => p.clone().sub(surface).dot(rt.forward)));
    if (nearest < 0.15) continue;
    const frame = extract(rt);
    rt.h.resetNormalizedPose();
    rt.vrm.scene.updateMatrixWorld(true);
    rt.resetTracking();
    rt.apply(frame);
    if ((rt.lastTouch[side]?.w ?? 0) > 0.05) { snapped++; lastSnap = `${rt.lastTouch[side].point}→${rt.lastTouch[side].spot} w=${rt.lastTouch[side].w.toFixed(2)} gap=${(rt.lastTouch[side].gap * 100).toFixed(1)} cm (hand placed ${spotName})`; }
    tested++;
  }
  check(`Touch: hand at least 15 cm in front of the face is not pulled onto it (${tested} poses)`, tested >= 20 && snapped === 0, `${snapped} wrongly snapped${lastSnap ? `: ${lastSnap}` : ''}`);
}

function gazeChecks(stage) {
  const la = stage.vrm.lookAt;
  check('Gaze: avatar has eye control', !!la);
  if (!la) return;
  stage.retargeter.restPose();
  stage.vrm.scene.updateMatrixWorld(true);
  const dirFor = (g) => {
    stage.setGaze(g);
    stage.vrm.update(0);
    return la.getLookAtWorldDirection(new THREE.Vector3());
  };
  const left = gazeFromBlendshapes({ eyeLookOutLeft: 1, eyeLookInRight: 1 });
  const up = gazeFromBlendshapes({ eyeLookUpLeft: 1, eyeLookUpRight: 1 });
  check('Gaze: signer looks to own left → yaw positive', left.yaw > 20 && Math.abs(left.pitch) < 1e-9, JSON.stringify(left));
  // The avatar faces +z in the scene, so its own left is +x.
  const dl = dirFor(left);
  check('Gaze: avatar looks to its own left', dl.x > 0.2, `direction ${dl.toArray().map((v) => v.toFixed(2)).join(', ')}`);
  const du = dirFor(up);
  check('Gaze: looking up', du.y > 0.2, `direction ${du.toArray().map((v) => v.toFixed(2)).join(', ')}`);
  const d0 = dirFor(null);
  check('Gaze: straight ahead when nothing is detected', d0.z > 0.99);
}

function neutralChecks(rt) {
  const r = rng(31337);
  // A signer whose resting head reads 12° tilted and 8° turned.
  const bias = new THREE.Quaternion().setFromEuler(new THREE.Euler(12 * DEG, 8 * DEG, 0));
  const biased = (frame) => {
    const F = frame.face.landmarks;
    const pts = [FACE.forehead, FACE.chin, FACE.leftEyeOuter, FACE.rightEyeOuter].map((i) => rt.toRig(F[i]));
    const c = pts.reduce((s, p) => s.add(p), new THREE.Vector3()).multiplyScalar(0.25);
    const qh = rt.rigQuat(rt.nodes.head);
    const R = qh.clone().multiply(bias).multiply(qh.clone().invert());
    [FACE.forehead, FACE.chin, FACE.leftEyeOuter, FACE.rightEyeOuter].forEach((i, j) => {
      F[i] = rt.fromRig(pts[j].sub(c).applyQuaternion(R).add(c));
    });
    return frame;
  };
  // Neutral frame: head follows the chest.
  rt.restPose();
  rt.vrm.scene.updateMatrixWorld(true);
  rt.resetNeutral();
  rt.apply(biased(extract(rt)), { calibrate: true, contact: false });
  let worst = 0;
  let worstUncal = 0;
  for (let i = 0; i < 50; i++) {
    randomPose(rt, r);
    const frame = biased(extract(rt));
    const truth = measure(rt);
    rt.h.resetNormalizedPose();
    rt.apply(frame, { contact: false });
    const got = measure(rt);
    worst = Math.max(worst, angleDeg(truth['head up'], got['head up']), angleDeg(truth['head sideways'], got['head sideways']));
    const keep = rt.headBias.clone();
    rt.resetNeutral();
    rt.h.resetNormalizedPose();
    rt.apply(frame, { contact: false });
    const raw = measure(rt);
    worstUncal = Math.max(worstUncal, angleDeg(truth['head up'], raw['head up']));
    rt.headBias.copy(keep);
  }
  rt.resetNeutral();
  check('Neutral head: a signer\'s natural tilt is removed (50 poses)', worst < 0.5, `worst ${worst.toFixed(3)}° after calibration; ${worstUncal.toFixed(1)}° without`);
  const base = { browDownLeft: 0.3, browDownRight: 0.3 };
  const rest = mapBlendshapes({ browDownLeft: 0.3, browDownRight: 0.3 }, ['angry'], { base });
  const frown = mapBlendshapes({ browDownLeft: 1, browDownRight: 1 }, ['angry'], { base });
  check('Neutral face: resting frown no longer reads as "angry"', (rest.angry ?? 0) === 0 && frown.angry === 1);
}

// ---------- Demo motion (synthetic, for trying playback) ----------

function makeDemo(rt) {
  const n = rt.nodes;
  const fps = 30;
  const seconds = 4;
  const frames = [];
  const exprs = [];
  for (let i = 0; i <= fps * seconds; i++) {
    const t = i / fps;
    rt.restPose();
    // Right arm: raise, wave with palm to the viewer, then point.
    const rr = rt.rest.right;
    const out = Math.sign(rr.upper.x);
    const raise = Math.min(1, t / 0.8);
    const lerp = (a, b) => a.clone().lerp(b, raise).normalize();
    const upperDir = lerp(new THREE.Vector3(out * 0.25, -1, 0.05 * rt.s), new THREE.Vector3(out * 0.9, -0.3, 0.3 * rt.s));
    rt.swingTo(n.rightUpperArm, rr.upper, upperDir);
    const wave = Math.sin(Math.max(0, t - 0.8) * 8) * 0.45 * raise;
    const foreDir = lerp(new THREE.Vector3(out * 0.1, -1, 0.15 * rt.s), new THREE.Vector3(out * (0.15 + wave), 1, 0.15 * rt.s));
    const palmFacing = rr.palm.y < 0 ? 1 : -1; // rest palms face down
    const palmDir = lerp(new THREE.Vector3(-out * palmFacing, 0, 0), new THREE.Vector3(0, 0, rt.s * palmFacing));
    const R = frameRotation(foreDir, palmDir, rr.fore, rr.palm);
    if (R) { rt.setRig(n.rightLowerArm, R); rt.setRig(n.rightHand, R); }
    for (const f of FINGERS) {
      for (const b of f.bones) {
        const node = n[`right${b}`];
        if (!node) continue;
        const curlAxis = new THREE.Vector3().crossVectors(rr.finger[b], rr.palm).multiplyScalar(palmFacing);
        const curl = t > 3 && f.name !== 'Index' ? 75 : 3;
        node.quaternion.copy(axisAngle(curlAxis, f.name === 'Thumb' ? curl * 0.4 : curl));
      }
    }
    // Head: small nod.
    n.head.quaternion.copy(axisAngle(new THREE.Vector3(1, 0, 0), Math.sin(t * 3) * 6));
    rt.vrm.scene.updateMatrixWorld(true);
    frames.push(extract(rt));
    exprs.push({ happy: Math.min(1, t / 1.5) * 0.6, aa: t > 3 ? 0.3 : 0 });
  }
  rt.restPose();
  rt.resetTracking();
  const rec = new MotionRecorder({ source: { name: 'demo-wave', fps, note: 'Synthetic demo for testing playback. Not a real sign.' } });
  frames.forEach((f, i) => {
    rt.apply(f);
    rec.add(i / fps, rt.getBoneQuats(), exprs[i]);
  });
  return rec.toJSON();
}

// ---------- Runner ----------

function render() {
  const tbody = document.querySelector('#results tbody');
  tbody.innerHTML = '';
  for (const r of results) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<th scope="row"></th><td class="${r.pass ? 'pass' : 'fail'}">${r.pass ? 'Pass' : 'Fail'}</td><td></td>`;
    tr.children[0].textContent = r.name;
    tr.children[2].textContent = r.detail;
    tbody.appendChild(tr);
  }
  document.getElementById('results').hidden = false;
  const passed = results.filter((r) => r.pass).length;
  document.getElementById('summary').textContent = `${passed} of ${results.length} checks passed.`;
}

const stage = new Stage(document.getElementById('c'));
window.__stage = stage; // for debugging in the browser console
let demo = null;

async function run() {
  results.length = 0;
  const which = document.getElementById('which').value;
  const project = await listProjectAvatars();
  const chosen = which === 'sample' || !project.length ? { name: 'Sample avatar', url: SAMPLE_AVATAR_URL } : project[0];
  document.getElementById('summary').textContent = `Loading ${chosen.name}…`;
  try {
    await stage.loadAvatar(chosen.url);
    const rt = stage.retargeter;
    check(`${chosen.name} loads with finger bones`, true, `${Object.keys(rt.nodes).length} bones driven`);
    check('Touch spots found on the avatar', Object.keys(rt.touch.spots).length === 13 && rt.touch.faceWidth > 0.05,
      `${Object.keys(rt.touch.spots).length} spots; face width ${(rt.touch.faceWidth * 100).toFixed(1)} cm; mouth ${rt.touch.mouthFound ? 'found from the mouth shape' : 'estimated'}`);
    {
      const nose = rigPoint(rt, rt.touch.spots.nose);
      window.__spots = Object.fromEntries(Object.entries(rt.touch.spots).map(([k, s]) => {
        const p = rigPoint(rt, s).sub(nose);
        return [k, { up: +(p.y * 100).toFixed(1), side: +(p.dot(rt.restLeft) * 100).toFixed(1), front: +(p.dot(rt.forward) * 100).toFixed(1) }];
      }));
    }
    accuracyChecks(rt);
    accuracyChecks(rt, 200, true);
    continuityChecks(rt);
    touchChecks(rt);
    noFalseTouchChecks(rt);
    joinedHandsChecks(rt);
    elbowChecks(rt);
    gazeChecks(stage);
    neutralChecks(rt);
    handAssignChecks();
    faceChecks(stage.expressionNames());
    warmthChecks(stage.expressionNames());
    motionChecks(rt);
    demo = makeDemo(rt);
    check('Demo motion created', demo.frames.length > 100, `${demo.frames.length} frames`);
    rt.setBoneQuats(sampleMotion(demo, 2.0).bones);
    stage.setExpressions(sampleMotion(demo, 2.0).expressions);
    stage.vrm.update(0);
    stage.render();
    document.getElementById('demo').disabled = false;
  } catch (e) {
    console.error(e);
    check('Checks ran without errors', false, e.message);
  }
  render();
  window.__testResults = { results: results.slice(), demo };
}

document.getElementById('run').addEventListener('click', run);
document.getElementById('demo').addEventListener('click', () => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(demo)], { type: 'application/json' }));
  a.download = 'demo-wave.motion.json';
  a.click();
});
const params = new URLSearchParams(location.search);
if (params.get('avatar') === 'sample') document.getElementById('which').value = 'sample';
if (params.has('auto')) run();
