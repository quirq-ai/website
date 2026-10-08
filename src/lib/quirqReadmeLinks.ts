import type { QuirqApp } from './quirqApps'
import { isFramableUrl } from '../../scripts/lib/quirq-catalog.mjs'
import type { QuirqIcon } from '../components/QuirqAppIcon/glyphs'

// The links in the organization's profile README, as the desktop shows them: each is an app icon
// (its look) that opens where the link points (its target). Pure functions, so they can be tested.

export type ReadmeLink = { href: string; label: string }

/** How a README link shows on the desktop: the glass glyph and color of an app icon. */
export type ReadmeLinkLook = { icon: QuirqIcon; color: QuirqApp['color'] }

/** Where a README link opens: a window on this site (`to` is a path) or a new tab (`to` is the link). */
export type ReadmeLinkTarget = { to: string; external: boolean }

/** A README link that may open in a window of its own lives at this path plus its address. */
export const README_LAUNCH_ROOT = '/launch/readme'

// What a link is about, read from its address and wording. The first match wins, so a link into a
// repository's install steps shows the install glyph rather than the repository's own icon.
const topics: [RegExp, ReadmeLinkLook][] = [
    [/^mailto:/, { icon: 'mail', color: 'orange' }],
    [/security/, { icon: 'shield', color: 'red' }],
    [/privacy|what-leaves/, { icon: 'shield', color: 'teal' }],
    [/quick-?start|getting-started|\brun\b.*\blocally\b/, { icon: 'terminal', color: 'teal' }],
    [/install/, { icon: 'download', color: 'seagreen' }],
    [/discussion|forum|community/, { icon: 'chat', color: 'blue' }],
    [/support|\bhelp\b/, { icon: 'book', color: 'yellow' }],
    [/contribut/, { icon: 'sprout', color: 'green' }],
    [/\/repositories\b/, { icon: 'apps', color: 'purple' }],
    [/research|whitepaper/, { icon: 'flask', color: 'seagreen' }],
    [/\bcloud\b|\/\/app\./, { icon: 'cloud', color: 'blue' }],
]

/** A URL in comparable form: no scheme, no www., no query or fragment, no trailing slash, lower case. */
export const comparableUrl = (url: string): string =>
    url
        .trim()
        .toLowerCase()
        .replace(/^https?:\/\/(www\.)?/, '')
        .replace(/[?#].*$/, '')
        .replace(/\/+$/, '')

const hostOf = (url: string): string | null => {
    try {
        return new URL(url).hostname
            .toLowerCase()
            .replace(/\.+$/, '')
            .replace(/^www\./, '')
    } catch {
        return null
    }
}

/**
 * The app a README link opens, if it is one in the catalog: its website, launch address, or
 * repository. `.github` is skipped: its homepage is the quirq website, which is `quirq_ai`'s.
 */
export function readmeLinkApp(href: string, apps: QuirqApp[]): QuirqApp | undefined {
    const target = comparableUrl(href)
    return apps.find(
        (app) =>
            app.repo !== '.github' &&
            [app.launchUrl, app.homepage, app.repoUrl].some((url) => url && comparableUrl(url) === target)
    )
}

/** The look of a README link: by topic, else the catalog app it opens, else a web page or a document. */
export function readmeLinkLook(href: string, label: string, apps: QuirqApp[]): ReadmeLinkLook {
    const text = `${href} ${label}`.toLowerCase()
    const topic = topics.find(([pattern]) => pattern.test(text))
    if (topic) return topic[1]
    const app = readmeLinkApp(href, apps)
    if (app) return { icon: app.icon, color: app.color }
    return /^https?:\/\/github\.com\//i.test(href)
        ? { icon: 'document', color: 'purple' }
        : { icon: 'browser', color: 'lilac' }
}

/** A link's text as an icon label or window title: no markup, no trailing arrow. */
export const readmeLinkLabel = (text: string): string =>
    text
        .replace(/<[^>]*>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/[*_`]+/g, '')
        .replace(/\s+/g, ' ')
        .replace(/\s*(?:↗|→|->)\s*$/, '')
        .trim()

/**
 * Whether a README link may open in a window here: a web page on an origin listed in `frameOrigins`
 * (quirq.apps.json), and never this site (which never frames itself) or GitHub (which refuses to be
 * framed). `siteHosts` are this site's hosts, without www. The README is read live, so any other link,
 * whoever added it, opens in a new tab.
 */
export function canFrameReadmeLink(href: string, siteHosts: string[], frameOrigins: string[]): boolean {
    if (!/^https?:\/\//i.test(href) || !isFramableUrl(href, frameOrigins)) return false
    const host = hostOf(href)
    return !!host && host !== 'github.com' && !host.endsWith('.github.com') && !siteHosts.includes(host)
}

/** The window path for a README link: /launch/readme/ and its address in comparable form. */
export const readmeLinkPath = (href: string): string => `${README_LAUNCH_ROOT}/${comparableUrl(href)}`

/** The comparable address a /launch/readme/<address> path names, or null for any other path. */
export function readmeLinkAddress(pathname: string): string | null {
    if (!pathname.startsWith(`${README_LAUNCH_ROOT}/`)) return null
    try {
        const address = comparableUrl(decodeURIComponent(pathname.slice(README_LAUNCH_ROOT.length + 1)))
        return address || null
    } catch {
        return null
    }
}

/**
 * Where a README link opens. A link to an app's website opens that app the way Launch does: its own
 * window (/launch/<repository>) when the catalog says so, else a new tab. Another web page opens in a
 * window of its own, framed from the README (/launch/readme/<address>). A link to this site opens here;
 * GitHub, mail and anything else open in a new tab.
 */
export function readmeLinkTarget(
    href: string,
    apps: QuirqApp[],
    siteHosts: string[],
    frameOrigins: string[]
): ReadmeLinkTarget {
    const host = hostOf(href)
    if (host && siteHosts.includes(host) && /^https?:\/\//i.test(href)) {
        const url = new URL(href)
        return { to: `${url.pathname}${url.search}${url.hash}`, external: false }
    }
    // An app is its launch address or its website: Docs launches at its Start page, docs.quirq.dev/docs/start,
    // but the README links its homepage.
    const address = comparableUrl(href)
    const app = apps.find(
        (entry) =>
            entry.repo !== '.github' &&
            entry.launchUrl &&
            [entry.launchUrl, entry.homepage].some((url) => url && comparableUrl(url) === address)
    )
    if (app) {
        return app.launchMode === 'window'
            ? { to: `/launch/${app.repo}`, external: false }
            : { to: href, external: true }
    }
    if (canFrameReadmeLink(href, siteHosts, frameOrigins)) return { to: readmeLinkPath(href), external: false }
    return { to: href, external: true }
}

/** Resolves a README link the way GitHub does for the profile, keeping only web and mail links. */
function resolveLink(href: string, base: string): string {
    if (!href || href.startsWith('#')) return ''
    try {
        const url = new URL(href.replace(/&amp;/g, '&'), base)
        return /^(https?|mailto):$/.test(url.protocol) ? url.href : ''
    } catch {
        return ''
    }
}

/** Every link in the README's Markdown and HTML, resolved against `base`, with its text. */
export function readmeLinks(markdown: string, base: string): ReadmeLink[] {
    const found: ReadmeLink[] = []
    const anchors = /<a\s[^>]*?href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi
    const markdownLinks = /(!?)\[([^\]]*)\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g
    let match: RegExpExecArray | null
    while ((match = anchors.exec(markdown))) {
        found.push({ href: resolveLink(match[1], base), label: readmeLinkLabel(match[2]) })
    }
    while ((match = markdownLinks.exec(markdown))) {
        // An image (![alt](src)) is not a link.
        if (match[1] !== '!') found.push({ href: resolveLink(match[3], base), label: readmeLinkLabel(match[2]) })
    }
    return found.filter((link) => link.href && link.label)
}

/**
 * The README link a /launch/readme/<address> path names, if the README has one there that may be
 * framed. The frame shows the README's own link, never an address taken from the path.
 */
export function readmeLinkAt(
    pathname: string,
    links: ReadmeLink[],
    siteHosts: string[],
    frameOrigins: string[]
): ReadmeLink | undefined {
    const address = readmeLinkAddress(pathname)
    if (!address) return undefined
    return links.find(
        (link) => comparableUrl(link.href) === address && canFrameReadmeLink(link.href, siteHosts, frameOrigins)
    )
}

/** This site's hosts, without www.: the page's own and the canonical one. Browser only. */
export function siteHosts(): string[] {
    const hosts = [hostOf(window.location.href) as string]
    const canonical = process.env.GATSBY_SITE_URL ? hostOf(process.env.GATSBY_SITE_URL) : null
    if (canonical && !hosts.includes(canonical)) hosts.push(canonical)
    return hosts
}
