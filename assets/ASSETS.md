# Binary assets — receipt, not a substitute for the file

This repo's code and records push through the GitHub connector, which
only accepts UTF-8 text files. Binary files (images, video) cannot be
pushed through that connector — they must be uploaded by the repo
owner (Salvador) via the GitHub web UI, or from a local git checkout
on his Mac. This file records those binaries so a missing binary is
visible, not hidden, and so the record can be checked against the
uploaded file by SHA-256.

## Generated visual — Step 6

- File: `assets/generated-visual-fiji.webp`
- Label: GENERATED VISUAL — illustration only, not a map, not
  satellite imagery, not a SAM mask, not data.
- Model: muse-image-1.0, live run Oct 26, 2026, status 200.
- Dimensions: 1600x1600, size: 564K (local file, Oct 26).
- SHA-256: `b3281c30a576d1abad4ea1db39559f9192d4e3452691ff850ef5e24091a34a52`
- Record: `assets/generated-visual-fiji.json` (in this repo).
- Upload status: BINARY NOT YET IN REPO — owner to upload via
  GitHub web UI into `assets/`, then verify the SHA-256 below
  matches the uploaded file.

## Demo video — Step 8, not yet made

- The 3-minute demo video is submitted through the CV platform,
  not as a GitHub binary. GitHub blocks files over 100MB and
  warns over 50MB; a video binary in the repo would bloat it
  and is not the submission route.
- Repo holds for the video: the demo script, the video link
  once uploaded (YouTube / CV platform), a thumbnail image
  (uploaded the same way as the visual above), and this receipt
  file. The video file itself lives on the submission platform
  and as a local backup, not as a repo binary.
- Do not present a generated clip as a live run, and do not
  present pre-existing work as hackathon-built in the video.

## How to upload a binary (owner, 1 minute)

1. On github.com, open SalChicanoLoco/quetzal-aoi-briefing, `assets/`.
2. Add file → Upload files, drag the local binary in, commit.
3. Check the file appears at that path, then tell Morath — he
   will verify it reads back from main and update this file's
   upload status.
