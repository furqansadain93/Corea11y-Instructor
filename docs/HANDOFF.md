# Handoff log

Newest entry at the top. Every session ends by adding one entry.

Template:

```
## YYYY-MM-DD HH:MM (PKT) — Computer A/B
**Did:** what changed (files/areas)
**Checks:** what was run, result
**Half-done:** anything left mid-way, and where
**Next:** the most useful next step
**Needs from Frank:** inputs, keys, decisions
```

---

## 2026-11-27 (PKT), 20th entry: Computer B
**Did:** Frank OK'd Computer B editing the lab for this. **Lab (`retarget.js`, `anchors.js`, `test.js`):** when an avatar loads, the lab measures the front and back of its torso (`findTorsoFront`, a grid of depths relative to the chest bone). When retargeting, a hand (wrist, palm middle, knuckles) that would land inside the torso is moved out in front along the chest's forward and the arm is solved to reach it (`_clearOfBody`, Pass 3b; option `bodyPush`, on by default). A detected touch is not pushed; a hand behind the back is left alone. **Tracker:** an arm segment now switches front/back only after MediaPipe has put it clearly on the other side for 0.2 s and while its depth is under 0.2 of its length. The tracker body rules from the 19th entry were removed: they flipped arms in one frame and caused jumps.
**Correction to the 19th entry:** "29% of hands inside Dayya's sweater" was wrong. The ray test mostly hit her own hands and fingers. Measured properly against her torso shape: 7.1% of hand samples inside (6.5 cm deep on average), 1.3% with the push (3.5 cm).
**Checks:** Lab 48/48 with Dayya v0.2 calm and 48/48 with the pixiv sample (new: 2 body checks; random test poses with a hand inside the chest are redrawn; face-mapping checks use VRM preset names when the avatar has 52 face shapes). Tracker 13/13 (new: no flip on a brief flicker). Signer sample: left-wrist jumps over 20 cm in one frame 42 → 0; the push adds no frame-to-frame jumps (281 vs 285 over 5 cm, first half). Demo wave unchanged (0 frames differ). Side view at 31.7 s: without the push the V-hand is inside the sweater, with it both hands are in front.
**Next:** Computer A: review the lab change (pull first). Frank: VRoid v0.2 (tied hair, slimmer sleeves, flatter top) will need less pushing.
**Needs from Frank:** nothing new.

## 2026-11-27 (PKT), 19th entry: Computer B
**Did:** Frank chose the single-camera depth fix. `tools/tracker-py/track.py`: new body rules in the arm-depth rebuild. If the depth guess puts a wrist inside the chest or head, the front side is used, or the hand is brought out to the surface (`Body` class; chest, head and margin sizes in shoulder widths). Reported as "Hand depth corrected" in `report.md`. Re-cleaned the signer sample and demo wave results.
**Finding:** In MediaPipe's 3D space the signer's hands are almost never inside her body (86 corrections in about 13,000 hand frames; 0 on the demo wave, so its 15 cm result is unchanged). But **on Dayya 29% of the hands in front of the body end up inside her sweater, 5.8 cm deep on average**. Her chest is about twice as deep as a person's relative to arm length (sweater front 0.73 shoulder widths in front of the shoulder joints vs about 0.28). The "hands pressed into the chest" look comes from Dayya's shape plus angle-copying retargeting, not from tracking.
**Checks:** `test_track.py` 14/14 (2 new body-rule checks). Inside-the-sweater count measured in the lab by casting rays from each palm (sampled every 40th frame, 347 hands in front of the torso).
**Next:** Lab (Computer A area, needs Frank's OK): when retargeting, push a hand that lands inside the avatar's own body out in front (a small arm adjustment, or a body-shape check per avatar). Avatar: slimmer, flatter top in VRoid v0.2.
**Needs from Frank:** OK for Computer B to change the lab's retargeting for the push-out, or leave it to Computer A.

## 2026-11-27 (PKT), 18th entry: Computer B
**Did:** Frank's side-by-side recording looked far from accurate, so I measured each step on the signer sample (1,300 hand samples). Dayya follows the tracking data closely: wrists within 0.13 shoulder widths of the tracked points (about 5 cm on a person), elbows 0.09, hand-to-hand distance 96%, forward reach 0.48 vs 0.51 of arm length, finger spread correlation 0.99. So the lab's retargeting is not the problem. The gap is single-camera depth (about 15 cm on the known-truth wave), the left hand lost 44% of the time under the shawl, small hands in an 856 px screen recording, and Dayya's look (puffy sleeves, flying hair, small on screen). Added `tools/avatar-face/calm_hair.py`: by default hair physics is removed so hair moves only with the head (`--soft` keeps stiffened physics; on long hair it only cut the swing 45 → 33 cm). Made `avatars/Dayya-v0.2-calm.vrm` (local; now first in `avatars.json`). Tracker motion files now name the video without its extension, so the lab plays video and avatar in sync after loading both.
**Checks:** `tools/avatar-face` 5/5; `tracker-py` 12/12. Lab: calm Dayya loads with 52 face shapes and no hair springs; Portrait size makes her as big as the signer.
**Next:** Biggest accuracy gain: two cameras (front + side) to measure depth instead of guessing; Frank's own clip in full HD, plain dark short sleeves. Then per-sign hand polish and handshape snapping.
**For Computer A (lab):** consider Portrait as the default Size when a video is loaded, or tighter framing (signing space only, not legs); Warmth off by default for signing; motion files may name the video with or without the extension (match both).
**Needs from Frank:** VRoid v0.2 (hair tied back, slimmer sleeves); a clip of himself or a licensed signer.

## 2026-11-27 (PKT), 17th entry: Computer B
**Did:** Frank: "add them" (the 52 face shapes, done here instead of waiting for VRoid). New `tools/avatar-face/add_face_shapes.py` (standard library only) adds the 52 ARKit expressions to a VRM 1.0 VRoid avatar from its own `Fcl_` face shapes; geometry unchanged, never overwrites the input. Made `avatars/Dayya-v0.2-face.vrm` from `Dayya-colours.vrm` (36 driven, 16 empty: eye look, cheekPuff, jaw sideways/forward, mouthClose/Left/Right, tongueOut). Listed first in `avatars/avatars.json` (local only; avatars stay out of git). README with the mapping and limits.
**Checks:** `test_add_face_shapes.py` 3/3. In the lab with Warmth 0: brows down, inner brows up, pucker, jaw open, frown, wide eyes, smile + squint and a one-eye blink each move the right VRoid shapes (blink on the correct side). Signer sample re-processed with the new avatar: at 20 s pout and lowered brows now show (before: small "ou" only); at 120 s open mouth plus lowered brows.
**Half-done:** VRoid brows are thin and partly under the fringe, so brow movement is small on screen. Left/right brows move together (VRoid limit).
**Next:** Frank in VRoid at the office: hair tied back, slimmer sleeves, export VRM 1.0, then run `recolour_vroid.py` and `add_face_shapes.py` on it. Lab (Computer A): consider Warmth off by default for signing and a face gain.
**Needs from Frank:** The VRoid v0.2 export when done.

## 2026-11-27 (PKT), 16th entry: Computer B
**Did:** First real human test of `tools/tracker-py`, on `Recordings/Signer sample.mp4`. This is a screen recording of a published PSL story video by a professional signer (3:44, 30 fps, 856×1012). It is **not licensed: local testing only, not for the library or publishing**. Fixes: the arm-depth fix could flip an arm from front to back in one frame; it now changes sides only while the arm is near the picture plane. Sample frames in `sheet.png` are now correct for `--start/--end`. New `--reclean` re-runs the cleanup on a saved `*.raw.motion.json` without tracking again.
**Checks:** `test_track.py` 12/12. Full video, Holistic: 6,728 frames in 7 min (16 fps). Body 99%, face 99%, right hand 91% (97% after filling), left hand 56% (often resting low under the sleeve and shawl, out of view). Forearm flips: raw 11, cleaned 0. Finger jitter 16.7 → 9.7 mm per frame. The lab re-processes the whole video in 25 s. Visual check against the video at 5.7, 8.6, 11.4, 14.3, 60, 120 and 180 s: hand positions and most handshapes match (pointing, flat palm, V, "sleep"). Weak points: spread fingers come out closed; some hands sit a little low; the **face is muted**.
**Face finding:** MediaPipe does detect brows down (up to 0.47), inner brows up (0.65) and pucker (0.75), but often weakly. Dayya has only 15 basic expressions (no separate brows or pout), so a strong pout shows as a small "ou" plus faint angry brows. Warmth set to 0 in the lab for this check; the "sweet" layer masks negative expressions. Neutral calibration was not the cause.
**Next:** Dayya v0.2 with the 52 face shapes (top priority for the face). Lab (Computer A area): consider a higher face gain, Warmth off by default for signing, and finger spread. Frank: a short clip of himself or a licensed signer.
**Needs from Frank:** Permission from the video's creator if this clip is to be used beyond local testing.

## 2026-11-27 (PKT), 15th entry: Computer B
**Did:** Frank: Dayya's response was far from accurate; use MediaPipe in Python. Built `tools/tracker-py/` (MediaPipe 1.2.3, Python 3.15, everything inside the folder on D:, `setup.bat` and `track.bat`). It tracks a recorded video offline on every frame with two setups (separate heavy pose + hands + face, and Holistic Landmarker). Cleanup: gap filling up to 0.3 s, zero-lag two-way smoothing, far-away false hands thrown out, Holistic hand points re-centred, and **arm depth rebuilt from arm length and the picture** (MediaPipe's depth only gives the sign). Writes `.motion.json` files with raw data and empty bones, so the lab's "Re-process" drives the avatar (Smoothing Off). Writes `report.md` and `sheet.png`. The lab is unchanged. Also placed Frank's avatars and the webcam recording from the WeTransfer zip on this computer.
**Checks:** `test_track.py` 12/12 pass. Test video: the lab's demo wave on Dayya, filmed from the lab, with known truth. Waving wrist error after re-processing: separate raw 32 cm, **Holistic + cleanup 15 cm**. Side/up errors 2–3 cm; the rest is depth. The resting hand is within 3 cm. Holistic missed the hand hanging at the bottom edge; separate found it. The lab's avatar-lab checks are 46/46 on this computer.
**Half-done:** Not yet tried on a real human video. Dayya's cartoon proportions are not a human body, so the numbers are indicative only. The depth fix needs the arm side-on at some point (start videos with arms relaxed at the sides for 1 s).
**Next:** Frank records 20–30 s of signing (start relaxed) and runs `track.bat` on it. Compare separate and Holistic in `report.md` and in the lab. Then decide the default and whether the lab should read the cleaned files directly.
**Needs from Frank:** A real signing video, and which errors looked worst yesterday (hands, fingers, arms or face).

## 2026-11-26 (PKT), 14th entry: Computer A (cloud session)
**Did:** Reviewed Frank's first webcam recording (`recordings/webcam-2026-11-26-16-41-24.motion.json`, 94 s, letters and words; contact sheet checked). Works: hand to mouth, palms together, pointing, thumb shapes, smiles and blinks. Problems: live ran at ~7.5 fps; left hand missing 2/3 of the time and frozen in its last pose; arms flung out near the frame edge; 13 forearm flips > 60°. Fixes in `retarget.js`: per-side presence (arm needs elbow+wrist visibility > 0.5, hand needs detection; untracked arms/hands relax to a natural pose over ~0.35 s); forearm twist hysteresis at the ±100° limit. Live mode: 960×540 camera, face model every other frame, fps and GPU/CPU shown in status. Recordings now store raw tracking data (`encodeRaw`/`decodeRaw`); new "Re-process with current lab" button. Demo motion includes raw data. `.gitignore`: `recordings/`, `Claude outputs/`.
**Checks:** 46/46 pass (new: missing-hand relax, other arm unaffected, raw round trip); re-process tested end to end on the demo.
**Next:** Frank: record a video (not live) of the letters, use Track video, save the motion into `recordings/` with the video, and list what was signed in order.

## 2026-11-26 (PKT), 13th entry: Computer A (cloud session)
**Did:** Frank: expression should be sweet and polite, adoring kids. Restyle script adds a custom VRM expression "sweet" (VRoid `Fcl_ALL_Fun` 1.0 + `Fcl_MTH_Up` 0.4); Dayya v0.1.3. Lab: Stage layers the sweet face under tracked/recorded expressions (`warmthLayer`, Warmth slider, default 0.75), fading for brow activity and softening for mouth shapes; natural auto-blink when no blink input. Expressions now applied every render frame.
**Checks:** 43/43 pass (new: 4 resting-face checks) with Dayya and the sample; renders checked at warmth 0, 0.75, 1 and with raised brows.
**Next:** Frank: VRoid v0.2 (hair, sleeves); webcam retest of touches.

## 2026-11-26 (PKT), 12th entry: Computer A (cloud session)
**Did:** Frank liked the navy top; asked for a more 3D modern-cartoon look and better trousers. `recolour_vroid.py` now also recolours trousers (charcoal `#46484F`) and softens MToon shading (toony factor, shade colours, rim light) per material group; Dayya regenerated as v0.1.2 (`avatars/Dayya-colours.vrm`). Lab: new Lighting option, Studio (key/fill/rim/hemisphere lights, neutral tone mapping, default) or Flat.
**Checks:** 39/39 pass with v0.1.2; page tested; before/after picture checked.
**Next:** Frank: hair and sleeves in VRoid (v0.2), then run the script on the new export.

## 2026-11-26 (PKT), 11th entry: Computer A (cloud session)
**Did:** Frank asked whether Claude can update the avatar. Recoloured a copy of Dayya by editing the VRM textures directly (`tools/avatar-lab/scripts/recolour_vroid.py`): navy top without tags, darker/thicker brows, deeper lips. Saved as `avatars/Dayya-colours.vrm`, listed first in `avatars/avatars.json` (lab loads it by default); original kept. Shape changes (hair off the ears/shoulders, slimmer sleeves) still need VRoid.
**Checks:** 39/39 pass with the recoloured avatar; before/after pictures checked.
**Next:** Frank: in VRoid, tie the hair back and slim the sleeves; use the same colour codes (see `AVATAR-SPEC.md`).

## 2026-11-26 (PKT), 10th entry: Computer A (cloud session)
**Did:** Reviewed Frank's first avatar `Dayya.vrm` (VRoid, VRM 1.0, licence: only author, no redistribution). Review in `AVATAR-SPEC.md` (ears covered, pale brows and lips, white top with tags, full sleeves). Lab now loads our avatars from `<repo>/avatars/` via `avatars/avatars.json` (one button each, first loads automatically); `test.html` checks our avatar by default. `start-lab.bat` now serves from the repo root; lab URL is `http://localhost:8080/tools/avatar-lab/`. `.gitignore`: `avatars/`, `*.vrm`, `*.vroid` (characters stay private).
**Checks:** 39/39 pass with Dayya and with the pixiv sample. Demo wave plays and records on green screen with Dayya.
**Next:** Frank: Dayya v0.2 per the review (tie hair back, darker brows and lips, solid dark plain top, slimmer sleeves). Copy avatars to Computer B by hand.
**Needs from Frank:** Delete the copy of `Dayya.vrm` in the repo root (now in `avatars/`).

## 2026-11-26 (PKT), 9th entry: Computer A (cloud session)
**Did:** Frank reviewed the sample avatar: hair touches the eyebrows (expressions lost), hair hides the ears, dress should suit eastern and western culture, legs not needed. Added `docs/AVATAR-SPEC.md` (framing, face, hair per character, modest neutral dress based on interpreter practice, checklist) and a decision in `DECISIONS.md`. Avatar lab now runs a design check on load (52 face shapes, eyebrow coverage by hair, ears covered) and reports it in the status box; the sample avatar shows eyebrows 33% covered and both ears covered, matching Frank's observation.
**Checks:** `test.html` 39/39 pass; page tested.
**Next:** Frank makes the first VRoid avatar per the spec and loads it in the lab.
**Needs from Frank:** The avatar (.vrm).

## 2026-11-26 (PKT), 8th entry: Computer A (cloud session)
**Did:** Frank's retest: touching ears, lips, and the left shoulder with the right hand still wrong. Cause: single-camera depth error plus only eye/shoulder anchors and knuckle contact point. New `tools/avatar-lab/js/anchors.js`: 13 touch spots found on each avatar by ray casting (mouth from the "aa" morph, chin by scanning the face, eyes/cheeks placed by face width). `retarget.js` `_touch`: touches detected in image space (fingertips/palm vs face-mesh and shoulder spots), per-point depth gate using the avatar's face/body shape scaled to the signer, touching point placed on the avatar spot, arm solved to reach it. Overlay shows detected touches. Pipeline order: hand → targets → join hands → touch → IK.
**Checks:** `test.html` 39/39 pass. Touches on 11 spots (incl. across-body shoulder): worst miss 0.41 cm with signer arms 25% longer (6.7 cm without). Hand ≥15 cm in front of face never snapped.
**Half-done:** Touch thresholds untested on real webcam data.
**Next:** Frank retests; tune thresholds; collision check.
**Needs from Frank:** Retest; note which touches the overlay label shows and whether the avatar matches.

## 2026-11-26 (PKT), 7th entry: Computer A (cloud session)
**Did:** Frank's first webcam test: avatar copied him, smile and left/right movement right, about "20% there"; joined hands didn't meet, elbow looked wrong when showing the palm. Fixed in `retarget.js`: joined hands (both hands placed around their shared midpoint with the signer's offset, scaled to hand size); elbow rules (hinge-only bend, straight-arm palm turn taken by the shoulder, forearm twist limited to ±100°). Arm code split into target → join → solve → set.
**Checks:** `test.html` 37/37 pass (new: joined hands 0.00 cm gap error with signer arms 25% longer, 3.9 cm without; straight-arm palm turn → 0.2° forearm twist; forearm twist max 81° over 200 poses).
**Half-done:** Needs Frank's webcam retest.
**Next:** Retest; then collision check.
**Needs from Frank:** Retest notes or screenshots.

## 2026-11-26 (PKT), 6th entry: Computer A (cloud session)
**Did:** Avatar lab: added eye gaze (MediaPipe eye blendshapes → VRM look-at, stored in motion files as `g`), neutral calibration (signer's head tilt and resting face measured on the first frame or on demand and removed), and hand contact (index knuckle placed relative to the eyes near the face and to the shoulder elsewhere, scaled to the avatar; two-bone IK keeps the signer's elbow direction). New UI options. README updated.
**Checks:** `test.html` 34/34 pass. Hand contact: 0.00 cm miss with the signer's arms 25% longer (4.9 cm without contact mode). Neutral head: 12° tilt removed to 0.000°. Gaze direction correct. Page tested: demo playback, video recording.
**Half-done:** Still not run on real video. No collision check; hand-to-hand contact approximate.
**Next:** Frank: first real test (webcam, then a 30-second clip starting with 1–2 s neutral pose).
**Needs from Frank:** Python or Node.js; a test clip.

## 2026-11-26 (PKT), 5th entry: Computer A (cloud session)
**Did:** Built `tools/avatar-lab/`: a browser page that loads a VRM avatar (free pixiv sample or own VRoid file), tracks a signer video or webcam with MediaPipe (pose, both hands with all finger joints, face with 52 blendshapes), drives the avatar (torso, head, arms, wrist twist from the palm, every finger joint, expressions), saves/loads avatar-independent motion files (`.motion.json`), and records the avatar to `.webm` (white/green/other background; landscape, square, portrait). One-Euro smoothing. `start-lab.bat` starts a local server on Windows. `test.html` runs automatic checks. `samples/demo-wave.motion.json` is a synthetic wave for testing playback. Claimed the area in `STATUS.md`. Added `*.bat` CRLF rule to `.gitattributes`.
**Checks:** `test.html`: 21/21 pass in headless Chromium (200 random poses rebuilt with 0.000° worst error for arms, hands, palms, fingers, head, shoulder line; smooth-motion test largest frame-to-frame change 9.3°, no flips; hand matching; face mapping; motion files). Main page tested: sample avatar, demo motion playback, green-screen portrait video recording, motion save.
**Half-done:** Not run on real video: the cloud session could not reach MediaPipe's model files. Eye gaze not mapped. No head calibration.
**Next:** Frank: run `start-lab.bat`, load the sample avatar, try the webcam, then track a 30-second signing clip. Computer B: push the prototype; compare its video-to-avatar tool with the lab and merge.
**Needs from Frank:** Python or Node.js installed on this computer. A first test clip. A VRoid avatar when ready.

## 2026-11-26 (PKT), 4th entry: Computer A (cloud session)
**Did:** Added `docs/KIDS-CHANNEL.md` (proposed kids sign language YouTube channel: copyright rules, open-licensed sources, workflow, signer, avatar path, YouTube, partners, first steps). Re-applied the Competitors rewrite to `PLAN.md` (the previous write did not land) and updated it: ConnectHear's SILA almost certainly does PSL sign-to-text; added open-source PSL projects. Added two settled decisions (content sources, original characters only) and two open decisions to `DECISIONS.md`. Added kids-channel next steps to `STATUS.md`.
**Checks:** none (docs only).
**Half-done:** Moon Kids Story video: song originality check and file request pending.
**Next:** Frank: find signer candidates, contact the two channels. Computer B: push the prototype, then the 30-second tracking test.
**Needs from Frank:** Decide whether the kids channel is the main direction. Channel name.

## 2026-11-26 (PKT), 3rd entry: Computer A (cloud session)
**Did:** Wrote the bundle files into the local clone. Rewrote Competitors in `PLAN.md` after a web check (Pakistan: DeafTawk, ConnectHear; sign-to-text: Google SL2T, Sign-Speak and others) and corrected the "no released PSL text-to-avatar app" line. Added `docs/SIGN-TO-TEXT.md` (sign-to-text options, real-usage scenarios, impact, risks, how to measure, recommended order, public PSL data). Linked it from `PLAN.md` Phase 3. Added a next step to `STATUS.md`.
**Checks:** none (docs only).
**Half-done:** SIGN-TO-TEXT.md was rebuilt from the docs because the earlier discussion is no longer available; Frank to correct anything that differs.
**Next:** Frank commits and pushes. Computer B pushes the prototype.
**Needs from Frank:** Review SIGN-TO-TEXT.md. Which 3a vocabulary first (clinic, school, family).

## 2026-11-26 (PKT), 2nd entry: Computer A (cloud session)
**Did:** Added `docs/REVIEW-NOTES.md` (two outside critiques, our responses, build-confidence estimates). Updated `PLAN.md` with Audiences, Roadmap phases and Phase 3 sign-to-text. Updated `STATUS.md` next steps (two go/no-go tests, video-tool fixes, quick phrases, reply pad, wider licence ask). Added open decisions to `DECISIONS.md`.
**Checks:** none (docs only).
**Half-done:** Prototype code still not in the repo (see previous entry).
**Next:** Computer B pushes the prototype. Then go/no-go 1 (Claude sign order vs tester), which needs only an API key and the tester.
**Needs from Frank:** Licence request wording should include recognition training. Decide input language and first audience with partners.

## 2026-11-26 13:45 (PKT) — Computer A (cloud session)
**Did:** Set up the repo: `CLAUDE.md` (sync rules for both Claudes), `docs/` (PLAN, STATUS, DECISIONS, HANDOFF), `.gitignore`, `.env.example`, empty `app/`, `server/`, `tools/`, `library/`, `tests/` folders.
**Checks:** none (no code yet).
**Half-done:** The prototype code is not in the repo. Only its `index.html` could be read from the shared artifact; `app.js`, `app.css`, the video-to-avatar page, the server and the 40 checks are on Computer B.
**Next:** On Computer B, copy the `sign-avatar-poc` folder contents into this repo (`app/`, `server/`, `tools/`, `tests/` as fits), make sure no API key or video is included, run the 40 checks, push, and write a handoff entry.
**Needs from Frank:** Push the prototype from Computer B. Launch language decision. Claude API key (kept in `.env` on each computer, never committed).
