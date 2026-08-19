/**
 * Api — everything that talks to the network, and nothing that renders.
 *
 * Imports nothing, so it can be read, tested or reused on its own.
 */

const BASE_URL = "https://syncsphere-hiv6.onrender.com"
const COURSES_URL = `${BASE_URL}/assignment/course-data`
const COUNTRY_URL = `${BASE_URL}/assignment/country-code`

// The API returns a 404 or 500 on roughly 1 in 3 calls, on purpose. One
// automatic retry drops that to ~1 in 9 without pretending the API is
// healthy: after MAX_ATTEMPTS we stop and show the error state, which the
// visitor can retry by hand. Retrying forever would turn a dead API into a
// spinner that never resolves.
const MAX_ATTEMPTS = 2
const RETRY_DELAY_MS = 400

// This API is on a free tier that cold-starts. A socket that opens and then
// hangs would otherwise leave the skeletons up forever, so every attempt gets
// its own deadline. A timeout is retried like any other failure.
const TIMEOUT_MS = 8000

/**
 * The caller's abort signal, plus a per-attempt deadline.
 *
 * AbortSignal.any and AbortSignal.timeout are recent; where they are missing
 * we simply lose the deadline rather than the request.
 */
function withDeadline(signal) {
    if (
        typeof AbortSignal === "undefined" ||
        typeof AbortSignal.any !== "function" ||
        typeof AbortSignal.timeout !== "function"
    ) {
        return signal
    }
    return AbortSignal.any([signal, AbortSignal.timeout(TIMEOUT_MS)])
}

/** setTimeout that gives up if the component unmounts mid-wait. */
function wait(ms, signal) {
    return new Promise((resolve, reject) => {
        // An already-aborted signal never fires "abort" again, so the
        // listener below would never run and this would resolve instead.
        if (signal.aborted) {
            reject(new Error("aborted"))
            return
        }

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
 * Anything beyond a "simple request" makes the browser send a CORS preflight
 * OPTIONS of its own before the GET. This API answers 405 to everything that
 * isn't a GET, so the preflight fails and the GET is never sent — which is
 * what the brief's "everything else returns a 405" line is pointing at. The
 * usual way to trip it is a Content-Type header.
 */
async function getJson(url, signal) {
    let response
    try {
        response = await fetch(url, { signal: withDeadline(signal) })
    } catch (error) {
        // The deadline aborts the fetch; say that plainly instead of
        // surfacing "signal is aborted without reason".
        if (error && error.name === "TimeoutError") {
            throw new Error(`Request timed out after ${TIMEOUT_MS / 1000}s`)
        }
        throw error
    }

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
            // An abort is the caller leaving, not a failure worth retrying.
            if (signal.aborted) throw error
            lastError = error
            if (attempt < MAX_ATTEMPTS) await wait(RETRY_DELAY_MS, signal)
        }
    }

    throw lastError
}

/** Resolves to an array, always — the shape is trusted only as far as checked. */
export function fetchCourses(signal) {
    return getJsonWithRetry(COURSES_URL, signal).then((data) =>
        Array.isArray(data) ? data : []
    )
}

/** Resolves to "IN" or "US". Anything else is treated as "IN". */
export function fetchCountry(signal) {
    return getJsonWithRetry(COUNTRY_URL, signal).then((data) =>
        data && data.country_code === "US" ? "US" : "IN"
    )
}
