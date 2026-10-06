import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'gatsby'
import Explorer from 'components/Explorer'
import { ButtonLink } from 'components/ui/button'
import QuirqAppIcon from 'components/QuirqAppIcon'
import { Badge, type BadgeVariant } from 'components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from 'components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from 'components/ui/tabs'
import {
    getJson,
    RELEASE_STATE_URL,
    TREE_STATUS_URL,
    type Pointer,
    type TreeStatus,
} from 'components/QuirqInfraV0/live'
import { getQuirqApps } from 'lib/quirqApps'
import {
    getQuirqProjectGroups,
    projectsFetchedAt,
    quirqPhases,
    starsSource,
    type PhaseId,
    type QuirqProject,
} from 'lib/quirqProjects'

type Filter = 'all' | PhaseId

const groups = getQuirqProjectGroups()
const allProjects = groups.flatMap((group) => group.projects)
const phaseIndex = Object.fromEntries(quirqPhases.map((phase, index) => [phase.id, index])) as Record<PhaseId, number>
const appPaths = new Map(getQuirqApps().map((app) => [app.repo, app.path]))
const reached = (project: QuirqProject, phase: PhaseId) => phaseIndex[project.phase] >= phaseIndex[phase]

const formatDateLong = (iso: string) =>
    new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })

const starsNote = starsSource.startsWith('apps-snapshot ')
    ? ` Star counts are from the app catalog of ${formatDateLong(starsSource.slice('apps-snapshot '.length))}.`
    : ''

const snapshotDate = formatDateLong(projectsFetchedAt)

function External({ href, children }: { href: string; children: React.ReactNode }) {
    return (
        <a href={href} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
            {children}
        </a>
    )
}

const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })

// An absolute date renders the same at build time and in the browser, so hydration never mismatches.
const commitDate = (iso: string | null) => (iso && !Number.isNaN(Date.parse(iso)) ? formatDate(iso) : '')

const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-')

/** How far up the ladder a project is: one filled step per phase reached. */
function PhaseMeter({ phase }: { phase: PhaseId }) {
    const index = phaseIndex[phase]
    return (
        <span className="flex items-center gap-2">
            <span aria-hidden className="flex gap-0.5">
                {quirqPhases.map((step, stepIndex) => (
                    <span
                        key={step.id}
                        className={`h-2 w-4 rounded-sm border border-[rgb(var(--text-primary))] ${
                            stepIndex <= index ? 'bg-[rgb(var(--text-primary))]' : 'opacity-40'
                        }`}
                    />
                ))}
            </span>
            <span className="text-xs font-semibold">
                {quirqPhases[index].name}
                <span className="sr-only">
                    , phase {index + 1} of {quirqPhases.length}
                </span>
            </span>
        </span>
    )
}

type Live = { tree?: TreeStatus; canary?: Pointer }

/** Live tree status and canary pointer for the repos in the daily canary, read from public state branches. */
function useCanaryLive(repos: string[]): Record<string, Live | 'error'> {
    const [live, setLive] = useState<Record<string, Live | 'error'>>({})
    const key = repos.join(',')
    useEffect(() => {
        let cancelled = false
        for (const repo of repos) {
            Promise.all([
                getJson<TreeStatus>(`${TREE_STATUS_URL}/${repo}.json`),
                getJson<Pointer>(`${RELEASE_STATE_URL}/pointers/${repo}/channels/canary.json`),
            ])
                .then(([tree, canary]) => !cancelled && setLive((state) => ({ ...state, [repo]: { tree, canary } })))
                .catch(() => !cancelled && setLive((state) => ({ ...state, [repo]: 'error' })))
        }
        return () => {
            cancelled = true
        }
    }, [key])
    return live
}

const treeBadge: Record<string, BadgeVariant> = { open: 'good', closed: 'bad', throttled: 'warn' }

function LiveRow({ repo, live }: { repo: string; live?: Live | 'error' }) {
    if (!live) return <p className="m-0 text-secondary">Loading live state…</p>
    if (live === 'error') return <p className="m-0 text-secondary">Live state could not be loaded.</p>
    return (
        <div className="flex flex-wrap items-center gap-2">
            {live.tree ? (
                <Badge variant={treeBadge[live.tree.state] || 'muted'}>Tree {live.tree.state}</Badge>
            ) : (
                <Badge variant="muted">No tree status</Badge>
            )}
            <span>
                Canary{' '}
                {live.canary ? (
                    <External href={`https://github.com/quirq-ai/${repo}/commit/${live.canary.commit}`}>
                        <span className="font-mono">{live.canary.commit.slice(0, 7)}</span>
                    </External>
                ) : (
                    <span className="text-secondary">none yet</span>
                )}
            </span>
        </div>
    )
}

function ProjectCard({ project, live }: { project: QuirqProject; live?: Live | 'error' }) {
    const signals = project.signals
    const appPath = appPaths.get(project.name)
    const shippingFacts = signals
        ? [
              signals.repoToml && 'Onboarded to qq',
              signals.deployConfig && 'Deploy config',
              signals.inCanary && 'Daily canary',
          ].filter(Boolean)
        : []
    return (
        <Card className="h-full" data-phase={project.phase}>
            <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-2">
                    <CardTitle className="font-mono">
                        <External href={project.url}>{project.name}</External>
                    </CardTitle>
                    <PhaseMeter phase={project.phase} />
                </div>
                {project.description && <CardDescription>{project.description}</CardDescription>}
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
                <p className="m-0">
                    <span className="font-semibold">Why {quirqPhases[phaseIndex[project.phase]].name}: </span>
                    {project.missing ? 'Not in the snapshot yet.' : project.reason}
                    {project.overridden && <span className="text-secondary"> Set by hand.</span>}
                </p>
                {reached(project, 'prototype') && signals && project.committedAt && project.sha && (
                    <p className="m-0">
                        Last commit on{' '}
                        <External href={`${project.url}/commit/${project.sha}`}>
                            {commitDate(project.committedAt)}
                        </External>
                        .
                        {reached(project, 'built') && signals.workflows > 0 && (
                            <>
                                {' '}
                                <External href={`${project.url}/actions`}>See its CI runs</External>.
                            </>
                        )}
                    </p>
                )}
                {reached(project, 'prototype') && signals && !project.reason.includes('GitHub star') && (
                    <p className="m-0">
                        <External href={`${project.url}/stargazers`}>
                            {signals.stars} GitHub star{signals.stars === 1 ? '' : 's'}
                        </External>
                        {signals.people === 0
                            ? '; every commit is by agents or automation.'
                            : `, ${signals.people} ${signals.people === 1 ? 'person' : 'people'} committing.`}
                    </p>
                )}
                {reached(project, 'shipping') && shippingFacts.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                        {shippingFacts.map((fact) => (
                            <Badge key={fact as string} variant="outline">
                                {fact}
                            </Badge>
                        ))}
                    </div>
                )}
                {signals?.inCanary && (
                    <>
                        <LiveRow repo={project.name} live={live} />
                        <p className="m-0">
                            <Link to="/v0" className="underline underline-offset-2">
                                Watch it run in quirq infra v0
                            </Link>
                        </p>
                    </>
                )}
                {appPath && appPath !== '/v0' && (
                    <p className="m-0">
                        <Link to={appPath} className="underline underline-offset-2">
                            Open its page on Home base
                        </Link>
                    </p>
                )}
            </CardContent>
        </Card>
    )
}

function Ladder({ counts }: { counts: Record<PhaseId, number> }) {
    return (
        <ol className="m-0 grid list-none grid-cols-1 gap-3 p-0 @2xl:grid-cols-3 @5xl:grid-cols-5">
            {quirqPhases.map((phase, index) => (
                <li key={phase.id}>
                    <Card className="h-full">
                        <CardHeader>
                            <p className="m-0 text-xs font-semibold uppercase tracking-wide text-secondary">
                                Phase {index + 1}
                            </p>
                            <CardTitle className="flex items-baseline justify-between gap-2">
                                {phase.name}
                                <span className="text-2xl font-bold">{counts[phase.id]}</span>
                            </CardTitle>
                            <CardDescription>{phase.rule}</CardDescription>
                        </CardHeader>
                    </Card>
                </li>
            ))}
        </ol>
    )
}

function Listing({ filter, live }: { filter: Filter; live: Record<string, Live | 'error'> }) {
    const visible = groups
        .map((group) => ({
            ...group,
            projects: group.projects
                .filter((project) => filter === 'all' || project.phase === filter)
                .sort((a, b) => phaseIndex[b.phase] - phaseIndex[a.phase]),
        }))
        .filter((group) => group.projects.length > 0)
    if (visible.length === 0) return <p className="m-0 text-secondary">No projects are in this phase yet.</p>
    return (
        <div className="flex flex-col gap-8">
            {visible.map((group) => (
                <section key={group.name} aria-labelledby={`group-${slug(group.name)}`}>
                    <h2 id={`group-${slug(group.name)}`} className="m-0 mb-1 text-lg font-bold tracking-tight">
                        {group.name}
                    </h2>
                    {group.description && <p className="m-0 mb-3 text-sm text-secondary">{group.description}</p>}
                    <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 @2xl:grid-cols-2 @5xl:grid-cols-3">
                        {group.projects.map((project) => (
                            <li key={project.name}>
                                <ProjectCard project={project} live={live[project.name]} />
                            </li>
                        ))}
                    </ul>
                </section>
            ))}
        </div>
    )
}

export default function QuirqProjects(): JSX.Element {
    const [filter, setFilter] = useState<Filter>('all')
    const counts = useMemo(() => {
        const result = Object.fromEntries(quirqPhases.map((phase) => [phase.id, 0])) as Record<PhaseId, number>
        for (const project of allProjects) result[project.phase] += 1
        return result
    }, [])
    const canaryRepos = useMemo(
        () => allProjects.filter((project) => project.signals?.inCanary).map((project) => project.name),
        []
    )
    const live = useCanaryLive(canaryRepos)
    const filters: { value: Filter; label: string }[] = [
        { value: 'all', label: `All ${allProjects.length}` },
        ...quirqPhases.map((phase) => ({ value: phase.id, label: `${phase.name} ${counts[phase.id]}` })),
    ]

    return (
        <Explorer
            template="generic"
            slug="projects"
            title="Projects"
            showTitle={false}
            transparent
            padding={false}
            showAddressBar={false}
            headerBarOptions={['showBack', 'showForward']}
            rightActionButtons={
                <>
                    <ButtonLink to="/" variant="ghost" size="sm" className="h-7">
                        Home base
                    </ButtonLink>
                    <ButtonLink to="/v0" size="sm" className="h-7">
                        quirq infra v0
                    </ButtonLink>
                </>
            }
        >
            <div className="not-prose text-primary" data-testid="quirq-projects">
                <header className="border-b border-primary bg-green/10 p-6 @xl:p-10">
                    <div className="flex items-center gap-5">
                        <QuirqAppIcon icon="rocket" color="green" className="size-16 shrink-0" />
                        <div className="min-w-0">
                            <h1 className="m-0 mb-2 text-3xl font-bold tracking-tight @xl:text-4xl">Projects</h1>
                            <p className="m-0 max-w-2xl text-base text-secondary">
                                Everything the swarm is building, and how far each one has come. A repo’s phase is read
                                from its shape: notes, code, CI, shipping, then users, counted by GitHub stars and
                                people committing.
                            </p>
                        </div>
                    </div>
                </header>
                <div className="flex flex-col gap-8 p-5 @xl:p-8">
                    <section aria-labelledby="ladder">
                        <h2 id="ladder" className="m-0 mb-3 text-lg font-bold tracking-tight">
                            The phases
                        </h2>
                        <Ladder counts={counts} />
                        <p className="m-0 mt-3 text-sm text-secondary">
                            Read from each repo’s history on {snapshotDate}. People committing leaves out agents and
                            bots.{starsNote} The thresholds, groups and descriptions are set in{' '}
                            <External href="https://github.com/quirq-ai/website/blob/main/quirq.projects.json">
                                quirq.projects.json
                            </External>
                            .
                        </p>
                    </section>
                    <Tabs value={filter} onValueChange={(value) => setFilter(value as Filter)}>
                        <TabsList aria-label="Filter projects by phase">
                            {filters.map((option) => (
                                <TabsTrigger key={option.value} value={option.value}>
                                    {option.label}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                        {filters.map((option) => (
                            <TabsContent key={option.value} value={option.value}>
                                <Listing filter={option.value} live={live} />
                            </TabsContent>
                        ))}
                    </Tabs>
                </div>
            </div>
        </Explorer>
    )
}
