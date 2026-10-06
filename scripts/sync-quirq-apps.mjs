import { readFile, writeFile, rename, rm } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Buffer } from 'node:buffer'
import { buildQuirqApps, normalizeRepository, validateQuirqConfig } from './lib/quirq-catalog.mjs'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

export async function fetchOrganizationRepositories(organization, { fetchImpl = fetch, token, maxPages = 100 } = {}) {
    const repositories = []
    const names = new Set()
    let next = `https://api.github.com/orgs/${encodeURIComponent(
        organization
    )}/repos?type=public&per_page=100&sort=full_name&page=1`
    let pages = 0
    const seenPages = new Set()
    while (next) {
        if (++pages > maxPages || seenPages.has(next)) throw new Error('GitHub pagination did not complete')
        seenPages.add(next)
        const url = new URL(next)
        if (url.origin !== 'https://api.github.com' || url.pathname !== `/orgs/${organization}/repos`)
            throw new Error('Unexpected GitHub pagination URL')
        const response = await fetchImpl(next, {
            headers: {
                Accept: 'application/vnd.github+json',
                'User-Agent': 'Quirq-Home-Base',
                'X-GitHub-Api-Version': '2022-11-28',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            redirect: 'error',
            signal: AbortSignal.timeout(30000),
        })
        // Do not log response bodies or headers: authenticated errors can carry sensitive data.
        if (!response.ok)
            throw new Error(`GitHub returned HTTP ${response.status}; the existing snapshot was preserved`)
        const page = await response.json()
        if (!Array.isArray(page)) throw new Error('GitHub returned an invalid repository list')
        for (const raw of page) {
            const repo = normalizeRepository(raw, organization)
            if (names.has(repo.full_name.toLowerCase()))
                throw new Error(`Duplicate repository across GitHub pages: ${repo.name}`)
            names.add(repo.full_name.toLowerCase())
            repositories.push(repo)
        }
        const links = response.headers.get('link') || ''
        next =
            links
                .split(',')
                .map((link) => link.trim().match(/^<([^>]+)>;\s*rel="next"$/))
                .find(Boolean)?.[1] || null
    }
    return repositories.sort((a, b) => a.name.localeCompare(b.name))
}

export async function fetchRepositoryReadme(repo, { fetchImpl = fetch, token } = {}) {
    const response = await fetchImpl(`https://api.github.com/repos/${repo.full_name}/readme`, {
        headers: {
            Accept: 'application/vnd.github+json',
            'User-Agent': 'Quirq-Home-Base',
            'X-GitHub-Api-Version': '2022-11-28',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        redirect: 'error',
        signal: AbortSignal.timeout(30000),
    })
    if (response.status === 404) return { readmeMarkdown: null, readmePath: null }
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const readme = await response.json()
    if (
        readme.encoding !== 'base64' ||
        typeof readme.content !== 'string' ||
        typeof readme.path !== 'string' ||
        readme.path.startsWith('/') ||
        readme.path.split('/').includes('..')
    )
        throw new Error('Unexpected README response')
    if (readme.size > 500000) throw new Error('README is too large to include in the home base')
    return { readmeMarkdown: Buffer.from(readme.content, 'base64').toString('utf8'), readmePath: readme.path }
}

/** Drop README text kept for repositories that are no longer visible apps. Needs no network. */
export function pruneHiddenReadmes(snapshot, config) {
    const visible = new Set(buildQuirqApps(snapshot, config).map((app) => app.id))
    let pruned = 0
    for (const repo of snapshot.repositories) {
        if (!visible.has(repo.full_name) && (repo.readmeMarkdown || repo.readmePath)) {
            repo.readmeMarkdown = null
            repo.readmePath = null
            pruned += 1
        }
    }
    return pruned
}

async function writeSnapshot(outputPath, snapshot) {
    const temporaryPath = `${outputPath}.${process.pid}.tmp`
    try {
        await writeFile(temporaryPath, `${JSON.stringify(snapshot, null, 4)}\n`, { flag: 'wx' })
        // Replace only after the entire fetch and mapping validation have succeeded.
        await rename(temporaryPath, outputPath)
    } finally {
        await rm(temporaryPath, { force: true })
    }
}

export async function syncQuirqApps({
    configPath = resolve(projectRoot, 'quirq.apps.json'),
    outputPath = resolve(projectRoot, 'src/data/quirq-repositories.json'),
    fetchImpl = fetch,
    token = process.env.GITHUB_TOKEN,
    check = false,
    prune = false,
    warn = console.warn,
} = {}) {
    if (check && prune) throw new Error('Use either --check or --prune, not both.')
    const config = validateQuirqConfig(JSON.parse(await readFile(configPath, 'utf8')))
    if (check || prune) {
        const snapshot = JSON.parse(await readFile(outputPath, 'utf8'))
        const apps = buildQuirqApps(snapshot, config)
        const pruned = pruneHiddenReadmes(snapshot, config)
        if (check && pruned > 0) {
            throw new Error(
                `${pruned} hidden repositories still carry README text in the snapshot. Run pnpm apps:prune (or pnpm apps:sync).`
            )
        }
        if (pruned === 0) return { snapshot, apps, written: false }
        await writeSnapshot(outputPath, snapshot)
        return { snapshot, apps, written: true }
    }
    const repositories = await fetchOrganizationRepositories(config.organization, { fetchImpl, token })
    const snapshot = { organization: config.organization, fetchedAt: new Date().toISOString(), repositories }
    const visible = new Set(buildQuirqApps(snapshot, config).map((app) => app.id))
    // Readme failures should not hide otherwise valid public apps. Limit concurrent requests.
    const pending = repositories.filter((repo) => visible.has(repo.full_name))
    for (let index = 0; index < pending.length; index += 4) {
        await Promise.all(
            pending.slice(index, index + 4).map(async (repo) => {
                try {
                    Object.assign(repo, await fetchRepositoryReadme(repo, { fetchImpl, token }))
                } catch {
                    warn(`README unavailable for ${repo.full_name}; keeping its repository link.`)
                }
            })
        )
    }
    const apps = buildQuirqApps(snapshot, config)
    await writeSnapshot(outputPath, snapshot)
    return { snapshot, apps, written: true }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const unknown = process.argv.slice(2).filter((arg) => arg !== '--check' && arg !== '--prune')
    if (unknown.length) {
        console.error('Usage: node scripts/sync-quirq-apps.mjs [--check | --prune]')
        process.exitCode = 1
    } else {
        const prune = process.argv.includes('--prune')
        syncQuirqApps({ check: process.argv.includes('--check'), prune })
            .then(({ snapshot, apps, written }) => {
                console.log(
                    `${written ? (prune ? 'Pruned hidden READMEs from' : 'Synced') : 'Validated'} ${
                        snapshot.repositories.length
                    } public repositories from ${snapshot.organization}; ${apps.length} visible apps.`
                )
            })
            .catch((error) => {
                console.error(`Quirq catalog: ${error.message}`)
                process.exitCode = 1
            })
    }
}
