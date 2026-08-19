/**
 * Theme — design tokens, colour maths and the one stylesheet.
 *
 * Plain JavaScript. The .tsx extension is Framer's, not a TypeScript signal:
 * Framer creates every code file as .tsx and relative imports must carry the
 * extension. There is no type syntax anywhere in this project.
 *
 * Nothing in here imports React, so it is pure data and functions that every
 * component can share.
 */

/**
 * One accent for the whole page. All three components default to it, so a
 * fresh instance can't disagree with its neighbours about the brand colour.
 */
export const ACCENT = "#99FF00"

export const theme = {
    background: "#0B0D12",
    surface: "#14171F",
    surfaceHover: "#181C25",
    border: "rgba(255, 255, 255, 0.08)",
    borderStrong: "rgba(255, 255, 255, 0.16)",
    text: "#F3F5F9",
    muted: "#98A1B2",
    ink: "#0B0D12",
    positive: "#5FD8A4",
    font: `Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`,
}

/* --------------------------------- colour ---------------------------------- */

/**
 * Framer hands a Color control over in whichever format the picker used:
 * "#7C5CFF" on the canvas but "rgb(153, 255, 0)" once the site is published,
 * and a shared Color Style arrives as "var(--token-1a2b, rgb(153, 255, 0))".
 * All three have to parse or the tints below come out wrong.
 */
function toRgb(color, depth = 0) {
    const value = String(color ?? "").trim()

    // The real colour is the fallback after the comma.
    const token = /^var\(\s*--[^,)]+,\s*([\s\S]+)\)$/.exec(value)
    if (token && depth < 3) return toRgb(token[1], depth + 1)

    const hex = /^#?([\da-f]{3}|[\da-f]{6})$/i.exec(value)
    if (hex) {
        let digits = hex[1]
        if (digits.length === 3) {
            digits = digits
                .split("")
                .map((d) => d + d)
                .join("")
        }
        const number = parseInt(digits, 16)
        return [(number >> 16) & 255, (number >> 8) & 255, number & 255]
    }

    // Covers "rgb(153, 255, 0)" and the modern "rgb(153 255 0 / 50%)".
    const rgb = /^rgba?\(([^)]+)\)$/i.exec(value)
    if (rgb) {
        const parts = rgb[1]
            .split(/[\s,/]+/)
            .filter(Boolean)
            .slice(0, 3)
            .map(Number)
        if (parts.length === 3 && parts.every(Number.isFinite)) return parts
    }

    return null
}

/**
 * A translucent version of a colour, for chip fills and hairlines.
 *
 * Anything we can't read falls back to neutral grey. Returning the colour
 * unchanged — which an earlier version did — paints a chip fully opaque in
 * the same colour as its own label, and the labels disappear. That bug was
 * only visible on the published site, because that is the only place the
 * colour arrives as rgb().
 */
export function tint(color, alpha) {
    const rgb = toRgb(color)
    if (!rgb) return `rgba(255, 255, 255, ${alpha})`
    return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`
}

/** Relative luminance, per WCAG. */
function luminance(color) {
    const rgb = toRgb(color)
    if (!rgb) return 0
    const channel = (value) => {
        const c = value / 255
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
    }
    return (
        0.2126 * channel(rgb[0]) +
        0.7152 * channel(rgb[1]) +
        0.0722 * channel(rgb[2])
    )
}

/** Contrast ratio between two colours, 1 (identical) to 21 (black on white). */
export function contrastRatio(a, b) {
    const light = Math.max(luminance(a), luminance(b))
    const dark = Math.min(luminance(a), luminance(b))
    return (light + 0.05) / (dark + 0.05)
}

/**
 * Ink or white on top of the accent, whichever actually wins the contrast
 * ratio. A guessed luminance cutoff gets this wrong for a whole band of
 * ordinary brand colours — on #00B4D8 it picks white at ~2.4:1 when black
 * would have given ~8.5:1. Comparing the two costs nothing.
 */
export function contrastText(color) {
    return contrastRatio(color, theme.ink) >= contrastRatio(color, "#FFFFFF")
        ? theme.ink
        : "#FFFFFF"
}

/* ------------------------------- accessibility ------------------------------ */

/** Off-screen but still spoken; `display: none` would silence it. */
export const visuallyHidden = {
    position: "absolute",
    width: 1,
    height: 1,
    margin: -1,
    padding: 0,
    overflow: "hidden",
    clip: "rect(0 0 0 0)",
    whiteSpace: "nowrap",
    border: 0,
}

/* ---------------------------------- styles --------------------------------- */

/**
 * Keyframes, hover and focus rings can't be inline styles, so they go in one
 * tag. All three components emit this block and the class names are global,
 * so nothing in here may depend on a prop: the accent is read per-instance
 * from the --sp-accent custom property that each root element sets.
 */
export const GLOBAL_CSS = `
@keyframes sp-shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
}
.sp-skeleton {
    background-image: linear-gradient(90deg, ${theme.surfaceHover} 25%, rgba(255,255,255,0.07) 37%, ${theme.surfaceHover} 63%);
    background-size: 200% 100%;
    animation: sp-shimmer 1.4s ease-in-out infinite;
    border-radius: 6px;
}
.sp-card {
    /* The colour lives here, not in an inline style: a style-attribute
       declaration outranks any author rule, so an inline border-color would
       make the hover state below impossible to apply. */
    border-color: var(--sp-card-border, transparent);
    transition: transform 150ms ease, border-color 150ms ease;
}
.sp-card:hover {
    transform: translateY(-2px);
    border-color: ${theme.borderStrong};
}
.sp-focusable:focus-visible {
    outline: 2px solid var(--sp-accent, ${ACCENT});
    outline-offset: 2px;
}
@media (prefers-reduced-motion: reduce) {
    .sp-skeleton { animation: none; }
    .sp-card { transition: none; }
    .sp-card:hover { transform: none; }
}
`
