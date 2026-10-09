import React from 'react'
import '@fontsource-variable/ibm-plex-sans'
import '@fontsource-variable/ibm-plex-sans/wght-italic.css'
import './src/styles/global.css'
import { Provider as ToastProvider } from './src/context/Toast'
import { navigate, RouteUpdateArgs } from 'gatsby'
import Wrapper from './src/components/Wrapper'
import { Provider } from './src/context/App'
import { openExternalLinksInWindows } from './src/lib/externalLinks'
import { siteHosts } from './src/lib/quirqReadmeLinks'

// Every link that leaves the site opens in a window here, the page in an iframe, or "Oops" with Open in
// new tab when it can't be shown (AGENTS.md): one listener for every link, HTML inside content included.
export const onClientEntry = () => {
    openExternalLinksInWindows(document, (path, state) => navigate(path, { state }), siteHosts())
}

export const wrapRootElement = ({ element }) => <ToastProvider>{element}</ToastProvider>

export const onRouteUpdate = ({ location, prevLocation }: RouteUpdateArgs) => {
    // This is checked and set on initial load in the body script set in gatsby-ssr.js
    // Checking for prevLocation prevents this from happening twice
    if (typeof window !== 'undefined' && prevLocation) {
        var theme = (window as any).__theme

        document.body.className = theme
    }
}

export const wrapPageElement = ({ element, props: { location } }) => {
    return (
        <Provider element={element} location={location}>
            <Wrapper />
        </Provider>
    )
}

export const shouldUpdateScroll = ({ routerProps: { location } }) => {
    if (location.state?.preventScroll) {
        return false
    }
    return true
}
