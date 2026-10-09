import test from 'node:test'
import assert from 'node:assert/strict'
import {
    docImageUrl,
    docLabel,
    docSrcSet,
    isDocPath,
    readmeIn,
    readmeSummary,
    repositoryPath,
    themedMedia,
    withoutTitle,
} from './quirqDocs.ts'

const app = {
    id: 'quirq-ai/wiki',
    repoUrl: 'https://github.com/quirq-ai/wiki',
    defaultBranch: 'main',
} as Parameters<typeof docImageUrl>[1]

test('docs are Markdown files outside dependency, build and test-data folders', () => {
    assert.ok(isDocPath('README.md'))
    assert.ok(isDocPath('docs/guide/Setup.MDX'))
    assert.ok(isDocPath('CHANGELOG.markdown'))
    assert.ok(!isDocPath('src/index.ts'))
    assert.ok(!isDocPath('node_modules/react/README.md'))
    assert.ok(!isDocPath('packages/ui/dist/README.md'))
    assert.ok(!isDocPath('tests/fixtures/sample.md'))
})

test('the README is the root one, then any README, then the first doc', () => {
    assert.equal(readmeIn(['docs/a.md', 'docs/README.md', 'readme.md']), 'readme.md')
    assert.equal(readmeIn(['docs/a.md', 'docs/README.md']), 'docs/README.md')
    assert.equal(readmeIn(['docs/a.md']), 'docs/a.md')
    assert.equal(readmeIn([]), null)
})

test('relative links resolve against the doc folder and stay inside the repository', () => {
    assert.deepEqual(repositoryPath('./theming.md#tokens', 'docs/intro.md'), {
        path: 'docs/theming.md',
        hash: '#tokens',
    })
    assert.deepEqual(repositoryPath('../README.md', 'docs/intro.md'), { path: 'README.md', hash: '' })
    assert.deepEqual(repositoryPath('/CONTRIBUTING.md', 'docs/deep/intro.md'), { path: 'CONTRIBUTING.md', hash: '' })
    assert.deepEqual(repositoryPath('../../../x.md', 'docs/intro.md'), { path: 'x.md', hash: '' })
    assert.deepEqual(repositoryPath('my%20notes.md', 'README.md'), { path: 'my notes.md', hash: '' })
    for (const external of [
        '#anchor',
        'https://example.com/a.md',
        '//cdn.example.com/x.png',
        'mailto:a@b.c',
        'javascript:alert(1)',
    ])
        assert.equal(repositoryPath(external, 'README.md'), null)
})

test('images load from raw files; GitHub blob links are rewritten; other schemes are dropped', () => {
    assert.equal(
        docImageUrl('docs/shot.png', app, 'README.md'),
        'https://raw.githubusercontent.com/quirq-ai/wiki/HEAD/docs/shot.png'
    )
    assert.equal(
        docImageUrl('../img/a b.png', app, 'docs/x.md'),
        'https://raw.githubusercontent.com/quirq-ai/wiki/HEAD/img/a%20b.png'
    )
    assert.equal(
        docImageUrl('https://github.com/quirq-ai/ui/blob/main/docs/home.png?raw=true', app, 'README.md'),
        'https://raw.githubusercontent.com/quirq-ai/ui/main/docs/home.png'
    )
    assert.equal(
        docImageUrl('https://img.shields.io/badge/x-y-green', app, 'README.md'),
        'https://img.shields.io/badge/x-y-green'
    )
    assert.equal(docImageUrl('javascript:alert(1)', app, 'README.md'), undefined)
    assert.equal(
        docSrcSet('logo.svg 1x, logo@2x.svg 2x', app, 'brand/README.md'),
        'https://raw.githubusercontent.com/quirq-ai/wiki/HEAD/brand/logo.svg 1x, https://raw.githubusercontent.com/quirq-ai/wiki/HEAD/brand/logo%402x.svg 2x'
    )
})

test('light and dark <picture> sources follow the site theme', () => {
    assert.equal(themedMedia('(prefers-color-scheme: dark)', true), 'all')
    assert.equal(themedMedia('(prefers-color-scheme: dark)', false), 'not all')
    assert.equal(themedMedia('(prefers-color-scheme:light)', false), 'all')
    assert.equal(themedMedia('(min-width: 600px)', true), '(min-width: 600px)')
})

test('tabs name a doc by its file name, or its path when two docs share a name', () => {
    const paths = ['README.md', 'AGENTS.md', 'docs/README.md', 'docs/guide/Setup.mdx']
    assert.equal(docLabel('AGENTS.md', paths), 'AGENTS')
    assert.equal(docLabel('docs/guide/Setup.mdx', paths), 'Setup')
    assert.equal(docLabel('README.md', paths), 'README')
    assert.equal(docLabel('docs/README.md', paths), 'docs/README')
    assert.equal(docLabel('README.md', ['README.md']), 'README')
})

test('a README summary is the first sentence of its opening paragraph, as plain text', () => {
    const qq = [
        '# qq',
        '',
        '`qq` is the quirq infra command line (this repo was `quirq-ai/depot` until 2026-10-09; the old',
        'URL redirects here). Every repo that quirq infra builds pins the `qq` version it runs.',
    ].join('\n')
    assert.equal(
        readmeSummary(qq),
        'qq is the quirq infra command line (this repo was quirq-ai/depot until 2026-10-09; the old URL redirects here).'
    )
    const decorated = [
        '<p align="center"><img src="logo.svg"></p>',
        '[![CI](https://x/badge.svg)](https://x)',
        '',
        '```sh',
        'not this',
        '```',
        '',
        'A **fast** tool for [quirq](https://quirq.dev). More here.',
    ].join('\n')
    assert.equal(readmeSummary(decorated), 'A fast tool for quirq.')
    assert.equal(readmeSummary('# Only a title\n\n- a list'), null)
    assert.equal(readmeSummary(null), null)
    assert.equal(readmeSummary(`Word ${'long '.repeat(60)}`, 40)?.length, 40)
})

test('a leading title that only repeats the repository name is dropped', () => {
    assert.equal(withoutTitle('\n# qq\n\nqq is a tool.', ['qq', 'quirq-ai/qq']), '\n\nqq is a tool.')
    assert.equal(withoutTitle('# `QQ` #\nText', ['qq']), 'Text')
    assert.equal(withoutTitle('# qq tools\nText', ['qq']), '# qq tools\nText')
    assert.equal(withoutTitle('Intro\n# qq', ['qq']), 'Intro\n# qq')
    assert.equal(withoutTitle('## qq\nText', ['qq']), '## qq\nText')
})
