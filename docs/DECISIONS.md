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
