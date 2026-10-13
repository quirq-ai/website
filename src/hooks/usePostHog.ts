import type { PostHog } from '../types/posthog'
import { getPostHog } from '../lib/quirqAnalytics'

const usePostHog = (): PostHog | undefined => {
    // quirq's own PostHog project, when the build has a key (src/lib/quirqAnalytics.ts).
    return getPostHog()
}

export default usePostHog
