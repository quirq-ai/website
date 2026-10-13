import { Link as GatsbyLink } from 'gatsby'
import React from 'react'
import { IconArrowUpRight } from '@posthog/icons'
import ContextMenu, { ContextMenuItemProps } from 'components/RadixUI/ContextMenu'
import { isAbsoluteWebUrl, NEW_TAB } from '../../lib/externalLinks'

const createStandardMenuItems = (url: string, state: any, isExternal: boolean): ContextMenuItemProps[] => {
    const fullUrl = url.startsWith('/')
        ? `${
              typeof window !== 'undefined'
                  ? window.location.origin
                  : process.env.GATSBY_SITE_URL || 'http://localhost:8001'
          }${url}`
        : url

    return [
        {
            type: 'item',
            disabled: isExternal,
            children: isExternal ? (
                <span>Open in side by side view</span>
            ) : (
                <Link to={url} state={{ ...state, newWindow: true, sideBySide: 'right' }} contextMenu={false}>
                    Open in side by side view
                </Link>
            ),
        },
        {
            type: 'item',
            newTab: true,
            children: (
                <a href={url} {...NEW_TAB}>
                    Open in new browser tab
                </a>
            ),
        },
        {
            type: 'item',
            children: <span onClick={() => navigator.clipboard.writeText(fullUrl)}>Copy link address</span>,
        },
    ]
}

export interface Props {
    to?: string
    children: React.ReactNode
    className?: string
    wrapperClassName?: string
    onClick?: (e: React.MouseEvent<HTMLButtonElement> | React.MouseEvent<HTMLAnchorElement>) => void
    disablePrefetch?: boolean
    external?: boolean
    externalNoIcon?: boolean
    iconClasses?: string
    state?: any
    href?: string
    disabled?: boolean
    contextMenu?: boolean
    customMenuItems?: ContextMenuItemProps[]
    [key: string]: any
}

export default function Link({
    to,
    children,
    className = '',
    wrapperClassName = '',
    disabled,
    onClick,
    disablePrefetch,
    external,
    externalNoIcon,
    iconClasses = '',
    state = {},
    href,
    contextMenu = true,
    customMenuItems = [],
    ...other
}: Props): JSX.Element {
    const url = to || href
    const internal = !disablePrefetch && !!url && /^\/(?!\/)/.test(url)
    const linkState = state?.newWindow && state.preventScroll === undefined ? { ...state, preventScroll: true } : state
    const isExternal = !internal || !!external || !!externalNoIcon
    const opensNewTab = !!external || !!externalNoIcon || isAbsoluteWebUrl(url)
    const menuItems = url
        ? [
              ...createStandardMenuItems(url, state, isExternal),
              ...(customMenuItems.length ? [{ type: 'separator' as const }, ...customMenuItems] : []),
          ]
        : []

    const element =
        onClick && !url ? (
            <button {...other} onClick={onClick} className={className} disabled={disabled}>
                {children}
            </button>
        ) : internal ? (
            <GatsbyLink {...other} to={url!} className={className} state={linkState} onClick={onClick}>
                {children}
            </GatsbyLink>
        ) : (
            // Plain clicks are intercepted by the site's shared external-link listener.
            <a
                {...other}
                href={url}
                className={`${className} group`}
                onClick={onClick}
                {...(opensNewTab ? NEW_TAB : {})}
            >
                {external ? (
                    <span className="inline-flex justify-center items-center group">
                        <span className="font-semibold underline">{children}</span>
                        <IconArrowUpRight
                            className={`size-4 text-muted group-hover:text-secondary relative ${iconClasses}`}
                        />
                    </span>
                ) : (
                    children
                )}
            </a>
        )

    return contextMenu && url ? (
        <ContextMenu menuItems={menuItems} className={wrapperClassName}>
            {element}
        </ContextMenu>
    ) : (
        element
    )
}
