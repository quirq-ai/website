import config from '../../quirq.apps.json'
import snapshot from '../data/quirq-repositories.json'
import { buildQuirqApps } from '../../scripts/lib/quirq-catalog.mjs'
import type { QuirqRole } from './quirqRoles'
import type { QuirqIcon } from '../components/QuirqAppIcon/glyphs'

export type QuirqApp = {
    id: string
    repo: string
    name: string
    description: string
    path: string
    icon: QuirqIcon
    color: 'blue' | 'purple' | 'lilac' | 'orange' | 'yellow' | 'red' | 'salmon' | 'teal' | 'seagreen' | 'green' | 'pink'
    category: string
    /** The organization's `role` custom property on GitHub; null when it isn't known. */
    role: QuirqRole | null
    featured: boolean
    repoUrl: string
    homepage: string | null
    launchUrl: string | null
    launchMode: 'external' | 'window' | 'embed'
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
 * Where an app's Open app, Launch and desktop icon go: its own window on this site
 * (`/launch/<repository>`), its website in an iframe, or "Oops" with Open in new tab when the website
 * can't be shown there. Null when it has no website.
 */
export function getLaunchTarget(app: QuirqApp): { to: string; external: boolean } | null {
    if (!app.launchUrl) return null
    return { to: `/launch/${app.repo}`, external: false }
}

export function getQuirqApp(pathOrSlug: string): QuirqApp | undefined {
    const value = pathOrSlug.replace(/[?#].*$/, '').replace(/\/$/, '')
    return apps.find((app) => app.path === value || app.repo === value || app.id === value)
}
