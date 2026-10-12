import type { PostHog } from '../types/posthog'

// PostHog analytics and error tracking, on only when the build has GATSBY_POSTHOG_KEY (a public
// project key). posthog-js can't be added with pnpm (the workspace trust policy), so the browser loads
// PostHog's own script instead. A deployed site reaches PostHog through the `/ingest` rewrites in
// vercel.json; `gatsby develop` has no rewrites and goes to PostHog directly.

const UI_HOST = 'https://us.posthog.com'
const API_HOST = process.env.NODE_ENV === 'production' ? '/ingest' : 'https://us.i.posthog.com'
const ASSET_HOST = process.env.NODE_ENV === 'production' ? '/ingest' : 'https://us-assets.i.posthog.com'

declare global {
    interface Window {
        posthog?: PostHog
    }
}

/** The PostHog client once its script has loaded; undefined before that, on the server, and without a key. */
export function getPostHog(): PostHog | undefined {
    const posthog = typeof window !== 'undefined' ? window.posthog : undefined
    return posthog?.__loaded ? posthog : undefined
}

export function startAnalytics(): void {
    const key = process.env.GATSBY_POSTHOG_KEY
    if (!key || typeof document === 'undefined' || window.posthog) return

    const script = document.createElement('script')
    script.async = true
    script.crossOrigin = 'anonymous'
    script.src = `${ASSET_HOST}/static/array.js`
    script.onload = () => {
        window.posthog?.init(key, {
            api_host: API_HOST,
            ui_host: UI_HOST,
            // Pageviews follow the history API, so each window a visitor opens counts.
            defaults: '2026-05-30',
            capture_exceptions: true,
        })
    }
    document.head.appendChild(script)
}
