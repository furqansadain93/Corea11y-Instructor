// MediaPipe Tasks (pose + hands + face) wrapper. Runs in the browser; video
// never leaves the computer. The model files are downloaded from Google once
// and then cached by the browser.

import { FilesetResolver, PoseLandmarker, HandLandmarker, FaceLandmarker } from '@mediapipe/tasks-vision';
import { assignHands } from './retarget.js';

export const MEDIAPIPE_VERSION = '1.2.3';
const WASM = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`;
const MODELS = 'https://storage.googleapis.com/mediapipe-models';
export const MODEL_URLS = {
  poseFull: `${MODELS}/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task`,
  poseHeavy: `${MODELS}/pose_landmarker/pose_landmarker_heavy/float16/latest/pose_landmarker_heavy.task`,
  hand: `${MODELS}/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task`,
  face: `${MODELS}/face_landmarker/face_landmarker/float16/latest/face_landmarker.task`,
};

export class Tracker {
  constructor() {
    this.ready = false;
    this.lastTs = 0;
    this.base = 0;
  }

  // Call before each new video or webcam session so MediaPipe sees a fresh,
  // evenly spaced timeline.
  beginSequence() {
    this.base = this.lastTs + 1000;
  }

  async init({ quality = 'full', onStatus = () => {} } = {}) {
    onStatus('Loading MediaPipe…');
    const fileset = await FilesetResolver.forVisionTasks(WASM);
    const make = async (Task, url, extra) => {
      for (const delegate of ['GPU', 'CPU']) {
        try {
          return await Task.createFromOptions(fileset, { baseOptions: { modelAssetPath: url, delegate }, runningMode: 'VIDEO', ...extra });
        } catch (e) {
          if (delegate === 'CPU') throw e;
        }
      }
      return null;
    };
    onStatus('Loading body model…');
    this.pose = await make(PoseLandmarker, quality === 'heavy' ? MODEL_URLS.poseHeavy : MODEL_URLS.poseFull, { numPoses: 1 });
    onStatus('Loading hand model…');
    this.hands = await make(HandLandmarker, MODEL_URLS.hand, { numHands: 2, minHandDetectionConfidence: 0.4, minHandPresenceConfidence: 0.4, minTrackingConfidence: 0.4 });
    onStatus('Loading face model…');
    this.face = await make(FaceLandmarker, MODEL_URLS.face, { numFaces: 1, outputFaceBlendshapes: true });
    this.ready = true;
    onStatus('Tracking models ready.');
  }

  // Timestamps must always increase across calls.
  nextTs(ms) {
    this.lastTs = Math.max(this.lastTs + 1, Math.round(this.base + ms));
    return this.lastTs;
  }

  detect(source, ms) {
    const ts = this.nextTs(ms);
    const pose = this.pose.detectForVideo(source, ts);
    const hands = this.hands.detectForVideo(source, ts);
    const face = this.face.detectForVideo(source, ts);
    const width = source.videoWidth || source.width;
    const height = source.videoHeight || source.height;
    const poseImg = pose.landmarks?.[0] || null;
    const assigned = assignHands(poseImg, hands);
    const bs = {};
    for (const c of face.faceBlendshapes?.[0]?.categories || []) bs[c.categoryName] = c.score;
    return {
      width,
      height,
      pose: pose.worldLandmarks?.[0] || null,
      poseImg,
      hands: {
        left: assigned.left ? { world: assigned.left.world, img: assigned.left.img } : null,
        right: assigned.right ? { world: assigned.right.world, img: assigned.right.img } : null,
      },
      face: face.faceLandmarks?.[0] ? { landmarks: face.faceLandmarks[0], width, height } : null,
      blendshapes: face.faceBlendshapes?.[0] ? bs : null,
    };
  }

  close() {
    for (const t of [this.pose, this.hands, this.face]) t?.close();
    this.ready = false;
  }
}
