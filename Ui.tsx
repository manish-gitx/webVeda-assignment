/**
 * Ui — presentational building blocks. Every one of these takes a resolved
 * theme and renders; none of them fetch, measure or own state. That split is
 * what makes the section easy to restyle without touching the data code.
 *
 * Plain JavaScript (see the note at the top of Tokens.tsx about the extension).
 */

import { GLOBAL_CSS, POSITIVE, SHADOWS, mix, readableOn, tint } from "./Tokens.tsx"
import { extraFieldValue, formatPrice } from "./Format.tsx"

/** One <style> tag carrying the rules that inline styles can't express. */
export function StyleSheet() {
    return <style>{GLOBAL_CSS}</style>
}

/* ---------------------------------- atoms ---------------------------------- */

export function Chip({ label, theme, tone }) {
    const colour = tone === "positive" ? POSITIVE : theme.accent
    // The label sits on a 12% tint of its own colour composited over the card
    // surface, so that blend — not the surface alone — is the real backdrop to
    // measure legibility against.
    const backdrop = mix(theme.surface, colour, 0.12)
    return (
        <span
            style={{
                fontSize: 12,
                fontWeight: 500,
                lineHeight: 1.4,
                color: readableOn(colour, backdrop, theme.text),
                background: tint(colour, 0.12),
                border: `1px solid ${tint(colour, 0.28)}`,
                borderRadius: 999,
                padding: "4px 10px",
                whiteSpace: "nowrap",
            }}
        >
            {label}
        </span>
    )
}

export function ActionButton({ theme, onClick, children }) {
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
                background: theme.accent,
                color: theme.onAccent,
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

const fieldStyle = (theme) => ({
    padding: "10px 14px",
    borderRadius: 10,
    border: `1px solid ${theme.border}`,
    background: theme.surface,
    color: theme.text,
    fontSize: 14,
    fontFamily: "inherit",
})

/* --------------------------------- toolbar --------------------------------- */

export function Toolbar({
    theme,
    query,
    onQuery,
    sort,
    onSort,
    showSearch,
    showSort,
    disabled,
    searchPlaceholder,
}) {
    if (!showSearch && !showSort) return null

    return (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {showSearch && (
                <input
                    className="sp-focusable"
                    type="search"
                    value={query}
                    onChange={(event) => onQuery(event.target.value)}
                    placeholder={searchPlaceholder}
                    aria-label={searchPlaceholder}
                    disabled={disabled}
                    style={{ ...fieldStyle(theme), width: 200 }}
                />
            )}

            {showSort && (
                <select
                    className="sp-focusable"
                    value={sort}
                    onChange={(event) => onSort(event.target.value)}
                    aria-label="Sort courses"
                    disabled={disabled}
                    style={fieldStyle(theme)}
                >
                    <option value="featured">Sort: featured</option>
                    <option value="asc">Price: low to high</option>
                    <option value="desc">Price: high to low</option>
                </select>
            )}
        </div>
    )
}

/* ----------------------------------- card ---------------------------------- */

export function CourseCard({ course, country, theme, card, priceNote, priceReady }) {
    const extra = extraFieldValue(course, card.extraField)
    const showRefundable = card.showRefundable && course.refundable === true

    return (
        <article
            className="sp-card"
            style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
                padding: card.padding,
                borderRadius: card.radius,
                background: theme.surface,
                borderWidth: 1,
                borderStyle: "solid",
                ["--sp-card-border"]: card.showBorder ? theme.border : "transparent",
                boxShadow: SHADOWS[card.shadow] || SHADOWS.none,
                minWidth: 0,
            }}
        >
            {(extra || showRefundable) && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                    {extra && <Chip label={extra} theme={theme} />}
                    {showRefundable && <Chip label="Refundable" theme={theme} tone="positive" />}
                </div>
            )}

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
                    // Clamped to a configurable number of lines, cut with an
                    // ellipsis rather than a hard crop.
                    display: "-webkit-box",
                    WebkitBoxOrient: "vertical",
                    WebkitLineClamp: card.descriptionLines,
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
                {/* Until the country lookup settles the currency is a guess,
                    so hold the number back rather than print one we may have
                    to swap a moment later. */}
                {priceReady ? (
                    <span style={{ fontSize: 20, fontWeight: 600, color: theme.text }}>
                        {formatPrice(course, country)}
                    </span>
                ) : (
                    <span
                        className="sp-skeleton"
                        aria-hidden="true"
                        style={{ display: "inline-block", width: "5ch", height: 20 }}
                    />
                )}
                {priceNote ? (
                    <span style={{ fontSize: 12, color: theme.muted }}>{priceNote}</span>
                ) : null}
            </div>
        </article>
    )
}

export function CourseGrid({ courses, columns, gap, country, theme, card, priceNote, priceReady }) {
    return (
        <div
            style={{
                display: "grid",
                gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                gap,
            }}
        >
            {courses.map((course, index) => (
                <CourseCard
                    // courseCode is the stable id in the payload; index is only
                    // ever the last resort.
                    key={course.courseCode || course.mangoId || index}
                    course={course}
                    country={country}
                    theme={theme}
                    card={card}
                    priceNote={priceNote}
                    priceReady={priceReady}
                />
            ))}
        </div>
    )
}

/* ---------------------------------- states --------------------------------- */

export function SkeletonGrid({ columns, count, gap, theme, card }) {
    const bars = [96, "70%", "100%", "85%"]

    return (
        <div
            aria-hidden="true"
            style={{
                display: "grid",
                gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                gap,
            }}
        >
            {Array.from({ length: count }).map((_, cardIndex) => (
                <div
                    key={cardIndex}
                    style={{
                        padding: card.padding,
                        borderRadius: card.radius,
                        background: theme.surface,
                        borderWidth: 1,
                        borderStyle: "solid",
                        borderColor: card.showBorder ? theme.border : "transparent",
                        display: "flex",
                        flexDirection: "column",
                        gap: 12,
                    }}
                >
                    {bars.map((width, barIndex) => (
                        <div
                            key={barIndex}
                            className="sp-skeleton"
                            style={{ width, height: barIndex < 2 ? 20 : 14 }}
                        />
                    ))}
                    <div
                        className="sp-skeleton"
                        style={{ width: 90, height: 22, marginTop: 14 }}
                    />
                </div>
            ))}
        </div>
    )
}

export function StateBox({ theme, children }) {
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
                color: theme.text,
            }}
        >
            {children}
        </div>
    )
}

export function ErrorState({ theme, detail, onRetry, copy }) {
    return (
        <StateBox theme={theme}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>{copy.errorTitle}</h3>
            <p style={{ margin: 0, fontSize: 14, color: theme.muted }}>{copy.errorBody}</p>
            <ActionButton theme={theme} onClick={onRetry}>
                {copy.retryLabel}
            </ActionButton>
            {/* The status code helps whoever debugs this; it is not the headline. */}
            {detail ? (
                <span style={{ fontSize: 12, color: theme.muted, opacity: 0.7 }}>{detail}</span>
            ) : null}
        </StateBox>
    )
}

export function EmptyState({ theme, isFiltered, query, onClear, onRetry, copy }) {
    // "Your search matched nothing" and "the catalogue is empty" are different
    // problems, so they get different words and a different button.
    const title = isFiltered ? `${copy.noMatchTitle} "${query.trim()}"` : copy.emptyTitle
    const body = isFiltered ? copy.noMatchBody : copy.emptyBody

    return (
        <StateBox theme={theme}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>{title}</h3>
            <p style={{ margin: 0, fontSize: 14, color: theme.muted }}>{body}</p>
            <ActionButton theme={theme} onClick={isFiltered ? onClear : onRetry}>
                {isFiltered ? copy.clearLabel : copy.reloadLabel}
            </ActionButton>
        </StateBox>
    )
}
