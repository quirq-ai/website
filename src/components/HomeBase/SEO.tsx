import React from 'react'
import SEO from 'components/seo'

/** The home page's title and meta tags, kept on `/` whether or not the Home window is open. */
export default function HomeBaseSEO(): JSX.Element {
    return <SEO title="Home base" description="A home for the apps in the quirq GitHub organization." />
}
