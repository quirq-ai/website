import { useEffect, useState } from 'react'
import { quirqConfig } from 'lib/quirqApps'

// The organization's GitHub profile README, read live in the visitor's browser from the public
// .github repository on raw.githubusercontent.com, like the /v0 live state. No credentials or
// backend. HEAD is the default branch; raw.githubusercontent.com allows cross-origin reads and
// caches each file for up to 5 minutes.
const PROFILE_ROOT = `${quirqConfig.organization}/.github/HEAD/profile/`
export const PROFILE_README_URL = `https://raw.githubusercontent.com/${PROFILE_ROOT}README.md`
/** Where relative images in the README resolve. */
export const PROFILE_RAW_BASE = `https://raw.githubusercontent.com/${PROFILE_ROOT}`
/** Where relative links in the README resolve, and where the file can be read or edited. */
export const PROFILE_BLOB_BASE = `https://github.com/${quirqConfig.organization}/.github/blob/HEAD/profile/`

// The last README this browser fetched, so a return visit paints it at once while it refreshes.
const CACHE_KEY = 'quirq.profileReadme.v1'

export type ProfileReadme =
    | { status: 'loading'; markdown: null }
    | { status: 'ready'; markdown: string }
    | { status: 'error'; markdown: null }

/**
 * The profile README's markdown. Server rendering and the first client render report `loading`,
 * so hydration matches; the cached copy (if any) and then the live one arrive after mount.
 */
export function useProfileReadme(): ProfileReadme {
    const [readme, setReadme] = useState<ProfileReadme>({ status: 'loading', markdown: null })

    useEffect(() => {
        try {
            const cached = window.localStorage.getItem(CACHE_KEY)
            if (cached) setReadme({ status: 'ready', markdown: cached })
        } catch {
            // Storage can be unavailable (private windows, blocked site data); the fetch still runs.
        }

        const controller = new AbortController()
        fetch(PROFILE_README_URL, { signal: controller.signal })
            .then((response) => {
                if (!response.ok) throw new Error(`GitHub returned ${response.status}`)
                return response.text()
            })
            .then((markdown) => {
                setReadme({ status: 'ready', markdown })
                try {
                    window.localStorage.setItem(CACHE_KEY, markdown)
                } catch {
                    // Not cached this time; the next visit fetches again.
                }
            })
            .catch(() => {
                if (controller.signal.aborted) return
                // Keep showing a cached copy if there is one.
                setReadme((current) => (current.status === 'ready' ? current : { status: 'error', markdown: null }))
            })
        return () => controller.abort()
    }, [])

    return readme
}
