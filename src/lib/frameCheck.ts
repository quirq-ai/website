// Whether a web page can open in a window on this site, in an iframe. A site decides that with its
// response headers (X-Frame-Options, or CSP frame-ancestors), and the browser hides the answer from the
// page that frames it: a refused frame just shows the browser's own error. So /api/frame-check
// (src/api/frame-check.ts) reads the headers on the server, and the window shows "Oops" with an Open in
// new tab button for a page that refuses, can't be reached, or isn't there. Pure functions, so the
// server, the window and the tests share them.

/**
 * `allowed`: frame it. `unknown`: the check couldn't tell (no server, an unusual address), so frame it
 * and keep Open in new tab at hand. Any other verdict shows "Oops" instead of a frame.
 */
export type FrameVerdict = 'allowed' | 'unknown' | 'refused' | 'unreachable' | 'missing' | 'insecure'
export type FrameCheck = { verdict: FrameVerdict; reason?: string }

const verdicts: FrameVerdict[] = ['allowed', 'unknown', 'refused', 'unreachable', 'missing', 'insecure']

/** Whether a value (the check's JSON) is a frame check. */
export const isFrameCheck = (value: unknown): value is FrameCheck =>
    !!value &&
    typeof value === 'object' &&
    verdicts.includes((value as FrameCheck).verdict) &&
    ((value as FrameCheck).reason === undefined || typeof (value as FrameCheck).reason === 'string')

/** Pages that refuse every frame, so their windows say so at once, without asking the server. */
const REFUSING_HOSTS = ['github.com', 'gist.github.com']

/** A host without www. or a trailing dot, in lower case. */
export const plainHost = (url: string): string => {
    try {
        return new URL(url).hostname
            .toLowerCase()
            .replace(/\.+$/, '')
            .replace(/^www\./, '')
    } catch {
        return ''
    }
}

/** What is known about framing a URL before asking the server: an insecure or known refusing page. */
export function knownFrameCheck(url: string): FrameCheck | null {
    let parsed: URL
    try {
        parsed = new URL(url)
    } catch {
        return { verdict: 'unreachable', reason: 'It isn’t a web address.' }
    }
    // A secure page can't show an insecure one (mixed content).
    if (parsed.protocol !== 'https:')
        return { verdict: 'insecure', reason: 'It isn’t a secure (https) page, so this secure site can’t show it.' }
    if (REFUSING_HOSTS.includes(plainHost(url)))
        return { verdict: 'refused', reason: `${plainHost(url)} doesn’t let other sites show it in a window.` }
    return null
}

type Headers = Record<string, string | string[] | undefined>

const header = (headers: Headers, name: string): string => {
    const value = headers[name] ?? headers[name.toLowerCase()]
    return Array.isArray(value) ? value.join(', ') : value || ''
}

/**
 * A policy's frame-ancestors sources, or null when it has none. An empty list allows no one. Several
 * policies arrive as one header joined by commas, each enforced on its own.
 */
export function frameAncestors(policy: string): string[] | null {
    for (const directive of policy.split(';')) {
        const [name, ...sources] = directive.trim().split(/\s+/)
        if (name.toLowerCase() === 'frame-ancestors') return sources.filter(Boolean)
    }
    return null
}

/** Whether a frame-ancestors source list lets `parentOrigin` frame a page from `pageOrigin` (CSP 3). */
export function ancestorAllowed(sources: string[], parentOrigin: string, pageOrigin: string): boolean {
    let parent: URL
    try {
        parent = new URL(parentOrigin)
    } catch {
        return false
    }
    const page = new URL(pageOrigin)
    const schemeMatches = (scheme: string) =>
        scheme === parent.protocol || (scheme === 'http:' && parent.protocol === 'https:')
    return sources.some((raw) => {
        const source = raw.toLowerCase()
        if (source === "'none'") return false
        if (source === "'self'") return parent.origin === page.origin
        if (source === '*') return /^https?:$/.test(parent.protocol)
        if (/^[a-z][a-z\d+.-]*:$/.test(source)) return schemeMatches(source)
        const match =
            /^(?:([a-z][a-z\d+.-]*):\/\/)?(\*|(?:\*\.)?[a-z\d-]+(?:\.[a-z\d-]+)*)(?::(\d+|\*))?(?:\/.*)?$/.exec(source)
        if (!match) return false
        const [, scheme, host, port] = match
        // Without a scheme, a source means the page's own (or its secure upgrade).
        if (!schemeMatches(scheme ? `${scheme}:` : page.protocol)) return false
        if (host.startsWith('*.') ? !parent.hostname.endsWith(host.slice(1)) : host !== '*' && host !== parent.hostname)
            return false
        if (port === '*') return true
        const parentPort = parent.port || (parent.protocol === 'https:' ? '443' : '80')
        return port ? port === parentPort : !parent.port
    })
}

/**
 * The verdict a page's response gives: refused when its headers keep `parentOrigin` from framing it,
 * or it downloads a file; missing when it isn't there. CSP frame-ancestors overrides X-Frame-Options.
 */
export function frameVerdict(status: number, headers: Headers, url: string, parentOrigin: string): FrameCheck {
    const host = plainHost(url)
    if (status === 404 || status === 410) return { verdict: 'missing', reason: `${host} says this page doesn’t exist.` }
    if (/^\s*attachment\b/i.test(header(headers, 'content-disposition')))
        return { verdict: 'refused', reason: `${host} sends a file to download here, not a page.` }
    const refused: FrameCheck = { verdict: 'refused', reason: `${host} doesn’t let other sites show it in a window.` }
    const pageOrigin = new URL(url).origin
    const policies = header(headers, 'content-security-policy')
        .split(',')
        .map(frameAncestors)
        .filter((sources): sources is string[] => sources !== null)
    if (policies.length)
        return policies.every((sources) => ancestorAllowed(sources, parentOrigin, pageOrigin))
            ? { verdict: 'allowed' }
            : refused
    const options = header(headers, 'x-frame-options')
        .toLowerCase()
        .split(',')
        .map((value) => value.trim())
    if (options.includes('deny')) return refused
    if (options.includes('sameorigin') && pageOrigin !== parentOrigin) return refused
    return { verdict: 'allowed' }
}

/**
 * A URL the server may fetch to check: https on the standard port, no credentials, a public host name
 * (no IP address, no single-label or reserved name). Its addresses are checked when it is resolved.
 */
export function probeableUrl(value: string): URL | null {
    try {
        const url = new URL(value)
        const host = url.hostname.toLowerCase()
        if (url.protocol !== 'https:' || url.username || url.password || url.port) return null
        if (!host.includes('.') || host.endsWith('.') || host.startsWith('[') || /^[\d.]+$/.test(host)) return null
        if (/\.(localhost|local|internal|intranet|lan|home|corp|test|example|invalid|onion|arpa)$/.test(host))
            return null
        return url
    } catch {
        return null
    }
}

/** Whether a resolved address is on the public internet: not private, loopback, link-local or reserved. */
export function isPublicAddress(address: string): boolean {
    const v4 = address.replace(/^::ffff:/i, '')
    const parts = v4.split('.')
    if (parts.length === 4) {
        const [a, b, c] = parts.map(Number)
        if (!parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) <= 255)) return false
        return !(
            a === 0 ||
            a === 10 ||
            a === 127 ||
            (a === 100 && b >= 64 && b <= 127) ||
            (a === 169 && b === 254) ||
            (a === 172 && b >= 16 && b <= 31) ||
            (a === 192 && b === 0 && c === 0) ||
            (a === 192 && b === 168) ||
            (a === 198 && (b === 18 || b === 19)) ||
            a >= 224
        )
    }
    const v6 = address.toLowerCase()
    if (!v6.includes(':')) return false
    return !(
        v6 === '::' ||
        v6 === '::1' ||
        /^f[cd]/.test(v6) ||
        /^fe[89ab]/.test(v6) ||
        /^ff/.test(v6) ||
        v6.startsWith('::ffff:') ||
        v6.startsWith('64:ff9b:') ||
        v6.startsWith('2001:db8:')
    )
}
