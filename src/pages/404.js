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
            {/* Explorer pads its content only in a wide window, so the page keeps its own inset on a phone. */}
            <Explorer
                template="generic"
                slug="404"
                title="This app isn't here"
                showAddressBar={false}
                showTitle={false}
                padding={false}
            >
                <div className="p-4">
                    <h1>This app isn't here</h1>
                    <p>This address isn't part of the current quirq app collection.</p>
                    <OSButton asLink to="/" variant="primary">
                        Back to home base
                    </OSButton>
                </div>
            </Explorer>
        </>
    )
}
