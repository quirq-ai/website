import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Buffer } from 'node:buffer'
import { buildQuirqApps, mergeLiveRepositories, normalizeAppPath, safeWebUrl } from './lib/quirq-catalog.mjs'
import { fetchOrganizationRepositories, syncQuirqApps } from './sync-quirq-apps.mjs'

const config = { organization: 'quirq-ai', name: 'Quirq', defaults: {}, repositories: {} }
const repo = (name, extra = {}) => ({
    name,
    full_name: `quirq-ai/${name}`,
    private: false,
    default_branch: 'main',
    updated_at: '2026-10-05T00:00:00Z',
    ...extra,
})
const snapshot = (repositories) => ({ organization: 'quirq-ai', fetchedAt: '2026-10-05T00:00:00Z', repositories })
const response = (data, next) =>
    new Response(JSON.stringify(data), { status: 200, headers: next ? { link: `<${next}>; rel="next"` } : {} })

test('catalog excludes organizational, hidden, and archived repositories; keeps useful forks', () => {
    const apps = buildQuirqApps(
        snapshot([repo('.github'), repo('docs', { fork: true }), repo('old', { archived: true }), repo('internal')]),
        { ...config, repositories: { internal: { hidden: true }, absent: { name: 'Not a real repo' } } }
    )
    assert.deepEqual(
        apps.map((app) => app.repo),
        ['docs']
    )
    assert.equal(apps[0].path, '/apps/docs')
})

test('a live repository list adds and removes repositories, keeps bundled READMEs and drops invalid entries', () => {
    const bundled = snapshot([repo('docs', { readmeMarkdown: '# Docs', readmePath: 'README.md' }), repo('deleted')])
    const merged = mergeLiveRepositories(
        bundled,
        [
            repo('docs', { description: 'Fresh' }),
            repo('new-app'),
            repo('docs'),
            repo('secret', { private: true }),
            repo('elsewhere', { full_name: 'someone/elsewhere' }),
        ],
        '2026-10-08T00:00:00Z'
    )
    assert.equal(merged.fetchedAt, '2026-10-08T00:00:00Z')
    assert.deepEqual(
        merged.repositories.map((entry) => entry.name),
        ['docs', 'new-app']
    )
    assert.equal(merged.repositories[0].description, 'Fresh')
    assert.equal(merged.repositories[0].readmeMarkdown, '# Docs')
    assert.equal(merged.repositories[1].readmeMarkdown, null)
    assert.deepEqual(
        buildQuirqApps(merged, config).map((app) => app.path),
        ['/apps/docs', '/apps/new-app']
    )
})

test('repository styles and custom URLs survive mapping without inventing descriptions or launches', () => {
    const [app] = buildQuirqApps(snapshot([repo('xo-space', { readmeMarkdown: '# XO', readmePath: 'README.md' })]), {
        ...config,
        repositories: {
            'xo-space': {
                name: 'XO Space',
                path: '/space/lab/',
                color: 'purple',
                icon: 'rocket',
                presentation: 'gallery',
                component: 'src/templates/XO.tsx',
                window: { width: 980, height: 720 },
                featured: true,
            },
        },
    })
    assert.equal(app.name, 'XO Space')
    assert.equal(app.path, '/space/lab')
    assert.equal(app.description, '')
    assert.equal(app.launchUrl, null)
    assert.equal(app.readmeMarkdown, '# XO')
    assert.equal(app.presentation, 'gallery')
    assert.equal(app.component, 'src/templates/XO.tsx')
    assert.deepEqual(app.window, { width: 980, height: 720 })
})

test('default paths preserve dots and underscores in real GitHub repository names', () => {
    const apps = buildQuirqApps(snapshot([repo('my.site'), repo('quirq_ai'), repo('.tools')]), config)
    assert.deepEqual(new Set(apps.map((app) => app.path)), new Set(['/apps/my.site', '/apps/quirq_ai', '/apps/.tools']))
    assert.throws(() => normalizeAppPath('/apps/./docs'), /Invalid app path/)
})

test('default exclusions and visibility flags are explicit and validate before applying', () => {
    const source = snapshot([repo('archive', { archived: true }), repo('fork', { fork: true }), repo('hidden')])
    const apps = buildQuirqApps(source, {
        ...config,
        defaults: { includeArchived: true, includeForks: false, excludeRepositories: ['HIDDEN'] },
    })
    assert.deepEqual(
        apps.map((app) => app.repo),
        ['archive']
    )
    for (const defaults of [
        { includeArchived: 'false' },
        { includeForks: 'false' },
        { excludeRepositories: [null] },
        { icon: 'unknown' },
    ]) {
        assert.throws(() => buildQuirqApps(source, { ...config, defaults }))
    }
    assert.throws(
        () => buildQuirqApps(source, { ...config, repositories: { future: { path: '/display-options' } } }),
        /reserved/
    )
})

test('private, foreign, and duplicate repositories cannot enter the catalog', () => {
    assert.throws(() => buildQuirqApps(snapshot([repo('secret', { private: true })]), config), /Only public/)
    assert.throws(
        () => buildQuirqApps(snapshot([repo('foreign', { full_name: 'elsewhere/foreign' })]), config),
        /does not belong/
    )
    assert.throws(() => buildQuirqApps(snapshot([repo('app'), repo('app')]), config), /Duplicate repository/)
    assert.throws(() => buildQuirqApps(snapshot([repo('private', { visibility: 'private' })]), config), /Only public/)
    assert.throws(
        () => buildQuirqApps(snapshot([repo('app', { html_url: 'https://elsewhere.example/app' })]), config),
        /Unexpected repository URL/
    )
    assert.throws(
        () => buildQuirqApps({ ...snapshot([]), organization: 'other' }, config),
        /organization does not match/
    )
})

test('invalid, reserved, and colliding paths fail before pages are created', () => {
    for (const path of [
        '/',
        '//evil.com',
        '/display-options',
        '/404.html',
        '/apps/../docs',
        '/apps/%2e%2e',
        '/app?x=1',
        '/api/test',
    ])
        assert.throws(() => normalizeAppPath(path))
    assert.throws(
        () =>
            buildQuirqApps(snapshot([repo('one'), repo('two')]), {
                ...config,
                repositories: { one: { path: '/same' }, two: { path: '/same/' } },
            }),
        /Duplicate app path/
    )
    assert.throws(
        () =>
            buildQuirqApps(snapshot([repo('one')]), {
                ...config,
                repositories: { one: { component: 'src/templates/../../secrets.ts' } },
            }),
        /component must be/
    )
})

test('launch URLs only accept web protocols and embedding is explicitly enabled per repo', () => {
    for (const url of ['javascript:alert(1)', 'file:///secret', 'https://user:password@example.com', '//example.com'])
        assert.throws(() => safeWebUrl(url))
    assert.equal(safeWebUrl('quirq.ai', { allowBareHost: true }), 'https://quirq.ai/')
    const source = snapshot([repo('app', { homepage: 'https://example.com' })])
    assert.equal(buildQuirqApps(source, config)[0].launchMode, 'external')
    // Opening each app's website in its own window may be the catalog-wide default; a repo can opt out.
    const windowed = { ...config, defaults: { launchMode: 'window' } }
    assert.equal(buildQuirqApps(source, windowed)[0].launchMode, 'window')
    assert.equal(
        buildQuirqApps(source, { ...windowed, repositories: { app: { launchMode: 'external' } } })[0].launchMode,
        'external'
    )
    assert.throws(() => buildQuirqApps(source, { ...config, defaults: { launchMode: 'tab' } }), /Invalid/)
    assert.throws(() => buildQuirqApps(source, { ...config, defaults: { launchMode: 'embed' } }), /explicitly enabled/)
    const [app] = buildQuirqApps(source, {
        ...config,
        repositories: { app: { launchMode: 'embed', launchUrl: 'https://example.com/embed' } },
    })
    assert.equal(app.launchMode, 'embed')
    assert.equal(app.launchUrl, 'https://example.com/embed')
    const [disabled] = buildQuirqApps(source, { ...config, repositories: { app: { launchUrl: null } } })
    assert.equal(disabled.launchUrl, null)
    assert.equal(disabled.homepage, 'https://example.com/')
    assert.throws(
        () => buildQuirqApps(snapshot([repo('app', { homepage: 'javascript:alert(1)' })]), config),
        /Unsafe app URL/
    )
})

test('GitHub pagination loads all pages and strips unnecessary response fields', async () => {
    const next = 'https://api.github.com/orgs/quirq-ai/repos?page=2'
    const requests = []
    const repositories = await fetchOrganizationRepositories('quirq-ai', {
        fetchImpl: async (url) => {
            requests.push(url)
            return requests.length === 1
                ? response([repo('z', { irrelevant: 'not persisted' })], next)
                : response([repo('a')])
        },
    })
    assert.equal(requests.length, 2)
    assert.deepEqual(
        repositories.map((item) => item.name),
        ['a', 'z']
    )
    assert.equal(repositories[1].irrelevant, undefined)
})

test('pagination cannot forward credentials to another origin or loop indefinitely', async () => {
    await assert.rejects(
        fetchOrganizationRepositories('quirq-ai', {
            fetchImpl: async () => response([repo('a')], 'https://example.com/steal'),
        }),
        /Unexpected GitHub pagination/
    )
    const first = 'https://api.github.com/orgs/quirq-ai/repos?type=public&per_page=100&sort=full_name&page=1'
    await assert.rejects(
        fetchOrganizationRepositories('quirq-ai', { fetchImpl: async () => response([repo('a')], first) }),
        /pagination did not complete/
    )
    await assert.rejects(
        fetchOrganizationRepositories('quirq-ai', {
            fetchImpl: async () => new Response('rate limited', { status: 403 }),
        }),
        /HTTP 403/
    )
})

async function withFiles(run) {
    const directory = await mkdtemp(join(tmpdir(), 'quirq-catalog-'))
    const configPath = join(directory, 'quirq.apps.json')
    const outputPath = join(directory, 'snapshot.json')
    await writeFile(configPath, JSON.stringify(config))
    await writeFile(outputPath, JSON.stringify(snapshot([repo('previous')])))
    try {
        await run({ configPath, outputPath })
    } finally {
        await rm(directory, { recursive: true, force: true })
    }
}

test('sync replaces the snapshot only on success, including README content without credentials', async () => {
    await withFiles(async (paths) => {
        const result = await syncQuirqApps({
            ...paths,
            token: 'test-secret',
            fetchImpl: async (url, options) => {
                assert.equal(options.headers.Authorization, 'Bearer test-secret')
                return url.includes('/readme')
                    ? response({
                          encoding: 'base64',
                          path: 'docs/README.md',
                          size: 6,
                          content: Buffer.from('# Test').toString('base64'),
                      })
                    : response([repo('new')])
            },
        })
        const written = await readFile(paths.outputPath, 'utf8')
        assert.equal(result.written, true)
        assert.equal(result.apps[0].repo, 'new')
        assert.equal(result.apps[0].readmePath, 'docs/README.md')
        assert.equal(result.apps[0].readmeMarkdown, '# Test')
        assert.ok(!written.includes('test-secret'))
    })
})

test('API, ownership, and mapping errors preserve the previous snapshot byte for byte', async () => {
    await withFiles(async (paths) => {
        const before = await readFile(paths.outputPath, 'utf8')
        const failures = [
            { fetchImpl: async () => new Response('Failure', { status: 500 }) },
            {
                fetchImpl: async (url) =>
                    url.includes('page=2')
                        ? new Response('rate limited', { status: 403 })
                        : response([repo('partial')], 'https://api.github.com/orgs/quirq-ai/repos?page=2'),
            },
            { fetchImpl: async () => response([repo('secret', { private: true })]) },
            {
                fetchImpl: async () => response([repo('app')]),
                config: { ...config, repositories: { app: { path: '/display-options' } } },
            },
        ]
        for (const failure of failures) {
            if (failure.config) await writeFile(paths.configPath, JSON.stringify(failure.config))
            await assert.rejects(syncQuirqApps({ ...paths, fetchImpl: failure.fetchImpl }))
            assert.equal(await readFile(paths.outputPath, 'utf8'), before)
        }
    })
})

test('hidden repositories remain metadata only and never trigger README requests', async () => {
    await withFiles(async (paths) => {
        await writeFile(paths.configPath, JSON.stringify({ ...config, repositories: { hidden: { hidden: true } } }))
        const requests = []
        const result = await syncQuirqApps({
            ...paths,
            fetchImpl: async (url) => {
                requests.push(url)
                return response([repo('hidden')])
            },
        })
        assert.equal(result.apps.length, 0)
        assert.equal(requests.length, 1)
        assert.equal(result.snapshot.repositories[0].readmeMarkdown, null)
    })
})

test('a README failure retains the app and --check validates without network access', async () => {
    await withFiles(async (paths) => {
        const warnings = []
        const result = await syncQuirqApps({
            ...paths,
            warn: (message) => warnings.push(message),
            fetchImpl: async (url) =>
                url.includes('/readme') ? new Response('unavailable', { status: 500 }) : response([repo('app')]),
        })
        assert.equal(result.apps[0].repoUrl, 'https://github.com/quirq-ai/app')
        assert.equal(result.apps[0].readmeMarkdown, null)
        assert.equal(warnings.length, 1)
        const checked = await syncQuirqApps({
            ...paths,
            check: true,
            fetchImpl: async () => {
                throw new Error('Network must not be used')
            },
        })
        assert.equal(checked.written, false)
        assert.equal(checked.apps.length, 1)
    })
})

test('--prune drops README text of hidden repositories offline and keeps visible ones', async () => {
    await withFiles(async ({ configPath, outputPath }) => {
        const readme = { readmeMarkdown: '# Notes', readmePath: 'README.md' }
        await writeFile(configPath, JSON.stringify({ ...config, repositories: { internal: { hidden: true } } }))
        await writeFile(outputPath, JSON.stringify(snapshot([repo('app', readme), repo('internal', readme)])))
        const offline = async () => {
            throw new Error('Network must not be used')
        }
        const pruned = await syncQuirqApps({ configPath, outputPath, prune: true, fetchImpl: offline })
        assert.equal(pruned.written, true)
        const saved = JSON.parse(await readFile(outputPath, 'utf8'))
        assert.deepEqual(
            saved.repositories.map((r) => [r.name, r.readmeMarkdown, r.readmePath]),
            [
                ['app', '# Notes', 'README.md'],
                ['internal', null, null],
            ]
        )
        assert.equal(saved.fetchedAt, '2026-10-05T00:00:00Z')
        const again = await syncQuirqApps({ configPath, outputPath, prune: true, fetchImpl: offline })
        assert.equal(again.written, false)
        const checked = await syncQuirqApps({ configPath, outputPath, check: true, fetchImpl: offline })
        assert.equal(checked.written, false)
    })
})

test('--check fails while a hidden repository still carries README text, without rewriting it', async () => {
    await withFiles(async ({ configPath, outputPath }) => {
        const readme = { readmeMarkdown: '# Notes', readmePath: 'README.md' }
        await writeFile(configPath, JSON.stringify({ ...config, repositories: { internal: { hidden: true } } }))
        await writeFile(outputPath, JSON.stringify(snapshot([repo('app'), repo('internal', readme)])))
        const before = await readFile(outputPath, 'utf8')
        await assert.rejects(syncQuirqApps({ configPath, outputPath, check: true }), /apps:prune/)
        await assert.rejects(syncQuirqApps({ configPath, outputPath, check: true, prune: true }), /either/)
        assert.equal(await readFile(outputPath, 'utf8'), before)
    })
})
