import React from 'react'
import SEO from 'components/seo'
import RepositoryApp from 'components/QuirqApp'
import { MissingApp, useRoutedApp } from 'components/QuirqApp/RoutedApp'

/**
 * /apps/* for repositories created after the last build, which have no page of their own yet. The
 * repository is found in the organization's live list and shown like any other app. Every built app
 * page takes precedence over this route.
 */
export default function QuirqLiveAppPage({ location }: { location: { pathname: string } }) {
    const { name, app, status, looking } = useRoutedApp(location.pathname, '/apps')
    if (!app) return <MissingApp name={name} status={status} looking={looking} />
    return (
        <>
            <SEO title={app.name} description={app.description || `${app.name}, from the quirq app collection.`} />
            <RepositoryApp app={app} />
        </>
    )
}
