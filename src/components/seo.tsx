import React, { useEffect } from 'react'
import { Helmet } from 'react-helmet'
import { useLocation } from '@reach/router'
import { useStaticQuery, graphql } from 'gatsby'
import { useApp } from '../context/App'
import { useWindow } from '../context/Window'
import { quirqConfig } from 'lib/quirqApps'

interface SEOProps {
    title: string
    description?: string
    image?: string
    article?: boolean
    canonicalUrl?: string
    noindex?: boolean
    imageType?: 'absolute' | 'relative'
    updateWindowTitle?: boolean
    lang?: string
    languageAlternates?: LanguageAlternate[]
    /** schema.org JSON-LD object(s) emitted as <script type="application/ld+json"> */
    structuredData?: Record<string, any> | Record<string, any>[]
    documentRkey?: string
}

const SITE_URL = process.env.GATSBY_SITE_URL || 'http://localhost:8001'

export type LanguageAlternate = {
    hrefLang: string
    href: string
}

export const SEO = ({
    title,
    description,
    image,
    article,
    canonicalUrl,
    noindex,
    imageType = 'relative',
    updateWindowTitle = true,
    lang,
    languageAlternates,
    structuredData,
}: SEOProps): JSX.Element => {
    const { appWindow } = useWindow()
    const { setWindowTitle } = useApp()
    const { pathname } = useLocation()
    const { site } = useStaticQuery(query)

    const { defaultTitle, titleTemplate, defaultDescription, siteUrl, defaultImage, twitterUsername } =
        site.siteMetadata

    const structuredDataItems = structuredData
        ? Array.isArray(structuredData)
            ? structuredData
            : [structuredData]
        : []

    const seo = {
        title: title || defaultTitle,
        description: description || defaultDescription,
        image:
            imageType === 'absolute' || image?.startsWith('http')
                ? image
                : `${process.env.GATSBY_DEPLOY_PRIME_URL || siteUrl}${image || defaultImage}`,
        url: `${siteUrl}${pathname}`,
        // Callers may pass a site-relative path; canonical links have to be absolute.
        canonical: canonicalUrl?.startsWith('/') ? `${siteUrl}${canonicalUrl}` : canonicalUrl,
    }

    useEffect(() => {
        if (updateWindowTitle && seo.title && appWindow) {
            setWindowTitle(appWindow, seo.title)
        }
    }, [seo.title])

    return (
        <Helmet title={seo.title} titleTemplate={titleTemplate}>
            {lang && <html lang={lang} />}
            {noindex && <meta name="robots" content="noindex" />}
            {seo.description && <meta name="description" content={seo.description} />}
            {seo.image && <meta name="image" content={seo.image} />}
            {<link rel="canonical" href={seo.canonical || seo.url} />}
            <link rel="icon" type="image/svg+xml" href="/quirq-icon.svg" />
            {languageAlternates?.map(({ hrefLang, href }) => (
                <link
                    key={hrefLang}
                    rel="alternate"
                    hrefLang={hrefLang}
                    href={href.startsWith('http') ? href : `${siteUrl}${href.startsWith('/') ? href : `/${href}`}`}
                />
            ))}

            {seo.url && <meta property="og:url" content={seo.url} />}
            <meta property="og:type" content={article ? 'article' : 'website'} />
            {seo.title && <meta property="og:title" content={seo.title} />}
            {seo.description && <meta property="og:description" content={seo.description} />}
            {seo.image && <meta property="og:image" content={seo.image} />}

            <meta name="twitter:card" content="summary_large_image" />
            {twitterUsername && <meta name="twitter:creator" content={twitterUsername} />}
            {seo.title && <meta name="twitter:title" content={seo.title} />}
            {seo.description && <meta name="twitter:description" content={seo.description} />}
            {seo.image && <meta name="twitter:image" content={seo.image} />}
            {twitterUsername && <meta name="twitter:site" content={twitterUsername} />}

            {structuredDataItems.map((item, i) => (
                <script key={`ld-${i}`} type="application/ld+json">
                    {JSON.stringify(item)}
                </script>
            ))}
        </Helmet>
    )
}

export default SEO

/**
 * quirq as a schema.org Organization. Shared so the homepage and every product page
 * describe the same entity rather than drifting copies of it.
 */
const ORGANIZATION = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: quirqConfig.name,
    url: SITE_URL,
    logo: `${SITE_URL}/quirq-icon.svg`,
    sameAs: [`https://github.com/${quirqConfig.organization}`],
}

/**
 * Build schema.org JSON-LD for a product/app page: a SoftwareApplication, the quirq
 * Organization, and (optionally) a FAQPage. Pass the result to <SEO structuredData={...} />.
 * FAQ entries without an `answer` are skipped, so FAQPage only renders once answers exist.
 */
export const buildProductStructuredData = ({
    name,
    description,
    slug,
    operatingSystem = 'Web',
    faq,
}: {
    name: string
    description?: string
    slug: string
    operatingSystem?: string
    faq?: { question?: string; answer?: string }[]
}): Record<string, any>[] => {
    const items: Record<string, any>[] = [
        {
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name,
            description,
            applicationCategory: 'BusinessApplication',
            operatingSystem,
            url: `${SITE_URL}/${(slug || '').replace(/^\//, '')}`,
            publisher: { '@type': 'Organization', name: quirqConfig.name, url: SITE_URL },
        },
        ORGANIZATION,
    ]
    const faqEntities = (faq || [])
        .filter((q) => q && q.question && q.answer)
        .map((q) => ({
            '@type': 'Question',
            name: q.question,
            acceptedAnswer: { '@type': 'Answer', text: q.answer },
        }))
    if (faqEntities.length) {
        items.push({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqEntities })
    }
    return items
}

const query = graphql`
    query SEO {
        site {
            siteMetadata {
                defaultTitle: title
                titleTemplate
                defaultDescription: description
                siteUrl: url
                defaultImage: image
                twitterUsername
            }
        }
    }
`
