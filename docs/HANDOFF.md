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
