import React from 'react'
import GlassIcon from 'components/OSIcons/GlassIcon'
import {
    HOME_SILHOUETTE,
    SKILLS_SILHOUETTE,
    DOWNLOAD_SILHOUETTE,
    HANDBOOK_SILHOUETTE,
    TALK_TO_A_HUMAN_SILHOUETTE,
    SELF_DRIVING_SILHOUETTE,
    CONTEXT_WAREHOUSE_SILHOUETTE,
} from 'components/OSIcons/glyphs'

const glyphs = {
    home: HOME_SILHOUETTE,
    code: SKILLS_SILHOUETTE,
    cloud: DOWNLOAD_SILHOUETTE,
    book: HANDBOOK_SILHOUETTE,
    desktop: TALK_TO_A_HUMAN_SILHOUETTE,
    agent: SELF_DRIVING_SILHOUETTE,
    database: CONTEXT_WAREHOUSE_SILHOUETTE,
    globe: 'M18 3a15 15 0 1 0 0 30 15 15 0 0 0 0-30Zm-1.5 3.3V12h-4.7c1-2.9 2.7-5 4.7-5.7Zm3 0c2 0.7 3.7 2.8 4.7 5.7h-4.7V6.3ZM7.5 12a12 12 0 0 1 4.2-4.2 20 20 0 0 0-2 4.2H7.5Zm16.8-4.2a12 12 0 0 1 4.2 4.2h-2.2a20 20 0 0 0-2-4.2ZM6.4 15h2.7a24 24 0 0 0 0 6H6.4a12 12 0 0 1 0-6Zm5.7 0h4.4v6h-4.4a20 20 0 0 1 0-6Zm7.4 0h4.4a20 20 0 0 1 0 6h-4.4v-6Zm7.4 0h2.7a12 12 0 0 1 0 6h-2.7a24 24 0 0 0 0-6ZM7.5 24h2.2a20 20 0 0 0 2 4.2A12 12 0 0 1 7.5 24Zm4.3 0h4.7v5.7c-2-.7-3.7-2.8-4.7-5.7Zm7.7 0h4.7c-1 2.9-2.7 5-4.7 5.7V24Zm6.8 0h2.2a12 12 0 0 1-4.2 4.2 20 20 0 0 0 2-4.2Z',
    mail: 'M5 7h26a3 3 0 0 1 3 3v17a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V10a3 3 0 0 1 3-3Zm1 3 12 9 12-9H6Zm0 4v12h24V14l-12 9-12-9Z',
    chat: 'M8 4h20a5 5 0 0 1 5 5v13a5 5 0 0 1-5 5H16l-8 6v-6a5 5 0 0 1-5-5V9a5 5 0 0 1 5-5Zm1 8v3h18v-3H9Zm0 7v3h12v-3H9Z',
    rocket: 'M31 3c2 8-1 17-10 22l-7-7C19 9 26 3 31 3ZM24 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM13 13 6 14l-4 7 10 1 1-9Zm10 10-1 10 7-4 1-7-7 1ZM11 24c-4-1-7 2-8 9 7-1 10-4 8-9Z',
    palette:
        'M18 3C9.7 3 3 9.3 3 17c0 8.3 6.7 16 15 16 3 0 5-1.5 5-4 0-2-2-3-2-5 0-1 1-2 3-2h4c4 0 6-3 5-7C31 8 25 3 18 3ZM10 12a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Zm7-5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Zm9 4a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5ZM10 22a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z',
}

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
    icon = 'code',
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
            path={glyphs[icon as keyof typeof glyphs] || glyphs.code}
            fillRule="evenodd"
            className={`${colors[color] || colors.purple} ${className}`}
            glowColor={glowColor}
            glowColorDark={glowColorDark}
        >
            <rect width="36" height="36" fill="currentColor" opacity="0.38" />
        </GlassIcon>
    )
}

/** An app icon on a frosted, rounded tile, the way Euler's home screen and dock present apps. */
export function QuirqAppTile({
    icon,
    color,
    className = 'size-[58px] rounded-[17px]',
    iconClassName = '!size-10',
}: {
    icon?: string
    color?: string
    className?: string
    iconClassName?: string
}) {
    return (
        <span
            className={`grid place-items-center shrink-0 border border-white/90 dark:border-white/10 bg-gradient-to-br from-white to-white/60 dark:from-white/15 dark:to-white/5 shadow-[0_10px_19px_-13px_rgba(48,75,100,0.44),0_2px_4px_rgba(48,75,100,0.03)] ${className}`}
        >
            <QuirqAppIcon icon={icon} color={color} className={iconClassName} />
        </span>
    )
}
