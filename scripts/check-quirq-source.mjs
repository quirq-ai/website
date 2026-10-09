import fs from 'node:fs'
import path from 'node:path'
import { builtinModules, createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import ts from 'typescript'

function literalImports(file, contents) {
    const imports = []
    const source = ts.createSourceFile(file, contents, ts.ScriptTarget.Latest, true)
    function scan(node) {
        if (
            (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
            node.moduleSpecifier &&
            ts.isStringLiteral(node.moduleSpecifier)
        ) {
            imports.push(node.moduleSpecifier.text)
        }
        if (
            ts.isCallExpression(node) &&
            (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
                (ts.isIdentifier(node.expression) && node.expression.text === 'require')) &&
            node.arguments.length &&
            ts.isStringLiteralLike(node.arguments[0])
        ) {
            imports.push(node.arguments[0].text)
        }
        ts.forEachChild(node, scan)
    }
    scan(source)
    return imports
}

function packageName(specifier) {
    return specifier.startsWith('@') ? specifier.split('/').slice(0, 2).join('/') : specifier.split('/')[0]
}

// Gatsby copies these modules into .cache, outside its own dependency directory.
// Its explicit webpack aliases and this workspace's hoisted diagnostics are the
// exceptions; all other generated runtime imports need a project dependency.
export const frameworkAliases = new Set([
    '@babel/runtime',
    '@reach/router',
    'react-server-dom-webpack',
    'socket.io-client',
])
const hoistedFrameworkPackages = new Set([
    '@gatsbyjs/webpack-hot-middleware',
    'anser',
    'css.escape',
    'error-stack-parser',
    'platform',
])

export function frameworkRuntimeImports(root) {
    const require = createRequire(path.join(root, 'package.json'))
    const directories = [path.join(path.dirname(require.resolve('gatsby/package.json')), 'cache-dir')]
    if (fs.existsSync(path.join(root, '.cache'))) directories.push(path.join(root, '.cache'))
    const imports = new Set()
    const builtins = new Set(builtinModules.map((name) => name.replace(/^node:/, '')))
    function visit(directory) {
        for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
            const file = path.join(directory, entry.name)
            if (entry.isDirectory() && entry.name !== 'node_modules') visit(file)
            else if (/\.[cm]?js$/.test(file)) {
                for (const specifier of literalImports(file, fs.readFileSync(file, 'utf8'))) {
                    if (!/^[.$/]/.test(specifier) && !builtins.has(specifier.replace(/^node:/, '')))
                        imports.add(specifier)
                }
            }
        }
    }
    for (const directory of directories) visit(directory)
    return [...imports].sort()
}

// Gatsby creates pages and serverless functions without importing them. These are
// entrypoints, along with catalog templates, package scripts and ambient types.
export function auditSource(root, entrypointOverrides) {
    const manifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
    const mapping = JSON.parse(fs.readFileSync(path.join(root, 'quirq.apps.json'), 'utf8'))
    const require = createRequire(path.join(root, 'package.json'))
    const code = /\.(?:[cm]?js|jsx|ts|tsx)$/
    const extensions = ['.tsx', '.ts', '.jsx', '.js', '.mjs', '.cjs', '.json', '.d.ts', '.css', '.scss', '.svg']
    const builtins = new Set(builtinModules.map((name) => name.replace(/^node:/, '')))
    const reachable = new Set()
    const usedPackages = new Set()
    const unresolved = new Set()

    function filesIn(directory) {
        if (!fs.existsSync(path.join(root, directory))) return []
        return fs.readdirSync(path.join(root, directory), { withFileTypes: true }).flatMap((entry) => {
            const file = `${directory}/${entry.name}`
            if (file === 'src/vendor') return [] // unmodified third-party packages, checked by provenance
            return entry.isDirectory() ? filesIn(file) : [file]
        })
    }

    function resolveLocal(specifier, importer) {
        const base = specifier.startsWith('.')
            ? path.join(path.dirname(importer), specifier)
            : `src/${specifier.replace(/^~\//, '')}`
        for (const candidate of [
            base,
            ...extensions.map((extension) => `${base}${extension}`),
            ...extensions.map((extension) => `${base}/index${extension}`),
        ]) {
            if (fs.existsSync(path.join(root, candidate)) && fs.statSync(path.join(root, candidate)).isFile()) {
                return candidate.replace(/\\/g, '/')
            }
        }
    }

    const sourceDirectories = new Set(
        fs.readdirSync(path.join(root, 'src'), { withFileTypes: true }).map((entry) => entry.name)
    )

    function addImport(specifier, importer) {
        if (/^(?:https?:|data:)/.test(specifier)) return
        const local = resolveLocal(specifier, importer)
        if (local) {
            visit(local)
        } else if (
            specifier.startsWith('.') ||
            specifier.startsWith('~/') ||
            sourceDirectories.has(specifier.split('/')[0])
        ) {
            unresolved.add(`${importer}: ${specifier}`)
        } else if (!builtins.has(specifier.replace(/^node:/, ''))) {
            usedPackages.add(packageName(specifier))
        }
    }

    function visit(file) {
        if (reachable.has(file)) return
        reachable.add(file)
        if (file.startsWith('src/vendor/')) return
        const contents = fs.readFileSync(path.join(root, file), 'utf8')
        if (/\.(?:css|scss)$/.test(file)) {
            for (const match of contents.matchAll(/@import\s+['"]([^'"]+)['"]/g)) addImport(match[1], file)
            return
        }
        if (!code.test(file)) return
        for (const specifier of literalImports(file, contents)) addImport(specifier, file)
    }

    const sourceFiles = filesIn('src')
    const entrypoints = entrypointOverrides || [
        'gatsby-browser.tsx',
        'gatsby-ssr.js',
        'gatsby-node.ts',
        'gatsby-config.js',
        'tailwind.config.js',
        'postcss.config.js',
        'scripts/lib/strip-readmes-loader.cjs',
        'src/html.tsx',
        'src/templates/quirq-app.tsx',
        'src/templates/quirq-live-app.tsx',
        'src/templates/quirq-launch.tsx',
        'src/pages/index.tsx',
        'src/pages/display-options.tsx',
        'src/pages/projects.tsx',
        'src/pages/404.js',
        ...sourceFiles.filter((file) => file.startsWith('src/api/') || /\.d\.ts$/.test(file)),
        ...Object.values(mapping.repositories).flatMap((app) => (app.component ? [app.component] : [])),
    ]

    // Commands are executable roots, including test suites; an unreferenced test does
    // not make a discarded feature active. This also checks all first-party scripts.
    for (const command of Object.values(manifest.scripts)) {
        for (const match of command.matchAll(/[\w./-]+\.(?:[cm]?js|jsx|ts|tsx)\b/g)) {
            if (fs.existsSync(path.join(root, match[0]))) entrypoints.push(match[0])
        }
    }
    for (const entrypoint of new Set(entrypoints)) visit(entrypoint)

    for (const plugin of require(path.join(root, 'gatsby-config.js')).plugins) {
        usedPackages.add(typeof plugin === 'string' ? plugin : plugin.resolve)
    }

    if (manifest.dependencies.gatsby) {
        for (const specifier of frameworkRuntimeImports(root)) {
            const dependency = packageName(specifier)
            if (!frameworkAliases.has(dependency) && !hoistedFrameworkPackages.has(dependency))
                usedPackages.add(dependency)
        }
    }

    // Framework peer/native requirements and development CLIs are not source imports.
    // Keep this list explicit: adding an exception requires explaining its purpose.
    const tooling = {
        'gatsby-cli': 'Gatsby development, build and preview commands',
        'react-dom': 'Gatsby renders and hydrates React',
        'babel-loader': 'Gatsby Functions resolves this loader from the project root',
        postcss: 'gatsby-plugin-postcss peer dependency',
        eslint: 'lint-staged JavaScript/TypeScript checks',
        'eslint-plugin-react': '.eslintrc React rules',
        '@typescript-eslint/parser': '.eslintrc TypeScript parser',
        '@typescript-eslint/eslint-plugin': '.eslintrc TypeScript rules',
        husky: 'prepare installs the pre-commit hook',
        'lint-staged': 'pre-commit formats and checks changed files',
        prettier: 'format command and lint-staged',
        'markdownlint-cli2': 'lint-staged Markdown checks',
    }
    for (const dependency of Object.keys(tooling)) {
        if (manifest.dependencies?.[dependency] || manifest.devDependencies?.[dependency]) usedPackages.add(dependency)
    }

    const declared = { ...manifest.dependencies, ...manifest.devDependencies }
    const unusedDependencies = Object.keys(declared).filter((dependency) => {
        if (usedPackages.has(dependency)) return false
        if (dependency.startsWith('@types/')) {
            const typesName = dependency.slice(7)
            const packageName = typesName.includes('__') ? `@${typesName.replace('__', '/')}` : typesName
            return !usedPackages.has(packageName)
        }
        return true
    })
    const undeclaredDependencies = [...usedPackages].filter((dependency) => !declared[dependency])
    const executableFiles = [...sourceFiles, ...filesIn('scripts'), ...filesIn('gatsby')].filter((file) =>
        code.test(file)
    )
    const unreachable = executableFiles.filter((file) => !reachable.has(file))
    const changedVendorFiles = []
    let vendorFiles = 0
    for (const directory of ['src/vendor/blobatar', 'src/vendor/pierre-trees']) {
        const provenanceFile = path.join(root, directory, 'provenance.json')
        if (!fs.existsSync(path.join(root, directory))) continue
        if (!fs.existsSync(provenanceFile)) {
            changedVendorFiles.push(`${directory}/provenance.json`)
            continue
        }
        const provenance = JSON.parse(fs.readFileSync(provenanceFile, 'utf8'))
        for (const archive of provenance.packages || [provenance]) {
            for (const [file, expected] of Object.entries(archive.files)) {
                const absolute = path.join(root, directory, file)
                vendorFiles++
                if (
                    !fs.existsSync(absolute) ||
                    createHash('sha256').update(fs.readFileSync(absolute)).digest('hex') !== expected.sha256
                ) {
                    changedVendorFiles.push(`${directory}/${file}`)
                }
            }
        }
    }
    const failures = [
        ['Unresolved local imports', [...unresolved]],
        ['Unreachable first-party executable files', unreachable],
        ['Unused direct dependencies', unusedDependencies],
        ['Undeclared direct dependencies', undeclaredDependencies],
        ['Missing or modified vendored files', changedVendorFiles],
    ].filter(([, files]) => files.length)

    return {
        failures,
        executableFiles: executableFiles.length,
        dependencies: Object.keys(declared).length,
        vendorFiles,
    }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
    const result = auditSource(root)
    if (result.failures.length) {
        for (const [label, files] of result.failures) {
            console.error(
                `${label}:\n${files
                    .sort()
                    .map((file) => `  ${file}`)
                    .join('\n')}`
            )
        }
        process.exitCode = 1
    } else {
        console.log(
            `Source audit passed: ${result.executableFiles} first-party executable files, ${result.dependencies} direct dependencies, ${result.vendorFiles} vendored hashes; no unreachable files, missing imports, or unused dependencies.`
        )
    }
}
