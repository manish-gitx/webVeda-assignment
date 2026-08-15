# Note (draft — edit this so it's true for you)

> Target: 200 words max. Current draft: ~185.

**What I'm not happy with.** I shipped a bug and only caught it on the published site.
Framer passes a colour prop as `#7C5CFF` on the canvas but `rgb(124, 92, 255)` once
published, and my tint helper only parsed hex — so category chips rendered opaque in the
same colour as their own text. Invisible labels, live only. The canvas is not the
deployment target.

**What I'd fix with two more days.** The retry is a flat 400ms, twice; real backoff with
jitter would be better, and I'd cache the country code in `sessionStorage` so a reload
doesn't re-roll the dice on a value that rarely changes. Search and sort live in
component state, so they reset on reload, and there's no debounce — fine at 10 courses,
wrong at 1000. No tests; I checked the four states by hand.

**Where I got stuck.** The "everything else is 405" line. I read it as a hint about CORS
preflight, so the fetch sends no headers at all — anything extra makes the browser send
an OPTIONS first.

**AI.** Claude wrote the first pass of the fetch and retry helper; I rewrote the error
handling, currency formatting and empty states.
