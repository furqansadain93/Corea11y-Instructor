import { Stage, SAMPLE_AVATAR_URL, listProjectAvatars } from './stage.js';
import { Tracker } from './tracker.js';
import { mapBlendshapes, gazeFromBlendshapes, FACE } from './retarget.js';
import { FACE_SPOTS } from './anchors.js';

const FACE_IDX = [...new Set([...Object.values(FACE), ...Object.values(FACE_SPOTS).flat()])];
import { LandmarkSmoother, OneEuro, SMOOTHING_PRESETS } from './filters.js';
import { MotionRecorder, validateMotion, sampleMotion } from './motion.js';

const $ = (id) => document.getElementById(id);
const el = {
  video: $('video'), overlay: $('overlay'), avatar: $('avatar'), videoEmpty: $('videoEmpty'),
  btnSample: $('btnSample'), fileVrm: $('fileVrm'), fileVideo: $('fileVideo'), btnWebcam: $('btnWebcam'),
  selQuality: $('selQuality'), selFps: $('selFps'), selSmooth: $('selSmooth'), rngFace: $('rngFace'), rngFaceOut: $('rngFaceOut'),
  chkSwap: $('chkSwap'), chkMarks: $('chkMarks'), chkGaze: $('chkGaze'), chkContact: $('chkContact'),
  chkNeutralFirst: $('chkNeutralFirst'), btnNeutral: $('btnNeutral'), btnNeutralReset: $('btnNeutralReset'), btnTrack: $('btnTrack'), btnCancel: $('btnCancel'), btnLiveRec: $('btnLiveRec'),
  progress: $('progress'), btnPlay: $('btnPlay'), btnPause: $('btnPause'), btnRestart: $('btnRestart'), selSpeed: $('selSpeed'),
  btnSaveMotion: $('btnSaveMotion'), fileMotion: $('fileMotion'), selBg: $('selBg'), selSize: $('selSize'),
  btnFrame: $('btnFrame'), btnRecord: $('btnRecord'), status: $('status'),
};

const stage = new Stage(el.avatar);
let tracker = null;
let trackerQuality = null;
let motion = null; // loaded or tracked motion data (JSON form)
let videoName = 'motion';
let mode = 'idle'; // idle | tracking | playing | live
let cancelRequested = false;
let liveRecorder = null;
let playClock = { start: 0, offset: 0, running: false };
let webcamStream = null;
let liveT0 = 0;

const smoother = new LandmarkSmoother(SMOOTHING_PRESETS.medium);
let bsBase = null; // signer's resting face (neutral calibration)
let neutralSet = false;
let lastRaw = null; // last detection, for "Set neutral now"
let lastT = 0;
const bsFilters = new Map();

function status(msg, isError = false) {
  el.status.textContent = msg;
  el.status.classList.toggle('error', isError);
}

function updateButtons() {
  const hasAvatar = !!stage.vrm;
  const hasVideo = !!el.video.src && !webcamStream;
  const busy = mode === 'tracking';
  el.btnTrack.disabled = !hasAvatar || !hasVideo || busy;
  el.btnCancel.disabled = !busy;
  el.btnLiveRec.disabled = mode !== 'live';
  el.btnPlay.disabled = !motion || busy || !hasAvatar;
  el.btnPause.disabled = mode !== 'playing';
  el.btnRestart.disabled = !motion || busy || !hasAvatar;
  el.btnSaveMotion.disabled = !motion || busy;
  el.btnRecord.disabled = !motion || busy || !hasAvatar;
  el.btnSample.disabled = busy;
  el.btnNeutral.disabled = !hasAvatar || busy || (!lastRaw && !hasVideo);
  el.btnNeutralReset.disabled = !hasAvatar || busy || !neutralSet;
}

function download(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

// ---------- Avatar ----------

async function loadAvatar(source, label) {
  try {
    status(`Loading ${label}…`);
    await stage.loadAvatar(source);
    resetNeutral();
    status(`${label} loaded. ${avatarReport()}`);
  } catch (e) {
    console.error(e);
    status(`Could not load the avatar: ${e.message}`, true);
  }
  updateButtons();
}

// Sign-language design check for the loaded avatar.
function avatarReport() {
  const names = stage.expressionNames();
  const c = stage.retargeter.touch.check;
  const notes = [];
  notes.push(names.includes('jawOpen') ? 'Full face tracking (52 shapes): yes.' : 'Face: basic expressions only (add the 52 face shapes for eyebrow and mouth detail).');
  if (!c.hairMeshFound) notes.push('Hair: could not tell which parts are hair, so the hair check was skipped.');
  else {
    const b = c.browsCovered;
    notes.push(b > 0.5 ? 'Eyebrows: covered by hair. Shorten the fringe so eyebrows show.'
      : b > 0.1 ? `Eyebrows: partly covered by hair (${Math.round(b * 100)}% of the brow area). Shorten or part the fringe.`
        : 'Eyebrows: visible.');
    notes.push(c.earsCovered ? `Ears: ${c.earsCovered === 2 ? 'both' : 'one'} covered by hair. Tuck hair behind the ears or tie it back.` : 'Ears: visible.');
  }
  return notes.join(' ');
}

el.btnSample.addEventListener('click', () => loadAvatar(SAMPLE_AVATAR_URL, 'Sample avatar'));

// Our avatars from the avatars folder: one button each; load the first.
listProjectAvatars().then((list) => {
  const box = document.getElementById('projectAvatars');
  for (const a of list) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = `Load ${a.name}`;
    b.addEventListener('click', () => loadAvatar(a.url, a.name));
    box.appendChild(b);
  }
  if (list.length && !stage.vrm) loadAvatar(list[0].url, list[0].name);
});
el.fileVrm.addEventListener('change', () => {
  const f = el.fileVrm.files[0];
  if (f) loadAvatar(f, f.name);
  el.fileVrm.value = '';
});

// ---------- Video / webcam ----------

function stopWebcam() {
  if (webcamStream) {
    webcamStream.getTracks().forEach((t) => t.stop());
    webcamStream = null;
    el.video.srcObject = null;
    el.btnWebcam.textContent = 'Use webcam (live)';
    if (mode === 'live') mode = 'idle';
  }
}

el.fileVideo.addEventListener('change', () => {
  const f = el.fileVideo.files[0];
  el.fileVideo.value = '';
  if (!f) return;
  stopWebcam();
  videoName = f.name.replace(/\.[^.]+$/, '');
  el.video.src = URL.createObjectURL(f);
  el.video.load();
  el.video.addEventListener('loadedmetadata', () => {
    el.videoEmpty.hidden = true;
    resizeOverlay();
    lastRaw = null;
    status(`Video loaded (${el.video.duration.toFixed(1)} s, ${el.video.videoWidth}×${el.video.videoHeight}). Press "Track video".`);
    updateButtons();
  }, { once: true });
});

function resizeOverlay() {
  el.overlay.width = el.video.videoWidth || 640;
  el.overlay.height = el.video.videoHeight || 360;
}

async function ensureTracker() {
  const q = el.selQuality.value;
  if (tracker && trackerQuality === q) return tracker;
  tracker?.close();
  tracker = new Tracker();
  trackerQuality = q;
  await tracker.init({ quality: q, onStatus: status });
  return tracker;
}

el.btnWebcam.addEventListener('click', async () => {
  if (webcamStream) { stopWebcam(); updateButtons(); status('Webcam stopped.'); return; }
  if (!stage.vrm) { status('Load an avatar first.', true); return; }
  try {
    await ensureTracker();
    webcamStream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 }, audio: false });
    el.video.removeAttribute('src');
    el.video.srcObject = webcamStream;
    await el.video.play();
    el.videoEmpty.hidden = true;
    resizeOverlay();
    resetFilters();
    tracker.beginSequence();
    stage.retargeter.resetTracking();
    if (el.chkNeutralFirst.checked) resetNeutral();
    liveT0 = performance.now();
    mode = 'live';
    el.btnWebcam.textContent = 'Stop webcam';
    status('Live: sign in front of the camera. Press "Record live motion" to capture.');
    liveLoop();
  } catch (e) {
    console.error(e);
    status(`Webcam not available: ${e.message}`, true);
  }
  updateButtons();
});

el.btnLiveRec.addEventListener('click', () => {
  if (!liveRecorder) {
    liveRecorder = new MotionRecorder({ source: { name: 'webcam', fps: null } });
    liveRecorder.t0 = performance.now();
    el.btnLiveRec.textContent = 'Stop recording';
    el.btnLiveRec.setAttribute('aria-pressed', 'true');
    status('Recording live motion…');
  } else {
    if (liveRecorder.frames.length > 1) {
      motion = liveRecorder.toJSON();
      videoName = `webcam-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}`;
      status(`Recorded ${motion.duration.toFixed(1)} s of motion. Save it, play it, or record a video.`);
    }
    liveRecorder = null;
    el.btnLiveRec.textContent = 'Record live motion';
    el.btnLiveRec.setAttribute('aria-pressed', 'false');
    updateButtons();
  }
});

function liveLoop() {
  if (mode !== 'live' || !webcamStream) return;
  const step = () => {
    if (mode !== 'live' || !webcamStream) return;
    if (el.video.readyState >= 2) {
      const now = performance.now();
      const result = tracker.detect(el.video, now - liveT0);
      const t = now / 1000;
      const calibrate = el.chkNeutralFirst.checked && !neutralSet;
      const { exprs, gaze } = applyResult(result, t, { calibrate });
      if (liveRecorder) liveRecorder.add((now - liveRecorder.t0) / 1000, stage.retargeter.getBoneQuats(), exprs, gaze);
    }
    if (el.video.requestVideoFrameCallback) el.video.requestVideoFrameCallback(step); else requestAnimationFrame(step);
  };
  step();
}

// ---------- Tracking ----------

function resetFilters() {
  smoother.setParams(SMOOTHING_PRESETS[el.selSmooth.value]);
  bsFilters.clear();
}

function smoothBlendshapes(bs, t) {
  const params = SMOOTHING_PRESETS[el.selSmooth.value];
  if (!bs || !params) return bs;
  const out = {};
  for (const [k, v] of Object.entries(bs)) {
    let f = bsFilters.get(k);
    if (!f) { f = new OneEuro(params); bsFilters.set(k, f); }
    out[k] = f.filter(v, t);
  }
  return out;
}

// Smooth, retarget, set face and gaze. Returns { exprs, gaze }.
function applyResult(r, t, { calibrate = false } = {}) {
  lastRaw = r;
  lastT = t;
  const smoothing = !!SMOOTHING_PRESETS[el.selSmooth.value];
  const sm = (key, lms) => (smoothing ? smoother.smooth(key, lms, t) : lms);
  const frame = { pose: null, hands: { left: null, right: null }, face: null };
  // Image-space landmarks (accurate in x/y) for touch detection.
  frame.img = { width: r.width, height: r.height, pose: null, hands: { left: null, right: null }, face: null };
  if (r.pose) frame.pose = sm('pose', r.pose);
  if (r.poseImg) frame.img.pose = sm('poseImg', r.poseImg);
  for (const side of ['left', 'right']) {
    if (r.hands[side]) {
      frame.hands[side] = { world: sm(side, r.hands[side].world) };
      frame.img.hands[side] = sm(`${side}Img`, r.hands[side].img);
    } else {
      smoother.reset(side);
      smoother.reset(`${side}Img`);
    }
  }
  if (r.face) {
    const pts = sm('face', FACE_IDX.map((i) => r.face.landmarks[i]));
    const sparse = [];
    FACE_IDX.forEach((i, j) => { sparse[i] = pts[j]; });
    frame.face = { landmarks: sparse, width: r.face.width, height: r.face.height };
    frame.img.face = sparse;
  }
  const doCalibrate = calibrate && !!frame.face;
  stage.retargeter.apply(frame, { contact: el.chkContact.checked, calibrate: doCalibrate });
  const bs = r.blendshapes ? smoothBlendshapes(r.blendshapes, t) : null;
  if (doCalibrate && bs) bsBase = { ...bs };
  if (doCalibrate) { neutralSet = true; updateButtons(); }
  const exprs = bs
    ? mapBlendshapes(bs, stage.expressionNames(), { gain: Number(el.rngFace.value), swapSides: el.chkSwap.checked, base: bsBase })
    : {};
  const gaze = bs && el.chkGaze.checked ? gazeFromBlendshapes(bs, { swapSides: el.chkSwap.checked }) : null;
  stage.setExpressions(exprs);
  stage.setGaze(gaze);
  drawOverlay(r);
  drawTouches();
  return { exprs, gaze };
}

function resetNeutral() {
  stage.retargeter?.resetNeutral();
  bsBase = null;
  neutralSet = false;
  updateButtons();
}

el.btnNeutralReset.addEventListener('click', () => { resetNeutral(); status('Neutral reset.'); });
el.btnNeutral.addEventListener('click', async () => {
  try {
    let r = lastRaw;
    let t = lastT;
    if (mode !== 'live' && el.video.src && !webcamStream) {
      await ensureTracker();
      r = tracker.detect(el.video, el.video.currentTime * 1000);
      t = el.video.currentTime;
    }
    if (!r || !r.face) { status('No face found in this frame. Pick a frame where the face is clearly visible.', true); return; }
    applyResult(r, t, { calibrate: true });
    stage.render();
    status('Neutral head and face set from this frame.');
  } catch (e) {
    status(`Could not set neutral: ${e.message}`, true);
  }
});

function seek(t) {
  return new Promise((resolve) => {
    const done = () => { clearTimeout(timer); resolve(); };
    const timer = setTimeout(done, 3000);
    el.video.addEventListener('seeked', done, { once: true });
    el.video.currentTime = t;
  });
}

async function trackVideo() {
  if (!stage.vrm || !el.video.src) return;
  mode = 'tracking';
  cancelRequested = false;
  updateButtons();
  try {
    await ensureTracker();
    el.video.pause();
    resetFilters();
    tracker.beginSequence();
    stage.retargeter.restPose();
    stage.retargeter.resetTracking();
    if (el.chkNeutralFirst.checked) resetNeutral();
    const fps = Number(el.selFps.value);
    const duration = el.video.duration;
    const total = Math.max(1, Math.floor(duration * fps));
    const rec = new MotionRecorder({ source: { name: videoName, width: el.video.videoWidth, height: el.video.videoHeight, fps } });
    let missingPose = 0;
    let missingHands = 0;
    for (let i = 0; i < total; i++) {
      if (cancelRequested) break;
      const t = i / fps;
      await seek(t);
      const r = tracker.detect(el.video, t * 1000);
      if (!r.pose) missingPose++;
      if (!r.hands.left && !r.hands.right) missingHands++;
      const calibrate = el.chkNeutralFirst.checked && !neutralSet;
      const { exprs, gaze } = applyResult(r, t, { calibrate });
      rec.add(t, stage.retargeter.getBoneQuats(), exprs, gaze);
      stage.render();
      el.progress.value = (i + 1) / total;
      if (i % 5 === 0) status(`Tracking frame ${i + 1} of ${total}…`);
    }
    if (cancelRequested) {
      status('Tracking cancelled.');
    } else {
      motion = rec.toJSON();
      motion.quality = { frames: total, framesWithoutBody: missingPose, framesWithoutHands: missingHands };
      motion.settings = { smoothing: el.selSmooth.value, faceStrength: Number(el.rngFace.value), gaze: el.chkGaze.checked, contact: el.chkContact.checked, neutral: neutralSet };
      const warn = missingPose / total > 0.1 || missingHands / total > 0.3
        ? ` Warning: body missing in ${missingPose} and hands missing in ${missingHands} of ${total} frames. Check lighting and framing.`
        : '';
      status(`Done: ${total} frames tracked.${warn} Press Play to watch, or save the motion.`);
    }
  } catch (e) {
    console.error(e);
    status(`Tracking failed: ${e.message}`, true);
  }
  mode = 'idle';
  updateButtons();
}

el.btnTrack.addEventListener('click', trackVideo);
el.btnCancel.addEventListener('click', () => { cancelRequested = true; });
el.selSmooth.addEventListener('change', resetFilters);
el.rngFace.addEventListener('input', () => { el.rngFaceOut.value = Number(el.rngFace.value).toFixed(1); });

// ---------- Overlay ----------

const POSE_LINES = [[11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24], [23, 24]];
const HAND_LINES = [[0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [5, 9], [9, 10], [10, 11], [11, 12], [9, 13], [13, 14], [14, 15], [15, 16], [13, 17], [0, 17], [17, 18], [18, 19], [19, 20]];

function drawOverlay(r) {
  const ctx = el.overlay.getContext('2d');
  const w = el.overlay.width;
  const h = el.overlay.height;
  ctx.clearRect(0, 0, w, h);
  if (!el.chkMarks.checked) return;
  const lines = (pts, pairs, color) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(2, w / 400);
    ctx.beginPath();
    for (const [a, b] of pairs) {
      if (!pts[a] || !pts[b]) continue;
      ctx.moveTo(pts[a].x * w, pts[a].y * h);
      ctx.lineTo(pts[b].x * w, pts[b].y * h);
    }
    ctx.stroke();
  };
  if (r.poseImg) lines(r.poseImg, POSE_LINES, '#00e5ff');
  if (r.hands.left?.img) lines(r.hands.left.img, HAND_LINES, '#ffd400');
  if (r.hands.right?.img) lines(r.hands.right.img, HAND_LINES, '#ff4fd8');
  if (r.face) {
    ctx.fillStyle = '#7CFC00';
    for (const i of Object.values(FACE)) {
      const p = r.face.landmarks[i];
      ctx.beginPath();
      ctx.arc(p.x * w, p.y * h, Math.max(3, w / 250), 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

const SPOT_NAMES = {
  forehead: 'forehead', nose: 'nose', lips: 'lips', chin: 'chin', leftCheek: 'left cheek', rightCheek: 'right cheek',
  leftEar: 'left ear', rightEar: 'right ear', leftEye: 'left eye', rightEye: 'right eye',
  leftShoulder: 'left shoulder', rightShoulder: 'right shoulder', chest: 'chest',
};

// Show detected touches on the video, e.g. "Right index → lips".
function drawTouches() {
  if (!el.chkMarks.checked || !stage.retargeter) return;
  const ctx = el.overlay.getContext('2d');
  const size = Math.max(16, el.overlay.width / 40);
  ctx.font = `600 ${size}px system-ui, sans-serif`;
  let y = size * 1.4;
  for (const side of ['left', 'right']) {
    const tch = stage.retargeter.lastTouch[side];
    if (!tch || tch.w < 0.3) continue;
    const label = `${side === 'left' ? 'Left' : 'Right'} ${tch.point} → ${SPOT_NAMES[tch.spot] || tch.spot}`;
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(size * 0.5, y - size, ctx.measureText(label).width + size, size * 1.4);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(label, size, y);
    y += size * 1.8;
  }
}

// ---------- Playback ----------

function motionMatchesVideo() {
  return motion && el.video.src && !webcamStream && motion.source?.name === videoName;
}

function currentTime() {
  if (motionMatchesVideo()) return el.video.currentTime;
  if (!playClock.running) return playClock.offset;
  return playClock.offset + ((performance.now() - playClock.start) / 1000) * Number(el.selSpeed.value);
}

function play(fromStart = false) {
  if (!motion) return;
  if (fromStart) playClock.offset = 0;
  if (playClock.offset >= motion.duration) playClock.offset = 0;
  playClock.start = performance.now();
  playClock.running = true;
  mode = 'playing';
  if (motionMatchesVideo()) {
    if (fromStart) el.video.currentTime = 0;
    el.video.playbackRate = Number(el.selSpeed.value);
    el.video.play();
  }
  updateButtons();
}

function pause() {
  playClock.offset = currentTime();
  playClock.running = false;
  el.video.pause();
  if (mode === 'playing') mode = 'idle';
  updateButtons();
}

el.btnPlay.addEventListener('click', () => play(false));
el.btnPause.addEventListener('click', pause);
el.btnRestart.addEventListener('click', () => play(true));
el.selSpeed.addEventListener('change', () => {
  if (mode === 'playing') { pause(); play(false); }
});

function applyMotionAt(t) {
  const s = sampleMotion(motion, t);
  stage.retargeter.setBoneQuats(s.bones);
  stage.setExpressions(s.expressions);
  stage.setGaze(s.gaze);
}

// ---------- Motion files ----------

el.btnSaveMotion.addEventListener('click', () => {
  if (!motion) return;
  download(new Blob([JSON.stringify(motion)], { type: 'application/json' }), `${videoName}.motion.json`);
});

el.fileMotion.addEventListener('change', async () => {
  const f = el.fileMotion.files[0];
  el.fileMotion.value = '';
  if (!f) return;
  try {
    motion = validateMotion(JSON.parse(await f.text()));
    videoName = motion.source?.name || f.name.replace(/\.motion\.json$|\.json$/, '');
    playClock.offset = 0;
    status(`Loaded motion "${f.name}" (${motion.duration.toFixed(1)} s).${stage.vrm ? ' Press Play.' : ' Load an avatar to see it.'}`);
  } catch (e) {
    status(`Could not load motion: ${e.message}`, true);
  }
  updateButtons();
});

// ---------- Output ----------

el.selBg.addEventListener('change', () => stage.setBackground(el.selBg.value));
{
  const w = document.getElementById('rngWarmth');
  const wo = document.getElementById('rngWarmthOut');
  w.addEventListener('input', () => { stage.warmth = Number(w.value); wo.value = Number(w.value).toFixed(2); });
}
document.getElementById('selLook').addEventListener('change', (e) => stage.setLook(e.target.value));
el.selSize.addEventListener('change', () => stage.setSize(el.selSize.value));
el.btnFrame.addEventListener('click', () => stage.frameUpperBody());

el.btnRecord.addEventListener('click', async () => {
  if (!motion || !stage.vrm) return;
  if (!window.MediaRecorder) { status('This browser cannot record video. Use Chrome or Edge.', true); return; }
  const stream = el.avatar.captureStream(30);
  const type = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find((t) => MediaRecorder.isTypeSupported(t));
  const rec = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 8_000_000 });
  const chunks = [];
  rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
  const stopped = new Promise((resolve) => { rec.onstop = resolve; });
  el.btnRecord.disabled = true;
  status('Recording avatar video… keep this tab visible until it finishes.');
  rec.start();
  play(true);
  const speed = Number(el.selSpeed.value);
  await new Promise((resolve) => setTimeout(resolve, (motion.duration / speed) * 1000 + 300));
  pause();
  rec.stop();
  await stopped;
  download(new Blob(chunks, { type: 'video/webm' }), `${videoName}.avatar.webm`);
  status('Avatar video saved (.webm). YouTube accepts this format directly.');
  updateButtons();
});

// ---------- Render loop ----------

function loop() {
  if (mode === 'playing' && motion && stage.vrm) {
    const t = currentTime();
    applyMotionAt(Math.min(t, motion.duration));
    if (t >= motion.duration && !motionMatchesVideo()) pause();
  }
  if (mode === 'playing' && motionMatchesVideo() && el.video.ended) pause();
  stage.render();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
updateButtons();

// Hooks for the automatic checks in test.html.
window.__lab = { stage, get motion() { return motion; }, set motion(m) { motion = m; updateButtons(); }, applyMotionAt };
