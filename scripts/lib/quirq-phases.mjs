// The project phase ladder: where each quirq repo stands, read from the repo's shape.
// Shared by the projects sync script, its tests and the browser (src/lib/quirqProjects.ts).

export const PHASES = [
    {
        id: 'thought',
        name: 'Thought',
        rule: 'Notes or a README only, no code.',
    },
    {
        id: 'prototype',
        name: 'Prototype',
        rule: 'Real code, but no CI.',
    },
    {
        id: 'built',
        name: 'Built',
        rule: 'Code with CI on GitHub.',
    },
    {
        id: 'shipping',
        name: 'Shipping',
        rule: 'Built, and onboarded to qq (infra/repo.toml), deployed, or in the daily canary.',
    },
    {
        id: 'project',
        name: 'Project',
        rule: 'Has users: at least 10 GitHub stars or at least 5 people committing to it.',
    },
]

const PHASE_IDS = new Set(PHASES.map((phase) => phase.id))

/** Defaults for the Project rule; quirq.projects.json can change them under `projectRule`. */
export const DEFAULT_PROJECT_RULE = { minStars: 10, minPeople: 5 }

/** The Project rule in words, from the configured thresholds. */
export function projectRuleText(rule = DEFAULT_PROJECT_RULE) {
    return `Has users: at least ${plural(rule.minStars, 'GitHub star')} or at least ${plural(
        rule.minPeople,
        'person',
        'people'
    )} committing to it.`
}

/** Public repos in a catalog snapshot that quirq.projects.json neither groups nor hides. */
export function ungroupedRepositories(names, config) {
    const grouped = new Set(config.groups.flatMap((group) => group.repos))
    return names.filter((name) => !grouped.has(name) && !config.repositories?.[name]?.hidden)
}

/** Commit identities that are agents or automation, not people. Matched against the lowercased email. */
export const DEFAULT_AUTOMATION = [
    'noreply@anthropic.com',
    'gates@quirq.ai',
    'cursoragent@cursor.com',
    '+copilot@users.noreply.github.com',
]

const githubLogin = (email) => email.match(/^(?:\d+\+)?([^@]+)@users\.noreply\.github\.com$/)?.[1]
const GENERIC_MAILBOXES = new Set(['admin', 'contact', 'dev', 'hello', 'info', 'noreply', 'support', 'team'])
const squash = (value) => value.toLowerCase().replace(/[^a-z0-9]/g, '')

/**
 * How many distinct people have committed, from `name|email` lines (git log --format='%aN|%aE'). Bots and the
 * automation identities are left out. One person often commits under several names and emails, so identities that
 * share an email, a GitHub login, a name or an email's personal mailbox name (ignoring case, spaces and punctuation)
 * count once.
 */
export function countPeople(lines, automation = DEFAULT_AUTOMATION) {
    const parent = new Map()
    const find = (key) => {
        while (parent.get(key) !== key) key = parent.get(key)
        return key
    }
    const union = (a, b) => parent.set(find(a), find(b))
    const ignored = automation.map((entry) => entry.toLowerCase())
    for (const line of lines) {
        const [name = '', rawEmail = ''] = line.split('|')
        const email = rawEmail.trim().toLowerCase()
        if (!name.trim() && !email) continue
        if (/\[bot\]/i.test(name) || /\[bot\]/.test(email) || ignored.some((entry) => email.endsWith(entry))) continue
        const keys = [email && `e:${email}`, squash(name) && `n:${squash(name)}`]
        const login = email && githubLogin(email)
        const local = squash(email.split('@')[0])
        if (login) keys.push(`n:${squash(login)}`)
        else if (local.length >= 4 && !GENERIC_MAILBOXES.has(local)) keys.push(`n:${local}`)
        const present = keys.filter(Boolean)
        for (const key of present) if (!parent.has(key)) parent.set(key, key)
        for (const key of present.slice(1)) union(present[0], key)
    }
    return new Set([...parent.keys()].map(find)).size
}
const plural = (count, word, many = `${word}s`) => `${count} ${count === 1 ? word : many}`

/** Files that count as notes rather than code. */
export function isNoteFile(path) {
    const name = path.split('/').pop().toLowerCase()
    return (
        /\.(md|mdx|txt|rst|png|jpe?g|gif|svg|webp|ico|pdf)$/.test(name) ||
        ['license', 'licence', 'notice', 'codeowners', '.gitignore', '.gitattributes'].includes(name) ||
        name.startsWith('license.') ||
        name.startsWith('licence.')
    )
}

/** Signals read from a repo's file list (paths relative to its root, default branch head). */
export function readSignals(paths) {
    const files = paths.filter(Boolean)
    const workflows = files.filter((path) => /^\.github\/workflows\/[^/]+\.ya?ml$/.test(path)).length
    const codeFiles = files.filter((path) => !isNoteFile(path) && !path.startsWith('.github/')).length
    return {
        files: files.length,
        codeFiles,
        workflows,
        repoToml: files.includes('infra/repo.toml'),
        deployConfig: files.includes('vercel.json') || files.some((path) => /(^|\/)netlify\.toml$/.test(path)),
    }
}

/**
 * The phase for one repo. `signals` comes from readSignals plus `inCanary`; `override` is the repo's entry in
 * quirq.projects.json. Returns the phase id and a one-line reason a reader can check.
 */
export function computePhase(signals, override = {}, rule = DEFAULT_PROJECT_RULE) {
    if (override.phase !== undefined) {
        if (!PHASE_IDS.has(override.phase)) throw new Error(`Unknown phase "${override.phase}"`)
        if (typeof override.phaseReason !== 'string' || !override.phaseReason.trim())
            throw new Error(`A phase set by hand needs a phaseReason`)
        return { phase: override.phase, reason: override.phaseReason.trim(), overridden: true }
    }
    const stars = signals?.stars || 0
    const people = signals?.people || 0
    if (stars >= rule.minStars || people >= rule.minPeople)
        return {
            phase: 'project',
            reason: `${plural(stars, 'GitHub star')} and ${plural(people, 'person', 'people')} committing.`,
            overridden: false,
        }
    if (!signals || signals.files === 0)
        return { phase: 'thought', reason: 'The repo has no files yet.', overridden: false }
    if (signals.codeFiles === 0) return { phase: 'thought', reason: 'Notes only, no code yet.', overridden: false }
    if (signals.workflows === 0)
        return {
            phase: 'prototype',
            reason: `${plural(signals.codeFiles, 'code or config file')}, no CI yet.`,
            overridden: false,
        }
    const shipping = [
        signals.repoToml && 'onboarded to qq',
        signals.deployConfig && 'has a deploy config',
        signals.inCanary && 'in the daily canary',
    ].filter(Boolean)
    if (shipping.length)
        return { phase: 'shipping', reason: `CI on GitHub, ${shipping.join(', ')}.`, overridden: false }
    return {
        phase: 'built',
        reason: `${plural(signals.codeFiles, 'code or config file')} with ${plural(signals.workflows, 'CI workflow')}.`,
        overridden: false,
    }
}

export function validateProjectsConfig(config) {
    if (!config || typeof config !== 'object') throw new Error('quirq.projects.json must be an object')
    if (typeof config.organization !== 'string') throw new Error('quirq.projects.json needs an organization')
    if (!Array.isArray(config.groups) || config.groups.length === 0) throw new Error('quirq.projects.json needs groups')
    const seen = new Set()
    for (const group of config.groups) {
        if (typeof group.name !== 'string' || !Array.isArray(group.repos))
            throw new Error('Each group needs a name and a repos list')
        for (const repo of group.repos) {
            if (seen.has(repo)) throw new Error(`${repo} is in more than one group`)
            seen.add(repo)
        }
    }
    const rule = { ...DEFAULT_PROJECT_RULE, ...config.projectRule }
    for (const key of ['minStars', 'minPeople'])
        if (!Number.isInteger(rule[key]) || rule[key] < 1)
            throw new Error(`projectRule.${key} must be a whole number above 0`)
    if (
        config.automation !== undefined &&
        !(Array.isArray(config.automation) && config.automation.every((x) => typeof x === 'string'))
    )
        throw new Error('automation must be a list of email suffixes')
    for (const [repo, entry] of Object.entries(config.repositories || {})) {
        if (!seen.has(repo) && !entry.hidden) throw new Error(`${repo} has settings but is in no group`)
        if (entry.phase !== undefined) computePhase({ files: 1, codeFiles: 0, workflows: 0 }, entry)
    }
    return config
}

/** The projects view: groups of repos, each with its phase, reason, description and signals. */
export function buildQuirqProjects(snapshot, config) {
    validateProjectsConfig(config)
    const byName = new Map((snapshot.repositories || []).map((repo) => [repo.name, repo]))
    const rule = { ...DEFAULT_PROJECT_RULE, ...config.projectRule }
    return config.groups.map((group) => ({
        name: group.name,
        description: group.description || '',
        projects: group.repos
            .filter((name) => !config.repositories?.[name]?.hidden)
            .map((name) => {
                const settings = config.repositories?.[name] || {}
                const repo = byName.get(name)
                const result = computePhase(repo, settings, rule)
                return {
                    name,
                    description: settings.description || '',
                    url: `https://github.com/${config.organization}/${name}`,
                    missing: !repo,
                    committedAt: repo?.committedAt || null,
                    sha: repo?.sha || null,
                    signals: repo
                        ? {
                              files: repo.files,
                              codeFiles: repo.codeFiles,
                              workflows: repo.workflows,
                              repoToml: repo.repoToml,
                              deployConfig: repo.deployConfig,
                              inCanary: Boolean(repo.inCanary),
                              stars: repo.stars || 0,
                              people: repo.people || 0,
                          }
                        : null,
                    ...result,
                }
            }),
    }))
}
