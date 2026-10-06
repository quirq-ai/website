require('dotenv').config({ path: `.env.${process.env.NODE_ENV}.local` })
require('dotenv').config({ path: `.env.${process.env.NODE_ENV}` })
const path = require('path')

const { name } = require('./quirq.apps.json')
const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL
const siteUrl = (
    process.env.GATSBY_SITE_URL ||
    (vercelHost && `https://${vercelHost}`) ||
    'http://localhost:8001'
).replace(/\/$/, '')

// The OS interface is retained; its content now comes from the checked-in GitHub
// catalog. No PostHog CMS, billing, community, jobs, or monorepo sync runs here.
module.exports = {
    flags: { DEV_SSR: false },
    siteMetadata: {
        title: name,
        titleTemplate: '%s',
        description: 'A home base for quirq apps, experiments, and open source projects.',
        url: siteUrl,
        siteUrl,
        image: '/brand/quirq/og.jpg',
        twitterUsername: '',
    },
    trailingSlash: 'never',
    plugins: [
        'gatsby-plugin-react-helmet',
        'gatsby-plugin-postcss',
        'gatsby-plugin-image',
        {
            resolve: 'gatsby-plugin-page-creator',
            options: {
                path: path.join(__dirname, 'src/pages'),
                // Filter before Gatsby evaluates collection-route GraphQL queries.
                // A negated whole-path glob permits only these three root files.
                ignore: '!{index.tsx,display-options.tsx,projects.tsx,404.js}',
            },
        },
    ],
}
