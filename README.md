# Skillpath — Framer code component

Landing page for a fake learning platform, built in Framer. The courses section is a
React code component that pulls live data from the assignment API.

- **Live page:** https://skillpath-assignment.framer.website
- **Component source:** [`Skillpath.jsx`](./Skillpath.jsx)

## What's in the file

One code file, three exported components. Framer lists each export separately in the
Assets panel, so the page is three clean layers.

| Export    | What it does                                          |
| --------- | ----------------------------------------------------- |
| `Hero`    | Headline, subline, one button (anchors to `#courses`)  |
| `Courses` | The graded part: fetching, states, currency, grid      |
| `Footer`  | Three links and a copyright line                       |

## API

Base URL `https://syncsphere-hiv6.onrender.com`, two GET endpoints, no auth.

- `/assignment/course-data` — 5 to 10 courses, count varies per call
- `/assignment/country-code` — `{"country_code":"IN"|"US"}`, flips between the two

Roughly 1 in 3 requests returns a 404 or 500 by design.

## Decisions worth explaining

**Two independent requests, not a chain.** The grid is the point of the section, so a
dead country lookup can't be allowed to block it. Courses drive the state machine;
country only decides which currency to format in. If country fails we fall back to INR
and say so on screen — a quiet wrong currency would be worse than an admitted guess.

**One automatic retry, then stop.** A single attempt against a 1-in-3 failure rate means
a third of visitors see an error. Two attempts drops that to about 1 in 9. Retrying
forever would just hide a genuinely broken API, so after that the error state appears
with a retry button and the status code in small text.

**A bare `fetch(url, { signal })`.** No method, no headers. Adding a header makes the
request non-simple, and the browser then fires a CORS preflight `OPTIONS` before the
GET — which is what the "only GET works, everything else is 405" line in the brief is
pointing at.

**Prices are integers in minor units.** `199900` paise is ₹1,999 and `3999` cents is
$39.99; everything divides by 100 before `Intl.NumberFormat`. INR is formatted with
`en-IN` so grouping is Indian (₹1,99,900 not ₹199,900), and whole rupees drop the
`.00` while dollars always keep cents.

**Columns come from a `ResizeObserver`, not a media query.** Inside Framer's canvas the
component renders in a frame, so a viewport media query would report the browser window
and hand back the wrong column count. Measuring our own width is correct on the canvas
and on the published site: 3 columns ≥ 960px, 2 ≥ 640px, 1 below.

**`tint()` parses hex *and* `rgb()`.** Framer passes a colour prop as `#7C5CFF` on the
canvas but as `rgb(124, 92, 255)` on the published site. The first version only parsed
hex and returned anything else untouched, which painted category chips fully opaque in
the same colour as their own text — invisible labels on the live site only. It now
handles both and falls back to a neutral grey rather than ever returning the input
unchanged.

**The extra field on each card is `mainCategory`.** Of everything in the payload it is
the only thing a learner scans for. `courseCode`, `mangoId` and `shortCourse` are
internal identifiers.

**Two property controls, deliberately not more.** Section title and accent colour — the
two things a designer changes without asking anyone. The accent flows through the
category chip, buttons and focus rings.

## States

| State   | What shows                                                            |
| ------- | --------------------------------------------------------------------- |
| Loading | Six skeleton cards in the current column count                         |
| Error   | Plain-language message, retry button, status code in muted small text  |
| Empty   | Different copy for "catalogue is empty" vs "search matched nothing"    |
| Ready   | The grid                                                              |

## Extras

Search box, sort by price (sorted on the currency actually being displayed), skeleton
loaders, retry button, and a "Refundable" badge that only renders when `refundable`
is exactly `true`.

## Where to make common changes

- **Add a field to a card** — `CourseCard`, in the `<article>` body. Category chip and
  refundable badge are the first block; price is the last. Any payload field is on the
  `course` prop.
- **Add or change a property control** — each component has a `defaultProps` object and
  an `addPropertyControls(...)` call directly beneath it. Both need the same key.
- **Change the breakpoints** — `TABLET_MIN_WIDTH` / `DESKTOP_MIN_WIDTH` at the top.
- **Change retry behaviour** — `MAX_ATTEMPTS` / `RETRY_DELAY_MS` at the top.

## Running it in Framer

1. Assets panel → Code → new code file → paste `Skillpath.jsx`.
2. Drag `Hero`, `Courses`, `Footer` onto the page, each set to Fill width.
3. Property controls appear in the right panel when a layer is selected.
