import test from 'node:test'
import assert from 'node:assert/strict'
import {
    canFrameReadmeLink,
    readmeLinkAt,
    readmeLinkLabel,
    readmeLinkLook,
    readmeLinks,
    readmeLinkTarget,
} from './quirqReadmeLinks.ts'

type App = Parameters<typeof readmeLinkTarget>[1][number]
const app = (repo: string, extra: Partial<App>) =>
    ({
        repo,
        icon: 'folder',
        color: 'blue',
        launchMode: 'window',
        repoUrl: `https://github.com/quirq-ai/${repo}`,
        ...extra,
    } as App)
const apps = [
    // .github's homepage is the quirq website too; quirq_ai is the app for it.
    app('.github', { homepage: 'https://www.quirq.ai/', launchUrl: 'https://www.quirq.ai/', icon: 'profile' }),
    // Docs launches at its Start page; the README links its homepage.
    app('docs', {
        homepage: 'https://docs.quirq.dev/',
        launchUrl: 'https://docs.quirq.dev/docs/start',
        icon: 'document',
    }),
    app('innernet', { launchUrl: 'https://innernet.example/', launchMode: 'external', icon: 'globe' }),
    app('quirq_ai', { homepage: 'https://quirq.ai/', launchUrl: 'https://quirq.ai/', icon: 'quirq', color: 'lilac' }),
    app('xo-space', { launchUrl: null, icon: 'planet' }),
]
const site = ['quirq.dev', 'localhost']
const base = 'https://github.com/quirq-ai/.github/blob/HEAD/profile/'

const readme = `<p align="center">
  <a href="https://app.xo.builders/"><strong>Open the cloud app ↗</strong></a> ·
  <a href="https://github.com/quirq-ai/xo-space#quick-start"><strong>Run Space locally</strong></a> ·
  <a href="https://docs.quirq.dev/">Documentation</a> ·
  <a href="https://www.quirq.ai/">Website</a>
</p>

<a href="https://www.quirq.ai/"><img src="assets/banner.png" alt="A banner"></a>

![Diagram](assets/diagram.png)

[**xo-space**](https://github.com/quirq-ai/xo-space) · [Contributing](../CONTRIBUTING.md) · [Read the research →](https://www.quirq.ai/research)
[Write to us](mailto:team@xo.builders) · [Top](#top) · [Bad](javascript:alert(1))`

test('README links come from Markdown and HTML, resolved like GitHub, without images, anchors or scripts', () => {
    const links = readmeLinks(readme, base)
    // The banner is an image link with no text, so it isn't one.
    assert.deepEqual(
        links.map((link) => link.label),
        [
            'Open the cloud app',
            'Run Space locally',
            'Documentation',
            'Website',
            'xo-space',
            'Contributing',
            'Read the research',
            'Write to us',
        ]
    )
    assert.equal(
        links.find((link) => link.label === 'Contributing')?.href,
        'https://github.com/quirq-ai/.github/blob/HEAD/CONTRIBUTING.md'
    )
    assert.ok(!links.some((link) => link.href.startsWith('javascript:') || link.href.includes('#top')))
})

test('a README link to an app opens that app the way Launch does; other web pages open in a window of their own', () => {
    const target = (href: string) => readmeLinkTarget(href, apps, site)
    assert.deepEqual(target('https://docs.quirq.dev/'), { to: '/launch/docs', external: false })
    // www and a trailing slash don't matter, and .github doesn't claim the website.
    assert.deepEqual(target('https://www.quirq.ai/'), { to: '/launch/quirq_ai', external: false })
    assert.deepEqual(target('https://innernet.example'), { to: 'https://innernet.example', external: true })
    assert.deepEqual(target('https://app.xo.builders/'), { to: '/launch/readme/app.xo.builders', external: false })
    assert.deepEqual(target('https://www.quirq.ai/research?x=1#y'), {
        to: '/launch/readme/quirq.ai/research',
        external: false,
    })
    // GitHub refuses to be framed, and mail isn't a page.
    assert.deepEqual(target('https://github.com/quirq-ai/xo-space#quick-start'), {
        to: 'https://github.com/quirq-ai/xo-space#quick-start',
        external: true,
    })
    assert.deepEqual(target('mailto:team@xo.builders'), { to: 'mailto:team@xo.builders', external: true })
    // A link to this site opens here.
    assert.deepEqual(target('https://www.quirq.dev/projects?tab=a'), { to: '/projects?tab=a', external: false })
})

test('a /launch/readme/ window frames only a link the README has, never the address in the path', () => {
    const links = readmeLinks(readme, base)
    assert.equal(readmeLinkAt('/launch/readme/app.xo.builders', links, site)?.href, 'https://app.xo.builders/')
    assert.equal(readmeLinkAt('/launch/readme/quirq.ai/research/', links, site)?.label, 'Read the research')
    assert.equal(readmeLinkAt('/launch/readme/evil.example', links, site), undefined)
    assert.equal(readmeLinkAt('/launch/readme/github.com/quirq-ai/xo-space', links, site), undefined)
    assert.equal(readmeLinkAt('/launch/docs', links, site), undefined)
    assert.ok(!canFrameReadmeLink('https://quirq.dev/', site))
    assert.ok(!canFrameReadmeLink('http://gist.github.com/x', site))
    assert.ok(canFrameReadmeLink('https://docs.quirq.dev/', site))
})

test('README links look like the app they open, or like what they are about', () => {
    const look = (href: string, label: string) => readmeLinkLook(href, label, apps)
    assert.deepEqual(look('https://app.xo.builders/', 'Open the cloud app'), { icon: 'cloud', color: 'blue' })
    assert.deepEqual(look('https://github.com/quirq-ai/xo-space#quick-start', 'Run Space locally').icon, 'terminal')
    assert.deepEqual(look('https://docs.quirq.dev/', 'Documentation').icon, 'document')
    assert.deepEqual(look('https://www.quirq.ai/', 'Website'), { icon: 'quirq', color: 'lilac' })
    assert.equal(
        look('https://github.com/quirq-ai/.github/blob/HEAD/SECURITY.md', 'Report a security issue').icon,
        'shield'
    )
    assert.equal(readmeLinkLabel('<strong>Open the cloud app ↗</strong>'), 'Open the cloud app')
    assert.equal(readmeLinkLabel('**Read** the  research →'), 'Read the research')
})
