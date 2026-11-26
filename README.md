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
