import React, { useEffect, useRef, useState } from 'react'
import { IconX } from '@posthog/icons'
import OSButton from 'components/OSButton'
import Mark from 'mark.js'
import debounce from 'lodash/debounce'

interface SearchBarProps {
    visible: boolean
    onClose: () => void
    contentRef?: React.RefObject<HTMLElement>
    className?: string
    dataScheme?: string
    onSearch?: (search: string) => void
}

export const SearchBar: React.FC<SearchBarProps> = ({
    visible,
    onClose,
    contentRef,
    className,
    dataScheme = 'primary',
    onSearch,
}) => {
    const [inputValue, setInputValue] = useState('')
    const markedRef = useRef(null)
    const duplicateContainerRef = useRef<HTMLDivElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    // Reset when closing
    useEffect(() => {
        if (!contentRef?.current) return
        if (!visible) {
            setInputValue('')
            if (duplicateContainerRef.current) {
                duplicateContainerRef.current.remove()
                contentRef.current.style.display = 'block'
            }
        } else {
            createDuplicateForHighlighting()
        }
    }, [visible])

    const createDuplicateForHighlighting = () => {
        if (!contentRef?.current) return

        if (duplicateContainerRef.current) {
            duplicateContainerRef.current.remove()
        }

        const duplicate = document.createElement('div')
        const clone = contentRef.current.cloneNode(true) as HTMLElement

        duplicate.appendChild(clone)
        duplicate.className = 'highlight-container'

        contentRef.current?.parentElement?.appendChild(duplicate)
        contentRef.current.style.display = 'none'

        duplicateContainerRef.current = duplicate

        markedRef.current = new Mark(duplicate)

        if (inputValue) {
            markedRef.current.unmark()
            markedRef.current.mark(inputValue)
        }
    }

    // Handle Escape key to close search
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            onSearch?.('')
            setInputValue('')
            onClose()
        }
    }

    // Handle search input with debounce
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value
        setInputValue(value)
        onSearch?.(value)
    }

    // Highlight matching content after a brief delay (debounce)
    const debouncedHighlight = React.useCallback(
        debounce((value) => {
            if (markedRef.current && duplicateContainerRef.current) {
                markedRef.current.unmark()
                markedRef.current.mark(value)
            }
        }, 200),
        []
    )

    useEffect(() => {
        debouncedHighlight(inputValue)
        return () => debouncedHighlight.cancel()
    }, [inputValue, debouncedHighlight])

    useEffect(() => {
        return () => {
            if (duplicateContainerRef.current) {
                duplicateContainerRef.current.remove()
            }
        }
    }, [])

    useEffect(() => {
        if (!visible) return
        const handleClickOutside = (event: PointerEvent) => {
            const target = event.target
            if (!(target instanceof Element) || target.closest('[data-page-search-trigger]')) return
            if (!containerRef.current?.contains(target)) onClose()
        }
        document.addEventListener('pointerdown', handleClickOutside)
        return () => document.removeEventListener('pointerdown', handleClickOutside)
    }, [visible, onClose])

    if (!visible) return null

    return (
        <div
            ref={containerRef}
            data-scheme={dataScheme}
            className={`absolute w-64 p-1.5 border border-t-0 border-primary rounded-b z-50 flex items-center gap-1 ${className}`}
        >
            <input
                aria-label="Search this page"
                placeholder="Search this page..."
                className="w-full p-1 rounded border border-input text-primary text-sm bg-light dark:bg-dark"
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                autoFocus
            />
            <OSButton
                size="xs"
                aria-label="Close page search"
                icon={<IconX />}
                onClick={() => {
                    onSearch?.('')
                    onClose()
                }}
                className="rounded-full !p-1.5"
            />
        </div>
    )
}

export default SearchBar
