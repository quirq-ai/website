import React from 'react'
import SEO from 'components/seo'
import HeaderBar from 'components/OSChrome/HeaderBar'
import OSButton from 'components/OSButton'
import { MissingApp, useRoutedApp } from 'components/QuirqApp/RoutedApp'
import { useWindow } from '../context/Window'

/**
 * /launch/<repository>: the app's website in its own window on this site, in an iframe, instead of a
 * new browser tab. Only a launch URL from the catalog is ever framed, never one taken from the address.
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
    return (
        <>
            <SEO title={app.name} description={app.description || `${app.name}, from the quirq app collection.`} />
            <div data-scheme="secondary" className="flex flex-col size-full min-h-0">
                <HeaderBar
                    showBack
                    showForward
                    className={`border-b border-primary ${!appWindow?.appSettings?.toolbar ? 'pr-16' : ''}`}
                    rightActionButtons={
                        <>
                            <OSButton asLink to={app.path} state={{ newWindow: true }} size="sm">
                                About
                            </OSButton>
                            <OSButton asLink external to={app.launchUrl} size="sm">
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
                        allow="clipboard-read; clipboard-write; fullscreen"
                        referrerPolicy="no-referrer"
                    />
                </div>
            </div>
        </>
    )
}
