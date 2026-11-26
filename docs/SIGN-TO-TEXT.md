# Sign to text: options, real usage and impact

Added 2026-11-26. Expands Phase 3 in `PLAN.md`. The earlier discussion on this topic happened in a conversation that is no longer available. This file rebuilds it from `PLAN.md` and `REVIEW-NOTES.md`, plus a quick check of public PSL recognition data. Correct anything that does not match what was agreed.

## Why it matters

Text-to-avatar lets a hearing person reach a Deaf person. It does not let the Deaf person answer. Without a way back, the Deaf person is still waiting for the hearing person to guess. That is why `PLAN.md` rates "Deaf adults as direct users" as weak until sign-to-text exists. Two-way communication is also where competitors are thinnest.

## Who else does this

See Competitors in `PLAN.md`. In short: Google shipped ASL sign-to-text on Pixel 11 in Aug 2026; other sign-to-text products are ASL and mostly enterprise; in Pakistan there are student and research prototypes but no released PSL sign-to-text app. ConnectHear's SILA (Zong) needs checking.

## Real usage: what the Deaf person needs to say

Most everyday encounters need a small, predictable set of replies, not open conversation. That is the opening for a staged approach.

| Situation | What the Deaf person needs to say | Covered by |
|---|---|---|
| Clinic or pharmacy counter | Yes / no, where it hurts, how long, allergies, "I don't understand", "write it down" | Reply pad (most), 3a (body parts, numbers, time) |
| Bank, NADRA, passport office | Yes / no, name, CNIC or account number, "which counter?", "repeat" | Reply pad, 3b (names, numbers) |
| Classroom | Yes / no, "I don't understand", "repeat", answer from a small set | Reply pad, 3a |
| Family at home | Everyday words: eat, sleep, go, mother, tomorrow, pain | 3a (small family vocabulary) |
| Emergency (police, accident, hospital intake) | Help, pain, where, who to call | Reply pad for first contact; **then a human interpreter** |
| Job interview, court, medical consent, police statement | Open, high-stakes conversation | **Not this app.** Human interpreter only. |

The reply pad and a 50–100 sign vocabulary already cover most of the first four rows. Full-sentence recognition (3c) adds the most in exactly the rows where a mistake is most costly. That supports doing 3c last, or not at all.

## Options

| Stage | How it works | Build approach | Difficulty / confidence |
|---|---|---|---|
| 3.0 Reply pad (V1) | Big buttons: Yes, No, Repeat, Pain, Help, Write it down, with icons and Urdu. The Deaf person taps; the app shows large text and can speak it aloud. | Plain app UI | Easy, ~95% |
| 3a Single signs | The Deaf person signs one sign from a set of 50–100. The app shows its top 3 guesses; the user taps the right one. Nothing is shown to the hearing person until the user confirms. | MediaPipe hand + pose landmarks, small classifier running on the phone | Medium, ~60–70% |
| 3b Fingerspelling | Spell a name or missing word letter by letter, with the same tap-to-confirm step | Same landmarks; per-letter classifier | Medium-hard |
| 3c Full sentences | Continuous signing turned into gloss, and Claude turns the gloss into an English or Urdu sentence | Large multi-signer dataset, research partner | Research-level, low. Do not promise. |

A cheap middle option before 3a: a **sign-picker**. The Deaf person picks a picture or icon of a sign from a categorised grid (body, time, family, places). It needs no camera, works on any phone, and doubles as a "learn this sign" index.

## Data: what exists for PSL

Public PSL recognition data is mostly **alphabets**, which helps 3b more than 3a. Licences must be checked before any use, and none of these replace a licensed partner dataset.

- Urdu alphabet sets from 10 native signers (Ziauddin University, 2022) and from Bahria University (2024).
- PkSLMNM: PSL manual and non-manual (facial and body) gestures.
- A Hugging Face PSL landmark dataset built with MediaPipe (alphabets, words, sentences; marked MIT).
- The `sign-language-translator` project: about 788 PSL dictionary signs as videos and MediaPipe landmarks, with replications by 12 people from 4 camera angles announced.

The core 3a need is still **the same 50–100 signs from many different signers**, which is why the licence request to partners must cover recognition training (already in `STATUS.md`).

## Impact

**What it changes:** the Deaf person can start or steer a conversation instead of only receiving one. At a counter, the reply pad alone removes the most common failure (the staff member cannot tell whether they were understood). For families, even a small recognised vocabulary gives the Deaf child or adult a direct channel to relatives who never learned PSL.

**What it does not change:** it does not replace interpreters, and must say so. It is not suitable for consent, legal or police use.

**Risks of harm, and the guard for each:**

| Risk | Guard |
|---|---|
| Wrong guess shown confidently; the hearing person acts on it and the Deaf person cannot see the mistake | Top-3 plus confirm by the Deaf user; nothing shown to the other person until confirmed; show "unsure" when confidence is low |
| Works for the people it was trained on, fails for others (left-handed signers, regional variants, children, darker skin in poor light) | Train on many signers; test by group; publish where it works poorly |
| Hearing institutions use the app to avoid hiring interpreters | Clear wording in the app and in any organisation offer: a helper for everyday phrases, never an interpreter replacement |
| Camera privacy | Process on the phone; no video leaves the device unless the user explicitly agrees; clear privacy policy |
| Deaf community sees it as built about them, not with them | Deaf partners and testers decide the vocabulary and the pass marks; credit or pay contributors |

## How to measure impact

Set pass marks with Deaf partners **before** testing.

- Accuracy: top-1 and top-3 accuracy on signers **not** in the training data, reported per group.
- Task success: in role-plays (pharmacy, bank counter, classroom), did the Deaf person get the needed message across? How long did it take, compared with pen and paper?
- Preference: do Deaf testers choose the app over writing, gesturing or the reply pad alone?
- Harm check: how many wrong messages got through, and were they noticed?
- Real use: after a pilot with one partner (for example one clinic or one school), weekly use and "report a wrong sign" counts.

## Recommended order

1. Reply pad in V1. Test it in role-plays with Deaf testers alongside go/no-go 1.
2. Sign-picker (no camera) as part of "learn this sign".
3. In licence talks, ask for recognition rights and multiple signers per sign.
4. 3a prototype on 20–30 signs once licensed multi-signer data exists. Test on unseen signers.
5. 3b, using public alphabet data where the licence allows.
6. 3c only with a university partner, framed as research.

## Open questions

- Which vocabulary for 3a first: clinic, school or family? Ask the partner Deaf organisations.
- Should the reply pad speak aloud (text-to-speech in Urdu) as well as show text?
- Who reviews recognition errors, and how fast does the vocabulary grow?
