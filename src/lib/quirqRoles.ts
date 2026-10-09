import { QUIRQ_ROLES } from '../../scripts/lib/quirq-catalog.mjs'

/** The values of the organization's `role` custom property this site knows (scripts/lib/quirq-catalog.mjs). */
export type QuirqRole = 'project' | 'agent' | 'tool' | 'library' | 'docs' | 'config'

export const quirqRoles = QUIRQ_ROLES as QuirqRole[]

/** How each type reads on the site: its name, the filter's plural, and one line on what it means. */
export const roleInfo: Record<QuirqRole, { label: string; plural: string; meaning: string }> = {
    project: { label: 'Project', plural: 'Projects', meaning: 'Something quirq builds for people to use.' },
    agent: { label: 'Agent', plural: 'Agents', meaning: 'An agent, or the service an agent runs on.' },
    tool: {
        label: 'Tool',
        plural: 'Tools',
        meaning: 'Infrastructure that builds, checks, releases or measures the other repositories.',
    },
    library: { label: 'Library', plural: 'Libraries', meaning: 'Code and skills other repositories reuse.' },
    docs: { label: 'Docs', plural: 'Docs', meaning: 'Writing to read: guides, notes and research.' },
    config: { label: 'Config', plural: 'Config', meaning: 'Settings the other repositories read.' },
}

/** The words search matches for a type, so "tool" or "libraries" finds them. */
export function roleKeywords(role: QuirqRole | null): string {
    if (!role) return ''
    const { label, plural } = roleInfo[role]
    return `${role} ${label} ${plural}`.toLowerCase()
}
