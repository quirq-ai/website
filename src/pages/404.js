import React from 'react'
import SEO from 'components/seo'
import Explorer from 'components/Explorer'
import OSButton from 'components/OSButton'

export default function NotFound() {
    return (
        <>
            {/* The 404 rendered no <SEO>, so it was the one page with no canonical, no
                og tags and no llms.txt signpost — and nothing telling a search engine
                not to index it. */}
            <SEO title="404: Page not found" noindex />
            <Explorer title="This app isn't here">
                <p>This address isn't part of the current quirq app collection.</p>
                <OSButton asLink to="/" variant="primary">
                    Back to home base
                </OSButton>
            </Explorer>
        </>
    )
}
