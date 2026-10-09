import React, { useEffect, useMemo, useState } from 'react'
import Explorer from 'components/Explorer'
import Link from 'components/Link'
import OSButton from 'components/OSButton'
import { QuirqAppTile } from 'components/QuirqAppIcon'
import { QuirqWordmark } from 'components/QuirqBrand'
import { QuirqAvatarTile } from 'components/QuirqAvatar'
import { useOpenQuirqy } from 'components/Quirqy'
import { getLaunchTarget, quirqConfig, type QuirqApp } from 'lib/quirqApps'
import { useQuirqCatalog } from 'lib/quirqLiveApps'
import { quirqRoles, roleInfo, roleKeywords } from 'lib/quirqRoles'
import { showsRoles } from '../../../scripts/lib/quirq-catalog.mjs'
import { Badge } from 'components/ui/badge'

const orgUrl = `https://github.com/${quirqConfig.organization}`
// UTC keeps the server render and the browser render on the same day.
const syncedDate = (fetchedAt: string) =>
    new Date(fetchedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })

// Euler's frosted glass, with solid fallbacks for dark mode and reduced transparency.
const glass =
    'border border-white/80 dark:border-white/10 bg-white/40 dark:bg-black/40 backdrop-blur-xl reduce-transparency:bg-primary reduce-transparency:backdrop-blur-none'
const card = `${glass} bg-gradient-to-br from-white/80 to-white/40 dark:from-black/60 dark:to-black/40 shadow-[0_8px_28px_-21px_rgba(59,86,115,0.35)] hover:border-white dark:hover:border-white/20 hover:shadow-[0_13px_32px_-22px_rgba(59,86,115,0.5)] transition-[border-color,box-shadow]`
const button =
    'inline-flex items-center justify-center gap-1.5 min-h-10 px-3.5 rounded-[10px] border text-xs font-semibold whitespace-nowrap no-underline transition-colors active:translate-y-px'
const primaryButton = `${button} border-transparent bg-[#466278] hover:bg-[#34546e] text-white hover:text-white shadow-[0_3px_8px_rgba(49,77,106,0.07)]`
const secondaryButton = `${button} border-white/80 dark:border-white/10 bg-white/40 dark:bg-white/5 hover:bg-white/90 dark:hover:bg-white/10 text-secondary hover:text-primary`

const Icon = ({ path, className = 'size-3.5' }: { path: string; className?: string }) => (
    <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className={`${className} shrink-0 fill-none stroke-current`}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <path d={path} />
    </svg>
)
const icons = {
    external: 'M14 4h6v6m0-6L10 14M10 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-4',
    search: 'M17 17l4 4M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13Z',
    settings: 'M4 7h5m6 0h5M4 17h11m4 0h1M12 4v6M17 14v6',
    code: 'm8 8-4 4 4 4m8-8 4 4-4 4',
}

/** Launch opens the app's own window on this site, its website framed, or "Oops" with Open in new tab. */
const LaunchButton = ({ app }: { app: QuirqApp }) => {
    const launch = getLaunchTarget(app)
    if (!launch) return null
    return launch.external ? (
        <a
            href={launch.to}
            target="_blank"
            rel="noopener noreferrer"
            className={secondaryButton}
            aria-label={`Launch ${app.name} in a new tab`}
        >
            Launch <Icon path={icons.external} className="size-3" />
        </a>
    ) : (
        <Link
            to={launch.to}
            state={{ newWindow: true }}
            className={secondaryButton}
            aria-label={`Launch ${app.name} in its own window`}
        >
            Launch
        </Link>
    )
}

type Filter = { key: string; label: string; matches: (app: QuirqApp) => boolean }
const allApps: Filter = { key: 'all', label: 'All apps', matches: () => true }

/**
 * Home base's filters: one per repository type (the organization's `role` property on GitHub) that some
 * app has, in the order types are listed, once enough types are in use (`showsRoles`). An app whose type
 * isn't known counts as a project, GitHub's default, as it does in the order. Until then, the mapping's
 * categories.
 */
function filtersFor(apps: QuirqApp[]): Filter[] {
    if (showsRoles(apps)) {
        const roleOf = (app: QuirqApp) => app.role || 'project'
        return [
            allApps,
            ...quirqRoles
                .filter((role) => apps.some((app) => roleOf(app) === role))
                .map((role) => ({
                    key: `role:${role}`,
                    label: roleInfo[role].plural,
                    matches: (app: QuirqApp) => roleOf(app) === role,
                })),
        ]
    }
    return [
        allApps,
        ...Array.from(new Set(apps.map((app) => app.category)))
            .sort()
            .map((category) => ({
                key: `category:${category}`,
                label: category,
                matches: (app: QuirqApp) => app.category === category,
            })),
    ]
}

const greetingFor = (hour: number) =>
    hour < 5 ? 'Good evening.' : hour < 12 ? 'Good morning.' : hour < 18 ? 'Good afternoon.' : 'Good evening.'

/** The current time, or null during server rendering and hydration so both renders match. */
function useNow() {
    const [now, setNow] = useState<Date | null>(null)
    useEffect(() => {
        setNow(new Date())
        const timer = window.setInterval(() => setNow(new Date()), 30000)
        return () => window.clearInterval(timer)
    }, [])
    return now
}

const Metric = ({ value, label, live }: { value: number; label: string; live?: boolean }) => (
    <div className="flex flex-col items-center gap-2 min-w-[96px] px-5 border-l border-black/[0.06] dark:border-white/10 first:border-l-0 first:pl-0 last:pr-0">
        <strong className="text-[31px] leading-tight font-normal tracking-tight tabular-nums text-primary">
            {value}
        </strong>
        <span className="inline-flex items-center gap-1.5 text-xs text-secondary">
            {live && <span className="size-1.5 rounded-full bg-[#56a382] shadow-[0_0_0_3px_rgba(122,167,139,0.12)]" />}
            {label}
        </span>
    </div>
)

/**
 * The Home window at `/`, laid out after Euler's Home: a greeting with the catalog at a glance, and
 * every app as a card. The dock's Home opens it; opening an app from a card opens that app's own
 * window, and Personalize opens the quirqy window, where the Blobatar avatar is made yours.
 */
export default function HomeBase() {
    const now = useNow()
    const catalog = useQuirqCatalog()
    const { apps } = catalog
    const [query, setQuery] = useState('')
    const [filterKey, setFilterKey] = useState(allApps.key)
    // The avatar's appearance lives in the quirqy window, which the dock also opens.
    const personalize = useOpenQuirqy()
    const filters = useMemo(() => filtersFor(apps), [apps])
    const typed = filters.some((item) => item.key.startsWith('role:'))
    // A filter the live list no longer has (its last app changed type, say) falls back to all apps.
    const filter = filters.find((item) => item.key === filterKey) || allApps
    const liveCount = apps.filter((app) => app.launchUrl).length

    const matches = useMemo(
        () =>
            apps.filter(
                (app) =>
                    filter.matches(app) &&
                    `${app.name} ${app.repo} ${app.description} ${app.topics.join(' ')} ${roleKeywords(app.role)}`
                        .toLowerCase()
                        .includes(query.toLowerCase().trim())
            ),
        [apps, query, filter]
    )

    return (
        <Explorer
            template="generic"
            slug="home-base"
            title="Home base"
            showTitle={false}
            showAddressBar={false}
            transparent
            padding={false}
            headerBarOptions={['showBack', 'showForward']}
            rightActionButtons={
                <OSButton asLink to={orgUrl} external size="sm">
                    {quirqConfig.organization}
                </OSButton>
            }
        >
            <div
                className="not-prose w-full max-w-[1232px] mx-auto px-5 @xl:px-9 pt-6 pb-10 text-primary"
                data-testid="home-base"
            >
                <header className="flex items-center justify-between gap-5">
                    <div className="inline-flex items-center gap-2.5">
                        <QuirqAvatarTile className="size-10 rounded-xl" avatarClassName="size-8" />
                        <QuirqWordmark className="h-6 w-auto text-primary" />
                    </div>
                    <div className="flex items-center gap-3 @xl:gap-5">
                        <time className="hidden @md:block text-xs font-medium tabular-nums text-secondary min-w-[4rem] text-right">
                            {now?.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                        </time>
                        <span
                            className={`hidden @xl:inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] text-[#527665] dark:text-[#9cc9b2] ${glass}`}
                            title={`Repository list read from GitHub at ${catalog.fetchedAt}`}
                        >
                            <span className="size-[5px] rounded-full bg-[#78a28e]" />{' '}
                            {catalog.status === 'live' ? 'Live' : `Synced ${syncedDate(catalog.fetchedAt)}`}
                        </span>
                        <button
                            type="button"
                            onClick={personalize}
                            className="inline-flex items-center gap-1.5 min-h-10 text-xs font-semibold text-secondary hover:text-primary"
                        >
                            <Icon path={icons.settings} /> Personalize
                        </button>
                    </div>
                </header>

                <div className="pt-12 @xl:pt-14">
                    <section
                        aria-labelledby="home-greeting"
                        className="flex flex-col @3xl:flex-row @3xl:items-center justify-between gap-8 mb-10"
                    >
                        <div>
                            <p className="m-0 mb-3 min-h-[15px] text-[10px] font-semibold tracking-[0.16em] uppercase text-muted">
                                {now?.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
                            </p>
                            <h1
                                id="home-greeting"
                                className="m-0 text-[clamp(29px,3.5vw,42px)] leading-tight tracking-tight font-normal text-primary"
                            >
                                {now ? greetingFor(now.getHours()) : 'Welcome home.'}
                            </h1>
                            <p className="mt-3 mb-0 text-sm text-secondary">
                                Everything quirq builds. One little space.
                            </p>
                        </div>
                        <div
                            className="flex items-center self-start @3xl:self-auto dark:px-5 dark:py-3 dark:rounded-2xl dark:bg-black/40 dark:backdrop-blur-xl dark:border dark:border-white/10 reduce-transparency:backdrop-blur-none"
                            aria-label="Catalog summary"
                        >
                            <Metric value={liveCount} label="Live" live />
                            <Metric value={apps.length} label="Apps" />
                            <Metric value={catalog.repositoryCount} label="Repos" />
                        </div>
                    </section>

                    <section
                        aria-labelledby="apps-heading"
                        className="pt-7 border-t border-black/[0.06] dark:border-white/10"
                    >
                        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                            <div>
                                <div className="flex items-center gap-2.5">
                                    <h2 id="apps-heading" className="m-0 text-[19px] font-semibold tracking-tight">
                                        Your apps
                                    </h2>
                                    <span
                                        className={`inline-flex items-center justify-center min-w-[21px] h-[21px] px-1.5 rounded-md text-[10px] tabular-nums text-secondary ${glass}`}
                                    >
                                        {matches.length}
                                    </span>
                                </div>
                                <p className="mt-1.5 mb-0 text-xs text-secondary">
                                    A place for everything quirq builds.
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <a href={orgUrl} target="_blank" rel="noopener noreferrer" className={secondaryButton}>
                                    <Icon path={icons.code} /> On GitHub
                                </a>
                                <Link to="/projects" state={{ newWindow: true }} className={primaryButton}>
                                    See projects by phase
                                </Link>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                            <div
                                className="flex flex-wrap gap-0.5 p-[3px] rounded-[11px] border border-white/60 dark:border-white/10 bg-white/20 dark:bg-black/40 backdrop-blur-xl reduce-transparency:backdrop-blur-none"
                                role="group"
                                aria-label={typed ? 'App types' : 'App categories'}
                            >
                                {filters.map((item) => (
                                    <button
                                        type="button"
                                        key={item.key}
                                        onClick={() => setFilterKey(item.key)}
                                        aria-pressed={filter.key === item.key}
                                        className={`min-h-11 @xl:min-h-8 px-3 rounded-lg border text-[11px] font-semibold whitespace-nowrap transition-colors ${
                                            filter.key === item.key
                                                ? 'border-white/90 dark:border-white/10 bg-white/75 dark:bg-white/10 text-primary shadow-sm'
                                                : 'border-transparent text-secondary hover:text-primary hover:bg-white/40 dark:hover:bg-white/5'
                                        }`}
                                    >
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                            <label
                                className={`flex items-center gap-2 w-full @md:w-56 min-h-10 px-3 rounded-[11px] text-muted focus-within:bg-white/70 dark:focus-within:bg-white/10 ${glass}`}
                            >
                                <Icon path={icons.search} />
                                <input
                                    type="search"
                                    aria-label="Find an app"
                                    placeholder="Find an app"
                                    value={query}
                                    onChange={(event) => setQuery(event.target.value)}
                                    className="w-full min-w-0 border-0 p-0 bg-transparent text-xs text-primary placeholder:text-muted focus:outline-none focus:ring-0"
                                />
                            </label>
                        </div>

                        <div
                            className="grid grid-cols-1 @2xl:grid-cols-2 @5xl:grid-cols-3 gap-4"
                            data-testid="app-collection"
                        >
                            {matches.map((app) => (
                                <article
                                    key={app.id}
                                    className={`flex flex-col min-w-0 px-5 pt-6 pb-5 rounded-[22px] ${card}`}
                                >
                                    <div className="flex items-center gap-3 min-h-[68px]">
                                        <QuirqAppTile icon={app.icon} color={app.color} />
                                        <div className="flex-1 min-w-0">
                                            <h3 className="m-0 text-lg font-semibold tracking-tight truncate">
                                                {app.name}
                                            </h3>
                                            <p className="mt-0.5 mb-0 text-xs leading-relaxed text-secondary line-clamp-2">
                                                {app.description || 'Explore the project and its readme.'}
                                            </p>
                                        </div>
                                        {app.stars > 0 && (
                                            <span
                                                className="self-start text-[11px] text-muted tabular-nums"
                                                title="GitHub stars"
                                            >
                                                ☆ {app.stars}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center justify-between gap-3 mt-6 text-xs">
                                        <span
                                            className={`inline-flex items-center gap-1.5 ${
                                                app.launchUrl ? 'text-[#42795f] dark:text-[#8fc9a8]' : 'text-secondary'
                                            }`}
                                        >
                                            <span
                                                className={`size-1.5 rounded-full ${
                                                    app.launchUrl ? 'bg-[#56a382]' : 'bg-[#b2bdc6]'
                                                }`}
                                            />
                                            {app.launchUrl ? 'Live' : 'Read me'}
                                        </span>
                                        {!typed ? (
                                            <span className="text-[11px] text-muted">{app.category}</span>
                                        ) : app.role ? (
                                            <Badge
                                                variant="outline"
                                                title={roleInfo[app.role].meaning}
                                                data-testid="app-type"
                                            >
                                                <span className="sr-only">Type: </span>
                                                {roleInfo[app.role].label}
                                                <span className="sr-only">. {roleInfo[app.role].meaning}</span>
                                            </Badge>
                                        ) : null}
                                    </div>
                                    <p className="mt-2.5 mb-5 pb-4 border-b border-black/[0.06] dark:border-white/10 text-[11px] text-muted break-all">
                                        {app.path}
                                        {app.language
                                            ? ` · ${app.language}`
                                            : ` · ${quirqConfig.organization}/${app.repo}`}
                                    </p>
                                    <div className="flex items-center gap-1.5 mt-auto">
                                        <Link
                                            to={app.path}
                                            state={{ newWindow: true }}
                                            wrapperClassName="flex-1 min-w-0"
                                            className={`${primaryButton} w-full`}
                                        >
                                            Open
                                        </Link>
                                        <LaunchButton app={app} />
                                        <a
                                            href={app.repoUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={`${secondaryButton} px-2.5`}
                                            aria-label={`${app.name} on GitHub`}
                                            title="View on GitHub"
                                        >
                                            <Icon path={icons.code} />
                                        </a>
                                    </div>
                                </article>
                            ))}
                            {matches.length === 0 && (
                                <div className="col-span-full py-12 px-5 text-center rounded-[22px] border border-dashed border-white/90 dark:border-white/15 bg-white/20 dark:bg-black/40">
                                    <h3 className="mt-0 mb-2 text-[15px] font-semibold text-secondary">
                                        No apps found
                                    </h3>
                                    <p className="mt-0 mb-5 text-xs text-muted">
                                        Try a different name or another filter.
                                    </p>
                                    <button
                                        type="button"
                                        className={secondaryButton}
                                        onClick={() => {
                                            setQuery('')
                                            setFilterKey(allApps.key)
                                        }}
                                    >
                                        Clear filters
                                    </button>
                                </div>
                            )}
                        </div>
                        <p className="flex items-center justify-center gap-2 mt-5 mb-0 text-[11px] text-muted">
                            <span className="size-1 rounded-full bg-current opacity-60" />
                            Open an app to read about it, or launch it where it lives.
                        </p>
                    </section>

                    <footer className="flex flex-wrap items-center justify-between gap-4 mt-8 pt-5 px-0.5 border-t border-black/[0.06] dark:border-white/10 text-[10px] text-muted">
                        <span>quirq home base</span>
                        <span>
                            {apps.length} apps from{' '}
                            <a
                                href={orgUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline underline-offset-2"
                            >
                                github.com/{quirqConfig.organization}
                            </a>
                        </span>
                    </footer>
                </div>
            </div>
        </Explorer>
    )
}
