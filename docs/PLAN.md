# Corea11y Instructor: plan summary

Condensed from "Sign Language Avatar App: Plan and Roadmap" (Osama Nasir, 26 Nov 2026). The full PDF is the reference; this file is what each Claude reads.

## What it is

A person types English text and a 3D avatar signs it in Pakistan Sign Language (PSL), with more sign languages later. PSL text-to-avatar is not empty: DeafTawk already offers AI text/speech-to-sign with an avatar, including from Urdu (see Competitors). Research prototypes also exist (Sign4PSL, PSL SignBank at UMT). For PSL sign-to-text, ConnectHear's SILA appears to be the only deployed system; the rest are open-source and student prototypes (checked 2026-11-26).

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

Details, real-usage scenarios and impact: see `docs/SIGN-TO-TEXT.md`.

Gives the Deaf person a voice in the conversation. Few competitors offer two-way PSL (or any) sign communication. Much harder than text-to-avatar: it must recognise any signer, speed, lighting and camera; needs each sign from many signers; errors are silent and costly; involves camera privacy.

| Stage | What | Difficulty |
|---|---|---|
| 3.0 Reply pad (in V1) | Yes / No / Repeat / Pain / Help buttons with icons and Urdu | Easy |
| 3a Single-sign recognition | Deaf user signs one sign at a time from 50–100 signs (yes, no, pain, where, numbers, family, time). App shows top 3 guesses; user taps the right one. MediaPipe landmarks + small on-device model. | Medium |
| 3b Fingerspelling recognition | Spelled names and words | Medium-hard |
| 3c Full sentences | Continuous signing → English/Urdu, Claude turns recognised gloss into a sentence | Research-level; needs a lot of data and a university partner. Do not promise. |

Do now: ask library partners for permission covering **both** avatar use **and** training recognition, and whether they have the same signs recorded by **several signers**. Later, with explicit consent, users can contribute recordings (credited or paid). Process video on the phone where possible; publish a clear privacy policy.

## Kids sign language channel (proposed)

See `docs/KIDS-CHANNEL.md`: signed rhymes and stories for Deaf children on YouTube, human Deaf signer first, avatar later from the same recordings.

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

Checked 2026-11-26.

**In Pakistan (PSL), possible competitors or partners:**

| Who | What | Note |
|---|---|---|
| DeafTawk | Interpreter video calls plus AI text/speech-to-sign avatar (English, Spanish, Urdu); MoU with PTA for its offices | Closest direct rival for text-to-avatar. Talk to them. |
| ConnectHear | Online PSL interpreting. AI system "SILA", a patent-pending conversational sign language AI agent, launched at Zong service centres (Islamabad, Lahore, Karachi), 23 Sep 2026: Deaf customers sign to it, human interpreter steps in when needed. Also made a PSL version of the kids' show *Pakkay Dost* (2025). | Almost certainly reads PSL: the only deployed PSL sign-to-text found. Vocabulary and accuracy unknown. Competitor in kids' content too. |
| Deaf Reach PSL resources | Free PSL video dictionary app and site (5,000+ words, 70+ categories) | Library partner candidate, not an AI rival |
| University / student projects (UMT, NUML Karachi, Bahria, Isharapal) | PSL recognition, mostly alphabets or small word sets in controlled conditions | Possible research partners; none released as a product |
| Open-source PSL projects | Bol PSL (30–50 counter signs to Urdu text/voice, staff reply by speech), Listen (64 signs, offline on a phone), a 775-sign translator (top-3 guesses), `sign-language-translator` library (789 signs, text-to-sign; sign-to-text "coming soon"), LinguaSign, Sign-O | Single-sign recognition is no longer rare; the hard part is licensed data, Deaf testing and trust |

**Text to sign (abroad):** Hand Talk (Brazil, closest consumer rival), VLibras, Signapse (UK), Silence Speaks, Kara Technologies (NZ), BuHamad (Qatar), ISL Connect (India, closest in region), Signvrse (Kenya), sign.mt. None do PSL.

**Sign to text (abroad):**

| Who | What |
|---|---|
| Google SL2T | Built into Pixel 11 (Gboard, Live Transcribe) since Aug 2026. ASL to English only; trained on 50+ sign languages; on-device MediaPipe landmarks, user reviews text before sending; Google says not for high-stakes use. SignGemma (open model) announced 2025, release status unclear. |
| Sign-Speak | Deaf-led, US. ASL captioning and API |
| SignAll | Multi-camera ASL kiosks for workplaces |
| SLAIT | ASL to text in video calls |
| Sorenson | ASL to text proof of concept |
| Talksign | Nigeria/UK, ASL to text model |

None do PSL. Risk: if Google adds PSL, competing on full-sentence recognition is hard. Our angle is what Google is unlikely to do soon: PSL and Urdu, the reply pad, clinic/school/family vocabularies, and building with Pakistani Deaf organisations.
