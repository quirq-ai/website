import React, { useEffect, useState } from 'react'
import { Combobox } from '@headlessui/react'
import { Dialog as RadixDialog } from 'radix-ui'
import { navigate } from 'gatsby'
import { IconSearch, IconX } from '@posthog/icons'
import { useAppActions, useAppUIState } from '../../context/App'
import { getQuirqApps, quirqConfig } from 'lib/quirqApps'
import QuirqAppIcon from 'components/QuirqAppIcon'
import OSButton from 'components/OSButton'
import KeyboardShortcut from 'components/KeyboardShortcut'

const entries = [
    {
        id: 'home-base',
        name: 'Home base',
        description: 'Explore every app in the organization.',
        path: '/',
        icon: 'home',
        color: 'teal',
        keywords: 'home organization apps repositories',
    },
    {
        id: 'projects',
        name: 'Projects',
        description: 'Everything the swarm is building, by phase.',
        path: '/projects',
        icon: 'rocket',
        color: 'green',
        keywords: 'projects phases status swarm thought prototype built shipping',
    },
    ...getQuirqApps().map((app) => ({
        ...app,
        keywords: [app.repo, app.category, app.language, ...app.topics].join(' '),
    })),
    {
        id: 'appearance',
        name: 'Make it yours',
        description: 'Colors, themes, cursors, and screensavers.',
        path: '/display-options',
        icon: 'palette',
        color: 'orange',
        keywords: 'appearance display options customization dark light theme cursor screensaver',
    },
]

export function SearchOverlay() {
    const { searchOpen } = useAppUIState()
    const { setSearchOpen } = useAppActions()
    const [query, setQuery] = useState('')
    const normalizedQuery = query.trim().toLowerCase()
    const results = entries.filter((entry) =>
        `${entry.name} ${entry.description} ${entry.path} ${entry.keywords}`.toLowerCase().includes(normalizedQuery)
    )

    useEffect(() => {
        if (!searchOpen) setQuery('')
    }, [searchOpen])

    const select = (entry: (typeof entries)[number] | null) => {
        if (!entry) return
        setSearchOpen(false)
        navigate(entry.path, { state: { newWindow: true } })
    }

    return (
        <RadixDialog.Root open={searchOpen} onOpenChange={setSearchOpen}>
            <RadixDialog.Portal>
                <RadixDialog.Overlay className="fixed inset-0 z-[999997] bg-black/20 backdrop-blur-sm" />
                <RadixDialog.Content
                    data-scheme="primary"
                    aria-describedby="quirq-search-description"
                    className="@container fixed top-[12%] left-1/2 -translate-x-1/2 z-[999998] w-[calc(100%_-_2rem)] max-w-2xl rounded-xl border border-primary bg-primary text-primary overflow-hidden shadow-2xl"
                    onKeyDown={(event) => {
                        if (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) {
                            event.preventDefault()
                            setSearchOpen(false)
                        }
                    }}
                >
                    <RadixDialog.Title className="sr-only">Search {quirqConfig.name} apps</RadixDialog.Title>
                    <RadixDialog.Description id="quirq-search-description" className="sr-only">
                        Find apps by repository name, description, topic, or language. Use arrow keys and Enter to open
                        an app.
                    </RadixDialog.Description>
                    <Combobox value={null} onChange={select} nullable>
                        <div className="flex items-center gap-3 px-4 py-3 border-b border-primary">
                            <IconSearch className="size-6 text-muted shrink-0" />
                            <Combobox.Input
                                aria-label="Search apps"
                                autoFocus
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                placeholder={`Search ${quirqConfig.name} apps...`}
                                className="min-w-0 flex-1 border-0 bg-transparent text-primary text-lg p-0 focus:ring-0 focus:outline-none"
                            />
                            <RadixDialog.Close asChild>
                                <OSButton size="sm" aria-label="Close search" icon={<IconX />} />
                            </RadixDialog.Close>
                        </div>
                        <Combobox.Options static className="list-none m-0 p-2 max-h-[55vh] overflow-y-auto">
                            {results.map((entry) => (
                                <Combobox.Option key={entry.id} value={entry} as={React.Fragment}>
                                    {({ active }) => (
                                        <li
                                            className={`group flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 ${
                                                active ? 'bg-accent' : 'hover:bg-accent'
                                            }`}
                                        >
                                            <QuirqAppIcon icon={entry.icon} color={entry.color} className="shrink-0" />
                                            <div className="min-w-0 flex-1">
                                                <p className="m-0 text-sm font-semibold truncate">{entry.name}</p>
                                                <p className="m-0 text-xs text-secondary line-clamp-1">
                                                    {entry.description}
                                                </p>
                                            </div>
                                            <span className="hidden @md:block text-xs text-muted">{entry.path}</span>
                                        </li>
                                    )}
                                </Combobox.Option>
                            ))}
                            {results.length === 0 && (
                                <li className="p-5 text-sm text-secondary">
                                    No apps match “{query}”. Try a repository name or topic.
                                </li>
                            )}
                        </Combobox.Options>
                    </Combobox>
                    <div className="flex items-center justify-between gap-3 border-t border-primary px-4 py-2 text-xs text-secondary">
                        <span>{results.length} destinations</span>
                        <span className="flex items-center gap-2">
                            <KeyboardShortcut text="Enter" size="sm" /> Open
                            <KeyboardShortcut text="Esc" size="sm" /> Close
                        </span>
                    </div>
                </RadixDialog.Content>
            </RadixDialog.Portal>
        </RadixDialog.Root>
    )
}

export default SearchOverlay
