"""Track a signer video with MediaPipe in Python and write a motion file the
Avatar Lab can re-process ("Load motion", then "Re-process with current lab").

Why offline Python instead of tracking in the browser:
  * every frame of the video is used, at the video's own frame rate;
  * the most accurate (heavy) body model is used;
  * gaps where a hand is lost for a moment are filled from the frames on BOTH
    sides, instead of freezing the hand;
  * smoothing looks backwards and forwards, so it adds no lag;
  * a hand detected far away from the body's wrist (a false detection) is
    thrown out.

Two tracking setups can be compared on the same video:
  separate  pose (heavy) + hands + face, as the lab does in the browser
  holistic  MediaPipe Holistic Landmarker (hands found from the body)

Usage (from this folder):
  .venv\\Scripts\\python track.py VIDEO [--mode both|separate|holistic] [--fps N] [--start S] [--end S]
Results go to out\\<video name>\\ : motion files, report.md, report.json, sheet.png.
"""

import argparse
import json
import math
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import cv2
import mediapipe as mp
import numpy as np
from mediapipe.tasks.python import BaseOptions, vision

HERE = Path(__file__).resolve().parent
MODELS = HERE / "models"

# Face mesh points the lab uses (FACE in retarget.js + FACE_SPOTS in anchors.js, same order).
FACE_IDX = [10, 152, 33, 263, 1, 0, 17, 50, 280, 234, 454, 133, 362]

# MediaPipe pose indices.
L_SH, R_SH, L_EL, R_EL, L_WR, R_WR = 11, 12, 13, 14, 15, 16

GAP_FILL_SECONDS = 0.30  # fill hand/body/face gaps up to this long
SIGMA_SECONDS = {"pose": 0.045, "hand": 0.035, "face": 0.035, "bs": 0.035}  # two-way smoothing strength
SIDE_SWITCH_SECONDS = 0.2  # an arm segment must look to be on the other side this long before it switches
FAR_HAND = 1.0  # reject a hand whose wrist is further than this many shoulder widths from the body's wrist


# ---------------------------------------------------------------- tracking

def _opts(model, **extra):
    return dict(base_options=BaseOptions(model_asset_path=str(MODELS / model)), running_mode=vision.RunningMode.VIDEO, **extra)


class SeparateTracker:
    name = "separate"

    def __init__(self, body="heavy"):
        self.pose = vision.PoseLandmarker.create_from_options(vision.PoseLandmarkerOptions(**_opts(f"pose_landmarker_{body}.task", num_poses=1)))
        self.hands = vision.HandLandmarker.create_from_options(vision.HandLandmarkerOptions(**_opts(
            "hand_landmarker.task", num_hands=2, min_hand_detection_confidence=0.4,
            min_hand_presence_confidence=0.4, min_tracking_confidence=0.4)))
        self.face = vision.FaceLandmarker.create_from_options(vision.FaceLandmarkerOptions(**_opts(
            "face_landmarker.task", num_faces=1, output_face_blendshapes=True)))

    def detect(self, image, ms):
        p = self.pose.detect_for_video(image, ms)
        h = self.hands.detect_for_video(image, ms)
        f = self.face.detect_for_video(image, ms)
        hands = [{"img": h.hand_landmarks[i], "world": h.hand_world_landmarks[i]} for i in range(len(h.hand_landmarks))]
        return {
            "pose": p.pose_world_landmarks[0] if p.pose_world_landmarks else None,
            "poseImg": p.pose_landmarks[0] if p.pose_landmarks else None,
            "hands": hands,
            "face": f.face_landmarks[0] if f.face_landmarks else None,
            "bs": f.face_blendshapes[0] if f.face_blendshapes else None,
        }

    def close(self):
        for t in (self.pose, self.hands, self.face):
            t.close()


class _P:
    __slots__ = ("x", "y", "z")

    def __init__(self, x, y, z):
        self.x, self.y, self.z = x, y, z


def centre_hand(world):
    """Holistic gives hand world points relative to the hips; the hand model
    (and the lab) put the origin at the middle of the hand. Shift to match."""
    cx = sum(p.x for p in world) / len(world)
    cy = sum(p.y for p in world) / len(world)
    cz = sum(p.z for p in world) / len(world)
    return [_P(p.x - cx, p.y - cy, p.z - cz) for p in world]


class HolisticTracker:
    name = "holistic"

    def __init__(self):
        self.task = vision.HolisticLandmarker.create_from_options(vision.HolisticLandmarkerOptions(**_opts(
            "holistic_landmarker.task", output_face_blendshapes=True)))

    def detect(self, image, ms):
        r = self.task.detect_for_video(image, ms)
        hands = []
        for img, world in ((r.left_hand_landmarks, r.left_hand_world_landmarks), (r.right_hand_landmarks, r.right_hand_world_landmarks)):
            if img and world:
                hands.append({"img": img, "world": centre_hand(world)})
        bs = r.face_blendshapes
        if bs and isinstance(bs[0], list):
            bs = bs[0]
        return {
            "pose": r.pose_world_landmarks or None,
            "poseImg": r.pose_landmarks or None,
            "hands": hands,
            "face": r.face_landmarks or None,
            "bs": bs or None,
        }

    def close(self):
        self.task.close()


def assign_hands(pose_img, hands):
    """Match hands to the signer's left/right by distance to the body's wrists
    (same rule as assignHands() in the lab). Returns (left, right, rejected)."""
    out = {"left": None, "right": None}
    if not hands or pose_img is None:
        return out["left"], out["right"], 0
    lw, rw = pose_img[L_WR], pose_img[R_WR]
    shoulder = math.hypot(pose_img[L_SH].x - pose_img[R_SH].x, pose_img[L_SH].y - pose_img[R_SH].y) or 0.2
    d = lambda a, b: math.hypot(a.x - b.x, a.y - b.y)
    if len(hands) == 1:
        h = hands[0]
        side = "left" if d(h["img"][0], lw) <= d(h["img"][0], rw) else "right"
        out[side] = h
    else:
        a, b = hands[0], hands[1]
        if d(a["img"][0], lw) + d(b["img"][0], rw) <= d(a["img"][0], rw) + d(b["img"][0], lw):
            out["left"], out["right"] = a, b
        else:
            out["left"], out["right"] = b, a
    rejected = 0
    for side, wrist in (("left", lw), ("right", rw)):
        h = out[side]
        if h is not None and d(h["img"][0], wrist) > FAR_HAND * shoulder:
            out[side] = None
            rejected += 1
    return out["left"], out["right"], rejected


def arr(lms, n, with_vis=False):
    a = np.full((n, 4 if with_vis else 3), np.nan)
    for i, q in enumerate(lms[:n]):
        a[i, :3] = (q.x, q.y, q.z)
        if with_vis:
            v = getattr(q, "visibility", None)
            a[i, 3] = 1.0 if v is None else v
    return a


def track(video, tracker, fps_out=None, start=0.0, end=None, keep_frames=None):
    """Run one tracker over the video. Returns a dict of numpy arrays (NaN = not found)."""
    cap = cv2.VideoCapture(str(video))
    if not cap.isOpened():
        raise SystemExit(f"Could not open the video: {video}")
    fps_in = cap.get(cv2.CAP_PROP_FPS) or 0.0
    if not 1 <= fps_in <= 120:  # browser/phone videos can report nonsense here
        fps_in = 30.0
    total_in = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    min_dt = 1.0 / fps_out if fps_out else 0.0

    T, pose, pose_img, hl_w, hl_i, hr_w, hr_i, face, bs_list = [], [], [], [], [], [], [], [], []
    rejected = 0
    shots = {}
    idx, t0, prev_t, last_kept = -1, time.time(), -1.0, -1e9
    while True:
        ok, bgr = cap.read()
        if not ok:
            break
        idx += 1
        # Use the frame's own timestamp (uneven frame timing is common in phone
        # and browser recordings); fall back to the frame count.
        t = cap.get(cv2.CAP_PROP_POS_MSEC) / 1000.0
        if not t > prev_t:
            t = max(prev_t + 1e-3, idx / fps_in)
        prev_t = t
        if t < start or t - last_kept < min_dt - 1e-6:
            continue
        if end is not None and t > end:
            break
        last_kept = t
        rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
        image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
        r = tracker.detect(image, int(round(t * 1000)))
        left, right, rej = assign_hands(r["poseImg"], r["hands"])
        rejected += rej
        T.append(round(t - start, 4))
        pose.append(arr(r["pose"], 33, True) if r["pose"] else np.full((33, 4), np.nan))
        pose_img.append(arr(r["poseImg"], 33, True) if r["poseImg"] else np.full((33, 4), np.nan))
        for h, w_list, i_list in ((left, hl_w, hl_i), (right, hr_w, hr_i)):
            w_list.append(arr(h["world"], 21) if h else np.full((21, 3), np.nan))
            i_list.append(arr(h["img"], 21) if h else np.full((21, 3), np.nan))
        face.append(np.array([[r["face"][k].x, r["face"][k].y, r["face"][k].z] for k in FACE_IDX]) if r["face"] else np.full((len(FACE_IDX), 3), np.nan))
        bs_list.append({c.category_name: float(c.score) for c in r["bs"]} if r["bs"] else None)
        n = len(T) - 1
        if keep_frames is not None and n in keep_frames:
            shots[n] = bgr.copy()
        if n % 60 == 0:
            done = f" (video has about {total_in} frames)" if total_in else ""
            print(f"  {tracker.name}: frame {n + 1}{done}", flush=True)
    cap.release()
    seconds = time.time() - t0
    fps = (len(T) - 1) / (T[-1] - T[0]) if len(T) > 1 and T[-1] > T[0] else fps_in
    bs_names = sorted({k for b in bs_list if b for k in b})
    bs = np.full((len(T), len(bs_names)), np.nan)
    for i, b in enumerate(bs_list):
        if b:
            bs[i] = [b.get(k, 0.0) for k in bs_names]
    return {
        "mode": tracker.name, "video": Path(video).name, "width": width, "height": height, "fps": fps,
        "t": np.array(T), "pose": np.array(pose), "poseImg": np.array(pose_img),
        "hlW": np.array(hl_w), "hlI": np.array(hl_i), "hrW": np.array(hr_w), "hrI": np.array(hr_i),
        "face": np.array(face), "bs": bs, "bsNames": bs_names, "rejected": rejected,
        "seconds": seconds, "shots": shots,
    }


# ---------------------------------------------------------------- cleanup

def present(a):
    """Frames where the landmark array was found."""
    return ~np.isnan(a.reshape(len(a), -1)).any(axis=1)


def fill_gaps(a, max_gap):
    """Linearly fill runs of missing frames no longer than max_gap that have a
    found frame on both sides. Returns (filled copy, frames filled)."""
    a = a.copy()
    ok = present(a)
    idx = np.flatnonzero(ok)
    filled = 0
    for i0, i1 in zip(idx[:-1], idx[1:]):
        gap = i1 - i0 - 1
        if 0 < gap <= max_gap:
            for k in range(1, gap + 1):
                u = k / (gap + 1)
                a[i0 + k] = a[i0] * (1 - u) + a[i1] * u
            filled += gap
    return a, filled


def smooth(a, sigma_frames):
    """Two-way (zero-lag) Gaussian smoothing over each run of found frames."""
    if sigma_frames <= 0.3:
        return a
    a = a.copy()
    ok = present(a)
    r = int(math.ceil(3 * sigma_frames))
    k = np.exp(-0.5 * (np.arange(-r, r + 1) / sigma_frames) ** 2)
    k /= k.sum()
    flat = a.reshape(len(a), -1)
    i = 0
    while i < len(a):
        if not ok[i]:
            i += 1
            continue
        j = i
        while j < len(a) and ok[j]:
            j += 1
        seg = flat[i:j]
        if len(seg) > 2:
            pad = np.pad(seg, ((r, r), (0, 0)), mode="reflect" if len(seg) > r else "edge")
            out = np.stack([np.convolve(pad[:, c], k, mode="valid") for c in range(seg.shape[1])], axis=1)
            flat[i:j] = out
        i = j
    return flat.reshape(a.shape)


def fix_arm_depth(c):
    """Rebuild elbow and wrist depth from arm lengths.

    A single camera measures side-to-side and up-down position well (the image)
    but guesses depth badly. Arms do not change length, so for each segment
    (shoulder→elbow, elbow→wrist): depth = sqrt(length² − (seen length)²).
    MediaPipe's own depth only decides the sign (towards or away from the
    camera). Returns the number of frames changed."""
    pw, pi = c["pose"], c["poseImg"]
    W, H = c["width"], c["height"]
    ok = present(pw[:, [L_SH, R_SH, L_EL, R_EL, L_WR, R_WR], :3]) & present(pi[:, [L_SH, R_SH, L_EL, R_EL, L_WR, R_WR], :2])
    if ok.sum() < 3:
        return 0
    px = pi[:, :, :2] * np.array([W, H])  # image points in pixels
    sh_world = np.median(np.linalg.norm(pw[ok, L_SH, :3] - pw[ok, R_SH, :3], axis=1))
    sh_px = np.linalg.norm(px[:, L_SH] - px[:, R_SH], axis=1)
    # metres per pixel, per frame (shoulders face the camera); smooth it so one bad frame can't jump.
    scale = np.where(ok, sh_world / np.where(sh_px > 1, sh_px, np.nan), np.nan)
    good = np.isfinite(scale)
    scale = smooth(scale.reshape(-1, 1, 1), 0.2 * c["fps"]).reshape(-1)
    changed = 0
    wrist_before = {L_WR: pw[:, L_WR, :3].copy(), R_WR: pw[:, R_WR, :3].copy()}
    for a_idx, b_idx in ((L_SH, L_EL), (R_SH, R_EL), (L_EL, L_WR), (R_EL, R_WR)):
        seen = np.linalg.norm(px[:, b_idx] - px[:, a_idx], axis=1) * scale
        world_len = np.linalg.norm(pw[:, b_idx, :3] - pw[:, a_idx, :3], axis=1)
        sel = good & np.isfinite(world_len)
        if sel.sum() < 3:
            continue
        # True length: the arm looks full length in the picture when it is side-on
        # to the camera (e.g. hanging relaxed at the start of the video).
        # MediaPipe's own 3D length is not used: it grows with its depth errors.
        length = float(np.percentile(seen[sel], 97))
        # In front or behind: from MediaPipe's depth, smoothed over time, and only
        # switched when it is clearly on the other side (otherwise keep the last side).
        dz_mp_all = (pw[:, b_idx, 2] - pw[:, a_idx, 2]).reshape(-1, 1, 1)
        dz_mp_all = smooth(dz_mp_all, 0.12 * c["fps"]).reshape(-1)
        sign = -1.0  # default: in front of the body (MediaPipe z is negative towards the camera)
        other = 0  # frames in a row that MediaPipe has put the segment on the other side
        need = max(1, int(round(SIDE_SWITCH_SECONDS * c["fps"])))
        for i in np.flatnonzero(sel):
            d2 = (px[i, b_idx] - px[i, a_idx]) * scale[i]
            mag = math.sqrt(max(0.0, length ** 2 - float(d2 @ d2)))
            dz_mp = dz_mp_all[i]
            # An arm changes sides only when MediaPipe has put it clearly on the
            # other side for a moment, and only while it passes close to the
            # picture plane (small depth), so the switch is a small step.
            clear = np.isfinite(dz_mp) and abs(dz_mp) > max(0.03, 0.35 * mag) and (dz_mp > 0) != (sign > 0)
            other = other + 1 if clear else 0
            if other >= need and mag < 0.2 * length:
                sign, other = -sign, 0
            dz = mag * sign
            # rebuild from the (already fixed) start of the segment
            pw[i, b_idx, 0] = pw[i, a_idx, 0] + d2[0]
            pw[i, b_idx, 1] = pw[i, a_idx, 1] + d2[1]
            pw[i, b_idx, 2] = pw[i, a_idx, 2] + dz
        changed = max(changed, int(sel.sum()))
    # The body model's hand points (pinky, index, thumb knuckles) move with the wrist.
    for wr, pts in ((L_WR, (17, 19, 21)), (R_WR, (18, 20, 22))):
        delta = pw[:, wr, :3] - wrist_before[wr]
        for k in pts:
            pw[:, k, :3] += np.nan_to_num(delta)
    return changed


def clean(d, depth_fix=True):
    """Gap filling and two-way smoothing. Visibility columns are not smoothed."""
    c = dict(d)
    fps = d["fps"]
    gap = max(1, int(round(GAP_FILL_SECONDS * fps)))
    c["filled"] = {}
    for key, kind in (("pose", "pose"), ("poseImg", "pose"), ("hlW", "hand"), ("hlI", "hand"), ("hrW", "hand"), ("hrI", "hand"), ("face", "face"), ("bs", "bs")):
        a, n = fill_gaps(d[key], gap)
        c["filled"][key] = n
        c[key] = smooth(a, SIGMA_SECONDS[kind] * fps)
    for key in ("pose", "poseImg"):  # keep visibility as tracked (filled frames get the lower of both sides)
        vis = fill_gaps(d[key][:, :, 3:], gap)[0]
        c[key][:, :, 3:] = vis
    # A hand filled in only one of world/image would confuse the lab; keep them paired.
    for w, i in (("hlW", "hlI"), ("hrW", "hrI")):
        both = present(c[w]) & present(c[i])
        c[w][~both] = np.nan
        c[i][~both] = np.nan
    c["bs"] = np.clip(c["bs"], 0, 1)
    c["depthFixed"] = fix_arm_depth(c) if depth_fix else 0
    return c


# ---------------------------------------------------------------- quality numbers

def angle_jumps(d, side, limit_deg=60):
    """Frame-to-frame forearm direction changes larger than limit_deg (flips)."""
    el, wr = (L_EL, L_WR) if side == "left" else (R_EL, R_WR)
    v = d["pose"][:, wr, :3] - d["pose"][:, el, :3]
    n = np.linalg.norm(v, axis=1, keepdims=True)
    v = v / np.where(n == 0, 1, n)
    dots = np.sum(v[1:] * v[:-1], axis=1)
    ang = np.degrees(np.arccos(np.clip(dots, -1, 1)))
    return int(np.nansum(ang > limit_deg))


def jitter_mm(a):
    """Median frame-to-frame movement of the finger tips relative to the wrist (mm)."""
    tips = a[:, [4, 8, 12, 16, 20], :] - a[:, [0], :]
    dv = np.linalg.norm(np.diff(tips, axis=0), axis=2)
    m = np.nanmedian(dv) if np.isfinite(dv).any() else float("nan")
    return round(float(m) * 1000, 2)


def wrist_jumps(d, side):
    """Times the hand's image position jumps by more than half a shoulder width
    in one frame (usually a left/right mix-up or a false detection)."""
    i = d["hlI"] if side == "left" else d["hrI"]
    sh = np.linalg.norm(d["poseImg"][:, L_SH, :2] - d["poseImg"][:, R_SH, :2], axis=1)
    jump = np.linalg.norm(np.diff(i[:, 0, :2], axis=0), axis=1)
    return int(np.nansum(jump > 0.5 * np.nan_to_num(sh[1:], nan=0.2)))


def arm_length_variation(d, side):
    """How much the measured forearm length changes (percent); high values mean depth errors."""
    el, wr = (L_EL, L_WR) if side == "left" else (R_EL, R_WR)
    ln = np.linalg.norm(d["pose"][:, wr, :3] - d["pose"][:, el, :3], axis=1)
    ln = ln[np.isfinite(ln)]
    return round(float(np.std(ln) / np.mean(ln) * 100), 1) if len(ln) > 2 else float("nan")


def quality(raw, cl):
    n = len(raw["t"])
    pct = lambda a: round(100 * float(present(a).mean()), 1) if n else 0.0
    q = {
        "mode": raw["mode"], "frames": n, "fps": round(raw["fps"], 2),
        "processingFps": round(n / raw["seconds"], 1) if raw["seconds"] else None,
        "bodyFound": pct(raw["pose"]), "faceFound": pct(raw["face"]),
        "leftHandFound": pct(raw["hlW"]), "rightHandFound": pct(raw["hrW"]),
        "leftHandAfterFill": pct(cl["hlW"]), "rightHandAfterFill": pct(cl["hrW"]),
        "falseHandsRejected": raw["rejected"],
        "handPositionJumps": wrist_jumps(raw, "left") + wrist_jumps(raw, "right"),
        "forearmFlipsRaw": angle_jumps(raw, "left") + angle_jumps(raw, "right"),
        "forearmFlipsClean": angle_jumps(cl, "left") + angle_jumps(cl, "right"),
        "fingerJitterRawMm": round(np.nanmean([jitter_mm(raw["hlW"]), jitter_mm(raw["hrW"])]), 2),
        "fingerJitterCleanMm": round(np.nanmean([jitter_mm(cl["hlW"]), jitter_mm(cl["hrW"])]), 2),
        "forearmLengthVariationPct": {"left": arm_length_variation(raw, "left"), "right": arm_length_variation(raw, "right")},
    }
    return q


# ---------------------------------------------------------------- output

def r4(v):
    return round(float(v), 4)


def encode_frame(c, i):
    """Same layout as encodeRaw() in tools/avatar-lab/js/motion.js."""
    def pts(a, k):
        return None if not np.isfinite(a).all() else [[r4(x) for x in p[:k]] for p in a]
    p = pts(c["pose"][i], 4)
    pi = None
    if np.isfinite(c["poseImg"][i]).all():
        pi = [[r4(q[0]), r4(q[1]), r4(q[3])] for q in c["poseImg"][i]]
    hand = lambda w, im: None if not (np.isfinite(w).all() and np.isfinite(im).all()) else {"w": pts(w, 3), "i": [[r4(q[0]), r4(q[1])] for q in im]}
    f = None
    if np.isfinite(c["face"][i]).all():
        f = {"i": FACE_IDX, "p": pts(c["face"][i], 3)}
    bs = None
    if np.isfinite(c["bs"][i]).all():
        bs = {k: r4(v) for k, v in zip(c["bsNames"], c["bs"][i]) if v > 0.003}
    return {"w": c["width"], "h": c["height"], "p": p, "pi": pi, "hl": hand(c["hlW"][i], c["hlI"][i]),
            "hr": hand(c["hrW"][i], c["hrI"][i]), "f": f, "bs": bs}


def write_motion(c, q, path, cleaned):
    frames = [{"t": float(t), "q": [], "e": {}, "raw": encode_frame(c, i)} for i, t in enumerate(c["t"])]
    data = {
        "format": "corea11y-motion", "version": 1,
        "created": datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z"),
        "source": {"name": Path(c["video"]).stem, "width": c["width"], "height": c["height"], "fps": round(c["fps"], 3),
                   "tracker": f"tracker-py ({c['mode']}, MediaPipe {mp.__version__})", "cleaned": cleaned},
        "duration": float(c["t"][-1]) if len(c["t"]) else 0.0,
        "bones": [],
        "frames": frames,
        "quality": {"frames": q["frames"], "framesWithoutBody": int((~present(c["pose"])).sum()),
                    "framesWithoutHands": int((~present(c["hlW"]) & ~present(c["hrW"])).sum())},
        "note": "Tracking only. In the Avatar Lab: load an avatar, Load motion, set Smoothing to Off, then Re-process with current lab.",
    }
    path.write_text(json.dumps(data, separators=(",", ":")), encoding="utf-8")


HAND_LINES = [(0, 1), (1, 2), (2, 3), (3, 4), (0, 5), (5, 6), (6, 7), (7, 8), (5, 9), (9, 10), (10, 11), (11, 12),
              (9, 13), (13, 14), (14, 15), (15, 16), (13, 17), (0, 17), (17, 18), (18, 19), (19, 20)]
POSE_LINES = [(11, 12), (11, 13), (13, 15), (12, 14), (14, 16), (11, 23), (12, 24), (23, 24)]


def draw(img, c, i):
    h, w = img.shape[:2]
    P = lambda p: (int(p[0] * w), int(p[1] * h))
    out = img.copy()
    if np.isfinite(c["poseImg"][i]).all():
        for a, b in POSE_LINES:
            cv2.line(out, P(c["poseImg"][i][a]), P(c["poseImg"][i][b]), (255, 255, 255), 3)
    for key, col in (("hlI", (60, 200, 60)), ("hrI", (40, 120, 255))):  # signer's left = green, right = orange
        a = c[key][i]
        if np.isfinite(a).all():
            for x, y in HAND_LINES:
                cv2.line(out, P(a[x]), P(a[y]), col, 2)
    return out


def contact_sheet(results, path, picks):
    rows = []
    for n in picks:
        cells = []
        for raw, cl in results:
            if n not in raw["shots"]:
                continue
            cell = draw(raw["shots"][n], cl, n)
            scale = 360 / cell.shape[0]
            cell = cv2.resize(cell, (int(cell.shape[1] * scale), 360))
            cv2.putText(cell, f"{cl['mode']}  t={cl['t'][n]:.2f}s", (10, 28), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 0), 4)
            cv2.putText(cell, f"{cl['mode']}  t={cl['t'][n]:.2f}s", (10, 28), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
            cells.append(cell)
        if cells:
            rows.append(np.hstack(cells))
    if rows:
        wmax = max(r.shape[1] for r in rows)
        rows = [np.pad(r, ((0, 0), (0, wmax - r.shape[1]), (0, 0))) for r in rows]
        cv2.imwrite(str(path), np.vstack(rows))


LABELS = [
    ("frames", "Frames tracked"), ("processingFps", "Processing speed (frames per second)"),
    ("bodyFound", "Body found (% of frames)"), ("faceFound", "Face found (%)"),
    ("leftHandFound", "Left hand found (%)"), ("rightHandFound", "Right hand found (%)"),
    ("leftHandAfterFill", "Left hand after gap filling (%)"), ("rightHandAfterFill", "Right hand after gap filling (%)"),
    ("falseHandsRejected", "False hand detections thrown out"), ("handPositionJumps", "Sudden hand jumps (mix-ups)"),
    ("forearmFlipsRaw", "Forearm flips over 60° (raw)"), ("forearmFlipsClean", "Forearm flips over 60° (cleaned)"),
    ("fingerJitterRawMm", "Finger tip jitter, mm per frame (raw)"), ("fingerJitterCleanMm", "Finger tip jitter, mm per frame (cleaned)"),
]


def write_report(qs, out_dir, video):
    lines = [f"# Tracking report: {video}", "", f"MediaPipe {mp.__version__}, made {datetime.now():%Y-%m-%d %H:%M}.", "",
             "| | " + " | ".join(q["mode"] for q in qs) + " |", "|---|" + "---|" * len(qs)]
    for key, label in LABELS:
        lines.append(f"| {label} | " + " | ".join(str(q.get(key)) for q in qs) + " |")
    lines.append("| Forearm length change, left / right (%) | " + " | ".join(
        f"{q['forearmLengthVariationPct']['left']} / {q['forearmLengthVariationPct']['right']}" for q in qs) + " |")
    lines += ["", "Higher \"found\" numbers and lower jumps, flips and jitter are better.",
              "Forearm length change shows depth errors from a single camera: a real forearm does not change length.",
              "", "sheet.png shows the tracking on sample frames (signer's left hand green, right hand orange).",
              "", "To see it on the avatar: open the Avatar Lab, load the avatar, Load motion (a `.clean.motion.json` file),",
              "set Smoothing to Off (the file is already smoothed), then press Re-process with current lab."]
    (out_dir / "report.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    (out_dir / "report.json").write_text(json.dumps(qs, indent=2), encoding="utf-8")


def load_raw_motion(path):
    """Read a *.raw.motion.json written by this tool back into arrays, so the
    cleanup can be re-run without tracking the video again."""
    d = json.loads(Path(path).read_text(encoding="utf-8"))
    fr = d["frames"]
    n = len(fr)
    src = d.get("source", {})
    bs_names = sorted({k for f in fr if f["raw"].get("bs") for k in f["raw"]["bs"]})
    out = {"mode": src.get("tracker", "raw").split("(")[-1].split(",")[0], "video": src.get("name", Path(path).name),
           "width": fr[0]["raw"]["w"], "height": fr[0]["raw"]["h"], "fps": src.get("fps") or 30.0,
           "t": np.array([f["t"] for f in fr]), "rejected": 0, "seconds": 0.0, "shots": {}, "bsNames": bs_names}
    pose = np.full((n, 33, 4), np.nan); pimg = np.full((n, 33, 4), np.nan)
    hw = {s: np.full((n, 21, 3), np.nan) for s in ("hl", "hr")}; hi = {s: np.full((n, 21, 3), np.nan) for s in ("hl", "hr")}
    face = np.full((n, len(FACE_IDX), 3), np.nan); bs = np.full((n, len(bs_names)), np.nan)
    for i, f in enumerate(fr):
        r = f["raw"]
        if r.get("p"):
            pose[i] = r["p"]
        if r.get("pi"):
            pimg[i, :, :2] = [q[:2] for q in r["pi"]]; pimg[i, :, 2] = 0; pimg[i, :, 3] = [q[2] for q in r["pi"]]
        for s in ("hl", "hr"):
            if r.get(s):
                hw[s][i] = r[s]["w"]; hi[s][i, :, :2] = r[s]["i"]; hi[s][i, :, 2] = 0
        if r.get("f") and r["f"]["i"] == FACE_IDX:
            face[i] = r["f"]["p"]
        if r.get("bs") is not None:
            bs[i] = [r["bs"].get(k, 0.0) for k in bs_names]
    out.update({"pose": pose, "poseImg": pimg, "hlW": hw["hl"], "hlI": hi["hl"], "hrW": hw["hr"], "hrI": hi["hr"], "face": face, "bs": bs})
    return out


def reclean(raw_path):
    """Re-run the cleanup on a saved raw motion file (no tracking)."""
    raw_path = Path(raw_path)
    raw = load_raw_motion(raw_path)
    cl = clean(raw)
    q = quality(raw, cl)
    q["armDepthRebuiltFrames"] = cl["depthFixed"]
    stem = raw_path.name.replace(".raw.motion.json", "")
    write_motion(cl, q, raw_path.with_name(f"{stem}.clean.motion.json"), "gaps filled, two-way smoothing, arm depth rebuilt")
    old = raw_path.with_name("report.json")
    if old.exists():  # keep tracking speed etc. from the original run, refresh the rest
        prev = {r["mode"]: r for r in json.loads(old.read_text(encoding="utf-8"))}
        q["processingFps"] = prev.get(q["mode"], {}).get("processingFps", q["processingFps"])
        q["falseHandsRejected"] = prev.get(q["mode"], {}).get("falseHandsRejected", 0)
        prev[q["mode"]] = q
        write_report(list(prev.values()), raw_path.parent, raw["video"])
    return q


def main(argv=None):
    ap = argparse.ArgumentParser(description="Track a signer video for the Avatar Lab.")
    ap.add_argument("video")
    ap.add_argument("--mode", choices=["both", "separate", "holistic"], default="both")
    ap.add_argument("--fps", type=float, default=None, help="track at this frame rate (default: every frame)")
    ap.add_argument("--start", type=float, default=0.0, help="start time in seconds")
    ap.add_argument("--end", type=float, default=None, help="end time in seconds")
    ap.add_argument("--body", choices=["heavy", "full"], default="heavy", help="body model for 'separate': heavy (most accurate) or full (about 3x faster)")
    ap.add_argument("--out", default=str(HERE / "out"))
    ap.add_argument("--reclean", action="store_true", help="VIDEO is a saved *.raw.motion.json: redo the cleanup only, no tracking")
    a = ap.parse_args(argv)

    if a.reclean:
        q = reclean(a.video)
        print(json.dumps(q, indent=2))
        return 0

    video = Path(a.video)
    if not video.exists():
        raise SystemExit(f"Video not found: {video}")
    out_dir = Path(a.out) / video.stem
    out_dir.mkdir(parents=True, exist_ok=True)

    # Frames to draw in sheet.png: six evenly spaced over the part being tracked.
    cap = cv2.VideoCapture(str(video))
    fps_in = cap.get(cv2.CAP_PROP_FPS)
    n_in = cap.get(cv2.CAP_PROP_FRAME_COUNT)
    cap.release()
    if not 1 <= fps_in <= 120:
        fps_in = 30.0
    dur = n_in / fps_in if n_in and n_in > 0 else 10.0
    rate = min(a.fps or fps_in, fps_in)
    span = int(max(0.0, min(a.end or dur, dur) - a.start) * rate)
    picks = sorted({int(span * k / 7) for k in range(1, 7)}) if span > 7 else [0]

    modes = ["separate", "holistic"] if a.mode == "both" else [a.mode]
    results, qs = [], []
    for m in modes:
        print(f"Tracking with {m}…", flush=True)
        tracker = SeparateTracker(a.body) if m == "separate" else HolisticTracker()
        try:
            raw = track(video, tracker, a.fps, a.start, a.end, keep_frames=set(picks))
        finally:
            tracker.close()
        if not len(raw["t"]):
            raise SystemExit("No frames were read from the video.")
        cl = clean(raw)
        q = quality(raw, cl)
        q["armDepthRebuiltFrames"] = cl["depthFixed"]
        qs.append(q)
        results.append((raw, cl))
        write_motion(cl, q, out_dir / f"{video.stem}.{m}.clean.motion.json", "gaps filled, two-way smoothing, arm depth rebuilt")
        write_motion(clean(raw, depth_fix=False), q, out_dir / f"{video.stem}.{m}.nodepth.motion.json", "gaps filled, two-way smoothing")
        write_motion(raw, q, out_dir / f"{video.stem}.{m}.raw.motion.json", False)
        print(f"  done: {q['frames']} frames at {q['processingFps']} frames per second", flush=True)
    write_report(qs, out_dir, video.name)
    contact_sheet(results, out_dir / "sheet.png", picks)
    print(f"Results in {out_dir}")
    print((out_dir / "report.md").read_text(encoding="utf-8"))


if __name__ == "__main__":
    sys.exit(main())
