// Shared by the Gatsby UI and the Node sync command. Keep this module free of Node APIs.
export const QUIRQ_COLORS = ['blue', 'purple', 'orange', 'green', 'red', 'yellow']
export const QUIRQ_ICONS = ['code', 'globe', 'book', 'mail', 'chat', 'rocket']
const presentations = ['overview', 'reader', 'gallery']
// external: a new browser tab. window: its own window on this site, in an iframe (/launch/<repository>).
// embed: an App tab inside the repository's page.
const launchModes = ['external', 'window', 'embed']
const reservedRoots = new Set([
    'display-options',
    '404',
    '404.html',
    'dev-404-page',
    'offline-plugin-app-shell-fallback',
    'api',
    'page-data',
    'static',
])

function assert(condition, message) {
    if (!condition) throw new Error(message)
}

export function validateQuirqConfig(config) {
    assert(config && /^[a-z\d](?:[a-z\d-]{0,38})$/i.test(config.organization), 'Invalid GitHub organization')
    assert(typeof config.name === 'string' && config.name.trim(), 'A catalog name is required')
    const defaults = config.defaults || {}
    assert(typeof defaults === 'object' && !Array.isArray(defaults), 'defaults must be an object')
    assert(
        !config.repositories || (typeof config.repositories === 'object' && !Array.isArray(config.repositories)),
        'repositories must be an object'
    )
    assert(
        !defaults.excludeRepositories ||
            (Array.isArray(defaults.excludeRepositories) &&
                defaults.excludeRepositories.every((repo) => typeof repo === 'string')),
        'excludeRepositories must be an array of repository names'
    )
    for (const key of ['includeForks', 'includeArchived']) {
        assert(defaults[key] === undefined || typeof defaults[key] === 'boolean', `defaults.${key} must be a boolean`)
    }
    validatePresentation(defaults, 'defaults')
    for (const [repo, override] of Object.entries(config.repositories || {})) {
        assert(/^[a-z\d_.-]+$/i.test(repo), `Invalid repository mapping: ${repo}`)
        assert(override && typeof override === 'object' && !Array.isArray(override), `Invalid mapping for ${repo}`)
        validatePresentation(override, repo)
        if (override.path !== undefined) normalizeAppPath(override.path)
        for (const key of ['hidden', 'featured']) {
            assert(
                override[key] === undefined || typeof override[key] === 'boolean',
                `${repo}.${key} must be a boolean`
            )
        }
        if (override.launchUrl !== undefined && override.launchUrl !== null) safeWebUrl(override.launchUrl)
        if (override.component !== undefined) {
            assert(
                typeof override.component === 'string' &&
                    /^src\/templates\/(?:[a-z\d_-]+\/)*[a-z\d_.-]+\.[jt]sx?$/i.test(override.component) &&
                    !override.component.includes('..'),
                `${repo}.component must be a file under src/templates`
            )
        }
        if (override.window !== undefined) {
            assert(override.window && typeof override.window === 'object', `${repo}.window must be an object`)
            for (const dimension of ['width', 'height']) {
                const value = override.window[dimension]
                assert(
                    value === undefined || (Number.isInteger(value) && value > 0 && value <= 8192),
                    `${repo}.window.${dimension} must be a positive pixel size`
                )
            }
        }
    }
    return config
}

export function normalizeAppPath(value) {
    assert(
        typeof value === 'string' && /^\/(?:[a-z\d_.-]+\/)*[a-z\d_.-]+\/?$/i.test(value),
        `Invalid app path: ${value}`
    )
    const path = value.replace(/\/$/, '')
    assert(!path.split('/').some((segment) => segment === '.' || segment === '..'), `Invalid app path: ${value}`)
    assert(!reservedRoots.has(path.split('/')[1].toLowerCase()), `App path is reserved: ${path}`)
    return path
}

export function safeWebUrl(value, { allowBareHost = false } = {}) {
    if (value === null || value === undefined || value === '') return null
    assert(typeof value === 'string', 'App URL must be a string')
    const input = value.trim()
    const withScheme =
        allowBareHost && /^[a-z\d](?:[a-z\d.-]*\.)[a-z]{2,}(?:[/:?#]|$)/i.test(input) ? `https://${input}` : input
    let url
    try {
        url = new URL(withScheme)
    } catch {
        throw new Error(`Invalid app URL: ${value}`)
    }
    assert(['https:', 'http:'].includes(url.protocol) && !url.username && !url.password, `Unsafe app URL: ${value}`)
    return url.href
}

export function normalizeRepository(repo, organization) {
    assert(repo && typeof repo === 'object', 'Invalid GitHub repository response')
    assert(
        repo.private === false && (!repo.visibility || repo.visibility === 'public'),
        'Only public repositories may enter the app catalog'
    )
    assert(typeof repo.name === 'string' && /^[a-z\d_.-]+$/i.test(repo.name), 'Invalid GitHub repository name')
    const expected = `${organization}/${repo.name}`
    assert(
        typeof repo.full_name === 'string' && repo.full_name.toLowerCase() === expected.toLowerCase(),
        `Repository does not belong to ${organization}`
    )
    if (repo.owner) {
        const owner = typeof repo.owner === 'string' ? repo.owner : repo.owner.login
        assert(
            typeof owner === 'string' && owner.toLowerCase() === organization.toLowerCase(),
            'Unexpected repository owner'
        )
    }
    const repoUrl = `https://github.com/${repo.full_name}`
    assert(
        !repo.html_url || repo.html_url.replace(/\/$/, '').toLowerCase() === repoUrl.toLowerCase(),
        'Unexpected repository URL'
    )
    assert(typeof repo.default_branch === 'string' && repo.default_branch, `Missing default branch for ${repo.name}`)
    assert(
        typeof repo.updated_at === 'string' && Number.isFinite(Date.parse(repo.updated_at)),
        `Invalid update time for ${repo.name}`
    )
    return {
        name: repo.name,
        full_name: repo.full_name,
        html_url: repoUrl,
        description: typeof repo.description === 'string' ? repo.description : '',
        homepage: safeWebUrl(repo.homepage, { allowBareHost: true }),
        private: false,
        archived: repo.archived === true,
        fork: repo.fork === true,
        language: typeof repo.language === 'string' ? repo.language : null,
        topics: Array.isArray(repo.topics) ? repo.topics.filter((topic) => typeof topic === 'string') : [],
        stargazers_count:
            Number.isInteger(repo.stargazers_count) && repo.stargazers_count >= 0 ? repo.stargazers_count : 0,
        updated_at: repo.updated_at,
        default_branch: repo.default_branch,
        readmeMarkdown: typeof repo.readmeMarkdown === 'string' ? repo.readmeMarkdown : null,
        readmePath: typeof repo.readmePath === 'string' ? repo.readmePath : null,
    }
}

/**
 * A snapshot built from GitHub's current repository list, read live in the browser. Repositories that
 * fail validation are dropped instead of failing the whole list. README text is not in GitHub's list,
 * so each repository keeps the README bundled for it, if any.
 */
export function mergeLiveRepositories(snapshot, liveRepositories, fetchedAt) {
    assert(Array.isArray(liveRepositories), 'GitHub returned an invalid repository list')
    const readmes = new Map(snapshot.repositories.map((repo) => [repo.name.toLowerCase(), repo]))
    const names = new Set()
    const repositories = []
    for (const raw of liveRepositories) {
        let repo
        try {
            repo = normalizeRepository(raw, snapshot.organization)
        } catch {
            continue
        }
        const key = repo.name.toLowerCase()
        if (names.has(key)) continue
        names.add(key)
        const bundled = readmes.get(key)
        repositories.push({
            ...repo,
            readmeMarkdown: bundled?.readmeMarkdown ?? null,
            readmePath: bundled?.readmePath ?? null,
        })
    }
    return {
        organization: snapshot.organization,
        fetchedAt,
        repositories: repositories.sort((a, b) => a.name.localeCompare(b.name)),
    }
}

function choice(value, allowed, label) {
    assert(allowed.includes(value), `Invalid ${label}: ${value}`)
    return value
}

function validatePresentation(settings, label) {
    for (const [key, options] of Object.entries({
        icon: QUIRQ_ICONS,
        color: QUIRQ_COLORS,
        presentation: presentations,
        launchMode: launchModes,
    })) {
        if (settings[key] !== undefined) choice(settings[key], options, `${label}.${key}`)
    }
    for (const key of ['name', 'description', 'category']) {
        assert(settings[key] === undefined || typeof settings[key] === 'string', `${label}.${key} must be a string`)
    }
}

function colorFor(repo) {
    return QUIRQ_COLORS[Array.from(repo).reduce((sum, letter) => sum + letter.charCodeAt(0), 0) % QUIRQ_COLORS.length]
}

export function buildQuirqApps(snapshot, config) {
    validateQuirqConfig(config)
    assert(
        snapshot && snapshot.organization?.toLowerCase() === config.organization.toLowerCase(),
        'Snapshot organization does not match mapping; run the sync command'
    )
    assert(Array.isArray(snapshot.repositories), 'Invalid repository snapshot')
    const defaults = config.defaults || {}
    const excluded = new Set((defaults.excludeRepositories || ['.github']).map((repo) => repo.toLowerCase()))
    const paths = new Set()
    const names = new Set()
    return snapshot.repositories
        .map((repo) => normalizeRepository(repo, config.organization))
        .flatMap((repo) => {
            assert(!names.has(repo.name.toLowerCase()), `Duplicate repository: ${repo.name}`)
            names.add(repo.name.toLowerCase())
            const override = config.repositories?.[repo.name] || {}
            if (
                override.hidden ||
                excluded.has(repo.name.toLowerCase()) ||
                (repo.archived && !defaults.includeArchived) ||
                (repo.fork && defaults.includeForks === false)
            )
                return []
            const path = normalizeAppPath(override.path || `/apps/${repo.name}`)
            assert(!paths.has(path.toLowerCase()), `Duplicate app path: ${path}`)
            paths.add(path.toLowerCase())
            const launchMode = choice(
                override.launchMode || defaults.launchMode || 'external',
                launchModes,
                'launch mode'
            )
            // Embedding is an explicit decision for a repository, never a catalog-wide default.
            assert(
                launchMode !== 'embed' || override.launchMode === 'embed',
                `Embedding must be explicitly enabled for ${repo.name}`
            )
            const launchUrl = Object.hasOwn(override, 'launchUrl') ? safeWebUrl(override.launchUrl) : repo.homepage
            assert(launchMode !== 'embed' || launchUrl, `Embedding requires a launch URL for ${repo.name}`)
            return [
                {
                    id: repo.full_name,
                    repo: repo.name,
                    name: override.name || repo.name,
                    description: override.description ?? repo.description,
                    path,
                    icon: choice(override.icon || defaults.icon || 'code', QUIRQ_ICONS, 'icon'),
                    color: choice(override.color || defaults.color || colorFor(repo.name), QUIRQ_COLORS, 'color'),
                    category: override.category || defaults.category || 'Apps',
                    featured: override.featured === true,
                    repoUrl: repo.html_url,
                    homepage: repo.homepage,
                    launchUrl,
                    launchMode,
                    presentation: choice(
                        override.presentation || defaults.presentation || 'overview',
                        presentations,
                        'presentation'
                    ),
                    language: repo.language,
                    topics: repo.topics,
                    stars: repo.stargazers_count,
                    updatedAt: repo.updated_at,
                    defaultBranch: repo.default_branch,
                    readmeMarkdown: repo.readmeMarkdown,
                    readmePath: repo.readmePath,
                    ...(override.component ? { component: override.component } : {}),
                    ...(override.window ? { window: override.window } : {}),
                },
            ]
        })
        .sort((a, b) => Number(b.featured) - Number(a.featured) || a.name.localeCompare(b.name))
}
