import React, { useEffect, useRef, useState } from 'react'
import { isDocPath } from 'lib/quirqDocs'

// The vendored @pierre/trees React entry (src/vendor/pierre-trees). It renders into a shadow root and
// touches the DOM as it loads, so it is imported in the browser only, after mount, in its own chunk.
type TreesModule = {
    FileTree: React.ComponentType<{ model: unknown; style?: React.CSSProperties; className?: string }>
    useFileTree: (options: Record<string, unknown>) => { model: TreeModel }
}
type TreeModel = {
    getItem(path: string): { select(): void; isSelected(): boolean } | null
    scrollToPath(path: string, options?: { focus?: boolean }): void
}

const loadTrees = () => import('vendor/pierre-trees/react') as unknown as Promise<TreesModule>

// Past this many docs, folders start closed except the ones leading to the open doc.
const OPEN_ALL_UP_TO = 40
const foldersOf = (path: string) =>
    path
        .split('/')
        .slice(0, -1)
        .map((_, index, parts) => parts.slice(0, index + 1).join('/'))

type Props = {
    paths: string[]
    selected: string | null
    onSelect: (path: string) => void
    dark: boolean
    height: number
}

function TreeView({ trees, paths, selected, onSelect, dark, height }: Props & { trees: TreesModule }) {
    // The model reads its options once; the latest callback is read through a ref.
    const onSelectRef = useRef(onSelect)
    onSelectRef.current = onSelect
    const large = paths.length > OPEN_ALL_UP_TO
    const { model } = trees.useFileTree({
        paths,
        initialExpansion: large ? 'closed' : 'open',
        ...(large && selected ? { initialExpandedPaths: foldersOf(selected) } : {}),
        initialSelectedPaths: selected ? [selected] : [],
        flattenEmptyDirectories: true,
        density: 'compact',
        search: paths.length > 12,
        onSelectionChange: (selectedPaths: readonly string[]) => {
            const path = selectedPaths[selectedPaths.length - 1]
            if (path && isDocPath(path)) onSelectRef.current(path)
        },
    })

    // The open doc stays selected and in view, including one opened from a link inside another doc.
    useEffect(() => {
        if (!selected) return
        const item = model.getItem(selected)
        if (!item) return
        if (!item.isSelected()) item.select()
        model.scrollToPath(selected, { focus: false })
    }, [model, selected])

    return (
        <trees.FileTree
            model={model}
            style={
                {
                    height,
                    colorScheme: dark ? 'dark' : 'light',
                    '--trees-bg-override': 'transparent',
                    '--trees-padding-inline-override': '10px',
                } as React.CSSProperties
            }
        />
    )
}

/** The repository's docs as a file tree, drawn by @pierre/trees. A doc selected in it opens in place. */
export default function DocsTree(props: Props) {
    const [trees, setTrees] = useState<TreesModule | null>(null)
    const [failed, setFailed] = useState(false)
    useEffect(() => {
        let cancelled = false
        loadTrees()
            .then((module) => !cancelled && setTrees(module))
            .catch(() => !cancelled && setFailed(true))
        return () => {
            cancelled = true
        }
    }, [])

    if (failed) {
        // Without the tree, every doc is still one click away as a plain list.
        return (
            <ul className="m-0 list-none p-2 text-xs overflow-y-auto" style={{ maxHeight: props.height }}>
                {props.paths.map((path) => (
                    <li key={path}>
                        <button
                            type="button"
                            onClick={() => props.onSelect(path)}
                            className={`w-full truncate rounded px-2 py-1 text-left font-mono ${
                                path === props.selected ? 'bg-accent text-primary' : 'text-secondary hover:text-primary'
                            }`}
                        >
                            {path}
                        </button>
                    </li>
                ))}
            </ul>
        )
    }
    if (!trees)
        return <div className="animate-pulse bg-accent/50" style={{ height: props.height }} aria-hidden="true" />
    return <TreeView trees={trees} {...props} />
}
