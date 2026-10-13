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

// Publish only the catalog and explicit filesystem pages. Gatsby's stateful page
// creator can run after createPages; restore a catalog page when a source route
// collides with it, and stop recursion when its component matches.
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

// Extract GraphQL only from the active page surface and SEO; catalog data is JSON.
export const preprocessSource: GatsbyNode['preprocessSource'] = ({ filename }) => {
    const sourceRoot = path.resolve(root, 'src')
    const relative = path.relative(sourceRoot, filename).replace(/\\/g, '/')
    if (relative.startsWith('../') || path.isAbsolute(relative)) return
    const active = new Set([
        'pages/index.tsx',
        'pages/display-options.tsx',
        'pages/projects.tsx',
        'pages/404.js',
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

export const onCreateWebpackConfig: GatsbyNode['onCreateWebpackConfig'] = ({ stage, actions }) => {
    // The browser bundle carries the repository list without README text (see the loader).
    const browser = stage === 'develop' || stage === 'build-javascript'
    actions.setWebpackConfig({
        cache: process.env.NODE_ENV === 'development' || { compression: 'gzip' },
        ...(browser
            ? {
                  module: {
                      rules: [
                          {
                              test: path.resolve(root, 'src/data/quirq-repositories.json'),
                              use: [path.resolve(root, 'scripts/lib/strip-readmes-loader.cjs')],
                          },
                      ],
                  },
              }
            : {}),
        resolve: {
            extensions: ['.js', '.ts', '.tsx', '.mjs'],
            modules: [path.resolve(root, 'src'), 'node_modules'],
            alias: {
                '~': path.resolve(root, 'src'),
                lib: path.resolve(root, 'src/lib'),
                components: path.resolve(root, 'src/components'),
                hooks: path.resolve(root, 'src/hooks'),
            },
        },
    })
}
