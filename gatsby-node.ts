import path from 'path'
import fs from 'fs'
import { GatsbyNode } from 'gatsby'
import { getQuirqApps } from './src/lib/quirqApps'

const root = __dirname
const defaultAppTemplate = path.resolve(root, 'src/templates/quirq-app.tsx')
// Client-only routes that find their repository in the live list: /apps/* for repositories created
// after the build, which have no page yet, and /launch/* for an app's website in its own window.
const clientOnlyPages = [
    {
        path: '/apps/',
        matchPath: '/apps/*',
        component: path.resolve(root, 'src/templates/quirq-live-app.tsx'),
        context: {},
    },
    {
        path: '/launch/',
        matchPath: '/launch/*',
        component: path.resolve(root, 'src/templates/quirq-launch.tsx'),
        context: {},
    },
]
const sourcePages = new Set(['/', '/display-options', '/projects', '/404', '/404.html'])
const normalizePath = (value: string) => value.replace(/\/$/, '') || '/'

function getAppTemplate(app: ReturnType<typeof getQuirqApps>[number]): string {
    if (!app.component) return defaultAppTemplate
    const component = path.resolve(root, app.component)
    const relative = path.relative(path.resolve(root, 'src'), component)
    if (relative.startsWith('..') || path.isAbsolute(relative) || !fs.existsSync(component)) {
        throw new Error(`Invalid component for ${app.repo}: ${app.component}`)
    }
    return component
}

function catalogPage(app: ReturnType<typeof getQuirqApps>[number]) {
    return { path: app.path, component: getAppTemplate(app), context: { app } }
}

export const createPages: GatsbyNode['createPages'] = ({ actions }) => {
    for (const app of getQuirqApps()) {
        actions.createPage(catalogPage(app))
    }
    // Built app pages are more specific, so they take precedence over /apps/*.
    for (const page of clientOnlyPages) actions.createPage(page)
}

// Retain upstream source on disk, but publish only the quirq catalog and settings.
// The stateful source-page creator can run after createPages, so deleting a legacy
// /docs collision alone would also remove the catalog's page at that path. Restore
// the catalog page immediately; its matching component ends the callback recursion.
export const onCreatePage: GatsbyNode['onCreatePage'] = ({ page, actions }) => {
    if (clientOnlyPages.some((entry) => entry.matchPath === page.matchPath)) return
    const app = getQuirqApps().find((entry) => entry.path === normalizePath(page.path))
    if (app) {
        if (path.resolve(page.component) !== getAppTemplate(app)) {
            actions.deletePage(page)
            actions.createPage(catalogPage(app))
        }
        return
    }
    if (!sourcePages.has(normalizePath(page.path))) actions.deletePage(page)
}

// Gatsby extracts GraphQL from every file under src, including unused legacy pages.
// Those pages rely on PostHog's CMS schema. Limit extraction to the active app surface
// without moving or rewriting the archived source. Catalog data is imported JSON.
export const preprocessSource: GatsbyNode['preprocessSource'] = ({ filename }) => {
    const sourceRoot = path.resolve(root, 'src')
    const relative = path.relative(sourceRoot, filename).replace(/\\/g, '/')
    if (relative.startsWith('../') || path.isAbsolute(relative)) return
    const active = new Set([
        'pages/index.tsx',
        'pages/display-options.tsx',
        'pages/projects.tsx',
        'pages/404.js',
        'pages/404.tsx',
        'components/seo.tsx',
        'templates/quirq-app.tsx',
        'templates/quirq-live-app.tsx',
        'templates/quirq-launch.tsx',
        ...getQuirqApps().map((app) => path.relative(sourceRoot, getAppTemplate(app)).replace(/\\/g, '/')),
    ])
    if (!active.has(relative)) return 'export {}'
}

export const onCreateBabelConfig: GatsbyNode['onCreateBabelConfig'] = ({ actions }) => {
    actions.setBabelPlugin({
        name: '@babel/plugin-transform-react-jsx',
        options: { runtime: 'automatic' },
    })
}

export const onCreateWebpackConfig: GatsbyNode['onCreateWebpackConfig'] = ({ actions }) => {
    actions.setWebpackConfig({
        cache: process.env.NODE_ENV === 'development' || { compression: 'gzip' },
        resolve: {
            extensions: ['.js', '.ts', '.tsx', '.mjs'],
            modules: [path.resolve(root, 'src'), 'node_modules'],
            alias: {
                '~': path.resolve(root, 'src'),
                lib: path.resolve(root, 'src/lib'),
                types: path.resolve(root, 'src/types'),
                images: path.resolve(root, 'src/images'),
                components: path.resolve(root, 'src/components'),
                constants: path.resolve(root, 'src/constants'),
                logic: path.resolve(root, 'src/logic'),
                hooks: path.resolve(root, 'src/hooks'),
            },
        },
    })
}
