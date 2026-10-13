// A visit to the home page lands on the desktop with no window open; the dock's Home opens Home base.

/** Marks the landing visit's history entry, so going Back to it shows the desktop as it is. */
export const LANDING_STATE = 'quirqLanding'

/** Whether a path is the home page, `/`. */
export function isLandingPath(pathname: string): boolean {
    return (pathname.replace(/\/+$/, '') || '/') === '/'
}

/**
 * Whether a page load starts with no window open: a visit to `/` itself. A shared `?windows=` link
 * opens its own windows, and a framed page has no dock to open Home base from, so it opens Home.
 */
export function startsOnDesktop({
    pathname,
    framed,
    sharedWindows,
}: {
    pathname: string
    framed: boolean
    sharedWindows: boolean
}): boolean {
    return isLandingPath(pathname) && !framed && !sharedWindows
}
