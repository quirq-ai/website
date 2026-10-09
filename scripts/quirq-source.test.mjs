import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { auditSource, frameworkAliases, frameworkRuntimeImports } from './check-quirq-source.mjs'

function fixture(t, files, dependencies = {}) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'quirq-source-audit-'))
    t.after(() => fs.rmSync(root, { recursive: true, force: true }))
    const contents = {
        'package.json': JSON.stringify({ scripts: {}, dependencies }),
        'quirq.apps.json': JSON.stringify({ repositories: {} }),
        'gatsby-config.js': 'module.exports = { plugins: [] }',
        ...files,
    }
    for (const [file, content] of Object.entries(contents)) {
        const destination = path.join(root, file)
        fs.mkdirSync(path.dirname(destination), { recursive: true })
        fs.writeFileSync(destination, content)
    }
    return root
}

test('all copied Gatsby runtime imports resolve from the site, or its explicit framework aliases', () => {
    const root = fileURLToPath(new URL('..', import.meta.url))
    const siteRequire = createRequire(path.join(root, 'package.json'))
    const gatsbyRequire = createRequire(siteRequire.resolve('gatsby/package.json'))
    const imports = frameworkRuntimeImports(root)
    assert.ok(imports.includes('gatsby-react-router-scroll'))
    assert.ok(imports.includes('gatsby-link'))
    assert.ok(imports.includes('gatsby-legacy-polyfills'))
    assert.ok(imports.includes('deepmerge'))
    assert.ok(imports.includes('node-html-parser'))
    assert.ok(imports.includes('event-source-polyfill'))
    for (const specifier of imports) {
        const dependency = specifier.startsWith('@')
            ? specifier.split('/').slice(0, 2).join('/')
            : specifier.split('/')[0]
        const resolver = frameworkAliases.has(dependency) ? gatsbyRequire : siteRequire
        const target = specifier.replace(/^@reach\/router(?=\/|$)/, '@gatsbyjs/reach-router')
        assert.doesNotThrow(() => resolver.resolve(target), `Gatsby runtime import: ${specifier}`)
    }
})

test('source graph follows dynamic imports, barrel exports, src aliases and package subpaths', (t) => {
    const root = fixture(
        t,
        {
            'src/main.ts': "export * from './lib/start'",
            'src/lib/start.ts': "import '~/components/View'; import(`lib/dynamic`)",
            'src/components/View.tsx': "import 'react/jsx-runtime'; export default () => <div />",
            'src/lib/dynamic.ts': "export { value } from './value'",
            'src/lib/value.js': 'const path = require(`node:path`); export const value = path.sep',
        },
        { react: '^18.2.0' }
    )
    const result = auditSource(root, ['src/main.ts'])
    assert.deepEqual(result.failures, [])
    assert.equal(result.executableFiles, 5)
})

test('source graph rejects an unimported feature even when its files exist', (t) => {
    const root = fixture(t, {
        'src/main.ts': 'export const live = true',
        'src/lib/retired.ts': 'export const retired = true',
    })
    assert.deepEqual(auditSource(root, ['src/main.ts']).failures, [
        ['Unreachable first-party executable files', ['src/lib/retired.ts']],
    ])
})

test('source graph distinguishes missing local imports, undeclared packages and unused dependencies', (t) => {
    const root = fixture(
        t,
        { 'src/main.ts': "import './missing'; const retired = require(`not-installed/subpath`)" },
        { 'unused-package': '1.0.0' }
    )
    assert.deepEqual(auditSource(root, ['src/main.ts']).failures, [
        ['Unresolved local imports', ['src/main.ts: ./missing']],
        ['Unused direct dependencies', ['unused-package']],
        ['Undeclared direct dependencies', ['not-installed']],
    ])
})

test('source audit verifies vendored hashes and detects changes or missing files', (t) => {
    const source = 'export const avatar = true'
    const license = 'Example license'
    const hash = (value) => createHash('sha256').update(value).digest('hex')
    const root = fixture(t, {
        'src/main.ts': "import './vendor/blobatar/index.js'",
        'src/vendor/blobatar/index.js': source,
        'src/vendor/blobatar/LICENSE': license,
        'src/vendor/blobatar/provenance.json': JSON.stringify({
            files: { 'index.js': { sha256: hash(source) }, LICENSE: { sha256: hash(license) } },
        }),
    })
    assert.deepEqual(auditSource(root, ['src/main.ts']).failures, [])
    assert.equal(auditSource(root, ['src/main.ts']).vendorFiles, 2)
    fs.writeFileSync(path.join(root, 'src/vendor/blobatar/index.js'), 'changed')
    fs.rmSync(path.join(root, 'src/vendor/blobatar/LICENSE'))
    assert.deepEqual(auditSource(root, ['src/main.ts']).failures, [
        ['Missing or modified vendored files', ['src/vendor/blobatar/index.js', 'src/vendor/blobatar/LICENSE']],
    ])
})
