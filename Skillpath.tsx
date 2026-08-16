/**
 * Skillpath — the three components that make up the page.
 *
 * This file is deliberately thin: it reads the property controls, resolves a
 * theme, calls the hooks and hands everything to the presentational pieces in
 * Ui.tsx. Fetching lives in Api.tsx, formatting in Format.tsx, tokens in
 * Tokens.tsx. If you are looking for logic, it is not in here.
 *
 * Plain JavaScript + JSX. The .tsx extension is Framer's requirement for code
 * files (relative imports must carry it) — there is no type syntax anywhere.
 */

import { addPropertyControls, ControlType } from "framer"
import { useMemo, useRef, useState } from "react"

import { DEFAULT_BASE_URL } from "./Api.tsx"
import {
    CURRENCY_MODES,
    EXTRA_FIELD_KEYS,
    EXTRA_FIELD_TITLES,
    resolveCountry,
    selectCourses,
} from "./Format.tsx"
import { useColumns, useCourses } from "./Hooks.tsx"
import {
    PRESETS,
    PRESET_NAMES,
    SHADOW_NAMES,
    clamp,
    resolveTheme,
    themeVars,
    tint,
    withDefaults,
} from "./Tokens.tsx"
import {
    CourseGrid,
    EmptyState,
    ErrorState,
    SkeletonGrid,
    StyleSheet,
    Toolbar,
} from "./Ui.tsx"

/** Visually hidden, still announced. */
const SR_ONLY = {
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

/* ---------------------------- shared control parts -------------------------- */

// Custom colours only make sense when the preset is "custom". Written so that
// an unexpected argument shape leaves the control VISIBLE rather than hiding
// it — failing open is the safe direction for a control panel.
const usingPreset = (props) =>
    Boolean(props) && (props.preset === "dark" || props.preset === "light")

function themeControls() {
    return {
        type: ControlType.Object,
        title: "Theme",
        controls: {
            preset: {
                type: ControlType.Enum,
                title: "Preset",
                options: PRESET_NAMES,
                optionTitles: ["Dark", "Light", "Custom"],
                defaultValue: "dark",
                displaySegmentedControl: true,
            },
            accent: {
                type: ControlType.Color,
                title: "Accent",
                defaultValue: PRESETS.dark.accent,
            },
            background: {
                type: ControlType.Color,
                title: "Background",
                defaultValue: PRESETS.dark.background,
                hidden: usingPreset,
            },
            surface: {
                type: ControlType.Color,
                title: "Surface",
                defaultValue: PRESETS.dark.surface,
                hidden: usingPreset,
            },
            text: {
                type: ControlType.Color,
                title: "Text",
                defaultValue: PRESETS.dark.text,
                hidden: usingPreset,
            },
            muted: {
                type: ControlType.Color,
                title: "Muted",
                defaultValue: PRESETS.dark.muted,
                hidden: usingPreset,
            },
            border: {
                type: ControlType.Color,
                title: "Border",
                defaultValue: PRESETS.dark.border,
                hidden: usingPreset,
            },
            fontFamily: {
                type: ControlType.String,
                title: "Font",
                defaultValue: "",
                placeholder: "Inter, system-ui…",
            },
        },
    }
}

const DEFAULT_THEME_PROPS = {
    preset: "dark",
    accent: PRESETS.dark.accent,
    background: PRESETS.dark.background,
    surface: PRESETS.dark.surface,
    text: PRESETS.dark.text,
    muted: PRESETS.dark.muted,
    border: PRESETS.dark.border,
    fontFamily: "",
}

/* ----------------------------------- Hero ---------------------------------- */

/**
 * @framerSupportsResize true
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 520
 * @framerDisableUnlink
 */
export function Hero(props) {
    // Every group is merged over its defaults rather than read raw: Framer
    // composes object defaults from the nested controls, but an instance saved
    // before a control existed can still arrive half-filled.
    const content = withDefaults(HERO_DEFAULTS.content, props.content)
    const layout = withDefaults(HERO_DEFAULTS.layout, props.layout)
    const style = props.style
    const theme = resolveTheme(withDefaults(DEFAULT_THEME_PROPS, props.theme))

    const glowAlpha = (Math.max(0, Math.min(100, Number(layout.glow) || 0)) / 100) * 0.35
    const isCentred = layout.align !== "left"

    const button = (label, link, primary) =>
        label ? (
            <a
                href={link || "#"}
                className="sp-focusable"
                style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "14px 26px",
                    borderRadius: 12,
                    background: primary ? theme.accent : "transparent",
                    border: primary ? "1px solid transparent" : `1px solid ${theme.borderStrong}`,
                    color: primary ? theme.onAccent : theme.text,
                    fontSize: 15,
                    fontWeight: 600,
                    textDecoration: "none",
                }}
            >
                {label}
            </a>
        ) : null

    return (
        <section
            style={{
                ...style,
                ...themeVars(theme, 0),
                display: "flex",
                flexDirection: "column",
                alignItems: isCentred ? "center" : "flex-start",
                justifyContent: "center",
                gap: 20,
                padding: `${layout.paddingY}px ${layout.paddingX}px`,
                background: theme.background,
                backgroundImage: `radial-gradient(60% 80% at ${
                    isCentred ? "50%" : "20%"
                } 0%, ${tint(theme.accent, glowAlpha)} 0%, rgba(0,0,0,0) 70%)`,
                fontFamily: theme.font,
                textAlign: isCentred ? "center" : "left",
                boxSizing: "border-box",
            }}
        >
            <div
                style={{
                    width: "100%",
                    maxWidth: layout.maxWidth,
                    margin: "0 auto",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: isCentred ? "center" : "flex-start",
                    gap: 20,
                }}
            >
                {content.showBadge && content.badge ? (
                    <span
                        style={{
                            fontSize: 13,
                            fontWeight: 500,
                            letterSpacing: 0.4,
                            color: theme.accent,
                            border: `1px solid ${tint(theme.accent, 0.35)}`,
                            background: tint(theme.accent, 0.1),
                            borderRadius: 999,
                            padding: "6px 14px",
                        }}
                    >
                        {content.badge}
                    </span>
                ) : null}

                <h1
                    style={{
                        margin: 0,
                        maxWidth: 760,
                        fontSize: "clamp(36px, 5.2vw, 62px)",
                        lineHeight: 1.08,
                        letterSpacing: -1.2,
                        fontWeight: 600,
                        color: theme.text,
                    }}
                >
                    {content.headline}
                </h1>

                <p
                    style={{
                        margin: 0,
                        maxWidth: 560,
                        fontSize: 17,
                        lineHeight: 1.6,
                        color: theme.muted,
                    }}
                >
                    {content.subline}
                </p>

                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 12 }}>
                    {button(content.primaryLabel, content.primaryLink, true)}
                    {button(content.secondaryLabel, content.secondaryLink, false)}
                </div>
            </div>

            <StyleSheet />
        </section>
    )
}

const HERO_DEFAULTS = {
    content: {
        badge: "Skillpath",
        showBadge: true,
        headline: "Learn the skills the internet actually pays for",
        subline: "Short, practical courses from creators who have already done it. Start today, ship something this week.",
        primaryLabel: "Browse courses",
        primaryLink: "#courses",
        secondaryLabel: "",
        secondaryLink: "",
    },
    theme: DEFAULT_THEME_PROPS,
    layout: { align: "center", maxWidth: 1160, paddingY: 112, paddingX: 24, glow: 63 },
}

// Kept for use outside Framer (Storybook, tests, a plain React host). Framer
// itself ignores defaultProps and reads defaultValue off the controls below.
Hero.defaultProps = HERO_DEFAULTS

addPropertyControls(Hero, {
    content: {
        type: ControlType.Object,
        title: "Content",
        controls: {
            badge: { type: ControlType.String, title: "Badge", defaultValue: "Skillpath" },
            showBadge: {
                type: ControlType.Boolean,
                title: "Show badge",
                defaultValue: true,
            },
            headline: {
                type: ControlType.String,
                title: "Headline",
                displayTextArea: true,
                defaultValue: "Learn the skills the internet actually pays for",
            },
            subline: {
                type: ControlType.String,
                title: "Subline",
                displayTextArea: true,
                defaultValue:
                    "Short, practical courses from creators who have already done it. Start today, ship something this week.",
            },
            primaryLabel: {
                type: ControlType.String,
                title: "Button",
                defaultValue: "Browse courses",
            },
            primaryLink: {
                type: ControlType.String,
                title: "Link",
                defaultValue: "#courses",
            },
            secondaryLabel: {
                type: ControlType.String,
                title: "2nd button",
                defaultValue: "",
                placeholder: "Optional",
            },
            secondaryLink: {
                type: ControlType.String,
                title: "2nd link",
                defaultValue: "",
                placeholder: "Optional",
            },
        },
    },
    theme: themeControls(),
    layout: {
        type: ControlType.Object,
        title: "Layout",
        controls: {
            align: {
                type: ControlType.Enum,
                title: "Align",
                options: ["center", "left"],
                optionTitles: ["Center", "Left"],
                defaultValue: "center",
                displaySegmentedControl: true,
            },
            maxWidth: {
                type: ControlType.Number,
                title: "Max width",
                min: 480,
                max: 1600,
                step: 20,
                unit: "px",
                defaultValue: 1160,
            },
            paddingY: {
                type: ControlType.Number,
                title: "Padding Y",
                min: 0,
                max: 240,
                step: 4,
                unit: "px",
                defaultValue: 112,
            },
            paddingX: {
                type: ControlType.Number,
                title: "Padding X",
                min: 0,
                max: 120,
                step: 4,
                unit: "px",
                defaultValue: 24,
            },
            glow: {
                type: ControlType.Number,
                title: "Glow",
                min: 0,
                max: 100,
                step: 1,
                unit: "%",
                defaultValue: 63,
            },
        },
    },
})

/* --------------------------------- Courses --------------------------------- */

/**
 * @framerSupportsResize true
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 900
 * @framerDisableUnlink
 */
export function Courses(props) {
    const content = withDefaults(COURSES_DEFAULTS.content, props.content)
    const layout = withDefaults(COURSES_DEFAULTS.layout, props.layout)
    const data = withDefaults(COURSES_DEFAULTS.data, props.data)
    const messages = withDefaults(COURSES_DEFAULTS.messages, props.messages)
    const advanced = withDefaults(COURSES_DEFAULTS.advanced, props.advanced)
    const style = props.style
    const theme = resolveTheme(withDefaults(DEFAULT_THEME_PROPS, props.theme))

    // Panel min/max are only affordances, so anything that could reach a
    // renderer as a length or a loop count is clamped here as well.
    const cardBase = withDefaults(COURSES_DEFAULTS.card, props.card)
    const card = {
        ...cardBase,
        descriptionLines: clamp(cardBase.descriptionLines, 1, 12, 2),
        radius: clamp(cardBase.radius, 0, 64, 16),
        padding: clamp(cardBase.padding, 0, 80, 22),
    }
    const skeletonCount = clamp(data.skeletonCount, 1, 24, 6)

    const gridRef = useRef(null)
    const columns = useColumns(gridRef, {
        mobile: layout.columnsMobile,
        tablet: layout.columnsTablet,
        desktop: layout.columnsDesktop,
        tabletMin: layout.tabletMin,
        desktopMin: layout.desktopMin,
    })

    const { status, courses, errorMessage, country, countryFailed, countryReady, reload } =
        useCourses({
        baseUrl: advanced.baseUrl,
        attempts: advanced.retryAttempts,
        delayMs: advanced.retryDelayMs,
    })

    const [query, setQuery] = useState("")

    // The panel sets the starting order; the visitor's dropdown overrides it.
    // Seeding useState with the prop would freeze the value at mount, so
    // changing Sort in Framer would silently do nothing on the canvas.
    const [sortOverride, setSortOverride] = useState(null)
    const sort = sortOverride || data.defaultSort

    // The forced modes let a designer lay the page out in either currency
    // without waiting for the endpoint to flip.
    const activeCountry = resolveCountry(data.currency, country)
    const forcedCurrency = data.currency !== "auto"
    // A forced currency needs no lookup, so the price is known immediately.
    const priceReady = forcedCurrency || countryReady

    const visible = useMemo(
        () =>
            selectCourses(courses, {
                query,
                sort,
                country: activeCountry,
                limit: data.limit,
            }),
        [courses, query, sort, activeCountry, data.limit]
    )

    const isFiltered = query.trim().length > 0

    return (
        <section
            id="courses"
            style={{
                ...style,
                ...themeVars(theme, -Math.abs(Number(card.hoverLift) || 0)),
                padding: `${layout.paddingY}px ${layout.paddingX}px`,
                background: theme.background,
                fontFamily: theme.font,
                color: theme.text,
                boxSizing: "border-box",
            }}
        >
            <div style={{ maxWidth: layout.maxWidth, margin: "0 auto" }}>
                <header
                    style={{
                        display: "flex",
                        flexWrap: "wrap",
                        alignItems: "flex-end",
                        justifyContent: "space-between",
                        gap: 16,
                        marginBottom: 28,
                    }}
                >
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <h2
                            style={{
                                margin: 0,
                                fontSize: "clamp(26px, 3vw, 36px)",
                                letterSpacing: -0.8,
                                fontWeight: 600,
                            }}
                        >
                            {content.title}
                        </h2>
                        {content.subtitle ? (
                            <p style={{ margin: 0, fontSize: 15, color: theme.muted }}>
                                {content.subtitle}
                            </p>
                        ) : null}
                    </div>

                    <Toolbar
                        theme={theme}
                        query={query}
                        onQuery={setQuery}
                        sort={sort}
                        onSort={setSortOverride}
                        showSearch={data.showSearch}
                        showSort={data.showSort}
                        disabled={status !== "ready"}
                        searchPlaceholder={content.searchPlaceholder}
                    />
                </header>

                {/* One honest line when the page was priced on a guess. */}
                {status === "ready" && countryFailed && !forcedCurrency ? (
                    <p
                        role="status"
                        style={{ margin: "0 0 20px", fontSize: 13, color: theme.muted }}
                    >
                        {messages.regionFallback}
                    </p>
                ) : null}

                {/* A polite live region wrapped around the grid would make a
                    screen reader read every card in full on every change. It
                    announces a one-line summary instead, and the grid itself
                    is left as ordinary content. */}
                <p style={SR_ONLY} role="status">
                    {status === "loading"
                        ? "Loading courses"
                        : status === "error"
                          ? messages.errorTitle
                          : `${visible.length} ${visible.length === 1 ? "course" : "courses"}`}
                </p>

                <div ref={gridRef}>
                    {status === "loading" ? (
                        <SkeletonGrid
                            columns={columns}
                            count={skeletonCount}
                            gap={layout.gap}
                            theme={theme}
                            card={card}
                        />
                    ) : null}

                    {status === "error" ? (
                        <ErrorState
                            theme={theme}
                            detail={errorMessage}
                            onRetry={reload}
                            copy={messages}
                        />
                    ) : null}

                    {status === "ready" && visible.length === 0 ? (
                        <EmptyState
                            theme={theme}
                            isFiltered={isFiltered}
                            query={query}
                            onClear={() => setQuery("")}
                            onRetry={reload}
                            copy={messages}
                        />
                    ) : null}

                    {status === "ready" && visible.length > 0 ? (
                        <CourseGrid
                            courses={visible}
                            columns={columns}
                            gap={layout.gap}
                            country={activeCountry}
                            theme={theme}
                            card={card}
                            priceNote={content.priceNote}
                            priceReady={priceReady}
                        />
                    ) : null}
                </div>
            </div>

            <StyleSheet />
        </section>
    )
}

const COURSES_DEFAULTS = {
    content: {
        title: "Courses",
        subtitle: "",
        searchPlaceholder: "Search courses",
        priceNote: "one-time",
    },
    theme: DEFAULT_THEME_PROPS,
    layout: {
        maxWidth: 1160,
        paddingY: 80,
        paddingX: 24,
        gap: 20,
        columnsDesktop: 3,
        columnsTablet: 2,
        columnsMobile: 1,
        tabletMin: 640,
        desktopMin: 960,
    },
    card: {
        radius: 16,
        padding: 22,
        showBorder: true,
        shadow: "none",
        hoverLift: 2,
        descriptionLines: 2,
        extraField: "category",
        showRefundable: true,
    },
    data: {
        limit: 0,
        defaultSort: "featured",
        currency: "auto",
        showSearch: true,
        showSort: true,
        skeletonCount: 6,
    },
    messages: {
        regionFallback: "We couldn't confirm your region, so prices are shown in ₹ (INR).",
        errorTitle: "We couldn't load the courses",
        errorBody: "The course service didn't answer. Nothing is wrong on your end.",
        retryLabel: "Try again",
        emptyTitle: "No courses yet",
        emptyBody: "The catalogue came back empty. Check again in a moment.",
        reloadLabel: "Reload",
        noMatchTitle: "No courses match",
        noMatchBody: "Try a shorter word, or clear the search to see everything.",
        clearLabel: "Clear search",
    },
    advanced: {
        baseUrl: DEFAULT_BASE_URL,
        retryAttempts: 2,
        retryDelayMs: 400,
    },
}

Courses.defaultProps = COURSES_DEFAULTS

addPropertyControls(Courses, {
    content: {
        type: ControlType.Object,
        title: "Content",
        controls: {
            title: { type: ControlType.String, title: "Title", defaultValue: "Courses" },
            subtitle: {
                type: ControlType.String,
                title: "Subtitle",
                defaultValue: "",
                placeholder: "Optional",
            },
            searchPlaceholder: {
                type: ControlType.String,
                title: "Search hint",
                defaultValue: "Search courses",
            },
            priceNote: {
                type: ControlType.String,
                title: "Price note",
                defaultValue: "one-time",
                placeholder: "Optional",
            },
        },
    },
    theme: themeControls(),
    layout: {
        type: ControlType.Object,
        title: "Layout",
        controls: {
            maxWidth: {
                type: ControlType.Number,
                title: "Max width",
                min: 480,
                max: 1600,
                step: 20,
                unit: "px",
                defaultValue: 1160,
            },
            paddingY: {
                type: ControlType.Number,
                title: "Padding Y",
                min: 0,
                max: 240,
                step: 4,
                unit: "px",
                defaultValue: 80,
            },
            paddingX: {
                type: ControlType.Number,
                title: "Padding X",
                min: 0,
                max: 120,
                step: 4,
                unit: "px",
                defaultValue: 24,
            },
            gap: {
                type: ControlType.Number,
                title: "Gap",
                min: 0,
                max: 64,
                step: 2,
                unit: "px",
                defaultValue: 20,
            },
            columnsDesktop: {
                type: ControlType.Number,
                title: "Cols desktop",
                min: 1,
                max: 6,
                step: 1,
                displayStepper: true,
                defaultValue: 3,
            },
            columnsTablet: {
                type: ControlType.Number,
                title: "Cols tablet",
                min: 1,
                max: 6,
                step: 1,
                displayStepper: true,
                defaultValue: 2,
            },
            columnsMobile: {
                type: ControlType.Number,
                title: "Cols mobile",
                min: 1,
                max: 4,
                step: 1,
                displayStepper: true,
                defaultValue: 1,
            },
            tabletMin: {
                type: ControlType.Number,
                title: "Tablet from",
                min: 320,
                max: 1200,
                step: 10,
                unit: "px",
                defaultValue: 640,
            },
            desktopMin: {
                type: ControlType.Number,
                title: "Desktop from",
                min: 480,
                max: 1600,
                step: 10,
                unit: "px",
                defaultValue: 960,
            },
        },
    },
    card: {
        type: ControlType.Object,
        title: "Card",
        controls: {
            radius: {
                type: ControlType.Number,
                title: "Radius",
                min: 0,
                max: 32,
                step: 1,
                unit: "px",
                defaultValue: 16,
            },
            padding: {
                type: ControlType.Number,
                title: "Padding",
                min: 8,
                max: 48,
                step: 2,
                unit: "px",
                defaultValue: 22,
            },
            showBorder: {
                type: ControlType.Boolean,
                title: "Border",
                defaultValue: true,
            },
            shadow: {
                type: ControlType.Enum,
                title: "Shadow",
                options: SHADOW_NAMES,
                optionTitles: ["None", "Soft", "Strong"],
                defaultValue: "none",
                displaySegmentedControl: true,
            },
            hoverLift: {
                type: ControlType.Number,
                title: "Hover lift",
                min: 0,
                max: 8,
                step: 1,
                unit: "px",
                defaultValue: 2,
            },
            descriptionLines: {
                type: ControlType.Number,
                title: "Desc lines",
                min: 1,
                max: 6,
                step: 1,
                displayStepper: true,
                defaultValue: 2,
            },
            extraField: {
                type: ControlType.Enum,
                title: "Extra field",
                options: EXTRA_FIELD_KEYS,
                optionTitles: EXTRA_FIELD_TITLES,
                defaultValue: "category",
            },
            showRefundable: {
                type: ControlType.Boolean,
                title: "Refundable",
                defaultValue: true,
            },
        },
    },
    data: {
        type: ControlType.Object,
        title: "Data",
        controls: {
            limit: {
                type: ControlType.Number,
                title: "Max cards",
                min: 0,
                max: 20,
                step: 1,
                displayStepper: true,
                defaultValue: 0,
            },
            defaultSort: {
                type: ControlType.Enum,
                title: "Sort",
                options: ["featured", "asc", "desc"],
                optionTitles: ["Featured", "Price ↑", "Price ↓"],
                defaultValue: "featured",
            },
            currency: {
                type: ControlType.Enum,
                title: "Currency",
                options: CURRENCY_MODES,
                optionTitles: ["Auto", "Rupees", "Dollars"],
                defaultValue: "auto",
                displaySegmentedControl: true,
            },
            showSearch: {
                type: ControlType.Boolean,
                title: "Search box",
                defaultValue: true,
            },
            showSort: {
                type: ControlType.Boolean,
                title: "Sort menu",
                defaultValue: true,
            },
            skeletonCount: {
                type: ControlType.Number,
                title: "Skeletons",
                min: 1,
                max: 12,
                step: 1,
                displayStepper: true,
                defaultValue: 6,
            },
        },
    },
    messages: {
        type: ControlType.Object,
        title: "Messages",
        controls: {
            regionFallback: {
                type: ControlType.String,
                title: "Region note",
                displayTextArea: true,
                defaultValue: "We couldn't confirm your region, so prices are shown in ₹ (INR).",
            },
            errorTitle: {
                type: ControlType.String,
                title: "Error title",
                defaultValue: "We couldn't load the courses",
            },
            errorBody: {
                type: ControlType.String,
                title: "Error body",
                displayTextArea: true,
                defaultValue: "The course service didn't answer. Nothing is wrong on your end.",
            },
            retryLabel: {
                type: ControlType.String,
                title: "Retry label",
                defaultValue: "Try again",
            },
            emptyTitle: {
                type: ControlType.String,
                title: "Empty title",
                defaultValue: "No courses yet",
            },
            emptyBody: {
                type: ControlType.String,
                title: "Empty body",
                displayTextArea: true,
                defaultValue: "The catalogue came back empty. Check again in a moment.",
            },
            reloadLabel: {
                type: ControlType.String,
                title: "Reload label",
                defaultValue: "Reload",
            },
            noMatchTitle: {
                type: ControlType.String,
                title: "No match title",
                defaultValue: "No courses match",
            },
            noMatchBody: {
                type: ControlType.String,
                title: "No match body",
                displayTextArea: true,
                defaultValue: "Try a shorter word, or clear the search to see everything.",
            },
            clearLabel: {
                type: ControlType.String,
                title: "Clear label",
                defaultValue: "Clear search",
            },
        },
    },
    advanced: {
        type: ControlType.Object,
        title: "Advanced",
        controls: {
            baseUrl: {
                type: ControlType.String,
                title: "API base",
                defaultValue: DEFAULT_BASE_URL,
                placeholder: DEFAULT_BASE_URL,
            },
            retryAttempts: {
                type: ControlType.Number,
                title: "Attempts",
                min: 1,
                max: 5,
                step: 1,
                displayStepper: true,
                defaultValue: 2,
            },
            retryDelayMs: {
                type: ControlType.Number,
                title: "Retry wait",
                min: 0,
                max: 3000,
                step: 50,
                unit: "ms",
                defaultValue: 400,
            },
        },
    },
})

/* ---------------------------------- Footer --------------------------------- */

/**
 * @framerSupportsResize true
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 160
 * @framerDisableUnlink
 */
export function Footer(props) {
    const content = withDefaults(FOOTER_DEFAULTS.content, props.content)
    const layout = withDefaults(FOOTER_DEFAULTS.layout, props.layout)
    const style = props.style
    const theme = resolveTheme(withDefaults(DEFAULT_THEME_PROPS, props.theme))
    const links = Array.isArray(content.links) ? content.links : []

    return (
        <footer
            style={{
                ...style,
                ...themeVars(theme, 0),
                padding: `${layout.paddingY}px ${layout.paddingX}px`,
                background: theme.background,
                borderTop: `1px solid ${theme.border}`,
                fontFamily: theme.font,
                boxSizing: "border-box",
            }}
        >
            <div
                style={{
                    maxWidth: layout.maxWidth,
                    margin: "0 auto",
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 16,
                }}
            >
                <nav style={{ display: "flex", flexWrap: "wrap", gap: 24 }}>
                    {links.map((item, index) => (
                        <a
                            key={`${item.label}-${index}`}
                            href={item.link}
                            className="sp-focusable"
                            style={{
                                fontSize: 14,
                                color: theme.muted,
                                textDecoration: "none",
                            }}
                        >
                            {item.label}
                        </a>
                    ))}
                </nav>

                <span style={{ fontSize: 13, color: theme.muted }}>{content.copyright}</span>
            </div>

            <StyleSheet />
        </footer>
    )
}

const FOOTER_DEFAULTS = {
    content: {
        links: [
            { label: "Courses", link: "#courses" },
            { label: "Pricing", link: "#courses" },
            { label: "Contact", link: "mailto:hello@skillpath.example" },
        ],
        copyright: "© 2026 Skillpath. All rights reserved.",
    },
    theme: DEFAULT_THEME_PROPS,
    layout: { maxWidth: 1160, paddingY: 36, paddingX: 24 },
}

Footer.defaultProps = FOOTER_DEFAULTS

addPropertyControls(Footer, {
    content: {
        type: ControlType.Object,
        title: "Content",
        controls: {
            links: {
                type: ControlType.Array,
                title: "Links",
                maxCount: 6,
                control: {
                    type: ControlType.Object,
                    controls: {
                        label: {
                            type: ControlType.String,
                            title: "Label",
                            defaultValue: "Link",
                        },
                        link: {
                            type: ControlType.String,
                            title: "URL",
                            defaultValue: "#",
                        },
                    },
                },
                defaultValue: [
                    { label: "Courses", link: "#courses" },
                    { label: "Pricing", link: "#courses" },
                    { label: "Contact", link: "mailto:hello@skillpath.example" },
                ],
            },
            copyright: {
                type: ControlType.String,
                title: "Copyright",
                defaultValue: "© 2026 Skillpath. All rights reserved.",
            },
        },
    },
    theme: themeControls(),
    layout: {
        type: ControlType.Object,
        title: "Layout",
        controls: {
            maxWidth: {
                type: ControlType.Number,
                title: "Max width",
                min: 480,
                max: 1600,
                step: 20,
                unit: "px",
                defaultValue: 1160,
            },
            paddingY: {
                type: ControlType.Number,
                title: "Padding Y",
                min: 0,
                max: 160,
                step: 4,
                unit: "px",
                defaultValue: 36,
            },
            paddingX: {
                type: ControlType.Number,
                title: "Padding X",
                min: 0,
                max: 120,
                step: 4,
                unit: "px",
                defaultValue: 24,
            },
        },
    },
})
