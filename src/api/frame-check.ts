import https from 'node:https'
import dns from 'node:dns'
import type { LookupFunction } from 'node:net'
import type { GatsbyFunctionRequest, GatsbyFunctionResponse } from 'gatsby'
import { followFrameCheck, isPublicAddress, type FrameCheck, type FrameResponse } from '../lib/frameCheck'

// GET /api/frame-check?url=<https page>&origin=<this site's origin>: whether the page lets this site
// show it in a window (src/lib/frameCheck.ts). The browser can't read another site's headers, so this
// is the site's only server code. It reads a response's status and headers, never its body, and only
// from public https hosts: every address a host resolves to must be public, so it can't be pointed at
// a private network.

const TIMEOUT_MS = 6000
// The whole check, redirects included; the window gives up a little later (quirq-launch.tsx).
const TOTAL_MS = 8000
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
function head(url: URL, timeoutMs: number): Promise<FrameResponse> {
    return new Promise((resolve, reject) => {
        const request = https.request(
            url,
            {
                method: 'GET',
                lookup: publicLookup,
                timeout: Math.min(timeoutMs, TIMEOUT_MS),
                headers: {
                    accept: 'text/html,application/xhtml+xml,*/*;q=0.8',
                    'user-agent': 'Mozilla/5.0 (compatible; quirq-frame-check; +https://quirq.dev)',
                    'sec-fetch-dest': 'iframe',
                    'sec-fetch-mode': 'navigate',
                    'sec-fetch-site': 'cross-site',
                },
            },
            (response) => {
                clearTimeout(deadline)
                resolve({ status: response.statusCode || 0, headers: response.headers })
                response.destroy()
            }
        )
        // `timeout` fires only on silence; a host that trickles its headers is cut off here.
        const deadline = setTimeout(() => request.destroy(new Error('timed out')), timeoutMs)
        request.on('timeout', () => request.destroy(new Error('timed out')))
        request.on('error', (error) => {
            clearTimeout(deadline)
            reject(error)
        })
        request.end()
    })
}

/** Follows redirects (each hop checked like the first) and judges the page the frame would show. */
export const checkFrame = (value: string, parentOrigin: string): Promise<FrameCheck> =>
    followFrameCheck(value, parentOrigin, head, Date.now() + TOTAL_MS, MAX_REDIRECTS)

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
    // Only this site's own pages ask; a browser on another site (Sec-Fetch-Site) is turned away.
    const site = req.headers['sec-fetch-site']
    if (site && site !== 'same-origin') return res.status(403).json({ verdict: 'unknown' })
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
