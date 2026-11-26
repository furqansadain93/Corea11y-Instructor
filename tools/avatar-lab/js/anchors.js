// Touch spots: places on the body that signs touch (lips, chin, ears,
// shoulders…). For the signer they come from MediaPipe image landmarks; for the
// avatar they are found once on the avatar's own surface (ray casting), so a
// touch lands on the avatar's lips even if its face is shaped differently.

import * as THREE from 'three';

// Signer side: MediaPipe face mesh indices (averaged) for each face spot.
export const FACE_SPOTS = {
  forehead: [10],
  nose: [1],
  lips: [0, 17],
  chin: [152],
  rightCheek: [50],
  leftCheek: [280],
  rightEar: [234],
  leftEar: [454],
  rightEye: [33, 133],
  leftEye: [263, 362],
};
export const BODY_SPOTS = ['leftShoulder', 'rightShoulder', 'chest'];

// Signer hand points that can touch: MediaPipe hand indices.
export const HAND_POINTS = {
  thumb: [4],
  index: [8],
  middle: [12],
  ring: [16],
  little: [20],
  palm: [0, 5, 9, 13, 17],
};

const isHair = (o) => /hair/i.test(o.name || '') || [].concat(o.material || []).some((m) => /hair/i.test(m?.name || ''));

// Find the avatar's touch spots in rest pose. Each spot is stored relative to
// the bone it moves with.
export function findAvatarSpots(rt) {
  const vrm = rt.vrm;
  const n = rt.nodes;
  vrm.scene.updateMatrixWorld(true);
  const meshes = [];
  vrm.scene.traverse((o) => {
    if (o.isMesh && o.visible) {
      if (o.isSkinnedMesh) o.skeleton.update();
      meshes.push(o);
    }
  });
  const ray = new THREE.Raycaster();
  const toWorld = (v) => vrm.scene.localToWorld(v.clone());
  const toRig = (v) => vrm.scene.worldToLocal(v.clone());
  // Cast from `from` along `dir` (rig space); return the first hit, in rig space.
  const cast = (from, dir, { hair = false, maxDist = 1 } = {}) => {
    const o = toWorld(from);
    const d = toWorld(from.clone().add(dir)).sub(o).normalize();
    ray.set(o, d);
    ray.far = maxDist;
    const hits = ray.intersectObjects(meshes, false).filter((h) => hair || !isHair(h.object));
    return hits.length ? toRig(hits[0].point) : null;
  };

  const up = rt.restUp;
  const left = rt.restLeft;
  const fwd = rt.forward;
  const head = n.head;
  const headPos = rt.rigPos(head);

  // Eyes and mouth give the face's proportions.
  const le = rt.h.getNormalizedBoneNode('leftEye');
  const re = rt.h.getNormalizedBoneNode('rightEye');
  const ed = rt.avatarEyeDist;
  let eyeL;
  let eyeR;
  if (le && re) {
    eyeL = rt.rigPos(le);
    eyeR = rt.rigPos(re);
  } else {
    const mid = headPos.clone().addScaledVector(up, ed).addScaledVector(fwd, ed);
    eyeL = mid.clone().addScaledVector(left, ed / 2);
    eyeR = mid.clone().addScaledVector(left, -ed / 2);
  }
  const eyes = eyeL.clone().add(eyeR).multiplyScalar(0.5);
  const mouthFromMorph = findMouth(vrm);
  const mouth = mouthFromMorph ? toRig(mouthFromMorph) : eyes.clone().addScaledVector(up, -1.1 * ed);
  // Vertical eye-to-mouth distance.
  const m = Math.max(0.5 * ed, eyes.clone().sub(mouth).dot(up));

  const front = (p, opts) => cast(p.clone().addScaledVector(fwd, 0.4), fwd.clone().negate(), opts)
    || p.clone().addScaledVector(fwd, ed * 0.6);
  const facePlane = (dy, dx = 0) => eyes.clone().addScaledVector(up, dy * m).addScaledVector(left, dx * ed);

  const spots = {};
  const put = (name, kind, bone, rigPoint) => {
    if (!bone || !rigPoint) return;
    spots[name] = { kind, bone, local: rigPoint.clone().sub(rt.rigPos(bone)) };
  };
  // Ears first: the face width sets where eyes and cheeks are (cartoon eye
  // bones are often much closer together than the drawn eyes).
  const earAt = {};
  for (const [name, sign] of [['leftEar', 1], ['rightEar', -1]]) {
    const p = facePlane(-0.3);
    const side = left.clone().multiplyScalar(sign);
    earAt[name] = cast(p.clone().addScaledVector(side, 0.4), side.clone().negate()) || p.clone().addScaledVector(side, ed * 1.4);
    put(name, 'face', head, earAt[name]);
  }
  const fw = earAt.leftEar.clone().sub(earAt.rightEar).dot(left);
  const eyeH = eyes.clone().sub(facePlane(0)).dot(up) / m;
  put('forehead', 'face', head, front(facePlane(0.8), { hair: true }));
  put('nose', 'face', head, front(facePlane(-0.5)));
  put('lips', 'face', head, front(mouth));
  put('chin', 'face', head, findChin(cast, mouth, up, fwd, m, ed) || front(mouth.clone().addScaledVector(up, -0.6 * m)));
  put('rightEye', 'face', head, front(facePlane(eyeH).addScaledVector(left, -0.21 * fw)));
  put('leftEye', 'face', head, front(facePlane(eyeH).addScaledVector(left, 0.21 * fw)));
  put('rightCheek', 'face', head, front(facePlane(-0.55).addScaledVector(left, -0.28 * fw)));
  put('leftCheek', 'face', head, front(facePlane(-0.55).addScaledVector(left, 0.28 * fw)));
  const chestBone = n.upperChest || n.chest || n.spine;
  const lsh = rt.rigPos(n.leftUpperArm);
  const rsh = rt.rigPos(n.rightUpperArm);
  put('leftShoulder', 'body', n.leftShoulder || chestBone, front(lsh));
  put('rightShoulder', 'body', n.rightShoulder || chestBone, front(rsh));
  const sw = lsh.distanceTo(rsh);
  put('chest', 'body', chestBone, front(lsh.clone().add(rsh).multiplyScalar(0.5).addScaledVector(up, -0.3 * sw)));

  const faceWidth = rigPoint(rt, spots.leftEar).distanceTo(rigPoint(rt, spots.rightEar));

  // Design check for sign language: are eyebrows and ears visible, or hidden
  // by hair? (Eyebrows carry grammar; ears are touch spots.)
  const firstHit = (from, dir) => {
    const o = toWorld(from);
    ray.set(o, toWorld(from.clone().add(dir)).sub(o).normalize());
    ray.far = 1;
    return ray.intersectObjects(meshes, false)[0] || null;
  };
  // Eyebrows sit just above the eyes; check a band above each eye and between them.
  let browsHidden = 0;
  let browsTotal = 0;
  for (const k of [-0.25, -0.15, 0, 0.15, 0.25]) {
    for (const dy of [0.3, 0.42, 0.55]) {
      const p = facePlane(eyeH + dy).addScaledVector(left, k * fw);
      const h = firstHit(p.clone().addScaledVector(fwd, 0.4), fwd.clone().negate());
      browsTotal++;
      if (h && isHair(h.object)) browsHidden++;
    }
  }
  const earsHidden = [['leftEar', 1], ['rightEar', -1]].filter(([, sign]) => {
    const side = left.clone().multiplyScalar(sign);
    const h = firstHit(facePlane(-0.3).addScaledVector(side, 0.4), side.clone().negate());
    return h && isHair(h.object);
  }).length;
  const check = {
    browsCovered: browsHidden / browsTotal,
    earsCovered: earsHidden,
    hairMeshFound: meshes.some(isHair),
  };
  return { spots, faceWidth, shoulderWidth: sw, mouthFound: !!mouthFromMorph, check };
}

// Chin: scan down from the mouth along the face front; the chin is the last
// point before the surface drops back to the neck.
function findChin(cast, mouth, up, fwd, m, ed) {
  const dep = (v) => v.dot(fwd);
  const at = (t) => cast(mouth.clone().addScaledVector(up, -t).addScaledVector(fwd, 0.4), fwd.clone().negate());
  const lips = at(0);
  if (!lips) return null;
  let last = lips;
  const step = m * 0.08;
  for (let t = step; t < m * 1.6; t += step) {
    const hit = at(t);
    if (!hit || dep(lips) - dep(hit) > 0.35 * ed) break;
    last = hit;
  }
  // Slightly above the edge, on the chin's front.
  return last === lips ? null : last.addScaledVector(up, step * 0.5);
}

// Current rig-space position of a spot.
export function rigPoint(rt, spot) {
  const q = rt.rigQuat(spot.bone, new THREE.Quaternion());
  return rt.rigPos(spot.bone).add(spot.local.clone().applyQuaternion(q));
}

// Mouth centre from the vertices the "aa" (mouth open) expression moves.
function findMouth(vrm) {
  const expr = vrm.expressionManager?.getExpression('aa');
  const binds = expr?._binds || [];
  const sum = new THREE.Vector3();
  let count = 0;
  const v = new THREE.Vector3();
  for (const bind of binds) {
    const prims = bind.primitives || [];
    for (const mesh of prims) {
      const delta = mesh.geometry?.morphAttributes?.position?.[bind.index];
      if (!delta) continue;
      let max = 0;
      for (let i = 0; i < delta.count; i++) max = Math.max(max, v.fromBufferAttribute(delta, i).length());
      if (max <= 0) continue;
      for (let i = 0; i < delta.count; i++) {
        if (v.fromBufferAttribute(delta, i).length() > 0.4 * max) {
          mesh.getVertexPosition(i, v);
          sum.add(mesh.localToWorld(v.clone()));
          count++;
        }
      }
    }
  }
  return count ? sum.divideScalar(count) : null;
}
