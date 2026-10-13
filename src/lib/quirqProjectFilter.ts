// The Projects page lists only repositories whose type (the organization's `role` property) is project.

type Named = { name: string }
type Group<P extends Named> = { projects: P[] }
type RepositoryType = { name: string; role: string | null; archived: boolean }

/**
 * Keeps the projects in each group whose repository is public, not archived and of type project, and
 * drops the groups left empty. A repository GitHub sent no type for counts as a project, the
 * organization's default; any other value, even one this site doesn't know, does not. A repository
 * missing from the list isn't a public repository in the organization, so it isn't listed. GitHub names
 * are case-insensitive, so names match whatever their case.
 */
export function projectGroupsOnly<P extends Named, G extends Group<P>>(
    groups: G[],
    repositories: RepositoryType[]
): G[] {
    const types = new Map(repositories.map((repo) => [repo.name.toLowerCase(), repo]))
    const isProject = (name: string) => {
        const repo = types.get(name.toLowerCase())
        return Boolean(repo && !repo.archived && (repo.role === null || repo.role === 'project'))
    }
    return groups
        .map((group) => ({ ...group, projects: group.projects.filter((project) => isProject(project.name)) }))
        .filter((group) => group.projects.length > 0)
}
