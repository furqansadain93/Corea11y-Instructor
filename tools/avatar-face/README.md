# Avatar face and hair tools

Two scripts for VRoid avatars. Run them in this order on each new VRoid export: `scripts/recolour_vroid.py` (in the lab), then `add_face_shapes.py`, then `calm_hair.py`.

## Face shapes

`add_face_shapes.py` adds the 52 ARKit face expressions ("perfect sync") to a VRoid avatar, built from the face shapes the avatar already has. Built on Computer B, 2026-11-27.

## Why

VRoid exports about 57 face shapes (`Fcl_BRW_Angry`, `Fcl_MTH_U`, `Fcl_EYE_Close_L`…) but only 15 basic expressions. With only those 15, the Avatar Lab has to squeeze MediaPipe's 52 face values into a few presets: a pout shows as a small "ou", and lowered brows show only as a faint angry face.

When an avatar has expressions named like ARKit (`jawOpen`, `browInnerUp`, …), the lab passes every face value straight through. This script adds those 52 expressions. No geometry changes, so it is safe to run again on a new VRoid export.

## Use

Standard library only, any Python 3.9+:

```
python tools/avatar-face/add_face_shapes.py avatars/Dayya-colours.vrm avatars/Dayya-v0.2-face.vrm
```

It never overwrites the input. It prints how many expressions were added and any VRoid shapes the avatar is missing. VRM 1.0 only (VRoid Studio: export as VRM 1.0). Run it last, after `scripts/recolour_vroid.py`.

In the lab, the status box should say **"Full face tracking (52 shapes): yes"**.

## Mapping

| ARKit | VRoid shape |
|---|---|
| browDown L/R | BRW_Angry (half each) |
| browInnerUp | BRW_Sorrow |
| browOuterUp L/R | BRW_Surprised (half each) |
| eyeBlink L/R | EYE_Close_L / _R |
| eyeSquint L/R | EYE_Joy_L / _R × 0.35 |
| eyeWide L/R | EYE_Surprised (half each) |
| jawOpen | MTH_A |
| mouthFunnel | MTH_O |
| mouthPucker | MTH_U × 0.8 + MTH_Small × 0.5 |
| mouthSmile L/R | MTH_Fun (half each) |
| mouthFrown L/R | MTH_Down (half each) |
| others | small amounts of related shapes (see `MAP` in the script) |

## Limits

- VRoid's brow and mouth shapes move both sides together. Left/right pairs share one shape at half strength each, so one raised brow shows as both brows half raised. True one-sided brows need an artist or a tool such as HANA_Tool.
- 16 shapes have no VRoid source and are added empty: the 8 eye-look shapes (the lab moves the eyes with look-at), cheekPuff, jawForward/Left/Right, mouthClose, mouthLeft/Right, tongueOut.
- VRoid brows are thin and partly under the fringe, so brow movement is small on screen. Hair tied back in v0.2 will help.

## Checked (2026-11-27, Dayya)

- Each key expression set by hand in the lab with Warmth 0: brows down, inner brows up, pucker, jaw open, frown, wide eyes, smile with squint, one-eye blink (correct side). All move the right VRoid shapes.
- Signer sample video re-processed with the new avatar: at 20 s the pout and lowered brows show (before: a small "ou" only); at 120 s open mouth with lowered brows.

## Calm hair

`calm_hair.py` stops the hair swinging and flying out when the hands move fast or touch the face. Built 2026-11-27 after Frank's side-by-side recording, where Dayya's braids flew around her hands.

```
python tools/avatar-face/calm_hair.py avatars/Dayya-v0.2-face.vrm avatars/Dayya-v0.2-calm.vrm
```

- **Default, "still":** hair physics is removed, so the hair moves only with the head. Calmest, and it looked natural on a 30 s signing clip.
- **`--soft`:** keeps physics but stiffer, slower and heavier, and the arms and hands no longer push the hair. On Dayya's waist-length hair it only cut the swing from 45 cm to 33 cm (longest strands, against the head), so use it only for short hair.
- Both modes damp the top's hem. Nothing else changes.

## Lab view tip

Set the lab's **Size** to **Portrait 720×1280**. Dayya then fills the frame like the signer does in the video. Landscape and Square leave room for arms out to the side, so she looks small.

## Checks

```
python -m unittest discover -s tools/avatar-face -v
```
