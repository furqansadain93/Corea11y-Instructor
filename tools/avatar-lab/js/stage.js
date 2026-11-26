// three.js scene with one VRM avatar.

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { Retargeter } from './retarget.js';

export const SAMPLE_AVATAR_URL = 'https://raw.githubusercontent.com/pixiv/three-vrm/v3.6.0/packages/three-vrm/examples/models/VRM1_Constraint_Twist_Sample.vrm';

// Our own avatars live in <repo>/avatars (not in git). avatars.json lists them:
// [{ "name": "Dayya", "file": "Dayya.vrm" }]
export const PROJECT_AVATARS_DIR = new URL('../../../avatars/', import.meta.url).href;

export async function listProjectAvatars() {
  try {
    const res = await fetch(`${PROJECT_AVATARS_DIR}avatars.json`, { cache: 'no-store' });
    if (!res.ok) return [];
    const list = await res.json();
    return Array.isArray(list) ? list.filter((a) => a && a.file).map((a) => ({ name: a.name || a.file, url: PROJECT_AVATARS_DIR + a.file })) : [];
  } catch {
    return [];
  }
}

/**
 * Resting face: a "sweet" expression (soft smile, gentle eyes) under whatever
 * the signer's face does. It fades when the signer's brows or mouth are active,
 * because those carry sign language grammar (questions, mouth shapes).
 * Falls back to VRM "relaxed" at half strength if the avatar has no "sweet".
 */
export function warmthLayer(values, names, warmth) {
  const out = { ...values };
  const sweet = names.includes('sweet') ? 'sweet' : names.includes('relaxed') ? 'relaxed' : null;
  if (!sweet || warmth <= 0) return out;
  const g = (k) => values[k] ?? 0;
  const brow = Math.max(g('angry'), g('sad'), g('surprised'), g('browDownLeft'), g('browDownRight'), g('browInnerUp'), g('browOuterUpLeft'), g('browOuterUpRight'));
  const mouth = Math.max(g('aa'), g('ih'), g('ou'), g('ee'), g('oh'), g('jawOpen'), g('mouthFunnel'), g('mouthPucker'));
  const w = warmth * (sweet === 'sweet' ? 1 : 0.5) * (1 - Math.min(1, brow * 1.5)) * (1 - 0.6 * Math.min(1, mouth));
  out[sweet] = Math.max(out[sweet] ?? 0, w);
  return out;
}

export const OUTPUT_SIZES = {
  landscape: [1280, 720],
  square: [1080, 1080],
  portrait: [720, 1280],
};

export class Stage {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#ffffff');
    this.camera = new THREE.PerspectiveCamera(30, 16 / 9, 0.1, 20);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    // Two lighting set-ups: "studio" (key, fill, rim and sky light, like an
    // animated film; gives more depth) and "flat" (the original even light).
    this.lights = {
      studio: [
        Object.assign(new THREE.DirectionalLight(0xfff1e4, 1.7), { name: 'key' }),
        Object.assign(new THREE.DirectionalLight(0xdfe8ff, 0.55), { name: 'fill' }),
        Object.assign(new THREE.DirectionalLight(0xffffff, 1.4), { name: 'rim' }),
        new THREE.HemisphereLight(0xf2f5ff, 0x6b5a50, 0.6),
      ],
      flat: [
        Object.assign(new THREE.DirectionalLight(0xffffff, 2.2), { name: 'key' }),
        new THREE.AmbientLight(0xffffff, 1.0),
      ],
    };
    this.lights.studio[0].position.set(-1.2, 2.2, 2.2);
    this.lights.studio[1].position.set(1.6, 1.2, 1.5);
    this.lights.studio[2].position.set(0.8, 2.0, -2.0);
    this.lights.flat[0].position.set(0.5, 1.5, 2);
    for (const set of Object.values(this.lights)) for (const l of set) { l.visible = false; this.scene.add(l); }
    this.setLook('studio');
    this.timer = new THREE.Timer();
    this.vrm = null;
    this.retargeter = null;
    this.warmth = 0.75;
    this.autoBlink = true;
    this.rawExpressions = {};
    this._lastBlink = 0;
    this._nextBlinkGap = 3;
    this._blinkStart = -1;
    this.setSize('landscape');
  }

  setSize(name) {
    const [w, h] = OUTPUT_SIZES[name] || OUTPUT_SIZES.landscape;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.sizeName = name;
    this.frameUpperBody();
  }

  setLook(name) {
    this.look = this.lights[name] ? name : 'studio';
    for (const [k, set] of Object.entries(this.lights)) for (const l of set) l.visible = k === this.look;
    this.renderer.toneMapping = this.look === 'studio' ? THREE.NeutralToneMapping : THREE.NoToneMapping;
    this.renderer.toneMappingExposure = 1.0;
  }

  setBackground(color) {
    this.scene.background = new THREE.Color(color);
  }

  async loadAvatar(source) {
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));
    const gltf = typeof source === 'string'
      ? await loader.loadAsync(source)
      : await loader.parseAsync(await source.arrayBuffer(), '');
    const vrm = gltf.userData.vrm;
    if (!vrm) throw new Error('This file is not a VRM avatar.');
    if (!vrm.humanoid.getNormalizedBoneNode('leftHand') || !vrm.humanoid.getNormalizedBoneNode('leftIndexProximal')) {
      throw new Error('This avatar has no finger bones, so it cannot sign.');
    }
    VRMUtils.removeUnnecessaryVertices(gltf.scene);
    VRMUtils.combineSkeletons(gltf.scene);
    VRMUtils.rotateVRM0(vrm);
    vrm.scene.traverse((o) => { o.frustumCulled = false; });
    if (this.vrm) {
      this.scene.remove(this.vrm.scene);
      VRMUtils.deepDispose(this.vrm.scene);
    }
    this.vrm = vrm;
    this.scene.add(vrm.scene);
    this.retargeter = new Retargeter(vrm);
    this.retargeter.restPose();
    vrm.update(0);
    this.frameUpperBody();
    return vrm;
  }

  expressionNames() {
    const em = this.vrm?.expressionManager;
    return em ? em.expressions.map((e) => e.expressionName) : [];
  }

  // Store the source expressions (tracking or motion file); the resting face
  // and blinking are layered on at render time.
  setExpressions(values) {
    this.rawExpressions = values || {};
  }

  _applyExpressions() {
    const em = this.vrm?.expressionManager;
    if (!em) return;
    const names = this.expressionNames();
    const v = warmthLayer(this.rawExpressions, names, this.warmth);
    // Natural blinking when the source has none (no face tracked, demo motions).
    const now = performance.now() / 1000;
    const blinkIn = Math.max(v.blink ?? 0, v.blinkLeft ?? 0, v.blinkRight ?? 0, v.eyeBlinkLeft ?? 0, v.eyeBlinkRight ?? 0);
    if (blinkIn > 0.3) this._lastBlink = now;
    if (this.autoBlink && now - this._lastBlink > this._nextBlinkGap) {
      this._blinkStart = now;
      this._lastBlink = now;
      this._nextBlinkGap = 2.5 + Math.random() * 3;
    }
    const tb = now - this._blinkStart;
    if (tb >= 0 && tb < 0.16) {
      const k = 1 - Math.abs(tb / 0.08 - 1);
      if (names.includes('blink')) v.blink = Math.max(v.blink ?? 0, k);
      else { v.eyeBlinkLeft = Math.max(v.eyeBlinkLeft ?? 0, k); v.eyeBlinkRight = Math.max(v.eyeBlinkRight ?? 0, k); }
    }
    for (const e of em.expressions) em.setValue(e.expressionName, v[e.expressionName] ?? 0);
  }

  // yaw > 0: the avatar looks to its own left; pitch > 0: looks up.
  setGaze(gaze) {
    const la = this.vrm?.lookAt;
    if (!la) return;
    la.autoUpdate = false;
    la.yaw = gaze ? gaze.yaw : 0;
    la.pitch = gaze ? -gaze.pitch : 0;
  }

  // Signing space: top of the head to the waist.
  frameUpperBody() {
    if (!this.vrm) {
      this.camera.position.set(0, 1.3, 2.2);
      this.controls.target.set(0, 1.2, 0);
      return;
    }
    const head = new THREE.Vector3();
    const hips = new THREE.Vector3();
    this.vrm.humanoid.getNormalizedBoneNode('head').getWorldPosition(head);
    this.vrm.humanoid.getNormalizedBoneNode('hips').getWorldPosition(hips);
    const top = head.y + 0.2;
    const bottom = hips.y - 0.05;
    const centerY = (top + bottom) / 2;
    const vFov = (this.camera.fov * Math.PI) / 180;
    const needH = (top - bottom) * 1.1;
    const needW = this.camera.aspect < 1 ? 0.95 : 1.3; // room for arms out to the side
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * this.camera.aspect);
    const dist = Math.max(needH / 2 / Math.tan(vFov / 2), needW / 2 / Math.tan(hFov / 2));
    this.controls.target.set(0, centerY, 0);
    this.camera.position.set(0, centerY, dist);
    this.controls.update();
  }

  render() {
    this.timer.update();
    const dt = Math.min(this.timer.getDelta(), 0.1);
    this.controls.update();
    if (this.vrm) {
      this._applyExpressions();
      this.vrm.update(dt);
    }
    this.renderer.render(this.scene, this.camera);
  }
}
