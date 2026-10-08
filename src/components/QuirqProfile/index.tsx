import React, { useState } from 'react'
import ReactMarkdown, { uriTransformer } from 'react-markdown'
import type { Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize from 'rehype-sanitize'
import { quirqConfig } from 'lib/quirqApps'
import { useQuirqApps } from 'lib/quirqLiveApps'
import QuirqAppIcon from 'components/QuirqAppIcon'
import DesktopIcon from 'components/Desktop/DesktopIcon'
import { DESKTOP_ICON_GLOW } from 'components/Desktop/Background'
import { PROFILE_BLOB_BASE, PROFILE_RAW_BASE, useProfileReadme } from './useProfileReadme'
import { readmeLinkLabel, readmeLinkLook, readmeLinkTarget, siteHosts } from 'lib/quirqReadmeLinks'

type HastNode = {
    type: string
    tagName?: string
    value?: string
    properties?: { href?: unknown }
    children?: HastNode[]
}

const textOf = (node?: HastNode): string =>
    node?.type === 'text' ? node.value || '' : (node?.children || []).map(textOf).join('')
const contains = (node: HastNode, tagName: string): boolean =>
    node.tagName === tagName || (node.children || []).some((child) => contains(child, tagName))

// A paragraph made only of text links, separated by "·" and the like, reads as a row of apps.
const SEPARATOR = /^[\s·•|]*$/
const isLinkRow = (node?: HastNode) => {
    const children = node?.children || []
    return (
        children.some((child) => child.tagName === 'a') &&
        children.every((child) =>
            child.type === 'element'
                ? child.tagName === 'a' && !contains(child, 'img')
                : child.type === 'text' && SEPARATOR.test(child.value || '')
        )
    )
}

// Relative paths resolve the way GitHub resolves them for the profile README; react-markdown's
// own transformer still drops unsafe protocols.
const resolve = (url: string, base: string) => {
    if (!url || url.startsWith('#')) return url
    try {
        return uriTransformer(new URL(url, base).href)
    } catch {
        return uriTransformer(url)
    }
}

const hairline = 'border-black/[0.08] dark:border-white/10'

type LinkProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & { node?: HastNode }

function ReadmeLink({ node, href, children }: LinkProps) {
    const external = !!href && !href.startsWith('#')
    const target = external ? { target: '_blank', rel: 'noopener noreferrer' } : {}
    const className =
        node && contains(node, 'img')
            ? 'block rounded-[20px] focus-visible:outline-offset-4'
            : 'font-medium text-primary underline decoration-black/20 dark:decoration-white/25 underline-offset-4 hover:decoration-current transition-colors'
    return (
        <a href={href} className={className} {...target}>
            {children}
        </a>
    )
}

/**
 * A row of README links as desktop app icons: the glyph and color of the catalog app a link opens,
 * or of what the link is about. Like the other apps they open in a window here: an app's own launch
 * window, or a window framing the page; GitHub and mail links open in a new tab (lib/quirqReadmeLinks).
 */
function ReadmeAppRow({ node, centered }: { node?: HastNode; centered: boolean }) {
    const apps = useQuirqApps()
    // The README renders only in the browser, after it is fetched, so the page's host is known here.
    const hosts = siteHosts()
    const links = (node?.children || [])
        .filter((child) => child.tagName === 'a')
        .map((child) => ({
            href: resolve(String(child.properties?.href || ''), PROFILE_BLOB_BASE),
            label: readmeLinkLabel(textOf(child)),
        }))
        .filter((link) => link.href && link.label)
    return (
        <ul className={`not-prose list-none my-8 p-0 flex flex-wrap gap-y-2 ${centered ? 'justify-center' : ''}`}>
            {links.map((link) => {
                const look = readmeLinkLook(link.href, link.label, apps)
                const target = readmeLinkTarget(link.href, apps, hosts, quirqConfig.frameOrigins)
                return (
                    <DesktopIcon
                        key={`${link.href} ${link.label}`}
                        app={{
                            label: link.label,
                            url: target.to,
                            external: target.external,
                            source: 'desktop',
                            Icon: (
                                <QuirqAppIcon
                                    icon={look.icon}
                                    color={look.color}
                                    glowColor={DESKTOP_ICON_GLOW.light}
                                    glowColorDark={DESKTOP_ICON_GLOW.dark}
                                />
                            ),
                        }}
                    />
                )
            })}
        </ul>
    )
}

function CodeBlock({ text, children }: { text: string; children: React.ReactNode }) {
    const [copied, setCopied] = useState(false)
    const copy = () => {
        navigator.clipboard
            ?.writeText(text.replace(/\n$/, ''))
            .then(() => {
                setCopied(true)
                window.setTimeout(() => setCopied(false), 1600)
            })
            .catch(() => setCopied(false))
    }
    return (
        <div className="my-6 flex items-center gap-3 rounded-2xl bg-[#141518] py-3 pl-5 pr-3 shadow-[0_18px_40px_-24px_rgba(0,0,0,0.5)] dark:border dark:border-white/10">
            {/* The button sits beside the scrolling code, so it never covers a long command. */}
            <pre className="m-0 min-w-0 flex-1 overflow-x-auto border-0 bg-transparent p-0 py-1 text-[13px] leading-relaxed text-[#ececef]">
                {children}
            </pre>
            <button
                type="button"
                onClick={copy}
                className="shrink-0 min-h-8 px-3 rounded-full border border-white/15 bg-white/[0.06] text-[11px] font-medium text-white/80 hover:bg-white/15 hover:text-white transition-colors"
            >
                {copied ? 'Copied' : 'Copy'}
            </button>
        </div>
    )
}

// The README's title is the desktop's display line; windows keep their own h1s.
const Title = ({ children }: { children: React.ReactNode }) => (
    <h2 className="m-0 text-center text-[clamp(3.25rem,9vw,6rem)] font-bold leading-none tracking-[-0.05em] text-primary">
        {children}
    </h2>
)

const components: Components = {
    h1: ({ children }) => <Title>{children}</Title>,
    h2: ({ children }) => (
        <h2 className={`mt-16 mb-5 pt-12 border-t ${hairline} text-[1.6rem] font-semibold tracking-tight text-primary`}>
            {children}
        </h2>
    ),
    h3: ({ children }) => <h3 className="mt-10 mb-3 text-lg font-semibold tracking-tight text-primary">{children}</h3>,
    p: ({ node, children, ...props }) => {
        const centered = (props as { align?: string }).align === 'center'
        if (isLinkRow(node as HastNode)) return <ReadmeAppRow node={node as HastNode} centered={centered} />
        return (
            <p className={`my-4 text-[15px] leading-[1.75] text-secondary ${centered ? 'text-center' : ''}`}>
                {children}
            </p>
        )
    },
    a: (props) => {
        const { node, href, children } = props as LinkProps
        return (
            <ReadmeLink node={node} href={href}>
                {children}
            </ReadmeLink>
        )
    },
    strong: ({ children }) => <strong className="font-semibold text-primary">{children}</strong>,
    img: ({ src, alt }) => (
        <img
            src={src}
            alt={alt || ''}
            decoding="async"
            className={`mx-auto block w-full h-auto rounded-[20px] border ${hairline} bg-[#0b0b0c] shadow-[0_30px_70px_-34px_rgba(0,0,0,0.55)]`}
        />
    ),
    ul: ({ children }) => <ul className="my-5 list-none space-y-2.5 pl-0">{children}</ul>,
    ol: ({ children }) => <ol className="my-5 list-decimal space-y-2.5 pl-5 text-secondary">{children}</ol>,
    li: ({ ordered, children }) => (
        <li
            className={`text-[15px] leading-[1.7] text-secondary ${
                ordered
                    ? ''
                    : 'relative pl-5 before:absolute before:left-1 before:top-[0.7em] before:size-1.5 before:rounded-full before:bg-current before:opacity-35'
            }`}
        >
            {children}
        </li>
    ),
    hr: () => <hr className={`my-16 h-px border-0 bg-black/[0.08] dark:bg-white/10`} />,
    blockquote: ({ children }) => (
        <blockquote className={`my-6 border-l-2 ${hairline} pl-4 text-secondary italic`}>{children}</blockquote>
    ),
    table: ({ children }) => (
        <div className={`my-6 overflow-x-auto rounded-2xl border ${hairline} bg-white/70 dark:bg-white/[0.03]`}>
            <table className="w-full border-collapse text-left text-sm [&_td:first-child]:w-[38%] [&_td:first-child]:min-w-[8.5rem]">
                {children}
            </table>
        </div>
    ),
    th: ({ children, style }) => (
        <th
            style={style}
            className="px-4 py-3 whitespace-nowrap bg-black/[0.025] dark:bg-white/[0.04] text-[11px] font-semibold uppercase tracking-[0.08em] text-muted"
        >
            {children}
        </th>
    ),
    td: ({ children, style }) => (
        <td style={style} className={`px-4 py-3.5 align-top border-t ${hairline} leading-relaxed text-secondary`}>
            {children}
        </td>
    ),
    pre: ({ node, children }) => <CodeBlock text={textOf(node as HastNode)}>{children}</CodeBlock>,
    code: ({ inline, className, children }) =>
        inline ? (
            <code className="rounded-md border-0 bg-black/[0.05] dark:bg-white/10 px-1.5 py-0.5 font-mono text-[0.86em] text-primary">
                {children}
            </code>
        ) : (
            // The site's global code style (a light chip) would otherwise show inside the dark block.
            <code className={`block border-0 bg-transparent p-0 font-mono text-[inherit] ${className || ''}`}>
                {children}
            </code>
        ),
}

/**
 * The organization's GitHub profile README, written on the desktop background. It is read live
 * from GitHub; until it arrives (or if GitHub can't be reached) the desktop stays plain or shows a
 * short pointer to the organization.
 */
function QuirqProfile() {
    const readme = useProfileReadme()
    const orgUrl = `https://github.com/${quirqConfig.organization}`

    return (
        <article
            aria-label={`${quirqConfig.organization} on GitHub`}
            aria-busy={readme.status === 'loading'}
            // Right-clicking text and links gets the browser's menu, not the desktop's.
            onContextMenu={(event) => event.stopPropagation()}
            className={`mx-auto w-full max-w-[720px] transition-opacity duration-700 motion-reduce:transition-none ${
                readme.status === 'loading' ? 'opacity-0' : 'opacity-100'
            } [&>p:first-of-type]:mt-6 [&>p:first-of-type]:text-[17px] [&>p:first-of-type_strong]:mb-1.5 [&>p:first-of-type_strong]:block [&>p:first-of-type_strong]:text-[clamp(1.25rem,2.4vw,1.6rem)] [&>p:first-of-type_strong]:font-medium [&>p:first-of-type_strong]:leading-snug [&>p:first-of-type_strong]:tracking-tight [&>p:first-of-type_br]:hidden [&>hr~p]:text-xs [&>hr~p]:text-muted`}
        >
            {readme.status === 'ready' ? (
                <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeRaw, rehypeSanitize]}
                    transformLinkUri={(href) => resolve(href, PROFILE_BLOB_BASE)}
                    transformImageUri={(src) => resolve(src, PROFILE_RAW_BASE)}
                    components={components}
                >
                    {readme.markdown}
                </ReactMarkdown>
            ) : readme.status === 'error' ? (
                <>
                    <Title>{quirqConfig.name}</Title>
                    <p className="mt-6 text-center text-[15px] text-secondary">
                        <ReadmeLink href={orgUrl}>See {quirqConfig.organization} on GitHub ↗</ReadmeLink>
                    </p>
                </>
            ) : null}
            {readme.status === 'ready' && (
                <p className="mt-10 text-center text-[11px] text-muted">
                    Live from{' '}
                    <ReadmeLink href={`${PROFILE_BLOB_BASE}README.md`}>{quirqConfig.organization}/.github</ReadmeLink>{' '}
                    on GitHub
                </p>
            )}
        </article>
    )
}

// Takes no props; memoized so parents re-rendering (open windows, theme) don't re-parse the README.
export default React.memo(QuirqProfile)
