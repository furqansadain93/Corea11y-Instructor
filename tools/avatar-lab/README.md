# Avatar Lab

Turns a video of a Deaf signer into movement for a 3D avatar, then records the avatar as a video for YouTube. Built on Computer A, 2026-11-26. Separate from the prototype's video-to-avatar tool on Computer B; merge the best parts later.

What it does:

1. Loads a VRM avatar (the free sample, or your own from VRoid Studio).
2. Tracks a signer video, or a live webcam, with MediaPipe: body, both hands (all finger joints) and face (52 expression values).
3. Drives the avatar: torso, head, arms, wrists, every finger joint, facial expressions and **eye gaze**.
   - **Touches:** when a fingertip or the palm touches the lips, chin, nose, cheeks, eyes, ears, forehead, either shoulder or the chest, the avatar puts the same finger on the same spot of its own body, even if its arms or head are a different size (cartoon proportions). The lab finds these spots on each avatar automatically (the mouth from its mouth-open shape, the chin by scanning the face). Touches are detected in the camera image, where tracking is accurate; depth is only used to rule out a hand that is clearly in front of the face. Detected touches are shown on the video, e.g. "Right index → lips".
   - **Joined hands:** claps, joined hands and one hand on the other stay together.
   - **Elbow rules:** the elbow only bends forward; with a straight arm, turning the palm comes from the shoulder; forearm twist is limited to the human range (±100°).
   - **Neutral calibration:** the signer's natural head tilt and resting face (e.g. a slight frown) are measured and removed, so they don't read as grammar.
4. Saves the movement as a motion file (`.motion.json`) that plays on any VRM avatar.
5. Records the avatar as a `.webm` video (white, green-screen or other background; landscape, square or portrait).

Video is processed in the browser on this computer. Nothing is uploaded.

## Start it (Windows)

The page has to be opened through a small local web server (browsers block these features on `file://` pages).

1. Install **Python** from python.org (tick "Add python.exe to PATH" during install) or **Node.js** from nodejs.org. Only one is needed.
2. Double-click `start-lab.bat` in this folder. A black window opens (the server) and the browser opens `http://localhost:8181/tools/avatar-lab/`. Keep the black window open while you work; close it when done.
3. Use **Chrome or Edge**. An internet connection is needed the first time (libraries and tracking models download, then the browser caches them).

Manual alternative: open a terminal in the **repository root** (the Corea11y-Instructor folder) and run `py -m http.server 8181`, then open `http://localhost:8181/tools/avatar-lab/`. (The server runs from the root so the lab can read the `avatars` folder.)

## Our avatars

Put our own avatars in `<repo>/avatars/` and list them in `avatars/avatars.json`:

```json
[
  { "name": "Dayya", "file": "Dayya.vrm" }
]
```

The lab shows a *Load …* button for each and loads the first one automatically; `test.html` runs its checks on the first one (or on the pixiv sample, by choice). `scripts/recolour_vroid.py` restyles a VRoid export for signing (solid navy top without tags, charcoal trousers, darker brows, deeper lips, softer 3D cartoon shading with a rim light) without changing its shape or bones: `py scripts/recolour_vroid.py avatars/Dayya.vrm avatars/Dayya-colours.vrm` (needs `pip install numpy pillow`). It cannot change shapes (hair, sleeves); do those in VRoid.

The `avatars` folder and all `.vrm`/`.vroid` files are ignored by git, so our characters are not published with the code. Share them between computers by hand (USB, shared drive) until we decide otherwise.

## Use it

1. **Avatar:** press *Load sample avatar*, or *Choose my avatar (.vrm)*. The status box then reports a sign-language design check: 52 face shapes present, eyebrows covered by hair, ears covered by hair. Design rules: `docs/AVATAR-SPEC.md`. (The sample avatar fails the eyebrow and ear checks; it is only for testing.)
2. **Signer:** *Choose signer video*, then *Track video*. Tracking goes frame by frame, so it is slower than real time (roughly 3–10× the video length, depending on the computer). For a quick test, set frames per second to 15.
   Or press *Use webcam (live)* to see the avatar copy you in real time, and *Record live motion* to capture it. Live mode shows its frame rate in the status box. Below about 15 frames per second motion gets choppy: for anything you want to keep, **record a video and use *Track video*** (always 30 frames per second, and more accurate).
3. **Play:** watch the avatar next to the video. Slow motion helps to check handshapes.
4. **Motion file:** *Save motion* keeps the result. Recordings made since 2026-11-26 also store the raw tracking data, so *Re-process with current lab* re-runs them with the latest lab version, settings or avatar, without recording again. Keep recordings in `<repo>/recordings/` (not in git). *Load motion* plays a saved one; try `samples/demo-wave.motion.json` (a synthetic wave, not a real sign) to check playback without any video.
5. **Video output:** pick background and size, then *Record avatar video*. Keep the tab visible until it finishes. YouTube accepts `.webm` directly. Use the green background to place the avatar over book pages or cartoons in a video editor (chroma key).

Settings:

| Setting | When to change it |
|---|---|
| Warmth (sweet resting face) | 0.75 by default: a soft smile under the signer's face that fades when brows or mouth are active. 0 = neutral. Needs an avatar with a "sweet" (or "relaxed") expression |
| Lighting: Studio / Flat | Studio (default) adds key, fill, rim and sky light for a more 3D look; Flat is the original even light |
| Body tracking: Accurate | Arms look wrong or jumpy; slower |
| Smoothing: Low | Fast signing or fingerspelling looks blurred |
| Smoothing: High | Avatar jitters when the signer is still |
| Face strength | Expressions too weak or too strong |
| Swap face left/right | A one-eye blink, one-sided expression or sideways glance appears on the wrong side |
| Copy eye gaze | On by default. Turn off if the eyes wander oddly (e.g. glasses confuse tracking) |
| Keep hand contact with face and body | On by default. Turn off to compare with plain angle copying |
| Neutral head and face from first frame | On by default: the first frame with a face counts as neutral. Turn off and use *Set neutral now* if the video doesn't start neutral |
| Set neutral now / Reset neutral | Pause the video on a moment where the signer looks straight at the camera with a relaxed face (or look at the webcam), then press *Set neutral now* |

## Recording a signer for good results

- Plain, dark background; plain dark clothes with long sleeves; skin-contrasting background.
- Bright, even light from the front. No strong backlight (windows behind the signer).
- Frame from just above the head to the waist, arms' reach visible on both sides. Camera at chest height, straight on.
- Start each recording with 1–2 seconds of the signer looking straight at the camera, hands down, relaxed face (used as neutral).
- 30 fps or more, 1080p if possible. Avoid motion blur (good light helps the camera use a fast shutter).
- A second camera from the side is useful for checking depth later.
- Raw signer videos stay **outside git** (see `.gitignore` and `library/README.md`). Motion files are small and can go into `library/`.

## Make your own avatar in VRoid Studio

1. Install **VRoid Studio** (free) from vroid.com or Steam.
2. *Create New* → pick a base (male or female). Change face, hair, skin tone and clothes following `docs/AVATAR-SPEC.md` (fringe above the eyebrows, ears visible, plain long-sleeve outfit in one solid colour, no accessories). Make one version per skin tone you need.
3. Hijab: VRoid has no ready-made hijab. Options: build one from a hood or hair parts in VRoid's editors, make it in Blender, or ask a 3D artist.
4. Keep the hands simple: no gloves or long sleeves over the hands, because fingers must stay visible.
5. *Export* (camera icon / Export menu) → **Export as VRM** → choose **VRM 1.0** → fill the title and author, set permissions (commercial use allowed) → save the `.vrm`.
6. In the lab: *Choose my avatar (.vrm)*.

Full face expressions: VRoid avatars only have basic expressions (happy, angry, sad, surprised, blink, mouth shapes). The lab maps the 52 MediaPipe face values onto these. For full eyebrow and mouth detail (important for sign language grammar), add the 52 "ARKit" face shapes to the avatar with HANA_Tool (about ¥1,500, uses Unity), the free YAARKitHelper Blender add-on, or a Fiverr artist. The lab detects them automatically ("Full face tracking (52 shapes) available").

Commissioned characters: ask for a standard humanoid VRM 1.0 with fully rigged fingers, the 52 ARKit face shapes, and arms and head proportions that allow hands to reach the face without passing through it. See `docs/KIDS-CHANNEL.md`.

## Motion file format

`*.motion.json`:

```json
{
  "format": "corea11y-motion",
  "version": 1,
  "source": { "name": "video name", "width": 1920, "height": 1080, "fps": 30 },
  "duration": 4.0,
  "bones": ["spine", "chest", "..."],
  "frames": [ { "t": 0.0, "q": [[x, y, z, w], "... one per bone"], "e": { "happy": 0.6 }, "g": [12.5, -3.0] } ],
  "quality": { "frames": 120, "framesWithoutBody": 0, "framesWithoutHands": 3 },
  "settings": { "smoothing": "medium", "faceStrength": 1, "gaze": true, "contact": true, "neutral": true }
}
```

`q` are local rotations of VRM **normalized** humanoid bones (three-vrm), so a file recorded with one avatar plays on any VRM avatar. `e` are VRM expression values (0–1). `g` is eye gaze in degrees: yaw (positive = to the signer's own left), pitch (positive = up); optional. Legs and hips are not stored (signing is upper body).

## Automatic checks

Open `http://localhost:8181/tools/avatar-lab/test.html` and press *Run checks* (or add `?auto` to the address). The checks pose the avatar (ours from the `avatars` folder, or the pixiv sample) in 200 random poses, turn each into MediaPipe-style landmarks, reset the avatar, and confirm the lab rebuilds the pose:

| Check | Result on 2026-11-26 |
|---|---|
| Arms, hands, palms, every finger joint, head, shoulder line (200 random poses) | 0.000° worst error (limit 0.5°) |
| Same with hand contact on (upright torso) | 0.000° worst error |
| Touch spots found on the sample avatar | 13 spots; mouth found from its mouth shape |
| Touches: index, middle, thumb or palm on lips, chin, nose, cheeks, ears, forehead, shoulders (same side and across the body), chest; signer's arms 25% longer (120 touches) | 0.41 cm worst miss with contact on; 6.7 cm with contact off (limit 1 cm) |
| Hand at least 15 cm in front of the face (signing space, not touching) | never pulled onto the face (40 poses) |
| Joined hands: both hands together in front of the chest, signer's arms 25% longer (40 poses) | 0.00 cm gap error with contact on; 3.9 cm with contact off (limit 1 cm) |
| Elbow: straight arm with the palm turned (40 poses) | forearm twist 0.2° (turn taken by the shoulder), palm exact |
| Elbow: forearm twist in 200 random poses | at most 81° (limit 100°) |
| Neutral head: signer with a natural 12° tilt / 8° turn (50 poses) | 0.000° after calibration; 12° without |
| Neutral face: resting frown | no longer reads as "angry" |
| Eye gaze: left / up / straight ahead | correct direction on the avatar |
| Smooth motion with contact on (10 moves × 60 frames) | largest change between frames 6.3° (limit 15°), no flips |
| Resting face: sweet when calm, steps aside for raised/lowered brows, softens during mouth shapes | all pass |
| Missing hand: arm and fingers relax within half a second; the other arm keeps moving | pass |
| Raw tracking data round trip (re-processing) | pass |
| Hand matching, face mapping, motion files (incl. gaze) | all pass |

46 of 46 checks pass (headless Chromium), with Dayya. These prove the maths, **not** real-video quality: synthetic landmarks are perfect, real MediaPipe landmarks are not.

## Not yet verified / known limits

- **Not yet run on a real signer video** (the cloud session could not reach the tracking models). First real test: record a 30-second clip and track it. Watch for: fingers hidden behind each other (confident but wrong handshapes), hands touching the face or body, depth (z) noise.
- Arms or hands leaving the camera view relax to a natural rest pose (about a third of a second) instead of freezing or being flung out by MediaPipe's guesses.
- Webcam depth is the weakest part of tracking: MediaPipe guesses how far each joint is from the camera, so arms pointing at the camera are the least reliable. Use bright light, the "Accurate" body setting, and keep the whole upper body in view.
- Touch spots are limited to the 13 listed. Other places (neck, top of the head, upper arm, stomach) fall back to scaling by arm length. No collision check yet: a hand that isn't touching can pass slightly into the head or body if tracking is off.
- The touch thresholds (how close counts as touching, how far in front rules it out) are first guesses; tune them after real tests.
- With contact on, hands follow the avatar's head. The split of a bend between spine and chest, or neck and head, is estimated, so the head (and a hand touching it) can sit a centimetre or two from the signer's version. This keeps contact but is not a pixel copy.
- Eye gaze comes from MediaPipe's eye blendshapes: good for direction (left/right/up/down), not for precise targets. Range is limited to about ±30° sideways and ±25° up/down.
- Basic VRoid faces only approximate expressions (see above).
- The lab uses CDN copies of three.js, three-vrm and MediaPipe (pinned versions), so it needs internet on first use.

## Licences

- three.js (MIT), @pixiv/three-vrm (MIT), MediaPipe Tasks (Apache 2.0).
- Sample avatar: "VRM1_Constraint_Twist_Sample" by pixiv Inc., VRM Public License 1.0: commercial use allowed, redistribution and modification allowed, credit not required. Loaded from the three-vrm GitHub repository, not stored here.
