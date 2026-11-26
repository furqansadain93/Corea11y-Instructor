# Kids sign language channel: plan

Proposed 2026-11-26 by Frank. Not yet a settled decision (see `DECISIONS.md`, open decisions).

## Idea

A YouTube channel of children's rhymes, songs and stories in Pakistan Sign Language (PSL), signed by a Deaf signer, later also by a cartoon avatar made from the signer's recordings. Inspired by kids' videos where a signer interprets a rhyme and children love watching her.

Why it fits:

- Deaf children, most born to hearing parents, get very little early sign language. Signed rhymes and stories support early language and later reading (literacy bridge, see Audiences in `PLAN.md`).
- Needs no AI. Fits the CoreA11y "AI-free" promise better than the avatar app.
- Cheap to start: a signer, a camera, a free video editor.
- Feeds the avatar project: every signer recording (with consent) becomes licensed movement data for the avatar.
- Few direct competitors. ConnectHear made a PSL version of Bilal Maqsood's *Pakkay Dost* (2025), but no channel dedicated to signed Urdu/English rhymes for Pakistani children was found. Model to learn from: Deaf Animation World (UK, BSL nursery rhymes). Book Dash and Stellenbosch University's Handlab make South African Sign Language versions of open-licensed picture books.

## Content and copyright rules

Adding a signer to someone else's video does not make it ours, and using only the transcript does not help: a signed version is a translation, which needs permission. No tricks to avoid YouTube's Content ID. Allowed sources only:

| Source | Use | Check |
|---|---|---|
| Public domain text | Free | Pakistan: author's life + 50 years. Iqbal (d. 1938), Ismail Merathi (d. 1917), traditional nursery and folk rhymes are free. Sufi Tabassum (d. 1978) is protected until 2028. Use only the words: make our own recording, tune and visuals. |
| CC BY 4.0 books | Free with credit, adaptation and commercial use allowed | StoryWeaver (Pratham Books, ~53K books, Urdu included; use the books, not their BY-NC-ND read-along videos), Book Dash (all CC BY, source art files available), African Storybook / Bloom / Let's Read (mixed: check each) |
| CC BY YouTube videos | Free with credit | Licence line at the bottom of the description (on a computer). Screenshot it. Uploader must be the real creator: no famous characters, songs or clips inside. |
| Partner creators | With written permission | Standard offer: "we sign your video in PSL for free, full credit". Creator keeps ownership. |
| Our own originals | Ours | Commissioned rhymes, ideally co-written with Deaf poets |

Never use: CC BY-NC (if the channel earns money), CC BY-ND (signing is an adaptation), anything with a standard YouTube licence without permission.

Getting files: YouTube's terms forbid downloading other people's videos, even CC ones. Ask the creator for the original file (also confirms ownership).

Credits (in the description and briefly on screen): title, author, source link, licence, what we changed, and the signer's name. Example: *"Title" by Author (link), licensed under CC BY 4.0. Pakistan Sign Language version by Corea11y Instructor, signed by [name].*

## Production workflow

1. Pick content and confirm the licence.
2. Signer translates into PSL (meaning, not word by word; condensed is fine), checked by a second Deaf person.
3. Record: plain background, good light, plain dark clothes, side camera if possible (for the avatar later).
4. Build the video around the signing, not the other way round: book pages or cartoon, gentle animation, Urdu text (ideally word highlighting).
5. Fast source videos: freeze frames while the signer finishes, slow to 85–90%, add pauses between scenes. Deaf children must look from action to signer and back.
6. Optional: gentle narration and licensed music (YouTube Audio Library or own) for hearing family members.
7. Later: avatar version from the same recording.
8. Deaf check before publishing. Add credits.

Tools: DaVinci Resolve, Kdenlive or CapCut (free).

## Signer

- Wanted: a Deaf native signer, who can both sign and self-check, plus a quick second look from a Deaf teacher or a few children.
- Where: Deaf schools, Deaf Reach, Deaf associations and community groups, Deaf creators online (e.g. Deaf Crew on TikTok), DeafTawk or ConnectHear networks if partnering.
- Screen test: 2–3 candidates sign the same one-minute story; a Deaf teacher or children pick the clearest and most engaging.
- Practical: plan communication (written Urdu, video messages, interpreter at first); help with written Urdu text if needed; agree which signs to use where PSL varies by city, and keep a sign list.
- Written agreement: pay per video, use of videos, use as avatar movement data, credit, what happens if we stop working together.

## Avatar

| Step | What |
|---|---|
| 1 | Push the prototype from Computer B into the repo (blocks everything) |
| 2 | Quick tracking test: 30-second clip of anyone signing → video-to-avatar tool. Tests the "real video" risk in `REVIEW-NOTES.md`. |
| 3 | Add face tracking (MediaPipe face blendshapes) to the pipeline |
| 4 | Test end to end with a free VRoid avatar. VRoid is free and allowed for commercial use; it needs the 52 ARKit face shapes added (HANA_Tool ~¥1,500, or free YAARKitHelper Blender add-on, or Fiverr). |
| 5 | Render to a video file for YouTube: load movement into Blender, render there |
| 6 | Commission the channel's own Pakistani cartoon character once 2–4 work |

Character requirements for the artist: fully rigged fingers (most important), standard humanoid skeleton, 52 ARKit face shapes, VRM or GLB export, light enough for cheap phones, not too short arms or oversized head (signs near the face clip). Test one rhyme on a draft before paying for the full set.

Not allowed: copying or imitating a known character (e.g. Ghulam Rasool) without a licence from its owner. Licensing a known character is worth asking about.

Style: VRoid looks anime. Show drafts to Deaf children and parents before investing.

## YouTube

- Mark videos "made for kids": comments, end screens and cards are off, so cross-promotion happens via playlists, descriptions and sharing outside YouTube.
- Titles and descriptions in English and Urdu with "sign language", "Pakistan Sign Language", "PSL".
- One home per signed video. Original on the creator's channel, signed version on ours (or theirs, if they prefer). Posting the identical video on both splits views.
- Monetisation: YouTube's "reused content" rule. Keep a mix: partner videos plus our own content (storybooks, public-domain rhymes, "learn this sign" clips, own characters).

## Partners

Offer to creators: free PSL version, credit and link, new Deaf audience, accessibility reputation. Ask them to add our signed videos to their playlists, mention them, and share in parent groups. Offer to host the signed version on their channel if they prefer.

Candidates (2026-11-26):

| Channel / video | Status |
|---|---|
| Moon Kids Story, "Oopsie! A Little Boo-Boo" (youtube.com/watch?v=saI2I0bGWxw) | CC BY confirmed by Frank (screenshot, uploaded 16 Sep 2026). To do: compare song with CoComelon's boo-boo song; ask creator for the file. |
| Channel for children with disabilities (youtube.com/watch?v=5uVoyyNJKys) | Good fit, few subscribers, fast narration. Licence not checked. Contact about partnership. |

## How we measure

- Signer test: do Deaf children follow and enjoy it (Deaf teacher judges)?
- First 5–10 videos (e.g. 3 CC BY picture books + 2 public-domain rhymes): views, average watch time, which formats work.
- Feedback from Deaf schools and parents.

## First steps

1. Find 2–3 signer candidates; run the screen test.
2. Pick 3 CC BY books (StoryWeaver, Book Dash) and 2 public-domain rhymes (one Urdu, one English).
3. Message Moon Kids Story and the disability channel.
4. In parallel: push the prototype and run the 30-second tracking test.

## Open questions

- Is the kids channel the main direction, a side project, or part of the avatar app?
- Channel name and branding (Corea11y Instructor or separate?)
- Signer pay and agreement terms
- Own cartoon character: commission now or after the VRoid test?
