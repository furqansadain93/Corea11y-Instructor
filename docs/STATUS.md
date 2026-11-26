# Status

Last updated: 2026-11-26 (3rd update) by Computer A

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
- [ ] Test the reply pad in role-plays (pharmacy, bank counter, classroom) with Deaf testers; see `docs/SIGN-TO-TEXT.md`
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
