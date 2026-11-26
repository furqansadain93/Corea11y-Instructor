# Avatar design spec

Added 2026-11-26 from Frank's review of the sample avatar: hair touched the eyebrows (expressions lost), hair hid the ears, and the dress should suit both eastern and western audiences. Applies to every avatar we make (VRoid or commissioned). The lab checks some of this automatically when an avatar loads (status box: face shapes, eyebrows, ears).

## Why it matters

In sign language the face and hands carry grammar, not only the hands' shapes. Raised or lowered eyebrows mark questions; mouth shapes and cheeks change meaning; signs touch the forehead, eyes, cheeks, ears, lips, chin, shoulders and chest. Anything that hides these, or blends in with the hands, makes signs harder to read.

## Framing: upper body only

Signing space runs from just above the head to the waist, with arms' reach to each side. Legs are not needed for signing, so:

- Videos are framed from just above the head to the waist (the lab's default camera; "Reset camera" returns to it).
- The avatar can keep its legs (VRoid always builds a full body), but no effort goes into them.
- Leave room above the head and at the sides: some signs go above the head or out to the side.
- Exception: occasional full-body shots for kids' content (dancing, jumping) are fine.

## Face

| Rule | Why |
|---|---|
| Eyebrows fully visible: fringe short (well above the brows), parted, or swept to the side | Eyebrows mark questions and emotion |
| Eyebrows clearly drawn, darker than the skin | So their movement reads at small sizes (phones) |
| Mouth clearly drawn, lips slightly darker than the skin | Mouth shapes carry meaning |
| Ears visible: hair behind the ears, tied back, or short | Ear is a touch spot; hair over ears hides the contact |
| No glasses, masks, face paint, beards covering the mouth | Hide facial grammar |
| Eyes open, natural size (avoid huge anime eyes that cover the brows) | Gaze and brows must read |
| Add the 52 ARKit face shapes (HANA_Tool, YAARKitHelper or an artist) | Full eyebrow, cheek and mouth movement |

## Hair

| Character | Hair |
|---|---|
| Woman | Tied back (low bun or ponytail) or shoulder length tucked behind the ears; fringe above the brows or side-swept |
| Woman in hijab | Hijab framing the face, close-fitting, plain and solid colour, not covering the brows or chin; ears covered is fine (ear touches then land on the hijab) |
| Man | Short, off the forehead and ears |

Hair must not swing in front of the face or hands. In VRoid, keep hair physics ("spring bones") low for front hair, or turn it off.

## Dress: neutral, modest, works in Pakistan and abroad

Based on what sign language interpreters wear: plain clothes that contrast with the skin so hands stand out.

| Rule | Detail |
|---|---|
| Top | Plain long-sleeve tunic or shirt, loose fit, high round or band neckline, hem at hip to mid-thigh (reads as a kurta in Pakistan and as a tunic top in the West). Man: plain long-sleeve kurta-style or button-up shirt. |
| Sleeves | Long, ending at the wrist and close-fitting there. No wide or dangling sleeves (they hide wrist movement). |
| Colour | One solid colour that contrasts with the skin tone and the background: deep navy, charcoal, dark teal or bottle green for light and medium skin; a lighter solid (soft blue, sand, light grey) can suit darker skin on a darker background. Check contrast against all three skin tones. |
| Patterns | None: no prints, stripes, logos, text or embroidery on the chest or sleeves |
| Accessories | None near the hands or face: no rings, bracelets, watches, dangling earrings or necklaces |
| Hands | Bare, natural skin tone, short plain nails; no gloves or sleeves over the hands |
| Lower body | Plain trousers in a matching or darker colour (rarely on screen) |
| Background | Plain, contrasting with both the clothes and the skin (the lab offers white, light blue-grey, green screen and dark) |

Same outfit across all avatars and skin tones gives the channel a consistent look; one accent colour can be the brand colour.

## Personality: sweet and polite

Frank, 2026-11-26: the host's expression should be sweet and polite, someone who adores kids.

- Each avatar gets a **"sweet" resting expression** (soft closed smile, gentle eyes that stay open so gaze reads, relaxed brows). `scripts/recolour_vroid.py` adds it to VRoid avatars (VRoid's gentle-smile face shape plus slightly raised mouth corners).
- The lab layers it **under** the signer's face (Warmth slider, default 0.75). It fades automatically when the signer's brows move (questions, emphasis) and softens during mouth shapes, so it never hides grammar.
- The lab adds **natural blinking** when no face is tracked, so the avatar never stares.
- Real warmth also comes from the signer's own face: the Deaf performer should smile and react as they would with children.

## Characters to make (from `DECISIONS.md`)

Man, woman, woman wearing a hijab; three skin tones each. Start with one (the woman, as the kids' channel host), test it, then make the rest from the same base.

## Review: Dayya v0.1 (2026-11-26)

First avatar, made by Frank in VRoid Studio. Licence set correctly (only the author may use it, no redistribution, credit required). Works in the lab: all 39 automatic checks pass with Dayya, the demo wave plays, video recording works, eye gaze works (bone type), all finger bones present.

| Item | Status | To change |
|---|---|---|
| Eyebrows free of hair | Pass (fringe parted in the middle) | Make the brows darker and a bit thicker: they are very pale and thin and will not read on a phone |
| Ears | Fail: long hair covers both ears | Tie the hair back (low bun or ponytail) or tuck it behind the ears |
| Hair over the shoulders and chest | Long strands hang in front of the shoulders | Same fix as the ears; keeps shoulder and chest touches visible |
| Mouth | Pale lips, low contrast | Slightly darker lip colour |
| Top colour | White | One solid darker colour (navy, charcoal, dark teal): white hides light-skinned hands and blends with a white background |
| Top details | Grey tab at the collar, pink tag at the hem, zip line | Remove tabs/tags; plain front |
| Sleeves | Full, gathered at the wrist | Slimmer sleeves, close at the wrist |
| Face shapes | Basic VRoid expressions only | Done by script: `tools/avatar-face/add_face_shapes.py` (re-run on each new export) |

**Dayya v0.2 face (Computer B, 2026-11-27):** `avatars/Dayya-v0.2-face.vrm`, made from `Dayya-colours.vrm` with `tools/avatar-face/add_face_shapes.py`: the 52 ARKit face expressions built from VRoid's own face shapes (36 driven, 16 empty). The lab shows "Full face tracking (52 shapes): yes" and drives brows, pout, frown, smile, wide eyes and one-eye blinks separately. Limit: VRoid brows and mouth move both sides together. Hair and sleeves still need VRoid (v0.2 proper); run the recolour script, then this script, on that export.

**Dayya v0.1.3 (2026-11-26):** added the sweet resting expression (see Personality). 43/43 checks pass.

**Dayya v0.1.2 restyle (2026-11-26, Frank: "more 3D, modern cartoon look; enhance the trousers"):** same script, now also charcoal trousers `#46484F` and softer MToon shading (smoother light-to-shadow gradient, darker shadow side, subtle rim light) on skin, hair and clothes. The lab has a new **Lighting** option: *Studio (3D look)*, the default, with key, fill, rim and sky lights and neutral tone mapping; *Flat (original)* for the old even light. 39/39 checks pass.

**Dayya v0.1.1 colours (done by Claude, 2026-11-26):** `avatars/Dayya-colours.vrm`, made from v0.1 with `tools/avatar-lab/scripts/recolour_vroid.py`: top recoloured to solid navy `#1F2A44` with the collar tab and hem tag removed, eyebrows darker (`#3A2A20`) and slightly thicker, lips deeper (`#C0636B`). 39/39 checks pass. Not changed (needs VRoid, they are shape changes): hair over the ears and shoulders, sleeve width. The `.vroid` project still has the old colours: use the same colour codes in VRoid for v0.2, or run the script again on the new export.

## Checklist before using an avatar

1. Export as VRM 1.0 from VRoid (or ask the artist for VRM 1.0).
2. Load it in the lab. The status box should say: eyebrows visible, ears visible (not required for the hijab version), and ideally "Full face tracking (52 shapes): yes".
3. Play `samples/demo-wave.motion.json` and look at the hands and fingers up close: all finger joints bend, no gloves or sleeves in the way.
4. Webcam test: raise eyebrows, frown, open the mouth, touch lips, chin, ear, opposite shoulder; check the avatar shows each one.
5. Look at it at phone size (small window): can you still read the eyebrows and mouth?
6. Show it to a Deaf tester before making the full set.
