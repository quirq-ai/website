import React from 'react'
import { useAppActions, useAppSettings, useAppWindows } from '../../context/App'
import Desktop from 'components/Desktop'
import Dock from 'components/Dock'
import AppWindow from 'components/AppWindow'
import { SearchOverlay } from 'components/QuirqSearch'
import AppContainer from 'components/AppContainer'

// Isolates the `windows` subscription so that opening/closing a window only
// re-renders this list, not the whole Wrapper (and therefore not the desktop,
// taskbar, etc.).
const WindowList = React.memo(function WindowList() {
    const { windows } = useAppWindows()

    return (
        <div data-app="WindowList" className="flex size-full justify-center items-center">
            {windows.map((item) => (
                // `contents` leaves the flex layout untouched. A minimized window stays mounted,
                // hidden, so it keeps its state until it's restored.
                <div key={item.key} className={item.minimized ? 'hidden' : 'contents'}>
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
