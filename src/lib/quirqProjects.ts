import config from '../../quirq.projects.json'
import snapshot from '../data/quirq-projects.json'
import { buildQuirqProjects, DEFAULT_PROJECT_RULE, PHASES, projectRuleText } from '../../scripts/lib/quirq-phases.mjs'

export type PhaseId = 'thought' | 'prototype' | 'built' | 'shipping' | 'project'

export type Phase = { id: PhaseId; name: string; rule: string }

export type QuirqProject = {
    name: string
    description: string
    url: string
    missing: boolean
    committedAt: string | null
    sha: string | null
    signals: {
        files: number
        codeFiles: number
        workflows: number
        repoToml: boolean
        deployConfig: boolean
        inCanary: boolean
        stars: number
        people: number
    } | null
    phase: PhaseId
    reason: string
    overridden: boolean
}

export type QuirqProjectGroup = { name: string; description: string; projects: QuirqProject[] }

const groups = buildQuirqProjects(snapshot, config) as QuirqProjectGroup[]

const projectRule = { ...DEFAULT_PROJECT_RULE, ...config.projectRule }

/** The phases, with the Project rule worded from the thresholds in quirq.projects.json. */
export const quirqPhases = (PHASES as Phase[]).map((phase) =>
    phase.id === 'project' ? { ...phase, rule: projectRuleText(projectRule) } : phase
)
export const projectsFetchedAt: string = snapshot.fetchedAt
/** Where the star counts came from: `github-api`, or `apps-snapshot <ISO date>` when the API was unavailable. */
export const starsSource: string = (snapshot as { starsSource?: string }).starsSource || 'github-api'

export function getQuirqProjectGroups(): QuirqProjectGroup[] {
    return groups
}
