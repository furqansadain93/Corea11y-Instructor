// three.js scene with one VRM avatar.

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { Retargeter } from './retarget.js';

export const SAMPLE_AVATAR_URL = 'https://raw.githubusercontent.com/pixiv/three-vrm/v3.6.0/packages/three-vrm/examples/models/VRM1_Constraint_Twist_Sample.vrm';

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
    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(0.5, 1.5, 2);
    this.scene.add(key, new THREE.AmbientLight(0xffffff, 1.0));
    this.timer = new THREE.Timer();
    this.vrm = null;
    this.retargeter = null;
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

  setExpressions(values) {
    const em = this.vrm?.expressionManager;
    if (!em) return;
    for (const e of em.expressions) em.setValue(e.expressionName, values[e.expressionName] ?? 0);
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
    if (this.vrm) this.vrm.update(dt);
    this.renderer.render(this.scene, this.camera);
  }
}
