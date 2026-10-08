import React, { useCallback } from 'react'
import Explorer from 'components/Explorer'
import Link from 'components/Link'
import { AvatarEditor, QuirqAvatarTile } from 'components/QuirqAvatar'
import { QUIRQY_WINDOW } from 'lib/quirqAvatar'
import { useAppActions } from '../../context/App'

// Euler's frosted glass, with solid fallbacks for dark mode and reduced transparency (as in Home base).
const glass =
    'border border-white/80 dark:border-white/10 bg-white/40 dark:bg-black/40 backdrop-blur-xl reduce-transparency:bg-primary reduce-transparency:backdrop-blur-none'

/**
 * quirqy: the appearance of your quirq character, and nothing else, in a window of its own. The window
 * has no route; the dock (and Home base's Personalize) opens it with `useOpenQuirqy`.
 */
export default function QuirqyWindow(_props: { location: { pathname: string }; newWindow?: boolean }) {
    return (
        <Explorer
            template="generic"
            slug="quirqy"
            title="quirqy"
            showTitle={false}
            showAddressBar={false}
            transparent
            padding={false}
            headerBarOptions={[]}
        >
            <div
                className="not-prose w-full max-w-[1000px] mx-auto px-5 @xl:px-9 pt-6 pb-8 text-primary"
                data-testid="quirqy"
            >
                <header className="flex items-center gap-3.5 mb-5">
                    <QuirqAvatarTile className="size-12 rounded-[14px]" avatarClassName="size-10" />
                    <div className="min-w-0">
                        <h1 className="m-0 text-[19px] font-semibold tracking-tight">Make quirq yours.</h1>
                        <p className="mt-1 mb-0 text-xs text-secondary">A little character for your home.</p>
                    </div>
                </header>
                <section aria-label="Appearance" className={`rounded-[18px] overflow-hidden ${glass}`}>
                    <AvatarEditor />
                    <p className="m-0 px-6 py-4 border-t border-white/60 dark:border-white/10 text-[11px] text-secondary">
                        Theme, cursor and screensaver live in{' '}
                        <Link
                            to="/display-options"
                            state={{ newWindow: true }}
                            className="font-semibold text-primary underline underline-offset-2"
                        >
                            Display options
                        </Link>
                        .
                    </p>
                </section>
            </div>
        </Explorer>
    )
}

/** Opens the quirqy window, or brings it forward (restoring it if it was minimized). */
export function useOpenQuirqy(): () => void {
    const { addWindow } = useAppActions()
    return useCallback(
        () =>
            addWindow((<QuirqyWindow key={QUIRQY_WINDOW} location={{ pathname: QUIRQY_WINDOW }} newWindow />) as never),
        [addWindow]
    )
}
