import React, { useState } from 'react'
import Explorer from 'components/Explorer'
import OSButton from 'components/OSButton'
import QuirqAppIcon from 'components/QuirqAppIcon'
import Link from 'components/Link'
import { getLaunchTarget, type QuirqApp } from 'lib/quirqApps'
import DocsBrowser from './DocsBrowser'
import { touchTarget } from './RoutedApp'

const accents: Record<string, string> = {
    blue: 'bg-blue/10 border-blue/30',
    purple: 'bg-purple/10 border-purple/30',
    lilac: 'bg-lilac/10 border-lilac/30',
    orange: 'bg-orange/10 border-orange/30',
    yellow: 'bg-yellow/20 border-yellow/40',
    red: 'bg-red/10 border-red/30',
    salmon: 'bg-salmon/10 border-salmon/30',
    teal: 'bg-teal/10 border-teal/30',
    seagreen: 'bg-seagreen/10 border-seagreen/30',
    green: 'bg-green/10 border-green/30',
    pink: 'bg-pink/10 border-pink/30',
}

export default function RepositoryApp({ app }: { app: QuirqApp }) {
    const [tab, setTab] = useState<'about' | 'app'>(app.launchMode === 'embed' && app.launchUrl ? 'app' : 'about')
    const accent = accents[app.color] || accents.purple
    const reader = app.presentation === 'reader'
    const gallery = app.presentation === 'gallery'
    const launchUrl = app.launchUrl
    // Open app goes to the app's own window on this site, or to a new tab for an `external` app.
    const launch = getLaunchTarget(app)
    const sidebar = reader ? (
        <div className="not-prose p-3">
            <QuirqAppIcon icon={app.icon} color={app.color} className="size-14 mb-4" />
            <p className="font-semibold mb-1">{app.name}</p>
            <p className="font-mono text-xs text-secondary break-all mb-5">{app.id}</p>
            <div className="flex flex-col gap-2 text-sm">
                <a href={app.repoUrl} target="_blank" rel="noopener noreferrer">
                    Source code ↗
                </a>
                {launch &&
                    (launch.external ? (
                        <a href={launch.to} target="_blank" rel="noopener noreferrer">
                            Open website ↗
                        </a>
                    ) : (
                        <Link to={launch.to} state={{ newWindow: true }}>
                            Open website
                        </Link>
                    ))}
                <Link to="/">All apps</Link>
            </div>
        </div>
    ) : undefined

    return (
        <Explorer
            template="generic"
            slug={app.repo}
            title={app.name}
            showTitle={false}
            transparent={!reader}
            padding={false}
            showAddressBar={false}
            leftSidebarContent={sidebar}
            headerBarOptions={['showBack', 'showForward']}
            rightActionButtons={
                <>
                    <OSButton asLink to="/" size="sm" className={touchTarget}>
                        Home base
                    </OSButton>
                    {launch ? (
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
                    ) : (
                        <OSButton asLink external to={app.repoUrl} variant="primary" size="sm" className={touchTarget}>
                            Open repository
                        </OSButton>
                    )}
                </>
            }
        >
            <div className="not-prose text-primary" data-testid="repository-app" data-presentation={app.presentation}>
                <header className={`p-6 @xl:p-10 border-b ${accent} ${gallery ? 'text-center' : ''}`}>
                    <div className={`flex items-center gap-5 ${gallery ? 'flex-col' : ''}`}>
                        {!reader && (
                            <div
                                className={
                                    gallery
                                        ? 'rotate-[-7deg] hover:rotate-0 transition-transform border border-primary rounded-2xl shadow-xl p-5 bg-primary/70 mb-2'
                                        : 'shrink-0'
                                }
                            >
                                <QuirqAppIcon
                                    icon={app.icon}
                                    color={app.color}
                                    className={gallery ? 'size-20' : 'size-16'}
                                />
                            </div>
                        )}
                        <div className="min-w-0">
                            <h1
                                className={`font-bold tracking-tight mb-3 ${
                                    gallery ? 'text-5xl @xl:text-6xl' : 'text-3xl @xl:text-4xl'
                                }`}
                            >
                                {app.name}
                            </h1>
                            {app.description && (
                                <p className="text-secondary max-w-2xl mb-3 text-base">{app.description}</p>
                            )}
                            <div className={`flex gap-2 flex-wrap text-xs ${gallery ? 'justify-center' : ''}`}>
                                {app.language && (
                                    <span className="border border-primary rounded-full px-2 py-0.5 bg-primary/50">
                                        {app.language}
                                    </span>
                                )}
                                {app.stars > 0 && <span className="px-2 py-0.5">☆ {app.stars}</span>}
                            </div>
                        </div>
                    </div>
                </header>
                {app.launchMode === 'embed' && launchUrl && (
                    <div className="flex gap-2 p-3 border-b border-primary" role="group" aria-label="App content">
                        <OSButton active={tab === 'app'} onClick={() => setTab('app')} size="sm">
                            App
                        </OSButton>
                        <OSButton active={tab === 'about'} onClick={() => setTab('about')} size="sm">
                            Read me
                        </OSButton>
                    </div>
                )}
                {tab === 'app' && launchUrl ? (
                    <div className="p-3">
                        <p className="text-xs text-secondary mb-3">
                            If this app doesn’t allow embedding,{' '}
                            <a href={launchUrl} target="_blank" rel="noopener noreferrer">
                                open it in a browser tab ↗
                            </a>
                            .
                        </p>
                        <iframe
                            src={launchUrl}
                            title={app.name}
                            className="w-full h-[65vh] border border-primary rounded"
                            sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-downloads"
                            referrerPolicy="no-referrer"
                        />
                    </div>
                ) : (
                    <article
                        className={`p-5 @xl:p-8 ${
                            reader
                                ? 'max-w-5xl mx-auto'
                                : gallery
                                ? 'm-4 @xl:m-6 rounded-xl border border-primary bg-primary/80 shadow-lg'
                                : ''
                        }`}
                    >
                        <DocsBrowser app={app} reader={reader} />
                    </article>
                )}
            </div>
        </Explorer>
    )
}
