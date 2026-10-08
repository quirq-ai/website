import React from 'react'
import SEO from 'components/seo'
import HeaderBar from 'components/OSChrome/HeaderBar'
import OSButton from 'components/OSButton'
import { MissingApp, touchTarget, useRoutedApp } from 'components/QuirqApp/RoutedApp'
import { quirqConfig } from 'lib/quirqApps'
import { isFramableUrl } from '../../scripts/lib/quirq-catalog.mjs'
import { useWindow } from '../context/Window'

// Lower case, without a trailing dot (www.quirq.dev. is the same site) or a leading www.
const siteHost = (host: string) =>
    host
        .toLowerCase()
        .replace(/\.+$/, '')
        .replace(/^www\./, '')

/** Whether a URL is this site: the page's own host or the canonical one, with or without www. */
function isThisSite(url: string) {
    try {
        const host = siteHost(new URL(url).hostname)
        const canonical = process.env.GATSBY_SITE_URL ? siteHost(new URL(process.env.GATSBY_SITE_URL).hostname) : null
        return host === siteHost(window.location.hostname) || host === canonical
    } catch {
        return true
    }
}

/**
 * /launch/<repository>: the app's website in its own window on this site, in an iframe, instead of a
 * new browser tab. Only a launch URL from the catalog is ever framed, never one taken from the address,
 * and only on an origin listed in `frameOrigins` in quirq.apps.json (vercel.json's CSP frame-src lists
 * the same origins, so the browser refuses any other).
 * A site can refuse to be framed (X-Frame-Options or CSP frame-ancestors); the browser then shows its
 * own error in the frame, and "Open in new tab" stays one click away.
 *
 * Explorer's chrome is used without Explorer itself: in a narrow window Explorer scrolls its content,
 * which leaves an iframe no height to fill.
 */
export default function QuirqLaunchPage({ location }: { location: { pathname: string } }) {
    const { appWindow } = useWindow()
    const { name, app, status, looking } = useRoutedApp(location.pathname, '/launch')
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
            <div data-scheme="secondary" className="@container flex flex-col size-full min-h-0">
                <HeaderBar
                    showBack
                    showForward
                    className={`border-b border-primary ${!appWindow?.appSettings?.toolbar ? 'pr-16' : ''}`}
                    rightActionButtons={
                        <>
                            {/* The only way out of a site that refuses the frame: full touch targets on phones. */}
                            <OSButton
                                asLink
                                to={app.path}
                                state={{ newWindow: true }}
                                size="sm"
                                className={touchTarget}
                            >
                                About
                            </OSButton>
                            <OSButton asLink external to={app.launchUrl} size="sm" className={touchTarget}>
                                Open in new tab
                            </OSButton>
                        </>
                    }
                />
                <div className="relative flex-1 min-h-0 bg-white">
                    <iframe
                        key={app.launchUrl}
                        src={app.launchUrl}
                        title={app.name}
                        data-testid="launched-app"
                        className="absolute inset-0 size-full border-0"
                        sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-downloads allow-modals"
                        allow="clipboard-write; fullscreen"
                        referrerPolicy="no-referrer"
                    />
                </div>
            </div>
        </>
    )
}
