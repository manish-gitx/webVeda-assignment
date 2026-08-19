/**
 * Hooks — the stateful glue: data loading and responsive measurement, with no
 * markup of their own, so the components stay declarative.
 */

import { useCallback, useEffect, useLayoutEffect, useState } from "react"
import { fetchCountry, fetchCourses } from "./Api.tsx"

// Framer prerenders published pages, where useLayoutEffect would warn. Falling
// back to useEffect on the server keeps the console clean without giving up
// the pre-paint measurement in the browser.
const useIsomorphicLayoutEffect =
    typeof window === "undefined" ? useEffect : useLayoutEffect

// Column breakpoints, measured against the component's own width.
const TABLET_MIN_WIDTH = 640
const DESKTOP_MIN_WIDTH = 960

/** Fallback currency when the country lookup can't tell us. */
const FALLBACK_COUNTRY = "IN"

/**
 * Column count from the component's OWN width, not the viewport.
 *
 * Inside Framer the component renders in a frame on the canvas, so a viewport
 * media query reports the browser window and returns the wrong count. A
 * ResizeObserver on our own node is right on the canvas and on the published
 * site. 3 / 2 / 1 as the brief specifies.
 */
export function useColumns(ref) {
    const [columns, setColumns] = useState(3)

    useIsomorphicLayoutEffect(() => {
        const node = ref.current
        if (!node) return

        const measure = (width) =>
            setColumns(
                width >= DESKTOP_MIN_WIDTH ? 3 : width >= TABLET_MIN_WIDTH ? 2 : 1
            )

        // Measure once before the browser paints. Waiting for the observer's
        // first callback shows one frame of the desktop grid on a phone.
        measure(node.getBoundingClientRect().width)

        if (typeof ResizeObserver === "undefined") return
        const observer = new ResizeObserver((entries) => {
            const width = entries[0] ? entries[0].contentRect.width : 0
            measure(width)
        })
        observer.observe(node)
        return () => observer.disconnect()
    }, [ref])

    return columns
}

/**
 * Loads the courses and the country code and reports one of three statuses:
 * "loading", "error", or "ready" with zero or more courses.
 *
 * countryFailed is kept separate from status because a dead country lookup is
 * a smaller, different problem than a dead course list — it costs us the
 * currency, not the page.
 */
export function useCourses() {
    const [status, setStatus] = useState("loading") // loading | error | ready
    const [courses, setCourses] = useState([])
    const [errorMessage, setErrorMessage] = useState("")

    const [country, setCountry] = useState(FALLBACK_COUNTRY)
    const [countryFailed, setCountryFailed] = useState(false)
    // "Settled" is not the same as "failed": while the lookup is in flight the
    // currency is still unknown, and printing a guess we may have to swap a
    // moment later is worse than briefly withholding the number.
    const [countryReady, setCountryReady] = useState(false)

    // Bumping this re-runs the effect below; that is the whole retry button.
    const [reloadCount, setReloadCount] = useState(0)
    const reload = useCallback(() => setReloadCount((n) => n + 1), [])

    useEffect(() => {
        const controller = new AbortController()
        const { signal } = controller

        setStatus("loading")
        setErrorMessage("")
        setCountryReady(false)

        // Two independent requests, deliberately not chained. The grid is the
        // point of the section, so a dead country lookup must not stop it — it
        // only downgrades us to the fallback currency. Chaining them would let
        // a 1-in-3 currency lookup take down the whole section.
        fetchCountry(signal)
            .then((code) => {
                if (signal.aborted) return
                setCountry(code)
                setCountryFailed(false)
                setCountryReady(true)
            })
            .catch(() => {
                if (signal.aborted) return
                setCountry(FALLBACK_COUNTRY)
                setCountryFailed(true)
                setCountryReady(true)
            })

        fetchCourses(signal)
            .then((list) => {
                if (signal.aborted) return
                setCourses(list)
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

    return {
        status,
        courses,
        errorMessage,
        country,
        countryFailed,
        countryReady,
        reload,
    }
}
