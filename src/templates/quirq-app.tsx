import React from 'react'
import SEO from 'components/seo'
import RepositoryApp from 'components/QuirqApp'
import type { QuirqApp } from 'lib/quirqApps'
import { useQuirqApps } from 'lib/quirqLiveApps'

export default function QuirqAppPage({ pageContext }: { pageContext: { app: QuirqApp } }) {
    // The build's copy, replaced by GitHub's current description, stars and homepage once they load.
    // A repository deleted since the build keeps its page as built. The README comes from this page's
    // context: the browser's catalog carries none, so every page doesn't download every README.
    const live = useQuirqApps().find((entry) => entry.id === pageContext.app.id)
    const app = live ? { ...live, readmeMarkdown: pageContext.app.readmeMarkdown } : pageContext.app
    return (
        <>
            <SEO title={app.name} description={app.description || `${app.name}, from the quirq app collection.`} />
            <RepositoryApp app={app} />
        </>
    )
}
