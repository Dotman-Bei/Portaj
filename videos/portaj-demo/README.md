# Portaj product demo

A ~90 second product demo of [portaj.ambit.surf](https://portaj.ambit.surf), built with HyperFrames from a real recording of the live app on Stellar testnet.

- `renders/portaj-demo.mp4`: the finished film (1920x1080, 30fps, H.264 + AAC).
- `STORYBOARD.md`: the shot-by-shot plan (timestamp, picture, interaction, cursor, camera, transition, VO, SFX, music for every shot).

## How it is put together

| Layer | Source |
| --- | --- |
| Product footage | One continuous take of the real app (wallet → carry → exchange), recorded by `build/record.mjs`: headed Chrome in Xvfb, 1280x720 CSS at 2x, x11grab MJPEG with wall-clock timestamps, virtual passkey with PRF (same setup as `e2e/live.mjs`). Markers for every action are logged during the take. |
| Landing | A 2x screenshot of the live landing page, scrolled in `compositions/landing.html`; the fixed header is its own layer with the site's own 80% white + 12px blur. |
| Cursor | Drawn in-page during the take (headless X has no cursor); eased, slightly arced moves logged with the markers. |
| Voice | Google AI Studio TTS, voice **Charon** (`gemini-3.8-flash-tts`), the whole script in one request so it is one performance, split on pauses by `build/split_vo.py`. |
| Music | Lyria RealTime (`lyria-realtime-exp`), 92 BPM felt piano / pads / sub pulse, loudness-normalised, ducked under the voice by an automation lane. |
| SFX | Three synthesized sounds in `assets/sfx/` (click, key, a low thud on the network's rejection). |

## Editing

`index.html` and `compositions/*.html` are generated. Edit these instead, then run `python3 build/build.py`:

- `build/plan.json`: the edit: cut list (in take markers), VO anchors, camera keys (page coordinates, CSS px), SFX, music levels.
- `build/template.html`, `build/sub/*.html`: layout and the cards.

Then `npx hyperframes check` and `npx hyperframes render --quality high --output renders/portaj-demo.mp4`.

Re-recording the take: `xvfb-run -a -s "-screen 0 2560x1800x24" node build/record.mjs take` (needs `playwright-core` and a Chromium), then `build/ingest.sh take.avi take.marks.json`. Vercel's security checkpoint sometimes blocks a JS chunk or an API call from a headless machine; the recorder reloads and retries, and the edit cuts those seconds.
