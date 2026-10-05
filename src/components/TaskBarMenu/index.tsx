import React, { useCallback, useEffect, useState } from 'react'
import { IconSearch, IconApp } from '@posthog/icons'
import { useAppActions } from '../../context/App'
import MenuBar from 'components/RadixUI/MenuBar'
import ActiveWindowsPanel from 'components/ActiveWindowsPanel'
import OSButton from 'components/OSButton'
import Tooltip from 'components/RadixUI/Tooltip'
import KeyboardShortcut from 'components/KeyboardShortcut'
import { useMenuData } from './menuData'
import { MOTION_LAYER, TASKBAR_BG } from '../../constants/frostedSurfaces'

const NAV_MENU_CLASS =
    '[&_button]:px-2 [&_button:not(:first-child)]:hidden md:[&_button:not(:first-child)]:flex [&_a:not(:first-child)]:hidden md:[&_a:not(:first-child)]:flex'

function TaskBarMenu() {
    const { openSearch, setIsActiveWindowsPanelOpen, taskbarRef, updateTaskbarHeight } = useAppActions()
    const [isAnimating, setIsAnimating] = useState(false)
    const menuData = useMenuData()

    useEffect(() => {
        if (isAnimating) {
            const timer = setTimeout(() => setIsAnimating(false), 500)
            return () => clearTimeout(timer)
        }
    }, [isAnimating])

    useEffect(() => {
        const handleWindowMinimized = () => setIsAnimating(true)
        const taskbar = document.querySelector('#taskbar')
        taskbar?.addEventListener('windowMinimized', handleWindowMinimized)
        return () => taskbar?.removeEventListener('windowMinimized', handleWindowMinimized)
    }, [])

    const handleTaskbarRef = useCallback(
        (node: HTMLDivElement | null) => {
            if (taskbarRef) {
                const ref = taskbarRef as React.MutableRefObject<HTMLDivElement | null>
                ref.current = node
            }
            if (node) updateTaskbarHeight()
        },
        [taskbarRef, updateTaskbarHeight]
    )

    return (
        <>
            <div className="z-50">
                <div
                    ref={handleTaskbarRef}
                    id="taskbar"
                    data-scheme="primary"
                    data-menu-container
                    style={{
                        transformOrigin: '50% 50%',
                        transformStyle: 'preserve-3d',
                        width: '100%',
                        boxSizing: 'border-box',
                    }}
                    className={`${TASKBAR_BG} ${
                        isAnimating ? MOTION_LAYER : ''
                    } skin-classic:bg-accent wallpaper-keyboard-garden:dark:bg-black/15 border-secondary rounded px-2 shadow-2xl`}
                >
                    <div
                        aria-hidden="true"
                        className="absolute top-0 left-0 right-0 bg-accent pointer-events-none"
                        style={{ height: '20px', transform: 'rotateX(-90deg)', transformOrigin: '50% 0%' }}
                    />
                    <div
                        aria-hidden="true"
                        className="absolute bottom-0 left-0 right-0 bg-accent pointer-events-none"
                        style={{ height: '20px', transform: 'rotateX(90deg)', transformOrigin: '50% 100%' }}
                    />
                    <div className="mx-auto transition-all duration-300 flex justify-between items-center w-full max-w-full">
                        <MenuBar menus={menuData} className={NAV_MENU_CLASS} />
                        <aside data-scheme="secondary" className="flex items-center gap-0.5 py-1">
                            <Tooltip
                                trigger={
                                    <OSButton
                                        onClick={() => openSearch()}
                                        size="sm"
                                        className="relative top-px"
                                        aria-label="Search Quirq apps"
                                    >
                                        <IconSearch className="size-5" />
                                    </OSButton>
                                }
                            >
                                <div className="flex flex-col items-center gap-1">
                                    <p className="text-sm mb-0">Search apps</p>
                                    <KeyboardShortcut text="/" size="sm" />
                                </div>
                            </Tooltip>
                            <OSButton
                                onClick={() => setIsActiveWindowsPanelOpen(true)}
                                size="sm"
                                className="relative top-px"
                                aria-label="Active windows"
                                tooltip="Active windows"
                            >
                                <IconApp className="size-5" />
                            </OSButton>
                        </aside>
                    </div>
                </div>
            </div>
            <ActiveWindowsPanel />
        </>
    )
}

export default React.memo(TaskBarMenu)
