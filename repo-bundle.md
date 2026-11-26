# Corea11y Instructor repo bundle (2026-11-26)

Files prepared in a cloud session that could not push. Recreate each file below at the given path in the local clone, then commit. Each file is between ===== FILE: path ===== and ===== END ===== lines. Also create empty folders app/, server/, tools/, tests/ (each with a .gitkeep).

===== FILE: .env.example =====
# Copy to .env and fill in. Never commit .env.
ANTHROPIC_API_KEY=
# claude-opus-5-5 for testing, claude-haiku-5-5 to save cost
CLAUDE_MODEL=claude-haiku-5-5
===== END =====

===== FILE: .gitattributes =====
* text=auto eol=lf
*.png binary
*.jpg binary
*.glb binary
*.vrm binary
*.blend binary
===== END =====

===== FILE: .gitignore =====
# Secrets
.env
.env.*
!.env.example

# Raw media (keep outside git)
*.mp4
*.mov
*.avi
*.mkv
*.webm
library/raw/
videos/

# Blender backups and big exports
*.blend1
*.blend2

# Dependencies and builds
node_modules/
__pycache__/
.venv/
dist/
build/

# OS / editor
.DS_Store
Thumbs.db
desktop.ini
.vscode/
.idea/
===== END =====

===== FILE: CLAUDE.md =====
# Instructions for every Claude working on this repo

This project is built on **two computers by two Claude sessions**. Git is the single source of truth. Follow these rules every session.

## Start of session (always)

1. `git pull` (or Fetch + Pull in GitHub Desktop). Never start on a stale copy.
2. Read, in order: `docs/HANDOFF.md` (latest entry at the top), `docs/STATUS.md`, `docs/DECISIONS.md`.
3. Check `docs/STATUS.md` → "In progress" to see what the other computer has claimed. Do not edit files in an area the other computer has claimed unless the user says so.
4. Claim your work: add a line under "In progress" with computer name, date and area, then commit and push that change right away (`chore: claim <area>`), so the other side sees it.

## End of session (always)

1. Run the checks (`tests/` or `app/test.html`) and note the result.
2. Add a new entry at the **top** of `docs/HANDOFF.md` using the template there.
3. Update `docs/STATUS.md` (move items to Done, release your claim).
4. If a choice was settled, add it to `docs/DECISIONS.md`. Do not re-open a recorded decision without the user.
5. Commit with a clear message and push. Never leave work only on one computer.

## Areas (to avoid editing the same files)

| Area | Folder | Default owner |
|---|---|---|
| App UI, text step, playback | `app/` | Computer A |
| Video-to-avatar, sign library tools | `tools/`, `library/` | Computer B |
| Server (Claude API, correction, sign order) | `server/` | whoever claims it |
| Docs | `docs/` | both (small edits, pull first) |

Computer names: **A = Frank's desktop (desktop-f3odm2c)**, **B = the computer with the original prototype**. Rename here if this changes.

## Rules

- Never commit secrets. The Claude API key goes in `.env` (ignored). Use `.env.example` for the variable names.
- Never commit sign videos or large raw media. They live outside git (see `library/README.md`). Small processed motion files (`.json`) are fine.
- Signs may only come from licensed, recorded Deaf signers and be checked by a fluent reviewer. The AI step may only use signs that exist in the library; anything else is fingerspelled.
- Pages must meet WCAG 2.2 AA.
- Commit messages: `feat:`, `fix:`, `docs:`, `chore:`, `test:`.
- If a pull has a conflict in a doc file, keep both sides' entries; if in code, stop and ask the user.
===== END =====

===== FILE: README.md =====
# Corea11y Instructor

Type English, and a 3D avatar signs it in Pakistan Sign Language (PSL). More sign languages later.

**Status:** proof of concept. Not a translator yet; every sign must come from a recorded Deaf signer and be checked by a fluent reviewer.

## Folders

| Folder | What |
|---|---|
| `app/` | Web app: avatar choice, sentence box, confirm step, playback |
| `server/` | English correction and sign order via the Claude API (no-AI fallback without a key) |
| `tools/` | Video-to-avatar page (MediaPipe tracking → library) |
| `library/` | Processed sign movement files (JSON). No raw videos. |
| `tests/` | Automatic checks |
| `docs/` | Plan, status, decisions, handoff log |

## Working on this repo

Two computers and two Claude sessions work on this. Read `CLAUDE.md` first, then `docs/HANDOFF.md`.

## Setup

Copy `.env.example` to `.env` and add your Claude API key. Never commit `.env`.
===== END =====

===== FILE: docs/DECISIONS.md =====
# Decisions

Settled choices. Do not re-open without Frank. Newest at the top.

| Date | Decision | Why / notes |
|---|---|---|
| 2026-11-26 | App name: **Corea11y Instructor** | Chosen by Frank. Note: the plan said to launch under a separate brand because CoreA11y products are promoted as AI-free and this app uses AI. Make sure the AI-free messaging is handled (e.g. clearly say this product uses AI). |
| 2026-11-26 | Repo: github.com/furqansadain93/Corea11y-Instructor | Single source of truth for code and docs |
| 2026-11-26 | Version 1 = text in, avatar signing out only | No lessons, camera, speech, payments, store apps |
| 2026-11-26 | Stack: three.js (playback), MediaPipe (tracking), Blender (cleanup), VRoid (Phase 2 avatars), Claude API (Opus for testing, Haiku to save cost) | All free except API usage |
| 2026-11-26 | AI may only use signs in the library; anything else is fingerspelled | Safety and accuracy |
| 2026-11-26 | Input limit: 20 words / 120 characters per sentence; paragraphs split and queued | From plan |
| 2026-11-26 | Avatars: man, woman, woman wearing a hijab; 3 skin tones | From plan |
| 2026-11-26 | Never claim to replace interpreters | Positioning: helper for everyday phrases and learning |

## Open decisions

- Launch language: PSL, International Sign, or both
- Library partner: Deaf Reach, PSL.org, Spreadthesign, or a university team (Sign4PSL, PSL SignBank at UMT)
- Fluent (ideally Deaf) tester and review process
- Input language: English only, or also Urdu / Roman Urdu in V1
- First target audience (frontline staff, teachers, families, Deaf children's literacy)
- Quick phrases recorded as whole sentences as a core V1 feature (recommended)
- Confirm step only when meaning changed or fingerspelling is needed (recommended)
- Avatar vs real video for the fixed library: decide after go/no-go 2
- Add Phase 3 sign-to-text (single-sign recognition first) to the roadmap (proposed 2026-11-26, see PLAN.md)
===== END =====

===== FILE: docs/HANDOFF.md =====
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
===== END =====

===== FILE: docs/PLAN.md =====
# Corea11y Instructor: plan summary

Condensed from "Sign Language Avatar App: Plan and Roadmap" (Osama Nasir, 26 Nov 2026). The full PDF is the reference; this file is what each Claude reads.

## What it is

A person types English text and a 3D avatar signs it in Pakistan Sign Language (PSL), with more sign languages later. No released PSL text-to-avatar app exists; Pakistan has only research prototypes (Sign4PSL, PSL SignBank at UMT).

## Version 1 user flow

1. Try once without an account; sign up to save history.
2. Pick an avatar (man, woman, woman wearing a hijab) and a skin tone.
3. Type a sentence (max 20 words / 120 characters). Pasted paragraphs are split and queued.
4. See corrected English and the sign gloss (e.g. `HOSPITAL WHERE?`), edit, confirm.
5. Watch: play, pause, replay, slow motion, subtitles. Can keep typing while it plays.
6. "Report a wrong sign" button.

| In V1 | Not in V1 |
|---|---|
| One sign language (PSL or International Sign, whichever licence comes first) | More languages |
| AI English correction and sign order, limited to library signs | Free translation without review |
| Fingerspelling for names and missing words | Camera, speech, lessons, teacher tools |
| Avatar choice, web app that works on cheap phones | Play Store / App Store apps |
| WCAG AA pages | Certificates, payments, teacher directory |

## Audiences

The app helps most where a hearing person needs a small, predictable set of phrases, or where someone is learning. It helps least in open, high-stakes conversation (medical consent, court, police statements), which needs a human interpreter.

| Audience | Problem solved | Fit |
|---|---|---|
| Frontline staff (clinics, pharmacies, banks, NADRA/passport offices, police, transport counters) | No interpreter on the spot; need a few dozen fixed phrases | Strong, V1 (quick phrases) |
| Teachers in Deaf and inclusive schools | Many are not fluent in PSL; need to check or learn classroom signs | Strong, V1 |
| Deaf children learning to read | Linking written Urdu/English words to signs (literacy bridge) | Strong, V1 ("learn this sign") |
| Parents, siblings, wider family and community | Only one family member usually learns; others are cut off | Strong, V1 |
| Organisations publishing for Deaf people (government, hospitals, NGOs, banks, telecoms, news) | Signed notices, health and emergency messages without re-filming; many Deaf adults have limited literacy | Later, paid widget; every message reviewed by a fluent signer |
| Employers hiring Deaf staff | Workplace instructions, safety, onboarding | Later |
| Deaf adults as direct users | Need to be understood by hearing people | Weak until sign-to-text (Phase 3) |

Sharper V1 framing: quick phrase packs (clinic, school, office, family) recorded as whole sentences; typed text as the flexible extra; a "learn this sign" mode. Ask the partner Deaf organisations which audience to target first.

## Roadmap phases

| Phase | What |
|---|---|
| 0. Go/no-go | Test Claude's sign order (50–100 sentences vs tester's reference glosses, Haiku vs Opus). Process 20 licensed videos. Deaf users compare avatar vs raw video. Set a pass mark first (e.g. 80% of signs understood). |
| 1. Version 1 | Text/phrases to avatar as scoped above, plus quick phrases, reply pad, optional confirm. Consider Urdu / Roman Urdu input. |
| 2. Real avatars | VRoid avatars with facial expressions; library growth; handshape snapping for faster cleanup |
| 3. Sign to text | See below |

## Phase 3: sign to text

Gives the Deaf person a voice in the conversation. Few competitors offer two-way PSL (or any) sign communication. Much harder than text-to-avatar: it must recognise any signer, speed, lighting and camera; needs each sign from many signers; errors are silent and costly; involves camera privacy.

| Stage | What | Difficulty |
|---|---|---|
| 3.0 Reply pad (in V1) | Yes / No / Repeat / Pain / Help buttons with icons and Urdu | Easy |
| 3a Single-sign recognition | Deaf user signs one sign at a time from 50–100 signs (yes, no, pain, where, numbers, family, time). App shows top 3 guesses; user taps the right one. MediaPipe landmarks + small on-device model. | Medium |
| 3b Fingerspelling recognition | Spelled names and words | Medium-hard |
| 3c Full sentences | Continuous signing → English/Urdu, Claude turns recognised gloss into a sentence | Research-level; needs a lot of data and a university partner. Do not promise. |

Do now: ask library partners for permission covering **both** avatar use **and** training recognition, and whether they have the same signs recorded by **several signers**. Later, with explicit consent, users can contribute recordings (credited or paid). Process video on the phone where possible; publish a clear privacy policy.

## Pipeline

Signer video → MediaPipe tracks body, hands, face → movement saved to library (JSON) → Blender cleanup for bad fingers (~15 min/sign) → three.js plays it on the avatar. Claude API corrects English and orders signs, using only library signs. Placeholder avatar now, VRoid avatars in Phase 2 without changing the rest.

## Cost

About $100–$250 cash over 4–6 months. Claude subscription ~$20/month; Claude API Haiku ~$5–10 per 10,000 sentences. Everything else free. Main cost is time (500 signs ≈ 125 hours of cleanup).

## Proof of concept (Computer B, `sign-avatar-poc`)

40/40 automatic checks passed on 26 Nov 2026: arm direction (worst 0.03°), hand turn (0.1°), finger joints (0.4°), max jump 15°/frame, tracking gaps filled, 14/14 text-step checks, 12/12 AI-step checks against a fake Claude server, signs outside the library blocked and fingerspelled. Contains no real signs yet.

Pages: app page (avatar choice, sentence box, confirm step, sign list with status, playback, queue); video-to-avatar page (load video, track, preview, save to library); server (Claude correction with a no-AI fallback when there is no key).

## Key risks

See also `docs/REVIEW-NOTES.md` for two outside critiques and our responses.


- Library licence must explicitly cover turning videos into avatar movement.
- Stitched signs read as a chain of words; lacks spatial/facial grammar. Say so in the app.
- Deaf users dislike robotic, blank-faced avatars; tester feedback sets the bar.
- Fingers hide each other on video; some handshapes need manual fixing.
- Never claim to replace interpreters.
- Tester must be fluent, ideally Deaf.

## Competitors

Hand Talk (Brazil, closest consumer rival), VLibras, Signapse (UK), Silence Speaks, Kara Technologies (NZ), BuHamad (Qatar), ISL Connect (India, closest in region), sign.mt. None do PSL.
===== END =====

===== FILE: docs/REVIEW-NOTES.md =====
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
===== END =====

===== FILE: docs/STATUS.md =====
# Status

Last updated: 2026-11-26 (2nd update) by Computer A

## In progress (claims)

Format: `- [Computer] [date] area — what`

- (none)

## Next up

- [ ] Move the `sign-avatar-poc` prototype from Computer B into this repo and confirm 40/40 checks still pass
- [ ] Rename the prototype UI from "Sign Avatar" to "Corea11y Instructor"
- [ ] Create a Claude API key and test the AI step for real (key in `.env`)
- [ ] **Go/no-go 1:** tester writes 15–20 example glosses + reference glosses for 50–100 everyday sentences; score Claude (Haiku vs Opus) against them. Needs no recorded signs, do first.
- [ ] Video tool (Computer B area): anatomical joint limits, One-Euro filter tuned per joint, sign-to-sign blending with rest pose only at sentence edges
- [ ] Try handshape snapping on the first 20 videos
- [ ] **Go/no-go 2:** Deaf users compare avatar vs raw video on the first 20 signs; pass mark set in advance
- [ ] Add quick phrases (recorded as whole sentences), reply pad (icons + Urdu), optional confirm to the app
- [ ] Test playback on a real low-end Android phone
- [ ] Choose the launch language: PSL, International Sign, or both
- [ ] Ask Deaf Reach, PSL.org, Spreadthesign and university teams (Sign4PSL, UMT) **in parallel** for 20 sign videos. Written permission must cover avatar use **and** training sign recognition (Phase 3). Ask if they have the same signs from several signers. Record recording tips: good light, plain dark clothes, plain background, side camera if possible.
- [ ] Ask partner Deaf organisations which audience to target first
- [ ] Confirm the fluent tester and agree how they review
- [ ] Process the 20 videos and show the demo to the tester and a few Deaf users

## Done

- [x] Plan and roadmap written (see `docs/PLAN.md`)
- [x] Proof of concept built on Computer B, 40/40 automatic checks passed (2026-11-26)
- [x] Repo and sync process set up (2026-11-26)

## Not yet verified

- Real Claude API (only tested against a fake server)
- Video-to-avatar page on a real signer's video
===== END =====

===== FILE: library/README.md =====
# Sign library

Processed movement files (JSON), one per sign, named by gloss (e.g. `HOSPITAL.json`).

Raw signer videos are NOT stored in git. Keep them in the shared storage location (to be decided) and record the source and licence for each sign in `library/SOURCES.md`.
===== END =====

===== FILE: library/SOURCES.md =====
# Sign sources and licences

| Gloss | Source / signer | Licence covers avatar use? | Reviewed by | Date |
|---|---|---|---|---|
===== END =====

