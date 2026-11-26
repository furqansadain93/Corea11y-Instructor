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
