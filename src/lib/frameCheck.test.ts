import test from 'node:test'
import assert from 'node:assert/strict'
import {
    ancestorAllowed,
    frameAncestors,
    followFrameCheck,
    frameVerdict,
    isFrameCheck,
    isPublicAddress,
    knownFrameCheck,
    probeableUrl,
} from './frameCheck.ts'

const site = 'https://www.quirq.dev'
const page = 'https://app.example.com/start'

test('insecure pages and pages known to refuse say so before any request', () => {
    assert.equal(knownFrameCheck('http://example.com/')?.verdict, 'insecure')
    assert.equal(knownFrameCheck('https://github.com/quirq-ai/qq')?.verdict, 'refused')
    assert.equal(knownFrameCheck('https://www.github.com/quirq-ai')?.verdict, 'refused')
    assert.equal(knownFrameCheck('https://gist.github.com/x')?.verdict, 'refused')
    assert.equal(knownFrameCheck('not a url')?.verdict, 'unreachable')
    // GitHub Pages sites may allow frames; only a request can tell.
    assert.equal(knownFrameCheck('https://quirq-ai.github.io/'), null)
    assert.equal(knownFrameCheck('https://docs.quirq.dev/'), null)
})

test('X-Frame-Options refuses with DENY, and with SAMEORIGIN for another site', () => {
    const verdict = (headers: Record<string, string>) => frameVerdict(200, headers, page, site).verdict
    assert.equal(verdict({}), 'allowed')
    assert.equal(verdict({ 'x-frame-options': 'DENY' }), 'refused')
    assert.equal(verdict({ 'x-frame-options': 'sameorigin' }), 'refused')
    assert.equal(verdict({ 'x-frame-options': 'SAMEORIGIN, DENY' }), 'refused')
    // ALLOW-FROM is obsolete; browsers ignore it.
    assert.equal(verdict({ 'x-frame-options': 'ALLOW-FROM https://www.quirq.dev' }), 'allowed')
    assert.equal(frameVerdict(200, { 'x-frame-options': 'SAMEORIGIN' }, `${site}/x`, site).verdict, 'allowed')
})

test('CSP frame-ancestors decides when present, over X-Frame-Options, in every policy', () => {
    const verdict = (csp: string, xfo = '') =>
        frameVerdict(200, { 'content-security-policy': csp, 'x-frame-options': xfo }, page, site).verdict
    assert.equal(verdict("default-src 'self'; frame-ancestors 'none'"), 'refused')
    assert.equal(verdict("frame-ancestors 'self'"), 'refused')
    assert.equal(verdict('frame-ancestors https://www.quirq.dev', 'DENY'), 'allowed', 'CSP overrides XFO')
    assert.equal(verdict('frame-ancestors *.quirq.dev'), 'allowed')
    assert.equal(verdict("default-src 'self'", 'DENY'), 'refused', 'no frame-ancestors: XFO applies')
    // Two policies (two headers, joined by a comma): both must allow.
    assert.equal(verdict("frame-ancestors *, frame-ancestors 'none'"), 'refused')
    assert.equal(verdict('frame-ancestors *, frame-ancestors https:'), 'allowed')
    assert.equal(verdict('frame-ancestors;'), 'refused', 'an empty list allows no one')
    assert.deepEqual(frameAncestors("script-src 'self'"), null)
    assert.deepEqual(frameAncestors("Frame-Ancestors 'self' https://a.dev"), ["'self'", 'https://a.dev'])
})

test('frame-ancestors sources match this site by scheme, host, wildcard and port', () => {
    const allows = (sources: string[], parent = site, pageOrigin = 'https://app.example.com') =>
        ancestorAllowed(sources, parent, pageOrigin)
    assert.ok(allows(['*']))
    assert.ok(allows(['https:']))
    assert.ok(allows(['http:']), 'http: also matches https')
    assert.ok(!allows(['https:'], 'http://localhost:8001'))
    assert.ok(allows(['https://www.quirq.dev']))
    assert.ok(allows(['www.quirq.dev']), 'no scheme: the page’s own')
    assert.ok(allows(['https://*.quirq.dev']))
    assert.ok(!allows(['https://*.quirq.dev'], 'https://quirq.dev'), 'a wildcard needs a subdomain')
    assert.ok(!allows(['https://quirq.dev']))
    assert.ok(!allows(['https://www.quirq.dev.evil.example']))
    assert.ok(!allows(['https://evilquirq.dev'], 'https://quirq.dev'))
    assert.ok(allows(['https://www.quirq.dev:443']))
    assert.ok(!allows(['https://www.quirq.dev:8443']))
    assert.ok(!allows(['localhost'], 'http://localhost:8001', 'http://app.example.com'), 'a port needs naming')
    assert.ok(allows(['localhost:*'], 'http://localhost:8001', 'http://app.example.com'))
    assert.ok(allows(["'self'"], site, site))
    assert.ok(!allows(["'self'"]))
    assert.ok(!allows(["'none'"]))
    assert.ok(!allows([]))
})

test('a missing page or a download is not shown in a frame', () => {
    assert.equal(frameVerdict(404, {}, page, site).verdict, 'missing')
    assert.equal(frameVerdict(410, {}, page, site).verdict, 'missing')
    assert.equal(
        frameVerdict(200, { 'content-disposition': 'attachment; filename=a.zip' }, page, site).verdict,
        'refused'
    )
    assert.equal(frameVerdict(200, { 'content-disposition': 'inline' }, page, site).verdict, 'allowed')
    // Other statuses are judged by their headers: a site's own error page still shows.
    assert.equal(frameVerdict(503, {}, page, site).verdict, 'allowed')
})

test('the server only checks public https hosts', () => {
    assert.ok(probeableUrl('https://docs.quirq.dev/docs/start'))
    for (const url of [
        'http://example.com/',
        'https://user:pass@example.com/',
        'https://example.com:8443/',
        'https://localhost/',
        'https://intranet/',
        'https://127.0.0.1/',
        'https://0x7f.1/',
        'https://[::1]/',
        'https://printer.local/',
        'https://app.internal/',
        'https://example.com./',
        'file:///etc/passwd',
        'not a url',
    ])
        assert.equal(probeableUrl(url), null, url)
    for (const address of ['93.184.215.14', '2606:4700::6810:84e5', '::ffff:93.184.215.14'])
        assert.ok(isPublicAddress(address), address)
    for (const address of [
        '127.0.0.1',
        '10.1.2.3',
        '172.16.0.1',
        '172.31.255.255',
        '192.168.1.1',
        '169.254.169.254',
        '100.64.0.1',
        '0.0.0.0',
        '192.0.0.88',
        '224.0.0.1',
        '::1',
        '::',
        'fd00::1',
        'fe80::1',
        '::ffff:127.0.0.1',
        '::ffff:7f00:1',
        'not an address',
    ])
        assert.ok(!isPublicAddress(address), address)
})

test('only a well-formed verdict from the server is believed', () => {
    assert.ok(isFrameCheck({ verdict: 'refused', reason: 'x' }))
    assert.ok(isFrameCheck({ verdict: 'allowed' }))
    assert.ok(!isFrameCheck({ verdict: 'yes' }))
    assert.ok(!isFrameCheck({ verdict: 'allowed', reason: 1 }))
    assert.ok(!isFrameCheck('<!doctype html>'))
    assert.ok(!isFrameCheck(null))
})

test('a sign-in name in the address opens in a new tab, never in a frame', () => {
    assert.equal(knownFrameCheck('https://user@docs.quirq.dev/')?.verdict, 'refused')
    assert.equal(knownFrameCheck('https://user:pass@example.com/')?.verdict, 'refused')
})

test('IPv6 ranges that embed or stand for private addresses are not public', () => {
    for (const address of [
        '::7f00:1',
        '::127.0.0.1',
        'fec0::1',
        'feff::1',
        '100::1',
        '2001::1',
        '2001:0:4136::1',
        '2002:7f00:1::1',
    ])
        assert.equal(isPublicAddress(address), false, address)
    for (const address of ['2606:4700::1111', '2001:4860:4860::8888', '2a00:1450::1'])
        assert.equal(isPublicAddress(address), true, address)
})

/** A server that answers each URL from a table, recording what it was asked. */
function stubServer(answers: Record<string, { status: number; headers?: Record<string, string> } | Error>) {
    const asked: string[] = []
    const fetchHead = async (url: URL) => {
        asked.push(url.href)
        const answer = answers[url.href]
        if (!answer) throw new Error(`unexpected request to ${url.href}`)
        if (answer instanceof Error) throw answer
        return { status: answer.status, headers: answer.headers || {} }
    }
    return { asked, fetchHead }
}

const later = () => Date.now() + 60_000

test('the server check follows redirects, checking each hop, and judges the last page', async () => {
    const { asked, fetchHead } = stubServer({
        'https://a.example.com/': { status: 301, headers: { location: '/next' } },
        'https://a.example.com/next': { status: 302, headers: { location: 'https://b.example.com/end' } },
        'https://b.example.com/end': { status: 200, headers: { 'x-frame-options': 'DENY' } },
    })
    assert.equal((await followFrameCheck('https://a.example.com/', site, fetchHead, later())).verdict, 'refused')
    assert.deepEqual(asked, ['https://a.example.com/', 'https://a.example.com/next', 'https://b.example.com/end'])
})

test('a redirect to http, a private-looking host or an invalid address is never followed', async () => {
    const verdict = async (location: string) =>
        (
            await followFrameCheck(
                'https://a.example.com/',
                site,
                stubServer({ 'https://a.example.com/': { status: 302, headers: { location } } }).fetchHead,
                later()
            )
        ).verdict
    assert.equal(await verdict('http://a.example.com/'), 'insecure')
    assert.equal(await verdict('https://127.0.0.1/'), 'unknown')
    assert.equal(await verdict('https://intranet/'), 'unknown')
    assert.equal(await verdict('https://db.internal/'), 'unknown')
    assert.equal(await verdict('https://a.example.com:8443/'), 'unknown')
    assert.equal(await verdict('https://[::1]/'), 'unknown')
})

test('the server check stops after the redirect limit, on errors and at its deadline', async () => {
    const loop = stubServer({ 'https://a.example.com/': { status: 302, headers: { location: '/' } } })
    assert.equal(
        (await followFrameCheck('https://a.example.com/', site, loop.fetchHead, later(), 3)).verdict,
        'unreachable'
    )
    assert.equal(loop.asked.length, 4)
    const down = stubServer({ 'https://a.example.com/': new Error('ECONNREFUSED') })
    assert.equal(
        (await followFrameCheck('https://a.example.com/', site, down.fetchHead, later())).verdict,
        'unreachable'
    )
    const slow = stubServer({})
    const late = await followFrameCheck('https://a.example.com/', site, slow.fetchHead, Date.now() - 1)
    assert.equal(late.verdict, 'unreachable')
    assert.deepEqual(slow.asked, [])
    // An address the server may not fetch at all is left to the frame, unchecked.
    assert.equal((await followFrameCheck('https://10.0.0.1/', site, slow.fetchHead, later())).verdict, 'unknown')
})

test('the server check hands each hop the time left before its deadline', async () => {
    const times: number[] = []
    const fetchHead = async (_url: URL, timeoutMs: number) => {
        times.push(timeoutMs)
        return { status: 200, headers: {} }
    }
    await followFrameCheck('https://a.example.com/', site, fetchHead, Date.now() + 5000)
    assert.ok(times[0] > 4000 && times[0] <= 5000, String(times[0]))
})
