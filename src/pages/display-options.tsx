import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import WindowTabs from 'components/WindowTabs'
import { Fieldset } from 'components/OSFieldset'
import { ToggleGroup, ToggleOption } from 'components/RadixUI/ToggleGroup'
import { IconDay, IconEye, IconHide, IconInfo, IconLaptop, IconNight } from '@posthog/icons'
import { SEO } from 'components/seo'
import { useApp } from '../context/App'
import type { SiteSettings } from '../context/App'
import { DebugContainerQuery } from 'components/DebugContainerQuery'
import Tooltip from 'components/RadixUI/Tooltip'
import { Screensaver } from '../components/Screensaver'

const XL_CURSOR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 74 28"><g clip-path="url(#a)"><path fill="#000" stroke="#fff" stroke-width="5" d="m44.77 50.196.024.01.025.008c.48.177 1.014.286 1.58.286.665 0 1.28-.147 1.837-.392l.012-.006.013-.006 8.8-3.997.002-.001a4.5 4.5 0 0 0 2.225-5.968v-.001l-10.73-23.395 16.828-1.446.008-.001a4.504 4.504 0 0 0 2.678-7.78L20.073-37.289a4.51 4.51 0 0 0-4.858-.843l-.011.005A4.499 4.499 0 0 0 12.5-34v66a4.503 4.503 0 0 0 2.715 4.133l.01.003a4.505 4.505 0 0 0 4.86-.859L32.01 24.072l10.259 23.717.005.012.005.011a4.527 4.527 0 0 0 2.492 2.384Z"/></g><defs><clipPath id="a"><path fill="#fff" d="M0 0h74v28H0z"/></clipPath></defs></svg>`

const colorModeOptions: ToggleOption[] = [
    {
        label: 'System',
        value: 'system',
        icon: <IconLaptop className="size-5" />,
        default: true,
    },
    {
        label: 'Light',
        value: 'light',
        icon: <IconDay className="size-5" />,
    },
    {
        label: 'Dark',
        value: 'dark',
        icon: <IconNight className="size-5" />,
    },
]

const scrollbarOptions: ToggleOption[] = [
    {
        label: 'System',
        value: 'system',
        icon: <IconLaptop className="size-5" />,
    },
    {
        label: 'Show',
        value: 'show',
        icon: <IconEye className="size-5" />,
    },
    {
        label: 'Auto',
        value: 'auto',
        icon: <IconHide className="size-5" />,
        default: true,
    },
]

const cursorOptions: ToggleOption[] = [
    {
        label: 'Default',
        value: 'default',
    },
    {
        label: 'XL',
        value: 'xl',
        icon: (
            <div
                dangerouslySetInnerHTML={{ __html: XL_CURSOR_SVG }}
                className="h-5 w-auto relative -top-1 [&>svg]:h-full [&>svg]:w-auto"
            />
        ),
    },
]

export default function DisplayOptions() {
    const { siteSettings, updateSiteSettings } = useApp()
    const [previewScreensaver, setPreviewScreensaver] = useState(false)

    const handleColorModeChange = (value: string) => {
        if (!value) return
        if (typeof window !== 'undefined' && (window as any).__setPreferredTheme) {
            const newTheme = window.__setPreferredTheme(value)
            updateSiteSettings({
                ...siteSettings,
                theme: newTheme as SiteSettings['theme'],
                colorMode: value as SiteSettings['colorMode'],
            })
        }
    }

    const handleScrollbarsChange = (value: string) => {
        updateSiteSettings({ ...siteSettings, scrollbars: value as SiteSettings['scrollbars'] })
    }

    const handleCursorChange = (value: string) => {
        updateSiteSettings({ ...siteSettings, cursor: value as SiteSettings['cursor'] })
    }

    return (
        <>
            <SEO title="Display options" description="Make your quirq home base your own." />
            <div data-scheme="secondary" className="w-full h-full bg-primary text-primary p-4 border-t border-primary">
                <div className="bg-primary grid grid-cols-2 gap-2">
                    <ToggleGroup
                        title="Color mode"
                        options={colorModeOptions}
                        onValueChange={handleColorModeChange}
                        value={siteSettings.colorMode}
                    />
                </div>
                <div className="bg-primary grid grid-cols-2 gap-2 mt-2">
                    <ToggleGroup
                        title="Scrollbars"
                        options={scrollbarOptions}
                        onValueChange={handleScrollbarsChange}
                        value={siteSettings.scrollbars ?? 'auto'}
                    />
                </div>
                <div className="bg-primary grid grid-cols-2 gap-2 my-2">
                    <ToggleGroup
                        title="Cursor"
                        options={cursorOptions}
                        onValueChange={handleCursorChange}
                        value={siteSettings.cursor}
                    />
                </div>
                <div className="bg-primary grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-1 mb-1">
                        <span className="text-sm">Screensaver</span>
                        <button
                            onClick={(e) => {
                                e.preventDefault()
                                setPreviewScreensaver(true)
                                setTimeout(() => setPreviewScreensaver(false), 100000) // Auto-dismiss after 100s
                            }}
                            className="text-sm text-primary underline font-medium"
                        >
                            preview
                        </button>
                    </div>
                    <div>
                        <ToggleGroup
                            title=""
                            options={[
                                { label: 'Disabled', value: 'true' },
                                { label: 'Enabled', value: 'false' },
                            ]}
                            onValueChange={(value) => {
                                updateSiteSettings({ ...siteSettings, screensaverDisabled: value === 'true' })
                            }}
                            value={siteSettings.screensaverDisabled ? 'true' : 'false'}
                        />
                    </div>
                </div>
                <div className="bg-primary grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-1 mb-1">
                        <span className="text-sm">Reduce transparency</span>
                        <Tooltip trigger={<IconInfo className="size-4 inline-block relative -top-px" />} delay={0}>
                            <p className="max-w-sm my-0 leading-snug">
                                Solid, opaque backgrounds for windows and sidebars instead of blurred transparency.
                            </p>
                        </Tooltip>
                    </div>
                    <div>
                        <ToggleGroup
                            title=""
                            options={[
                                { label: 'Disabled', value: 'false' },
                                { label: 'Enabled', value: 'true' },
                            ]}
                            onValueChange={(value) => {
                                updateSiteSettings({ ...siteSettings, reduceTransparency: value === 'true' })
                            }}
                            value={siteSettings.reduceTransparency ? 'true' : 'false'}
                        />
                    </div>
                </div>
            </div>
            {previewScreensaver &&
                typeof document !== 'undefined' &&
                createPortal(
                    <Screensaver isActive={true} onDismiss={() => setPreviewScreensaver(false)} />,
                    document.body
                )}
        </>
    )
}
