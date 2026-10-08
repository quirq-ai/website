import React, { useEffect, useMemo, useState } from 'react'
import SEO from 'components/seo'
import Explorer from 'components/Explorer'
import HeaderBar from 'components/OSChrome/HeaderBar'
import OSButton from 'components/OSButton'
import { MissingApp, touchTarget, useRoutedApp } from 'components/QuirqApp/RoutedApp'
import { PROFILE_BLOB_BASE, useProfileReadme } from 'components/QuirqProfile/useProfileReadme'
import { quirqConfig } from 'lib/quirqApps'
import { README_LAUNCH_ROOT, readmeLinkAt, readmeLinks, siteHosts } from 'lib/quirqReadmeLinks'
import { isFramableUrl } from '../../scripts/lib/quirq-catalog.mjs'
import { useApp } from '../context/App'
import { useWindow } from '../context/Window'

/** Whether a URL is this site: the page's own host or the canonical one, with or without www or a trailing dot. */
function isThisSite(url: string) {
    try {
        return siteHosts().includes(
            new URL(url).hostname
                .toLowerCase()
                .replace(/\.+$/, '')
                .replace(/^www\./, '')
        )
    } catch {
        return true
    }
}

/**
 * /launch/<repository>: the app's website in its own window on this site, in an iframe, instead of a
 * new browser tab. /launch/readme/<address>: a page the organization's profile README links to, in a
 * window the same way. Only a launch URL from the catalog, or a link the README has, is ever framed,
 * never one taken from the address, and only on an origin listed in `frameOrigins` in quirq.apps.json
 * (vercel.json's CSP frame-src lists the same origins, so the browser refuses any other). A site can refuse to be framed (X-Frame-Options or CSP
 * frame-ancestors); the browser then shows its own error in the frame, and "Open in new tab" stays one
 * click away.
 */
export default function QuirqLaunchPage({ location }: { location: { pathname: string } }) {
    return location.pathname.startsWith(`${README_LAUNCH_ROOT}/`) ? (
        <ReadmeLaunch pathname={location.pathname} />
    ) : (
        <AppLaunch pathname={location.pathname} />
    )
}

function AppLaunch({ pathname }: { pathname: string }) {
    const { name, app, status, looking } = useRoutedApp(pathname, '/launch')
    if (!app?.launchUrl) return <MissingApp name={name} app={app} status={status} looking={looking} />
    // An app that opens externally does so even from a typed or shared /launch link: one set to `external`,
    // or one whose website is not on an allowed origin. This site never frames itself (a second desktop,
    // and a same-origin frame can lift its own sandbox). The app only resolves after mount, so these
    // checks run in the browser and hydration still matches.
    if (
        app.launchMode !== 'window' ||
        !isFramableUrl(app.launchUrl, quirqConfig.frameOrigins) ||
        isThisSite(app.launchUrl)
    ) {
        return <MissingApp name={name} app={app} status={status} looking={false} opensInNewTab />
    }
    return (
        <>
            <SEO title={app.name} description={app.description || `${app.name}, from the quirq app collection.`} />
            <LaunchFrame title={app.name} url={app.launchUrl} about={app.path} />
        </>
    )
}

/**
 * The README link a /launch/readme/<address> path names, framed. The README is read in the browser (a
 * cached copy first), so the first render, like hydration, is still looking.
 */
function ReadmeLaunch({ pathname }: { pathname: string }) {
    const readme = useProfileReadme()
    const { appWindow } = useWindow()
    const { setWindowTitle } = useApp()
    const [mounted, setMounted] = useState(false)
    useEffect(() => setMounted(true), [])
    const link = useMemo(
        () =>
            mounted && readme.status === 'ready'
                ? readmeLinkAt(
                      pathname,
                      readmeLinks(readme.markdown, PROFILE_BLOB_BASE),
                      siteHosts(),
                      quirqConfig.frameOrigins
                  )
                : undefined,
        [mounted, pathname, readme]
    )

    useEffect(() => {
        if (link && appWindow && appWindow.meta?.title !== link.label) setWindowTitle(appWindow, link.label)
    }, [link, appWindow, setWindowTitle])

    if (!link)
        return (
            <MissingReadmeLink looking={!mounted || readme.status === 'loading'} offline={readme.status === 'error'} />
        )
    return (
        <>
            <SEO title={link.label} />
            <LaunchFrame title={link.label} url={link.href} />
        </>
    )
}

/**
 * A website in this window, in an iframe, under the window's bar: "Open in new tab", and "About" for an
 * app. Explorer's chrome is used without Explorer itself: in a narrow window Explorer scrolls its
 * content, which leaves an iframe no height to fill.
 */
function LaunchFrame({ title, url, about }: { title: string; url: string; about?: string }) {
    const { appWindow } = useWindow()
    return (
        <div data-scheme="secondary" className="@container flex flex-col size-full min-h-0">
            <HeaderBar
                showBack
                showForward
                className={`border-b border-primary ${!appWindow?.appSettings?.toolbar ? 'pr-16' : ''}`}
                rightActionButtons={
                    <>
                        {/* The only way out of a site that refuses the frame: full touch targets on phones. */}
                        {about && (
                            <OSButton asLink to={about} state={{ newWindow: true }} size="sm" className={touchTarget}>
                                About
                            </OSButton>
                        )}
                        <OSButton asLink external to={url} size="sm" className={touchTarget}>
                            Open in new tab
                        </OSButton>
                    </>
                }
            />
            <div className="relative flex-1 min-h-0 bg-white">
                <iframe
                    key={url}
                    src={url}
                    title={title}
                    data-testid="launched-app"
                    className="absolute inset-0 size-full border-0"
                    sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-downloads allow-modals"
                    allow="clipboard-write; fullscreen"
                    referrerPolicy="no-referrer"
                />
            </div>
        </div>
    )
}

/** What a /launch/readme/ window shows while it reads the README, or when the README has no such link. */
function MissingReadmeLink({ looking, offline }: { looking: boolean; offline: boolean }) {
    const org = quirqConfig.organization
    const [heading, message] = offline
        ? [
              'GitHub can’t be reached',
              `The ${org} profile README couldn’t be read, so this link can’t be opened here right now.`,
          ]
        : [
              'Not a link in the README',
              `This window opens pages the ${org} profile README links to, and the README has no link like this one.`,
          ]
    return (
        <>
            <SEO title="README link" />
            <Explorer
                template="generic"
                slug="apps"
                title="README link"
                showTitle={false}
                transparent
                padding={false}
                showAddressBar={false}
                headerBarOptions={['showBack', 'showForward']}
                rightActionButtons={
                    <OSButton asLink to="/" size="sm" className={touchTarget}>
                        Home base
                    </OSButton>
                }
            >
                <div className="not-prose p-6 @xl:p-10 text-primary" data-testid="readme-link-status">
                    {looking ? (
                        <p className="text-secondary">Looking for this link in the {org} README…</p>
                    ) : (
                        <>
                            <h1 className="text-2xl font-bold tracking-tight mb-3">{heading}</h1>
                            <p className="text-secondary mb-5 max-w-xl">{message}</p>
                            <div className="flex flex-wrap gap-2">
                                <OSButton asLink to="/" size="sm" variant="primary" className={touchTarget}>
                                    Home base
                                </OSButton>
                                <OSButton
                                    asLink
                                    external
                                    to={`${PROFILE_BLOB_BASE}README.md`}
                                    size="sm"
                                    className={touchTarget}
                                >
                                    The README on GitHub
                                </OSButton>
                            </div>
                        </>
                    )}
                </div>
            </Explorer>
        </>
    )
}
