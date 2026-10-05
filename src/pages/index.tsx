import React from 'react'
import SEO from 'components/seo'
import HomeBase from 'components/HomeBase'

export default function Home() {
    return (
        <>
            <SEO title="Home base" description="A home for the apps in the Quirq GitHub organization." />
            <HomeBase />
        </>
    )
}
