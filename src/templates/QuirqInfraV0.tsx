import React from 'react'
import SEO from 'components/seo'
import QuirqInfraV0 from 'components/QuirqInfraV0'
import type { QuirqApp } from 'lib/quirqApps'

export default function QuirqInfraV0Page({ pageContext }: { pageContext: { app: QuirqApp } }) {
    const { app } = pageContext
    return (
        <>
            <SEO
                title={app.name}
                description="How quirq infra v0 takes a change from a pull request to the daily canary, with its live state."
            />
            <QuirqInfraV0 app={app} />
        </>
    )
}
