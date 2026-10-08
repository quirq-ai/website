import type { QuirqApp } from './quirqApps'

// A repository's documentation, read in the visitor's browser. The list of Markdown files comes from
// GitHub's git trees API: one anonymous, rate-limited request per repository per visit (an unchanged
// tree revalidates as a 304, which GitHub doesn't count). Each file comes from raw.githubusercontent.com,
// which is outside the API's rate limit and caches files for up to 5 minutes.

const DOC_FILE = /\.(md|mdx|markdown)$/i
// Markdown in these folders is dependencies, build output or test data, not the project's docs.
const NOT_DOCS =
    /(^|\/)(node_modules|vendor|third_party|dist|build|out|coverage|\.next|__snapshots__|fixtures?|testdata)\//i
const README = /^readme(\.(md|mdx|markdown))?$/i
const MAX_DOCS = 2000

export type DocsIndex = {
    /** Markdown files, as repository paths. */
    paths: string[]
    /** GitHub cut the tree short (very large repositories); some docs may be missing. */
    truncated: boolean
}

export const isDocPath = (path: string): boolean => DOC_FILE.test(path) && !NOT_DOCS.test(path)

/** The repository's root README in a docs list, or else its first doc. */
export const readmeIn = (paths: string[]): string | null =>
    paths.find((path) => README.test(path)) ||
    paths.find((path) => /(^|\/)readme\.[^/]+$/i.test(path)) ||
    paths[0] ||
    null

const indexes = new Map<string, Promise<DocsIndex>>()

/** The repository's Markdown files, read once per visit (a failed read is retried next time). */
export function loadDocsIndex(app: QuirqApp): Promise<DocsIndex> {
    let pending = indexes.get(app.id)
    if (!pending) {
        const branch = encodeURIComponent(app.defaultBranch).replace(/%2F/gi, '/')
        pending = fetch(`https://api.github.com/repos/${app.id}/git/trees/${branch}?recursive=1`, { cache: 'no-cache' })
            .then((response) => {
                if (!response.ok) throw new Error(`GitHub returned ${response.status}`)
                return response.json()
            })
            .then((data) => {
                const entries: { path?: unknown; type?: unknown }[] = Array.isArray(data?.tree) ? data.tree : []
                const paths = entries
                    .filter((entry) => entry.type === 'blob' && typeof entry.path === 'string')
                    .map((entry) => entry.path as string)
                    .filter(isDocPath)
                return {
                    paths: paths.slice(0, MAX_DOCS),
                    truncated: data?.truncated === true || paths.length > MAX_DOCS,
                }
            })
        pending.catch(() => indexes.delete(app.id))
        indexes.set(app.id, pending)
    }
    return pending
}

/** A file's raw URL on the default branch. */
export const rawFileUrl = (app: QuirqApp, path: string): string =>
    `https://raw.githubusercontent.com/${app.id}/HEAD/${path.split('/').map(encodeURIComponent).join('/')}`

/** A file's page on GitHub. */
export const githubFileUrl = (app: QuirqApp, path: string): string =>
    `${app.repoUrl}/blob/${encodeURIComponent(app.defaultBranch)}/${path.split('/').map(encodeURIComponent).join('/')}`

/** A URL in a doc as a path in the repository (with its #fragment), or null when it points elsewhere. */
export function repositoryPath(url: string, docPath: string): { path: string; hash: string } | null {
    if (!url || url.startsWith('#') || url.startsWith('//') || /^[a-z][a-z\d+.-]*:/i.test(url)) return null
    const directory = docPath.split('/').slice(0, -1).join('/')
    const base = new URL(`https://repository.invalid/${directory ? `${directory}/` : ''}`)
    try {
        const resolved = new URL(url, base)
        if (resolved.origin !== base.origin) return null
        return { path: decodeURIComponent(resolved.pathname.slice(1)), hash: resolved.hash }
    } catch {
        return null
    }
}

/** An image URL the browser can load: repository paths and github.com/…/blob/… links become raw files. */
export function docImageUrl(src: string | undefined, app: QuirqApp, docPath: string): string | undefined {
    if (!src) return undefined
    const inRepository = repositoryPath(src, docPath)
    if (inRepository) return rawFileUrl(app, inRepository.path)
    const blob = src.match(/^https:\/\/github\.com\/([^/]+\/[^/]+)\/(?:blob|raw)\/(.+?)(\?raw=true)?$/i)
    if (blob) return `https://raw.githubusercontent.com/${blob[1]}/${blob[2]}`
    return /^https?:\/\//i.test(src) ? src : undefined
}

/** A <source srcset> with each candidate resolved like an image. */
export const docSrcSet = (srcSet: string, app: QuirqApp, docPath: string): string =>
    srcSet
        .split(',')
        .map((candidate) => {
            const [url, ...descriptor] = candidate.trim().split(/\s+/)
            const resolved = docImageUrl(url, app, docPath)
            return resolved ? [resolved, ...descriptor].join(' ') : null
        })
        .filter(Boolean)
        .join(', ')

/** A media query whose prefers-color-scheme follows the site's theme instead of the operating system's. */
export const themedMedia = (media: string, dark: boolean): string =>
    media.replace(/\(\s*prefers-color-scheme\s*:\s*(dark|light)\s*\)/gi, (_, scheme: string) =>
        (scheme.toLowerCase() === 'dark') === dark ? 'all' : 'not all'
    )

/** A doc's Markdown as GitHub has it now, or null when the file no longer exists. */
export async function loadDoc(app: QuirqApp, path: string, signal?: AbortSignal): Promise<string | null> {
    const response = await fetch(rawFileUrl(app, path), { cache: 'no-cache', signal })
    if (response.status === 404) return null
    if (!response.ok) throw new Error(`GitHub returned ${response.status}`)
    return response.text()
}
