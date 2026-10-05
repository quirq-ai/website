import React from 'react'
import { MenuType, MenuItemType } from 'components/RadixUI/MenuBar'
import { IconBrightness, IconChevronDown, IconHome, IconApps } from '@posthog/icons'
import { IconGithub } from 'components/OSIcons'
import QuirqAppIcon from 'components/QuirqAppIcon'
import { useAppActions, useAppSettings } from '../../context/App'
import { getQuirqApps, quirqConfig } from 'lib/quirqApps'
import type { AppIconName } from 'components/OSIcons/AppIcon'

const catalog = getQuirqApps()
const appItems: MenuItemType[] = catalog.map((app) => ({
    type: 'item',
    label: app.name,
    link: app.path,
    icon: <QuirqAppIcon icon={app.icon} color={app.color} className="!size-5" />,
}))

export function useMenuData(): MenuType[] {
    const { isMobile } = useAppSettings()
    const { setConfetti, setScreensaverPreviewActive } = useAppActions()
    const home: MenuItemType = {
        type: 'item',
        label: 'Home base',
        link: '/',
        icon: <IconHome className="size-4 text-purple" />,
    }
    const appearance: MenuItemType[] = [
        {
            type: 'item',
            label: 'Make it yours',
            link: '/display-options',
            icon: <IconBrightness className="size-4 text-yellow" />,
            shortcut: ',',
        },
        { type: 'item', label: 'Preview screensaver', onClick: () => setScreensaverPreviewActive(true) },
        { type: 'item', label: 'A little celebration', onClick: () => setConfetti(true) },
    ]
    const github: MenuItemType = {
        type: 'item',
        label: `${quirqConfig.organization} on GitHub`,
        link: `https://github.com/${quirqConfig.organization}`,
        icon: <IconGithub className="size-4" />,
        external: true,
    }
    const apps: MenuItemType[] = [
        { type: 'item', label: 'Explore all apps', link: '/', icon: <IconApps className="size-4 text-blue" /> },
        { type: 'separator' },
        ...appItems,
    ]

    return [
        {
            trigger: (
                <span className="flex items-center gap-1.5 py-1">
                    <QuirqAppIcon icon="home" color="teal" className="!size-6" />
                    <span className="font-bold text-base tracking-tight">{quirqConfig.name}</span>
                    {isMobile && <IconChevronDown className="size-4 text-muted" />}
                </span>
            ),
            link: isMobile ? undefined : '/',
            hideChevron: true,
            items: isMobile
                ? [home, { type: 'submenu', label: 'Apps', items: apps }, { type: 'separator' }, ...appearance, github]
                : [],
        },
        ...(!isMobile
            ? [
                  { trigger: 'Home base', link: '/', items: [] },
                  { trigger: 'Apps', items: apps },
                  { trigger: 'Appearance', items: appearance },
                  { trigger: 'Organization', items: [github] },
              ]
            : []),
    ]
}

// Compatibility for retained legacy source pages; these apps are not part of Quirq's catalog.
type SparksJoyItem = {
    label: string
    link: string
    iconName: AppIconName | null
    customIcon: React.ReactNode
    external?: boolean
}
export const SparksJoyItems: Record<'games' | 'notGames', SparksJoyItem[]> = { games: [], notGames: [] }

export function useMenuSelectOptions() {
    return [
        { label: 'Home base', items: [{ value: '', label: 'Home base' }] },
        {
            label: 'Apps',
            items: catalog.map((app) => ({ value: app.path.replace(/^\//, ''), label: app.name })),
        },
        { label: 'Appearance', items: [{ value: 'display-options', label: 'Make it yours' }] },
    ]
}
