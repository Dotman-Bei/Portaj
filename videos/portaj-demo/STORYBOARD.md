---
title: Portaj — product demo
format: 1920x1080, 30fps
duration: ~91s
voice: Google AI Studio, Charon (gemini-3.8-flash-tts), plain read, first person
music: Lyria RealTime bed, 92 BPM, felt piano + pads + soft sub pulse, under VO at about -24 LUFS
footage: one continuous real take of https://portaj.ambit.surf on Stellar testnet (headed Chrome, 1280x720 CSS @2x = 2560x1440, 30fps), virtual passkey with PRF as in e2e/live.mjs
---

# What we borrowed from the reference (and what we didn't)

| Technique in the reference | How it is used here |
| --- | --- |
| Opens on a still, typographic title card (logo, one-line promise, mono tagline, quiet wave), ~4s | Same structure in Portaj's own type (Hedvig Letters Serif + mono), warm paper ground, the real Portaj mark. No wave: Portaj's site has none. |
| The product fills the frame at 1:1, no device mockup, no browser chrome | Same. Footage is the real site at 1280x720 CSS, shown full-bleed. |
| First-person, plain-spoken voiceover that states facts, no hype | Same voice register ("I'll make a smart wallet…"). Script uses only claims the product shows on screen. |
| Shows a real failure to earn trust ("This plan didn't pass") | The network's own rejection of the "normal way" (`txMalformed`), shown verbatim, is the turning point. |
| Cursor moves slowly and only to what is about to be used | Eased, slightly arced cursor; it parks off text while the viewer reads. |
| Waits are cut, not shown | Every network wait is a jump cut or a speed-up; the viewer only sees causes and effects. |
| Constant, quiet music bed under the VO | Same; ducked under speech, swells only in the title and end card. |
| Ends on a calm card: "TRY IT" + URL | Same structure: mark, URL, "Testnet · no custody · fees paid by Portaj". |
| Burned-in subtitles on every line | **Not used.** The brief asks for minimal text; subtitles can be added as a separate cut for muted social autoplay. |
| No zoom at all | **Changed.** Subtle push-ins (max 1.32x) only where a detail must be read: the rejection, the receipt rows, the credited memo. |

# Shot list

Times are final-cut seconds. "Take @" is the moment in the raw take.

### S1 · Title card — 0.0 → 6.6
- **Shown:** warm paper ground (#f4f2ee). Portaj mark + "portaj" wordmark top-left. Headline in Hedvig Letters Serif: "The exit route for Stellar smart wallets." Mono line beneath: "PASSKEY · MEMO · NO XLM".
- **Interaction / cursor:** none.
- **Camera:** locked. Headline rises 16px and fades in over 0.9s (expo out); mono line follows 0.25s later.
- **Transition out:** 0.8s cross-dissolve into S2 while the headline drifts up 8px.
- **VO (v01, 0.9s):** "Getting USDC into a Stellar smart wallet takes one passkey. Getting it back out, to an exchange, is where it gets stuck."
- **SFX:** none.
- **Music:** bed fades in from 0 over 1.6s, sits at full bed level until VO starts, then ducks.

### S2 · Landing hero — 6.6 → 13.9
- **Shown:** portaj.ambit.surf hero, "THE EXIT ROUTE FOR STELLAR SMART WALLETS." The page glides down and the hero photo plates move (the site's own scroll-driven effect), then glides back.
- **Interaction:** trackpad-style scroll down and back up.
- **Cursor:** parked lower right, out of the type; at the end it travels to "Open app".
- **Camera:** starts at 1.06x and settles to 1.0x over 5s (slow pull-back that reveals the full page).
- **Transition in/out:** dissolve in; out is the real page navigation (click "Open app").
- **VO (v02, 8.4s):** "Portaj is the exit route. It carries that USDC to any exchange, memo included."
- **SFX:** soft click on "Open app".
- **Music:** ducked bed.

### S3 · Wallet — 13.9 → 23.6
- **Shown:** /app Wallet. "Create test wallet" → smart wallet C-address appears → "Get test USDC" → balance 25.0000000 USDC.
- **Interaction:** click Create test wallet (virtual passkey approves), click Get test USDC, click "Carry to an exchange".
- **Cursor:** straight, eased moves to each button; pauses 0.3s before each click.
- **Camera:** 1.0x → gentle push to 1.12x toward the balance card as 25 USDC lands, back to 1.0x before the carry click.
- **Transition:** jump cuts over the two network waits (wallet deploy, faucet).
- **VO (v03, 14.6s):** "On testnet, I'll make a smart wallet. One passkey, no seed phrase. Then twenty-five test USDC to work with."
- **SFX:** two soft clicks.
- **Music:** ducked bed.

### S4 · Carry form — 23.6 → 29.4
- **Shown:** /app/carry, "Carry to an exchange", With Portaj | The normal way.
- **Interaction:** click "No exchange on testnet? Use the exchange simulator's address and memo" → address, memo and the four checks fill in (Account exists, Can receive USDC, Memo required (SEP-29), Exchange simulator).
- **Cursor:** to the hint link, click, then rests.
- **Camera:** push to 1.18x on the left column (address + chips), held.
- **Transition:** hard cut in (page load).
- **VO (v04, 23.9s):** "The exchange gives me a deposit address and a memo. Here, that's the built-in exchange simulator."
- **SFX:** one click.
- **Music:** ducked bed.

### S5 · The normal way, refused — 29.4 → 39.0
- **Shown:** right column. "Try the normal way" → the red-bordered panel with the network's answers, verbatim: "Transaction contains a memo. Soroban transactions do not support memos." / "ERROR · txMalformed (-16)".
- **Interaction:** click Try the normal way.
- **Cursor:** glides right across the divider, clicks, then drifts to the panel's corner so it never covers the text.
- **Camera:** reframe from left column to right column (0.9s, power2.inOut), then a slow push to 1.32x on the rejection text while it is read.
- **Transition:** none (continuous take).
- **VO (v05, 29.9s):** "First, the normal way: straight from the smart wallet. The network refuses it. A smart-wallet transfer is a contract call, and contract calls can't carry a memo."
- **SFX:** click; a low, muted "thud" (-30 dB) as the rejection appears. The only non-UI sound in the film.
- **Music:** ducked bed.

### S6 · Drop the memo — 39.0 → 44.6
- **Shown:** "Send without the memo" → "It landed on chain" link appears.
- **Interaction:** click Send without the memo.
- **Camera:** ease back to 1.15x so the whole panel is visible.
- **Transition:** jump cut over the confirmation wait.
- **VO (v06, 39.4s):** "Drop the memo, and it lands. But the exchange can't tell it's mine."
- **SFX:** click.
- **Music:** ducked bed.

### S7 · With Portaj — 44.6 → 58.0
- **Shown:** left column. Amount field gets "20" typed; "Continue with passkey"; the transit account appears (G-address, Not set up yet, XLM 0, reserves "Paid by Portaj when set up"); "Set up (paid by Portaj)" → Ready, base reserve "Sponsored by Portaj".
- **Interaction:** click Amount, type 2-0, click Continue with passkey, scroll the transit account into view, click Set up (paid by Portaj).
- **Cursor:** back across to the left; typing caret visible.
- **Camera:** reframe to the left column at 1.12x; follow the scroll; slow push to 1.22x on the transit-account table while reserves are mentioned.
- **Transition:** jump cut over the setup transaction wait.
- **VO (v07, 44.9s):** "Now with Portaj. Same address, same memo. My passkey derives a transit account that only I control. Portaj sponsors its reserves and pays the fees, so I never need XLM."
- **SFX:** two key taps, two clicks.
- **Music:** ducked bed.

### S8 · Send — 58.0 → 64.0
- **Shown:** steps list (Set up → Smart wallet → transit account → Transit account → exchange, id …) ticking to Confirmed; "Send 20.0000000 USDC".
- **Interaction:** click Send.
- **Camera:** 1.15x on the steps list.
- **Transition:** the ~15s of ledger time is played at 4x with a 0.25s cut at each end, so the steps visibly tick over without dead air.
- **VO (v08, 58.4s):** "I confirm with my passkey, and the USDC goes out as a classic payment, memo attached."
- **SFX:** click.
- **Music:** ducked bed.

### S9 · Receipt — 64.0 → 73.0
- **Shown:** "Sent." receipt: three transaction rows with explorer hashes, exchange address, transit account, and "USDC left in the transit account: 0.0000000".
- **Interaction:** page scrolls to the receipt; cursor rests.
- **Camera:** 1.0x on "Sent." then push to 1.25x across the three rows, tilt down to the zero-balance line.
- **Transition:** jump cut in.
- **VO (v09, 64.4s):** "Every carry ends on a receipt. Three transactions, each one on the explorer. And the transit account is back to zero."
- **SFX:** none.
- **Music:** ducked bed.

### S10 · Exchange credited — 73.0 → 81.6
- **Shown:** /app/exchange. Credited balances, by memo: the new memo row tagged "yours", +20.0000000. Then "Landed on chain, not credited": the 1 USDC contract transfer from this wallet.
- **Interaction:** click "See it credited"; page scrolls to the uncredited list.
- **Camera:** push to 1.25x on the "yours" row, follow the scroll, settle on the uncredited row.
- **Transition:** real navigation.
- **VO (v10, 73.4s):** "On the exchange: twenty USDC, credited to my memo. The transfer without one landed, and was never credited."
- **SFX:** click.
- **Music:** ducked bed; starts to lift at 80.5s.

### S11 · End card — 81.6 → 91.0
- **Shown:** paper ground. Portaj mark + wordmark. Mono kicker "TRY IT ON TESTNET". URL "portaj.ambit.surf" in Hedvig Letters Serif. Small line: "No custody · No XLM · Fees paid by Portaj".
- **Interaction / cursor:** none.
- **Camera:** locked; elements fade/rise in with 0.12s stagger.
- **Transition in:** 0.8s dissolve from the exchange page.
- **VO (v11, 82.2s):** "Portaj. Out of the smart wallet, and onto the exchange. Try it on testnet."
- **SFX:** none.
- **Music:** lifts to full bed after the VO, fades out over the last 2.5s.
