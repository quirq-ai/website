import test from 'node:test'
import assert from 'node:assert/strict'
import {
    ancestorAllowed,
    frameAncestors,
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
