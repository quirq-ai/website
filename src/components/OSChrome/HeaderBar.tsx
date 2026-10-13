import React, { useEffect, useState } from 'react'
import { IconChevronLeft, IconChevronRight, IconSearch, IconChevronDown } from '@posthog/icons'
import OSButton from 'components/OSButton'
import { useWindow } from '../../context/Window'
import { useApp } from '../../context/App'
import SearchBar from 'components/Editor/SearchBar'
import Tooltip from 'components/RadixUI/Tooltip'
import { Popover } from 'components/RadixUI/Popover'
import { FileMenu } from 'components/RadixUI/FileMenu'
import KeyboardShortcut from 'components/KeyboardShortcut'

interface HeaderBarProps {
    showBack?: boolean
    showForward?: boolean
    showSearch?: boolean
    rightActionButtons?: React.ReactNode
    searchContentRef?: React.RefObject<HTMLElement>
    onSearch?: (search: string) => void
    className?: string
}

export default function HeaderBar({
    showBack = false,
    showForward = false,
    showSearch = false,
    rightActionButtons,
    searchContentRef,
    onSearch,
    className = '',
}: HeaderBarProps) {
    const { compact, focusedWindow } = useApp()
    const { goBack, goForward, canGoBack, canGoForward, appWindow, menu } = useWindow()
    const [searchOpen, setSearchOpen] = useState(false)
    const toggleSearch = () => setSearchOpen((open) => !open)
    const canSearch = showSearch && !!(searchContentRef || onSearch)

    useEffect(() => {
        if (!canSearch) return
        const handleKeyDown = (event: KeyboardEvent) => {
            const target = event.target as HTMLElement
            if (target.closest('input, textarea, [contenteditable="true"]') || target.shadowRoot) return
            if (event.key === 'F' && event.shiftKey && focusedWindow === appWindow) {
                event.preventDefault()
                setSearchOpen(true)
            }
        }
        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [canSearch, focusedWindow, appWindow])

    if (!showBack && !showForward && !compact && !rightActionButtons && !canSearch) return null

    return (
        <div
            data-scheme="secondary"
            className={`bg-primary flex w-full gap-px p-2 flex-shrink-0 items-center ${className}`}
        >
            <div className="flex-grow flex justify-between items-center">
                <div className="flex items-center gap-px">
                    {showBack && (
                        <OSButton
                            size="md"
                            aria-label="Go back"
                            disabled={!canGoBack}
                            onClick={goBack}
                            icon={<IconChevronLeft />}
                        />
                    )}
                    {showForward && (
                        <OSButton
                            size="md"
                            aria-label="Go forward"
                            disabled={!canGoForward}
                            onClick={goForward}
                            icon={<IconChevronRight />}
                        />
                    )}
                </div>
                {compact &&
                    (menu && menu.length ? (
                        <Popover
                            trigger={
                                <button className="text-primary text-left items-center justify-center text-sm font-semibold flex select-none">
                                    {appWindow?.meta?.title}
                                    <IconChevronDown className="size-6 -m-1" />
                                </button>
                            }
                            dataScheme="primary"
                            contentClassName="w-auto p-0 border border-primary"
                            header={false}
                        >
                            <FileMenu menu={menu} />
                        </Popover>
                    ) : (
                        <div className="text-primary text-sm font-semibold">{appWindow?.meta?.title}</div>
                    ))}
                <div className="flex items-center gap-0.5 relative">
                    {rightActionButtons}
                    {canSearch && (
                        <>
                            <Tooltip
                                trigger={
                                    <OSButton
                                        size="md"
                                        data-page-search-trigger
                                        aria-label="Search this page"
                                        icon={<IconSearch />}
                                        onClick={toggleSearch}
                                    />
                                }
                                side="bottom"
                            >
                                <div className="flex flex-col items-center gap-2">
                                    <span>Search this page</span>
                                    <div>
                                        <KeyboardShortcut text="Shift" size="xs" />
                                        &nbsp;
                                        <KeyboardShortcut text="F" size="xs" />
                                    </div>
                                </div>
                            </Tooltip>
                            <SearchBar
                                contentRef={onSearch ? undefined : searchContentRef}
                                visible={searchOpen}
                                onClose={toggleSearch}
                                onSearch={onSearch}
                                dataScheme="secondary"
                                className="-bottom-2 right-4 translate-y-full bg-primary"
                            />
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
