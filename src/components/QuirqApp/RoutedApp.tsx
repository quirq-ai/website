import React, { useEffect, useState } from 'react'
import SEO from 'components/seo'
import Explorer from 'components/Explorer'
import OSButton from 'components/OSButton'
import { quirqConfig, type QuirqApp } from 'lib/quirqApps'
import { useQuirqCatalog, type QuirqCatalog } from 'lib/quirqLiveApps'
import { useApp } from '../../context/App'
import { useWindow } from '../../context/Window'

const orgUrl = `https://github.com/${quirqConfig.organization}`

/** The repository name after `root` in a path such as /apps/<name> or /launch/<name>, or null. */
export function repositoryFromPath(pathname: string, root: string): string | null {
    if (!pathname.startsWith(`${root}/`)) return null
    const name = decodeURIComponent(pathname.slice(root.length + 1).split('/')[0] || '')
    return /^[a-z\d_.-]+$/i.test(name) && name !== '.' && name !== '..' ? name : null
}

/**
 * For the client-only routes /apps/* and /launch/*: the repository the URL names, found in the live
 * catalog, and the window titled after it. The built HTML is the same for every name, so the first
 * render (and hydration) has no name and reports `looking`.
 */
export function useRoutedApp(pathname: string, root: string) {
    const { apps, status } = useQuirqCatalog()
    const { appWindow } = useWindow()
    const { setWindowTitle } = useApp()
    const [mounted, setMounted] = useState(false)
    useEffect(() => setMounted(true), [])
    const name = mounted ? repositoryFromPath(pathname, root) : null
    const app = name ? apps.find((entry) => entry.repo.toLowerCase() === name.toLowerCase()) : undefined

    useEffect(() => {
        if (app && appWindow && appWindow.meta?.title !== app.name) setWindowTitle(appWindow, app.name)
    }, [app, appWindow, setWindowTitle])

    return { name, app, status, looking: !mounted || (!!name && !app && status === 'bundled') }
}

/** At least 44px tall on phones, compact from a medium-width window up (needs an @container ancestor). */
export const touchTarget = 'min-h-11 @md:min-h-0'

/**
 * What a client-only route shows while it looks for its repository, when there is nothing to show, or
 * (`opensInNewTab`) when the app's website opens in a new tab rather than in a window.
 */
export function MissingApp({
    name,
    app,
    status,
    looking,
    opensInNewTab = false,
}: {
    name: string | null
    app?: QuirqApp
    status: QuirqCatalog['status']
    looking: boolean
    opensInNewTab?: boolean
}) {
    const title = app?.name || name || 'Apps'
    const repoUrl = app?.repoUrl || (name ? `${orgUrl}/${encodeURIComponent(name)}` : orgUrl)
    const launchUrl = opensInNewTab ? app?.launchUrl : null
    const [heading, message] =
        app && launchUrl
            ? [`${app.name} opens in a new tab`, `${app.name} runs on its own site rather than in a window here.`]
            : app
            ? ['Nothing to open', `${app.name} has no website to open here. Read about it, or see its code on GitHub.`]
            : status === 'offline'
            ? [
                  'GitHub can’t be reached',
                  `The ${quirqConfig.organization} repository list couldn’t be read, so ${
                      name || 'this app'
                  } can’t be shown right now.`,
              ]
            : [
                  'No app here',
                  name
                      ? `${quirqConfig.organization} has no public repository named ${name}.`
                      : 'Open an app from the desktop or Home base.',
              ]
    return (
        <>
            <SEO title={title} />
            <Explorer
                template="generic"
                slug="apps"
                title={title}
                showTitle={false}
                transparent
                padding={false}
                showAddressBar={false}
                headerBarOptions={['showBack', 'showForward']}
                rightActionButtons={
                    <OSButton asLink to="/" size="sm">
                        Home base
                    </OSButton>
                }
            >
                <div className="not-prose p-6 @xl:p-10 text-primary" data-testid="live-app-status">
                    {looking ? (
                        <p className="text-secondary">
                            Looking for {name || 'this app'} in {quirqConfig.organization}…
                        </p>
                    ) : (
                        <>
                            <h1 className="text-2xl font-bold tracking-tight mb-3">{heading}</h1>
                            <p className="text-secondary mb-5 max-w-xl">{message}</p>
                            <div className="flex flex-wrap gap-2">
                                {app && launchUrl ? (
                                    <>
                                        <OSButton
                                            asLink
                                            external
                                            to={launchUrl}
                                            size="sm"
                                            variant="primary"
                                            className={touchTarget}
                                        >
                                            Open {app.name}
                                        </OSButton>
                                        <OSButton
                                            asLink
                                            to={app.path}
                                            state={{ newWindow: true }}
                                            size="sm"
                                            className={touchTarget}
                                        >
                                            About {app.name}
                                        </OSButton>
                                    </>
                                ) : (
                                    <>
                                        {app ? (
                                            <OSButton
                                                asLink
                                                to={app.path}
                                                state={{ newWindow: true }}
                                                size="sm"
                                                variant="primary"
                                                className={touchTarget}
                                            >
                                                About {app.name}
                                            </OSButton>
                                        ) : (
                                            <OSButton asLink to="/" size="sm" variant="primary" className={touchTarget}>
                                                Home base
                                            </OSButton>
                                        )}
                                        <OSButton asLink external to={repoUrl} size="sm" className={touchTarget}>
                                            {app || (status === 'offline' && name)
                                                ? `${app?.name || name} on GitHub`
                                                : `${quirqConfig.organization} on GitHub`}
                                        </OSButton>
                                    </>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </Explorer>
        </>
    )
}
