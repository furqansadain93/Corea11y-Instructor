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
