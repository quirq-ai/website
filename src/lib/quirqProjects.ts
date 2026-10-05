import config from '../../quirq.projects.json'
import snapshot from '../data/quirq-projects.json'
import { buildQuirqProjects, PHASES } from '../../scripts/lib/quirq-phases.mjs'

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

export const quirqPhases = PHASES as Phase[]
export const projectsFetchedAt: string = snapshot.fetchedAt

export function getQuirqProjectGroups(): QuirqProjectGroup[] {
    return groups
}
