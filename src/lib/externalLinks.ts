// Rule (AGENTS.md): every link that leaves this site opens in a window on this site, the page in an
// iframe (/launch/web/<address>). A page that refuses frames, can't be reached or isn't there shows
// "Oops" with an Open in new tab button instead. Links marked with NEW_TAB_ATTRIBUTE (the Open in new
// tab buttons themselves), and clicks with a modifier key, open in a new tab.

/** The attributes an external link carries, so it opens in a new tab without JavaScript. */
export const NEW_TAB = { target: '_blank', rel: 'noopener noreferrer' } as const

/** On a link, or around it: the link really opens in a new tab, not in a window here. */
export const NEW_TAB_ATTRIBUTE = 'data-new-tab'

/** A web page from another site opens in a window at this path plus its address. */
export const WEB_WINDOW_ROOT = '/launch/web'

/**
 * An absolute web address (https://…, http://… or //…). The same answer on the server and in the
 * browser, so a link's target never differs between the two renders.
 */
export const isAbsoluteWebUrl = (href: string | null | undefined): boolean =>
    !!href && /^(https?:)?\/\//i.test(href.trim())

/** Whether a link, resolved against the page it is on, goes to another site over http(s). */
export function leavesSite(href: string | null | undefined, pageHref: string): boolean {
    if (!href) return false
    try {
        const url = new URL(href, pageHref)
        return /^https?:$/.test(url.protocol) && url.origin !== new URL(pageHref).origin
    } catch {
        return false
    }
}

/** The window path for a web page: /launch/web/ and its address without the scheme. */
export function webWindowPath(url: string): string {
    const page = new URL(url)
    return `${WEB_WINDOW_ROOT}/${page.host}${page.pathname}${page.search}${page.hash}`
}

/** The page a /launch/web/<address> path names, over https, or null for any other path. */
export function webWindowUrl(pathname: string, search = '', hash = ''): string | null {
    if (!pathname.startsWith(`${WEB_WINDOW_ROOT}/`)) return null
    try {
        const url = new URL(`https://${pathname.slice(WEB_WINDOW_ROOT.length + 1)}${search}${hash}`)
        return url.hostname ? url.href : null
    } catch {
        return null
    }
}

/** A web window's title: the page's address without the scheme, www. or a trailing slash. */
export function webWindowTitle(url: string): string {
    try {
        const page = new URL(url)
        const title = `${page.host.replace(/^www\./, '')}${page.pathname.replace(/\/+$/, '')}`
        return title.length > 60 ? `${title.slice(0, 59)}…` : title
    } catch {
        return url
    }
}

/**
 * What a click on a link opens in a window passes along: the page itself. A web window frames only a
 * page a click on this site named, so an address someone else crafted never shows inside this site.
 */
export type WebWindowState = { newWindow: true; webFrame: string }

/**
 * Sends a click on a link to another site to a window on this site (`open`, Gatsby's navigate) instead
 * of the browser. A link to this site's own host (`siteHosts`, without www.) opens here as a page.
 * Clicks the page already handled (in-app doc links, Gatsby navigation, a dragged icon), clicks with a
 * modifier key, downloads and links marked NEW_TAB_ATTRIBUTE are left to the browser.
 */
export function openExternalLinksInWindows(
    doc: Document,
    open: (path: string, state?: WebWindowState | { newWindow: true }) => void,
    siteHosts: string[] = []
): () => void {
    const onClick = (event: MouseEvent) => {
        if (event.defaultPrevented || event.button !== 0) return
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
        const anchor = (event.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null
        if (!anchor || anchor.hasAttribute('download') || anchor.closest(`[${NEW_TAB_ATTRIBUTE}]`)) return
        const href = anchor.getAttribute('href')
        if (!leavesSite(href, doc.location.href)) return
        const url = new URL(href as string, doc.location.href)
        event.preventDefault()
        if (siteHosts.includes(url.hostname.toLowerCase().replace(/^www\./, '')))
            return open(`${url.pathname}${url.search}${url.hash}`, { newWindow: true })
        open(webWindowPath(url.href), { newWindow: true, webFrame: url.href })
    }
    doc.addEventListener('click', onClick)
    return () => doc.removeEventListener('click', onClick)
}
