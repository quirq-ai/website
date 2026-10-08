import config from '../../quirq.apps.json'
import snapshot from '../data/quirq-repositories.json'
import { buildQuirqApps } from '../../scripts/lib/quirq-catalog.mjs'

export type QuirqApp = {
    id: string
    repo: string
    name: string
    description: string
    path: string
    icon: 'code' | 'globe' | 'book' | 'mail' | 'chat' | 'rocket'
    color: 'blue' | 'purple' | 'orange' | 'green' | 'red' | 'yellow'
    category: string
    featured: boolean
    repoUrl: string
    homepage: string | null
    launchUrl: string | null
    launchMode: 'external' | 'window' | 'embed'
    presentation: 'overview' | 'reader' | 'gallery'
    language: string | null
    topics: string[]
    stars: number
    updatedAt: string
    defaultBranch: string
    readmeMarkdown: string | null
    readmePath: string | null
    component?: string
    window?: { width?: number; height?: number }
}

export const quirqConfig = config
export const quirqSnapshot = { organization: snapshot.organization, fetchedAt: snapshot.fetchedAt }
const apps = buildQuirqApps(snapshot, config) as QuirqApp[]

export function getQuirqApps(): QuirqApp[] {
    return apps
}

/**
 * Where an app's Open app and Launch controls go: its own window on this site (`/launch/<repository>`)
 * when its launch mode is `window`, otherwise its website in a new tab. Null when it has no website.
 */
export function getLaunchTarget(app: QuirqApp): { to: string; external: boolean } | null {
    if (!app.launchUrl) return null
    return app.launchMode === 'window'
        ? { to: `/launch/${app.repo}`, external: false }
        : { to: app.launchUrl, external: true }
}

export function getQuirqApp(pathOrSlug: string): QuirqApp | undefined {
    const value = pathOrSlug.replace(/[?#].*$/, '').replace(/\/$/, '')
    return apps.find((app) => app.path === value || app.repo === value || app.id === value)
}
