// Refresh src/data/quirq-projects.json: the shape of every repo in quirq.projects.json.
// Uses anonymous git (a shallow, blobless clone per repo for the files, and a commits-only clone for who committed),
// release's public channels.json, and one anonymous GitHub API request for star counts, falling back to the stars in
// the apps snapshot. It needs no token. Run with `pnpm projects:sync`; `--check` validates offline.
// Only counts are saved: no names or emails of the people who committed.
import { execFile } from 'node:child_process'
import { mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import {
    buildQuirqProjects,
    countPeople,
    DEFAULT_AUTOMATION,
    readSignals,
    validateProjectsConfig,
} from './lib/quirq-phases.mjs'

const run = promisify(execFile)
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const CHANNELS_URL = 'https://raw.githubusercontent.com/quirq-ai/release/release-state/channels.json'

async function git(args, cwd) {
    const { stdout } = await run('git', args, {
        cwd,
        maxBuffer: 64 * 1024 * 1024,
        env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
    })
    return stdout
}

/** Read one repo's default-branch file list, head commit and committers, without downloading file contents. */
export async function probeRepository(organization, name, workdir, automation = DEFAULT_AUTOMATION) {
    const directory = join(workdir, name.replace(/[^\w.-]/g, '_'))
    const history = `${directory}.history`
    await git(
        ['clone', '--quiet', '--bare', '--filter=tree:0', `https://github.com/${organization}/${name}.git`, history],
        workdir
    )
    let people = 0
    try {
        people = countPeople((await git(['log', '--format=%aN|%aE'], history)).split('\n'), automation)
    } catch {
        // An empty repository has no commits, so nobody has committed yet.
    }
    await git(
        [
            'clone',
            '--quiet',
            '--depth',
            '1',
            '--filter=blob:none',
            '--no-checkout',
            `https://github.com/${organization}/${name}.git`,
            directory,
        ],
        workdir
    )
    let head = ''
    try {
        head = (await git(['log', '-1', '--format=%H %cI'], directory)).trim()
    } catch {
        // An empty repository has no commits; it reads as having no files.
    }
    if (!head) return { name, sha: null, committedAt: null, people, ...readSignals([]) }
    const [sha, committedAt] = head.split(' ')
    const paths = (await git(['ls-tree', '-r', '--name-only', 'HEAD'], directory)).split('\n')
    return { name, sha, committedAt, people, ...readSignals(paths) }
}

async function canaryRepos(fetchImpl) {
    const response = await fetchImpl(CHANNELS_URL)
    if (!response.ok) throw new Error(`channels.json returned ${response.status}`)
    const channels = await response.json()
    return new Set(
        Object.entries(channels.repos || {})
            .filter(([, value]) => value?.canary?.commit)
            .map(([repo]) => repo)
    )
}

/** Star counts from one anonymous GitHub API request, or from the apps snapshot when the API is unavailable. */
async function starCounts(organization, fetchImpl, appsSnapshotPath) {
    try {
        const response = await fetchImpl(`https://api.github.com/orgs/${organization}/repos?per_page=100&type=public`, {
            headers: { Accept: 'application/vnd.github+json' },
        })
        if (!response.ok) throw new Error(`GitHub API returned ${response.status}`)
        const repos = await response.json()
        return { source: 'github-api', stars: new Map(repos.map((repo) => [repo.name, repo.stargazers_count || 0])) }
    } catch (error) {
        const snapshot = JSON.parse(await readFile(appsSnapshotPath, 'utf8'))
        console.warn(`Star counts from the apps snapshot of ${snapshot.fetchedAt}: ${error.message}`)
        return {
            source: `apps-snapshot ${snapshot.fetchedAt}`,
            stars: new Map(snapshot.repositories.map((repo) => [repo.name, repo.stargazers_count || 0])),
        }
    }
}

export async function syncQuirqProjects({
    configPath = resolve(projectRoot, 'quirq.projects.json'),
    outputPath = resolve(projectRoot, 'src/data/quirq-projects.json'),
    appsSnapshotPath = resolve(projectRoot, 'src/data/quirq-repositories.json'),
    check = false,
    probe = probeRepository,
    fetchImpl = fetch,
} = {}) {
    const config = validateProjectsConfig(JSON.parse(await readFile(configPath, 'utf8')))
    if (check) {
        const snapshot = JSON.parse(await readFile(outputPath, 'utf8'))
        const groups = buildQuirqProjects(snapshot, config)
        const missing = groups.flatMap((group) =>
            group.projects.filter((project) => project.missing).map((p) => p.name)
        )
        if (missing.length) throw new Error(`No snapshot entry for ${missing.join(', ')}. Run pnpm projects:sync.`)
        return { snapshot, groups, written: false }
    }
    const names = config.groups.flatMap((group) => group.repos)
    const canary = await canaryRepos(fetchImpl)
    const { source: starsSource, stars } = await starCounts(config.organization, fetchImpl, appsSnapshotPath)
    const automation = config.automation || DEFAULT_AUTOMATION
    const workdir = await mkdtemp(join(tmpdir(), 'quirq-projects-'))
    try {
        const repositories = []
        for (let index = 0; index < names.length; index += 6) {
            const batch = await Promise.all(
                names.slice(index, index + 6).map((name) => probe(config.organization, name, workdir, automation))
            )
            repositories.push(
                ...batch.map((repo) => ({ ...repo, inCanary: canary.has(repo.name), stars: stars.get(repo.name) || 0 }))
            )
        }
        const snapshot = {
            organization: config.organization,
            fetchedAt: new Date().toISOString(),
            starsSource,
            repositories,
        }
        const groups = buildQuirqProjects(snapshot, config)
        const temporaryPath = `${outputPath}.${process.pid}.tmp`
        try {
            await writeFile(temporaryPath, `${JSON.stringify(snapshot, null, 4)}\n`, { flag: 'wx' })
            await rename(temporaryPath, outputPath)
        } finally {
            await rm(temporaryPath, { force: true })
        }
        return { snapshot, groups, written: true }
    } finally {
        await rm(workdir, { recursive: true, force: true })
    }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const unknown = process.argv.slice(2).filter((arg) => arg !== '--check')
    if (unknown.length) {
        console.error('Usage: node scripts/sync-quirq-projects.mjs [--check]')
        process.exitCode = 1
    } else {
        syncQuirqProjects({ check: process.argv.includes('--check') })
            .then(({ groups, written }) => {
                const counts = {}
                for (const project of groups.flatMap((group) => group.projects))
                    counts[project.phase] = (counts[project.phase] || 0) + 1
                const summary = Object.entries(counts)
                    .map(([phase, count]) => `${count} ${phase}`)
                    .join(', ')
                console.log(
                    `${written ? 'Synced' : 'Validated'} ${
                        groups.flatMap((g) => g.projects).length
                    } projects: ${summary}.`
                )
            })
            .catch((error) => {
                console.error(`quirq projects: ${error.message}`)
                process.exitCode = 1
            })
    }
}
