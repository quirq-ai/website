import React from 'react'
import { useLocation } from '@gatsbyjs/reach-router'
import { useAppActions, useAppSettings, useAppWindows } from '../../context/App'
import Desktop from 'components/Desktop'
import Dock from 'components/Dock'
import AppWindow from 'components/AppWindow'
import { SearchOverlay } from 'components/QuirqSearch'
import AppContainer from 'components/AppContainer'
import HomeBaseSEO from 'components/HomeBase/SEO'
import { isLandingPath } from 'lib/landing'

// Isolates the `windows` subscription so that opening/closing a window only
// re-renders this list, not the whole Wrapper (and therefore not the desktop,
// taskbar, etc.).
const WindowList = React.memo(function WindowList() {
    const { windows } = useAppWindows()
    const { pathname } = useLocation()
    // Open windows share one row. On a phone, half the width is too narrow for any app, so only the
    // frontmost window shows there; the others stay mounted, and the dock brings each one back.
    // Fixed-size windows are overlays above the row, so they don't count.
    const front = windows.reduce<(typeof windows)[number] | undefined>(
        (top, item) =>
            !item.minimized && !item.appSettings?.size?.fixed && item.zIndex > (top?.zIndex ?? -1) ? item : top,
        undefined
    )

    return (
        <div data-app="WindowList" className="flex size-full justify-center items-center">
            {/* The home page lands with Home base closed; its title and meta tags stay all the same. */}
            {isLandingPath(pathname) && !windows.some((item) => item.path === '/') && <HomeBaseSEO />}
            {windows.map((item) => (
                // `contents` leaves the flex layout untouched. A minimized window stays mounted,
                // hidden, so it keeps its state until it's restored.
                <div
                    key={item.key}
                    className={
                        item.minimized
                            ? 'hidden'
                            : item === front || item.appSettings?.size?.fixed
                            ? 'contents'
                            : 'contents [@media(max-width:767px)]:hidden'
                    }
                >
                    <AppWindow item={item} />
                </div>
            ))}
        </div>
    )
})

export default function Wrapper() {
    const { constraintsRef } = useAppActions()
    const { compact } = useAppSettings()

    return (
        <AppContainer className="h-dvh flex flex-col p-2">
            <div data-app="DesktopViewport" ref={constraintsRef} className={`flex-grow relative min-h-0 overflow-clip`}>
                <Desktop />
                <WindowList />
            </div>
            {/* The dock is the navigation bar: Home, Projects, search and open windows. */}
            {!compact && <Dock />}
            <SearchOverlay />
        </AppContainer>
    )
}
