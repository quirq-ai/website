import https from 'node:https'
import dns from 'node:dns'
import type { IncomingHttpHeaders } from 'node:http'
import type { LookupFunction } from 'node:net'
import type { GatsbyFunctionRequest, GatsbyFunctionResponse } from 'gatsby'
import { frameVerdict, isPublicAddress, probeableUrl, type FrameCheck } from '../lib/frameCheck'

// GET /api/frame-check?url=<https page>&origin=<this site's origin>: whether the page lets this site
// show it in a window (src/lib/frameCheck.ts). The browser can't read another site's headers, so this
// is the site's only server code. It reads a response's status and headers, never its body, and only
// from public https hosts: every address a host resolves to must be public, so it can't be pointed at
// a private network.

const TIMEOUT_MS = 6000
const MAX_REDIRECTS = 5

const publicLookup: LookupFunction = (hostname, options, callback) => {
    dns.lookup(hostname, { ...options, all: true }, (error, addresses) => {
        if (error) return callback(error, '', 0)
        const list = addresses as dns.LookupAddress[]
        if (!list.length || !list.every((entry) => isPublicAddress(entry.address)))
            return callback(Object.assign(new Error(`${hostname} is not a public host`), { code: 'ENOTPUBLIC' }), '', 0)
        // With `all` (Node's happy-eyeballs connect asks for it), the callback takes the whole list.
        if (options.all)
            return (callback as unknown as (error: null, addresses: dns.LookupAddress[]) => void)(null, list)
        callback(null, list[0].address, list[0].family)
    })
}

/** The status and headers of a GET, as a frame would request it; the body is never read. */
function head(url: URL): Promise<{ status: number; headers: IncomingHttpHeaders }> {
    return new Promise((resolve, reject) => {
        const request = https.request(
            url,
            {
                method: 'GET',
                lookup: publicLookup,
                timeout: TIMEOUT_MS,
                headers: {
                    accept: 'text/html,application/xhtml+xml,*/*;q=0.8',
                    'user-agent': 'Mozilla/5.0 (compatible; quirq-frame-check; +https://quirq.dev)',
                    'sec-fetch-dest': 'iframe',
                    'sec-fetch-mode': 'navigate',
                    'sec-fetch-site': 'cross-site',
                },
            },
            (response) => {
                resolve({ status: response.statusCode || 0, headers: response.headers })
                response.destroy()
            }
        )
        request.on('timeout', () => request.destroy(new Error('timed out')))
        request.on('error', reject)
        request.end()
    })
}

/** Follows redirects (each hop checked like the first) and judges the page the frame would show. */
export async function checkFrame(value: string, parentOrigin: string): Promise<FrameCheck> {
    let url = probeableUrl(value)
    if (!url) return { verdict: 'unknown' }
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
        let response: Awaited<ReturnType<typeof head>>
        try {
            response = await head(url)
        } catch {
            return { verdict: 'unreachable', reason: `${url.hostname} can’t be reached right now.` }
        }
        const location = response.headers.location
        if (response.status >= 300 && response.status < 400 && location) {
            let next: URL
            try {
                next = new URL(location, url)
            } catch {
                return { verdict: 'unreachable', reason: `${url.hostname} redirects to an invalid address.` }
            }
            if (next.protocol === 'http:')
                return { verdict: 'insecure', reason: `${url.hostname} redirects to an insecure (http) page.` }
            const safe = probeableUrl(next.href)
            if (!safe) return { verdict: 'unknown' }
            url = safe
            continue
        }
        return frameVerdict(response.status, response.headers, url.href, parentOrigin)
    }
    return { verdict: 'unreachable', reason: `${url.hostname} redirects too many times.` }
}

const originOf = (value: unknown): string | null => {
    try {
        const url = new URL(String(value))
        return /^https?:$/.test(url.protocol) ? url.origin : null
    } catch {
        return null
    }
}

export default async function handler(req: GatsbyFunctionRequest, res: GatsbyFunctionResponse) {
    if (req.method !== 'GET') return res.status(405).json({ verdict: 'unknown' })
    const url = typeof req.query.url === 'string' ? req.query.url : ''
    const parentOrigin = originOf(req.query.origin) || originOf(process.env.GATSBY_SITE_URL) || 'https://quirq.dev'
    const check = await checkFrame(url, parentOrigin)
    // A site's framing rules rarely change; a failure is worth asking again soon.
    res.setHeader(
        'Cache-Control',
        check.verdict === 'unreachable' ? 'public, max-age=30, s-maxage=60' : 'public, max-age=600, s-maxage=3600'
    )
    return res.status(200).json(check)
}
