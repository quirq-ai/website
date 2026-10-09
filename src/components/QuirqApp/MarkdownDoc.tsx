import React, { useEffect, useRef, useState } from 'react'
import ReactMarkdown, { uriTransformer } from 'react-markdown'
import type { Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import GithubSlugger from 'github-slugger'
import Highlight, { defaultProps, Prism, type Language } from 'prism-react-renderer'
import { darkTheme } from 'components/CodeBlock/theme'
import type { QuirqApp } from 'lib/quirqApps'
import { docImageUrl, docSrcSet, githubFileUrl, repositoryPath, themedMedia } from 'lib/quirqDocs'

type HastNode = {
    type: string
    tagName?: string
    value?: string
    properties?: Record<string, unknown>
    children?: HastNode[]
}

const textOf = (node?: HastNode): string =>
    node?.type === 'text' ? node.value || '' : (node?.children || []).map(textOf).join('')

// GitHub's own sanitizing schema, plus the <picture> sources READMEs use for light and dark logos,
// the align attribute GitHub honors on paragraphs, headings, divs and images, and the language-*
// class on fenced code (this version of the schema drops it, which would lose highlighting and Mermaid).
const schema = {
    ...defaultSchema,
    tagNames: [...(defaultSchema.tagNames || []), 'picture', 'source'],
    attributes: {
        ...defaultSchema.attributes,
        '*': [...(defaultSchema.attributes?.['*'] || []), 'align'],
        code: [...(defaultSchema.attributes?.code || []), ['className', /^language-./]],
        img: [...(defaultSchema.attributes?.img || []), 'width', 'height'],
        source: ['srcSet', 'media', 'type', 'width', 'height'],
    },
}

// Fence names that Prism knows under another name. Anything else Prism lacks (toml, say) stays plain.
const LANGUAGE_ALIASES: Record<string, string> = {
    sh: 'bash',
    zsh: 'bash',
    console: 'bash',
    'shell-session': 'bash',
    jsonc: 'json',
    json5: 'json',
}

// GitHub centers paragraphs, headings and divs written with align="center" (logos, badge rows, titles).
const centered = (props: { align?: unknown }) => (props.align === 'center' ? 'text-center' : '')

function CopyButton({ text }: { text: string }) {
    const [copied, setCopied] = useState(false)
    return (
        <button
            type="button"
            onClick={() =>
                navigator.clipboard
                    ?.writeText(text)
                    .then(() => {
                        setCopied(true)
                        window.setTimeout(() => setCopied(false), 1600)
                    })
                    .catch(() => setCopied(false))
            }
            className="absolute top-2 right-2 min-h-7 px-2.5 rounded-full border border-white/15 bg-white/[0.06] text-[11px] font-medium text-white/80 opacity-0 group-hover:opacity-100 focus:opacity-100 hover:bg-white/15 hover:text-white transition"
        >
            {copied ? 'Copied' : 'Copy'}
        </button>
    )
}

/** A fenced code block, highlighted with the site's dark code theme. */
function CodeBlock({ code, language }: { code: string; language: string }) {
    const text = code.replace(/\n$/, '')
    const prismLanguage = (LANGUAGE_ALIASES[language] || language) as Language
    const known = !!prismLanguage && !!Prism.languages[prismLanguage]
    return (
        <div className="not-prose group relative my-5 rounded-lg bg-[#141518] dark:border dark:border-white/10">
            {language && (
                <span className="absolute top-2 left-4 text-[10px] font-mono uppercase tracking-wider text-white/40">
                    {language}
                </span>
            )}
            <Highlight
                {...defaultProps}
                code={text}
                language={known ? prismLanguage : ('plain' as Language)}
                theme={darkTheme}
            >
                {({ tokens, getLineProps, getTokenProps }) => (
                    <pre
                        className={`m-0 overflow-x-auto bg-transparent px-4 pb-3 ${
                            language ? 'pt-7' : 'pt-3'
                        } text-[12.5px] leading-relaxed text-[#ececef]`}
                    >
                        <code className="block border-0 bg-transparent p-0 font-mono text-[inherit]">
                            {tokens.map((line, index) => (
                                <div key={index} {...getLineProps({ line })} style={undefined}>
                                    {line.map((token, key) => (
                                        <span key={key} {...getTokenProps({ token })} />
                                    ))}
                                </div>
                            ))}
                        </code>
                    </pre>
                )}
            </Highlight>
            <CopyButton text={text} />
        </div>
    )
}

let diagrams = 0

/** A Mermaid diagram. Mermaid is loaded only when a doc has one; until then (and if it fails) the source shows. */
function MermaidDiagram({ code, dark }: { code: string; dark: boolean }) {
    const [svg, setSvg] = useState<string | null>(null)
    useEffect(() => {
        let cancelled = false
        import('mermaid')
            .then(async ({ default: mermaid }) => {
                mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: dark ? 'dark' : 'neutral' })
                const { svg } = await mermaid.render(`quirq-mermaid-${(diagrams += 1)}`, code)
                if (!cancelled) setSvg(svg)
            })
            .catch(() => {
                if (!cancelled) setSvg(null)
            })
        return () => {
            cancelled = true
        }
    }, [code, dark])
    if (!svg) return <CodeBlock code={code} language="mermaid" />
    return (
        <div
            className="not-prose my-6 overflow-x-auto rounded-lg border border-primary bg-primary p-4 [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-w-full"
            // Mermaid's strict security level sanitizes every label in the SVG it returns.
            dangerouslySetInnerHTML={{ __html: svg }}
        />
    )
}

type Props = {
    app: QuirqApp
    /** The doc's path in the repository; relative links and images resolve against its folder. */
    path: string
    markdown: string
    dark: boolean
    /** Opens another doc of the repository in place. Without it, doc links go to GitHub. */
    onOpenDoc?: (path: string, hash: string) => void
    isDoc?: (path: string) => boolean
}

/**
 * A repository's Markdown file, formatted the way GitHub shows it: GitHub-flavored Markdown and the
 * HTML GitHub allows (sanitized with GitHub's schema), highlighted code, Mermaid diagrams, heading
 * anchors, and links and images resolved against the repository. Links to other docs open in place.
 */
export default function MarkdownDoc({ app, path, markdown, dark, onOpenDoc, isDoc }: Props) {
    const container = useRef<HTMLDivElement>(null)
    // A fresh slugger per render gives headings the same ids GitHub gives them, duplicates numbered.
    const slugger = new GithubSlugger()

    const scrollToAnchor = (hash: string) => {
        const id = decodeURIComponent(hash.replace(/^#/, ''))
        const target =
            container.current?.querySelector(`[id="${CSS.escape(id)}"]`) ||
            container.current?.querySelector(`[id="user-content-${CSS.escape(id)}"]`)
        target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }

    const heading =
        (Tag: 'h2' | 'h3' | 'h4' | 'h5' | 'h6') =>
        // eslint-disable-next-line react/display-name
        ({ node, children, ...props }: { node?: unknown; children?: React.ReactNode }) =>
            (
                <Tag id={slugger.slug(textOf(node as HastNode))} className={`scroll-mt-4 ${centered(props)}`}>
                    {children}
                </Tag>
            )

    const components: Components = {
        // The window has its own title, so the doc's h1 reads as a section heading.
        h1: heading('h2'),
        h2: heading('h2'),
        h3: heading('h3'),
        h4: heading('h4'),
        h5: heading('h5'),
        h6: heading('h6'),
        p: ({ node, children, ...props }) => <p className={centered(props) || undefined}>{children}</p>,
        div: ({ node, children, ...props }) => <div className={centered(props) || undefined}>{children}</div>,
        a: ({ href, children }) => {
            if (href?.startsWith('#')) {
                return (
                    <a
                        href={href}
                        onClick={(event) => {
                            event.preventDefault()
                            scrollToAnchor(href)
                        }}
                    >
                        {children}
                    </a>
                )
            }
            const inRepository = href ? repositoryPath(href, path) : null
            if (inRepository && inRepository.path && onOpenDoc && isDoc?.(inRepository.path)) {
                return (
                    // A plain click opens the doc in place; anything that follows the link itself (a modified
                    // click, a click without JavaScript) goes to GitHub in a new tab, like every external link.
                    <a
                        href={githubFileUrl(app, inRepository.path) + inRepository.hash}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(event) => {
                            if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
                            event.preventDefault()
                            onOpenDoc(inRepository.path, inRepository.hash)
                        }}
                    >
                        {children}
                    </a>
                )
            }
            const external = inRepository
                ? githubFileUrl(app, inRepository.path || '') + inRepository.hash
                : href && /^(https?:|mailto:)/i.test(href)
                ? href
                : undefined
            return (
                <a href={external} target="_blank" rel="noopener noreferrer">
                    {children}
                </a>
            )
        },
        img: ({ src, alt, width, height }) => (
            <img src={docImageUrl(src, app, path)} alt={alt || ''} width={width} height={height} loading="lazy" />
        ),
        source: ({ node }) => {
            const properties = (node as HastNode)?.properties || {}
            // hast keeps srcset as a list of candidates.
            const candidates = Array.isArray(properties.srcSet) ? properties.srcSet.join(', ') : properties.srcSet
            const srcSet = typeof candidates === 'string' ? docSrcSet(candidates, app, path) : undefined
            const media = typeof properties.media === 'string' ? themedMedia(properties.media, dark) : undefined
            return srcSet ? <source srcSet={srcSet} media={media} /> : null
        },
        pre: ({ node }) => {
            const code = (node as HastNode)?.children?.find((child) => child.tagName === 'code')
            const className = code?.properties?.className
            const language = (Array.isArray(className) ? className : [className])
                .map((name) => String(name || '').match(/^language-(.+)$/)?.[1])
                .find(Boolean)
            const text = textOf(code || (node as HastNode))
            return language?.toLowerCase() === 'mermaid' ? (
                <MermaidDiagram code={text} dark={dark} />
            ) : (
                <CodeBlock code={text} language={(language || '').toLowerCase()} />
            )
        },
        // Inline code reads as a soft tint, not the site's bordered chip; fenced code goes through `pre`.
        code: ({ inline, className, children }) =>
            inline ? (
                <code className="inline rounded-md border-0 bg-black/[0.06] px-1.5 py-0.5 font-code text-[0.85em] font-normal text-primary dark:bg-white/[0.08]">
                    {children}
                </code>
            ) : (
                <code className={className}>{children}</code>
            ),
        details: ({ children }) => (
            <details className="not-prose my-4 rounded-lg border border-primary px-4 py-2 [&>*:not(summary)]:prose [&>*:not(summary)]:prose-sm dark:[&>*:not(summary)]:prose-invert">
                {children}
            </details>
        ),
        summary: ({ children }) => (
            <summary className="cursor-pointer py-1 text-sm font-semibold text-primary">{children}</summary>
        ),
    }

    return (
        <div
            ref={container}
            className="prose prose-sm @3xl:prose-base dark:prose-invert max-w-none break-words [&_img]:inline-block [&_img]:max-w-full [&_img]:my-1 [&_table]:block [&_table]:overflow-x-auto [&_h2]:mt-10 [&_h2]:border-b [&_h2]:border-primary [&_h2]:pb-2 [&>:first-child]:mt-0"
            data-testid="repository-readme"
        >
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw, [rehypeSanitize, schema]]}
                transformLinkUri={uriTransformer}
                transformImageUri={uriTransformer}
                components={components}
            >
                {markdown}
            </ReactMarkdown>
        </div>
    )
}
