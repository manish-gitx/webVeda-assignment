import { addPropertyControls, ControlType } from "framer"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

/* ------------------------------------------------------------------ *
 * Skillpath — code components for the Framer landing page.
 *
 * Three exported components: Hero, Courses, Footer.
 * Courses is the one that talks to the API; the other two are layout.
 *
 * A course from the API looks like this:
 *   {
 *     courseName, courseCode, description, mainCategory, shortCourse,
 *     courseType, pricePaise, priceUsdCents, mangoId, refundable
 *   }
 * ------------------------------------------------------------------ */

/* ---------------------------------- config --------------------------------- */

const BASE_URL = "https://syncsphere-hiv6.onrender.com"
const COURSES_URL = `${BASE_URL}/assignment/course-data`
const COUNTRY_URL = `${BASE_URL}/assignment/country-code`

// The API returns a 404 or 500 on roughly 1 in 3 calls, on purpose. One
// automatic retry drops that to ~1 in 9 without pretending the API is
// healthy: after MAX_ATTEMPTS we stop and show the error state, which the
// user can retry by hand.
const MAX_ATTEMPTS = 2
const RETRY_DELAY_MS = 400

// If the country lookup fails we still have to price the cards. INR is the
// fallback and we say so on screen rather than showing a currency we can't
// justify.
const FALLBACK_COUNTRY = "IN"

// Column breakpoints, measured against the component's own width (see the
// ResizeObserver in useColumns for why it isn't a media query).
const TABLET_MIN_WIDTH = 640
const DESKTOP_MIN_WIDTH = 960

const SKELETON_COUNT = 6

/* ---------------------------------- theme ---------------------------------- */

const theme = {
    background: "#0B0D12",
    surface: "#14171F",
    surfaceHover: "#181C25",
    border: "rgba(255, 255, 255, 0.08)",
    borderStrong: "rgba(255, 255, 255, 0.16)",
    text: "#F3F5F9",
    muted: "#98A1B2",
    font: `Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`,
}

/* --------------------------------- fetching -------------------------------- */

/** setTimeout that gives up if the component unmounts mid-wait. */
function wait(ms, signal) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(resolve, ms)
        signal.addEventListener(
            "abort",
            () => {
                clearTimeout(timer)
                reject(new Error("aborted"))
            },
            { once: true }
        )
    })
}

/**
 * A bare GET. No headers, no method, no body: anything beyond a simple
 * request makes the browser send a CORS preflight OPTIONS first, and this
 * API only answers GET.
 */
async function getJson(url, signal) {
    const response = await fetch(url, { signal })
    if (!response.ok) {
        throw new Error(`Request failed with ${response.status}`)
    }
    return response.json()
}

async function getJsonWithRetry(url, signal) {
    let lastError
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
            return await getJson(url, signal)
        } catch (error) {
            if (signal.aborted) throw error
            lastError = error
            if (attempt < MAX_ATTEMPTS) await wait(RETRY_DELAY_MS, signal)
        }
    }
    throw lastError
}

/* --------------------------------- currency -------------------------------- */

/**
 * Both price fields are integers in the currency's *minor* unit:
 * 199900 paise is ₹1,999.00 and 3999 cents is $39.99. Everything divides
 * by 100 before it is formatted.
 */
function priceInMinorUnits(course, country) {
    const value = country === "IN" ? course.pricePaise : course.priceUsdCents
    return typeof value === "number" && Number.isFinite(value) ? value : NaN
}

// Intl.NumberFormat is expensive to construct, and there are only a handful
// of shapes we ever need, so they are built once and reused.
const formatterCache = new Map()

function getFormatter(locale, currency, fractionDigits) {
    const key = `${locale}-${currency}-${fractionDigits}`
    let formatter = formatterCache.get(key)
    if (!formatter) {
        formatter = new Intl.NumberFormat(locale, {
            style: "currency",
            currency,
            minimumFractionDigits: fractionDigits,
            maximumFractionDigits: fractionDigits,
        })
        formatterCache.set(key, formatter)
    }
    return formatter
}

function formatPrice(course, country) {
    const minorUnits = priceInMinorUnits(course, country)
    if (Number.isNaN(minorUnits)) return "—"

    // en-IN gives the lakh grouping (₹1,99,900) that an Indian learner
    // expects; whole rupees read better without ".00", dollars keep cents.
    const isIndia = country === "IN"
    const hasPaise = minorUnits % 100 !== 0
    const fractionDigits = isIndia && !hasPaise ? 0 : 2

    return getFormatter(
        isIndia ? "en-IN" : "en-US",
        isIndia ? "INR" : "USD",
        fractionDigits
    ).format(minorUnits / 100)
}

/* --------------------------------- responsive ------------------------------- */

/**
 * Columns come from the width of this component, not the viewport. Inside
 * Framer the component is rendered in a frame on the canvas, so a viewport
 * media query would report the browser window and give the wrong count.
 */
function useColumns(ref) {
    const [columns, setColumns] = useState(3)

    useEffect(() => {
        const node = ref.current
        if (!node || typeof ResizeObserver === "undefined") return

        const observer = new ResizeObserver((entries) => {
            const width = entries[0]?.contentRect.width ?? 0
            setColumns(
                width >= DESKTOP_MIN_WIDTH
                    ? 3
                    : width >= TABLET_MIN_WIDTH
                      ? 2
                      : 1
            )
        })
        observer.observe(node)
        return () => observer.disconnect()
    }, [ref])

    return columns
}

/* ----------------------------------- Hero ---------------------------------- */

/**
 * @framerSupportsResize true
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 520
 * @framerDisableUnlink
 */
export function Hero(props) {
    const { headline, subline, buttonLabel, buttonLink, accentColor, style } =
        props

    return (
        <section
            style={{
                ...style,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 20,
                padding: "112px 24px",
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
                Skillpath
            </span>

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
                    color: "#0B0D12",
                    fontSize: 15,
                    fontWeight: 600,
                    textDecoration: "none",
                }}
            >
                {buttonLabel}
            </a>

            <style>{sharedCss(accentColor)}</style>
        </section>
    )
}

Hero.defaultProps = {
    headline: "Learn the skills the internet actually pays for",
    subline: "Short, practical courses from creators who have already done it. Start today, ship something this week.",
    buttonLabel: "Browse courses",
    buttonLink: "#courses",
    accentColor: "#7C5CFF",
}

addPropertyControls(Hero, {
    headline: { type: ControlType.String, title: "Headline" },
    subline: {
        type: ControlType.String,
        title: "Subline",
        displayTextArea: true,
    },
    buttonLabel: { type: ControlType.String, title: "Button" },
    buttonLink: { type: ControlType.String, title: "Link" },
    accentColor: { type: ControlType.Color, title: "Accent" },
})

/* --------------------------------- Courses --------------------------------- */

/**
 * @framerSupportsResize true
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 900
 * @framerDisableUnlink
 */
export function Courses(props) {
    const { sectionTitle, accentColor, style } = props

    const [status, setStatus] = useState("loading") // loading | error | ready
    const [courses, setCourses] = useState([])
    const [errorMessage, setErrorMessage] = useState("")

    const [country, setCountry] = useState(FALLBACK_COUNTRY)
    const [countryFailed, setCountryFailed] = useState(false)

    const [query, setQuery] = useState("")
    const [sortOrder, setSortOrder] = useState("default") // default | asc | desc

    // Bumping this re-runs the effect below; that is the whole retry button.
    const [reloadCount, setReloadCount] = useState(0)
    const reload = useCallback(() => setReloadCount((n) => n + 1), [])

    const gridRef = useRef(null)
    const columns = useColumns(gridRef)

    useEffect(() => {
        const controller = new AbortController()
        const { signal } = controller

        setStatus("loading")
        setErrorMessage("")

        // Two independent requests, deliberately not chained. The grid is the
        // point of the section, so a dead country lookup must not stop it —
        // it only downgrades us to the fallback currency.
        getJsonWithRetry(COUNTRY_URL, signal)
            .then((data) => {
                if (signal.aborted) return
                setCountry(data?.country_code === "US" ? "US" : "IN")
                setCountryFailed(false)
            })
            .catch(() => {
                if (signal.aborted) return
                setCountry(FALLBACK_COUNTRY)
                setCountryFailed(true)
            })

        getJsonWithRetry(COURSES_URL, signal)
            .then((data) => {
                if (signal.aborted) return
                // Trust the shape only as far as we can check it.
                setCourses(Array.isArray(data) ? data : [])
                setStatus("ready")
            })
            .catch((error) => {
                if (signal.aborted) return
                setErrorMessage(
                    error instanceof Error ? error.message : "Unknown error"
                )
                setStatus("error")
            })

        return () => controller.abort()
    }, [reloadCount])

    const visibleCourses = useMemo(() => {
        const needle = query.trim().toLowerCase()

        let list = courses
        if (needle) {
            list = list.filter((course) =>
                [course.courseName, course.mainCategory, course.description]
                    .filter(Boolean)
                    .some((field) => field.toLowerCase().includes(needle))
            )
        }

        if (sortOrder !== "default") {
            const direction = sortOrder === "asc" ? 1 : -1
            // Sort on the currency we are actually displaying, so the order on
            // screen always matches the numbers on screen.
            list = [...list].sort(
                (a, b) =>
                    (priceInMinorUnits(a, country) -
                        priceInMinorUnits(b, country)) *
                    direction
            )
        }

        return list
    }, [courses, query, sortOrder, country])

    const isFiltered = query.trim().length > 0

    return (
        <section
            id="courses"
            style={{
                ...style,
                padding: "80px 24px",
                background: theme.background,
                fontFamily: theme.font,
                color: theme.text,
                boxSizing: "border-box",
            }}
        >
            <div style={{ maxWidth: 1160, margin: "0 auto" }}>
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

                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <input
                            className="sp-focusable"
                            type="search"
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Search courses"
                            aria-label="Search courses"
                            disabled={status !== "ready"}
                            style={{
                                width: 200,
                                padding: "10px 14px",
                                borderRadius: 10,
                                border: `1px solid ${theme.border}`,
                                background: theme.surface,
                                color: theme.text,
                                fontSize: 14,
                                fontFamily: "inherit",
                            }}
                        />
                        <select
                            className="sp-focusable"
                            value={sortOrder}
                            onChange={(event) =>
                                setSortOrder(event.target.value)
                            }
                            aria-label="Sort courses"
                            disabled={status !== "ready"}
                            style={{
                                padding: "10px 14px",
                                borderRadius: 10,
                                border: `1px solid ${theme.border}`,
                                background: theme.surface,
                                color: theme.text,
                                fontSize: 14,
                                fontFamily: "inherit",
                            }}
                        >
                            <option value="default">Sort: featured</option>
                            <option value="asc">Price: low to high</option>
                            <option value="desc">Price: high to low</option>
                        </select>
                    </div>
                </header>

                {/* One honest line when we priced the page on a guess. */}
                {status === "ready" && countryFailed && (
                    <p
                        role="status"
                        style={{
                            margin: "0 0 20px",
                            fontSize: 13,
                            color: theme.muted,
                        }}
                    >
                        We couldn't confirm your region, so prices are shown in
                        ₹ (INR).
                    </p>
                )}

                {/* Screen readers get told what changed; sighted users see it. */}
                <div ref={gridRef} aria-live="polite">
                    {status === "loading" && <SkeletonGrid columns={columns} />}

                    {status === "error" && (
                        <ErrorState
                            detail={errorMessage}
                            accentColor={accentColor}
                            onRetry={reload}
                        />
                    )}

                    {status === "ready" && visibleCourses.length === 0 && (
                        <EmptyState
                            isFiltered={isFiltered}
                            query={query}
                            accentColor={accentColor}
                            onClear={() => setQuery("")}
                            onRetry={reload}
                        />
                    )}

                    {status === "ready" && visibleCourses.length > 0 && (
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                                gap: 20,
                            }}
                        >
                            {visibleCourses.map((course, index) => (
                                <CourseCard
                                    // courseCode is the stable id in the payload;
                                    // index is only the last resort.
                                    key={
                                        course.courseCode ??
                                        course.mangoId ??
                                        index
                                    }
                                    course={course}
                                    country={country}
                                    accentColor={accentColor}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <style>{sharedCss(accentColor)}</style>
        </section>
    )
}

Courses.defaultProps = {
    sectionTitle: "Courses",
    accentColor: "#7C5CFF",
}

addPropertyControls(Courses, {
    sectionTitle: { type: ControlType.String, title: "Title" },
    accentColor: { type: ControlType.Color, title: "Accent" },
})

/* -------------------------------- Course card ------------------------------- */

function CourseCard({ course, country, accentColor }) {
    return (
        <article
            className="sp-card"
            style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
                padding: 22,
                borderRadius: 16,
                background: theme.surface,
                border: `1px solid ${theme.border}`,
                transition: "transform 150ms ease, border-color 150ms ease",
                minWidth: 0,
            }}
        >
            <div
                style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 8,
                    alignItems: "center",
                }}
            >
                {/* The extra field: category is what a learner scans for. */}
                <span
                    style={{
                        fontSize: 12,
                        fontWeight: 500,
                        color: accentColor,
                        background: tint(accentColor, 0.12),
                        border: `1px solid ${tint(accentColor, 0.28)}`,
                        borderRadius: 999,
                        padding: "4px 10px",
                    }}
                >
                    {course.mainCategory || "Course"}
                </span>

                {course.refundable === true && (
                    <span
                        style={{
                            fontSize: 12,
                            fontWeight: 500,
                            color: "#5FD8A4",
                            background: "rgba(95, 216, 164, 0.12)",
                            border: "1px solid rgba(95, 216, 164, 0.28)",
                            borderRadius: 999,
                            padding: "4px 10px",
                        }}
                    >
                        Refundable
                    </span>
                )}
            </div>

            <h3
                style={{
                    margin: 0,
                    fontSize: 18,
                    lineHeight: 1.3,
                    fontWeight: 600,
                    color: theme.text,
                }}
            >
                {course.courseName}
            </h3>

            <p
                style={{
                    margin: 0,
                    fontSize: 14,
                    lineHeight: 1.55,
                    color: theme.muted,
                    // Two lines, cut with an ellipsis instead of a hard crop.
                    display: "-webkit-box",
                    WebkitBoxOrient: "vertical",
                    WebkitLineClamp: 2,
                    overflow: "hidden",
                }}
            >
                {course.description}
            </p>

            <div
                style={{
                    marginTop: "auto",
                    paddingTop: 14,
                    borderTop: `1px solid ${theme.border}`,
                    display: "flex",
                    alignItems: "baseline",
                    gap: 8,
                }}
            >
                <span style={{ fontSize: 20, fontWeight: 600 }}>
                    {formatPrice(course, country)}
                </span>
                <span style={{ fontSize: 12, color: theme.muted }}>
                    one-time
                </span>
            </div>
        </article>
    )
}

/* --------------------------------- states ---------------------------------- */

function SkeletonGrid({ columns }) {
    return (
        <div
            style={{
                display: "grid",
                gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                gap: 20,
            }}
            aria-hidden="true"
        >
            {Array.from({ length: SKELETON_COUNT }).map((_, index) => (
                <div
                    key={index}
                    style={{
                        padding: 22,
                        borderRadius: 16,
                        background: theme.surface,
                        border: `1px solid ${theme.border}`,
                        display: "flex",
                        flexDirection: "column",
                        gap: 12,
                    }}
                >
                    <div
                        className="sp-skeleton"
                        style={{ width: 96, height: 22 }}
                    />
                    <div
                        className="sp-skeleton"
                        style={{ width: "70%", height: 20 }}
                    />
                    <div
                        className="sp-skeleton"
                        style={{ width: "100%", height: 14 }}
                    />
                    <div
                        className="sp-skeleton"
                        style={{ width: "85%", height: 14 }}
                    />
                    <div
                        className="sp-skeleton"
                        style={{ width: 90, height: 22, marginTop: 14 }}
                    />
                </div>
            ))}
        </div>
    )
}

function ErrorState({ detail, accentColor, onRetry }) {
    return (
        <StateBox>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
                We couldn't load the courses
            </h3>
            <p style={{ margin: 0, fontSize: 14, color: theme.muted }}>
                The course service didn't answer. Nothing is wrong on your end.
            </p>
            <PrimaryButton accentColor={accentColor} onClick={onRetry}>
                Try again
            </PrimaryButton>
            {/* The status code helps whoever debugs this; it is not the headline. */}
            {detail && (
                <span
                    style={{ fontSize: 12, color: theme.muted, opacity: 0.7 }}
                >
                    {detail}
                </span>
            )}
        </StateBox>
    )
}

function EmptyState({ isFiltered, query, accentColor, onClear, onRetry }) {
    // "Your search matched nothing" and "the catalogue is empty" are different
    // problems, so they get different words and different buttons.
    return (
        <StateBox>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
                {isFiltered
                    ? `No courses match "${query.trim()}"`
                    : "No courses yet"}
            </h3>
            <p style={{ margin: 0, fontSize: 14, color: theme.muted }}>
                {isFiltered
                    ? "Try a shorter word, or clear the search to see everything."
                    : "The catalogue came back empty. Check again in a moment."}
            </p>
            <PrimaryButton
                accentColor={accentColor}
                onClick={isFiltered ? onClear : onRetry}
            >
                {isFiltered ? "Clear search" : "Reload"}
            </PrimaryButton>
        </StateBox>
    )
}

function StateBox({ children }) {
    return (
        <div
            role="status"
            style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
                textAlign: "center",
                padding: "64px 24px",
                borderRadius: 16,
                background: theme.surface,
                border: `1px dashed ${theme.borderStrong}`,
            }}
        >
            {children}
        </div>
    )
}

function PrimaryButton({ accentColor, onClick, children }) {
    return (
        <button
            type="button"
            className="sp-focusable"
            onClick={onClick}
            style={{
                marginTop: 4,
                padding: "10px 20px",
                borderRadius: 10,
                border: "none",
                background: accentColor,
                color: "#0B0D12",
                fontSize: 14,
                fontWeight: 600,
                fontFamily: "inherit",
                cursor: "pointer",
            }}
        >
            {children}
        </button>
    )
}

/* ---------------------------------- Footer --------------------------------- */

/**
 * @framerSupportsResize true
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 160
 * @framerDisableUnlink
 */
export function Footer(props) {
    const { links, copyright, accentColor, style } = props

    return (
        <footer
            style={{
                ...style,
                padding: "36px 24px",
                background: theme.background,
                borderTop: `1px solid ${theme.border}`,
                fontFamily: theme.font,
                boxSizing: "border-box",
            }}
        >
            <div
                style={{
                    maxWidth: 1160,
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

                <span style={{ fontSize: 13, color: theme.muted }}>
                    {copyright}
                </span>
            </div>

            <style>{sharedCss(accentColor)}</style>
        </footer>
    )
}

Footer.defaultProps = {
    links: [
        { label: "Courses", link: "#courses" },
        { label: "Pricing", link: "#courses" },
        { label: "Contact", link: "mailto:hello@skillpath.example" },
    ],
    copyright: "© 2026 Skillpath. All rights reserved.",
    accentColor: "#7C5CFF",
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
    },
    copyright: { type: ControlType.String, title: "Copyright" },
    accentColor: { type: ControlType.Color, title: "Accent" },
})

/* ---------------------------------- helpers -------------------------------- */

/**
 * A translucent version of the accent, for chip backgrounds and borders.
 *
 * Framer hands the colour prop over in whichever format the picker used:
 * "#7C5CFF" on the canvas but "rgb(124, 92, 255)" once the site is
 * published. Anything we still can't read falls back to a neutral grey,
 * because returning the colour unchanged would paint a chip the same
 * colour as its own text.
 */
function tint(color, alpha) {
    const rgb = toRgb(color)
    if (!rgb) return `rgba(255, 255, 255, ${alpha})`
    return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`
}

function toRgb(color) {
    const value = String(color).trim()

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

    // Covers both "rgb(124, 92, 255)" and the modern "rgb(124 92 255 / 50%)".
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

/** Keyframes and focus rings can't be inline styles, so they go in a tag. */
function sharedCss(accentColor) {
    return `
        @keyframes sp-shimmer {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
        }
        .sp-skeleton {
            background: linear-gradient(90deg, ${theme.surfaceHover} 25%, rgba(255,255,255,0.07) 37%, ${theme.surfaceHover} 63%);
            background-size: 200% 100%;
            animation: sp-shimmer 1.4s ease-in-out infinite;
            border-radius: 6px;
        }
        .sp-card:hover {
            transform: translateY(-2px);
            border-color: ${theme.borderStrong};
        }
        .sp-focusable:focus-visible {
            outline: 2px solid ${accentColor};
            outline-offset: 2px;
        }
        @media (prefers-reduced-motion: reduce) {
            .sp-skeleton { animation: none; }
            .sp-card { transition: none; }
        }
    `
}
