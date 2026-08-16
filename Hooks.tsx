/**
 * Hooks — the stateful glue. Data fetching and responsive measurement, with no
 * markup of their own, so the components stay declarative.
 *
 * Plain JavaScript (see the note at the top of Tokens.tsx about the extension).
 */

import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from "react"
import { createApi } from "./Api.tsx"

// Framer prerenders published pages, where useLayoutEffect would warn. Falling
// back to useEffect on the server keeps the console clean without giving up
// the pre-paint measurement in the browser.
const useIsomorphicLayoutEffect =
    typeof window === "undefined" ? useEffect : useLayoutEffect

/* --------------------------------- columns --------------------------------- */

/**
 * Column count from the component's OWN width, not the viewport.
 *
 * Inside Framer the component renders in a frame on the canvas, so a viewport
 * media query reports the browser window and returns the wrong count. A
 * ResizeObserver on our own node is correct on the canvas and on the published
 * site, and it keeps the breakpoints configurable from the panel.
 */
export function useColumns(ref, breakpoints) {
    const config = breakpoints || {}
    const tabletMin = Number(config.tabletMin) || 640
    const desktopMin = Number(config.desktopMin) || 960
    const mobile = Math.max(1, Number(config.mobile) || 1)
    const tablet = Math.max(1, Number(config.tablet) || 2)
    const desktop = Math.max(1, Number(config.desktop) || 3)

    const [columns, setColumns] = useState(desktop)

    const columnsFor = (width) =>
        width >= desktopMin ? desktop : width >= tabletMin ? tablet : mobile

    useIsomorphicLayoutEffect(() => {
        const node = ref.current
        if (!node) return

        // Measure once, before the browser paints. Waiting for the observer's
        // first callback would show one frame of the desktop grid on a phone.
        setColumns(columnsFor(node.getBoundingClientRect().width))

        if (typeof ResizeObserver === "undefined") return
        const observer = new ResizeObserver((entries) => {
            const width = entries[0] ? entries[0].contentRect.width : 0
            setColumns(columnsFor(width))
        })

        observer.observe(node)
        return () => observer.disconnect()
    }, [ref, tabletMin, desktopMin, mobile, tablet, desktop])

    return columns
}

/* ---------------------------------- courses -------------------------------- */

/**
 * Loads courses and the country code, and reports one of four states:
 * "loading", "error", "ready" (with zero or more courses) — plus a separate
 * countryFailed flag, because a dead country lookup is a different, smaller
 * problem than a dead course list.
 */
export function useCourses(options) {
    const config = options || {}
    const baseUrl = config.baseUrl
    const attempts = config.attempts
    const delayMs = config.delayMs

    const [status, setStatus] = useState("loading")
    const [courses, setCourses] = useState([])
    const [errorMessage, setErrorMessage] = useState("")
    const [country, setCountry] = useState("IN")
    const [countryFailed, setCountryFailed] = useState(false)
    // "Settled" is not the same as "failed": while the lookup is still in
    // flight the fallback currency is a guess, and printing a guess without
    // saying so is worse than briefly withholding the number.
    const [countryReady, setCountryReady] = useState(false)

    // Bumping this re-runs the effect below; that is the whole retry button.
    const [reloadCount, setReloadCount] = useState(0)
    const reload = useCallback(() => setReloadCount((n) => n + 1), [])

    // Rebuilding the client only when its configuration changes keeps the
    // effect below from re-firing on every render.
    const api = useMemo(
        () => createApi({ baseUrl, attempts, delayMs }),
        [baseUrl, attempts, delayMs]
    )

    useEffect(() => {
        const controller = new AbortController()
        const signal = controller.signal

        setStatus("loading")
        setErrorMessage("")
        setCountryReady(false)

        // Two independent requests, deliberately not chained. The grid is the
        // point of the section, so a dead country lookup must not block it —
        // it only downgrades us to the fallback currency.
        api.fetchCountry(signal)
            .then((code) => {
                if (signal.aborted) return
                setCountry(code)
                setCountryFailed(false)
                setCountryReady(true)
            })
            .catch(() => {
                if (signal.aborted) return
                setCountry("IN")
                setCountryFailed(true)
                setCountryReady(true)
            })

        api.fetchCourses(signal)
            .then((list) => {
                if (signal.aborted) return
                setCourses(list)
                setStatus("ready")
            })
            .catch((error) => {
                if (signal.aborted) return
                setErrorMessage(error instanceof Error ? error.message : "Unknown error")
                setStatus("error")
            })

        return () => controller.abort()
    }, [api, reloadCount])

    return { status, courses, errorMessage, country, countryFailed, countryReady, reload }
}

/** Small helper so components can keep a ref without importing useRef too. */
export function useNode() {
    return useRef(null)
}
