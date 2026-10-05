const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const test = require('node:test')
const { createRequire } = require('node:module')
const ts = require('typescript')
const { buildQuirqApps } = require('../scripts/lib/quirq-catalog.mjs')

const root = path.resolve(__dirname, '..')
const initialApps = buildQuirqApps(require('../src/data/quirq-repositories.json'), require('../quirq.apps.json'))
const source = ts.transpileModule(fs.readFileSync(path.join(root, 'gatsby-node.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
}).outputText
const normalize = (route) => route.replace(/\/$/, '') || '/'

function setup() {
    const apps = initialApps.map((app) => ({ ...app }))
    const hooks = {}
    vm.runInNewContext(source, {
        exports: hooks,
        __dirname: root,
        process,
        require: (id) => (id === './src/lib/quirqApps' ? { getQuirqApps: () => apps } : require(id)),
    })
    const pages = new Map()
    let callbackCount = 0
    const actions = {
        // Match Gatsby's order: the incoming page replaces the path before onCreatePage runs.
        createPage(page) {
            assert.ok(++callbackCount < 200, 'onCreatePage should not recurse indefinitely')
            pages.set(normalize(page.path), page)
            hooks.onCreatePage({ page, actions })
        },
        deletePage(page) {
            pages.delete(normalize(page.path))
        },
    }
    return { apps, hooks, actions, pages }
}

for (const legacyFirst of [false, true]) {
    test(`catalog /docs survives source-page collision (${legacyFirst ? 'source first' : 'catalog first'})`, () => {
        const { hooks, actions, pages } = setup()
        const legacy = { path: '/docs/', component: path.join(root, 'src/pages/docs/index.tsx'), context: {} }
        if (legacyFirst) actions.createPage(legacy)
        hooks.createPages({ actions })
        if (!legacyFirst) actions.createPage(legacy)
        assert.equal(pages.get('/docs').component, path.join(root, 'src/templates/quirq-app.tsx'))
        assert.equal(pages.get('/docs').context.app.repo, 'docs')
        assert.equal(pages.size, initialApps.length)
    })
}

test('future custom routes also replace any legacy source page', () => {
    const { apps, hooks, actions, pages } = setup()
    apps.find((app) => app.repo === 'xo-space').path = '/self-driving'
    hooks.createPages({ actions })
    actions.createPage({ path: '/self-driving', component: path.join(root, 'src/pages/self-driving/index.tsx') })
    assert.equal(pages.get('/self-driving').context.app.repo, 'xo-space')
    assert.equal(pages.size, initialApps.length)
})

test('an old catalog route is rejected after its configured path changes', () => {
    const { apps, hooks, actions, pages } = setup()
    hooks.createPages({ actions })
    const previousDocsPage = pages.get('/docs')
    apps.find((app) => app.repo === 'docs').path = '/knowledge'
    hooks.onCreatePage({ page: previousDocsPage, actions })
    hooks.createPages({ actions })
    assert.equal(pages.has('/docs'), false)
    assert.equal(pages.get('/knowledge').context.app.repo, 'docs')
    assert.equal(pages.size, initialApps.length)
})

test('native page creator ignores archived source files before evaluating collection queries', () => {
    const config = require('../gatsby-config.js')
    const plugin = config.plugins.find((entry) => entry.resolve === 'gatsby-plugin-page-creator')
    assert.ok(plugin, "Override Gatsby's default page creator, not an additional page source")
    assert.equal(plugin.options.path, path.join(root, 'src/pages'))
    const pluginRequire = createRequire(require.resolve('gatsby-plugin-page-creator/package.json'))
    const { createPage } = pluginRequire('./create-page-wrapper')
    const { ignorePath } = pluginRequire('gatsby-page-utils')
    const created = []
    let queries = 0
    const graphql = () => {
        queries++
        throw new Error('Archived collection routes must be filtered before GraphQL runs')
    }
    function visit(directory, relative = '') {
        for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
            const file = relative ? `${relative}/${entry.name}` : entry.name
            if (entry.isDirectory()) visit(path.join(directory, entry.name), file)
            else if (/\.[jt]sx?$/.test(file)) {
                createPage(
                    file,
                    plugin.options.path,
                    { createPage: (page) => created.push(page) },
                    graphql,
                    {},
                    'never',
                    plugin.options.path,
                    plugin.options.ignore
                )
            }
        }
    }
    visit(plugin.options.path)
    assert.equal(queries, 0)
    assert.deepEqual(created.map((page) => page.path).sort(), ['/', '/404', '/display-options'])
    assert.equal(ignorePath('docs/index.tsx', plugin.options.ignore), true)
    assert.equal(ignorePath('future/{NewCollection.slug}.tsx', plugin.options.ignore), true)
})
