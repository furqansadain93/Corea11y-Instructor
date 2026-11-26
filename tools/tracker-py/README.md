# Python tracker

Tracks a recorded signer video with MediaPipe in Python and writes a motion file the Avatar Lab can re-process. Built on Computer B, 2026-11-27. It doesn't change the lab; it gives the lab better tracking data.

## Why Python

The models are the same ones the lab uses in the browser. The gain comes from processing a recorded video offline:

- **Every frame, best models.** It isn't racing the camera. Live webcam ran at about 7.5 frames per second.
- **Holistic Landmarker** as well as separate pose, hand and face models. It finds the hands from the body, and it's 2–3× faster.
- **Gap filling.** A hand lost for up to 0.3 s is filled from the frames on both sides, instead of freezing.
- **Two-way smoothing.** It looks backwards and forwards, so it adds no lag.
- **False hands thrown out.** A hand detected far from the body's wrist is dropped.
- **Arm depth rebuilt.** A single camera sees side-to-side and up-down well but guesses depth (towards or away from the camera) badly. Arms don't change length, so depth is worked out from the arm's length and how long it looks in the picture. MediaPipe only decides whether the hand is in front or behind. This was the biggest error source in the test below.

## Set up (once)

Needs Python 3.9 or newer. Double-click `setup.bat`. Everything stays in this folder:

- `.venv\`: the Python packages
- `models\`: about 65 MB of MediaPipe model files
- `.cache\`: the download cache

None of these are committed.

## Use

1. Record a video of the signer, ideally 20–30 s, phone or webcam, good light, plain background, upper body in frame. **Start with 1 second of arms relaxed at the sides.** The depth fix measures arm length from that.
2. Drag the video onto `track.bat`, or run `track.bat "path\to\video.mp4"`.
   - Options: `--mode holistic` (fastest), `--mode separate`, `--mode both` (the default, which compares them), `--body full` (faster body model for `separate`), `--start 2 --end 10` (part of the video only).
   - `--reclean "out\<video>\<video>.holistic.raw.motion.json"` redoes only the cleanup on a saved result (seconds instead of minutes), e.g. after the cleanup code changes.
3. The results folder `out\<video name>\` opens. It contains:
   - `report.md`: hands and body found, gaps filled, jumps, forearm flips, finger jitter, for each setup
   - `sheet.png`: tracking drawn on sample frames (signer's left hand green, right hand orange)
   - `*.clean.motion.json`: cleaned, with arm depth rebuilt. **Use this one.**
   - `*.nodepth.motion.json`: cleaned, without the depth fix (for comparison)
   - `*.raw.motion.json`: straight from MediaPipe
4. In the Avatar Lab, load the avatar, then **Load motion** (the `.clean` file), set **Smoothing to Off** (the file is already smoothed), and press **Re-process with current lab**. Play, then Save motion.

## Test so far (2026-11-27)

The test video is the lab's demo wave played on Dayya, filmed from the lab (`out\test-videos\`). Because the true movement is known, the error can be measured in centimetres on the avatar after re-processing:

| Waving arm, average distance from the truth | elbow | wrist | fingertip |
|---|---|---|---|
| Separate models, raw (like the browser lab) | 22 cm | 32 cm | 33 cm |
| Separate, cleaned + depth fix | 17 cm | 21 cm | 21 cm |
| Holistic, raw | 17 cm | 27 cm | 27 cm |
| **Holistic, cleaned + depth fix** | **11 cm** | **15 cm** | **14 cm** |

- **Side-to-side and up-down:** already within 2–3 cm. Nearly all of the error is depth.
- **The resting hand:** within 3 cm with Holistic.
- **Separate vs Holistic:** separate found the hanging hand at the bottom edge that Holistic missed.

Limits of this test: Dayya is a cartoon (narrow shoulders, 22 cm arms), not a human body, and the clip is 3 s with one movement. **A real signer video is needed before trusting these numbers.**

## Checks

```
.venv\Scripts\python -m unittest test_track -v
```

There are 12 checks, all passing: gap filling, zero-lag smoothing, hand matching and rejection, Holistic hand centring, depth rebuild (flat arm and forward reach), and the motion file format.

## Notes

- Holistic gives hand points measured from the hips. They're shifted to the middle of the hand, as the hand model and the lab expect.
- MediaPipe 1.2.2 release notes say "Left" and "Right" mean the subject's own hands, and that a mirrored image swaps them. Hands are matched to the body's wrists, as the lab does, so this doesn't matter here. Avoid mirrored videos anyway.
- The Windows Python package runs on the processor only (no graphics card). Separate mode runs at about 2–4 frames per second, Holistic at about 6–10.
