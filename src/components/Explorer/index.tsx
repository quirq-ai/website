import React, { useRef } from 'react'
import HeaderBar from 'components/OSChrome/HeaderBar'
import ScrollArea from 'components/RadixUI/ScrollArea'
import { useWindow } from '../../context/Window'
import { getProseClasses } from '../../constants'

interface ExplorerProps {
    title?: string
    children?: React.ReactNode
    transparent?: boolean
    showTitle?: boolean
    padding?: boolean
    headerBarOptions?: ('showBack' | 'showForward' | 'showSearch')[]
    rightActionButtons?: React.ReactNode
    onSearch?: (query: string) => void
    className?: string
}

/** Shared repository-window layout, with history, search and a scrolling content area. */
export default function Explorer({
    title,
    children,
    transparent = false,
    showTitle = true,
    padding = true,
    headerBarOptions = ['showBack', 'showForward', 'showSearch'],
    rightActionButtons,
    onSearch,
    className = '',
}: ExplorerProps) {
    const { appWindow } = useWindow()
    const searchContainerRef = useRef<HTMLDivElement>(null)

    return (
        <div className={`@container w-full h-full flex flex-col min-h-1 ${className}`}>
            <HeaderBar
                showBack={headerBarOptions.includes('showBack')}
                showForward={headerBarOptions.includes('showForward')}
                showSearch={headerBarOptions.includes('showSearch')}
                searchContentRef={searchContainerRef}
                rightActionButtons={rightActionButtons}
                onSearch={onSearch}
                className={`border-b border-primary ${!appWindow?.appSettings?.toolbar ? 'pr-16' : ''}`}
            />
            <main
                data-app="Explorer"
                data-scheme="primary"
                className={`@container flex-1 relative h-full min-h-0 ${transparent ? '' : 'bg-primary'}`}
            >
                <ScrollArea className="h-full">
                    <div
                        ref={searchContainerRef}
                        className={`${getProseClasses()} max-w-none h-full ${padding ? 'relative @md:p-4' : ''}`}
                    >
                        {showTitle && <h1>{title}</h1>}
                        {children}
                    </div>
                </ScrollArea>
            </main>
        </div>
    )
}
