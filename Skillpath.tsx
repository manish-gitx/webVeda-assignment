/**
 * Skillpath — the three components that make up the page.
 *
 * This file is deliberately thin: it reads the property controls, calls the
 * hooks and hands everything to the presentational pieces in Ui.tsx. Fetching
 * lives in Api.tsx, formatting in Format.tsx, tokens and colour maths in
 * Theme.tsx. If you are looking for logic, it is not in here.
 *
 * Plain JavaScript + JSX. The .tsx extension is Framer's requirement for code
 * files — relative imports must carry it — not a TypeScript signal.
 */

import { addPropertyControls, ControlType } from "framer"
import { useMemo, useRef, useState } from "react"

import { ACCENT, contrastText, theme, tint, visuallyHidden } from "./Theme.tsx"
import { selectCourses } from "./Format.tsx"
import { useColumns, useCourses } from "./Hooks.tsx"
import {
    CourseGrid,
    EmptyState,
    ErrorState,
    SkeletonGrid,
    StyleSheet,
    Toolbar,
} from "./Ui.tsx"

const PAGE_MAX_WIDTH = 1160
const SKELETON_COUNT = 6

/** Panel min/max are affordances, not guarantees — clamp again at the edge. */
function clamp(value, min, max, fallback) {
    const number = Number(value)
    if (!Number.isFinite(number)) return fallback
    return Math.min(max, Math.max(min, number))
}

/* ----------------------------------- Hero ---------------------------------- */

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight auto
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 520
 */
export function Hero({
    badge = "Skillpath",
    headline = "Learn the skills the internet actually pays for",
    subline = "Short, practical courses from creators who have already done it. Start today, ship something this week.",
    buttonLabel = "Browse courses",
    buttonLink = "#courses",
    accentColor = ACCENT,
    paddingY = 112,
    paddingX = 24,
    style,
}) {
    return (
        <section
            style={{
                ...style,
                // Read by .sp-focusable in the shared stylesheet, so each
                // instance gets its own accent instead of the last one
                // rendered on the page winning.
                "--sp-accent": accentColor,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 20,
                padding: `${clamp(paddingY, 0, 240, 112)}px ${clamp(paddingX, 0, 120, 24)}px`,
                background: theme.background,
                backgroundImage: `radial-gradient(60% 80% at 50% 0%, ${tint(
                    accentColor,
                    0.22
                )} 0%, rgba(0,0,0,0) 70%)`,
                fontFamily: theme.font,
                textAlign: "center",
                boxSizing: "border-box",
            }}
        >
            {badge ? (
                <span
                    style={{
                        fontSize: 13,
                        fontWeight: 500,
                        letterSpacing: 0.4,
                        color: accentColor,
                        border: `1px solid ${tint(accentColor, 0.35)}`,
                        background: tint(accentColor, 0.1),
                        borderRadius: 999,
                        padding: "6px 14px",
                    }}
                >
                    {badge}
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
                {headline}
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
                {subline}
            </p>

            <a
                href={buttonLink}
                className="sp-focusable"
                style={{
                    marginTop: 12,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "14px 26px",
                    borderRadius: 12,
                    background: accentColor,
                    color: contrastText(accentColor),
                    fontSize: 15,
                    fontWeight: 600,
                    textDecoration: "none",
                }}
            >
                {buttonLabel}
            </a>

            <StyleSheet />
        </section>
    )
}

addPropertyControls(Hero, {
    badge: {
        type: ControlType.String,
        title: "Badge",
        defaultValue: "Skillpath",
        placeholder: "Leave empty to hide",
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
    buttonLabel: {
        type: ControlType.String,
        title: "Button",
        defaultValue: "Browse courses",
    },
    buttonLink: {
        type: ControlType.String,
        title: "Link",
        defaultValue: "#courses",
        description: "`#courses` scrolls down to the Courses section.",
    },
    accentColor: {
        type: ControlType.Color,
        title: "Accent",
        defaultValue: ACCENT,
        description:
            "Button, badge and glow. Bind all three sections to one Color Style to keep them in sync.",
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
})

/* --------------------------------- Courses --------------------------------- */

/**
 * The section the assignment is actually about: live data, four states,
 * 3 / 2 / 1 columns.
 *
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight auto
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 900
 */
export function Courses({
    sectionTitle = "Courses",
    accentColor = ACCENT,
    paddingY = 80,
    paddingX = 24,
    cardRadius = 16,
    cardPadding = 22,
    gap = 20,
    style,
}) {
    const {
        status,
        courses,
        errorMessage,
        country,
        countryFailed,
        countryReady,
        reload,
    } = useCourses()

    const [query, setQuery] = useState("")
    const [sortOrder, setSortOrder] = useState("default") // default | asc | desc

    const gridRef = useRef(null)
    const columns = useColumns(gridRef)

    const visibleCourses = useMemo(
        () => selectCourses(courses, { query, sortOrder, country }),
        [courses, query, sortOrder, country]
    )

    const isFiltered = query.trim().length > 0
    const card = {
        radius: clamp(cardRadius, 0, 32, 16),
        padding: clamp(cardPadding, 8, 48, 22),
    }
    const gridGap = clamp(gap, 0, 48, 20)

    // Kept deliberately terse — this is spoken aloud, not read.
    const liveMessage =
        status === "loading"
            ? "Loading courses"
            : status === "ready" && visibleCourses.length > 0
              ? `${visibleCourses.length} ${
                    visibleCourses.length === 1 ? "course" : "courses"
                } shown`
              : ""

    return (
        <section
            id="courses"
            style={{
                ...style,
                "--sp-accent": accentColor,
                padding: `${clamp(paddingY, 0, 240, 80)}px ${clamp(paddingX, 0, 120, 24)}px`,
                background: theme.background,
                fontFamily: theme.font,
                color: theme.text,
                boxSizing: "border-box",
            }}
        >
            <div style={{ maxWidth: PAGE_MAX_WIDTH, margin: "0 auto" }}>
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
                    <h2
                        style={{
                            margin: 0,
                            fontSize: "clamp(26px, 3vw, 36px)",
                            letterSpacing: -0.8,
                            fontWeight: 600,
                        }}
                    >
                        {sectionTitle}
                    </h2>

                    <Toolbar
                        query={query}
                        onQuery={setQuery}
                        sortOrder={sortOrder}
                        onSort={setSortOrder}
                        disabled={status !== "ready"}
                    />
                </header>

                {/* One honest line when the page was priced on a fallback. */}
                {status === "ready" && countryFailed ? (
                    <p
                        role="status"
                        style={{
                            margin: "0 0 20px",
                            fontSize: 13,
                            color: theme.muted,
                        }}
                    >
                        We couldn't confirm your region, so prices are shown in ₹ (INR).
                    </p>
                ) : null}

                {/* A short spoken summary. The grid itself is far too big to
                    announce. Always rendered, never conditionally: a live
                    region has to already be in the DOM when its text changes
                    or the change is missed. Error and empty announce
                    themselves through their own role="status". */}
                <p role="status" style={visuallyHidden}>
                    {liveMessage}
                </p>

                <div ref={gridRef}>
                    {status === "loading" ? (
                        <SkeletonGrid
                            columns={columns}
                            count={SKELETON_COUNT}
                            gap={gridGap}
                            card={card}
                        />
                    ) : null}

                    {status === "error" ? (
                        <ErrorState
                            detail={errorMessage}
                            accentColor={accentColor}
                            onRetry={reload}
                        />
                    ) : null}

                    {status === "ready" && visibleCourses.length === 0 ? (
                        <EmptyState
                            isFiltered={isFiltered}
                            query={query}
                            accentColor={accentColor}
                            onClear={() => setQuery("")}
                            onRetry={reload}
                        />
                    ) : null}

                    {status === "ready" && visibleCourses.length > 0 ? (
                        <CourseGrid
                            courses={visibleCourses}
                            columns={columns}
                            gap={gridGap}
                            country={country}
                            accentColor={accentColor}
                            priceReady={countryReady}
                            card={card}
                        />
                    ) : null}
                </div>
            </div>

            <StyleSheet />
        </section>
    )
}

addPropertyControls(Courses, {
    sectionTitle: {
        type: ControlType.String,
        title: "Title",
        defaultValue: "Courses",
    },
    accentColor: {
        type: ControlType.Color,
        title: "Accent",
        defaultValue: ACCENT,
        description:
            "Category chips, retry button and focus rings. Bind all three sections to one Color Style to keep them in sync.",
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
    cardRadius: {
        type: ControlType.Number,
        title: "Card radius",
        min: 0,
        max: 32,
        step: 1,
        unit: "px",
        defaultValue: 16,
    },
    cardPadding: {
        type: ControlType.Number,
        title: "Card padding",
        min: 8,
        max: 48,
        step: 2,
        unit: "px",
        defaultValue: 22,
    },
    gap: {
        type: ControlType.Number,
        title: "Grid gap",
        min: 0,
        max: 48,
        step: 2,
        unit: "px",
        defaultValue: 20,
        description: "Space between cards. Columns stay 3 / 2 / 1 by breakpoint.",
    },
})

/* ---------------------------------- Footer --------------------------------- */

const FOOTER_LINKS = [
    { label: "Courses", link: "#courses" },
    { label: "Pricing", link: "#courses" },
    { label: "Contact", link: "mailto:hello@skillpath.example" },
]

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight auto
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 160
 */
export function Footer({
    links = FOOTER_LINKS,
    copyright = "© 2026 Skillpath. All rights reserved.",
    accentColor = ACCENT,
    paddingY = 36,
    paddingX = 24,
    style,
}) {
    const items = Array.isArray(links) ? links : []

    return (
        <footer
            style={{
                ...style,
                "--sp-accent": accentColor,
                padding: `${clamp(paddingY, 0, 160, 36)}px ${clamp(paddingX, 0, 120, 24)}px`,
                background: theme.background,
                borderTop: `1px solid ${theme.border}`,
                fontFamily: theme.font,
                boxSizing: "border-box",
            }}
        >
            <div
                style={{
                    maxWidth: PAGE_MAX_WIDTH,
                    margin: "0 auto",
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 16,
                }}
            >
                <nav style={{ display: "flex", flexWrap: "wrap", gap: 24 }}>
                    {items.map((item, index) => (
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

                <span style={{ fontSize: 13, color: theme.muted }}>{copyright}</span>
            </div>

            <StyleSheet />
        </footer>
    )
}

addPropertyControls(Footer, {
    links: {
        type: ControlType.Array,
        title: "Links",
        maxCount: 3,
        control: {
            type: ControlType.Object,
            controls: {
                label: { type: ControlType.String, title: "Label" },
                link: { type: ControlType.String, title: "URL" },
            },
        },
        defaultValue: FOOTER_LINKS,
    },
    copyright: {
        type: ControlType.String,
        title: "Copyright",
        defaultValue: "© 2026 Skillpath. All rights reserved.",
    },
    accentColor: {
        type: ControlType.Color,
        title: "Accent",
        defaultValue: ACCENT,
        description: "Focus rings. Bind all three sections to one Color Style.",
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
})
