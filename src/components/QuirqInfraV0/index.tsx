import React, { useState } from 'react'
import { Link } from 'gatsby'
import Explorer from 'components/Explorer'
import { ButtonLink } from 'components/ui/button'
import QuirqAppIcon from 'components/QuirqAppIcon'
import { Badge, type BadgeVariant } from 'components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from 'components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from 'components/ui/tabs'
import type { QuirqApp } from 'lib/quirqApps'
import { AS_OF, EXIT_TEST, FLOW, GUIDE, LANES, LIMITS, ORG, PRODUCTS, REPOS, SOURCES, type Product } from './data'
import { FIRST_CANARY, useLiveState, type CanaryRun, type CanaryStage, type Pointer, type RepoLive } from './live'

type Tab = 'overview' | 'live' | 'repos' | 'guide'

const short = (commit?: string) => (commit ? commit.slice(0, 7) : '')

function External({ href, children }: { href: string; children: React.ReactNode }) {
    return (
        <a href={href} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
            {children}
        </a>
    )
}

function Commit({ repo, commit }: { repo: string; commit?: string }) {
    if (!commit) return <span className="text-secondary">none yet</span>
    if (!/^[0-9a-f]{7,40}$/.test(commit)) return <span className="font-mono">{commit.slice(0, 12)}</span>
    return (
        <a
            href={`${ORG}/${repo}/commit/${commit}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono underline underline-offset-2"
        >
            {short(commit)}
        </a>
    )
}

function ago(iso?: string): string {
    if (!iso) return ''
    const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
    if (Number.isNaN(minutes)) return ''
    if (minutes < 60) return `${Math.max(minutes, 0)} min ago`
    const hours = Math.round(minutes / 60)
    if (hours < 48) return `${hours} h ago`
    return `${Math.round(hours / 24)} days ago`
}

function SectionTitle({ children, id }: { children: React.ReactNode; id?: string }) {
    return (
        <h2 id={id} className="m-0 mb-3 text-lg font-bold tracking-tight">
            {children}
        </h2>
    )
}

const exitBadge: Record<string, { variant: BadgeVariant; label: string }> = {
    done: { variant: 'good', label: 'Done' },
    progress: { variant: 'warn', label: 'In progress' },
    todo: { variant: 'muted', label: 'Not yet' },
}

function Overview() {
    return (
        <div className="flex flex-col gap-8">
            <section>
                <SectionTitle>What v0 is</SectionTitle>
                <p className="m-0 max-w-3xl text-[15px] leading-relaxed">
                    quirq infra, or qq, is how code lands and ships at quirq. It is modeled on Chromium’s infrastructure
                    and rebuilt for small GitHub repos as 13 public repos. v0’s goal: every one of those repos does a
                    first, thin version of its job, and two product repos, xo-space (Python) and innernet (Next.js), use
                    the whole chain. A change is built from its repo’s manifest, gated on the exact merge result,
                    watched after it lands, and shipped to the canary channel once a day.
                </p>
                <p className="m-0 mt-3 max-w-3xl text-[15px] leading-relaxed">
                    <strong>Where it stands ({AS_OF}):</strong> both product repos are gated by generated workflows, and
                    lkgr moves on its own. The CI builders still run interim commands instead of recipes, qq does not
                    call remote-build yet, and the first canary was started by hand. Reverts wait on gardener’s GitHub
                    App, which does not exist yet. The release executor App exists but is not wired into release yet, so
                    the product repos’ canary refs do not move.
                </p>
            </section>
            <section>
                <SectionTitle>How one change travels</SectionTitle>
                <ol className="m-0 grid list-none grid-cols-1 gap-3 p-0 @2xl:grid-cols-2 @5xl:grid-cols-3">
                    {FLOW.map((step, index) => (
                        <li key={step.title}>
                            <Card className="h-full">
                                <CardHeader>
                                    <p className="m-0 text-xs font-semibold text-secondary">Step {index + 1}</p>
                                    <CardTitle>{step.title}</CardTitle>
                                </CardHeader>
                                <CardContent className="flex flex-col gap-3">
                                    <p className="m-0 text-sm leading-relaxed">{step.text}</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {step.repos.map((repo) => (
                                            <Badge key={repo} variant="outline" className="font-mono">
                                                {repo}
                                            </Badge>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </li>
                    ))}
                </ol>
            </section>
            <section>
                <SectionTitle>The v0 exit test</SectionTitle>
                <p className="m-0 mb-3 text-sm text-secondary">
                    v0 is done when all five hold at once. Status as of {AS_OF}.
                </p>
                <ol className="m-0 flex list-none flex-col gap-2 p-0">
                    {EXIT_TEST.map((check, index) => (
                        <li key={check.title}>
                            <Card>
                                <CardHeader className="gap-2">
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                        <CardTitle className="max-w-2xl">
                                            {index + 1}. {check.title}
                                        </CardTitle>
                                        <Badge variant={exitBadge[check.state].variant}>
                                            {exitBadge[check.state].label}
                                        </Badge>
                                    </div>
                                    <CardDescription>{check.status}</CardDescription>
                                </CardHeader>
                            </Card>
                        </li>
                    ))}
                </ol>
            </section>
            <p className="m-0 text-xs text-secondary">
                Sources: the <External href={SOURCES.plan}>v0 plan</External>, the{' '}
                <External href={SOURCES.status}>v0 status report</External> and the{' '}
                <External href={SOURCES.map}>infra map</External>.
            </p>
        </div>
    )
}

const outcomeBadge = (outcome?: string): BadgeVariant =>
    outcome === 'shipped' ? 'good' : outcome === 'held' ? 'bad' : outcome === 'noop' || !outcome ? 'muted' : 'warn'

const GITHUB_URL = /^https:\/\/github\.com\//

/** A link only for values that point at github.com; anything else from remote JSON stays plain text. */
function SafeLink({ href, children }: { href?: string; children: React.ReactNode }) {
    return href && GITHUB_URL.test(href) ? <External href={href}>{children}</External> : <>{children}</>
}

const stageSkipped = (stage: CanaryStage) => stage.ran === false || /\bskipped\b/i.test(stage.detail)

function PointerRow({ label, repo, pointer }: { label: string; repo: string; pointer?: Pointer }) {
    return (
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-sm">
            <span className="font-medium">{label}</span>
            <span>
                <Commit repo={repo} commit={pointer?.commit} />
                {pointer?.updated_at && <span className="text-secondary"> · moved {ago(pointer.updated_at)}</span>}
            </span>
        </div>
    )
}

function CanaryDays({ repo, live, days }: { repo: Product; live: RepoLive; days: string[] }) {
    const runs = days.map((day) => live.runs[day]).filter((run): run is CanaryRun => Boolean(run))
    const latest = runs[0]
    // A no-op day has no stages, so show the stages of the newest run that has them.
    const staged = runs.find((run) => run.stages?.length)
    return (
        <div className="flex flex-col gap-3">
            <ol
                className="m-0 grid list-none grid-cols-7 gap-1 p-0"
                aria-label={`${repo} canary, last ${days.length} days`}
            >
                {[...days].reverse().map((day) => {
                    const run = live.runs[day]
                    const before = day < FIRST_CANARY
                    const variant = outcomeBadge(run?.outcome)
                    return (
                        <li
                            key={day}
                            className="flex flex-col items-center gap-1 rounded border border-primary px-0.5 py-1.5 text-center"
                            title={
                                run
                                    ? `${day}: ${run.outcome}`
                                    : before
                                    ? `${day}: before the first canary`
                                    : `${day}: no canary run recorded`
                            }
                        >
                            <span className="text-[11px] text-secondary">{day.slice(5)}</span>
                            <span
                                aria-hidden
                                className={`size-2.5 rounded-full ${
                                    variant === 'good'
                                        ? 'bg-[#2f7d32] dark:bg-[#6fcf73]'
                                        : variant === 'bad'
                                        ? 'bg-[#c62828] dark:bg-[#ff7a6b]'
                                        : variant === 'warn'
                                        ? 'bg-[#a15c00] dark:bg-[#f2b84b]'
                                        : 'border border-[#6b6d66] dark:border-[#a3a59c]'
                                }`}
                            />
                            <span className="text-[11px]">{run ? run.outcome : before ? '–' : 'none'}</span>
                        </li>
                    )
                })}
            </ol>
            {latest ? (
                <div>
                    <p className="m-0 mb-2 text-sm">
                        Latest run {latest.date}: <strong>{latest.outcome}</strong>{' '}
                        <Commit repo={repo} commit={latest.commit} />
                        {latest.run_url && GITHUB_URL.test(latest.run_url) && (
                            <>
                                {' · '}
                                <External href={latest.run_url}>workflow run</External>
                            </>
                        )}
                    </p>
                    {latest.reason && latest.outcome !== 'shipped' && (
                        <p className="m-0 mb-2 text-sm text-secondary">{latest.reason}</p>
                    )}
                    {staged && (
                        <>
                            {staged !== latest && (
                                <p className="m-0 mb-2 text-sm">Stages of the last canary that ran, {staged.date}:</p>
                            )}
                            <ol className="m-0 flex list-none flex-col gap-1.5 p-0">
                                {staged.stages.map((stage) => {
                                    const skipped = stageSkipped(stage)
                                    return (
                                        <li key={stage.name} className="flex items-start gap-2 text-sm">
                                            <Badge
                                                variant={skipped ? 'muted' : stage.ok ? 'good' : 'bad'}
                                                className="w-24 shrink-0 justify-start"
                                            >
                                                {stage.name}
                                            </Badge>
                                            <span className="min-w-0 break-words text-secondary">
                                                {skipped ? (
                                                    <>
                                                        <strong className="text-primary">Skipped.</strong>{' '}
                                                        {/release executor/i.test(stage.detail)
                                                            ? 'The canary pointer in release-state moved, but the channels/canary git ref waits until the release executor App is wired into release.'
                                                            : stage.detail.replace(/\s*;?\s*TODO\([^)]*\)/g, '')}
                                                    </>
                                                ) : (
                                                    stage.detail
                                                )}
                                            </span>
                                        </li>
                                    )
                                })}
                            </ol>
                        </>
                    )}
                </div>
            ) : (
                <p className="m-0 text-sm text-secondary">No canary run in the last {days.length} days.</p>
            )}
        </div>
    )
}

function RepoLiveCard({ repo, live, days }: { repo: Product; live: RepoLive; days: string[] }) {
    const tree = live.tree
    const open = tree?.state === 'open'
    return (
        <Card>
            <CardHeader className="gap-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="font-mono">{repo}</CardTitle>
                    <Badge variant={!tree ? 'muted' : open ? 'good' : 'bad'}>
                        tree {tree ? tree.state : 'unknown'}
                    </Badge>
                </div>
                {tree && <CardDescription>{tree.reason}</CardDescription>}
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
                <div className="flex flex-col gap-1.5">
                    <PointerRow
                        label="main (newest checked)"
                        repo={repo}
                        pointer={tree ? ({ commit: tree.head } as Pointer) : undefined}
                    />
                    <PointerRow label="lkgr (last known good)" repo={repo} pointer={live.lkgr} />
                    <PointerRow label="canary pointer" repo={repo} pointer={live.canary} />
                </div>
                {tree && Object.keys(tree.builders).length > 0 && (
                    <div>
                        <h3 className="m-0 mb-1.5 text-sm font-semibold">Post-submit builders</h3>
                        <ul className="m-0 flex list-none flex-col gap-1 p-0">
                            {Object.entries(tree.builders).map(([name, builder]) => (
                                <li key={name} className="flex flex-wrap items-center gap-2 text-sm">
                                    <Badge variant={builder.state === 'green' ? 'good' : 'bad'}>{builder.state}</Badge>
                                    <SafeLink href={builder.url}>{name}</SafeLink>
                                    <span className="text-secondary">
                                        at <Commit repo={repo} commit={builder.commit} />
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                <div>
                    <h3 className="m-0 mb-1.5 text-sm font-semibold">Daily canary, last {days.length} days (UTC)</h3>
                    <CanaryDays repo={repo} live={live} days={days} />
                </div>
            </CardContent>
        </Card>
    )
}

function Live() {
    const state = useLiveState()
    return (
        <div className="flex flex-col gap-5">
            <p className="m-0 max-w-3xl text-sm text-secondary">
                Read just now in your browser from public state that qq writes: gardener’s{' '}
                <External href={SOURCES.treeStatus}>tree status</External> (refreshed every 5 minutes) and release’s{' '}
                <External href={SOURCES.releaseState}>release state</External> (lkgr, channels and each day’s canary
                run). GitHub may serve a copy up to 5 minutes old.
            </p>
            {state.status === 'loading' && <p className="m-0 text-sm">Loading live state…</p>}
            {state.status === 'error' && (
                <Card>
                    <CardHeader>
                        <CardTitle>Live state is unavailable right now</CardTitle>
                        <CardDescription>
                            {state.message}. You can read the same files on GitHub:{' '}
                            <External href={SOURCES.treeStatus}>tree status</External> and{' '}
                            <External href={SOURCES.releaseState}>release state</External>.
                        </CardDescription>
                    </CardHeader>
                </Card>
            )}
            {state.status === 'ready' && (
                <>
                    <div className="grid grid-cols-1 gap-4 @3xl:grid-cols-2">
                        {PRODUCTS.map((repo) => (
                            <RepoLiveCard key={repo} repo={repo} live={state.repos[repo]} days={state.days} />
                        ))}
                    </div>
                    <p className="m-0 text-xs text-secondary">
                        Loaded {state.loadedAt.toLocaleTimeString()}. Daily reports:{' '}
                        <External href={`${ORG}/release/tree/release-state/reports`}>release-state/reports</External>.
                    </p>
                </>
            )}
        </div>
    )
}

function Repos() {
    return (
        <div className="flex flex-col gap-7">
            <p className="m-0 max-w-3xl text-sm text-secondary">
                The 13 repos in four stages. “Modeled on” names the Chromium piece each one copies. Status as of {AS_OF}
                . For every project the swarm builds, by phase, see{' '}
                <Link to="/projects" className="underline underline-offset-2">
                    Projects
                </Link>
                .
            </p>
            {LANES.map((lane, laneIndex) => (
                <section key={lane}>
                    <SectionTitle>{lane}</SectionTitle>
                    <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 @2xl:grid-cols-2 @5xl:grid-cols-3">
                        {REPOS.filter((repo) => repo.lane === laneIndex).map((repo) => (
                            <li key={repo.name}>
                                <Card className="h-full">
                                    <CardHeader>
                                        <CardTitle className="font-mono">
                                            <External href={`${ORG}/${repo.name}`}>{repo.name}</External>
                                        </CardTitle>
                                        <CardDescription>{repo.sub}</CardDescription>
                                    </CardHeader>
                                    <CardContent className="flex flex-col gap-2 text-sm">
                                        <p className="m-0 leading-relaxed">{repo.role}</p>
                                        <p className="m-0 text-secondary">Modeled on {repo.counterpart}.</p>
                                        <p className="m-0">
                                            <span className="font-semibold">Still open: </span>
                                            {repo.open}
                                        </p>
                                    </CardContent>
                                </Card>
                            </li>
                        ))}
                    </ul>
                </section>
            ))}
        </div>
    )
}

function Guide() {
    return (
        <div className="flex flex-col gap-8">
            {GUIDE.map((section) => (
                <section key={section.title}>
                    <SectionTitle>{section.title}</SectionTitle>
                    <ol className="m-0 flex max-w-3xl flex-col gap-4 pl-5">
                        {section.steps.map((step) => (
                            <li key={step.text} className="text-[15px] leading-relaxed">
                                <p className="m-0">{step.text}</p>
                                {step.code && (
                                    <pre className="m-0 mt-2 whitespace-pre-wrap break-all rounded-md border border-primary bg-accent p-3 font-mono text-[13px] leading-snug [&>code]:border-0 [&>code]:bg-transparent [&>code]:p-0">
                                        <code>{step.code}</code>
                                    </pre>
                                )}
                                {step.note && <p className="m-0 mt-1.5 text-sm text-secondary">{step.note}</p>}
                            </li>
                        ))}
                    </ol>
                </section>
            ))}
            <section>
                <SectionTitle>Known limits in v0</SectionTitle>
                <ul className="m-0 flex max-w-3xl flex-col gap-1.5 pl-5 text-[15px]">
                    {LIMITS.map((limit) => (
                        <li key={limit}>{limit}</li>
                    ))}
                </ul>
            </section>
        </div>
    )
}

export default function QuirqInfraV0({ app }: { app: QuirqApp }): JSX.Element {
    const [tab, setTab] = useState<Tab>('overview')
    return (
        <Explorer
            title={app.name}
            showTitle={false}
            transparent
            padding={false}
            headerBarOptions={['showBack', 'showForward']}
            rightActionButtons={
                <>
                    <ButtonLink to="/" variant="ghost" size="sm" className="h-7">
                        Home base
                    </ButtonLink>
                    <ButtonLink to={SOURCES.plan} size="sm" className="h-7">
                        Read the v0 plan
                    </ButtonLink>
                </>
            }
        >
            <div className="not-prose text-primary" data-testid="quirq-infra-v0">
                <header className="border-b border-primary bg-purple/10 p-6 @xl:p-10">
                    <div className="flex items-center gap-5">
                        <QuirqAppIcon icon={app.icon} color={app.color} className="size-16 shrink-0" />
                        <div className="min-w-0">
                            <h1 className="m-0 mb-2 text-3xl font-bold tracking-tight @xl:text-4xl">{app.name}</h1>
                            <p className="m-0 max-w-2xl text-base text-secondary">
                                How a change gets from a pull request to the daily canary, across 13 public repos. Read
                                the guide, then watch it run.
                            </p>
                        </div>
                    </div>
                </header>
                <div className="p-5 @xl:p-8">
                    <Tabs value={tab} onValueChange={(value) => setTab(value as Tab)}>
                        <TabsList aria-label="quirq infra v0 sections">
                            <TabsTrigger value="overview">Overview</TabsTrigger>
                            <TabsTrigger value="live">Live</TabsTrigger>
                            <TabsTrigger value="repos">The 13 repos</TabsTrigger>
                            <TabsTrigger value="guide">Guide</TabsTrigger>
                        </TabsList>
                        <TabsContent value="overview">
                            <Overview />
                        </TabsContent>
                        <TabsContent value="live">
                            <Live />
                        </TabsContent>
                        <TabsContent value="repos">
                            <Repos />
                        </TabsContent>
                        <TabsContent value="guide">
                            <Guide />
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </Explorer>
    )
}
