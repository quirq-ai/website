import React, { useEffect, useRef } from 'react'
import Link from 'components/Link'
import { useAppActions, useAppSettings, useAppUIState } from '../../context/App'
import QuirqAppIcon from 'components/QuirqAppIcon'
import { getQuirqApps } from 'lib/quirqApps'
import { AppItem } from 'components/OSIcons/AppIcon'
import ContextMenu from 'components/RadixUI/ContextMenu'
import DesktopIcon from './DesktopIcon'
import { Screensaver } from '../Screensaver'
import { useInactivityDetection } from '../../hooks/useInactivityDetection'
import Wallpapers, { getWallpaperGlow } from './Wallpapers'
import ReactConfetti from 'react-confetti'
import { useToast } from '../../context/Toast'

const catalog = getQuirqApps()
// Keep the desktop airy as the organization grows. Every visible app remains in Home base and Apps.
const featuredApps = catalog.filter((app) => app.featured).slice(0, 6)
const asDesktopApp = (app: (typeof catalog)[number]): AppItem => ({
    label: app.name,
    Icon: <QuirqAppIcon icon={app.icon} color={app.color} />,
    url: app.path,
    source: 'desktop',
})

const primaryApps: AppItem[] = [
    { label: 'Home base', Icon: <QuirqAppIcon icon="home" color="teal" />, url: '/', source: 'desktop' },
    { label: 'Projects', Icon: <QuirqAppIcon icon="rocket" color="green" />, url: '/projects', source: 'desktop' },
    ...featuredApps.map(asDesktopApp),
]

export const useProductLinks = () => primaryApps

export const apps: AppItem[] = [
    ...catalog
        .filter((app) => !featuredApps.some((featured) => featured.id === app.id))
        .slice(0, 5)
        .map(asDesktopApp),
    {
        label: 'Make it yours',
        Icon: <QuirqAppIcon icon="palette" color="orange" />,
        url: '/display-options',
        source: 'desktop',
    },
]

// Fixed offsets for icon layout, so nothing shifts after hydration. There is no top bar: the icons
// start inside AppContainer's p-2 (8px) padding and stop above the dock, which is up to 100px tall
// plus that 8px padding.
const DESKTOP_TOP_OFFSET = 8
const DOCK_CLEARANCE = 108

function Desktop() {
    const productLinks = useProductLinks()
    const { setScreensaverPreviewActive, setConfetti, updateSiteSettings } = useAppActions()
    const { siteSettings, compact } = useAppSettings()
    const { screensaverPreviewActive, confetti } = useAppUIState()

    const { isInactive, dismiss } = useInactivityDetection({
        enabled: !siteSettings.screensaverDisabled,
    })
    const dragBoxRef = useRef<HTMLDivElement>(null)
    const { addToast } = useToast()

    useEffect(() => {
        const box = dragBoxRef.current
        if (!box) return
        let drag: { x: number; y: number; pointerId: number; target: Element } | null = null

        const stopDrag = () => {
            const previous = drag
            drag = null
            box.style.transitionProperty = 'opacity'
            box.style.opacity = '0'
            if (previous?.target.hasPointerCapture(previous.pointerId)) {
                previous.target.releasePointerCapture(previous.pointerId)
            }
        }
        const startDrag = (event: PointerEvent) => {
            if (event.pointerType !== 'mouse' || event.button !== 0 || !event.isPrimary) return
            const target = event.target
            if (!(target instanceof Element)) return
            // Empty space can belong to the window layer or the desktop icon lists.
            const isBackground = target.matches(
                '[data-app="WindowList"], [data-app="DesktopViewport"], [data-app="Desktop"]'
            )
            const isIconList = target.matches('ul') && target.closest('[data-app="Desktop"]')
            if (!isBackground && !isIconList) return

            event.preventDefault()
            box.style.display = 'none'
            box.style.transitionProperty = 'none'
            box.style.opacity = '1'
            drag = { x: event.clientX, y: event.clientY, pointerId: event.pointerId, target }
            target.setPointerCapture(event.pointerId)
        }
        const moveDrag = (event: PointerEvent) => {
            if (!drag || event.pointerId !== drag.pointerId) return
            if (!(event.buttons & 1)) return stopDrag()
            // Update only the decorative box, without re-rendering the desktop on each move.
            Object.assign(box.style, {
                display: 'block',
                left: `${Math.min(drag.x, event.clientX)}px`,
                top: `${Math.min(drag.y, event.clientY)}px`,
                width: `${Math.abs(event.clientX - drag.x)}px`,
                height: `${Math.abs(event.clientY - drag.y)}px`,
            })
        }
        const endDrag = (event: PointerEvent) => {
            if (event.pointerId === drag?.pointerId) stopDrag()
        }

        document.addEventListener('pointerdown', startDrag)
        document.addEventListener('pointermove', moveDrag)
        document.addEventListener('pointerup', endDrag)
        document.addEventListener('pointercancel', endDrag)
        document.addEventListener('lostpointercapture', endDrag)
        window.addEventListener('blur', stopDrag)
        return () => {
            document.removeEventListener('pointerdown', startDrag)
            document.removeEventListener('pointermove', moveDrag)
            document.removeEventListener('pointerup', endDrag)
            document.removeEventListener('pointercancel', endDrag)
            document.removeEventListener('lostpointercapture', endDrag)
            window.removeEventListener('blur', stopDrag)
            stopDrag()
        }
    }, [])

    // Drive the desktop icons' hover-glow color from the active wallpaper (light + dark).
    const glow = getWallpaperGlow(siteSettings.wallpaper)
    const applyGlow = (items: AppItem[]) =>
        items.map((app) =>
            React.isValidElement(app.Icon) && app.Icon.type === QuirqAppIcon
                ? {
                      ...app,
                      Icon: React.cloneElement(app.Icon as React.ReactElement, {
                          glowColor: glow.light,
                          glowColorDark: glow.dark,
                      }),
                  }
                : app
        )
    const leftApps = applyGlow(productLinks)
    const rightApps = applyGlow(apps)

    // Mobile: one continuous wrapping grid (avoids a gap when left apps don't fill a row).
    // sm+: classic left/right desktop columns that wrap into extra columns when short on height.
    // Left uses wrap (new columns grow right); right uses wrap-reverse (new columns grow left)
    // so the primary column stays pinned to the screen edge.
    const mobileIconListClassName = 'list-none m-0 p-0 flex flex-row flex-wrap pointer-events-auto w-full sm:hidden'
    const desktopIconListClassName = 'list-none m-0 p-0 flex flex-col content-start pointer-events-auto'
    // Top padding is DESKTOP_TOP_OFFSET + 16; leave a matching cushion above the dock.
    const desktopIconListStyle = {
        height: `calc(100dvh - ${DESKTOP_TOP_OFFSET + 32 + DOCK_CLEARANCE}px)`,
        maxHeight: `calc(100dvh - ${DESKTOP_TOP_OFFSET + 32 + DOCK_CLEARANCE}px)`,
    } as const

    const handleScreensaverDismiss = () => {
        addToast({
            title: 'Screensaver dismissed',
            description: 'Want to disable it permanently?',
            duration: 10000,
            actionLabel: 'Disable screensaver',
            onAction: () => {
                updateSiteSettings({ ...siteSettings, screensaverDisabled: true })
                addToast({
                    title: 'Screensaver disabled',
                    description: (
                        <>
                            Change this setting in{' '}
                            <Link
                                to="/display-options"
                                className="text-red dark:text-yellow font-semibold"
                                state={{ newWindow: true }}
                            >
                                Display options
                            </Link>
                            .
                        </>
                    ),
                    duration: 10000,
                    onUndo: () => {
                        updateSiteSettings({ ...siteSettings, screensaverDisabled: false })
                    },
                })
            },
        })
        setScreensaverPreviewActive(false)
        dismiss()
    }

    return (
        <>
            <ContextMenu
                menuItems={[
                    {
                        type: 'item',
                        children: (
                            <Link to="/" state={{ newWindow: true }}>
                                Home base
                            </Link>
                        ),
                    },
                    {
                        type: 'item',
                        children: (
                            <Link to="/display-options" state={{ newWindow: true }}>
                                Display options
                            </Link>
                        ),
                        shortcut: [','],
                    },
                ]}
            >
                <div data-scheme="primary" data-app="Desktop" className="fixed inset-0 pointer-events-none">
                    <Wallpapers />

                    <nav className="px-1" style={{ paddingTop: DESKTOP_TOP_OFFSET + 16 }}>
                        <ul className={mobileIconListClassName}>
                            {[...leftApps, ...rightApps].map((app) => (
                                <DesktopIcon key={app.label} app={app} />
                            ))}
                        </ul>
                        <div className="hidden sm:flex sm:justify-between items-start">
                            <ul className={`${desktopIconListClassName} flex-wrap`} style={desktopIconListStyle}>
                                {leftApps.map((app) => (
                                    <DesktopIcon key={app.label} app={app} />
                                ))}
                            </ul>
                            <ul
                                className={`${desktopIconListClassName} flex-wrap-reverse`}
                                style={desktopIconListStyle}
                            >
                                {rightApps.map((app) => (
                                    <DesktopIcon key={app.label} app={app} />
                                ))}
                            </ul>
                        </div>
                    </nav>
                    <div
                        ref={dragBoxRef}
                        data-desktop-drag-box
                        aria-hidden="true"
                        className="fixed hidden pointer-events-none rounded-md border border-blue bg-blue/10 duration-200 ease-out motion-reduce:duration-0"
                    />
                </div>
                {!compact && (
                    <Screensaver
                        isActive={isInactive || screensaverPreviewActive}
                        onDismiss={handleScreensaverDismiss}
                    />
                )}
            </ContextMenu>
            {confetti && (
                <div className="fixed inset-0 pointer-events-none">
                    <ReactConfetti
                        onConfettiComplete={() => setConfetti(false)}
                        recycle={false}
                        numberOfPieces={1200}
                        gravity={0.12}
                        initialVelocityY={20}
                        initialVelocityX={10}
                        tweenDuration={200}
                    />
                    <ReactConfetti
                        recycle={false}
                        numberOfPieces={800}
                        confettiSource={{ x: 0, y: 0, w: window.innerWidth, h: window.innerHeight }}
                        initialVelocityY={-8}
                        initialVelocityX={5}
                        gravity={0.15}
                        tweenDuration={1}
                    />
                </div>
            )}
        </>
    )
}

// Memoized so the static desktop chrome doesn't re-render when Wrapper re-renders
// (e.g. on the navigate() that every window open/close triggers). It takes no
// props, so it only re-renders on its own state/context changes.
export default React.memo(Desktop)
