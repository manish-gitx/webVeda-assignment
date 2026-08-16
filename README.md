# Skillpath — modular Framer code components

Landing page for a fake learning platform, built in Framer. The courses section is a
React component that pulls live data from the assignment API; the whole page is
customizable from the Framer properties panel without touching code.

- **Live page:** https://skillpath-assignment.framer.website
- **Branches:** `main` is the original single-file submission. `feat/customizable`
  (this one) is the modular rebuild.

## A note on the file extension

**This is plain JavaScript.** There is not a single type annotation in the project.

Framer creates every code file as `.tsx`, and relative imports between code files must
carry the file extension — Framer's own error message is explicit: *"Relative imports
require one of these extensions: tsx, ts, jsx, js."* So the files are named `.tsx` to
match what Framer produces and the imports say `./Tokens.tsx`. The contents are
JavaScript + JSX.

## Modules

Six files, each with one job. The rule is that logic never lives in the component file.

| File | Responsibility | Depends on |
| --- | --- | --- |
| `Tokens.tsx` | Design tokens, colour parsing, theme resolution, global CSS | — |
| `Api.tsx` | Network only: bare GET, bounded retry, abort-aware | — |
| `Format.tsx` | Currency, field selection, filter/sort — pure functions | — |
| `Hooks.tsx` | `useCourses` (data), `useColumns` (responsive measurement) | `Api` |
| `Ui.tsx` | Presentational pieces: theme in, markup out | `Tokens`, `Format` |
| `Skillpath.tsx` | `Hero`, `Courses`, `Footer` + property controls | all of the above |

The dependency graph is acyclic and one-directional: tokens and pure functions at the
bottom, hooks in the middle, markup at the top. `Api.tsx` and `Format.tsx` import
nothing at all, so they can be reasoned about — or reused — on their own.

## What a designer and an admin can change

Controls are grouped with `ControlType.Object`, which Framer renders as a panel row
with a **…** button that opens the group. Seven groups on Courses:

| Group | Controls |
| --- | --- |
| **Content** | Title, subtitle, search placeholder, price note |
| **Theme** | Preset (Dark / Light / Custom), accent, and — only when Custom — background, surface, text, muted, border; plus font |
| **Layout** | Max width, padding X/Y, gap, columns per breakpoint, breakpoint thresholds |
| **Card** | Radius, padding, border, shadow, hover lift, description lines, which extra payload field to show, refundable badge |
| **Data** | Max cards, default sort, currency mode (Auto / Rupees / Dollars), search and sort toggles, skeleton count |
| **Messages** | All ten user-facing strings, including every error and empty state |
| **Advanced** | API base URL, retry attempts, retry delay |

Hero and Footer each get **Content**, **Theme** and **Layout** in the same shape.

The custom colour controls are hidden unless the preset is Custom, using `hidden`.
The predicate is written to fail *open* — an unexpected argument shape leaves the
control visible rather than hiding it, because a missing control is harder to diagnose
than a redundant one.

## Decisions worth explaining

**Two independent requests, not a chain.** The grid is the point of the section, so a
dead country lookup must not block it. Courses drive the state machine; country only
decides which currency to format in. If country fails we fall back to INR and say so on
screen — a quiet wrong currency would be worse than an admitted guess.

**One automatic retry, then stop.** A single attempt against a 1-in-3 failure rate means
a third of visitors see an error; two attempts drops that to about 1 in 9. Retrying
forever would hide a genuinely broken API, so after that the error state appears with a
retry button and the status code in small text. Both numbers are now panel-editable.

**A bare `fetch(url, { signal })`.** No method, no headers. Adding a header makes the
request non-simple and the browser fires a CORS preflight `OPTIONS` first — which is
what the brief's "everything else returns a 405" line is pointing at.

**Prices are integers in minor units.** `199900` paise is ₹1,999 and `3999` cents is
$39.99; everything divides by 100 before `Intl.NumberFormat`. INR uses `en-IN` for lakh
grouping, and whole rupees drop the `.00` while dollars keep cents.

**Columns come from a `ResizeObserver`, not a media query.** Inside Framer the component
renders in a frame on the canvas, so a viewport media query reports the browser window
and returns the wrong count. Measuring our own width is correct on the canvas and on the
published site — and it lets the breakpoints themselves be properties.

**`tint()` parses hex, `rgb()` and `hsl()`.** Framer passes a colour as `#7C5CFF` on the
canvas but `rgb(124, 92, 255)` once published, and its docs and type definitions
disagree about which. An earlier version parsed hex only and returned anything else
untouched, which painted category chips fully opaque in the same colour as their own
text — invisible labels, on the live site only. Unparseable colours now fall back to
neutral grey rather than ever returning the input unchanged.

**Per-instance theming via CSS custom properties.** Hover, focus and shimmer need real
CSS rules, but three differently-themed components on one page would otherwise fight
over the same global class selectors — last one in the document wins. The stylesheet is
now colour-free and reads `--sp-accent`, `--sp-border-strong` and the skeleton shades,
which each component sets inline on its own root.

**Defaults are merged, not assumed.** Framer ignores `defaultProps` and composes object
defaults from each control's `defaultValue`, but an instance saved before a control
existed can still arrive half-filled. Every group is merged over its defaults with
`withDefaults` before it is read, and numbers are clamped again in the component because
panel `min`/`max` are affordances, not guarantees.

## States

| State | What shows |
| --- | --- |
| Loading | Skeleton cards in the current column count |
| Error | Plain-language message, retry button, status code in muted small text |
| Empty | Different copy for "catalogue is empty" vs "search matched nothing" |
| Ready | The grid |

## Where to make common changes

- **Add a field to a card** — `CourseCard` in `Ui.tsx`. Any payload field is on the
  `course` prop. To make it switchable from the panel instead, add an entry to
  `EXTRA_FIELDS` in `Format.tsx` and it appears in the Card → Extra field menu.
- **Add or change a property control** — the `addPropertyControls` call at the bottom of
  each component in `Skillpath.tsx`, plus the matching key in that component's
  `*_DEFAULTS` object.
- **Change the palette** — `PRESETS` in `Tokens.tsx`.
- **Change retry behaviour** — the Advanced group, or the constants in `Api.tsx`.

## Verified on the live site

Prices checked against the raw API (all matched), four states exercised, responsive
measured in fixed-width frames at 400 / 800 / 1300 px giving 1 / 2 / 3 columns, exactly
two API requests per load with no preflight, and a clean console.
