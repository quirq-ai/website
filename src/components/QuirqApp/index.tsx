import React, { useEffect, useState } from 'react'
import { Tabs as RadixTabs } from 'radix-ui'
import Explorer from 'components/Explorer'
import OSButton from 'components/OSButton'
import QuirqAppIcon from 'components/QuirqAppIcon'
import { getLaunchTarget, type QuirqApp } from 'lib/quirqApps'
import { docLabel, readmeSummary } from 'lib/quirqDocs'
import { roleInfo } from 'lib/quirqRoles'
import { useQuirqApps } from 'lib/quirqLiveApps'
import { showsRoles } from '../../../scripts/lib/quirq-catalog.mjs'
import { Badge } from 'components/ui/badge'
import { useAppSettings } from '../../context/App'
import DocsBrowser, { useRepositoryDocs } from './DocsBrowser'
import { touchTarget } from './RoutedApp'

/** "Updated Oct 9" on the server and first paint (UTC, so both renders match), then "5h ago". */
function useUpdatedLabel(iso: string) {
    const absolute = new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
    const [label, setLabel] = useState(absolute)
    useEffect(() => {
        const update = () => {
            const minutes = Math.round((Date.now() - Date.parse(iso)) / 60000)
            setLabel(
                minutes < 1
                    ? 'just now'
                    : minutes < 60
                    ? `${minutes}m ago`
                    : minutes < 60 * 24
                    ? `${Math.round(minutes / 60)}h ago`
                    : minutes < 60 * 24 * 30
                    ? `${Math.round(minutes / (60 * 24))}d ago`
                    : absolute
            )
        }
        update()
        const timer = window.setInterval(update, 60000)
        return () => window.clearInterval(timer)
    }, [iso, absolute])
    return `Updated ${label}`
}

type Tab = { key: string; label: string; title?: string }

/**
 * A repository's window: a compact header (icon, name, one-line summary, actions), a row of tabs for its
 * docs (and its embedded app, when it has one) with the repository's details beside them, and the open
 * doc in a centered reading column.
 */
export default function RepositoryApp({ app }: { app: QuirqApp }) {
    const { siteSettings } = useAppSettings()
    const dark = siteSettings.theme === 'dark'
    const docs = useRepositoryDocs(app)
    const embedded = app.launchMode === 'embed' && !!app.launchUrl
    const [view, setView] = useState<'app' | 'docs'>(embedded ? 'app' : 'docs')
    // Open app goes to the app's own window on this site ("Oops" and Open in new tab if it can't be framed).
    const launch = getLaunchTarget(app)
    // Repositories without a GitHub description get their README's first sentence.
    const summary = app.description || readmeSummary(docs.readmeText)
    const updated = useUpdatedLabel(app.updatedAt)

    const docTabs: Tab[] =
        docs.layout === 'tabs'
            ? docs.tabs.map((path) => ({ key: path, label: docLabel(path, docs.tabs), title: path }))
            : embedded
            ? [{ key: 'docs', label: 'Read me' }]
            : []
    const tabs: Tab[] = [...(embedded ? [{ key: 'app', label: 'App' }] : []), ...docTabs]
    const active = view === 'app' ? 'app' : docs.layout === 'tabs' ? docs.selected : 'docs'
    const choose = (key: string) => {
        if (key === 'app') return setView('app')
        setView('docs')
        if (key !== 'docs') docs.selectDoc(key)
    }
    // The repository's type (its `role` on GitHub) says what it is; the mapping's category is the fallback.
    // Shown once Home base shows types too (`showsRoles`), so the two never disagree.
    const catalog = useQuirqApps()
    const type = app.role && showsRoles(catalog) ? roleInfo[app.role] : null
    const details = [app.language, type ? null : app.category, app.stars > 0 ? `☆ ${app.stars}` : null, updated].filter(
        Boolean
    )

    return (
        <Explorer
            template="generic"
            slug={app.repo}
            title={app.name}
            showTitle={false}
            transparent
            padding={false}
            showAddressBar={false}
            headerBarOptions={['showBack', 'showForward']}
        >
            {/* Radix Tabs: tab and tabpanel roles, arrow keys between tabs, and the panel labelled by its tab. */}
            <RadixTabs.Root value={active} onValueChange={choose} activationMode="manual" asChild>
                <div className="not-prose text-primary" data-testid="repository-app">
                    <header className="border-b border-primary px-5 pt-5 @xl:px-8 @xl:pt-6">
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
                            <QuirqAppIcon icon={app.icon} color={app.color} className="size-11 shrink-0" />
                            <div className="min-w-[12rem] flex-1">
                                <div className="flex min-w-0 items-baseline gap-2">
                                    <h1 className="m-0 truncate text-xl font-semibold tracking-tight">{app.name}</h1>
                                    <span className="hidden truncate font-mono text-xs text-secondary @md:inline">
                                        {app.id}
                                    </span>
                                </div>
                                {summary && <p className="m-0 mt-0.5 line-clamp-2 text-sm text-secondary">{summary}</p>}
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                                {launch && (
                                    <OSButton
                                        asLink
                                        external={launch.external}
                                        to={launch.to}
                                        state={launch.external ? undefined : { newWindow: true }}
                                        variant="primary"
                                        size="sm"
                                        className={touchTarget}
                                    >
                                        Open app
                                    </OSButton>
                                )}
                                <OSButton asLink external to={app.repoUrl} size="sm" className={touchTarget}>
                                    View code
                                </OSButton>
                            </div>
                        </div>
                        <div className="mt-3 flex flex-wrap items-end gap-x-6">
                            {tabs.length > 0 && (
                                <RadixTabs.List
                                    aria-label={`${app.name} docs`}
                                    className="-mb-px flex max-w-full gap-5 overflow-x-auto"
                                >
                                    {tabs.map((tab) => (
                                        <RadixTabs.Trigger
                                            key={tab.key}
                                            value={tab.key}
                                            title={tab.title}
                                            className={`${touchTarget} shrink-0 whitespace-nowrap border-b-2 pb-2.5 pt-1 text-sm ${
                                                tab.key === active
                                                    ? 'border-current font-semibold text-primary'
                                                    : 'border-transparent text-secondary hover:text-primary'
                                            }`}
                                        >
                                            {tab.label}
                                        </RadixTabs.Trigger>
                                    ))}
                                </RadixTabs.List>
                            )}
                            <p className="m-0 ml-auto flex flex-wrap items-center gap-x-3 gap-y-1 pb-2.5 pt-1 text-xs text-secondary">
                                {type && (
                                    <Badge variant="outline" title={type.meaning} data-testid="app-type">
                                        <span className="sr-only">Type: </span>
                                        {type.label}
                                        <span className="sr-only">. {type.meaning}</span>
                                    </Badge>
                                )}
                                {details.map((detail) => (
                                    <span key={detail}>{detail}</span>
                                ))}
                            </p>
                        </div>
                    </header>
                    <Panel tabbed={tabs.length > 0} value={active}>
                        {view === 'app' && embedded && app.launchUrl ? (
                            <div className="p-3">
                                <p className="mb-3 text-xs text-secondary">
                                    If this app doesn’t allow embedding,{' '}
                                    <a href={app.launchUrl} target="_blank" rel="noopener noreferrer" data-new-tab>
                                        open it in a browser tab ↗
                                    </a>
                                    .
                                </p>
                                <iframe
                                    src={app.launchUrl}
                                    title={app.name}
                                    className="h-[65vh] w-full rounded border border-primary"
                                    sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-downloads"
                                    referrerPolicy="no-referrer"
                                />
                            </div>
                        ) : (
                            <DocsBrowser app={app} docs={docs} dark={dark} />
                        )}
                    </Panel>
                </div>
            </RadixTabs.Root>
        </Explorer>
    )
}

/** The open tab's panel, labelled by its tab; the content alone when the window has no tabs. */
function Panel({ tabbed, value, children }: { tabbed: boolean; value: string; children: React.ReactNode }) {
    return tabbed ? <RadixTabs.Content value={value}>{children}</RadixTabs.Content> : <>{children}</>
}
