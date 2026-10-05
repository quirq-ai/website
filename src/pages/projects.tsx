import React from 'react'
import SEO from 'components/seo'
import QuirqProjects from 'components/QuirqProjects'

export default function ProjectsPage(): JSX.Element {
    return (
        <>
            <SEO
                title="Projects"
                description="Every project the quirq swarm is building, grouped by phase from thought to live users."
            />
            <QuirqProjects />
        </>
    )
}
