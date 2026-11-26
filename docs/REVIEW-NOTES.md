# Review notes

Outside critiques of the plan and our response. Added 2026-11-26.

## Critique 1: why the app could fail

| Point | Our view | Action |
|---|---|---|
| Stitched signs lose spatial grammar, eye gaze, facial grammar | Valid (already in plan risks) | Quick phrases recorded as whole sentences; say clearly in the app that typed sentences are stitched |
| Robotic / stiff faces | Valid; the top complaint Deaf users have about avatars | Keep facial blendshapes even on cheap phones; tester sets the bar |
| Slow fingerspelling for missing words | Valid | Tester-approved synonym list; grow library from "report a wrong sign" |
| One-way only | Valid for conversation, less so for learning | Reply pad in V1; sign-to-text as Phase 3 (see PLAN.md) |
| No real signs yet; real video may break tracking | **Most serious risk** | Go/no-go test on 20 videos before any large cleanup effort |
| 125 hours of Blender cleanup; 3,000–5,000 words = 750–1,250 hours | Fair but pessimistic: not every sign needs 15 min | Automate cleanup (critique 2); measure real average on first 20 |
| Claude/Haiku PSL sign order unproven | Valid | 50–100 sentence test against tester's reference glosses; compare Haiku vs Opus |
| Licence dependency could stall the project | Valid | Approach all partners and university teams in parallel; offer credit/co-branding |
| Confirm step adds friction | Overstated for a learning/phrases app | Confirm only when meaning changed or a word is fingerspelled |
| three.js lag on cheap Androids | Manageable | Test on a real low-end phone early; low-quality mode |

What critique 1 missed:

1. **Input language.** Most hearing users in Pakistan are more comfortable in Urdu or Roman Urdu than English. Claude handles both cheaply.
2. **Who exactly is the user.** See "Audiences" in PLAN.md.
3. **Avatar vs real video.** For a fixed library, stitched real video may read more naturally. Test side by side with Deaf users on the first 20 signs before committing to 125+ hours of cleanup.

## Critique 2: practical fixes

| Suggestion | Our view |
|---|---|
| Anatomical joint limits | Yes, cheap |
| One-Euro filter | Yes, but tune per joint (can blur fast handshape changes and fingerspelling). The "70–80% less cleanup" figure is a guess. It does **not** fix occlusion: hidden fingers give confident *wrong* handshapes, not jitter. |
| Neutral pose start/end | Only at **sentence** edges. Returning to rest between every sign looks more robotic; blend sign to sign. |
| Few-shot gloss prompt with 15–20 examples | Yes. Examples must come from the fluent tester. |
| Blind 50-sentence test | Yes. Do it first; needs no recorded signs. Test Haiku and Opus. |
| Map synonyms to library signs | Yes, through a **tester-approved** synonym list (clinic ≠ hospital); show the swap in the gloss |
| Quick phrase bar | Yes, core V1. Record phrases as whole sentences for natural grammar. |
| Optional confirm | Yes: play immediately when all words match; confirm only when meaning changed or fingerspelling |
| Reply pad | Yes. Icons + Urdu, not English only. |
| three.js budget settings (baked light, no shadows, 30 fps) | Yes, but do not cut facial expressions |

Our additions:

- **Handshape snapping.** PSL uses a limited set of handshapes. Build each once as a clean pose; the tool recognises which one is being held and snaps to it. Tracking then only supplies arm movement and timing. Potentially the biggest cleanup saving.
- **Better source video for free:** good lighting, plain dark clothing, plain background, a second camera from the side if possible.

## Build confidence (Claude's estimate, 2026-11-26)

| Piece | Confidence |
|---|---|
| Web app (screens, phrases, playback, reply pad, accounts, WCAG) | ~90% |
| Claude step (code) | ~85%; correctness of sign order depends on the tester |
| Video-to-avatar tool on real video | ~75% |
| Handshape snapping | ~60% |
| Smooth on cheap Android | ~75% |
| VRoid avatars with convincing faces | ~60–65% |
| Deaf users find it readable and useful | Unknown until the go/no-go test |
| Sign-to-text, single signs (Phase 3a) | ~60–70% |
| Sign-to-text, full sentences (Phase 3c) | Low; research-level |
