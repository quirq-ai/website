import test from 'node:test'
import assert from 'node:assert/strict'
import {
    isAbsoluteWebUrl,
    leavesSite,
    openExternalLinksInWindows,
    webWindowPath,
    webWindowTitle,
    webWindowUrl,
} from './externalLinks.ts'

const page = 'https://www.quirq.dev/apps/qq'

test('absolute web addresses are external on the server and in the browser alike', () => {
    for (const href of [
        'https://github.com/quirq-ai/qq',
        'http://example.com',
        '//cdn.example.com/x',
        ' HTTPS://X.dev ',
    ])
        assert.ok(isAbsoluteWebUrl(href), href)
    for (const href of ['/apps/qq', '#install', 'docs/a.md', 'mailto:a@b.c', '', null, undefined])
        assert.ok(!isAbsoluteWebUrl(href), String(href))
})

test('a link leaves the site when it resolves to another origin over http(s)', () => {
    assert.ok(leavesSite('https://github.com/quirq-ai/qq', page))
    assert.ok(leavesSite('//docs.quirq.dev/docs/start', page))
    assert.ok(leavesSite('https://quirq.dev/', page), 'the bare domain is another origin')
    assert.ok(!leavesSite('/launch/instants', page))
    assert.ok(!leavesSite('https://www.quirq.dev/apps/euler', page))
    assert.ok(!leavesSite('#install', page))
    assert.ok(!leavesSite('mailto:team@quirq.dev', page))
    assert.ok(!leavesSite('javascript:alert(1)', page))
    assert.ok(!leavesSite(null, page))
})

test('a web page opens in a window at /launch/web/ and its address, and the path names it back', () => {
    const url = 'https://docs.quirq.dev/docs/start?tab=a#install'
    assert.equal(webWindowPath(url), '/launch/web/docs.quirq.dev/docs/start?tab=a#install')
    assert.equal(webWindowUrl('/launch/web/docs.quirq.dev/docs/start', '?tab=a', '#install'), url)
    assert.equal(webWindowUrl('/launch/web/example.com:8443/a%20b'), 'https://example.com:8443/a%20b')
    assert.equal(webWindowUrl('/launch/docs'), null)
    assert.equal(webWindowUrl('/launch/web/'), null)
    assert.equal(webWindowTitle('https://www.github.com/quirq-ai/qq/'), 'github.com/quirq-ai/qq')
    assert.equal(webWindowTitle(`https://example.com/${'a'.repeat(80)}`).length, 60)
})

test('a click on a link to another site opens it in a window here; the rest is left to the browser', () => {
    let handler: ((event: unknown) => void) | undefined
    const doc = {
        location: { href: page },
        addEventListener: (_type: string, listener: (event: unknown) => void) => (handler = listener),
        removeEventListener: () => (handler = undefined),
    }
    const opened: [string, unknown][] = []
    const stop = openExternalLinksInWindows(doc as unknown as Document, (path, state) => opened.push([path, state]), [
        'quirq.dev',
    ])
    const anchor = (href: string, { download = false, newTab = false } = {}) => ({
        href,
        getAttribute: () => href,
        hasAttribute: (name: string) => name === 'download' && download,
        closest: (selector: string) => (selector === '[data-new-tab]' && newTab ? {} : null),
    })
    const click = (link: ReturnType<typeof anchor>, extra = {}) => {
        let prevented = false
        handler?.({
            defaultPrevented: false,
            button: 0,
            target: { closest: () => link },
            preventDefault: () => (prevented = true),
            ...extra,
        })
        return prevented
    }

    assert.ok(click(anchor('https://github.com/quirq-ai/qq')))
    assert.deepEqual(opened.pop(), [
        '/launch/web/github.com/quirq-ai/qq',
        { newWindow: true, webFrame: 'https://github.com/quirq-ai/qq' },
    ])
    // Target="_blank" on the link doesn't matter: the window comes first.
    assert.ok(click(anchor('//docs.quirq.dev/docs/start')))
    assert.equal(opened.pop()?.[0], '/launch/web/docs.quirq.dev/docs/start')
    // A link to this site's own host, on another origin, opens here as a page.
    assert.ok(click(anchor('https://quirq.dev/projects?tab=a')))
    assert.deepEqual(opened.pop(), ['/projects?tab=a', { newWindow: true }])

    for (const [link, extra] of [
        [anchor('/apps/qq'), {}],
        [anchor('mailto:team@quirq.dev'), {}],
        [anchor('https://github.com', { newTab: true }), {}],
        [anchor('https://example.com/a.zip', { download: true }), {}],
        [anchor('https://github.com'), { metaKey: true }],
        [anchor('https://github.com'), { button: 1 }],
        [anchor('https://github.com'), { defaultPrevented: true }],
    ] as const)
        assert.ok(!click(link, extra), `${link.href} ${JSON.stringify(extra)}`)
    assert.equal(opened.length, 0)

    stop()
    assert.equal(handler, undefined)
})
