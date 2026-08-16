/**
 * Format — currency and field formatting. Pure functions, no React.
 *
 * Plain JavaScript (see the note at the top of Tokens.tsx about the extension).
 */

/**
 * Both price fields are integers in the currency's MINOR unit:
 * 199900 paise is Rs 1,999.00 and 3999 cents is $39.99. Everything divides by
 * 100 before it is formatted — this is the single most important line in the
 * project to get right.
 */
export function priceMinorUnits(course, country) {
    const value = country === "IN" ? course.pricePaise : course.priceUsdCents
    return typeof value === "number" && Number.isFinite(value) ? value : NaN
}

// Intl.NumberFormat is expensive to construct and there are only a handful of
// shapes we ever need, so they are built once and reused.
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

export function formatPrice(course, country) {
    const minorUnits = priceMinorUnits(course, country)
    if (Number.isNaN(minorUnits)) return "—"

    // en-IN gives the lakh grouping (Rs 1,99,900) an Indian learner expects.
    // Whole rupees read better without ".00"; dollars always keep their cents.
    const isIndia = country === "IN"
    const hasFraction = minorUnits % 100 !== 0
    const fractionDigits = isIndia && !hasFraction ? 0 : 2

    return getFormatter(
        isIndia ? "en-IN" : "en-US",
        isIndia ? "INR" : "USD",
        fractionDigits
    ).format(minorUnits / 100)
}

/* ------------------------------- country mode ------------------------------ */

export const CURRENCY_MODES = ["auto", "IN", "US"]

/**
 * "auto" trusts the country endpoint. The two forced modes exist so a designer
 * can lay the page out in either currency without waiting for the API to flip.
 */
export function resolveCountry(mode, fetched) {
    if (mode === "IN" || mode === "US") return mode
    return fetched === "US" ? "US" : "IN"
}

/* ------------------------------- extra field ------------------------------- */

// Which payload field appears on the card, as a designer-facing menu. Category
// is the default because it is the only field a learner actually scans for;
// courseCode and mangoId are internal identifiers and deliberately absent.
export const EXTRA_FIELDS = {
    none: { title: "None", key: null },
    category: { title: "Category", key: "mainCategory" },
    type: { title: "Course type", key: "courseType" },
    topic: { title: "Short name", key: "shortCourse" },
}

export const EXTRA_FIELD_KEYS = Object.keys(EXTRA_FIELDS)

export const EXTRA_FIELD_TITLES = EXTRA_FIELD_KEYS.map((key) => EXTRA_FIELDS[key].title)

export function extraFieldValue(course, choice) {
    const field = EXTRA_FIELDS[choice]
    if (!field || !field.key) return ""
    const value = course[field.key]
    return typeof value === "string" ? value : ""
}

/* --------------------------------- searching ------------------------------- */

export const SORT_MODES = ["featured", "asc", "desc"]

/** Filters by a free-text query, then sorts on the currency actually shown. */
export function selectCourses(courses, options) {
    const config = options || {}
    const needle = String(config.query || "").trim().toLowerCase()

    let list = courses
    if (needle) {
        list = list.filter((course) =>
            [course.courseName, course.mainCategory, course.description]
                .filter(Boolean)
                .some((field) => String(field).toLowerCase().includes(needle))
        )
    }

    if (config.sort === "asc" || config.sort === "desc") {
        const direction = config.sort === "asc" ? 1 : -1
        // Sorting on the displayed currency keeps the order and the numbers on
        // screen telling the same story.
        list = [...list].sort(
            (a, b) =>
                (priceMinorUnits(a, config.country) - priceMinorUnits(b, config.country)) *
                direction
        )
    }

    const limit = Number(config.limit) || 0
    return limit > 0 ? list.slice(0, limit) : list
}
