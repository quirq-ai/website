import React from 'react'
import GlassIcon from 'components/OSIcons/GlassIcon'
import { QUIRQ_GLYPHS, type QuirqIcon } from './glyphs'

const colors: Record<string, string> = {
    blue: 'text-blue',
    purple: 'text-purple',
    lilac: 'text-lilac',
    orange: 'text-orange',
    yellow: 'text-yellow',
    red: 'text-red',
    salmon: 'text-salmon',
    teal: 'text-teal',
    seagreen: 'text-seagreen',
    green: 'text-green',
    pink: 'text-pink',
}

/** Repository glyphs use the same beveled glass treatment as the original desktop. */
export default function QuirqAppIcon({
    icon = 'folder',
    color = 'purple',
    className = '',
    glowColor,
    glowColorDark,
}: {
    icon?: string
    color?: string
    className?: string
    glowColor?: string
    glowColorDark?: string
}) {
    return (
        <GlassIcon
            path={QUIRQ_GLYPHS[icon as QuirqIcon] || QUIRQ_GLYPHS.folder}
            fillRule="evenodd"
            className={`${colors[color] || colors.purple} ${className}`}
            glowColor={glowColor}
            glowColorDark={glowColorDark}
        >
            <rect width="36" height="36" fill="currentColor" opacity="0.38" />
        </GlassIcon>
    )
}

/** The frosted, rounded tile app icons sit on, the way Euler's home screen and dock present apps. */
export function QuirqTile({
    className = 'size-[58px] rounded-[17px]',
    children,
}: {
    className?: string
    children: React.ReactNode
}) {
    return (
        <span
            className={`grid place-items-center shrink-0 border border-white/90 dark:border-white/10 bg-gradient-to-br from-white to-white/60 dark:from-white/15 dark:to-white/5 shadow-[0_10px_19px_-13px_rgba(48,75,100,0.44),0_2px_4px_rgba(48,75,100,0.03)] ${className}`}
        >
            {children}
        </span>
    )
}

/** An app icon on its frosted tile. */
export function QuirqAppTile({
    icon,
    color,
    className,
    iconClassName = '!size-10',
}: {
    icon?: string
    color?: string
    className?: string
    iconClassName?: string
}) {
    return (
        <QuirqTile className={className}>
            <QuirqAppIcon icon={icon} color={color} className={iconClassName} />
        </QuirqTile>
    )
}
