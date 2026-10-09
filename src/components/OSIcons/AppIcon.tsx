import React from 'react'
import Link from 'components/Link'

export interface AppItem {
    Icon?: React.ElementType | React.ReactElement
    label: string
    url?: string
    onClick?: () => void
    className?: string
    children?: React.ReactNode
    source?: string
    external?: boolean
    badge?: React.ReactNode
}

export const AppLink = ({ Icon, label, url, onClick, className, children, source, external, badge }: AppItem) => {
    const icon = React.isValidElement(Icon)
        ? React.cloneElement(Icon as React.ReactElement<any>, {
              className: `${(Icon as React.ReactElement<any>).props.className || ''} ${className || ''}`.trim(),
          })
        : Icon
        ? React.createElement(Icon as React.ElementType, { className })
        : null
    const content = (
        <>
            <span className={`relative ${badge ? 'inline-flex' : ''}`}>
                {icon}
                {children}
                {badge}
            </span>
            <figcaption
                className={`text-[13px] font-medium leading-tight text-center text-balance ${
                    source === 'desktop' ? 'text-primary dark:text-white' : 'text-primary'
                }`}
            >
                <span className="inline-block leading-tight">
                    <span
                        className={`rounded-[2px] px-0.5 py-0 font-medium ${
                            source === 'desktop' ? 'dark:text-shadow-desktop' : ''
                        }`}
                    >
                        {label}
                    </span>
                </span>
            </figcaption>
        </>
    )
    const classes = `group items-center select-none text-white font-medium inline-flex flex-col justify-center w-auto space-y-0.5 max-w-28 text-center ${
        source === 'desktop' ? 'drop-shadow-lg' : ''
    }`

    return (
        <figure>
            {url ? (
                <Link
                    to={url}
                    {...(external ? { externalNoIcon: true } : { state: { newWindow: true } })}
                    className={classes}
                >
                    {content}
                </Link>
            ) : onClick ? (
                <button onClick={onClick} className={classes}>
                    {content}
                </button>
            ) : (
                <div className={classes}>{content}</div>
            )}
        </figure>
    )
}
