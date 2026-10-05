import React from 'react'
import SEO from 'components/seo'
import RepositoryApp from 'components/QuirqApp'
import type { QuirqApp } from 'lib/quirqApps'

export default function QuirqAppPage({ pageContext }: { pageContext: { app: QuirqApp } }) {
    const { app } = pageContext
    return (
        <>
            <SEO title={app.name} description={app.description || `${app.name}, from the quirq app collection.`} />
            <RepositoryApp app={app} />
        </>
    )
}
