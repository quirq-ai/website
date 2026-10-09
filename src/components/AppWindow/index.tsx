import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { AnimatePresence } from 'framer-motion'
import { IconX, IconCollapse45Chevrons, IconSquare } from '@posthog/icons'
import { Menu, MenuItem, useApp } from '../../context/App'
import { Provider as WindowProvider, AppWindow as AppWindowType, useWindow } from '../../context/Window'

import Tooltip from 'components/RadixUI/Tooltip'
import OSButton from 'components/OSButton'
import { MenuItemType } from 'components/RadixUI/MenuBar'

import type { WindowMenuItem } from '../../context/Window'
import { navigate } from 'gatsby'

import KeyboardShortcut from 'components/KeyboardShortcut'
import Modal from 'components/RadixUI/Modal'

import FloatingModal from 'components/FloatingModal'
import { MOTION_LAYER, WINDOW_BG } from '../../constants/frostedSurfaces'
import { getQuirqApp } from 'lib/quirqApps'

import { containsURL, getActiveMenuSection } from '../../navs/activeMenu'

const PageModal = ({ children }: { children: React.ReactNode }) => {
    const [open, setOpen] = useState(true)
    const { appWindow } = useWindow()
    const { closeWindow } = useApp()

    useEffect(() => {
        if (!open) {
            closeWindow(appWindow)
        }
    }, [open])

    return (
        <Modal open={open} onOpenChange={setOpen}>
            {children}
        </Modal>
    )
}

const Router = (props) => {
    const { appWindow } = useWindow()
    const { children } = props
    return (
        <>
            {appWindow?.modal?.type === 'standard' ? (
                <PageModal>{children}</PageModal>
            ) : appWindow?.modal?.type === 'floating' ? (
                <FloatingModal>{children}</FloatingModal>
            ) : (
                children
            )}
        </>
    )
}

const WindowContainer = ({ children, closing }: { children: React.ReactNode; closing: boolean }) => {
    const { closeWindow } = useApp()
    const { appWindow } = useWindow()
    return (
        <AnimatePresence
            onExitComplete={() => {
                if (closing) {
                    closeWindow(appWindow)
                }
            }}
        >
            {children}
        </AnimatePresence>
    )
}

export default function AppWindow({ item, chrome = true }: { item: AppWindowType; chrome?: boolean }) {
    const {
        bringToFront,
        focusedWindow,
        taskbarHeight,
        updateWindowRef,
        updateWindow,
        getDesktopCenterPosition,
        expandWindow,
        menu: appMenu,
        closeWindow,
    } = useApp()
    const isSSR = typeof window === 'undefined'
    const sizeConstraints = item.sizeConstraints
    const size = item.size
    const position = item.position
    const [menu, setMenu] = useState<WindowMenuItem[]>([])
    const [history, setHistory] = useState<string[]>([])
    const [activeHistoryIndex, setActiveHistoryIndex] = useState(0)
    const windowRef = useRef<HTMLDivElement>(null)
    const [pageOptions, setPageOptions] = useState<MenuItemType[]>()
    const [closing, setClosing] = useState(false)
    // The open animation should only play once, on mount. `playOpenAnimation` is
    // decided from mount-time props and cleared when the animation finishes, so
    // later state changes (expand/collapse) never replay the pop-in.
    const [playOpenAnimation, setPlayOpenAnimation] = useState(!!item.fromOrigin)
    const skipsOpenAnimation = !playOpenAnimation
    const [animating, setAnimating] = useState(playOpenAnimation)
    const hasToolbar = item.appSettings?.toolbar
    const hideTitle = item.appSettings?.hideTitle
    const configuredWindowSize = getQuirqApp(item.path)?.window
    const isCompositorActive = animating || closing

    const parent =
        (appMenu as Menu).find(({ children, url }) => {
            const currentURL = item?.path
            return currentURL === url?.split('?')[0] || containsURL(children, currentURL)
        }) || appMenu.find(({ url }) => url === `/${item?.path?.split('/')[1]}`)

    const internalMenu = useMemo(() => parent?.children || [], [parent])

    const [activeInternalMenu, setActiveInternalMenu] = useState<MenuItem | undefined>(() =>
        getActiveMenuSection<MenuItem>(internalMenu, item.path)
    )

    useEffect(() => {
        setMenu(internalMenu)
        setActiveInternalMenu(getActiveMenuSection<MenuItem>(internalMenu, item.path))
    }, [internalMenu, item.path])

    useEffect(() => {
        if (windowRef.current) {
            updateWindowRef(item, windowRef)
        }
    }, [windowRef.current])

    const beyondViewport = (windowSize: { width: number; height: number }) => {
        const rightEdge = position.x + windowSize.width
        const bottomEdge = position.y + windowSize.height

        return (
            rightEdge > window.innerWidth ||
            bottomEdge > window.innerHeight - taskbarHeight ||
            position.x < 0 ||
            position.y < 0
        )
    }

    const handleDoubleClick = () => {
        const newSize = beyondViewport(sizeConstraints.max)
            ? { width: window.innerWidth, height: window.innerHeight - taskbarHeight }
            : sizeConstraints.max
        updateWindow(item, {
            size: newSize,
            position: getDesktopCenterPosition(newSize),
        })
    }

    const toggleExpanded = () => {
        if (item.fixedSize) return
        if (item.expanded) {
            updateWindow(item, {
                expanded: false,
                windowed: true,
                snapped: false,
            })
        } else {
            // Expanding a side-by-side window drops the other and takes over the screen.
            expandWindow(item)
        }
    }

    const canGoBack = history.length > 0 && activeHistoryIndex > 0
    const canGoForward = activeHistoryIndex < history.length - 1

    useEffect(() => {
        if (!item?.fromHistory) {
            setHistory((prev) => [...prev, item.path])
            setActiveHistoryIndex(history.length)
        }
    }, [item?.path])

    const goBack = useCallback(() => {
        if (canGoBack) {
            setActiveHistoryIndex(activeHistoryIndex - 1)
            navigate(history[activeHistoryIndex - 1], {
                state: {
                    fromHistory: true,
                },
            })
        }
    }, [canGoBack, activeHistoryIndex, history])

    const goForward = useCallback(() => {
        if (canGoForward) {
            setActiveHistoryIndex(activeHistoryIndex + 1)
            navigate(history[activeHistoryIndex + 1], {
                state: {
                    fromHistory: true,
                },
            })
        }
    }, [canGoForward, activeHistoryIndex, history])

    const handleMouseDown = () => {
        if (focusedWindow === item) return
        if (item.path.startsWith('/')) {
            navigate(`${item.path}${item.location?.search || ''}`, { state: { newWindow: true } })
        } else {
            bringToFront(item)
        }
    }

    useEffect(() => {
        const handleResize = () => {
            if (item.expanded) return
            if (beyondViewport(size)) {
                const newSize = {
                    width: Math.min(size.width, window.innerWidth),
                    height: Math.min(size.height, window.innerHeight - taskbarHeight),
                }

                const newPosition = {
                    x: Math.min(Math.max(0, position.x), window.innerWidth - newSize.width),
                    y: Math.min(Math.max(0, position.y), window.innerHeight - taskbarHeight - newSize.height),
                }

                updateWindow(item, {
                    size: newSize,
                    position: newPosition,
                })
            }
        }
        if (!isSSR) {
            window.addEventListener('resize', handleResize)
            return () => window.removeEventListener('resize', handleResize)
        }
    }, [item])

    useEffect(() => {
        const handleWindowClose = (event: CustomEvent) => {
            if (event.detail.windowKey === item.key) {
                handleClose()
            }
        }

        document.addEventListener('windowClose', handleWindowClose as EventListener)

        return () => {
            document.removeEventListener('windowClose', handleWindowClose as EventListener)
        }
    }, [item.key])

    useEffect(() => {
        if (!item.appSettings?.closeOnEscape || focusedWindow !== item || closing) return

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape' || event.defaultPrevented) return

            event.preventDefault()
            setClosing(true)
        }

        window.addEventListener('keydown', handleKeyDown)

        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [closing, focusedWindow, item])

    const handleClose = () => {
        setClosing(true)
    }

    const onAnimationComplete = () => {
        setAnimating(false)
        setPlayOpenAnimation(false)
    }

    return (
        <WindowProvider
            appWindow={item}
            menu={menu}
            setMenu={setMenu}
            goBack={goBack}
            goForward={goForward}
            canGoBack={canGoBack}
            canGoForward={canGoForward}
            setPageOptions={setPageOptions}
            pageOptions={pageOptions}
            activeInternalMenu={activeInternalMenu}
            setActiveInternalMenu={setActiveInternalMenu}
            internalMenu={internalMenu}
            parent={parent}
            animating={animating}
        >
            <WindowContainer closing={closing}>
                {/* AnimatePresence keys its children by `key`; unkeyed, the overlay and the window
                    would both be "" and React warns about duplicate keys on every render. */}
                {item.appSettings?.size?.fixed && (
                    <div
                        key="overlay"
                        onClick={handleClose}
                        className={`fixed inset-0 z-50 bg-black/50 print:hidden ${
                            closing ? 'animate-overlay-fade-out' : !skipsOpenAnimation ? 'animate-overlay-fade-in' : ''
                        }`}
                    />
                )}
                <div
                    key="window"
                    onMouseDown={handleMouseDown}
                    onAnimationEnd={(e) => {
                        if (e.currentTarget !== e.target) return
                        if (closing) {
                            closeWindow(item)
                        } else {
                            onAnimationComplete()
                        }
                    }}
                    ref={(el) => {
                        const mutableRef = windowRef as React.MutableRefObject<HTMLDivElement | null>
                        mutableRef.current = el
                    }}
                    data-app="AppWindow"
                    data-path={item.path || undefined}
                    data-fixed-size={item.appSettings?.size?.fixed || undefined}
                    data-expanded={item.expanded || undefined}
                    data-windowed={item.windowed || undefined}
                    data-snapped={item.snapped || undefined}
                    data-focused={focusedWindow === item || undefined}
                    data-scheme="tertiary"
                    className={`@container relative overflow-hidden ${
                        item.appSettings?.size?.fixed
                            ? closing
                                ? 'animate-window-slide-up'
                                : !skipsOpenAnimation
                                ? 'animate-window-slide-down'
                                : ''
                            : closing
                            ? 'animate-window-pop-out'
                            : !skipsOpenAnimation
                            ? 'animate-window-pop-in'
                            : ''
                    } ${
                        item.appSettings?.size?.fixed
                            ? // The max height keeps auto-height modals inside the desktop area on short
                              // screens — without it they grow past the bottom edge and get clipped by the
                              // desktop's `overflow-clip` with nothing left to scroll.
                              '!absolute top-2 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-1rem)] max-h-[calc(100%-1rem)]'
                            : item.windowed
                            ? 'h-[95%] w-[80%]'
                            : 'size-full'
                    } !select-auto flex flex-col border-primary ${WINDOW_BG} ${
                        isCompositorActive ? MOTION_LAYER : ''
                    } rounded-lg ${item.appSettings?.size?.fixed ? 'border' : item.expanded ? 'border-t' : ''} ${
                        item.expanded ? 'shadow-none' : 'shadow-md'
                    } ${
                        item.expanded
                            ? 'rounded-tr-none rounded-tl-none'
                            : item.snapped === 'left'
                            ? 'rounded-tl-none rounded-tr-none rounded-br-none border-r'
                            : item.snapped === 'right'
                            ? 'rounded-tl-none rounded-tr-none rounded-bl-none'
                            : ''
                    }`}
                    style={
                        item.appSettings?.size?.fixed
                            ? {
                                  maxWidth: item.sizeConstraints.min.width,
                                  maxHeight: item.appSettings.size.autoHeight
                                      ? undefined
                                      : item.sizeConstraints.min.height,
                              }
                            : item.windowed && !item.expanded && configuredWindowSize
                            ? {
                                  ...(configuredWindowSize.width !== undefined
                                      ? { width: configuredWindowSize.width, maxWidth: '100%' }
                                      : {}),
                                  ...(configuredWindowSize.height !== undefined
                                      ? { height: configuredWindowSize.height, maxHeight: '95%' }
                                      : {}),
                              }
                            : undefined
                    }
                >
                    <div className={`print:hidden ${hasToolbar ? 'bg-primary flex items-center py-0.5 px-1' : ''}`}>
                        {hasToolbar && (
                            <>
                                {!hideTitle && (
                                    <p className="text-primary text-left text-sm font-semibold ml-1.5 my-0 line-clamp-1">
                                        {item.meta?.title}
                                    </p>
                                )}
                                <div className="flex-1" />
                            </>
                        )}
                        <div
                            data-scheme="tertiary"
                            onDoubleClick={handleDoubleClick}
                            className={`inline-flex gap-1 items-center py-0.5 pl-1.5 pr-0.5 opacity-40 hover:opacity-75 transition-opacity duration-100 ${
                                hasToolbar ? 'flex-1 justify-end' : 'absolute z-20 right-1 top-1'
                            }`}
                        >
                            {!item.fixedSize && (
                                <div className="window-expand-control flex justify-end">
                                    <Tooltip
                                        trigger={
                                            <OSButton
                                                windowButton
                                                size="md"
                                                aria-label={item.expanded ? 'Restore window' : 'Expand window'}
                                                onClick={toggleExpanded}
                                                icon={
                                                    item.expanded ? (
                                                        <IconCollapse45Chevrons />
                                                    ) : (
                                                        <IconSquare className="scale-110" />
                                                    )
                                                }
                                            />
                                        }
                                    >
                                        <div className="flex flex-col items-center gap-2">
                                            <span>{item.expanded ? 'Restore window' : 'Expand window'}</span>
                                            <div>
                                                <KeyboardShortcut text="Shift" size="xs" />
                                                &nbsp;
                                                <KeyboardShortcut text="↑" size="xs" />
                                            </div>
                                        </div>
                                    </Tooltip>
                                </div>
                            )}
                            <div className="flex justify-end">
                                <Tooltip
                                    trigger={
                                        <OSButton
                                            windowButton
                                            size="md"
                                            aria-label="Close window"
                                            onClick={handleClose}
                                            icon={<IconX />}
                                        />
                                    }
                                >
                                    <div className="flex flex-col items-center gap-2">
                                        <span>Close window</span>
                                        <div>
                                            <KeyboardShortcut text="Shift" size="xs" />
                                            &nbsp;
                                            <KeyboardShortcut text="W" size="xs" />
                                        </div>
                                    </div>
                                </Tooltip>
                            </div>
                        </div>
                    </div>
                    <div
                        data-app="AppWindowContent"
                        className={`size-full flex-grow ${
                            chrome
                                ? `${
                                      // A modal's auto height makes percentage heights inside it resolve to
                                      // `auto`, so its own ScrollAreas never overflow and can't scroll. Scroll
                                      // the content here instead of clipping whatever doesn't fit.
                                      item.appSettings?.size?.fixed
                                          ? 'overflow-x-hidden overflow-y-auto'
                                          : 'overflow-clip min-h-0'
                                  } rounded-lg ${hasToolbar ? 'rounded-t-none' : ''} ${
                                      item.expanded
                                          ? 'rounded-tr-none rounded-tl-none'
                                          : item.snapped === 'left'
                                          ? 'rounded-tl-none rounded-tr-none rounded-br-none'
                                          : item.snapped === 'right'
                                          ? 'rounded-tl-none rounded-tr-none rounded-bl-none'
                                          : ''
                                  }`
                                : ''
                        }`}
                    >
                        <Router {...item.props}>{item.element}</Router>
                    </div>
                </div>
            </WindowContainer>
        </WindowProvider>
    )
}
