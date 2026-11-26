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
