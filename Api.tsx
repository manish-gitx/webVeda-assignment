/**
 * Api — everything that talks to the network, and nothing that renders.
 *
 * Plain JavaScript (see the note at the top of Tokens.tsx about the extension).
 */

export const DEFAULT_BASE_URL = "https://syncsphere-hiv6.onrender.com"

export const COURSES_PATH = "/assignment/course-data"
export const COUNTRY_PATH = "/assignment/country-code"

// The API answers with a 404 or 500 on roughly one call in three, on purpose.
// One automatic retry takes that to about one in nine, which is honest about a
// flaky dependency without hiding a genuinely dead one.
export const DEFAULT_ATTEMPTS = 2
export const DEFAULT_RETRY_DELAY_MS = 400

/** A setTimeout that gives up if the caller aborts mid-wait. */
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
 * A bare GET. No method, no headers, no body.
 *
 * Anything beyond a "simple request" makes the browser fire a CORS preflight
 * OPTIONS before the GET, and this API only answers GET — which is what the
 * brief's "everything else returns a 405" line is pointing at.
 */
async function getJson(url, signal) {
    const response = await fetch(url, { signal })
    if (!response.ok) {
        throw new Error(`Request failed with ${response.status}`)
    }
    return response.json()
}

async function getJsonWithRetry(url, signal, attempts, delayMs) {
    const total = Math.max(1, Number(attempts) || 1)
    let lastError

    for (let attempt = 1; attempt <= total; attempt++) {
        try {
            return await getJson(url, signal)
        } catch (error) {
            if (signal.aborted) throw error
            lastError = error
            if (attempt < total) await wait(delayMs, signal)
        }
    }

    throw lastError
}

/** Strips a trailing slash so baseUrl + path never doubles up. */
function normaliseBaseUrl(value) {
    const url = String(value == null ? "" : value).trim()
    if (!url) return DEFAULT_BASE_URL
    return url.replace(/\/+$/, "")
}

/**
 * Builds a small client bound to one configuration.
 *
 * Taking the config once, here, is what keeps the retry policy and the base URL
 * out of the components: they ask for courses, not for a fetch.
 */
export function createApi(options) {
    const config = options || {}
    const baseUrl = normaliseBaseUrl(config.baseUrl)
    const attempts = Math.max(1, Math.min(5, Number(config.attempts) || DEFAULT_ATTEMPTS))
    const delayMs = Math.max(0, Number(config.delayMs) || DEFAULT_RETRY_DELAY_MS)

    return {
        baseUrl,

        fetchCourses(signal) {
            return getJsonWithRetry(baseUrl + COURSES_PATH, signal, attempts, delayMs).then(
                // Trust the shape only as far as we can check it.
                (data) => (Array.isArray(data) ? data : [])
            )
        },

        fetchCountry(signal) {
            return getJsonWithRetry(baseUrl + COUNTRY_PATH, signal, attempts, delayMs).then(
                (data) => (data && data.country_code === "US" ? "US" : "IN")
            )
        },
    }
}
