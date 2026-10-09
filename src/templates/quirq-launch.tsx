import React, { useEffect, useMemo, useState } from 'react'
import SEO from 'components/seo'
import Explorer from 'components/Explorer'
import HeaderBar from 'components/OSChrome/HeaderBar'
import OSButton from 'components/OSButton'
import { QuirqAppTile } from 'components/QuirqAppIcon'
import { MissingApp, touchTarget, useRoutedApp } from 'components/QuirqApp/RoutedApp'
import { PROFILE_BLOB_BASE, useProfileReadme } from 'components/QuirqProfile/useProfileReadme'
import { quirqConfig, type QuirqApp } from 'lib/quirqApps'
import { README_LAUNCH_ROOT, readmeLinkAt, readmeLinkNamed, readmeLinks, siteHosts } from 'lib/quirqReadmeLinks'
import type { ReadmeLink } from 'lib/quirqReadmeLinks'
import { webWindowPath, webWindowTitle, webWindowUrl } from 'lib/externalLinks'
import { isFrameCheck, knownFrameCheck, plainHost, type FrameCheck } from 'lib/frameCheck'
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

type LaunchLocation = { pathname: string; search?: string; hash?: string; state?: { webFrame?: unknown } | null }

/**
 * A web page in a window on this site, in an iframe, instead of a new browser tab:
 * - /launch/<repository>: an app's website (Open app, Launch, desktop icons).
 * - /launch/readme/<address>: a page the organization's profile README links to.
 * - /launch/web/<address>: any other page a link on this site points to (lib/externalLinks).
 * Before framing a page, the window asks /api/frame-check whether the page allows it (lib/frameCheck).
 * A page that refuses, can't be reached or isn't there, or that never finishes loading, shows "Oops"
 * with an Open in new tab button. Only an app's launch URL, a link the README has, or a page a click on
 * this site opened is ever framed, never an address someone else put in the URL.
 */
export default function QuirqLaunchPage({ location }: { location: LaunchLocation }) {
    // The built page is /launch/ for every address, so the first render (and hydration) is the app
    // launch's "looking" state; a README or web window takes over after mount.
    const [mounted, setMounted] = useState(false)
    useEffect(() => setMounted(true), [])
    const webUrl = mounted ? webWindowUrl(location.pathname, location.search, location.hash) : null
    if (webUrl) return <WebLaunch location={location} url={webUrl} />
    return mounted && location.pathname.startsWith(`${README_LAUNCH_ROOT}/`) ? (
        <ReadmeLaunch pathname={location.pathname} />
    ) : (
        <AppLaunch pathname={location.pathname} />
    )
}

function AppLaunch({ pathname }: { pathname: string }) {
    const { name, app, status, looking } = useRoutedApp(pathname, '/launch')
    if (!app?.launchUrl) return <MissingApp name={name} app={app} status={status} looking={looking} />
    return (
        <>
            <SEO title={app.name} description={app.description || `${app.name}, from the quirq app collection.`} />
            {/* `window`: the catalog knows its origin allows frames (frameOrigins), so there's no need to ask. */}
            <WebFrame
                key={app.launchUrl}
                title={app.name}
                url={app.launchUrl}
                app={app}
                trusted={app.launchMode === 'window'}
            />
        </>
    )
}

/**
 * The README link a /launch/readme/<address> path names, framed. The README is read in the browser (a
 * cached copy first), so the first render, like hydration, is still looking.
 */
function ReadmeLaunch({ pathname }: { pathname: string }) {
    const readme = useProfileReadme()
    const [mounted, setMounted] = useState(false)
    useEffect(() => setMounted(true), [])
    // `link` opens in a window; `named` is the README's link at this address even when it doesn't (a link
    // to this site), which then opens in a new tab rather than reading as missing.
    const { link, named } = useMemo(() => {
        if (!mounted || readme.status !== 'ready') return { link: undefined, named: undefined }
        const links = readmeLinks(readme.markdown, PROFILE_BLOB_BASE)
        return { link: readmeLinkAt(pathname, links, siteHosts()), named: readmeLinkNamed(pathname, links) }
    }, [mounted, pathname, readme])

    if (!link)
        return (
            <MissingReadmeLink
                looking={!mounted || readme.status === 'loading'}
                offline={readme.status === 'error'}
                newTab={named}
            />
        )
    return (
        <>
            <SEO title={link.label} />
            <WebFrame
                key={link.href}
                title={link.label}
                url={link.href}
                trusted={isFramableUrl(link.href, quirqConfig.frameOrigins)}
            />
        </>
    )
}

/**
 * A page a link on this site opened (/launch/web/<address>). Only a click on this site frames it: the
 * page arrives in the navigation's state, which a link on another site can't set, and stays there when
 * the window reloads. An address typed or shared from elsewhere offers a new tab instead, so nobody can
 * make a page of their choosing appear inside this site.
 */
function WebLaunch({ location, url }: { location: LaunchLocation; url: string }) {
    const opened = location.state?.webFrame
    const fromThisSite =
        typeof opened === 'string' && webWindowPath(opened).replace(/[?#].*$/, '') === location.pathname
    const page = fromThisSite ? (opened as string) : url
    return (
        <>
            <SEO title={webWindowTitle(page)} />
            <WebFrame key={page} title={webWindowTitle(page)} url={page} unverified={!fromThisSite} />
        </>
    )
}

const LOAD_TIMEOUT_MS = 20000
const CHECK_TIMEOUT_MS = 10000

// One check per page while the site is open; Try again asks afresh.
const frameChecks = new Map<string, Promise<FrameCheck>>()

/** The server's verdict on framing a page; `unknown` when it can't be asked (static hosting, offline). */
function askFrameCheck(url: string, fresh: boolean): Promise<FrameCheck> {
    if (fresh) frameChecks.delete(url)
    let pending = frameChecks.get(url)
    if (!pending) {
        const query = new URLSearchParams({ url, origin: window.location.origin })
        // The server gives up after 8 s (src/api/frame-check.ts); a check still running at 10 s didn't load.
        const signal = typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(CHECK_TIMEOUT_MS) : undefined
        pending = fetch(`/api/frame-check?${query}`, { signal })
            .then((response) => (response.ok ? response.json() : null))
            .then((body): FrameCheck => (isFrameCheck(body) ? body : { verdict: 'unknown' }))
            .catch(
                (error): FrameCheck =>
                    error?.name === 'TimeoutError'
                        ? { verdict: 'unreachable', reason: `${plainHost(url)} took too long to answer.` }
                        : { verdict: 'unknown' }
            )
        frameChecks.set(url, pending)
    }
    return pending
}

/** Whether a page can be framed: what's known without asking (`known`), else the server's verdict. */
function useFrameCheck(url: string, known: FrameCheck | null, attempt: number): FrameCheck | null {
    const key = `${attempt} ${url}`
    const [result, setResult] = useState<{ key: string; check: FrameCheck } | null>(null)
    useEffect(() => {
        if (known) return
        let live = true
        askFrameCheck(url, attempt > 0).then((check) => live && setResult({ key, check }))
        return () => {
            live = false
        }
    }, [url, known, attempt, key])
    return known || (result?.key === key ? result.check : null)
}

const oopsHeadings: Partial<Record<FrameCheck['verdict'], string>> = {
    refused: 'Oops, it’s incompatible',
    insecure: 'Oops, it’s incompatible',
    unreachable: 'Oops, it didn’t load',
    missing: 'Oops, that page isn’t there',
}

/**
 * A web page in this window, in an iframe, under the window's bar ("About" for an app, and "Open in new
 * tab"), or "Oops" in its place when the page can't be shown here. Explorer's chrome is used without
 * Explorer itself: in a narrow window Explorer scrolls its content, which leaves an iframe no height.
 */
function WebFrame({
    title,
    url,
    app,
    trusted = false,
    unverified = false,
}: {
    title: string
    url: string
    app?: QuirqApp
    /** The page is known to allow frames, so the server isn't asked. */
    trusted?: boolean
    /** Not opened by a click on this site: offer a new tab instead of a frame. */
    unverified?: boolean
}) {
    const { appWindow } = useWindow()
    const { setWindowTitle } = useApp()
    useEffect(() => {
        if (appWindow && appWindow.meta?.title !== title) setWindowTitle(appWindow, title)
    }, [appWindow, title, setWindowTitle])

    const [attempt, setAttempt] = useState(0)
    const known = useMemo<FrameCheck | null>(
        () =>
            unverified
                ? { verdict: 'unknown' }
                : isThisSite(url)
                ? { verdict: 'refused', reason: 'It’s this site, which can’t open inside itself.' }
                : trusted
                ? { verdict: 'allowed' }
                : knownFrameCheck(url),
        [url, trusted, unverified]
    )
    const check = useFrameCheck(url, known, attempt)
    const framing = !unverified && (check?.verdict === 'allowed' || check?.verdict === 'unknown')
    const [loaded, setLoaded] = useState(false)
    const [timedOut, setTimedOut] = useState(false)
    // A page that never finishes loading (a hung server) gets "Oops" too. A refused frame does load, as
    // the browser's own error, which is why the server is asked first.
    useEffect(() => {
        if (!framing || loaded) return
        const timer = window.setTimeout(() => setTimedOut(true), LOAD_TIMEOUT_MS)
        return () => window.clearTimeout(timer)
    }, [framing, loaded, attempt])
    const retry = () => {
        setLoaded(false)
        setTimedOut(false)
        setAttempt((count) => count + 1)
    }
    const oops: FrameCheck | null = timedOut
        ? { verdict: 'unreachable', reason: `${plainHost(url)} took too long to load here.` }
        : check && !framing && !unverified
        ? check
        : null

    return (
        <div data-scheme="secondary" className="@container flex flex-col size-full min-h-0">
            <HeaderBar
                showBack
                showForward
                className={`border-b border-primary ${!appWindow?.appSettings?.toolbar ? 'pr-16' : ''}`}
                rightActionButtons={
                    <>
                        {/* The way out of a page that won't show: full touch targets on phones. */}
                        {app && (
                            <OSButton
                                asLink
                                to={app.path}
                                state={{ newWindow: true }}
                                size="sm"
                                className={touchTarget}
                            >
                                About
                            </OSButton>
                        )}
                        <OSButton asLink external to={url} size="sm" className={touchTarget} data-new-tab>
                            Open in new tab
                        </OSButton>
                    </>
                }
            />
            <div className="relative flex-1 min-h-0 bg-white">
                {unverified ? (
                    <FrameNotice
                        url={url}
                        app={app}
                        heading="Open this page in a new tab"
                        message="It was linked from outside this site, so it doesn’t open in a window here."
                    />
                ) : oops ? (
                    <FrameNotice
                        url={url}
                        app={app}
                        heading={oopsHeadings[oops.verdict] || 'Oops, it’s incompatible'}
                        message={oops.reason || `${plainHost(url)} can’t be shown in a window here.`}
                        onRetry={oops.verdict === 'unreachable' ? retry : undefined}
                    />
                ) : framing ? (
                    <iframe
                        key={`${attempt} ${url}`}
                        src={url}
                        title={title}
                        data-testid="launched-app"
                        className="absolute inset-0 size-full border-0"
                        sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-downloads allow-modals"
                        allow="clipboard-write; fullscreen"
                        referrerPolicy="no-referrer"
                        onLoad={() => setLoaded(true)}
                    />
                ) : (
                    <div className="absolute inset-0 grid place-items-center bg-primary text-secondary text-sm">
                        Opening {webWindowTitle(url)}…
                    </div>
                )}
            </div>
        </div>
    )
}

/** In place of a frame: why the page isn't shown, and a button that opens it in a new tab. */
function FrameNotice({
    url,
    app,
    heading,
    message,
    onRetry,
}: {
    url: string
    app?: QuirqApp
    heading: string
    message: string
    onRetry?: () => void
}) {
    return (
        <div
            className="absolute inset-0 overflow-auto bg-primary text-primary flex items-center justify-center p-6"
            data-testid="frame-notice"
        >
            <div className="max-w-md text-center">
                <QuirqAppTile
                    icon={app?.icon || 'browser'}
                    color={app?.color || 'lilac'}
                    className="mx-auto size-[58px] rounded-[17px]"
                />
                <h1 className="mt-5 text-2xl font-bold tracking-tight">{heading}</h1>
                <p className="mt-2 text-secondary">{message}</p>
                <p className="mt-1 text-sm text-secondary [overflow-wrap:anywhere]">{webWindowTitle(url)}</p>
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                    <OSButton asLink external to={url} variant="primary" size="md" className={touchTarget} data-new-tab>
                        Open in new tab
                    </OSButton>
                    {onRetry && (
                        <OSButton size="md" onClick={onRetry} className={touchTarget}>
                            Try again
                        </OSButton>
                    )}
                </div>
            </div>
        </div>
    )
}

/**
 * What a /launch/readme/ window shows while it reads the README, when the README has no such link, or
 * when it has the link but it doesn't open in a window (`newTab`: a link to this site, opened in a new tab).
 */
function MissingReadmeLink({ looking, offline, newTab }: { looking: boolean; offline: boolean; newTab?: ReadmeLink }) {
    const org = quirqConfig.organization
    const [heading, message] = newTab
        ? [
              `${newTab.label} opens in a new tab`,
              `The ${org} profile README links here, but this page can’t open in a window on this site.`,
          ]
        : offline
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
                                {newTab && (
                                    <OSButton
                                        asLink
                                        external
                                        to={newTab.href}
                                        size="sm"
                                        variant="primary"
                                        className={touchTarget}
                                        data-new-tab
                                    >
                                        Open in new tab
                                    </OSButton>
                                )}
                                <OSButton
                                    asLink
                                    to="/"
                                    size="sm"
                                    variant={newTab ? 'default' : 'primary'}
                                    className={touchTarget}
                                >
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
