/**
 * Tokens — design tokens, colour maths and theme resolution.
 *
 * Plain JavaScript. The .tsx extension is Framer's, not a TypeScript signal:
 * Framer creates every code file as .tsx and relative imports must carry that
 * extension. There is no type syntax anywhere in this project.
 *
 * Nothing in here imports React. It is pure data + functions, so it can be
 * unit-reasoned about on its own and reused by every component.
 */

/* --------------------------------- presets -------------------------------- */

// Only the six colours a theme really needs. Everything else is derived, so a
// custom theme can never end up half-styled.
export const PRESETS = {
    dark: {
        accent: "#7C5CFF",
        background: "#0B0D12",
        surface: "#14171F",
        text: "#F3F5F9",
        muted: "#98A1B2",
        border: "rgba(255, 255, 255, 0.08)",
    },
    light: {
        accent: "#5B3DF5",
        background: "#FFFFFF",
        surface: "#F6F7FB",
        text: "#101322",
        muted: "#5B6478",
        border: "rgba(16, 19, 34, 0.10)",
    },
}

export const PRESET_NAMES = ["dark", "light", "custom"]

export const FONT_STACK = `Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`

export const SHADOWS = {
    none: "none",
    soft: "0 1px 2px rgba(0,0,0,0.18), 0 8px 24px rgba(0,0,0,0.18)",
    strong: "0 2px 4px rgba(0,0,0,0.24), 0 18px 48px rgba(0,0,0,0.32)",
}

export const SHADOW_NAMES = ["none", "soft", "strong"]

// Positive semantic colour for the refundable badge. Kept out of the theme
// because it means "good news", not "brand".
export const POSITIVE = "#37B981"

/* -------------------------------- colour maths ----------------------------- */

/**
 * Framer hands a Color control over in whichever format the picker used:
 * "#7C5CFF" on the canvas, "rgb(124, 92, 255)" on the published site. Parsing
 * has to cope with both, and with rgba() and 3-digit hex.
 */
export function toRgb(color, depth) {
    const value = String(color == null ? "" : color).trim()

    // A Framer Color Style arrives as `var(--token-1a2b, rgb(124, 92, 255))`.
    // The fallback after the comma is the real colour, so read that. This
    // matters because using a shared Color Style is the recommended way to
    // keep the three components' accents in sync.
    const token = /^var\(\s*--[^,)]+,\s*([\s\S]+)\)$/.exec(value)
    if (token && (depth || 0) < 3) {
        return toRgb(token[1], (depth || 0) + 1)
    }

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

    // Covers "rgb(124, 92, 255)", "rgba(124,92,255,.5)" and "rgb(124 92 255 / 50%)".
    const rgb = /^rgba?\(([^)]+)\)$/i.exec(value)
    if (rgb) {
        const parts = rgb[1]
            .split(/[\s,/]+/)
            .filter(Boolean)
            .slice(0, 3)
            .map(Number)
        if (parts.length === 3 && parts.every(Number.isFinite)) return parts
    }

    // Framer's own docs disagree with its type definitions about which format a
    // Color control produces (hex, rgb() or hsla()), so all three are handled
    // rather than trusting one.
    const hsl = /^hsla?\(([^)]+)\)$/i.exec(value)
    if (hsl) {
        const parts = hsl[1].split(/[\s,/]+/).filter(Boolean)
        const h = parseFloat(parts[0])
        const s = parseFloat(parts[1]) / 100
        const l = parseFloat(parts[2]) / 100
        if ([h, s, l].every(Number.isFinite)) return hslToRgb(h, s, l)
    }

    return null
}

function hslToRgb(h, s, l) {
    const chroma = (1 - Math.abs(2 * l - 1)) * s
    const hue = (((h % 360) + 360) % 360) / 60
    const x = chroma * (1 - Math.abs((hue % 2) - 1))
    const [r, g, b] =
        hue < 1
            ? [chroma, x, 0]
            : hue < 2
              ? [x, chroma, 0]
              : hue < 3
                ? [0, chroma, x]
                : hue < 4
                  ? [0, x, chroma]
                  : hue < 5
                    ? [x, 0, chroma]
                    : [chroma, 0, x]
    const m = l - chroma / 2
    return [
        Math.round((r + m) * 255),
        Math.round((g + m) * 255),
        Math.round((b + m) * 255),
    ]
}

/**
 * Merges a property-control group over its defaults.
 *
 * Framer composes object defaults from each nested control's defaultValue, but
 * a group can still arrive undefined or half-filled (an older instance saved
 * before a control existed, a variant, an override). Merging here means the
 * components can read `layout.gap` plainly instead of guarding every access.
 */
export function withDefaults(defaults, value) {
    return value && typeof value === "object"
        ? { ...defaults, ...value }
        : { ...defaults }
}

/** Panel min/max are affordances, not guarantees — clamp again at the edge. */
export function clamp(value, min, max, fallback) {
    const number = Number(value)
    if (!Number.isFinite(number)) return fallback
    return Math.min(max, Math.max(min, number))
}

/**
 * A translucent version of a colour, for chip fills, hairlines and skeletons.
 *
 * Returning the input unchanged when parsing fails would be the dangerous
 * move: a chip would paint fully opaque in the same colour as its own label.
 * Unparseable colours fall back to neutral grey instead.
 */
export function tint(color, alpha) {
    const rgb = toRgb(color)
    if (!rgb) return `rgba(128, 128, 128, ${alpha})`
    return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`
}

/** Relative luminance, used to pick readable text on top of the accent. */
export function luminance(color) {
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

/** WCAG contrast ratio between two colours, 1 (identical) to 21 (black/white). */
export function contrastRatio(a, b) {
    const light = Math.max(luminance(a), luminance(b))
    const dark = Math.min(luminance(a), luminance(b))
    return (light + 0.05) / (dark + 0.05)
}

const INK = "#0B0D12"

/**
 * Black or white on the given background — whichever actually wins the
 * contrast ratio.
 *
 * A guessed luminance threshold gets this wrong for a whole band of ordinary
 * brand colours: on #00B4D8 or #FF8A00 a naive cutoff picks white at ~2.4:1
 * when black would have given ~8.5:1. Comparing the two ratios costs nothing
 * and is right by construction.
 */
export function contrastText(color) {
    return contrastRatio(color, INK) >= contrastRatio(color, "#FFFFFF")
        ? INK
        : "#FFFFFF"
}

/** Linear blend between two colours, amount 0 = a, 1 = b. */
export function mix(a, b, amount) {
    const from = toRgb(a)
    const to = toRgb(b)
    if (!from || !to) return a
    const at = (i) => Math.round(from[i] + (to[i] - from[i]) * amount)
    return `rgb(${at(0)}, ${at(1)}, ${at(2)})`
}

/**
 * Nudges a foreground colour towards a reference until it is legible on the
 * given background.
 *
 * Chips paint their label in the accent over a 12% tint of that same accent,
 * which looks good but can land under the 4.5:1 small-text minimum — the
 * shipped violet on the dark surface is only ~3.7:1. Rather than abandoning
 * the tinted look, the label is walked toward the body text colour just far
 * enough to clear the bar.
 */
export function readableOn(foreground, background, reference) {
    if (contrastRatio(foreground, background) >= 4.5) return foreground
    for (let step = 1; step <= 5; step++) {
        const candidate = mix(foreground, reference, step * 0.15)
        if (contrastRatio(candidate, background) >= 4.5) return candidate
    }
    return reference
}

/* ------------------------------ theme resolution --------------------------- */

/**
 * Turns the "Theme" property-control group into a complete theme object.
 *
 * A designer picks a preset and optionally overrides individual colours. Every
 * derived value (hover surface, strong border, skeleton shades) is computed
 * from the text colour, so light and dark both come out consistent and a
 * custom theme can't be left half-defined.
 */
export function resolveTheme(input) {
    const theme = input || {}
    const preset = PRESETS[theme.preset] || PRESETS.dark
    const isCustom = theme.preset === "custom"

    // Overrides only apply in custom mode, so switching back to a preset is a
    // clean reset rather than a half-remembered mix.
    const pick = (key) => (isCustom && theme[key] ? theme[key] : preset[key])

    const text = pick("text")
    const accent = theme.accent || preset.accent

    return {
        accent,
        onAccent: contrastText(accent),
        background: pick("background"),
        surface: pick("surface"),
        surfaceHover: tint(text, 0.05),
        text,
        muted: pick("muted"),
        border: pick("border"),
        borderStrong: tint(text, 0.18),
        skeletonBase: tint(text, 0.07),
        skeletonShine: tint(text, 0.14),
        font:
            theme.fontFamily && theme.fontFamily.trim()
                ? theme.fontFamily
                : FONT_STACK,
    }
}

/**
 * The default value for a Theme control group. Exported so all three
 * components start life identical rather than drifting apart in the panel.
 */
export const DEFAULT_THEME = {
    preset: "dark",
    accent: PRESETS.dark.accent,
    background: PRESETS.dark.background,
    surface: PRESETS.dark.surface,
    text: PRESETS.dark.text,
    muted: PRESETS.dark.muted,
    border: PRESETS.dark.border,
    fontFamily: "",
}

/* ---------------------------------- styles --------------------------------- */

/**
 * Keyframes, hover and focus rules can't be inline styles, so they live in one
 * <style> tag. Everything colour-related is read from CSS custom properties
 * that each component sets inline, which keeps the sheet identical no matter
 * how many differently-themed instances are on the page.
 */
export const GLOBAL_CSS = `
@keyframes sp-shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
}
.sp-skeleton {
    background-image: linear-gradient(90deg, var(--sp-skeleton-base) 25%, var(--sp-skeleton-shine) 37%, var(--sp-skeleton-base) 63%);
    background-size: 200% 100%;
    animation: sp-shimmer 1.4s ease-in-out infinite;
    border-radius: 6px;
}
.sp-card {
    /* The colour lives here, not in an inline style: a style-attribute
       declaration outranks any author rule, so an inline border-color would
       make the hover state below impossible to apply. */
    border-color: var(--sp-card-border, transparent);
    transition: transform 150ms ease, border-color 150ms ease, box-shadow 150ms ease;
}
.sp-card:hover {
    transform: translateY(var(--sp-lift, 0px));
    border-color: var(--sp-border-strong);
}
.sp-focusable:focus-visible {
    outline: 2px solid var(--sp-accent);
    outline-offset: 2px;
}
@media (prefers-reduced-motion: reduce) {
    .sp-skeleton { animation: none; }
    .sp-card { transition: none; }
    .sp-card:hover { transform: none; }
}
`

/** The CSS custom properties every themed root element needs. */
export function themeVars(theme, lift) {
    return {
        ["--sp-accent"]: theme.accent,
        ["--sp-border-strong"]: theme.borderStrong,
        ["--sp-skeleton-base"]: theme.skeletonBase,
        ["--sp-skeleton-shine"]: theme.skeletonShine,
        ["--sp-lift"]: `${lift || 0}px`,
    }
}
