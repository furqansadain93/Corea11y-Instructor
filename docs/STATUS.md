# Status

Last updated: 2026-11-26 (12th update) by Computer A

## In progress (claims)

Format: `- [Computer] [date] area — what`

- Computer A 2026-11-26 tools/avatar-lab — new avatar lab (VRoid avatar, MediaPipe body/hands/face, motion files, video export). Computer B keeps the prototype's video-to-avatar tool; merge later.

## Next up

Kids channel (see `docs/KIDS-CHANNEL.md`):

- [ ] Find 2–3 Deaf signer candidates and run a screen test (one-minute story, judged by a Deaf teacher or children)
- [ ] Pick 3 CC BY picture books (StoryWeaver, Book Dash) and 2 public-domain rhymes (one Urdu, one English); confirm licences
- [ ] Moon Kids Story video: compare its song with CoComelon's boo-boo song; ask the creator for the file
- [ ] Contact the disability kids' channel about a partnership; check its licence
- [ ] Draft signer agreement and creator permission template
- [ ] Avatar lab: first real test. Record a 30-second signing clip (see `tools/avatar-lab/README.md` recording tips), track it, judge hands and face. Then with a real Deaf signer.
- [x] First VRoid avatar: Dayya v0.1 (works in the lab, 39/39 checks)
- [x] Dayya colours fixed by script (navy top, darker brows and lips): `avatars/Dayya-colours.vrm`
- [ ] Dayya v0.2 in VRoid: hair tied back (ears and shoulders free), slimmer sleeves, same colour codes; then add the 52 face shapes
- [ ] Avatar lab: retest on webcam (ears, lips, opposite shoulder, joined hands); tune touch thresholds; then collision check

Avatar app:

- [ ] Move the `sign-avatar-poc` prototype from Computer B into this repo and confirm 40/40 checks still pass
- [ ] Rename the prototype UI from "Sign Avatar" to "Corea11y Instructor"
- [ ] Create a Claude API key and test the AI step for real (key in `.env`)
- [ ] **Go/no-go 1:** tester writes 15–20 example glosses + reference glosses for 50–100 everyday sentences; score Claude (Haiku vs Opus) against them. Needs no recorded signs, do first.
- [ ] Video tool (Computer B area): anatomical joint limits, One-Euro filter tuned per joint, sign-to-sign blending with rest pose only at sentence edges
- [ ] Try handshape snapping on the first 20 videos
- [ ] **Go/no-go 2:** Deaf users compare avatar vs raw video on the first 20 signs; pass mark set in advance
- [ ] Add quick phrases (recorded as whole sentences), reply pad (icons + Urdu), optional confirm to the app
- [ ] Test the reply pad in role-plays (pharmacy, bank counter, classroom) with Deaf testers; see `docs/SIGN-TO-TEXT.md`
- [ ] Test playback on a real low-end Android phone
- [ ] Choose the launch language: PSL, International Sign, or both
- [ ] Ask Deaf Reach, PSL.org, Spreadthesign and university teams (Sign4PSL, UMT) **in parallel** for 20 sign videos. Written permission must cover avatar use **and** training sign recognition (Phase 3). Ask if they have the same signs from several signers. Record recording tips: good light, plain dark clothes, plain background, side camera if possible.
- [ ] Ask partner Deaf organisations which audience to target first
- [ ] Contact DeafTawk and ConnectHear (partner or competitor?); find out whether ConnectHear's SILA does sign-to-text
- [ ] Confirm the fluent tester and agree how they review
- [ ] Process the 20 videos and show the demo to the tester and a few Deaf users

## Done

- [x] Plan and roadmap written (see `docs/PLAN.md`)
- [x] Proof of concept built on Computer B, 40/40 automatic checks passed (2026-11-26)
- [x] Repo and sync process set up (2026-11-26)

## Not yet verified

- Avatar lab on a real signer video and on webcam (synthetic checks 39/39 pass; first webcam test by Frank: avatar follows, smile and left/right movement correct, joined hands and elbow were wrong, now fixed and awaiting retest)

- Real Claude API (only tested against a fake server)
- Video-to-avatar page on a real signer's video
