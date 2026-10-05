import type { PostHog } from '../types/posthog'

const usePostHog = (): PostHog | undefined => {
    // The Quirq desktop does not initialize or reuse PostHog's analytics account.
    return undefined
}

export default usePostHog
