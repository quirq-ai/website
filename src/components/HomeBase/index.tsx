import React, { useMemo, useState } from 'react'
import Explorer from 'components/Explorer'
import Link from 'components/Link'
import OSButton from 'components/OSButton'
import QuirqAppIcon from 'components/QuirqAppIcon'
import { getQuirqApps, quirqConfig } from 'lib/quirqApps'

const apps = getQuirqApps()
const categories = Array.from(new Set(apps.map((app) => app.category))).sort()

export default function HomeBase() {
    const [query, setQuery] = useState('')
    const [category, setCategory] = useState('All apps')
    const [view, setView] = useState<'grid' | 'list'>('grid')
    const matches = useMemo(
        () =>
            apps.filter(
                (app) =>
                    (category === 'All apps' || app.category === category) &&
                    `${app.name} ${app.repo} ${app.description} ${app.topics.join(' ')}`
                        .toLowerCase()
                        .includes(query.toLowerCase().trim())
            ),
        [query, category]
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
                <OSButton asLink to={`https://github.com/${quirqConfig.organization}`} external size="sm">
                    {quirqConfig.organization}
                </OSButton>
            }
        >
            <div className="not-prose p-5 @xl:p-8 @3xl:p-12 text-primary" data-testid="home-base">
                <header className="flex items-start justify-between gap-6 mb-8">
                    <div>
                        <div className="flex items-center gap-2 text-sm font-semibold mb-4">
                            <span
                                aria-hidden="true"
                                className="rounded-full size-6 border-[3px] border-current relative after:content-[''] after:absolute after:w-2 after:h-[3px] after:bg-current after:-right-1 after:-bottom-0.5 after:rotate-45"
                            />
                            {quirqConfig.name}
                            <span className="font-normal text-secondary">/ home base</span>
                        </div>
                        <h1 className="text-3xl @xl:text-5xl font-bold tracking-tight mb-3">
                            A little universe of apps.
                        </h1>
                        <p className="text-secondary max-w-xl text-base leading-relaxed m-0">
                            Open a window. Find your tools. Make yourself at home.
                        </p>
                    </div>
                    <Link
                        to="/display-options"
                        state={{ newWindow: true }}
                        className="hidden @xl:flex shrink-0 rotate-3 hover:rotate-0 transition-transform bg-yellow/20 border border-yellow/50 rounded-lg px-4 py-3 text-sm font-semibold no-underline text-primary"
                    >
                        Make it yours ↗
                    </Link>
                </header>

                {!query && category === 'All apps' && (
                    <section
                        aria-label="Featured apps"
                        className="mb-8 border border-primary rounded-xl bg-primary/40 px-4 py-5"
                    >
                        <div className="flex justify-between gap-3 mb-4 text-xs uppercase tracking-widest font-semibold text-secondary">
                            <span>On your desk</span>
                            <span>Pick a place to start</span>
                        </div>
                        <div className="grid grid-cols-3 @xl:grid-cols-6 gap-3">
                            {apps
                                .filter((app) => app.featured)
                                .map((app) => (
                                    <Link
                                        key={app.id}
                                        to={app.path}
                                        state={{ newWindow: true }}
                                        className="group flex flex-col items-center gap-2 p-2 rounded-lg hover:bg-accent text-primary no-underline text-center"
                                    >
                                        <QuirqAppIcon
                                            icon={app.icon}
                                            color={app.color}
                                            className="size-12 transition-transform group-hover:-translate-y-1"
                                        />
                                        <span className="text-xs font-semibold leading-tight">{app.name}</span>
                                    </Link>
                                ))}
                        </div>
                    </section>
                )}

                <section aria-label="App collection">
                    <div className="flex flex-wrap items-center gap-3 mb-4">
                        <h2 className="text-xl font-semibold m-0 mr-auto">
                            Your apps <span className="text-secondary text-sm font-normal ml-1">{matches.length}</span>
                        </h2>
                        <input
                            type="search"
                            aria-label="Find an app"
                            placeholder="Find an app…"
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            className="min-w-0 w-44 @xl:w-56 bg-primary/70 border border-primary rounded-md px-3 py-2 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-blue"
                        />
                        <div className="flex rounded-md border border-primary p-0.5" role="group" aria-label="App view">
                            {(['grid', 'list'] as const).map((mode) => (
                                <button
                                    key={mode}
                                    type="button"
                                    aria-pressed={view === mode}
                                    onClick={() => setView(mode)}
                                    className={`text-xs px-2 py-1.5 rounded ${
                                        view === mode ? 'bg-accent font-semibold' : 'text-secondary'
                                    }`}
                                >
                                    {mode === 'grid' ? 'Grid' : 'List'}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="flex gap-1.5 flex-wrap mb-5" role="group" aria-label="App categories">
                        {['All apps', ...categories].map((item) => (
                            <button
                                type="button"
                                key={item}
                                onClick={() => setCategory(item)}
                                aria-pressed={category === item}
                                className={`rounded-full px-3 py-1 text-xs border ${
                                    category === item
                                        ? 'bg-primary border-primary font-semibold shadow-sm'
                                        : 'border-transparent text-secondary hover:bg-accent'
                                }`}
                            >
                                {item}
                            </button>
                        ))}
                    </div>
                    <div
                        className={
                            view === 'grid'
                                ? 'grid grid-cols-1 @sm:grid-cols-2 @3xl:grid-cols-3 gap-3'
                                : 'flex flex-col gap-1'
                        }
                        data-testid="app-collection"
                    >
                        {matches.map((app) => (
                            <Link
                                key={app.id}
                                to={app.path}
                                state={{ newWindow: true }}
                                wrapperClassName="min-w-0 h-full"
                                className={`group block h-full text-primary no-underline border border-primary/60 hover:border-primary rounded-lg hover:bg-primary/60 transition-colors ${
                                    view === 'grid' ? 'bg-primary/25 p-4' : 'flex items-center gap-4 p-3'
                                }`}
                            >
                                <div
                                    className={`flex items-center gap-3 ${
                                        view === 'grid' ? 'mb-3' : 'min-w-0 w-52 shrink-0 max-w-[55%]'
                                    }`}
                                >
                                    <QuirqAppIcon
                                        icon={app.icon}
                                        color={app.color}
                                        className="size-9 shrink-0 transition-transform group-hover:scale-110"
                                    />
                                    <div className="min-w-0">
                                        <div className="font-semibold text-sm truncate">{app.name}</div>
                                        <div className="text-[11px] font-mono text-secondary truncate">{app.path}</div>
                                    </div>
                                </div>
                                <p
                                    className={`text-secondary text-xs leading-relaxed m-0 ${
                                        view === 'grid' ? 'line-clamp-2 min-h-[2.5rem]' : 'truncate flex-1'
                                    }`}
                                >
                                    {app.description || 'Explore the project and its readme.'}
                                </p>
                                {view === 'grid' && (
                                    <div className="text-[10px] uppercase tracking-wider mt-4 text-secondary flex justify-between gap-2">
                                        <span>{app.category}</span>
                                        <span>{app.language || 'Repository'} ↗</span>
                                    </div>
                                )}
                            </Link>
                        ))}
                    </div>
                    {matches.length === 0 && (
                        <div className="py-10 text-center">
                            <p className="text-secondary">No apps match this search.</p>
                            <OSButton
                                onClick={() => {
                                    setQuery('')
                                    setCategory('All apps')
                                }}
                                size="sm"
                            >
                                Show all apps
                            </OSButton>
                        </div>
                    )}
                </section>
                <footer className="flex flex-wrap justify-between gap-3 pt-6 mt-6 border-t border-primary text-xs text-secondary">
                    <span>{apps.length} apps · One home base</span>
                    <a
                        href={`https://github.com/${quirqConfig.organization}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-secondary"
                    >
                        From {quirqConfig.organization} on GitHub ↗
                    </a>
                </footer>
            </div>
        </Explorer>
    )
}
