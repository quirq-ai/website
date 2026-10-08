import React from 'react'

/**
 * The desktop's plain background: a quiet paper tone in light mode and near-black in dark mode,
 * fading between them with the theme. The organization's README is written on top of it
 * (components/QuirqProfile).
 */
export default function Background(): JSX.Element {
    return (
        <div
            aria-hidden="true"
            className="fixed inset-0 -z-10 bg-[#f6f6f3] dark:bg-[#0e0f11] transition-colors duration-700 ease-in-out motion-reduce:transition-none"
        />
    )
}

/** Hover glow for the desktop's glass icons, tuned for the plain background. */
export const DESKTOP_ICON_GLOW = { light: '#c3cedb', dark: '#5b6b80' }
