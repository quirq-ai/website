import React, { useMemo, useState } from 'react'
import Explorer from 'components/Explorer'
import Link from 'components/Link'
import OSButton from 'components/OSButton'
import QuirqAppIcon from 'components/QuirqAppIcon'
import { QuirqWordmark } from 'components/QuirqBrand'
import { getQuirqApps, quirqConfig } from 'lib/quirqApps'

const apps = getQuirqApps()
const categories = Array.from(new Set(apps.map((app) => app.category))).sort()

export default function HomeBase() {
    const [query, setQuery] = useState('')
    const [category, setCategory] = useState('All apps')
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
                <header className="mb-8">
                    <QuirqWordmark className="h-7 w-auto mb-5 text-primary" />
                    <h1 className="text-3xl @xl:text-5xl font-bold tracking-tight mb-3">A little universe of apps.</h1>
                    <p className="text-secondary max-w-xl text-base leading-relaxed m-0">
                        Everything quirq builds, in one place. Open an app to read about it or launch it.
                    </p>
                    <div className="flex flex-wrap gap-2 mt-5">
                        <OSButton asLink to="/projects" variant="primary" size="sm">
                            See every project by phase
                        </OSButton>
                        <OSButton asLink to="/v0" size="sm">
                            How quirq infra v0 works
                        </OSButton>
                    </div>
                </header>

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
                        className="grid grid-cols-1 @sm:grid-cols-2 @3xl:grid-cols-3 gap-3"
                        data-testid="app-collection"
                    >
                        {matches.map((app) => (
                            <Link
                                key={app.id}
                                to={app.path}
                                state={{ newWindow: true }}
                                wrapperClassName="min-w-0 h-full"
                                className="group block h-full text-primary no-underline border border-primary/60 hover:border-primary rounded-lg hover:bg-primary/60 transition-colors bg-primary/25 p-4"
                            >
                                <div className="flex items-center gap-3 mb-3">
                                    <QuirqAppIcon
                                        icon={app.icon}
                                        color={app.color}
                                        className="size-9 shrink-0 transition-transform group-hover:scale-110"
                                    />
                                    <div className="min-w-0 font-semibold text-sm truncate">{app.name}</div>
                                </div>
                                <p className="text-secondary text-xs leading-relaxed m-0 line-clamp-2">
                                    {app.description || 'Explore the project and its readme.'}
                                </p>
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
            </div>
        </Explorer>
    )
}
