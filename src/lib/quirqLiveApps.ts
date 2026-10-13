import { useSyncExternalStore } from 'react'
import snapshot from '../data/quirq-repositories.json'
import { buildQuirqApps, mergeLiveRepositories } from '../../scripts/lib/quirq-catalog.mjs'
import { getQuirqApps, quirqConfig, type QuirqApp } from './quirqApps'

// The organization's repository list, read live in the visitor's browser from GitHub's public REST
// API, so a repository created, renamed, described or deleted in the organization shows on the desktop,
// in Home base and in search without a rebuild. No token or backend. Anonymous reads allow 60 requests
// an hour per visitor; a refresh is one request per 100 repositories, and the browser revalidates with
// the ETag, so an unchanged list comes back as a 304, which GitHub does not count.

const organization = quirqConfig.organization
const REPOS_URL = `https://api.github.com/orgs/${organization}/repos?type=public&per_page=100&sort=full_name`
const REFRESH_MS = 5 * 60 * 1000
// A tab that comes back into view refreshes if the last attempt is older than this.
const STALE_MS = 60 * 1000
const MAX_PAGES = 10
// The last list this browser read, so a return visit starts from it while it refreshes.
const CACHE_KEY = 'quirq.repositories.v1'

/**
 * A public repository's type as GitHub sent it: any value, even one this site doesn't know (`role` is
 * null only when GitHub didn't show it), with whether it is archived. Hidden repositories are included.
 */
export type RepositoryType = { name: string; role: string | null; archived: boolean }

export type QuirqCatalog = {
    apps: QuirqApp[]
    /** Every public repository in the list, including the ones the catalog hides. */
    repositories: RepositoryType[]
    /** Public repositories in the organization, including any the catalog hides. */
    repositoryCount: number
    /** When the list was read from GitHub. */
    fetchedAt: string
    /**
     * `bundled`: the build's snapshot or this browser's last copy, while GitHub is read.
     * `live`: read from GitHub during this visit. `offline`: GitHub could not be read; the last list stays.
     */
    status: 'bundled' | 'live' | 'offline'
}

type Repository = (typeof snapshot.repositories)[number]

/** The `role` value GitHub sent for a repository (or a cached copy kept), whether or not this site knows it. */
function sentRole(item: unknown): string | undefined {
    const repo = (item ?? {}) as { custom_properties?: { role?: unknown }; roleValue?: unknown }
    const value = repo.custom_properties?.role ?? repo.roleValue
    return typeof value === 'string' && value ? value : undefined
}

function repositoryTypes(repositories: Repository[], sent = new Map<string, string>()): RepositoryType[] {
    return repositories.map((repo) => ({
        name: repo.name,
        role: sent.get(repo.name.toLowerCase()) ?? repo.role ?? null,
        archived: repo.archived === true,
    }))
}

const bundled: QuirqCatalog = {
    apps: getQuirqApps(),
    repositories: repositoryTypes(snapshot.repositories),
    repositoryCount: snapshot.repositories.length,
    fetchedAt: snapshot.fetchedAt,
    status: 'bundled',
}
let catalog = bundled
// The visible repository data behind `catalog.apps`, so an unchanged list keeps the same apps array.
let signature = signatureOf(snapshot.repositories)
// The repository list behind `catalog`, so a later read that hides types keeps the ones already known.
let current: unknown[] = snapshot.repositories
const listeners = new Set<() => void>()
let timer: number | undefined
let inflight: AbortController | null = null
let lastAttempt = 0
let pausedUntil = 0
let cacheRead = false

function signatureOf(repositories: Repository[]) {
    return JSON.stringify(repositories.map(({ readmeMarkdown, readmePath, ...repo }) => repo))
}

function emit(next: QuirqCatalog) {
    catalog = next
    listeners.forEach((listener) => listener())
}

/** Applies a repository list from GitHub (or this browser's copy of one). Returns the list to cache. */
function apply(repositories: unknown[], fetchedAt: string, status: QuirqCatalog['status']) {
    const merged = mergeLiveRepositories(snapshot, repositories, fetchedAt, current)
    const sent = new Map<string, string>()
    for (const item of repositories) {
        const name = (item as { name?: unknown })?.name
        const role = sentRole(item)
        if (typeof name === 'string' && role) sent.set(name.toLowerCase(), role)
    }
    const nextSignature = signatureOf(merged.repositories)
    let apps = catalog.apps
    if (nextSignature !== signature) {
        // Throws on a list the mapping cannot place (a duplicate path, say); the current apps then stay.
        apps = buildQuirqApps(merged, quirqConfig) as QuirqApp[]
        signature = nextSignature
    }
    current = merged.repositories
    const types = repositoryTypes(merged.repositories, sent)
    emit({ apps, repositories: types, repositoryCount: merged.repositories.length, fetchedAt, status })
    // The cached copy keeps the value GitHub sent, so a type this site doesn't know yet stays not a project.
    return merged.repositories.map(({ readmeMarkdown, readmePath, ...repo }: Repository, index: number) => ({
        ...repo,
        roleValue: types[index].role,
    }))
}

function readCache() {
    if (cacheRead) return
    cacheRead = true
    try {
        const cached = JSON.parse(window.localStorage.getItem(CACHE_KEY) || 'null')
        // Only a copy newer than the build's snapshot is worth starting from.
        if (cached && Array.isArray(cached.repositories) && cached.fetchedAt > snapshot.fetchedAt) {
            apply(cached.repositories, cached.fetchedAt, 'bundled')
        }
    } catch {
        // Storage can be unavailable or hold an old shape; the live read still runs.
    }
}

function nextPage(link: string | null) {
    const next = (link || '')
        .split(',')
        .map((part) => part.trim().match(/^<([^>]+)>;\s*rel="next"$/))
        .find(Boolean)?.[1]
    if (!next) return null
    const url = new URL(next)
    // GitHub's next links name the organization by login or by numeric id.
    const path = new RegExp(`^/(?:orgs/${organization}|organizations/\\d+)/repos$`, 'i')
    if (url.origin !== 'https://api.github.com' || !path.test(url.pathname)) {
        throw new Error('Unexpected GitHub pagination URL')
    }
    return url.href
}

async function fetchRepositories(signal: AbortSignal) {
    const repositories: unknown[] = []
    let next: string | null = REPOS_URL
    for (let page = 0; next; page += 1) {
        if (page === MAX_PAGES) throw new Error('GitHub pagination did not complete')
        const response: Response = await fetch(next, { cache: 'no-cache', signal })
        if (!response.ok) {
            const reset = Number(response.headers.get('x-ratelimit-reset'))
            if (response.headers.get('x-ratelimit-remaining') === '0' && reset) pausedUntil = reset * 1000
            throw new Error(`GitHub returned ${response.status}`)
        }
        const items = await response.json()
        if (!Array.isArray(items)) throw new Error('GitHub returned an invalid repository list')
        repositories.push(...items)
        next = nextPage(response.headers.get('link'))
    }
    return repositories
}

function refresh() {
    if (inflight) return
    if (Date.now() < pausedUntil) {
        // Out of anonymous requests until GitHub's reset time; keep the last list.
        if (catalog.status === 'bundled') emit({ ...catalog, status: 'offline' })
        return
    }
    lastAttempt = Date.now()
    const controller = new AbortController()
    inflight = controller
    fetchRepositories(controller.signal)
        .then((repositories) => {
            const fetchedAt = new Date().toISOString()
            const cached = apply(repositories, fetchedAt, 'live')
            try {
                window.localStorage.setItem(CACHE_KEY, JSON.stringify({ fetchedAt, repositories: cached }))
            } catch {
                // Not cached this time; the next visit starts from the build's snapshot.
            }
        })
        .catch(() => {
            if (!controller.signal.aborted && catalog.status === 'bundled') emit({ ...catalog, status: 'offline' })
        })
        .finally(() => {
            if (inflight === controller) inflight = null
        })
}

function refreshIfStale() {
    if (document.visibilityState === 'visible' && Date.now() - lastAttempt > STALE_MS) refresh()
}

function start() {
    readCache()
    refreshIfStale()
    timer = window.setInterval(() => document.visibilityState === 'visible' && refresh(), REFRESH_MS)
    document.addEventListener('visibilitychange', refreshIfStale)
}

function stop() {
    window.clearInterval(timer)
    document.removeEventListener('visibilitychange', refreshIfStale)
    inflight?.abort()
    inflight = null
}

function subscribe(listener: () => void) {
    listeners.add(listener)
    if (listeners.size === 1) start()
    return () => {
        listeners.delete(listener)
        if (listeners.size === 0) stop()
    }
}

/**
 * The catalog, kept current with the organization on GitHub. Server rendering and hydration use the
 * build's snapshot, so both renders match; the live list arrives after mount.
 */
export function useQuirqCatalog(): QuirqCatalog {
    return useSyncExternalStore(
        subscribe,
        () => catalog,
        () => bundled
    )
}

export function useQuirqApps(): QuirqApp[] {
    return useQuirqCatalog().apps
}

/** Like `getQuirqApp`, but also finds repositories added since the build. */
export function findQuirqApp(pathOrSlug: string): QuirqApp | undefined {
    const value = pathOrSlug
        .replace(/[?#].*$/, '')
        .replace(/\/$/, '')
        .toLowerCase()
    return catalog.apps.find(
        (app) => app.path.toLowerCase() === value || app.repo.toLowerCase() === value || app.id.toLowerCase() === value
    )
}
