# Avatar Lab

Turns a video of a Deaf signer into movement for a 3D avatar, then records the avatar as a video for YouTube. Built on Computer A, 2026-11-26. Separate from the prototype's video-to-avatar tool on Computer B; merge the best parts later.

What it does:

1. Loads a VRM avatar (the free sample, or your own from VRoid Studio).
2. Tracks a signer video, or a live webcam, with MediaPipe: body, both hands (all finger joints) and face (52 expression values).
3. Drives the avatar: torso, head, arms, wrists, every finger joint, facial expressions and **eye gaze**.
   - **Hand contact:** when the signer touches the face, chin or body, the avatar's hand goes to the same spot, even if the avatar's arms or head are a different size (cartoon proportions).
   - **Neutral calibration:** the signer's natural head tilt and resting face (e.g. a slight frown) are measured and removed, so they don't read as grammar.
4. Saves the movement as a motion file (`.motion.json`) that plays on any VRM avatar.
5. Records the avatar as a `.webm` video (white, green-screen or other background; landscape, square or portrait).

Video is processed in the browser on this computer. Nothing is uploaded.

## Start it (Windows)

The page has to be opened through a small local web server (browsers block these features on `file://` pages).

1. Install **Python** from python.org (tick "Add python.exe to PATH" during install) or **Node.js** from nodejs.org. Only one is needed.
2. Double-click `start-lab.bat` in this folder. A black window opens (the server) and the browser opens `http://localhost:8080/`. Keep the black window open while you work; close it when done.
3. Use **Chrome or Edge**. An internet connection is needed the first time (libraries and tracking models download, then the browser caches them).

Manual alternative: open a terminal in this folder and run `py -m http.server 8080`, then open `http://localhost:8080/`.

## Use it

1. **Avatar:** press *Load sample avatar*, or *Choose my avatar (.vrm)*.
2. **Signer:** *Choose signer video*, then *Track video*. Tracking goes frame by frame, so it is slower than real time (roughly 3–10× the video length, depending on the computer). For a quick test, set frames per second to 15.
   Or press *Use webcam (live)* to see the avatar copy you in real time, and *Record live motion* to capture it.
3. **Play:** watch the avatar next to the video. Slow motion helps to check handshapes.
4. **Motion file:** *Save motion* keeps the result. *Load motion* plays a saved one; try `samples/demo-wave.motion.json` (a synthetic wave, not a real sign) to check playback without any video.
5. **Video output:** pick background and size, then *Record avatar video*. Keep the tab visible until it finishes. YouTube accepts `.webm` directly. Use the green background to place the avatar over book pages or cartoons in a video editor (chroma key).

Settings:

| Setting | When to change it |
|---|---|
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
2. *Create New* → pick a base (male or female). Change face, hair, skin tone and clothes. Make one version per skin tone you need.
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

Open `http://localhost:8080/test.html` and press *Run checks* (or add `?auto` to the address). The checks pose the sample avatar in 200 random poses, turn each into MediaPipe-style landmarks, reset the avatar, and confirm the lab rebuilds the pose:

| Check | Result on 2026-11-26 |
|---|---|
| Arms, hands, palms, every finger joint, head, shoulder line (200 random poses) | 0.000° worst error (limit 0.5°) |
| Same with hand contact on (upright torso) | 0.000° worst error |
| Hand contact: knuckle on a face spot, signer's arms 25% longer than the avatar's (40 touches) | 0.00 cm miss with contact on; 4.9 cm miss with contact off (limit 1 cm) |
| Neutral head: signer with a natural 12° tilt / 8° turn (50 poses) | 0.000° after calibration; 12° without |
| Neutral face: resting frown | no longer reads as "angry" |
| Eye gaze: left / up / straight ahead | correct direction on the avatar |
| Smooth motion with contact on (10 moves × 60 frames) | largest change between frames 8.5° (limit 15°), no flips |
| Hand matching, face mapping, motion files (incl. gaze) | all pass |

34 of 34 checks pass (headless Chromium). These prove the maths, **not** real-video quality: synthetic landmarks are perfect, real MediaPipe landmarks are not.

## Not yet verified / known limits

- **Not yet run on a real signer video** (the cloud session could not reach the tracking models). First real test: record a 30-second clip and track it. Watch for: fingers hidden behind each other (confident but wrong handshapes), hands touching the face or body, depth (z) noise.
- Elbow and forearm twist are estimated from the palm direction; extreme twists can look wrong at the elbow.
- Hand contact uses the index knuckle as the contact point and the eyes as the face anchor. Contact with the chest and between the two hands relies on scaling by arm length, which is close but not exact when the avatar's shoulders are much wider or narrower than the signer's. No collision check yet (a hand can pass slightly into the head or body if tracking is off).
- With contact on, hands follow the avatar's head. The split of a bend between spine and chest, or neck and head, is estimated, so the head (and a hand touching it) can sit a centimetre or two from the signer's version. This keeps contact but is not a pixel copy.
- Eye gaze comes from MediaPipe's eye blendshapes: good for direction (left/right/up/down), not for precise targets. Range is limited to about ±30° sideways and ±25° up/down.
- Basic VRoid faces only approximate expressions (see above).
- The lab uses CDN copies of three.js, three-vrm and MediaPipe (pinned versions), so it needs internet on first use.

## Licences

- three.js (MIT), @pixiv/three-vrm (MIT), MediaPipe Tasks (Apache 2.0).
- Sample avatar: "VRM1_Constraint_Twist_Sample" by pixiv Inc., VRM Public License 1.0: commercial use allowed, redistribution and modification allowed, credit not required. Loaded from the three-vrm GitHub repository, not stored here.
