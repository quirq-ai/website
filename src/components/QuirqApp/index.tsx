import React, { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import Explorer from 'components/Explorer'
import OSButton from 'components/OSButton'
import QuirqAppIcon from 'components/QuirqAppIcon'
import Link from 'components/Link'
import { getLaunchTarget, type QuirqApp } from 'lib/quirqApps'

const accents: Record<string, string> = {
    blue: 'bg-blue/10 border-blue/30',
    purple: 'bg-purple/10 border-purple/30',
    orange: 'bg-orange/10 border-orange/30',
    green: 'bg-green/10 border-green/30',
    red: 'bg-red/10 border-red/30',
    yellow: 'bg-yellow/20 border-yellow/40',
}

function repositoryLink(value: string | undefined, app: QuirqApp, image = false): string | undefined {
    if (!value) return undefined
    if (value.startsWith('#') && !image) return value
    if (/^mailto:/i.test(value) && !image) return value
    if (/^[a-z][a-z\d+.-]*:/i.test(value) || value.startsWith('//')) {
        try {
            const url = new URL(value, 'https://github.com')
            return ['http:', 'https:'].includes(url.protocol) ? url.href : undefined
        } catch {
            return undefined
        }
    }
    const directory = (app.readmePath || 'README.md').split('/').slice(0, -1).join('/')
    const branch = encodeURIComponent(app.defaultBranch)
    const root = image ? `https://raw.githubusercontent.com/${app.id}/${branch}/` : `${app.repoUrl}/blob/${branch}/`
    try {
        return new URL(
            value.replace(/^\//, ''),
            value.startsWith('/') ? root : `${root}${directory ? `${directory}/` : ''}`
        ).href
    } catch {
        return undefined
    }
}

type ReadmeFile = Pick<QuirqApp, 'readmeMarkdown' | 'readmePath'>

// The README as GitHub has it now, read in the visitor's browser. A known README path is read from
// raw.githubusercontent.com (cached up to 5 minutes, outside the API's rate limit). A repository new
// since the build, or one whose README moved, asks the API where its README is: one anonymous request.
async function fetchReadme(app: QuirqApp, signal: AbortSignal): Promise<ReadmeFile | null> {
    if (app.readmePath) {
        const path = app.readmePath.split('/').map(encodeURIComponent).join('/')
        const response = await fetch(`https://raw.githubusercontent.com/${app.id}/HEAD/${path}`, { signal })
        if (response.ok) return { readmeMarkdown: await response.text(), readmePath: app.readmePath }
        if (response.status !== 404) return null
    }
    const response = await fetch(`https://api.github.com/repos/${app.id}/readme`, { signal })
    if (response.status === 404) return { readmeMarkdown: null, readmePath: null }
    if (!response.ok) return null
    const readme = await response.json()
    if (
        readme.encoding !== 'base64' ||
        typeof readme.content !== 'string' ||
        typeof readme.path !== 'string' ||
        readme.path.startsWith('/') ||
        readme.path.split('/').includes('..') ||
        readme.size > 500000
    )
        return null
    const bytes = Uint8Array.from(window.atob(readme.content.replace(/\s/g, '')), (char) => char.charCodeAt(0))
    return { readmeMarkdown: new TextDecoder().decode(bytes), readmePath: readme.path }
}

/** The bundled README first (so server and browser render alike), then GitHub's current one. */
function useLiveReadme(app: QuirqApp): ReadmeFile {
    const bundled = { readmeMarkdown: app.readmeMarkdown, readmePath: app.readmePath }
    const [readme, setReadme] = useState<ReadmeFile>(bundled)
    useEffect(() => {
        setReadme(bundled)
        const controller = new AbortController()
        fetchReadme(app, controller.signal)
            .then((current) => current && setReadme(current))
            .catch(() => {
                // Keep the bundled README when GitHub can't be reached.
            })
        return () => controller.abort()
        // Re-read only when the repository itself changes, not on every catalog refresh.
    }, [app.id])
    return readme
}

function Readme({ app }: { app: QuirqApp }) {
    if (!app.readmeMarkdown)
        return (
            <p className="text-secondary">
                Explore this project’s source and documentation{' '}
                <a href={app.repoUrl} target="_blank" rel="noopener noreferrer">
                    on GitHub ↗
                </a>
                .
            </p>
        )
    return (
        <div
            className="prose prose-sm dark:prose-invert max-w-none break-words [&_pre]:overflow-x-auto [&_img]:max-w-full [&_table]:block [&_table]:overflow-x-auto"
            data-testid="repository-readme"
        >
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                skipHtml
                components={{
                    a: ({ href, children }) => (
                        <a
                            href={repositoryLink(href, app)}
                            target={href?.startsWith('#') ? undefined : '_blank'}
                            rel="noopener noreferrer"
                        >
                            {children}
                        </a>
                    ),
                    img: ({ src, alt }) => <img src={repositoryLink(src, app, true)} alt={alt || ''} loading="lazy" />,
                    h1: ({ children }) => <h2>{children}</h2>,
                }}
            >
                {app.readmeMarkdown}
            </ReactMarkdown>
        </div>
    )
}

export default function RepositoryApp({ app }: { app: QuirqApp }) {
    const readme = useLiveReadme(app)
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
                    <OSButton asLink to="/" size="sm">
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
                        >
                            Open app
                        </OSButton>
                    ) : (
                        <OSButton asLink external to={app.repoUrl} variant="primary" size="sm">
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
                                ? 'max-w-3xl mx-auto'
                                : gallery
                                ? 'm-4 @xl:m-6 rounded-xl border border-primary bg-primary/80 shadow-lg'
                                : ''
                        }`}
                    >
                        <Readme app={{ ...app, ...readme }} />
                    </article>
                )}
            </div>
        </Explorer>
    )
}
