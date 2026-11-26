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
