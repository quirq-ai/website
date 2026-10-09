import React, { useCallback, useEffect, useRef, useState } from 'react'
import type { QuirqApp } from 'lib/quirqApps'
import { githubFileUrl, isDocPath, loadDoc, loadDocsIndex, readmeIn, withoutTitle, type DocsIndex } from 'lib/quirqDocs'
import MarkdownDoc from './MarkdownDoc'
import DocsTree from './DocsTree'

// Up to this many docs are tabs under the window's header; a repository with more gets the
// @pierre/trees sidebar instead.
export const MAX_DOC_TABS = 6

type Doc = { path: string | null; markdown: string | null; state: 'ready' | 'loading' | 'missing' | 'error' }

const bundledDoc = (app: QuirqApp): Doc => ({
    path: app.readmePath,
    markdown: app.readmeMarkdown,
    state: app.readmeMarkdown ? 'ready' : 'missing',
})

/** About one row per file and folder, within bounds that keep the doc itself in view. */
function treeHeight(paths: string[]) {
    const folders = new Set(
        paths.flatMap((path) =>
            path
                .split('/')
                .slice(0, -1)
                .map((_, i, parts) => parts.slice(0, i + 1).join('/'))
        )
    )
    return Math.max(96, Math.min(560, (paths.length + folders.size) * 26 + 8))
}

/**
 * A repository's docs: the list, the open doc and its text. The bundled README renders on the server and
 * on first paint; the list (one GitHub git trees request) and the current text (raw.githubusercontent.com)
 * come after mount. `layout` says how the window shows them: one doc, tabs, or a file tree.
 */
export function useRepositoryDocs(app: QuirqApp) {
    const [docs, setDocs] = useState<DocsIndex | null>(null)
    const [selected, setSelected] = useState<string | null>(app.readmePath)
    const [doc, setDoc] = useState<Doc>(() => bundledDoc(app))
    // The README's text, bundled or as read from GitHub, for the header's summary whichever tab is open.
    const [readmeText, setReadmeText] = useState<string | null>(app.readmeMarkdown)
    const readmePath = useRef<string | null>(app.readmePath)
    const top = useRef<HTMLDivElement>(null)
    // Set when a link opens a doc, so it scrolls into view (or to its #anchor) once it loads.
    const navigation = useRef<{ hash: string } | null>(null)

    useEffect(() => {
        let cancelled = false
        setDocs(null)
        setSelected(app.readmePath)
        setDoc(bundledDoc(app))
        setReadmeText(app.readmeMarkdown)
        readmePath.current = app.readmePath
        loadDocsIndex(app)
            .then((index) => {
                if (cancelled) return
                setDocs(index)
                readmePath.current = readmePath.current ?? readmeIn(index.paths)
                setSelected((current) => current ?? readmeIn(index.paths))
            })
            .catch(() => {
                // Without the list, the README still loads; a repository new since the build tries README.md.
                if (!cancelled) setSelected((current) => current ?? 'README.md')
            })
        return () => {
            cancelled = true
        }
        // Follow the repository, not every refresh of its catalog entry.
    }, [app.id])

    useEffect(() => {
        if (!selected) return
        const controller = new AbortController()
        setDoc((current) =>
            current.path === selected ? current : { path: selected, markdown: null, state: 'loading' }
        )
        loadDoc(app, selected, controller.signal)
            .then((markdown) => {
                setDoc({ path: selected, markdown, state: markdown === null ? 'missing' : 'ready' })
                if (markdown && (selected === readmePath.current || (!readmePath.current && selected === 'README.md')))
                    setReadmeText(markdown)
            })
            .catch(() => {
                if (controller.signal.aborted) return
                // Keep what is on screen (the bundled README, say) when GitHub can't be reached.
                setDoc((current) =>
                    current.path === selected && current.markdown
                        ? current
                        : { path: selected, markdown: null, state: 'error' }
                )
            })
        return () => controller.abort()
    }, [app.id, selected])

    useEffect(() => {
        if (doc.state !== 'ready' || !navigation.current) return
        const { hash } = navigation.current
        navigation.current = null
        window.requestAnimationFrame(() => {
            const id = decodeURIComponent(hash.replace(/^#/, ''))
            const anchor =
                id &&
                (top.current?.querySelector(`[id="${CSS.escape(id)}"]`) ||
                    top.current?.querySelector(`[id="user-content-${CSS.escape(id)}"]`))
            ;(anchor || top.current)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        })
    }, [doc])

    /** Opens a doc from a link or the tree, and brings it (or its #anchor) into view. */
    const openDoc = useCallback((path: string, hash = '') => {
        navigation.current = { hash }
        setSelected(path)
    }, [])
    /** Switches tabs without scrolling: the tab row stays where it is. */
    const selectDoc = useCallback((path: string) => setSelected(path), [])
    const isDoc = useCallback((path: string) => (docs ? docs.paths.includes(path) : isDocPath(path)), [docs])

    // The README leads the tabs; the rest keep GitHub's order.
    const readme = docs ? readmeIn(docs.paths) : null
    const tabs = docs ? [...(readme ? [readme] : []), ...docs.paths.filter((path) => path !== readme)] : []
    const layout: 'single' | 'tabs' | 'tree' =
        !docs || docs.paths.length <= 1 ? 'single' : docs.paths.length <= MAX_DOC_TABS ? 'tabs' : 'tree'

    return { docs, tabs, selected, doc, readmeText, top, layout, openDoc, selectDoc, isDoc }
}

export type RepositoryDocs = ReturnType<typeof useRepositoryDocs>

/**
 * The window's reading area: the open doc in a centered column, with the file tree beside it when the
 * repository has more docs than fit as tabs.
 */
export default function DocsBrowser({
    app,
    docs: state,
    dark,
}: {
    app: QuirqApp
    docs: RepositoryDocs
    dark: boolean
}) {
    const { docs, doc, layout, top, selected, openDoc, isDoc } = state
    const tree = layout === 'tree' && !!docs

    const content =
        doc.state === 'ready' && doc.markdown && doc.path ? (
            <MarkdownDoc
                app={app}
                path={doc.path}
                // The header already names the repository; a README title repeating it is dropped.
                markdown={withoutTitle(doc.markdown, [app.name, app.repo, app.id])}
                dark={dark}
                onOpenDoc={openDoc}
                isDoc={isDoc}
            />
        ) : doc.state === 'loading' ? (
            <p className="text-sm text-secondary">Loading {doc.path}…</p>
        ) : doc.state === 'error' ? (
            <p className="text-sm text-secondary">
                {doc.path} couldn’t be read from GitHub.{' '}
                <a href={githubFileUrl(app, doc.path || '')} target="_blank" rel="noopener noreferrer">
                    Open it on GitHub ↗
                </a>
            </p>
        ) : (
            <p className="text-sm text-secondary">
                This repository has no README yet.{' '}
                <a href={app.repoUrl} target="_blank" rel="noopener noreferrer">
                    See its code on GitHub ↗
                </a>
            </p>
        )

    return (
        <div
            className={`@container ${tree ? '@3xl:grid @3xl:grid-cols-[15rem_minmax(0,1fr)]' : ''}`}
            data-testid="repository-docs"
            data-layout={layout}
        >
            {tree && docs && (
                <aside
                    aria-label={`${app.name} docs`}
                    className="border-b @3xl:border-b-0 @3xl:border-r border-primary px-2 py-3 @3xl:sticky @3xl:top-0 self-start"
                >
                    <p className="m-0 mb-1 px-2 text-[11px] text-secondary">{docs.paths.length} docs</p>
                    <DocsTree
                        key={app.id}
                        paths={docs.paths}
                        selected={selected}
                        onSelect={openDoc}
                        dark={dark}
                        height={treeHeight(docs.paths)}
                    />
                    {docs.truncated && (
                        <p className="mt-2 px-2 text-[11px] text-secondary">
                            GitHub listed part of this repository.{' '}
                            <a href={app.repoUrl} target="_blank" rel="noopener noreferrer">
                                See all files ↗
                            </a>
                        </p>
                    )}
                </aside>
            )}
            <div ref={top} className="min-w-0 scroll-mt-4 px-5 py-6 @xl:px-8 @xl:py-8">
                <div className="mx-auto max-w-[70ch]">
                    {tree && doc.path && <p className="m-0 mb-4 font-mono text-xs text-secondary">{doc.path}</p>}
                    {content}
                    {doc.state === 'ready' && doc.path && (
                        <p className="m-0 mt-10 border-t border-primary pt-4 text-xs text-secondary">
                            <a
                                href={githubFileUrl(app, doc.path)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-secondary hover:text-primary"
                            >
                                View {doc.path} on GitHub ↗
                            </a>
                        </p>
                    )}
                </div>
            </div>
        </div>
    )
}
