import React, { useCallback, useEffect, useRef, useState } from 'react'
import type { QuirqApp } from 'lib/quirqApps'
import { githubFileUrl, isDocPath, loadDoc, loadDocsIndex, readmeIn, type DocsIndex } from 'lib/quirqDocs'
import { useAppSettings } from '../../context/App'
import MarkdownDoc from './MarkdownDoc'
import DocsTree from './DocsTree'

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
    return Math.max(96, Math.min(420, (paths.length + folders.size) * 26 + 8))
}

/**
 * A repository's documentation inside its app window: the README first, then every Markdown file in
 * the repository, listed in a @pierre/trees file tree and opened in place. The bundled README renders
 * on the server and on first paint; the doc list and the current text come from GitHub after mount.
 */
export default function DocsBrowser({ app, reader = false }: { app: QuirqApp; reader?: boolean }) {
    const { siteSettings } = useAppSettings()
    const dark = siteSettings.theme === 'dark'
    const [docs, setDocs] = useState<DocsIndex | null>(null)
    const [selected, setSelected] = useState<string | null>(app.readmePath)
    const [doc, setDoc] = useState<Doc>(() => bundledDoc(app))
    const top = useRef<HTMLDivElement>(null)
    // Set when the visitor opens a doc, so it scrolls into view (or to its #anchor) once it loads.
    const navigation = useRef<{ hash: string } | null>(null)

    useEffect(() => {
        let cancelled = false
        setDocs(null)
        setSelected(app.readmePath)
        setDoc(bundledDoc(app))
        loadDocsIndex(app)
            .then((index) => {
                if (cancelled) return
                setDocs(index)
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
            .then((markdown) => setDoc({ path: selected, markdown, state: markdown === null ? 'missing' : 'ready' }))
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

    const openDoc = useCallback((path: string, hash = '') => {
        navigation.current = { hash }
        setSelected(path)
    }, [])
    const isDoc = useCallback((path: string) => (docs ? docs.paths.includes(path) : isDocPath(path)), [docs])

    const showTree = !!docs && docs.paths.length > 1
    const content =
        doc.state === 'ready' && doc.markdown && doc.path ? (
            <MarkdownDoc
                app={app}
                path={doc.path}
                markdown={doc.markdown}
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
            <p className="text-secondary">
                Explore this project’s source and documentation{' '}
                <a href={app.repoUrl} target="_blank" rel="noopener noreferrer">
                    on GitHub ↗
                </a>
                .
            </p>
        )

    return (
        <div className="@container" data-testid="repository-docs">
            <div className={showTree ? 'flex flex-col @3xl:flex-row gap-6 @3xl:gap-8' : ''}>
                {showTree && docs && (
                    <aside
                        aria-label={`${app.name} docs`}
                        className="w-full @3xl:w-60 shrink-0 @3xl:sticky @3xl:top-4 self-start"
                    >
                        <p className="m-0 mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
                            Docs <span className="font-normal">· {docs.paths.length}</span>
                        </p>
                        <div className="overflow-hidden rounded-md border border-primary">
                            <DocsTree
                                key={app.id}
                                paths={docs.paths}
                                selected={selected}
                                onSelect={openDoc}
                                dark={dark}
                                height={treeHeight(docs.paths)}
                            />
                        </div>
                        {docs.truncated && (
                            <p className="mt-2 text-[11px] text-muted">
                                GitHub listed part of this repository.{' '}
                                <a href={app.repoUrl} target="_blank" rel="noopener noreferrer">
                                    See all files ↗
                                </a>
                            </p>
                        )}
                    </aside>
                )}
                <div
                    ref={top}
                    className={`min-w-0 flex-1 scroll-mt-4 ${reader ? `max-w-3xl ${showTree ? '' : 'mx-auto'}` : ''}`}
                >
                    {showTree && doc.path && (
                        <div className="mb-4 flex items-center justify-between gap-3 border-b border-primary pb-2 text-xs text-secondary">
                            <span className="truncate font-mono">{doc.path}</span>
                            <a
                                href={githubFileUrl(app, doc.path)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="shrink-0 whitespace-nowrap"
                            >
                                View on GitHub ↗
                            </a>
                        </div>
                    )}
                    {content}
                </div>
            </div>
        </div>
    )
}
